import { useState } from "react";

const modules = {
  dft: {
    name: "atlas-dft",
    subtitle: "Quantum DFT Engine",
    color: "#2563eb",
    bg: "#1e3a5f",
    icon: "⚛",
    description: "VASP-compatible plane-wave PAW density functional theory. Reads INCAR/POSCAR/KPOINTS natively. Target: Δ < 1 meV/atom vs. VASP across 71 elements.",
    components: [
      { name: "Plane-wave basis", detail: "G-vector generation, FFT grid, kinetic energy cutoff" },
      { name: "PAW module", detail: "JTH/GPAW dataset reader, projectors, one-center corrections, augmentation charges" },
      { name: "Potential", detail: "Hartree (Poisson), XC via libxc (LDA/GGA/meta-GGA), local + nonlocal PP" },
      { name: "Eigensolvers", detail: "Davidson, RMM-DIIS, conjugate gradient, LOBPCG" },
      { name: "SCF loop", detail: "Pulay/Kerker/Broyden mixing, convergence monitoring, occupations & smearing" },
      { name: "Properties", detail: "Band structure, DOS, forces, stress, dielectric, Born charges, magnetism" },
      { name: "Advanced", detail: "HSE06/PBE0 hybrids, GW, RPA, SOC, DFT+U, vdW corrections" },
    ],
    vasp_compat: "INCAR, POSCAR, KPOINTS, POTCAR (via JTH), OUTCAR, DOSCAR, EIGENVAL, CHGCAR, vasprun.xml"
  },
  md: {
    name: "atlas-md",
    subtitle: "Molecular Dynamics Engine",
    color: "#16a34a",
    bg: "#1a3d2a",
    icon: "🔬",
    description: "LAMMPS-compatible large-scale classical, reactive, and ML-driven molecular dynamics. Parses LAMMPS input scripts directly. Verified against LAMMPS regression suite.",
    components: [
      { name: "Neighbor lists", detail: "Verlet (half/full), cell-linked lists, stencils, molecular exclusions" },
      { name: "Pair potentials", detail: "LJ, Morse, Buck, Coulomb, Born, Yukawa, DPD, tabulated" },
      { name: "Many-body", detail: "EAM/alloy, MEAM, Tersoff, SW, Vashishta, SNAP, ACE, ReaxFF" },
      { name: "Bonded", detail: "Harmonic/FENE bonds, harmonic/cosine angles, OPLS dihedrals, impropers" },
      { name: "Long-range", detail: "Ewald summation, PPPM, MSM, Wolf summation" },
      { name: "Integration", detail: "Velocity-Verlet, rRESPA, SHAKE/RATTLE, rigid body" },
      { name: "Ensembles", detail: "NVE, NVT (Nosé-Hoover, Langevin), NPT (Parrinello-Rahman)" },
      { name: "Enhanced sampling", detail: "Metadynamics, umbrella sampling, replica exchange, NEB, PLUMED" },
      { name: "Granular + SPH", detail: "Hertz/Hooke contact, RHEO hydrodynamics, SPH heat transfer" },
    ],
    vasp_compat: "LAMMPS input scripts, data files, dump formats, restart files, EAM/Tersoff/ReaxFF param files"
  },
  ml: {
    name: "atlas-ml",
    subtitle: "ML Potential Pipeline",
    color: "#9333ea",
    bg: "#2d1a4e",
    icon: "🧠",
    description: "Integrated training, active learning, and deployment of machine learning interatomic potentials. The bridge between DFT accuracy and MD scale.",
    components: [
      { name: "Descriptors", detail: "Behler-Parrinello symmetry functions, SOAP, ACE, graph representations" },
      { name: "Model architectures", detail: "DeePMD, NequIP, Allegro, MACE, custom NN potentials" },
      { name: "Training", detail: "Dataset management, training loop, energy/force/stress losses, hyperopt" },
      { name: "Active learning", detail: "Ensemble uncertainty, query strategies, DFT oracle interface, FALCON-style" },
      { name: "Inference", detail: "libtorch (PyTorch), ONNX Runtime, pure Rust native inference" },
      { name: "Foundation models", detail: "Universal MLIP interface, fine-tuning, transfer learning" },
      { name: "Validation", detail: "Delta test vs DFT, property verification, extrapolation detection" },
    ],
    vasp_compat: "DeePMD model files, MACE checkpoints, ONNX models"
  },
  io: {
    name: "atlas-io",
    subtitle: "I/O Compatibility Layer",
    color: "#ea580c",
    bg: "#4a2010",
    icon: "📁",
    description: "Native readers/writers for VASP, LAMMPS, CIF, XYZ, PDB, HDF5 formats. Full compatibility with pymatgen, ASE, and AiiDA ecosystems.",
    components: [
      { name: "VASP formats", detail: "INCAR, POSCAR, KPOINTS, POTCAR, OUTCAR, DOSCAR, EIGENVAL, CHGCAR, WAVECAR, vasprun.xml" },
      { name: "LAMMPS formats", detail: "Input scripts, data files, dump (custom/atom/xyz), restart, log, potential param files" },
      { name: "Standard formats", detail: "CIF, extended XYZ, PDB, HDF5" },
      { name: "Ecosystem", detail: "pymatgen Structure, ASE Atoms, AiiDA provenance" },
    ],
    vasp_compat: null
  },
  flow: {
    name: "atlas-flow",
    subtitle: "Workflow Automation",
    color: "#ca8a04",
    bg: "#3d3010",
    icon: "⚡",
    description: "Automated multi-step workflows: DFT→MLIP training, convergence studies, EOS fitting, phonon calculations, phase diagrams. The killer feature.",
    components: [
      { name: "DFT → MLIP pipeline", detail: "Single command: structure → DFT data → train model → validate → deploy" },
      { name: "Convergence studies", detail: "Automated ENCUT, KPOINTS, SIGMA convergence with reporting" },
      { name: "Property workflows", detail: "EOS fitting, phonons (finite diff), elastic constants, phase stability" },
    ],
    vasp_compat: null
  },
  diff: {
    name: "atlas-diff",
    subtitle: "Differentiable Simulation",
    color: "#dc2626",
    bg: "#4a1010",
    icon: "∂",
    description: "Automatic differentiation through MD trajectories. Enables inverse design: optimize structures, force fields, and processing conditions for target properties.",
    components: [
      { name: "Autograd engine", detail: "Custom AD for simulation quantities" },
      { name: "Differentiable MD", detail: "Backprop through trajectories for parameter optimization" },
      { name: "Inverse design", detail: "Optimize structures for target mechanical, thermal, electronic properties" },
    ],
    vasp_compat: null
  },
};

const phases = [
  { 
    name: "Phase 1", 
    months: "Mo 1–8", 
    title: "Dual Foundation", 
    items: ["Si DFT energy < 1 meV vs VASP", "LJ/EAM forces match LAMMPS exactly", "First ML model inference"],
    color: "#3b82f6"
  },
  { 
    name: "Phase 2", 
    months: "Mo 8–16", 
    title: "Production & Verification", 
    items: ["71-element Δ < 1 meV/atom", "200+ LAMMPS tests passing", "Active learning loop working"],
    color: "#22c55e"
  },
  { 
    name: "Phase 3", 
    months: "Mo 16–24", 
    title: "Feature Parity", 
    items: ["SOC, DFT+U, vdW, ReaxFF", "500+ LAMMPS tests passing", "End-to-end DFT→ML→MD"],
    color: "#a855f7"
  },
  { 
    name: "Phase 4", 
    months: "Mo 24–36", 
    title: "Advanced & Performance", 
    items: ["HSE06, GW, RPA", "Multi-vendor GPU", "Differentiable MD", "Foundation models"],
    color: "#ef4444"
  },
];

export default function ATLASArchitecture() {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("architecture");

  const mod = selected ? modules[selected] : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e17",
      color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      padding: "24px",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ 
          fontSize: 13, 
          letterSpacing: 6, 
          color: "#64748b", 
          marginBottom: 8,
          textTransform: "uppercase" 
        }}>
          Project Charter
        </div>
        <h1 style={{ 
          fontSize: 42, 
          fontWeight: 800, 
          margin: 0, 
          letterSpacing: -1,
          background: "linear-gradient(135deg, #60a5fa, #a78bfa, #34d399)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          ATLAS
        </h1>
        <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
          Atomic-scale Theory, Learning, and Simulation
        </div>
        <div style={{ 
          fontSize: 11, 
          color: "#475569", 
          marginTop: 8,
          fontStyle: "italic" 
        }}>
          From electrons to engineering, in one platform.
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 28 }}>
        {[
          { key: "architecture", label: "Architecture" },
          { key: "pipeline", label: "DFT → ML → MD Pipeline" },
          { key: "roadmap", label: "Roadmap" },
          { key: "comparison", label: "vs. Landscape" },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => { setView(v.key); setSelected(null); }}
            style={{
              background: view === v.key ? "#1e293b" : "transparent",
              border: `1px solid ${view === v.key ? "#475569" : "#1e293b"}`,
              color: view === v.key ? "#e2e8f0" : "#64748b",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Architecture View */}
      {view === "architecture" && (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: 12,
            marginBottom: 12 
          }}>
            {["dft", "md", "ml"].map(key => {
              const m = modules[key];
              const isSelected = selected === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  style={{
                    background: isSelected ? m.bg : "#111827",
                    border: `2px solid ${isSelected ? m.color : "#1e293b"}`,
                    borderRadius: 10,
                    padding: "18px 14px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.25s",
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                    boxShadow: isSelected ? `0 0 24px ${m.color}33` : "none",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: m.color }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{m.subtitle}</div>
                </button>
              );
            })}
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: 12,
            marginBottom: 24
          }}>
            {["io", "flow", "diff"].map(key => {
              const m = modules[key];
              const isSelected = selected === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  style={{
                    background: isSelected ? m.bg : "#111827",
                    border: `2px solid ${isSelected ? m.color : "#1e293b"}`,
                    borderRadius: 10,
                    padding: "14px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.25s",
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                    boxShadow: isSelected ? `0 0 24px ${m.color}33` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>{m.subtitle}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Shared Foundation Bar */}
          <div style={{
            background: "#111827",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "#64748b",
            marginBottom: 24,
          }}>
            <span><strong style={{ color: "#94a3b8" }}>atlas-core</strong> — Unified AtomicSystem data model</span>
            <span><strong style={{ color: "#94a3b8" }}>atlas-parallel</strong> — MPI + GPU + Rayon</span>
            <span><strong style={{ color: "#94a3b8" }}>Rust</strong> + C/CUDA FFI + PyO3</span>
          </div>

          {/* Detail Panel */}
          {mod && (
            <div style={{
              background: mod.bg,
              border: `1px solid ${mod.color}66`,
              borderRadius: 12,
              padding: 24,
              animation: "fadeIn 0.3s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{mod.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: mod.color }}>{mod.name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{mod.subtitle}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                {mod.description}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {mod.components.map((c, i) => (
                  <div key={i} style={{
                    background: "#0a0e1799",
                    borderRadius: 8,
                    padding: "10px 12px",
                    border: "1px solid #1e293b",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: mod.color, marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>{c.detail}</div>
                  </div>
                ))}
              </div>
              {mod.vasp_compat && (
                <div style={{
                  marginTop: 14,
                  padding: "8px 12px",
                  background: "#0a0e17",
                  borderRadius: 6,
                  border: "1px solid #1e293b",
                }}>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>COMPATIBILITY</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{mod.vasp_compat}</div>
                </div>
              )}
            </div>
          )}

          {!mod && (
            <div style={{ textAlign: "center", color: "#475569", fontSize: 12, padding: 20 }}>
              Click a module above to explore its components
            </div>
          )}
        </div>
      )}

      {/* Pipeline View */}
      {view === "pipeline" && (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 600 }}>The Killer Feature</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>What no existing tool does — the full pipeline in one command</div>
          </div>
          
          {[
            { step: 1, icon: "⚛", label: "DFT Calculations", detail: "Run VASP-compatible DFT on initial structure + perturbations", color: "#2563eb", engine: "atlas-dft" },
            { step: 2, icon: "📊", label: "Training Data", detail: "Extract energies, forces, stresses → structured dataset", color: "#0891b2", engine: "atlas-io" },
            { step: 3, icon: "🧠", label: "Train ML Potential", detail: "MACE/Allegro/DeePMD with active learning refinement", color: "#9333ea", engine: "atlas-ml" },
            { step: 4, icon: "✅", label: "Validate", detail: "Delta test vs DFT, phonon comparison, elastic constants", color: "#16a34a", engine: "atlas-verify" },
            { step: 5, icon: "🔬", label: "Production MD", detail: "Million-atom simulations at near-DFT accuracy", color: "#16a34a", engine: "atlas-md" },
            { step: 6, icon: "📈", label: "Properties", detail: "Thermal conductivity, diffusion, phase transitions, mechanical response", color: "#ca8a04", engine: "atlas-flow" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "#111827",
                border: `1px solid ${s.color}44`,
                borderRadius: 10,
                padding: "14px 18px",
                marginBottom: 4,
              }}>
                <div style={{
                  width: 40, height: 40,
                  borderRadius: "50%",
                  background: `${s.color}22`,
                  border: `2px solid ${s.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>
                    Step {s.step}: {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{s.detail}</div>
                </div>
                <div style={{
                  fontSize: 10, color: "#64748b",
                  background: "#0a0e17",
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid #1e293b",
                }}>
                  {s.engine}
                </div>
              </div>
              {i < 5 && (
                <div style={{ 
                  textAlign: "center", 
                  color: "#334155", 
                  fontSize: 16, 
                  lineHeight: "20px",
                  userSelect: "none",
                }}>│</div>
              )}
            </div>
          ))}

          <div style={{
            marginTop: 24,
            background: "#111827",
            border: "1px solid #475569",
            borderRadius: 10,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>
              One command:
            </div>
            <code style={{
              display: "block",
              background: "#0a0e17",
              padding: "12px 16px",
              borderRadius: 6,
              fontSize: 12,
              color: "#34d399",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              border: "1px solid #1e293b",
            }}>
{`atlas flow train-mlip \\
  --structure POSCAR \\
  --dft-settings INCAR \\
  --sampling-method active-learning \\
  --model-type mace \\
  --target-delta 0.5  # meV/atom accuracy target`}
            </code>
          </div>

          {/* Active learning loop */}
          <div style={{
            marginTop: 16,
            background: "#2d1a4e44",
            border: "1px solid #9333ea44",
            borderRadius: 10,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>
              Active Learning Loop (Steps 1–4 iterate automatically)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94a3b8", flexWrap: "wrap" }}>
              <span style={{ background: "#2563eb33", padding: "3px 8px", borderRadius: 4, color: "#60a5fa" }}>DFT on uncertain configs</span>
              <span style={{ color: "#475569" }}>→</span>
              <span style={{ background: "#9333ea33", padding: "3px 8px", borderRadius: 4, color: "#c084fc" }}>Retrain model</span>
              <span style={{ color: "#475569" }}>→</span>
              <span style={{ background: "#16a34a33", padding: "3px 8px", borderRadius: 4, color: "#4ade80" }}>Run MD, find new uncertainties</span>
              <span style={{ color: "#475569" }}>→</span>
              <span style={{ background: "#ca8a0433", padding: "3px 8px", borderRadius: 4, color: "#fbbf24" }}>Δ target met?</span>
              <span style={{ color: "#475569" }}>→ loop</span>
            </div>
          </div>
        </div>
      )}

      {/* Roadmap View */}
      {view === "roadmap" && (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {phases.map((phase, i) => (
            <div key={i} style={{
              display: "flex",
              gap: 16,
              marginBottom: 20,
            }}>
              <div style={{ 
                width: 80, flexShrink: 0, textAlign: "right", paddingTop: 8 
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: phase.color }}>{phase.name}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{phase.months}</div>
              </div>
              <div style={{
                width: 3,
                background: `linear-gradient(to bottom, ${phase.color}, ${phases[i+1]?.color || "#1e293b"})`,
                borderRadius: 2,
                flexShrink: 0,
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", top: 10, left: -5,
                  width: 13, height: 13,
                  borderRadius: "50%",
                  background: phase.color,
                  border: "3px solid #0a0e17",
                }} />
              </div>
              <div style={{
                flex: 1,
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: 10,
                padding: "14px 18px",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                  {phase.title}
                </div>
                {phase.items.map((item, j) => (
                  <div key={j} style={{ 
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 12, color: "#94a3b8", marginBottom: 4,
                  }}>
                    <span style={{ color: phase.color, fontSize: 8 }}>●</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison View */}
      {view === "comparison" && (
        <div style={{ maxWidth: 860, margin: "0 auto", overflowX: "auto" }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            fontSize: 11,
          }}>
            <thead>
              <tr>
                {["Capability", "VASP", "LAMMPS", "QE", "ABINIT", "OpenMM", "ATLAS"].map((h, i) => (
                  <th key={i} style={{
                    padding: "10px 8px",
                    textAlign: "left",
                    borderBottom: "2px solid #1e293b",
                    color: i === 6 ? "#34d399" : "#94a3b8",
                    fontWeight: i === 6 ? 800 : 600,
                    fontSize: i === 6 ? 12 : 11,
                    background: i === 6 ? "#16a34a11" : "transparent",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Plane-wave DFT", "✅", "—", "✅", "✅", "—", "✅"],
                ["Classical MD", "—", "✅", "—", "Ltd", "✅", "✅"],
                ["Reactive MD", "—", "✅", "—", "—", "—", "✅"],
                ["ML potentials", "—", "Plugin", "—", "—", "✅", "Core"],
                ["DFT→MLIP pipeline", "—", "—", "—", "—", "—", "✅"],
                ["Active learning", "—", "Ext.", "—", "—", "—", "✅"],
                ["Differentiable MD", "—", "—", "—", "—", "Partial", "✅"],
                ["VASP I/O", "Native", "—", "—", "—", "—", "✅"],
                ["LAMMPS I/O", "—", "Native", "—", "—", "—", "✅"],
                ["GPU (multi)", "OpenACC", "Kokkos", "CUDA", "GPU", "CUDA/CL", "CUDA/HIP/SYCL"],
                ["License", "$$$$", "GPL", "GPL", "GPL", "MIT", "Apache 2.0"],
                ["Language", "Fortran", "C++", "Fortran", "Fortran", "C++/Py", "Rust"],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => {
                    const isAtlas = j === 6;
                    const isGreen = isAtlas && cell === "✅";
                    const isCore = isAtlas && (cell === "Core" || cell === "Apache 2.0");
                    return (
                      <td key={j} style={{
                        padding: "8px",
                        borderBottom: "1px solid #1e293b",
                        color: isGreen ? "#34d399" : isCore ? "#34d399" : cell === "—" ? "#334155" : cell === "$$$$" ? "#ef4444" : "#94a3b8",
                        fontWeight: isAtlas ? 700 : 400,
                        background: isAtlas ? "#16a34a08" : "transparent",
                      }}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ 
            textAlign: "center", 
            marginTop: 20, 
            fontSize: 12, 
            color: "#64748b",
            fontStyle: "italic",
          }}>
            ATLAS is the only platform spanning the full DFT → ML → MD pipeline in a unified, permissively-licensed codebase.
          </div>
        </div>
      )}
    </div>
  );
}
