
import React from 'react';

const Docs = () => {
  return (
    <>
      

<header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-12 py-4 bg-[#12131a]/60 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(188,195,255,0.05)] bg-gradient-to-b from-[#12131a] to-transparent">
<div className="font-serif italic text-2xl text-[#e3e1ec]">LUPINE MATERIALS</div>
<nav className="hidden md:flex items-center gap-8">
<a className="text-[#e3e1ec]/70 hover:text-[#e3e1ec] transition-colors" href="#">Solutions</a>
<a className="text-[#e3e1ec]/70 hover:text-[#e3e1ec] transition-colors" href="#">Simulation</a>
<a className="text-[#bcc3ff] font-medium border-b border-[#bcc3ff] pb-1" href="#">Documentation</a>
<a className="text-[#e3e1ec]/70 hover:text-[#e3e1ec] transition-colors" href="#">Pricing</a>
</nav>
<button className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2 font-mono text-xs uppercase tracking-widest rounded-sm hover:opacity-90 transition-all">Launch Console</button>
</header>

<aside className="fixed left-0 top-0 h-full pt-24 flex flex-col z-40 bg-[#12131a] w-72">
<div className="px-6 mb-8">
<div className="font-serif text-[#e3e1ec] text-lg">DOCS v2.4</div>
<div className="font-mono text-[10px] uppercase tracking-tighter text-[#e3e1ec]/50">Precision Ledger</div>
</div>
<nav className="flex flex-col">
<a className="bg-[#1c1d26] text-[#bcc3ff] border-l-2 border-[#5565d4] py-3 px-6 flex items-center gap-3" href="#">
<span className="material-symbols-outlined text-sm">terminal</span>
<span className="font-mono text-xs uppercase tracking-tighter">Introduction</span>
</a>
<a className="text-[#e3e1ec]/50 py-3 px-6 hover:bg-[#1c1d26]/50 hover:text-[#e3e1ec] transition-all flex items-center gap-3" href="#">
<span className="material-symbols-outlined text-sm">integration_instructions</span>
<span className="font-mono text-xs uppercase tracking-tighter">Quantum API</span>
</a>
<a className="text-[#e3e1ec]/50 py-3 px-6 hover:bg-[#1c1d26]/50 hover:text-[#e3e1ec] transition-all flex items-center gap-3" href="#">
<span className="material-symbols-outlined text-sm">science</span>
<span className="font-mono text-xs uppercase tracking-tighter">Material Simulation</span>
</a>
<a className="text-[#e3e1ec]/50 py-3 px-6 hover:bg-[#1c1d26]/50 hover:text-[#e3e1ec] transition-all flex items-center gap-3" href="#">
<span className="material-symbols-outlined text-sm">hub</span>
<span className="font-mono text-xs uppercase tracking-tighter">Nodal Analysis</span>
</a>
<a className="text-[#e3e1ec]/50 py-3 px-6 hover:bg-[#1c1d26]/50 hover:text-[#e3e1ec] transition-all flex items-center gap-3" href="#">
<span className="material-symbols-outlined text-sm">shield</span>
<span className="font-mono text-xs uppercase tracking-tighter">Security</span>
</a>
</nav>
</aside>

<main className="ml-72 pt-32 pb-24 px-16 max-w-7xl">

<section className="mb-32">
<div className="max-w-3xl">
<span className="font-mono text-secondary text-xs tracking-widest uppercase mb-4 block">Getting Started</span>
<h1 className="font-serif italic text-6xl text-on-surface leading-tight mb-8">
                    From Zero to <span className="text-primary">First Simulation</span> in Five Minutes
                </h1>
<p className="text-on-surface-variant text-xl font-light leading-relaxed">
                    Everything you need to start exploring materials at the atomic scale. Our distributed quantum engine handles the compute; you handle the science.
                </p>
</div>
</section>

<section className="mb-32">
<h2 className="font-mono text-[10px] tracking-[0.3em] uppercase text-outline mb-16">The Quantum Workflow</h2>
<div className="space-y-24 relative">

<div className="absolute left-6 top-2 bottom-2 w-px bg-outline-variant/30"></div>

<div className="relative flex gap-12 group">
<div className="z-10 w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-primary/20 text-primary font-mono shrink-0">01</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
<div>
<h3 className="font-serif italic text-3xl mb-4">Create Account</h3>
<p className="text-on-surface-variant mb-6 leading-relaxed">Initialize your laboratory environment at <span className="text-secondary font-mono">lupine.dev</span>. Credentials are encrypted via AES-256 GCM.</p>
</div>
<div className="glass-panel p-6 rounded-lg ghost-border-top">
<pre className="font-mono text-xs text-primary/80 overflow-x-auto whitespace-pre-wrap"><code>$ lupine-cli auth login --scope="lab.sim"</code></pre>
</div>
</div>
</div>

<div className="relative flex gap-12 group">
<div className="z-10 w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-primary/20 text-primary font-mono shrink-0">02</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
<div>
<h3 className="font-serif italic text-3xl mb-4">Upload Trajectory</h3>
<p className="text-on-surface-variant mb-6 leading-relaxed">We support standard material science formats. Direct pipe from LAMMPS or raw .xyz snapshots.</p>
</div>
<div className="glass-panel p-6 rounded-lg ghost-border-top">
<pre className="font-mono text-xs text-primary/80 overflow-x-auto whitespace-pre-wrap"><code>$ lupine upload ./trajectories/run_01.dump \
  --format="lammps" --label="Ni_Fe_Alloy"</code></pre>
</div>
</div>
</div>

<div className="relative flex gap-12 group">
<div className="z-10 w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-primary/20 text-primary font-mono shrink-0">03</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
<div>
<h3 className="font-serif italic text-3xl mb-4">Configure View</h3>
<p className="text-on-surface-variant mb-6 leading-relaxed">Define covalent radii and dynamic bond detection parameters. The engine computes neighbors in real-time.</p>
</div>
<div className="glass-panel p-6 rounded-lg ghost-border-top">
<pre className="font-mono text-xs text-primary/80 overflow-x-auto whitespace-pre-wrap"><code>{
  "bond_threshold": 2.45,
  "renderer": "quantum_field",
  "occlusion": true
}</code></pre>
</div>
</div>
</div>

<div className="relative flex gap-12 group">
<div className="z-10 w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-primary/20 text-primary font-mono shrink-0">04</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
<div>
<h3 className="font-serif italic text-3xl mb-4">Share &amp; Collaborate</h3>
<p className="text-on-surface-variant mb-6 leading-relaxed">Generate cryogenically signed shareable URLs for peer review or journal submissions.</p>
</div>
<div className="glass-panel p-6 rounded-lg ghost-border-top">
<pre className="font-mono text-xs text-primary/80 overflow-x-auto whitespace-pre-wrap"><code>$ lupine share sim_7721 --expires="7d"
&gt; https://share.lupine.dev/r/v2p9x...</code></pre>
</div>
</div>
</div>
</div>
</section>

<section className="mb-32 bg-surface-container-low rounded-xl p-12">
<div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
<div className="lg:col-span-1">
<h2 className="font-serif italic text-4xl mb-6">Quantum API Reference</h2>
<p className="text-on-surface-variant mb-8 font-light">Direct programmatic access to the material ledger. Query lattice constants, elastic tensors, and phonon spectra via our REST interface.</p>
<a className="inline-flex items-center text-secondary font-mono text-sm tracking-tight hover:underline" href="#">
                        View Full API Docs 
                        <span className="material-symbols-outlined ml-2">arrow_forward</span>
</a>
</div>
<div className="lg:col-span-2 glass-panel p-8 rounded-lg overflow-hidden border-l border-primary/20">
<div className="flex items-center gap-2 mb-4 border-b border-outline-variant/10 pb-4">
<div className="w-2 h-2 rounded-full bg-error/40"></div>
<div className="w-2 h-2 rounded-full bg-tertiary/40"></div>
<div className="w-2 h-2 rounded-full bg-secondary/40"></div>
<span className="font-mono text-[10px] text-outline ml-4 uppercase tracking-widest">POST /v1/simulation/initialize</span>
</div>
<pre className="font-mono text-sm text-primary-fixed-dim leading-relaxed"><code>curl -X POST "https://api.lupine.dev/v1/simulation" \
  -H "Authorization: Bearer $LUPINE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "element_id": "MoS2",
    "layer_count": 3,
    "strain_tensor": [0.01, 0, 0, 0, 0.01, 0, 0, 0, 0]
  }'</code></pre>
</div>
</div>
</section>

<section className="mb-32">
<h2 className="font-mono text-[10px] tracking-[0.3em] uppercase text-outline mb-12">Universal Integration</h2>
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
<div className="bg-surface-container-low p-8 rounded-lg hover:bg-surface-container transition-all">
<span className="material-symbols-outlined text-primary mb-6 text-3xl">terminal</span>
<h4 className="font-mono text-sm uppercase tracking-widest mb-2">Python SDK</h4>
<p className="text-on-surface-variant text-sm font-light leading-relaxed mb-6">The researcher's choice. Integration with NumPy, ASE, and PyTorch Geometric.</p>
<span className="font-mono text-[10px] text-secondary">pip install lupine-py</span>
</div>
<div className="bg-surface-container-low p-8 rounded-lg hover:bg-surface-container transition-all">
<span className="material-symbols-outlined text-primary mb-6 text-3xl">memory</span>
<h4 className="font-mono text-sm uppercase tracking-widest mb-2">Rust Crate</h4>
<p className="text-on-surface-variant text-sm font-light leading-relaxed mb-6">Memory-safe, high-concurrency bindings for large trajectory processing.</p>
<span className="font-mono text-[10px] text-secondary">cargo add lupine-rs</span>
</div>
<div className="bg-surface-container-low p-8 rounded-lg hover:bg-surface-container transition-all">
<span className="material-symbols-outlined text-primary mb-6 text-3xl">api</span>
<h4 className="font-mono text-sm uppercase tracking-widest mb-2">REST API</h4>
<p className="text-on-surface-variant text-sm font-light leading-relaxed mb-6">Cloud-agnostic interface for custom scientific dashboards and workflows.</p>
<span className="font-mono text-[10px] text-secondary">Swagger/OpenAPI 3.0</span>
</div>
</div>
</section>

<section className="mb-32">
<div className="flex justify-between items-end mb-12">
<h2 className="font-serif italic text-4xl">Resource Library</h2>
<span className="font-mono text-[10px] text-outline uppercase tracking-widest">Global Support Matrix</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

<div className="glass-panel p-8 rounded-lg ghost-border-top hover:bg-surface-container-high transition-all cursor-pointer">
<div className="flex justify-between mb-4">
<span className="material-symbols-outlined text-secondary">school</span>
<span className="material-symbols-outlined text-outline/30 text-sm">open_in_new</span>
</div>
<h5 className="font-medium text-lg mb-2">Tutorials</h5>
<p className="text-on-surface-variant text-xs leading-relaxed">Step-by-step guides for complex lattice dynamics.</p>
</div>
<div className="glass-panel p-8 rounded-lg ghost-border-top hover:bg-surface-container-high transition-all cursor-pointer">
<div className="flex justify-between mb-4">
<span className="material-symbols-outlined text-secondary">videocam</span>
<span className="material-symbols-outlined text-outline/30 text-sm">open_in_new</span>
</div>
<h5 className="font-medium text-lg mb-2">Videos</h5>
<p className="text-on-surface-variant text-xs leading-relaxed">Watch the quantum engine in action.</p>
</div>
<div className="glass-panel p-8 rounded-lg ghost-border-top hover:bg-surface-container-high transition-all cursor-pointer">
<div className="flex justify-between mb-4">
<span className="material-symbols-outlined text-secondary">description</span>
<span className="material-symbols-outlined text-outline/30 text-sm">open_in_new</span>
</div>
<h5 className="font-medium text-lg mb-2">Papers</h5>
<p className="text-on-surface-variant text-xs leading-relaxed">Read our peer-reviewed technical whitepapers.</p>
</div>

<div className="glass-panel p-8 rounded-lg ghost-border-top hover:bg-surface-container-high transition-all cursor-pointer">
<div className="flex justify-between mb-4">
<span className="material-symbols-outlined text-secondary">forum</span>
<span className="material-symbols-outlined text-outline/30 text-sm">open_in_new</span>
</div>
<h5 className="font-medium text-lg mb-2">Forum</h5>
<p className="text-on-surface-variant text-xs leading-relaxed">Connect with 15k+ material scientists.</p>
</div>
<div className="glass-panel p-8 rounded-lg ghost-border-top hover:bg-surface-container-high transition-all cursor-pointer">
<div className="flex justify-between mb-4">
<span className="material-symbols-outlined text-secondary">code_blocks</span>
<span className="material-symbols-outlined text-outline/30 text-sm">open_in_new</span>
</div>
<h5 className="font-medium text-lg mb-2">GitHub</h5>
<p className="text-on-surface-variant text-xs leading-relaxed">Open-source SDKs and sample trajectories.</p>
</div>
<div className="glass-panel p-8 rounded-lg ghost-border-top hover:bg-surface-container-high transition-all cursor-pointer">
<div className="flex justify-between mb-4">
<span className="material-symbols-outlined text-secondary">published_with_changes</span>
<span className="material-symbols-outlined text-outline/30 text-sm">open_in_new</span>
</div>
<h5 className="font-medium text-lg mb-2">Changelog</h5>
<p className="text-on-surface-variant text-xs leading-relaxed">Updates on v2.4 'Quantum Ledger' release.</p>
</div>
</div>
</section>

<section className="relative rounded-xl overflow-hidden bg-surface-container p-16 text-center border border-primary/5">
<div className="relative z-10 max-w-2xl mx-auto">
<h2 className="font-serif italic text-4xl mb-6">Stuck? Our materials science PhDs are here to help.</h2>
<p className="text-on-surface-variant mb-10 font-light">Whether you're debugging a phonon dispersion or setting up a high-throughput workflow, our engineering team is on standby.</p>
<div className="flex justify-center gap-6">
<button className="bg-primary text-on-primary px-8 py-3 font-mono text-xs uppercase tracking-widest hover:bg-primary-fixed transition-colors">Open Support Ticket</button>
<button className="border border-outline-variant/30 text-on-surface px-8 py-3 font-mono text-xs uppercase tracking-widest hover:bg-white/5 transition-colors">Chat With Expert</button>
</div>
</div>

<div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-secondary/5 opacity-50 pointer-events-none"></div>
</section>
</main>

<footer className="w-full py-12 px-12 flex justify-between items-center border-t border-[#e3e1ec]/10 bg-[#12131a]">
<div className="font-mono text-[10px] tracking-[0.2em] text-[#e3e1ec]/40 uppercase">
            © 2024 LUPINE MATERIALS SCIENCE. THE QUANTUM LEDGER.
        </div>
<div className="flex gap-8">
<a className="font-mono text-[10px] tracking-[0.2em] text-[#e3e1ec]/40 hover:text-[#bcc3ff] transition-colors" href="#">Terms of Service</a>
<a className="font-mono text-[10px] tracking-[0.2em] text-[#e3e1ec]/40 hover:text-[#bcc3ff] transition-colors" href="#">Privacy Protocol</a>
<a className="font-mono text-[10px] tracking-[0.2em] text-[#e3e1ec]/40 hover:text-[#bcc3ff] transition-colors" href="#">Whitepapers</a>
<a className="font-mono text-[10px] tracking-[0.2em] text-[#e3e1ec]/40 hover:text-[#bcc3ff] transition-colors" href="#">Global Support</a>
</div>
</footer>

    </>
  );
};

export default Docs;
