import { useState, useEffect, useRef } from "react";

/* ─── constants ─── */
const SECTIONS = [
  "hero","problem","solution","architecture","pipeline","verification","roadmap","landscape","community"
];
const SECTION_TITLES = {
  hero:"",problem:"The Problem",solution:"The Solution",architecture:"Architecture",
  pipeline:"The Pipeline",verification:"Verification",roadmap:"Roadmap",
  landscape:"Landscape",community:"Community"
};

const C = {
  bg:"#060a12",bg2:"#0c1220",bg3:"#111a2e",
  border:"#1a2540",border2:"#243050",
  text:"#c8d6e5",dim:"#5a6e8a",dimmer:"#3a4e6a",
  accent:"#00d4ff",accentDim:"#00d4ff44",
  green:"#00e88f",greenDim:"#00e88f44",
  violet:"#a78bfa",violetDim:"#a78bfa44",
  orange:"#ff8c42",orangeDim:"#ff8c4244",
  red:"#ff4d6a",redDim:"#ff4d6a44",
  gold:"#fbbf24",goldDim:"#fbbf2444",
};

/* ─── Animated Orbital Background ─── */
function OrbitalBg() {
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",opacity:0.18}}>
      {[120,200,300,420].map((r,i)=>(
        <div key={i} style={{
          position:"absolute",top:"50%",left:"50%",
          width:r*2,height:r*2,
          marginTop:-r,marginLeft:-r,
          border:`1px solid ${C.accent}`,
          borderRadius:"50%",
          animation:`spin${i%2===0?'':'Rev'} ${20+i*12}s linear infinite`,
          opacity:0.4+i*0.15,
        }}>
          <div style={{
            position:"absolute",
            width:6-i*0.5,height:6-i*0.5,borderRadius:"50%",
            background:C.accent,
            top:-3,left:"50%",marginLeft:-3,
            boxShadow:`0 0 12px ${C.accent}`,
          }}/>
        </div>
      ))}
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes spinRev{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
      `}</style>
    </div>
  );
}

/* ─── Tiny nav dot ─── */
function NavDots({active,onNav}){
  return(
    <div style={{
      position:"fixed",right:20,top:"50%",transform:"translateY(-50%)",
      zIndex:100,display:"flex",flexDirection:"column",gap:10,
    }}>
      {SECTIONS.map((s,i)=>(
        <button key={s} onClick={()=>onNav(i)} title={SECTION_TITLES[s]||"ATLAS"} style={{
          width:active===i?12:7,height:active===i?12:7,borderRadius:"50%",
          border:`1.5px solid ${active===i?C.accent:C.dimmer}`,
          background:active===i?C.accent:"transparent",
          cursor:"pointer",transition:"all 0.3s",padding:0,
        }}/>
      ))}
    </div>
  );
}

/* ─── Slide wrapper ─── */
function Slide({children,id}){
  return(
    <section id={id} style={{
      minHeight:"100vh",display:"flex",flexDirection:"column",
      justifyContent:"center",alignItems:"center",
      padding:"80px 40px",boxSizing:"border-box",position:"relative",
    }}>
      {children}
    </section>
  );
}

/* ─── Small reusable bits ─── */
const Tag = ({children,color=C.accent})=>(
  <span style={{
    display:"inline-block",fontSize:10,fontWeight:700,letterSpacing:1.5,
    textTransform:"uppercase",color,
    border:`1px solid ${color}44`,borderRadius:3,padding:"3px 8px",
  }}>{children}</span>
);
const Kpi=({value,label,color=C.accent})=>(
  <div style={{textAlign:"center"}}>
    <div style={{fontSize:36,fontWeight:800,color,fontFamily:"'Playfair Display',Georgia,serif"}}>{value}</div>
    <div style={{fontSize:11,color:C.dim,marginTop:4,letterSpacing:0.5}}>{label}</div>
  </div>
);

/* ═══════════════════════════════════════════════ */
/* ═══ MAIN COMPONENT                         ═══ */
/* ═══════════════════════════════════════════════ */
export default function ATLASPresentation(){
  const [active,setActive]=useState(0);
  const [archMod,setArchMod]=useState(null);
  const [pipeStep,setPipeStep]=useState(null);
  const [roadPhase,setRoadPhase]=useState(0);
  const scrollRef=useRef(null);

  /* intersection observer for nav dots */
  useEffect(()=>{
    const obs=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const idx=SECTIONS.indexOf(e.target.id);
          if(idx>=0)setActive(idx);
        }
      });
    },{threshold:0.45});
    SECTIONS.forEach(s=>{const el=document.getElementById(s);if(el)obs.observe(el);});
    return()=>obs.disconnect();
  },[]);

  const navTo=(i)=>{
    document.getElementById(SECTIONS[i])?.scrollIntoView({behavior:"smooth"});
  };

  /* ─── shared font import ─── */
  const fonts=`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Mono:wght@300;400;500&family=Crimson+Pro:wght@300;400;600&display=swap');
  `;

  return(
    <div ref={scrollRef} style={{
      background:C.bg,color:C.text,
      fontFamily:"'Crimson Pro','Georgia',serif",
      overflowX:"hidden",
    }}>
      <style>{fonts}{`
        * { box-sizing:border-box; scrollbar-width:thin; scrollbar-color:${C.dimmer} ${C.bg}; }
        ::selection { background:${C.accent}33; color:${C.accent}; }
        html { scroll-behavior:smooth; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        .fade-up { animation: fadeUp 0.8s ease both; }
        .fade-d1 { animation-delay:0.1s }
        .fade-d2 { animation-delay:0.2s }
        .fade-d3 { animation-delay:0.3s }
        .fade-d4 { animation-delay:0.4s }
        .fade-d5 { animation-delay:0.5s }
      `}</style>
      <NavDots active={active} onNav={navTo}/>

      {/* ════════ 1. HERO ════════ */}
      <Slide id="hero">
        <OrbitalBg/>
        <div style={{position:"relative",zIndex:2,textAlign:"center",maxWidth:800}}>
          <div className="fade-up" style={{
            fontSize:11,letterSpacing:8,color:C.dim,textTransform:"uppercase",marginBottom:24,
            fontFamily:"'DM Mono',monospace",
          }}>Project Charter & Technical Architecture</div>

          <h1 className="fade-up fade-d1" style={{
            fontSize:96,fontWeight:900,margin:0,lineHeight:0.95,
            fontFamily:"'Playfair Display',Georgia,serif",
            color:"#fff",
          }}>ATLAS</h1>

          <p className="fade-up fade-d2" style={{
            fontSize:18,color:C.dim,marginTop:16,lineHeight:1.6,fontWeight:300,
            letterSpacing:0.5,
          }}>
            Atomic-scale Theory, Learning, and Simulation
          </p>

          <div className="fade-up fade-d3" style={{
            width:60,height:1,background:`linear-gradient(90deg,transparent,${C.accent},transparent)`,
            margin:"28px auto",
          }}/>

          <p className="fade-up fade-d4" style={{
            fontSize:15,color:C.text,maxWidth:580,margin:"0 auto",lineHeight:1.8,
            fontStyle:"italic",fontWeight:300,
          }}>
            A unified open-source platform spanning quantum DFT, molecular dynamics,
            and machine learning potentials — from electrons to engineering, in one codebase.
          </p>

          <div className="fade-up fade-d5" style={{display:"flex",gap:12,justifyContent:"center",marginTop:36}}>
            <Tag color={C.accent}>DFT Engine</Tag>
            <Tag color={C.green}>MD Engine</Tag>
            <Tag color={C.violet}>ML Pipeline</Tag>
            <Tag color={C.orange}>Apache 2.0</Tag>
          </div>

          <div style={{marginTop:56,animation:"pulse 2s ease infinite",color:C.dimmer,fontSize:12,
            fontFamily:"'DM Mono',monospace"}}>
            ↓ scroll to explore
          </div>
        </div>
      </Slide>

      {/* ════════ 2. THE PROBLEM ════════ */}
      <Slide id="problem">
        <div style={{maxWidth:880,width:"100%"}}>
          <Tag>The Problem</Tag>
          <h2 style={{fontSize:42,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",margin:"16px 0 8px"}}>
            A Fractured Ecosystem
          </h2>
          <p style={{fontSize:15,color:C.dim,maxWidth:600,lineHeight:1.8,marginBottom:40}}>
            Today's materials simulation workflow is stitched together from 4–6 separate tools,
            each with its own input syntax, data model, and community conventions.
            Every arrow below is a potential failure point.
          </p>

          {/* fragmented pipeline diagram */}
          <div style={{
            background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,
            padding:"32px 28px",fontFamily:"'DM Mono',monospace",fontSize:12,
          }}>
            {[
              {tools:["VASP","pymatgen","DeePMD-kit"],colors:[C.red,C.gold,C.violet],labels:["DFT ($$$, closed)","data extraction","ML training"]},
              {tools:["ad-hoc scripts","manual conversion","manual validation"],colors:[C.dimmer,C.dimmer,C.dimmer],labels:["glue code","file munging","hope-based QA"]},
              {tools:["LAMMPS","OVITO/VESTA","custom scripts"],colors:[C.green,C.dim,C.dimmer],labels:["production MD","visualization","analysis"]},
            ].map((row,ri)=>(
              <div key={ri} style={{display:"flex",gap:12,marginBottom:ri<2?16:0,alignItems:"center"}}>
                {row.tools.map((t,ti)=>(
                  <div key={ti} style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{
                      flex:1,padding:"10px 14px",borderRadius:6,
                      border:`1px solid ${row.colors[ti]}33`,
                      background:`${row.colors[ti]}08`,
                    }}>
                      <div style={{color:row.colors[ti],fontWeight:600}}>{t}</div>
                      <div style={{fontSize:9,color:C.dim,marginTop:2}}>{row.labels[ti]}</div>
                    </div>
                    {ti<2&&<span style={{color:C.dimmer,fontSize:16}}>→</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:24,marginTop:32,justifyContent:"center",flexWrap:"wrap"}}>
            <Kpi value="6+" label="Separate software packages" color={C.red}/>
            <Kpi value="4" label="Different input syntaxes" color={C.orange}/>
            <Kpi value="∞" label="File format conversions" color={C.gold}/>
            <Kpi value="0" label="Unified verification" color={C.dimmer}/>
          </div>
        </div>
      </Slide>

      {/* ════════ 3. THE SOLUTION ════════ */}
      <Slide id="solution">
        <div style={{maxWidth:880,width:"100%"}}>
          <Tag color={C.green}>The Solution</Tag>
          <h2 style={{fontSize:42,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",margin:"16px 0 8px"}}>
            One Platform. Full Stack.
          </h2>
          <p style={{fontSize:15,color:C.dim,maxWidth:600,lineHeight:1.8,marginBottom:40}}>
            ATLAS unifies quantum DFT, molecular dynamics, and ML potentials into a single
            codebase with shared data models, native compatibility, and integrated verification.
          </p>

          <div style={{
            display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:32,
            fontFamily:"'DM Mono',monospace",
          }}>
            {[
              {cmd:"atlas dft",desc:"VASP-compatible quantum calculations",c:C.accent,icon:"⚛"},
              {cmd:"atlas train",desc:"ML potential training with active learning",c:C.violet,icon:"🧠"},
              {cmd:"atlas md",desc:"Large-scale LAMMPS-compatible MD",c:C.green,icon:"🔬"},
              {cmd:"atlas flow",desc:"Automated multi-step workflows",c:C.gold,icon:"⚡"},
              {cmd:"atlas verify",desc:"Continuous verification dashboard",c:C.orange,icon:"✓"},
            ].map((c,i)=>(
              <div key={i} style={{
                background:C.bg2,border:`1px solid ${c.c}33`,borderRadius:10,
                padding:"20px 14px",textAlign:"center",
                transition:"all 0.3s",cursor:"default",
              }} onMouseEnter={e=>{e.currentTarget.style.borderColor=c.c;e.currentTarget.style.transform="translateY(-4px)";}}
                 onMouseLeave={e=>{e.currentTarget.style.borderColor=c.c+"33";e.currentTarget.style.transform="translateY(0)";}}>
                <div style={{fontSize:28,marginBottom:8}}>{c.icon}</div>
                <div style={{fontSize:12,fontWeight:600,color:c.c}}>{c.cmd}</div>
                <div style={{fontSize:10,color:C.dim,marginTop:6,lineHeight:1.4,fontFamily:"'Crimson Pro',serif"}}>{c.desc}</div>
              </div>
            ))}
          </div>

          {/* adoption equation */}
          <div style={{
            background:`linear-gradient(135deg,${C.bg2},${C.bg3})`,
            border:`1px solid ${C.border}`,borderRadius:12,padding:"24px 28px",
          }}>
            <div style={{fontSize:12,fontWeight:700,color:C.accent,letterSpacing:1,textTransform:"uppercase",
              fontFamily:"'DM Mono',monospace",marginBottom:16}}>The Adoption Equation</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
              {[
                {k:"Mathematical proof",v:"Δ < 1 meV/atom vs VASP\nBit-identical vs LAMMPS"},
                {k:"Zero migration cost",v:"Reads VASP + LAMMPS\ninput files natively"},
                {k:"Superior capability",v:"Integrated ML pipeline\nDifferentiable simulation"},
                {k:"Unrestricted access",v:"Apache 2.0 license\nFree forever"},
              ].map((item,i)=>(
                <div key={i}>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:6}}>{item.k}</div>
                  <div style={{fontSize:11,color:C.dim,whiteSpace:"pre-line",lineHeight:1.5,fontFamily:"'DM Mono',monospace"}}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* ════════ 4. ARCHITECTURE ════════ */}
      <Slide id="architecture">
        <div style={{maxWidth:920,width:"100%"}}>
          <Tag color={C.violet}>Architecture</Tag>
          <h2 style={{fontSize:42,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",margin:"16px 0 8px"}}>
            Modular Crate System
          </h2>
          <p style={{fontSize:15,color:C.dim,maxWidth:560,lineHeight:1.8,marginBottom:32}}>
            A Rust monorepo of specialized crates sharing a unified <code style={{color:C.accent,fontFamily:"'DM Mono',monospace",fontSize:13}}>AtomicSystem</code> data model.
            Click any module to explore.
          </p>

          {/* top row: 3 engines */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
            {[
              {key:"dft",name:"atlas-dft",sub:"Quantum DFT Engine",c:C.accent,icon:"⚛",
                items:["Plane-wave basis + FFT","PAW (JTH/GPAW datasets)","Hartree + XC (libxc)","Davidson / RMM-DIIS / CG","Pulay / Kerker mixing","SCF loop + k-points","Forces, stress, DOS, bands","HSE06, GW, RPA, SOC, DFT+U"]},
              {key:"md",name:"atlas-md",sub:"Molecular Dynamics Engine",c:C.green,icon:"🔬",
                items:["Verlet neighbor lists","LJ, Morse, Buck, Coulomb, Born","EAM, MEAM, Tersoff, SW, ReaxFF","Velocity-Verlet, rRESPA","NVE / NVT / NPT ensembles","PPPM, Ewald electrostatics","SHAKE, rigid body, FIRE","Metadynamics, NEB, PLUMED"]},
              {key:"ml",name:"atlas-ml",sub:"ML Potential Pipeline",c:C.violet,icon:"🧠",
                items:["Symmetry functions, SOAP, ACE","DeePMD, NequIP, Allegro, MACE","Training loop + hyperopt","Active learning + uncertainty","libtorch / ONNX / native inference","Foundation model fine-tuning","Delta test validation","Extrapolation detection"]},
            ].map(m=>{
              const sel=archMod===m.key;
              return(
                <div key={m.key}>
                  <button onClick={()=>setArchMod(sel?null:m.key)} style={{
                    width:"100%",background:sel?`${m.c}11`:C.bg2,
                    border:`2px solid ${sel?m.c:C.border}`,borderRadius:10,
                    padding:"18px 16px",cursor:"pointer",textAlign:"left",
                    transition:"all 0.3s",color:C.text,
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:sel?14:0}}>
                      <span style={{fontSize:22}}>{m.icon}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:m.c,fontFamily:"'DM Mono',monospace"}}>{m.name}</div>
                        <div style={{fontSize:10,color:C.dim}}>{m.sub}</div>
                      </div>
                    </div>
                    {sel&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,animation:"slideIn 0.3s ease"}}>
                        {m.items.map((it,i)=>(
                          <div key={i} style={{
                            fontSize:10,color:C.dim,padding:"5px 8px",
                            background:C.bg,borderRadius:4,border:`1px solid ${C.border}`,
                            fontFamily:"'DM Mono',monospace",lineHeight:1.3,
                          }}>{it}</div>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* bottom row: supporting crates */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
            {[
              {name:"atlas-io",sub:"I/O Compatibility",c:C.orange,d:"VASP • LAMMPS • CIF • XYZ • HDF5 • pymatgen • ASE • AiiDA"},
              {name:"atlas-parallel",sub:"Parallelization",c:C.dim,d:"MPI domain decomp • Rayon threading • CUDA/HIP/SYCL GPU"},
              {name:"atlas-flow",sub:"Workflow Automation",c:C.gold,d:"DFT→MLIP • convergence • EOS • phonons • elastics • phase diagrams"},
              {name:"atlas-diff",sub:"Differentiable Sim",c:C.red,d:"Autograd engine • differentiable MD • inverse design optimization"},
            ].map(m=>(
              <div key={m.name} style={{
                background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,
                padding:"12px 14px",
              }}>
                <div style={{fontSize:12,fontWeight:700,color:m.c,fontFamily:"'DM Mono',monospace"}}>{m.name}</div>
                <div style={{fontSize:9,color:C.dim,marginTop:2}}>{m.sub}</div>
                <div style={{fontSize:9,color:C.dimmer,marginTop:6,lineHeight:1.4,fontFamily:"'DM Mono',monospace"}}>{m.d}</div>
              </div>
            ))}
          </div>

          {/* foundation bar */}
          <div style={{
            background:`linear-gradient(90deg,${C.accent}11,${C.green}11,${C.violet}11)`,
            border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 18px",
            display:"flex",justifyContent:"space-between",alignItems:"center",
            fontFamily:"'DM Mono',monospace",fontSize:10,color:C.dim,
          }}>
            <span><strong style={{color:C.text}}>atlas-core</strong> — unified AtomicSystem data model + units + math</span>
            <span style={{color:C.dimmer}}>Rust + C/CUDA FFI + PyO3 Python bindings</span>
          </div>
        </div>
      </Slide>

      {/* ════════ 5. PIPELINE ════════ */}
      <Slide id="pipeline">
        <div style={{maxWidth:800,width:"100%"}}>
          <Tag color={C.gold}>The Killer Feature</Tag>
          <h2 style={{fontSize:42,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",margin:"16px 0 8px"}}>
            DFT → ML → MD in One Command
          </h2>
          <p style={{fontSize:15,color:C.dim,maxWidth:560,lineHeight:1.8,marginBottom:36}}>
            No other tool provides this end-to-end pipeline. ATLAS automates the journey from
            quantum calculations to production-scale molecular dynamics through machine learning.
          </p>

          {[
            {n:1,icon:"⚛",title:"DFT Calculations",desc:"Run VASP-compatible DFT on initial structure + random perturbations",c:C.accent,eng:"atlas-dft"},
            {n:2,icon:"📊",title:"Extract Training Data",desc:"Energies, forces, stresses → structured dataset with full provenance",c:"#0891b2",eng:"atlas-io"},
            {n:3,icon:"🧠",title:"Train ML Potential",desc:"MACE / Allegro / DeePMD with active learning refinement loop",c:C.violet,eng:"atlas-ml"},
            {n:4,icon:"✓",title:"Validate Model",desc:"Delta test vs pure DFT, phonon frequencies, elastic constants",c:C.gold,eng:"atlas-verify"},
            {n:5,icon:"🔬",title:"Production MD",desc:"Million-atom simulations at near-DFT accuracy, GPU-accelerated",c:C.green,eng:"atlas-md"},
            {n:6,icon:"📈",title:"Extract Properties",desc:"Thermal conductivity, diffusion, phase transitions, mechanical response",c:C.orange,eng:"atlas-flow"},
          ].map((s,i)=>{
            const sel=pipeStep===i;
            return(
              <div key={i}>
                <button onClick={()=>setPipeStep(sel?null:i)} style={{
                  width:"100%",display:"flex",alignItems:"center",gap:18,
                  background:sel?`${s.c}0c`:C.bg2,
                  border:`1px solid ${sel?s.c:C.border}`,borderRadius:10,
                  padding:"14px 20px",cursor:"pointer",textAlign:"left",
                  transition:"all 0.3s",color:C.text,marginBottom:2,
                }}>
                  <div style={{
                    width:44,height:44,borderRadius:"50%",flexShrink:0,
                    background:`${s.c}18`,border:`2px solid ${s.c}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:20,transition:"all 0.3s",
                    boxShadow:sel?`0 0 20px ${s.c}33`:"none",
                  }}>{s.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:"'DM Mono',monospace"}}>
                      Step {s.n}: {s.title}
                    </div>
                    <div style={{fontSize:12,color:C.dim,marginTop:2,fontFamily:"'Crimson Pro',serif"}}>{s.desc}</div>
                  </div>
                  <div style={{
                    fontSize:9,color:C.dimmer,background:C.bg,padding:"3px 8px",
                    borderRadius:4,border:`1px solid ${C.border}`,fontFamily:"'DM Mono',monospace",
                  }}>{s.eng}</div>
                </button>
                {i<5&&<div style={{textAlign:"center",color:sel?s.c:C.dimmer,fontSize:14,lineHeight:"18px",transition:"color 0.3s"}}>│</div>}
              </div>
            );
          })}

          {/* active learning callout */}
          <div style={{
            marginTop:20,background:`${C.violet}08`,border:`1px solid ${C.violet}33`,
            borderRadius:10,padding:"16px 20px",
          }}>
            <div style={{fontSize:11,fontWeight:700,color:C.violet,letterSpacing:1,textTransform:"uppercase",
              fontFamily:"'DM Mono',monospace",marginBottom:10}}>Active Learning Loop — Steps 1–4 Iterate Automatically</div>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:C.dim,flexWrap:"wrap",
              fontFamily:"'DM Mono',monospace"}}>
              {[
                {t:"DFT on uncertain configs",c:C.accent},
                {t:"Retrain model",c:C.violet},
                {t:"MD → find new uncertainties",c:C.green},
                {t:"Δ target met?",c:C.gold},
              ].map((x,i)=>(
                <span key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{background:`${x.c}18`,padding:"3px 10px",borderRadius:4,color:x.c,fontSize:10}}>{x.t}</span>
                  {i<3&&<span style={{color:C.dimmer}}>→</span>}
                </span>
              ))}
              <span style={{color:C.dimmer}}>→ loop</span>
            </div>
          </div>

          {/* code block */}
          <div style={{
            marginTop:20,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,
            padding:"18px 22px",fontFamily:"'DM Mono',monospace",fontSize:11,lineHeight:1.8,
          }}>
            <div style={{color:C.dimmer,marginBottom:8,fontSize:9,letterSpacing:1,textTransform:"uppercase"}}>Single command</div>
            <div><span style={{color:C.green}}>atlas flow</span> <span style={{color:C.gold}}>train-mlip</span> \</div>
            <div style={{paddingLeft:20}}><span style={{color:C.dim}}>--structure</span> <span style={{color:C.orange}}>POSCAR</span> \</div>
            <div style={{paddingLeft:20}}><span style={{color:C.dim}}>--dft-settings</span> <span style={{color:C.orange}}>INCAR</span> \</div>
            <div style={{paddingLeft:20}}><span style={{color:C.dim}}>--model-type</span> <span style={{color:C.violet}}>mace</span> \</div>
            <div style={{paddingLeft:20}}><span style={{color:C.dim}}>--target-delta</span> <span style={{color:C.accent}}>0.5</span>  <span style={{color:C.dimmer}}># meV/atom</span></div>
          </div>
        </div>
      </Slide>

      {/* ════════ 6. VERIFICATION ════════ */}
      <Slide id="verification">
        <div style={{maxWidth:880,width:"100%"}}>
          <Tag color={C.orange}>Verification</Tag>
          <h2 style={{fontSize:42,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",margin:"16px 0 8px"}}>
            Proven, Not Promised
          </h2>
          <p style={{fontSize:15,color:C.dim,maxWidth:560,lineHeight:1.8,marginBottom:36}}>
            The academic community requires mathematical proof. ATLAS uses the community-standard
            Delta Codes DFT benchmark and the full LAMMPS regression suite as verification gates.
          </p>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* DFT verification */}
            <div style={{background:C.bg2,border:`1px solid ${C.accent}33`,borderRadius:12,padding:"22px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                <span style={{fontSize:18}}>⚛</span>
                <div style={{fontSize:14,fontWeight:700,color:C.accent,fontFamily:"'DM Mono',monospace"}}>DFT vs VASP</div>
              </div>
              {[
                {tier:"Tier 1",what:"Unit kernel verification",target:"Analytical match",mo:"Mo 1–6"},
                {tier:"Tier 2",what:"Single-SCF energy (10 systems)",target:"< 0.1 meV/atom",mo:"Mo 4–9"},
                {tier:"Tier 3",what:"Full Delta benchmark (71 elem)",target:"Δ < 1 meV/atom",mo:"Mo 8–14"},
                {tier:"Tier 4",what:"Bands, DOS, phonons, elastics",target:"Quantitative match",mo:"Mo 12–18"},
                {tier:"Tier 5",what:"HSE06, GW, RPA, SOC",target:"Published ref match",mo:"Mo 18–30"},
              ].map((r,i)=>(
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:8,marginBottom:6,
                  fontSize:11,fontFamily:"'DM Mono',monospace",
                }}>
                  <span style={{color:C.accent,fontWeight:700,width:42,flexShrink:0}}>{r.tier}</span>
                  <span style={{flex:1,color:C.dim}}>{r.what}</span>
                  <span style={{color:C.text,fontWeight:600,fontSize:10}}>{r.target}</span>
                </div>
              ))}
            </div>

            {/* MD verification */}
            <div style={{background:C.bg2,border:`1px solid ${C.green}33`,borderRadius:12,padding:"22px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                <span style={{fontSize:18}}>🔬</span>
                <div style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:"'DM Mono',monospace"}}>MD vs LAMMPS</div>
              </div>
              {[
                {tier:"Tier 1",what:"LJ, Morse, EAM, Tersoff forces",target:"Bit-identical",mo:"Mo 1–4"},
                {tier:"Tier 2",what:"Velocity-Verlet, rRESPA",target:"Machine precision",mo:"Mo 2–5"},
                {tier:"Tier 3",what:"Verlet neighbor lists",target:"Identical pairs",mo:"Mo 1–3"},
                {tier:"Tier 4",what:"NVE, NVT (NH), NPT ensembles",target:"Statistical equiv",mo:"Mo 4–8"},
                {tier:"Tier 5",what:"EAM, MEAM, ReaxFF, Tersoff",target:"50 test configs",mo:"Mo 6–12"},
                {tier:"Tier 6",what:"Ewald, PPPM electrostatics",target:"Energy match",mo:"Mo 6–10"},
                {tier:"Tier 7",what:"LAMMPS regression suite",target:"500+ tests pass",mo:"Mo 10–16"},
              ].map((r,i)=>(
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:8,marginBottom:6,
                  fontSize:11,fontFamily:"'DM Mono',monospace",
                }}>
                  <span style={{color:C.green,fontWeight:700,width:42,flexShrink:0}}>{r.tier}</span>
                  <span style={{flex:1,color:C.dim}}>{r.what}</span>
                  <span style={{color:C.text,fontWeight:600,fontSize:10}}>{r.target}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CI tiers */}
          <div style={{
            marginTop:20,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,
            padding:"18px 22px",fontFamily:"'DM Mono',monospace",fontSize:11,
          }}>
            <div style={{color:C.gold,fontWeight:700,marginBottom:10,fontSize:10,letterSpacing:1,textTransform:"uppercase"}}>
              Continuous Verification Infrastructure
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[
                {freq:"Every commit",tests:"Unit tests + Si/Al/Fe energy + LJ/EAM forces",time:"< 17 min"},
                {freq:"Nightly",tests:"20-material DFT + 50-system MD + ML validation",time:"< 7 hours"},
                {freq:"Weekly",tests:"71-element Delta + full LAMMPS regression + perf",time:"< 33 hours"},
              ].map((r,i)=>(
                <div key={i} style={{background:C.bg,borderRadius:6,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                  <div style={{color:C.gold,fontWeight:600}}>{r.freq}</div>
                  <div style={{color:C.dim,fontSize:10,marginTop:4,lineHeight:1.4}}>{r.tests}</div>
                  <div style={{color:C.dimmer,fontSize:9,marginTop:4}}>{r.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* ════════ 7. ROADMAP ════════ */}
      <Slide id="roadmap">
        <div style={{maxWidth:880,width:"100%"}}>
          <Tag color={C.accent}>Roadmap</Tag>
          <h2 style={{fontSize:42,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",margin:"16px 0 8px"}}>
            36-Month Execution Plan
          </h2>
          <p style={{fontSize:15,color:C.dim,maxWidth:560,lineHeight:1.8,marginBottom:24}}>
            Four phases with hard verification milestones as gate criteria.
            No phase advances until its verification targets are met.
          </p>

          {/* phase selector */}
          <div style={{display:"flex",gap:6,marginBottom:24}}>
            {[
              {name:"Phase 1",sub:"Mo 1–8",title:"Dual Foundation",c:C.accent},
              {name:"Phase 2",sub:"Mo 8–16",title:"Production & Verification",c:C.green},
              {name:"Phase 3",sub:"Mo 16–24",title:"Feature Parity",c:C.violet},
              {name:"Phase 4",sub:"Mo 24–36",title:"Advanced & Performance",c:C.red},
            ].map((p,i)=>(
              <button key={i} onClick={()=>setRoadPhase(i)} style={{
                flex:1,padding:"12px 10px",borderRadius:8,cursor:"pointer",
                background:roadPhase===i?`${p.c}14`:C.bg2,
                border:`2px solid ${roadPhase===i?p.c:C.border}`,
                transition:"all 0.3s",textAlign:"center",color:C.text,
              }}>
                <div style={{fontSize:13,fontWeight:700,color:p.c,fontFamily:"'DM Mono',monospace"}}>{p.name}</div>
                <div style={{fontSize:9,color:C.dim}}>{p.sub}</div>
                <div style={{fontSize:11,color:C.text,marginTop:4}}>{p.title}</div>
              </button>
            ))}
          </div>

          {/* phase detail */}
          {[
            /* Phase 1 */
            {dft:["Crystal I/O, plane-wave basis, FFT grid","PAW reader (JTH XML), Hartree + XC (libxc)","Davidson eigensolver + Pulay mixing + SCF","k-point parallelism, symmetry via spglib","Forces and stress tensor"],
             md:["AtomicSystem model + LAMMPS data reader","Verlet neighbor list (half/full)","LJ, Morse, Coulomb + EAM, Tersoff","Velocity-Verlet, NVE/NVT/NPT","LAMMPS script parser, MPI decomposition"],
             ml:["Descriptor computation scaffold","libtorch FFI for model inference"],
             milestones:["Si total energy < 1 meV vs VASP","Δ < 2 meV for 5 elements","LJ liquid RDF matches LAMMPS exactly","EAM Cu forces at machine precision","Load + run pre-trained DeePMD model"]},
            /* Phase 2 */
            {dft:["RMM-DIIS solver, CG solver","Full INCAR parser + VASP defaults","OUTCAR, DOSCAR, EIGENVAL, CHGCAR, vasprun.xml","Spin polarization (collinear)","Ionic + variable-cell relaxation, band parallelism"],
             md:["Buck, Born, Yukawa, DPD, tabulated pairs","Bonds, angles, dihedrals, impropers","PPPM electrostatics, SHAKE/RATTLE","Energy minimization (CG, FIRE, L-BFGS)","Compute/variable infrastructure"],
             ml:["Training data generation from atlas-dft","SOAP descriptors, MACE inference","Basic active learning loop"],
             milestones:["Full Δ < 1 meV/atom (71 elements)","arXiv preprint with Delta results","SPC/E water matches LAMMPS exactly","200+ LAMMPS regression tests passing","MACE Si potential within 1 meV of DFT"]},
            /* Phase 3 */
            {dft:["Non-collinear magnetism + SOC","DFT+U, vdW (D3/D4), meta-GGA (SCAN)","Born-Oppenheimer MD, WAVECAR I/O"],
             md:["ReaxFF reactive force field","MEAM, Vashishta, Stillinger-Weber","rRESPA, rigid body, NEB, PLUMED","Granular mechanics basics"],
             ml:["NequIP, Allegro inference","Full active learning + uncertainty quantification","Foundation model fine-tuning","atlas flow train-mlip end-to-end"],
             milestones:["Peer-reviewed paper accepted","ReaxFF combustion matches LAMMPS","500+ regression tests passing","Automated MLIP generation published"]},
            /* Phase 4 */
            {dft:["Hybrid functionals (HSE06, PBE0)","GW quasiparticle energies","RPA correlation, DFPT"],
             md:["GPU acceleration (CUDA, HIP, SYCL)","Kokkos-equivalent perf portability","SPH/RHEO, coarse-grained models","Exascale optimization"],
             ml:["Differentiable MD engine","Inverse design framework","Foundation model integration","On-the-fly active learning in production"],
             milestones:["Multi-vendor GPU performance parity","Full LAMMPS regression suite","Differentiable MD paper published","Cloud deployment + Web UI"]},
          ].map((ph,i)=>{
            if(i!==roadPhase) return null;
            const cols=[
              {title:"DFT Track",items:ph.dft,c:C.accent,icon:"⚛"},
              {title:"MD Track",items:ph.md,c:C.green,icon:"🔬"},
              {title:"ML Track",items:ph.ml,c:C.violet,icon:"🧠"},
            ];
            return(
              <div key={i} style={{animation:"fadeUp 0.4s ease"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
                  {cols.map((col,ci)=>(
                    <div key={ci} style={{background:C.bg2,border:`1px solid ${col.c}22`,borderRadius:10,padding:"16px 14px"}}>
                      <div style={{fontSize:12,fontWeight:700,color:col.c,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>
                        {col.icon} {col.title}
                      </div>
                      {col.items.map((it,ii)=>(
                        <div key={ii} style={{fontSize:11,color:C.dim,marginBottom:4,paddingLeft:10,
                          borderLeft:`2px solid ${col.c}22`,lineHeight:1.4}}>{it}</div>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{background:`${C.gold}0a`,border:`1px solid ${C.gold}33`,borderRadius:8,padding:"14px 18px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.gold,letterSpacing:1,textTransform:"uppercase",
                    fontFamily:"'DM Mono',monospace",marginBottom:8}}>Gate Milestones</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {ph.milestones.map((m,mi)=>(
                      <span key={mi} style={{
                        fontSize:10,color:C.text,background:C.bg,
                        padding:"4px 10px",borderRadius:4,border:`1px solid ${C.gold}33`,
                        fontFamily:"'DM Mono',monospace",
                      }}>✓ {m}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Slide>

      {/* ════════ 8. COMPETITIVE LANDSCAPE ════════ */}
      <Slide id="landscape">
        <div style={{maxWidth:900,width:"100%"}}>
          <Tag>Competitive Landscape</Tag>
          <h2 style={{fontSize:42,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",margin:"16px 0 8px"}}>
            Nothing Else Covers the Full Stack
          </h2>
          <p style={{fontSize:15,color:C.dim,maxWidth:560,lineHeight:1.8,marginBottom:32}}>
            Every existing tool solves one piece. ATLAS is the only platform spanning
            DFT → ML → MD in a unified, permissively-licensed codebase.
          </p>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'DM Mono',monospace",fontSize:11}}>
              <thead>
                <tr>
                  {["Capability","VASP","LAMMPS","QE","ABINIT","OpenMM","ATLAS"].map((h,i)=>(
                    <th key={i} style={{
                      padding:"10px 8px",textAlign:"left",
                      borderBottom:`2px solid ${i===6?C.green:C.border}`,
                      color:i===6?C.green:C.dim,fontWeight:i===6?800:500,
                      fontSize:i===6?13:11,
                      background:i===6?`${C.green}08`:"transparent",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Plane-wave DFT","✓","—","✓","✓","—","✓"],
                  ["Classical MD","—","✓","—","Ltd","✓","✓"],
                  ["Reactive MD","—","✓","—","—","—","✓"],
                  ["ML potentials","—","Plugin","—","—","✓","Core"],
                  ["DFT→MLIP pipeline","—","—","—","—","—","✓"],
                  ["Active learning","—","Ext.","—","—","—","✓"],
                  ["Differentiable MD","—","—","—","—","½","✓"],
                  ["VASP I/O","Native","—","—","—","—","✓"],
                  ["LAMMPS I/O","—","Native","—","—","—","✓"],
                  ["Multi-vendor GPU","OAcc","Kokkos","CUDA","GPU","CL","All"],
                  ["License","$$$$","GPL","GPL","GPL","MIT","Apache 2"],
                  ["Language","F90","C++","F90","F90","C++/Py","Rust"],
                ].map((row,ri)=>(
                  <tr key={ri}>
                    {row.map((cell,ci)=>{
                      const isAtlas=ci===6;
                      const isCheck=cell==="✓";
                      const isCost=cell==="$$$$";
                      const isDash=cell==="—";
                      const isSpecial=["Core","All","Apache 2"].includes(cell);
                      return(
                        <td key={ci} style={{
                          padding:"8px",borderBottom:`1px solid ${C.border}`,
                          color:isAtlas&&isCheck?C.green:isAtlas&&isSpecial?C.green:isCost?C.red:isDash?C.dimmer:ci===0?"#fff":C.dim,
                          fontWeight:isAtlas?700:ci===0?600:400,
                          background:isAtlas?`${C.green}06`:"transparent",
                          fontSize:ci===0?12:11,
                        }}>{cell}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Slide>

      {/* ════════ 9. COMMUNITY ════════ */}
      <Slide id="community">
        <div style={{maxWidth:880,width:"100%"}}>
          <Tag color={C.green}>Community & Funding</Tag>
          <h2 style={{fontSize:42,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#fff",margin:"16px 0 8px"}}>
            Built to Last
          </h2>
          <p style={{fontSize:15,color:C.dim,maxWidth:560,lineHeight:1.8,marginBottom:36}}>
            Open governance, diversified funding, and a clear adoption roadmap designed
            for the realities of academic software.
          </p>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            {/* Governance */}
            <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"22px 20px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:14,fontFamily:"'DM Mono',monospace"}}>
                Governance
              </div>
              {[
                {role:"Technical Steering Committee",detail:"7 members: 3 core devs, 2 academic, 1 natl lab, 1 industry"},
                {role:"Domain Working Groups",detail:"DFT, MD, ML, GPU, I/O — domain-specific decisions"},
                {role:"Advisory Board",detail:"Senior academics providing scientific oversight"},
                {role:"License",detail:"Apache 2.0 — maximally permissive for industry + govt"},
              ].map((g,i)=>(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.accent}}>{g.role}</div>
                  <div style={{fontSize:11,color:C.dim,lineHeight:1.4}}>{g.detail}</div>
                </div>
              ))}
            </div>

            {/* Funding */}
            <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"22px 20px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:14,fontFamily:"'DM Mono',monospace"}}>
                Funding Strategy
              </div>
              {[
                {src:"NSF CSSI",amt:"$3–5M",focus:"Core platform development",c:C.accent},
                {src:"DOE BES/ASCR",amt:"$2–4M",focus:"Exascale + ML integration",c:C.green},
                {src:"ERC Open Science",amt:"€2–3M",focus:"European community",c:C.violet},
                {src:"CZI EOSS",amt:"$400K",focus:"Essential infrastructure",c:C.gold},
                {src:"Industry",amt:"$1–2M",focus:"ML infrastructure (Yr 2)",c:C.orange},
                {src:"NumFOCUS",amt:"Sponsor",focus:"Fiscal home",c:C.dim},
              ].map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:f.c,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <span style={{fontSize:12,fontWeight:600,color:f.c}}>{f.src}</span>
                    <span style={{fontSize:11,color:C.dim,marginLeft:8}}>{f.focus}</span>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:C.text,fontFamily:"'DM Mono',monospace"}}>{f.amt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* adoption phases */}
          <div style={{
            background:`linear-gradient(135deg,${C.bg2},${C.bg3})`,
            border:`1px solid ${C.border}`,borderRadius:12,padding:"22px 24px",marginBottom:20,
          }}>
            <div style={{fontSize:12,fontWeight:700,color:C.gold,letterSpacing:1,textTransform:"uppercase",
              fontFamily:"'DM Mono',monospace",marginBottom:14}}>Adoption Roadmap</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              {[
                {phase:"A: Credibility",mo:"Mo 1–12",items:["arXiv preprint + Delta results","APS / MRS / Psi-k presentations","Public verification dashboard","pymatgen / ASE maintainer engagement"]},
                {phase:"B: Migration",mo:"Mo 12–24",items:["VASP-to-ATLAS migration guide","LAMMPS-to-ATLAS migration guide","CECAM / ICTP tutorial workshops","AiiDA + NERSC/Frontier benchmarks"]},
                {phase:"C: Ecosystem",mo:"Mo 24–36",items:["Plugin system for contributions","ATLAS Potential Library (MLIPs)","Cloud deployment for teaching","Annual ATLAS Workshop"]},
              ].map((a,i)=>(
                <div key={i}>
                  <div style={{fontSize:12,fontWeight:700,color:C.gold}}>{a.phase}</div>
                  <div style={{fontSize:9,color:C.dimmer,marginBottom:6}}>{a.mo}</div>
                  {a.items.map((it,ii)=>(
                    <div key={ii} style={{fontSize:11,color:C.dim,marginBottom:3,lineHeight:1.4}}>→ {it}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* closing */}
          <div style={{
            textAlign:"center",padding:"40px 0 20px",
          }}>
            <div style={{
              width:60,height:1,
              background:`linear-gradient(90deg,transparent,${C.accent},transparent)`,
              margin:"0 auto 24px",
            }}/>
            <div style={{
              fontSize:32,fontWeight:900,fontFamily:"'Playfair Display',serif",
              color:"#fff",marginBottom:8,
            }}>ATLAS</div>
            <div style={{
              fontSize:15,fontStyle:"italic",color:C.dim,fontWeight:300,
            }}>
              From electrons to engineering, in one platform.
            </div>
            <div style={{
              marginTop:20,display:"flex",gap:10,justifyContent:"center",
              fontFamily:"'DM Mono',monospace",fontSize:10,color:C.dimmer,
            }}>
              <span>Rust</span><span>·</span>
              <span>Apache 2.0</span><span>·</span>
              <span>DFT + MD + ML</span><span>·</span>
              <span>Δ &lt; 1 meV/atom</span>
            </div>
          </div>
        </div>
      </Slide>
    </div>
  );
}
