import { useState, useEffect, useRef, useCallback } from "react";

/*  ════════════════════════════════════════════════════════════════
    ATLAS View — Working Preview
    
    This is a real LAMMPS dump file viewer. Drag any .lammpstrj 
    or dump file onto it and it will parse + render the atoms.
    
    Pre-loaded with a 120-atom crack propagation example so it 
    works immediately on load.
    ════════════════════════════════════════════════════════════════ */

// ── Pure JS LAMMPS Dump Parser ──────────────────────────────────

function parseLammpsDump(text) {
  const frames = [];
  const chunks = text.split("ITEM: TIMESTEP\n").slice(1);
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const timestep = parseInt(lines[0]);
    const natoms = parseInt(lines[2]);
    const boxLines = [lines[4], lines[5], lines[6]].map(l => l.trim().split(/\s+/).map(Number));
    const box = [boxLines[0][0], boxLines[0][1], boxLines[1][0], boxLines[1][1], boxLines[2][0], boxLines[2][1]];
    const header = lines[7].replace("ITEM: ATOMS", "").trim().split(/\s+/);
    const xi = header.indexOf("x"), yi = header.indexOf("y"), zi = header.indexOf("z");
    const xsi = header.indexOf("xs"), ysi = header.indexOf("ys"), zsi = header.indexOf("zs");
    const ti = header.indexOf("type"), idi = header.indexOf("id");
    const scaled = xsi >= 0;
    const lx = box[1]-box[0], ly = box[3]-box[2], lz = box[5]-box[4];
    // Find extra property columns
    const skip = new Set([idi,ti,xi,yi,zi,xsi,ysi,zsi].filter(i=>i>=0));
    const propCols = header.map((h,i) => skip.has(i) ? null : {name:h, idx:i}).filter(Boolean);
    
    const positions = [], types = [], ids = [];
    const props = {};
    propCols.forEach(p => props[p.name] = []);
    
    for (let i = 8; i < 8 + natoms && i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length < 3) continue;
      ids.push(idi >= 0 ? parseInt(parts[idi]) : ids.length + 1);
      types.push(ti >= 0 ? parseInt(parts[ti]) : 1);
      let px, py, pz;
      if (scaled) {
        px = box[0] + parseFloat(parts[xsi]) * lx;
        py = box[2] + parseFloat(parts[ysi]) * ly;
        pz = box[4] + parseFloat(parts[zsi]) * lz;
      } else {
        px = parseFloat(parts[xi >= 0 ? xi : 2]);
        py = parseFloat(parts[yi >= 0 ? yi : 3]);
        pz = parseFloat(parts[zi >= 0 ? zi : 4]);
      }
      positions.push(px, py, pz);
      propCols.forEach(p => props[p.name].push(parseFloat(parts[p.idx]) || 0));
    }
    frames.push({ timestep, natoms: ids.length, box, positions, types, ids, props, columns: header });
  }
  return frames;
}

// ── Pre-loaded example data (crack propagation, 3 keyframes) ────

const EX={"n":120,"bx":155.6,"by":68.8,"k":[{"t":0,"x":[-0.01,38.25,76.52,114.73,1.28,39.53,77.75,116.04,-0.04,38.26,76.49,114.76,1.25,39.53,77.81,116.04,0.01,38.23,76.5,114.75,1.3,39.54,77.78,116.01,0.05,38.23,76.51,114.76,1.26,39.51,77.78,116.01,0.01,38.22,76.5,114.76,1.29,39.51,77.78,116.01,-0.02,38.25,76.5,114.75,1.31,39.53,77.78,116.04,-0.01,38.28,76.5,114.76,1.26,39.5,77.75,116.01,0.01,38.25,76.49,114.74,1.24,39.53,77.75,116.02,-0.01,38.22,76.5,114.76,1.29,39.52,77.77,115.99,0.04,38.28,76.49,114.75,1.28,39.5,77.79,116.03,-0.03,38.28,76.5,114.74,1.28,39.51,77.77,116.04,-0.01,38.22,76.5,114.73,1.3,39.51,77.78,116,0.04,38.25,76.48,114.77,1.29,39.5,77.79,116.03,-0.01,38.26,76.49,114.73,1.25,39.51,77.78,116.05,0.02,38.24,76.49,114.74,1.29,39.56,77.79,116.02],"y":[.01,0,0,-.01,2.19,2.21,2.23,2.22,4.4,4.4,4.39,4.45,6.61,6.64,6.63,6.64,8.85,8.86,8.8,8.84,11.04,11.06,10.99,11.04,13.25,13.25,13.25,13.24,15.49,15.45,15.45,15.46,17.71,17.65,17.66,17.66,19.89,19.89,19.88,19.86,22.05,22.09,22.04,22.09,24.29,24.28,24.3,24.28,26.48,26.51,26.5,26.52,28.68,28.67,28.76,28.7,30.77,30.89,30.9,30.9,32.7,33.15,33.16,33.15,35.84,35.36,35.33,35.33,37.71,37.58,37.52,37.57,39.74,39.78,39.81,39.75,41.98,41.98,41.92,41.98,44.17,44.14,44.17,44.16,46.36,46.36,46.42,46.34,48.59,48.59,48.59,48.57,50.8,50.78,50.77,50.78,53.01,52.99,53.03,53.01,55.24,55.24,55.19,55.22,57.44,57.46,57.41,57.4,59.64,59.62,59.65,59.59,61.84,61.86,61.84,61.8,64.03,64.03,64,64.05],"s":[.12,.11,.08,.17,.18,.06,.14,.14,.14,.05,.13,.08,.11,.01,.08,.14,.1,.06,.1,.11,.13,.05,0,.07,.13,.15,.09,.08,.05,.21,.09,.1,.06,.12,.19,.05,.03,.1,.07,.09,.06,.27,.1,.16,.06,.14,.16,.09,.07,.12,.15,-.01,.14,.13,.12,.11,.17,.08,.06,.02,.13,.04,.12,.07,1.12,.14,.12,.13,.17,.09,.15,.02,.2,.13,.08,.17,.13,.17,.1,.18,.05,.06,.04,.14,.11,.13,.09,.05,.14,.14,.08,.13,.12,.11,.06,.05,.13,.05,-.03,.05,.09,.12,.08,.06,.1,.05,.14,.15,.07,.09,.12,.05,.1,.12,.24,.09,.03,.05,.15,.12]},{"t":1400,"x":[-0.02,38.22,76.54,114.77,1.23,39.5,77.76,116.03,-0.01,38.26,76.49,114.74,1.26,39.53,77.79,116.02,0,38.23,76.52,114.75,1.23,39.52,77.78,116.04,0,38.24,76.46,114.7,1.25,39.49,77.78,115.99,0.02,38.27,76.48,114.78,1.29,39.55,77.76,116.02,0,38.27,76.51,114.74,1.31,39.56,77.77,116.04,0.01,38.27,76.5,114.72,1.28,39.49,77.78,116.05,0.02,38.22,76.52,114.74,1.28,39.49,77.78,116.05,-0.07,38.2,76.46,114.73,1.3,39.47,77.77,116.02,-0.02,38.25,76.51,114.78,1.27,39.52,77.73,116.01,0.01,38.24,76.51,114.76,1.29,39.5,77.78,116.05,0.04,38.24,76.51,114.74,1.26,39.55,77.74,116.04,0.03,38.25,76.5,114.77,1.27,39.54,77.74,116.04,0.01,38.23,76.47,114.77,1.29,39.54,77.76,116.01,0,38.25,76.49,114.76,1.29,39.54,77.81,116.02],"y":[.01,-.01,-.04,.01,2.19,2.18,2.19,2.19,4.41,4.4,4.42,4.44,6.63,6.61,6.64,6.65,8.88,8.85,8.82,8.83,11.03,11.06,11.06,11.05,13.26,13.22,13.23,13.26,15.42,15.43,15.5,15.45,17.66,17.66,17.68,17.67,18.96,18.66,19.91,19.86,21,20.24,22.12,22.05,22.93,22.3,24.28,24.28,24.69,23.55,26.53,26.51,26.37,25.53,28.74,28.72,27.97,26.14,30.91,30.97,29.35,27.75,33.12,33.14,39.21,41.6,35.33,35.36,40.57,41.79,37.52,37.52,42.15,43.77,39.75,39.75,43.84,44.56,41.94,41.94,45.64,46.61,44.17,44.15,47.54,47.94,46.38,46.34,49.52,50.06,48.57,48.6,50.79,50.82,50.8,50.82,52.98,52.96,52.99,52.98,55.23,55.22,55.22,55.23,57.42,57.42,57.45,57.41,59.61,59.63,59.63,59.61,61.86,61.81,61.79,61.85,64.07,64,64.03,64.06],"s":[.14,.15,.12,.24,.05,.1,.08,.12,.19,.11,.09,.11,.16,.13,.08,.08,.11,.14,.12,.15,.11,.13,.01,.09,.19,.05,.06,.13,.15,.06,.04,.19,.08,.09,.09,.11,.16,.13,.11,.15,.07,.19,.12,.12,.1,.02,.15,.08,.08,.06,.07,0,1,1.73,.14,.19,1.17,2.12,.1,.04,1.1,2.67,.09,.01,1.16,2.33,.09,.1,1.07,2.01,.03,.13,1.12,1.7,.09,.2,.09,.43,.06,.13,.09,.1,.22,.09,.19,.11,.08,.09,.05,.08,.13,.05,.08,.04,.12,.09,.11,.11,.14,.16,.09,.04,.21,.03,.09,.08,.09,.1,.05,0,.02,.11,.08,.18,.11,.06,.11,.17,.11,.11]},{"t":2800,"x":[.03,38.24,76.49,114.78,1.28,39.52,77.8,116.01,.02,38.25,76.52,114.76,1.26,39.52,77.73,115.99,.03,38.26,76.47,114.78,1.28,39.53,77.78,116,0,38.25,76.5,114.73,1.26,39.53,77.79,116.03,.02,38.24,76.54,114.75,1.28,39.54,77.74,116.04,.01,38.31,76.52,114.76,1.29,39.54,77.78,116.03,-.03,38.23,76.51,114.76,1.25,39.51,77.76,116.03,0,38.24,76.46,114.75,1.3,39.58,77.81,116.05,-.01,38.23,76.5,114.75,1.28,39.53,77.82,116.04,0,38.22,76.48,114.77,1.28,39.48,77.75,116.08,-.02,38.27,76.51,114.75,1.23,39.52,77.78,116.04,.02,38.26,76.5,114.75,1.26,39.51,77.77,116.02,.03,38.28,76.55,114.74,1.27,39.53,77.76,116.02,0,38.22,76.48,114.75,1.27,39.54,77.77,116,.01,38.25,76.5,114.73,1.3,39.5,77.8,116.01],"y":[-.01,.01,.03,-.02,2.17,2.18,2.21,2.23,4.43,4.41,4.41,4.44,6.61,6.62,6.62,6.65,8.82,8.83,8.82,8.83,9.2,9.23,11.05,11.06,11.19,11.16,13.24,13.25,13.03,13.03,15.45,15.46,14.93,14.89,17.64,17.66,16.71,16.67,19.87,19.85,18.45,18.47,22.08,22.06,20.1,20.11,24.29,24.28,21.69,21.71,26.51,26.51,23.25,23.19,28.72,28.67,24.61,24.62,30.98,30.93,25.92,25.96,33.18,33.16,42.71,42.68,35.31,35.3,43.95,43.95,37.58,37.54,45.32,45.34,39.74,39.77,46.79,46.81,41.94,41.95,48.4,48.41,44.16,44.16,50.09,50.04,46.37,46.35,51.79,51.81,48.59,48.59,53.6,53.65,50.84,50.77,55.48,55.45,53.03,53,57.3,57.33,55.18,55.2,59.28,59.26,57.38,57.42,61.25,61.28,59.64,59.62,61.88,61.85,61.82,61.87,64.07,64.05,64.06,64.05],"s":[.09,.14,.16,.14,.02,.16,.08,-.01,.16,.14,.06,.13,.1,.2,0,.15,.08,.09,.04,.06,.15,.13,.05,.13,.04,.09,.08,.1,.08,.04,.14,.13,.1,.14,.15,.09,.11,.11,.13,.03,.09,.06,.12,.09,1.19,1.04,.17,.18,1.13,1.15,.11,.11,1.08,1.05,.62,.12,1.12,1.03,1.07,.13,1.05,1.05,1,.18,1.12,1.15,1.41,.01,1.1,1.03,.61,.16,1.24,1.11,.73,.09,1.04,1.1,.17,.04,1.1,1.11,.18,.13,.16,.14,0,.02,.15,.21,.13,.06,.08,.16,.11,.08,.09,.15,.14,.07,.02,.02,.09,.13,.1,.09,.13,.15,.13,.12,.19,.09,.15,.07,.07,.05,.08,.05,.14,.14]}],"th":[{T:299,P:-3.54,K:.038,c:10},{T:299,P:-3.54,K:.039,c:20},{T:304,P:-3.52,K:.041,c:27},{T:309,P:-3.52,K:.04,c:32},{T:314,P:-3.5,K:.044,c:37},{T:354,P:-3.5,K:.068,c:42},{T:399,P:-3.49,K:.097,c:46},{T:438,P:-3.48,K:.119,c:50},{T:413,P:-3.47,K:.1,c:54},{T:355,P:-3.46,K:.069,c:58},{T:314,P:-3.46,K:.047,c:61},{T:310,P:-3.45,K:.041,c:65},{T:293,P:-3.43,K:.038,c:68},{T:301,P:-3.44,K:.038,c:72},{T:303,P:-3.42,K:.043,c:75}]};

// ── Rendering helpers ───────────────────────────────────────────

const lerp = (a,b,t) => a+(b-a)*t;
function viridisRGB(t) {
  t = Math.max(0, Math.min(1, t));
  return [
    Math.min(255, Math.round(68 + t*187 - t*t*90)),
    Math.min(255, Math.round(2 + t*230)),
    Math.min(255, Math.round(84 + (1-t)*130*t*2.8 + t*(37-84))),
  ];
}

function getExampleAtoms(fi, nf) {
  const f = fi/(nf-1);
  let A,B,lt;
  if(f<=.5){A=EX.k[0];B=EX.k[1];lt=f*2}else{A=EX.k[1];B=EX.k[2];lt=(f-.5)*2}
  const o=[];
  for(let i=0;i<EX.n;i++) o.push({x:lerp(A.x[i],B.x[i],lt),y:lerp(A.y[i],B.y[i],lt),s:lerp(A.s[i],B.s[i],lt)});
  return o;
}

function renderFrame(ctx, W, H, atoms, box, colorProp, sMax) {
  ctx.fillStyle = "#040610";
  ctx.fillRect(0,0,W,H);
  const pad=16, sc=Math.min((W-pad*2)/box[0],(H-pad*2)/box[1]);
  const offX=(W-box[0]*sc)/2, offY=(H-box[1]*sc)/2;
  // Cell
  ctx.strokeStyle="#111828"; ctx.lineWidth=.5; ctx.strokeRect(offX,offY,box[0]*sc,box[1]*sc);
  // Sort by stress for proper layering
  const sorted = atoms.slice().sort((a,b)=>a.s-b.s);
  const R = Math.max(2.5, 3.2*sc);
  for(const a of sorted){
    const px=offX+a.x*sc, py=offY+a.y*sc;
    if(px<-R*2||px>W+R*2||py<-R*2||py>H+R*2) continue;
    const norm=Math.max(0,Math.min(1,a.s/sMax));
    const [cr,cg,cb]=viridisRGB(norm);
    // Shadow
    ctx.globalAlpha=.22; ctx.fillStyle="#000";
    ctx.beginPath(); ctx.arc(px+.7,py+1,R*1.6,0,Math.PI*2); ctx.fill();
    // Sphere
    ctx.globalAlpha=.94;
    const g=ctx.createRadialGradient(px-R*.2,py-R*.22,R*.05,px,py,R);
    g.addColorStop(0,"rgba(255,255,255,.25)");
    g.addColorStop(.32,`rgb(${cr},${cg},${cb})`);
    g.addColorStop(.85,`rgb(${cr*.55|0},${cg*.55|0},${cb*.55|0})`);
    g.addColorStop(1,`rgba(${cr*.3|0},${cg*.3|0},${cb*.3|0},.7)`);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,R,0,Math.PI*2); ctx.fill();
    if(norm>.6){
      ctx.globalAlpha=(norm-.6)*.3;
      const bl=ctx.createRadialGradient(px,py,R*.5,px,py,R*2.5);
      bl.addColorStop(0,`rgba(${cr},${cg},${cb},.25)`); bl.addColorStop(1,"transparent");
      ctx.fillStyle=bl; ctx.beginPath(); ctx.arc(px,py,R*2.5,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.globalAlpha=1;
}

// ── Sparkline SVG ───────────────────────────────────────────────

function Spark({vals, color, w=56, h=20, idx}) {
  const mn=Math.min(...vals), mx=Math.max(...vals), rng=mx-mn||1;
  let d="";
  vals.forEach((v,i)=>{
    const x=(i/(vals.length-1))*w, y=h-1-((v-mn)/rng)*(h-3);
    d+=(i===0?"M":"L")+x.toFixed(1)+","+y.toFixed(1);
  });
  const cx=(idx/(vals.length-1))*w, cy=h-1-((vals[idx]-mn)/rng)*(h-3);
  return <svg width={w} height={h} style={{display:"block",overflow:"visible"}}>
    <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
    <circle cx={cx} cy={cy} r="3" fill={color}/><circle cx={cx} cy={cy} r="1.2" fill="#040610"/>
  </svg>;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ATLASView() {
  const cvs = useRef(null), wrap = useRef(null);
  const [mode, setMode] = useState("example"); // "example" | "user"
  const [frames, setFrames] = useState(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("crack2d.lammpstrj");
  const [colorProp, setColorProp] = useState(null); // null = first stress-like prop
  const [propNames, setPropNames] = useState([]);
  const timer = useRef(null);
  const NF = mode === "example" ? 15 : (frames?.length || 1);

  // Playback
  useEffect(() => {
    if (!playing) { clearInterval(timer.current); return; }
    timer.current = setInterval(() => setFrame(f => (f+1)%NF), 420);
    return () => clearInterval(timer.current);
  }, [playing, NF]);

  // Render
  useEffect(() => {
    const c = cvs.current, w = wrap.current;
    if (!c || !w) return;
    const W = w.offsetWidth, H = w.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio||2, 3);
    c.width=W*dpr; c.height=H*dpr; c.style.width=W+"px"; c.style.height=H+"px";
    const ctx = c.getContext("2d"); ctx.scale(dpr,dpr);

    let atoms, box, sMax=1.5;
    if (mode === "example") {
      atoms = getExampleAtoms(frame, NF);
      box = [EX.bx, EX.by];
    } else if (frames && frames[frame]) {
      const fr = frames[frame];
      atoms = [];
      // Find stress-like property
      const sp = colorProp || Object.keys(fr.props).find(k => k.includes("stress") || k.includes("pe") || k.includes("eng")) || Object.keys(fr.props)[0];
      const propData = fr.props[sp] || [];
      sMax = Math.max(.01, ...propData.map(Math.abs));
      for (let i = 0; i < fr.natoms; i++) {
        atoms.push({ x: fr.positions[i*3], y: fr.positions[i*3+1], s: propData[i] || 0 });
      }
      box = [fr.box[1]-fr.box[0], fr.box[3]-fr.box[2]];
    } else return;

    renderFrame(ctx, W, H, atoms, box, null, sMax);
  }, [frame, mode, frames, colorProp]);

  // File drop handler
  const handleFile = useCallback(async (file) => {
    setPlaying(false);
    setFileName(file.name);
    let text;
    if (file.name.endsWith(".gz")) {
      const buf = await file.arrayBuffer();
      const ds = new DecompressionStream("gzip");
      const stream = new Blob([buf]).stream().pipeThrough(ds);
      text = await new Response(stream).text();
    } else {
      text = await file.text();
    }
    const parsed = parseLammpsDump(text);
    if (parsed.length === 0) { alert("No frames found in file"); return; }
    setFrames(parsed);
    setMode("user");
    setFrame(0);
    setPlaying(true);
    // Extract property names
    const pn = Object.keys(parsed[0].props);
    setPropNames(pn);
    setColorProp(pn.find(k=>k.includes("stress")||k.includes("pe")||k.includes("eng")) || pn[0] || null);
  }, []);

  const onDrop = useCallback(e => { e.preventDefault(); setDragOver(false); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  const th = mode==="example" ? EX.th[frame] : null;
  const curFrame = mode==="user" && frames ? frames[frame] : null;

  return (
    <div style={{position:"fixed",inset:0,background:"#040610",display:"flex",flexDirection:"column",
      fontFamily:"'SF Pro Text',-apple-system,'Helvetica Neue',sans-serif",color:"#8090aa",
      WebkitTapHighlightColor:"transparent",userSelect:"none",overflow:"hidden"}}
      onDrop={onDrop} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}>

      {/* ─── Top bar ─── */}
      <div style={{height:40,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 14px",borderBottom:"1px solid #0e1320",background:"#060810"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:700,color:"#d8e0ee",letterSpacing:-.3}}>
            ATLAS<span style={{color:"#00c8f0"}}>View</span>
          </span>
          <span style={{color:"#1a2030"}}>|</span>
          <span style={{fontSize:10,color:"#3a4a65",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fileName}</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",fontSize:9}}>
          <span style={{color:"#3acea0"}}>{mode==="example"?120:curFrame?.natoms||0} atoms</span>
          <span style={{color:"#1a2030"}}>·</span>
          <span style={{color:"#e8b840"}}>{NF}f</span>
        </div>
      </div>

      {/* ─── Viewport ─── */}
      <div ref={wrap} style={{flex:1,position:"relative",minHeight:0}}>
        <canvas ref={cvs} style={{position:"absolute",inset:0}}/>

        {/* Drag overlay */}
        {dragOver && <div style={{position:"absolute",inset:0,background:"rgba(0,200,240,.06)",
          border:"2px dashed rgba(0,200,240,.3)",borderRadius:8,margin:8,display:"flex",alignItems:"center",
          justifyContent:"center",zIndex:20,backdropFilter:"blur(4px)"}}>
          <div style={{fontSize:18,color:"rgba(0,200,240,.7)",fontWeight:300}}>Drop LAMMPS file</div>
        </div>}

        {/* Top-left: title + metrics */}
        <div style={{position:"absolute",top:10,left:12,pointerEvents:"none"}}>
          <div style={{fontSize:18,fontWeight:300,color:"rgba(200,212,228,.8)",letterSpacing:-.5,
            fontFamily:"Georgia,'Times New Roman',serif",fontStyle:"italic",lineHeight:1.2}}>
            {mode==="example"?"Crack Propagation":"Custom Data"}
          </div>
          {mode==="example" && <div style={{fontSize:9,color:"#2a3a50",marginTop:2}}>2D Cu · EAM · Mode-I</div>}
        </div>

        {/* Top-right: frame */}
        <div style={{position:"absolute",top:10,right:12,textAlign:"right",pointerEvents:"none"}}>
          <div style={{fontSize:28,fontWeight:200,letterSpacing:-2,color:"rgba(210,220,240,.7)",lineHeight:1,
            fontVariantNumeric:"tabular-nums"}}>
            {String(frame+1).padStart(2,"0")}
            <span style={{fontSize:12,color:"rgba(80,100,130,.5)",fontWeight:400,letterSpacing:0}}>/{NF}</span>
          </div>
        </div>

        {/* Bottom-left: key values */}
        <div style={{position:"absolute",bottom:100,left:12,pointerEvents:"none"}}>
          {mode==="example" && <>
            <div style={{marginBottom:6}}>
              <div style={{fontSize:7,letterSpacing:1.5,color:"rgba(80,100,130,.45)",textTransform:"uppercase",marginBottom:1}}>Crack</div>
              <div style={{fontSize:20,fontWeight:300,color:"rgba(255,84,114,.8)",letterSpacing:-1,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>
                {th.c}<span style={{fontSize:9,color:"rgba(255,84,114,.35)",fontWeight:400}}> Å</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:7,letterSpacing:1.5,color:"rgba(80,100,130,.45)",textTransform:"uppercase",marginBottom:1}}>Temp</div>
              <div style={{fontSize:20,fontWeight:300,color:"rgba(0,200,240,.75)",letterSpacing:-1,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>
                {th.T}<span style={{fontSize:9,color:"rgba(0,200,240,.3)",fontWeight:400}}> K</span>
              </div>
            </div>
          </>}
          {mode==="user" && propNames.length>0 && (
            <div style={{pointerEvents:"auto"}}>
              <div style={{fontSize:7,letterSpacing:1.5,color:"rgba(80,100,130,.45)",textTransform:"uppercase",marginBottom:3}}>Color by</div>
              {propNames.slice(0,4).map(p => (
                <button key={p} onClick={()=>setColorProp(p)} style={{
                  display:"block",fontSize:10,padding:"2px 8px",marginBottom:2,borderRadius:3,cursor:"pointer",
                  background:colorProp===p?"rgba(0,200,240,.12)":"transparent",
                  border:`1px solid ${colorProp===p?"rgba(0,200,240,.3)":"transparent"}`,
                  color:colorProp===p?"#00c8f0":"#4a5a75",
                }}>{p}</button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom-right: sparklines (example mode) */}
        {mode==="example" && <div style={{position:"absolute",bottom:100,right:12,pointerEvents:"none",
          display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
          {[{k:"T",l:"Temp",c:"rgba(255,84,114,.65)"},{k:"K",l:"KE",c:"rgba(58,206,160,.65)"},{k:"P",l:"PE",c:"rgba(0,200,240,.65)"}].map(s=>
            <div key={s.k} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{fontSize:7,color:"rgba(80,100,130,.35)",letterSpacing:1,textTransform:"uppercase"}}>{s.l}</div>
              <Spark vals={EX.th.map(t=>t[s.k])} color={s.c} w={50} h={18} idx={frame}/>
            </div>
          )}
        </div>}

        {/* Drop hint when no user file */}
        {mode==="example" && <div style={{position:"absolute",bottom:100,left:"50%",transform:"translateX(-50%)",
          pointerEvents:"none",textAlign:"center",opacity:.35}}>
          <div style={{fontSize:10,color:"#4a5a75"}}>Drag a .lammpstrj file to load your own data</div>
        </div>}

        {/* Colorbar */}
        <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",width:4,height:100,
          borderRadius:2,overflow:"hidden",opacity:.4,pointerEvents:"none",
          background:"linear-gradient(to bottom,rgb(253,231,37),rgb(33,145,140),rgb(68,1,84))"}}/>
      </div>

      {/* ─── Timeline ─── */}
      <div style={{height:80,flexShrink:0,padding:"0 16px",
        paddingBottom:"max(env(safe-area-inset-bottom,8px),8px)",
        display:"flex",flexDirection:"column",justifyContent:"center",gap:6,
        background:"linear-gradient(to top,rgba(4,6,16,.97),rgba(4,6,16,.7))"}}>
        
        {/* Dot timeline */}
        <div style={{display:"flex",alignItems:"center",gap:0,justifyContent:"space-between"}}>
          <button onClick={()=>setPlaying(p=>!p)} style={{
            width:36,height:36,borderRadius:18,border:"none",flexShrink:0,marginRight:10,
            background:playing?"rgba(255,84,114,.12)":"rgba(0,200,240,.12)",
            color:playing?"#ff5472":"#00c8f0",fontSize:14,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>{playing?"■":"▶"}</button>
          
          <div style={{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 2px"}}>
            {Array.from({length:NF},(_,i)=>(
              <div key={i} onClick={()=>{setPlaying(false);setFrame(i)}}
                style={{padding:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{
                  width:i===frame?10:5, height:i===frame?10:5, borderRadius:"50%",
                  background:i===frame?"rgba(0,200,240,.9)":i<frame?"rgba(0,200,240,.22)":"rgba(80,100,130,.12)",
                  boxShadow:i===frame?"0 0 10px rgba(0,200,240,.4)":"none",
                  transition:"all .25s",
                }}/>
              </div>
            ))}
          </div>
        </div>

        {/* Viridis strip + labels */}
        <div style={{height:3,borderRadius:2,marginLeft:48,
          background:"linear-gradient(90deg,rgb(68,1,84),rgb(33,145,140),rgb(253,231,37))",opacity:.3}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginLeft:48,
          fontSize:9,color:"rgba(80,100,130,.35)"}}>
          <span style={{fontFamily:"Georgia,serif",fontStyle:"italic",fontSize:10,color:"rgba(180,190,210,.4)"}}>
            {mode==="example"?"Crack Propagation":fileName}
          </span>
          <span style={{fontVariantNumeric:"tabular-nums",color:"rgba(180,190,210,.3)"}}>
            t = {mode==="example"?frame*200:(curFrame?.timestep||0)}
          </span>
        </div>
      </div>
    </div>
  );
}
