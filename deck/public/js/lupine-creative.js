/* ═══════════════════════════════════════════════════════════════
   LUPINE CREATIVE LAYER
   The Anomaly treatment: global shader field, custom cursor, glitch
   type, and a manual theme toggle. Built to feel expensive.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.min.js';

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  /* ── THEME TOGGLE ────────────────────────────────────────────── */
  function initTheme() {
    const root = document.documentElement;
    const saved = localStorage.getItem('lupine-theme');
    if (saved === 'light') root.classList.add('theme-light');

    const toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;

    function updateLabel() {
      const isLight = root.classList.contains('theme-light');
      toggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
      toggle.textContent = isLight ? '◐' : '◑';
    }
    updateLabel();

    toggle.addEventListener('click', () => {
      root.classList.toggle('theme-light');
      const isLight = root.classList.contains('theme-light');
      localStorage.setItem('lupine-theme', isLight ? 'light' : 'dark');
      updateLabel();
    });
  }

  /* ── GLOBAL SHADER FIELD ─────────────────────────────────────── */
  function initShaderField() {
    const canvas = document.querySelector('.shader-field');
    if (!canvas || prefersReducedMotion) {
      if (canvas) canvas.style.display = 'none';
      return;
    }

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      canvas.style.display = 'none';
      return;
    }

    let width, height;
    let scrollSpeed = 0;
    let mouse = new THREE.Vector2(0.5, 0.5);
    let targetMouse = new THREE.Vector2(0.5, 0.5);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uScroll;
      varying vec2 vUv;

      // Simplex noise functions
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                            -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                         + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = vUv;
        float t = uTime * 0.05;
        float scroll = uScroll * 0.3;

        // Layered noise.
        float n1 = snoise(uv * 1.5 + t + scroll);
        float n2 = snoise(uv * 3.0 - t * 0.7 + vec2(scroll, -scroll));
        float n3 = snoise(uv * 6.0 + t * 0.3);
        float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

        // Mouse influence: a subtle warp.
        vec2 mouseDelta = uMouse - uv;
        float mouseDist = length(mouseDelta);
        float mouseField = smoothstep(0.5, 0.0, mouseDist) * 0.25;

        // Palette: deep space, lupine, violet, black.
        vec3 deep = vec3(0.039, 0.043, 0.063);
        vec3 lupine = vec3(0.373, 0.443, 0.890);
        vec3 violet = vec3(0.42, 0.18, 0.55);
        vec3 teal = vec3(0.08, 0.25, 0.32);

        vec3 color = deep;
        color = mix(color, lupine, smoothstep(-0.2, 0.6, noise + mouseField));
        color = mix(color, violet, smoothstep(0.2, 0.8, noise * 0.7 + mouseField * 0.5));
        color = mix(color, teal, smoothstep(0.4, 0.9, n2));

        // Vignette.
        float vignette = 1.0 - smoothstep(0.3, 1.2, length(uv - 0.5) * 1.3);
        color *= vignette;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: mouse },
        uScroll: { value: 0 },
      },
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height, false);
      material.uniforms.uResolution.value.set(width, height);
    }

    let lastScroll = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      scrollSpeed += Math.abs(y - lastScroll) * 0.002;
      lastScroll = y;
    }

    window.addEventListener('mousemove', (e) => {
      targetMouse.x = e.clientX / width;
      targetMouse.y = 1 - e.clientY / height;
    }, { passive: true });

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    resize();

    let rafId;
    function animate() {
      material.uniforms.uTime.value += 0.016;
      mouse.lerp(targetMouse, 0.04);
      material.uniforms.uMouse.value.copy(mouse);
      scrollSpeed *= 0.95;
      material.uniforms.uScroll.value += scrollSpeed;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    animate();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && rafId) cancelAnimationFrame(rafId);
      else if (!document.hidden) animate();
    });
  }

  /* ── CUSTOM CURSOR ───────────────────────────────────────────── */
  function initCursor() {
    if (isCoarse || prefersReducedMotion) return;

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mx = 0, my = 0, ringX = 0, ringY = 0;
    let active = false;
    let rafId;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!active) {
        active = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
        animateRing();
      }
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
    });

    function animateRing() {
      ringX += (mx - ringX) * 0.12;
      ringY += (my - ringY) * 0.12;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      if (active) rafId = requestAnimationFrame(animateRing);
    }

    // Hover states.
    document.querySelectorAll('a, button, .btn').forEach((el) => {
      el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
    });
  }

  /* ── GLITCH / SCRAMBLE TEXT ──────────────────────────────────── */
  function initGlitchText() {
    if (prefersReducedMotion) return;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const elements = document.querySelectorAll('.glitch');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            scramble(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    elements.forEach((el) => observer.observe(el));

    function scramble(el) {
      const original = el.dataset.text || el.textContent;
      el.dataset.text = original;
      const length = original.length;
      let iterations = 0;
      const max = 18;

      const interval = setInterval(() => {
        el.textContent = original
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < iterations) return original[i];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
        iterations += length / max;
        if (iterations >= length) {
          el.textContent = original;
          clearInterval(interval);
        }
      }, 30);
    }
  }

  /* ── BOOT ────────────────────────────────────────────────────── */
  function boot() {
    if (!isCoarse && !prefersReducedMotion) {
      document.body.classList.add('has-custom-cursor');
    }
    initTheme();
    initShaderField();
    initCursor();
    initGlitchText();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
