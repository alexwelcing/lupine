import { useEffect, useRef } from 'react'

const WGSL = `
struct U { vp: mat4x4<f32>, eye: vec3<f32>, t: f32, res: vec2<f32> };
struct A { p: vec3<f32>, r: f32, c: vec3<f32>, ph: f32 };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage,read> atoms: array<A>;

fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }

struct V {
    @builtin(position) pos: vec4<f32>,
    @location(0) lp: vec2<f32>,
    @location(1) wc: vec3<f32>,
    @location(2) rad: f32,
    @location(3) col: vec3<f32>,
    @location(4) dep: f32,
};

@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
    let q = array(vec2(-1.,-1.), vec2(1.,-1.), vec2(-1.,1.), vec2(1.,-1.), vec2(1.,1.), vec2(-1.,1.));
    let atom = atoms[ii];
    let l = q[vi];
    let fi = f32(ii);

    let iter = floor(u.t / 3.5);
    let blend = smoothstep(0.0, 0.7, fract(u.t / 3.5));

    let h0 = hash(fi * 127.1 + iter * 311.7);
    let h1 = hash(fi * 127.1 + (iter + 1.0) * 311.7);

    let mg_c = vec3(0.482, 0.541, 0.878);
    let li_c = vec3(0.306, 0.804, 0.769);
    let mg_r: f32 = 0.6;
    let li_r: f32 = 0.45;

    let c0 = select(li_c, mg_c, h0 > 0.5);
    let c1 = select(li_c, mg_c, h1 > 0.5);
    let r0 = select(li_r, mg_r, h0 > 0.5);
    let r1 = select(li_r, mg_r, h1 > 0.5);

    let final_col = mix(c0, c1, blend);
    let final_rad = mix(r0, r1, blend);

    let j = vec3(
        sin(u.t * 2.0 + atom.ph) * 0.025,
        cos(u.t * 1.7 + atom.ph * 1.3) * 0.025,
        sin(u.t * 2.3 + atom.ph * 0.7) * 0.025
    );
    let ctr = atom.p + j;

    let fw = normalize(u.eye - ctr);
    let rt = normalize(cross(vec3(0.,1.,0.), fw));
    let up = cross(fw, rt);
    let wp = ctr + (rt * l.x + up * l.y) * final_rad * 1.3;

    var o: V;
    o.pos = u.vp * vec4(wp, 1.);
    o.lp = l;
    o.wc = ctr;
    o.rad = final_rad;
    o.col = final_col;
    o.dep = length(u.eye - ctr);
    return o;
}

@fragment fn fs(i: V) -> @location(0) vec4<f32> {
    let dd = length(i.lp);
    if (dd > 1.) { discard; }

    let z = sqrt(1. - dd * dd);
    let n = vec3(i.lp, z);

    let ld = normalize(vec3(0.3, 0.6, 1.0));
    let diff = max(dot(n, ld), 0.);
    let vd = vec3(0., 0., 1.);
    let spec = pow(max(dot(n, normalize(ld + vd)), 0.), 80.);
    let fr = pow(1. - max(dot(n, vd), 0.), 3.);

    let fade = smoothstep(16., 5., i.dep);

    let col = i.col * (0.08 + diff * 0.55) + vec3(1.) * spec * 0.5 + i.col * fr * 0.25;
    let al = fade * (0.4 + 0.35 * z);
    return vec4(col * al, al);
}
`;

const V3 = {
  sub: (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  cross: (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  dot: (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  norm: (v: number[]) => {
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  },
};

function perspective(fov: number, asp: number, n: number, f: number) {
  const t = 1 / Math.tan(fov / 2);
  const nf = 1 / (n - f);
  return new Float32Array([
    t / asp, 0, 0, 0,
    0, t, 0, 0,
    0, 0, (f + n) * nf, -1,
    0, 0, 2 * f * n * nf, 0,
  ]);
}

function lookAt(e: number[], c: number[], up: number[]) {
  const f = V3.norm(V3.sub(c, e));
  const s = V3.norm(V3.cross(f, up));
  const u = V3.cross(s, f);
  return new Float32Array([
    s[0], u[0], -f[0], 0,
    s[1], u[1], -f[1], 0,
    s[2], u[2], -f[2], 0,
    -V3.dot(s, e), -V3.dot(u, e), V3.dot(f, e), 1,
  ]);
}

function mul(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
  return o;
}

export function AtomCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const smoothMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas || !navigator.gpu) return;

    let device: GPUDevice;
    let ctx: GPUCanvasContext;
    let pipe: GPURenderPipeline;
    let bg: GPUBindGroup;
    let uBuf: GPUBuffer;
    let iBuf: GPUBuffer;
    let depthTex: GPUTexture;
    let nAtoms: number;
    let rafId: number;
    let t0: number;
    let fmt: GPUTextureFormat;
    let dfmt = 'depth24plus' as GPUTextureFormat;

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    async function init() {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return;
      device = await adapter.requestDevice();
      ctx = canvas.getContext('webgpu')!;
      fmt = navigator.gpu.getPreferredCanvasFormat();

      // Generate lattice
      const N = 12;
      const a = 3.0;
      const data: number[] = [];
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++)
          for (let k = 0; k < N; k++) {
            const bx = (i - N / 2 + 0.5) * a;
            const by = (j - N / 2 + 0.5) * a;
            const bz = (k - N / 2 + 0.5) * a;
            data.push(bx, by, bz, 0.6, 0.482, 0.541, 0.878, Math.random() * 6.28);
            data.push(bx + 0.5 * a, by + 0.5 * a, bz + 0.5 * a, 0.45, 0.306, 0.804, 0.769, Math.random() * 6.28);
          }
      nAtoms = data.length / 8;

      iBuf = device.createBuffer({
        size: data.length * 4,
        usage: GPUBufferUsage.STORAGE,
        mappedAtCreation: true,
      });
      new Float32Array(iBuf.getMappedRange()).set(data);
      iBuf.unmap();

      uBuf = device.createBuffer({
        size: 96,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const mod = device.createShaderModule({ code: WGSL });

      const bgl = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        ],
      });

      pipe = device.createRenderPipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
        vertex: { module: mod, entryPoint: 'vs' },
        fragment: {
          module: mod,
          entryPoint: 'fs',
          targets: [
            {
              format: fmt,
              blend: {
                color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
              },
            },
          ],
        },
        primitive: { topology: 'triangle-list' },
        depthStencil: { format: dfmt, depthWriteEnabled: true, depthCompare: 'less' },
      });

      bg = device.createBindGroup({
        layout: bgl,
        entries: [
          { binding: 0, resource: { buffer: uBuf } },
          { binding: 1, resource: { buffer: iBuf } },
        ],
      });

      resize();
      window.addEventListener('resize', resize);

      t0 = performance.now();
      loop();
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.configure({ device, format: fmt, alphaMode: 'premultiplied' });
      if (depthTex) depthTex.destroy();
      depthTex = device.createTexture({
        size: [canvas.width, canvas.height],
        format: dfmt,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    function loop() {
      const t = (performance.now() - t0) / 1000;
      const asp = canvas.width / canvas.height;

      const iter = Math.floor(t / 3.5) + 1;
      const iterEl = document.getElementById('iter-num');
      if (iterEl) iterEl.textContent = '#' + iter;

      const scrollOffset = window.scrollY * 0.015;
      const pathStart = -18;
      const cx = pathStart + scrollOffset;
      const cy = pathStart + scrollOffset;
      const cz = pathStart + scrollOffset;

      smoothMouseRef.current.x += (mouseRef.current.x - smoothMouseRef.current.x) * 0.05;
      smoothMouseRef.current.y += (mouseRef.current.y - smoothMouseRef.current.y) * 0.05;

      const ox = Math.sin(t * 0.1) * 1.5 + smoothMouseRef.current.x * 2.5;
      const oy = Math.sin(t * 0.15) * 0.8 - smoothMouseRef.current.y * 2.5;
      const oz = Math.cos(t * 0.1) * 1.5;

      const eye = [cx + ox, cy + oy, cz + oz];
      const target = [cx + 4, cy + 4, cz + 4];

      const hudCoords = document.getElementById('hud-coords');
      if (hudCoords) {
        hudCoords.textContent = `POS: [${eye[0].toFixed(3)}, ${eye[1].toFixed(3)}, ${eye[2].toFixed(3)}]`;
      }

      const ud = new Float32Array(24);
      ud.set(mul(perspective(0.7, asp, 0.1, 100), lookAt(eye, target, [0, 1, 0])));
      ud[16] = eye[0];
      ud[17] = eye[1];
      ud[18] = eye[2];
      ud[19] = t;
      ud[20] = canvas.width;
      ud[21] = canvas.height;
      device.queue.writeBuffer(uBuf, 0, ud);

      const enc = device.createCommandEncoder();
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: depthTex.createView(),
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'discard',
        },
      });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, bg);
      pass.draw(6, nAtoms);
      pass.end();

      device.queue.submit([enc.finish()]);
      rafId = requestAnimationFrame(loop);
    }

    init();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
      if (depthTex) depthTex.destroy();
      if (uBuf) uBuf.destroy();
      if (iBuf) iBuf.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -2,
        pointerEvents: 'none',
      }}
    />
  );
}
