
import React from 'react';

const Platform = () => {
  return (
    <>
      

<nav className="fixed top-0 w-full z-50 bg-[#12131a]/40 backdrop-blur-xl bg-gradient-to-b from-[#12131a] to-transparent shadow-[0_40px_80px_rgba(85,101,212,0.06)]">
<div className="flex justify-between items-center w-full px-12 py-6">
<div className="flex items-center gap-8">
<span className="text-2xl font-serif italic text-white Newsreader">Lupine Materials</span>
<div className="hidden md:flex gap-6 items-center">
<a className="font-sans text-sm uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300" href="#">Architecture</a>
<a className="font-sans text-sm uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300" href="#">Quantum Logic</a>
<a className="text-[#bcc3ff] border-b border-[#5565d4]/50 pb-1 font-sans text-sm uppercase tracking-widest" href="#">Specifications</a>
<a className="font-sans text-sm uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300" href="#">Terminal</a>
</div>
</div>
<div className="flex items-center gap-6">
<button className="text-[#bcc3ff] hover:text-white transition-all"><span className="material-symbols-outlined" data-icon="terminal">terminal</span></button>
<button className="text-[#bcc3ff] hover:text-white transition-all"><span className="material-symbols-outlined" data-icon="settings">settings</span></button>
<button className="px-6 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary font-label text-xs uppercase tracking-tighter font-bold rounded-lg active:scale-[0.98] transition-all">Initialize Access</button>
</div>
</div>
</nav>
<main className="pt-32">

<section className="px-12 py-24 min-h-[716px] flex flex-col justify-center relative overflow-hidden">
<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-container/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>
<div className="relative z-10 max-w-6xl">
<div className="inline-block mb-8 border-l-2 border-primary pl-4">
<span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">System Architecture Codex v1.0</span>
</div>
<h1 className="text-8xl md:text-[10rem] font-headline italic tracking-tighter leading-[0.85] text-white mb-12">
                    Deep Tech <br/>Stack
                </h1>
<p className="max-w-2xl text-2xl font-light text-on-surface-variant leading-relaxed">
                    Unifying <span className="text-primary italic">DFT</span>, <span className="text-secondary italic">ML</span>, and <span className="text-tertiary italic">MD</span> into a single <br/>memory-safe <span className="font-mono text-white bg-surface-container-high px-2 py-1">Rust kernel</span>.
                </p>
</div>
</section>

<section className="px-12 py-32 bg-surface-container-lowest">
<div className="grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
<div className="md:col-span-4">
<h2 className="text-4xl font-headline italic text-white mb-6">Structural Integrity</h2>
<p className="font-body text-on-surface-variant leading-relaxed mb-8">
                        The Lupine Architecture is a vertical integration of compute layers, designed to eliminate latency between physical simulation and neural inference.
                    </p>
<div className="space-y-4">
<div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-slate-500">
<span className="w-8 h-[1px] bg-outline-variant"></span>
<span>Memory Safe Runtime</span>
</div>
<div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-slate-500">
<span className="w-8 h-[1px] bg-outline-variant"></span>
<span>Asynchronous Scheduling</span>
</div>
</div>
</div>
<div className="md:col-span-8 flex flex-col gap-4">

<div className="glass-panel p-8 rounded-xl shadow-[0_20px_50px_rgba(85,101,212,0.1)] group hover:bg-surface-container-high transition-colors">
<div className="flex justify-between items-center">
<div>
<span className="font-mono text-[10px] text-primary tracking-tighter block mb-1">04 INTERFACE LAYER</span>
<h3 className="text-2xl font-headline italic text-white">Web / CLI / API Endpoints</h3>
</div>
<span className="material-symbols-outlined text-primary text-4xl" data-icon="hub">hub</span>
</div>
</div>

<div className="glass-panel p-10 rounded-xl shadow-[0_25px_60px_rgba(93,217,208,0.1)] group hover:bg-surface-container-high transition-colors -ml-4">
<div className="flex justify-between items-center">
<div>
<span className="font-mono text-[10px] text-secondary tracking-tighter block mb-1">03 INTELLIGENCE LAYER</span>
<h3 className="text-3xl font-headline italic text-white">ML Potentials &amp; Neural Networks</h3>
</div>
<span className="material-symbols-outlined text-secondary text-4xl" data-icon="psychology">psychology</span>
</div>
</div>

<div className="glass-panel p-12 rounded-xl shadow-[0_30px_70px_rgba(238,192,88,0.08)] group hover:bg-surface-container-high transition-colors -ml-8">
<div className="flex justify-between items-center">
<div>
<span className="font-mono text-[10px] text-tertiary tracking-tighter block mb-1">02 COMPUTE LAYER</span>
<h3 className="text-4xl font-headline italic text-white">WebGPU / CUDA Accelerated Kernels</h3>
</div>
<span className="material-symbols-outlined text-tertiary text-5xl" data-icon="memory">memory</span>
</div>
</div>

<div className="glass-panel p-16 rounded-xl shadow-[0_40px_80px_rgba(255,255,255,0.03)] group hover:bg-surface-container-high transition-colors -ml-12 border-l-4 border-primary">
<div className="flex justify-between items-center">
<div>
<span className="font-mono text-[10px] text-white tracking-tighter block mb-1">01 KERNEL LAYER</span>
<h3 className="text-5xl font-headline italic text-white">Rust / WASM Core Runtime</h3>
</div>
<span className="material-symbols-outlined text-white text-6xl" data-icon="settings_input_component">settings_input_component</span>
</div>
</div>
</div>
</div>
</section>

<section className="px-12 py-32 grid grid-cols-1 md:grid-cols-3 gap-0 border-y border-outline-variant/10">
<div className="p-12 border-r border-outline-variant/10 flex flex-col gap-6 group hover:bg-surface-container-low transition-colors">
<span className="font-mono text-[10px] uppercase tracking-widest text-primary">Efficiency</span>
<h4 className="text-4xl font-headline italic text-white leading-tight">100% Zero-Cost Abstractions</h4>
<p className="text-sm text-slate-500 font-body">Leveraging LLVM backends to ensure the highest hardware affinity without manual memory management.</p>
</div>
<div className="p-12 border-r border-outline-variant/10 flex flex-col gap-6 group hover:bg-surface-container-low transition-colors">
<span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Throughput</span>
<h4 className="text-4xl font-headline italic text-white leading-tight">10M+ Atoms <br/>@ 60fps</h4>
<p className="text-sm text-slate-500 font-body">Real-time visualization of atomic trajectories using massively parallelized WebGPU compute shaders.</p>
</div>
<div className="p-12 flex flex-col gap-6 group hover:bg-surface-container-low transition-colors">
<span className="font-mono text-[10px] uppercase tracking-widest text-tertiary">Precision</span>
<h4 className="text-4xl font-headline italic text-white leading-tight">&lt; 1meV Sub-meV Accuracy</h4>
<p className="text-sm text-slate-500 font-body">Refined hybrid DFT potentials validated against experimental synchrotron benchmarks.</p>
</div>
</section>

<section className="px-12 py-32 flex justify-center">
<div className="w-full max-w-5xl rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xl">
<div className="bg-surface-container-high px-6 py-4 flex items-center justify-between border-b border-outline-variant/15">
<div className="flex gap-2">
<div className="w-3 h-3 rounded-full bg-error"></div>
<div className="w-3 h-3 rounded-full bg-tertiary"></div>
<div className="w-3 h-3 rounded-full bg-secondary"></div>
</div>
<div className="text-xs font-mono text-slate-400">src/kernel/synthesis.rs — 64-bit</div>
<div></div>
</div>
<div className="p-8 font-mono text-sm md:text-base leading-relaxed overflow-x-auto">
<pre className="text-slate-300"><span className="text-primary italic">// Lupine Materials Core Synthesis Engine</span>
<span className="text-secondary">use</span> lupine_core::{Atom, Lattice, Energy};

<span className="text-tertiary">#[kernel_compute]</span>
<span className="text-secondary">pub fn</span> <span className="text-white">synthesize_structure</span>(lattice: Lattice) -&gt; Result&lt;Energy, SynthesisError&gt; {
    <span className="text-slate-500">/* Initialize quantum ledger for state tracking */</span>
    <span className="text-secondary">let mut</span> state = QuantumLedger::<span className="text-secondary">new</span>(lattice.precision());
    
    <span className="text-secondary">for</span> atom <span className="text-secondary">in</span> lattice.atoms() {
        state.apply_potential(atom.id, MLPotential::DeepForceV4);
        state.validate_stability()?;
    }

    <span className="text-primary italic">// Execute memory-safe convergence</span>
    <span className="text-secondary">match</span> state.converge_asynchronous() {
        Ok(energy) =&gt; {
            <span className="text-secondary">log_event!</span>(<span className="text-tertiary">"Lattice convergence successful: {:?}"</span>, energy);
            Ok(energy)
        },
        Err(e) =&gt; <span className="text-secondary">return</span> Err(SynthesisError::Divergence(e))
    }
}</pre>
</div>
</div>
</section>
</main>

<footer className="bg-[#0d0e15] w-full py-16 px-12 border-t border-[#454653]/10">
<div className="flex flex-col md:flex-row justify-between items-center w-full max-w-[1920px] mx-auto">
<div className="mb-8 md:mb-0">
<p className="font-mono text-[10px] tracking-widest text-slate-500 JetBrains Mono uppercase">
                    © 2024 Lupine Materials Science. Engineered for Quantum Precision.
                </p>
</div>
<div className="flex gap-12">
<a className="font-mono text-[10px] tracking-widest text-slate-600 hover:text-[#5565d4] transition-opacity uppercase" href="#">Privacy Protocol</a>
<a className="font-mono text-[10px] tracking-widest text-slate-600 hover:text-[#5565d4] transition-opacity uppercase" href="#">System Architecture</a>
<a className="font-mono text-[10px] tracking-widest text-slate-600 hover:text-[#5565d4] transition-opacity uppercase" href="#">Research Archive</a>
</div>
</div>
</footer>

    </>
  );
};

export default Platform;
