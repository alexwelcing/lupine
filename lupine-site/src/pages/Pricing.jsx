
import React from 'react';

const Pricing = () => {
  return (
    <>
      

<nav className="fixed top-0 w-full z-50 bg-slate-900/60 backdrop-blur-xl flex justify-between items-center px-12 h-20 max-w-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] tonal-shift bg-slate-800/20">
<div className="text-3xl font-serif italic text-white">Lupine</div>
<div className="hidden md:flex items-center space-x-10">
<a className="text-slate-400 font-mono hover:text-white hover:text-cyan-300 transition-colors duration-300" href="#">Compute</a>
<a className="text-slate-400 font-mono hover:text-white hover:text-cyan-300 transition-colors duration-300" href="#">Network</a>
<a className="text-slate-400 font-mono hover:text-white hover:text-cyan-300 transition-colors duration-300" href="#">Storage</a>
<a className="text-slate-400 font-mono hover:text-white hover:text-cyan-300 transition-colors duration-300" href="#">Docs</a>
</div>
<div className="flex items-center space-x-6">
<span className="material-symbols-outlined text-slate-400 hover:text-cyan-300 cursor-pointer">account_circle</span>
<button className="bg-primary text-on-primary px-6 py-2 font-label text-sm font-bold uppercase tracking-widest hover:opacity-80 transition-all">Execute</button>
</div>
</nav>
<main className="pt-32 pb-24 overflow-x-hidden">

<section className="max-w-7xl mx-auto px-12 mb-32 relative">

<div className="absolute -top-40 -right-20 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
<div className="max-w-4xl">
<p className="font-mono text-xs uppercase tracking-[0.4em] text-primary-fixed-dim mb-8">Quantum Ledger Pricing Protocol</p>
<h1 className="font-headline text-7xl md:text-9xl leading-[0.9] text-white italic mb-12">
                    Precision Compute.<br/>
<span className="text-primary/90">Priced for Impact.</span>
</h1>
<p className="text-xl md:text-2xl text-on-surface-variant font-light max-w-2xl leading-relaxed">
                    Sovereign-grade infrastructure for the next epoch of materials science. Scale your simulations on a decentralized quantum mesh designed for absolute fidelity and zero latency.
                </p>
</div>
</section>

<section className="max-w-7xl mx-auto px-12 grid grid-cols-1 md:grid-cols-3 gap-8 mb-40">

<div className="glass-panel p-12 flex flex-col justify-between border-t border-white/5 relative group">
<div>
<h3 className="font-headline text-3xl text-white mb-2">Explorer</h3>
<p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-8">Single Node Access</p>
<div className="flex items-baseline gap-2 mb-10">
<span className="font-headline text-6xl text-primary font-bold drop-shadow-[0_0_15px_rgba(0,218,243,0.3)]">$0</span>
<span className="font-mono text-xs text-slate-500">/mo</span>
</div>
<ul className="space-y-4 mb-12">
<li className="flex items-center gap-3 text-sm text-on-surface-variant font-mono">
<span className="material-symbols-outlined text-primary text-sm">check_circle</span> 12 Compute Threads
                        </li>
<li className="flex items-center gap-3 text-sm text-on-surface-variant font-mono">
<span className="material-symbols-outlined text-primary text-sm">check_circle</span> 16GB Memory Allocation
                        </li>
<li className="flex items-center gap-3 text-sm text-on-surface-variant font-mono">
<span className="material-symbols-outlined text-primary text-sm">check_circle</span> Public WebGPU Clusters
                        </li>
</ul>
</div>
<button className="w-full py-4 bg-surface-container-high text-white font-label uppercase text-xs tracking-widest border border-outline-variant/20 hover:bg-surface-container-highest transition-colors">Initialize</button>
</div>

<div className="glass-panel p-12 flex flex-col justify-between border-t-2 border-primary/40 relative shadow-[0_24px_64px_rgba(0,0,0,0.6)] z-10 scale-105">
<div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
<div>
<div className="flex justify-between items-start mb-2">
<h3 className="font-headline text-3xl text-white">Research</h3>
<span className="bg-primary text-on-primary font-mono text-[8px] px-2 py-1 uppercase tracking-tighter">Recommended</span>
</div>
<p className="font-mono text-[10px] uppercase tracking-widest text-primary/60 mb-8">Multi-Node Cluster</p>
<div className="flex items-baseline gap-2 mb-10">
<span className="font-headline text-6xl text-primary font-bold drop-shadow-[0_0_20px_rgba(0,218,243,0.4)]">$2,400</span>
<span className="font-mono text-xs text-slate-500">/yr</span>
</div>
<ul className="space-y-4 mb-12">
<li className="flex items-center gap-3 text-sm text-white font-mono">
<span className="material-symbols-outlined text-primary text-sm">check_circle</span> 128 Compute Threads
                        </li>
<li className="flex items-center gap-3 text-sm text-white font-mono">
<span className="material-symbols-outlined text-primary text-sm">check_circle</span> 512GB Memory Allocation
                        </li>
<li className="flex items-center gap-3 text-sm text-white font-mono">
<span className="material-symbols-outlined text-primary text-sm">check_circle</span> Private WebGPU Clusters
                        </li>
<li className="flex items-center gap-3 text-sm text-white font-mono">
<span className="material-symbols-outlined text-primary text-sm">check_circle</span> Sovereign Encryption
                        </li>
</ul>
</div>
<button className="w-full py-4 bg-primary text-on-primary font-label uppercase text-xs font-bold tracking-[0.2em] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all">Execute Protocol</button>
</div>

<div className="glass-panel p-12 flex flex-col justify-between border-t border-white/5 relative group">
<div>
<h3 className="font-headline text-3xl text-white mb-2">Enterprise</h3>
<p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-8">Infrastructure Dedicated</p>
<div className="flex items-baseline gap-2 mb-10">
<span className="font-headline text-6xl text-tertiary font-bold drop-shadow-[0_0_15px_rgba(255,236,187,0.2)]">Custom</span>
</div>
<ul className="space-y-4 mb-12">
<li className="flex items-center gap-3 text-sm text-on-surface-variant font-mono">
<span className="material-symbols-outlined text-tertiary text-sm">check_circle</span> Unlimited Threads
                        </li>
<li className="flex items-center gap-3 text-sm text-on-surface-variant font-mono">
<span className="material-symbols-outlined text-tertiary text-sm">check_circle</span> Petabyte Memory Mesh
                        </li>
<li className="flex items-center gap-3 text-sm text-on-surface-variant font-mono">
<span className="material-symbols-outlined text-tertiary text-sm">check_circle</span> 24/7 Quantum Oversight
                        </li>
</ul>
</div>
<button className="w-full py-4 bg-tertiary text-on-tertiary font-headline italic font-bold text-lg hover:opacity-90 transition-colors">Establish Connection</button>
</div>
</section>

<section className="max-w-7xl mx-auto px-12">
<div className="mb-16 flex flex-col items-start">
<h2 className="font-headline text-5xl text-white mb-4">Technical Specifications</h2>
<div className="h-0.5 w-24 bg-primary-fixed-dim/40"></div>
</div>
<div className="bg-surface-container-low overflow-hidden">

<div className="grid grid-cols-4 px-8 py-6 font-mono text-[10px] uppercase tracking-widest text-slate-500">
<div className="col-span-1">Parameter</div>
<div className="text-center">Explorer</div>
<div className="text-center text-primary">Research</div>
<div className="text-center">Enterprise</div>
</div>

<div className="tonal-shift-row grid grid-cols-4 px-8 py-8 items-center">
<div className="col-span-1 font-body text-sm text-white">Compute Threads</div>
<div className="text-center font-mono text-xs text-on-surface-variant">12</div>
<div className="text-center font-mono text-sm text-primary-fixed font-bold">128</div>
<div className="text-center font-mono text-xs text-on-surface-variant">Unlimited</div>
</div>
<div className="tonal-shift-row grid grid-cols-4 px-8 py-8 items-center">
<div className="col-span-1 font-body text-sm text-white">Memory Allocation</div>
<div className="text-center font-mono text-xs text-on-surface-variant">16GB RAM</div>
<div className="text-center font-mono text-sm text-primary-fixed font-bold">512GB ECC</div>
<div className="text-center font-mono text-xs text-on-surface-variant">Petabyte Mesh</div>
</div>
<div className="tonal-shift-row grid grid-cols-4 px-8 py-8 items-center">
<div className="col-span-1 font-body text-sm text-white">WebGPU Clusters</div>
<div className="text-center font-mono text-xs text-on-surface-variant">Shared (Tier 3)</div>
<div className="text-center font-mono text-sm text-primary-fixed font-bold">Priority (Tier 1)</div>
<div className="text-center font-mono text-xs text-on-surface-variant">Isolated Bare-Metal</div>
</div>
<div className="tonal-shift-row grid grid-cols-4 px-8 py-8 items-center">
<div className="col-span-1 font-body text-sm text-white">Security Protocol</div>
<div className="text-center font-mono text-xs text-on-surface-variant">Standard TLS</div>
<div className="text-center font-mono text-sm text-primary-fixed font-bold">AES-4096 Quantum</div>
<div className="text-center font-mono text-xs text-on-surface-variant">Hardware HSM Key</div>
</div>
<div className="tonal-shift-row grid grid-cols-4 px-8 py-8 items-center">
<div className="col-span-1 font-body text-sm text-white">Sovereignty Control</div>
<div className="text-center font-mono text-xs text-on-surface-variant">Lupine Managed</div>
<div className="text-center font-mono text-sm text-primary-fixed font-bold">Joint Protocol</div>
<div className="text-center font-mono text-xs text-on-surface-variant">Full Sovereign Self-Host</div>
</div>
</div>
</section>

<section className="max-w-7xl mx-auto px-12 mt-40">
<div className="relative h-[600px] w-full overflow-hidden">
<img className="w-full h-full object-cover grayscale opacity-40 mix-blend-screen" data-alt="Abstract microscopic crystal structure visualization in deep cyan and obsidian lighting with sharp geometric fractures and atmospheric particles" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBttpneA4Lwd2sKKXudMYkj8DjJqmy2iphAY9HTXdfaNYO_x_mbKde8e1aKaXLLFVwLKglJoDWTD_C1-KsvxG73HP0rLQNxQ58BBTHNXGSinPCUkli5t95bfzt6wwRS-fWsWpJf2LL7cSCstGL1IAt0TYGX0iStLwptsWP7odeLDsy9M_ukYRp7d3rNHtG4sxF2y2A3WGZ2AYi9wXP4pBKHT-x4YnLDt0LvUbU2i8QO9USKqsyNfKuZwsAGghYBwqy6kDldXJ5UXe0"/>
<div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
<div className="absolute bottom-20 left-20 max-w-xl">
<h2 className="font-headline text-6xl text-white italic mb-6">Built for the Void.</h2>
<p className="font-mono text-xs text-primary-fixed-dim uppercase tracking-[0.3em]">Hardware-Accelerated Material Discovery</p>
</div>
</div>
</section>
</main>

<footer className="bg-slate-950 w-full py-16 px-12 border-t border-slate-800/30 tonal-shift bg-slate-900">
<div className="grid grid-cols-4 gap-8 max-w-7xl mx-auto">
<div>
<div className="text-lg font-serif text-slate-200 mb-8">Lupine Materials Science</div>
<p className="font-mono text-[10px] tracking-tighter text-slate-500 uppercase">Sovereign Void Protocol.</p>
</div>
<div className="flex flex-col space-y-3">
<h4 className="font-serif text-lg text-slate-200 mb-4">Ecosystem</h4>
<a className="text-slate-500 font-mono text-[10px] hover:text-white underline underline-offset-4 uppercase tracking-tighter" href="#">Architecture</a>
<a className="text-slate-500 font-mono text-[10px] hover:text-white underline underline-offset-4 uppercase tracking-tighter" href="#">Governance</a>
</div>
<div className="flex flex-col space-y-3">
<h4 className="font-serif text-lg text-slate-200 mb-4">Operations</h4>
<a className="text-cyan-400 font-mono text-[10px] hover:text-white underline underline-offset-4 uppercase tracking-tighter" href="#">System Status: Operational</a>
<a className="text-slate-500 font-mono text-[10px] hover:text-white underline underline-offset-4 uppercase tracking-tighter" href="#">Legal</a>
</div>
<div>
<p className="text-slate-500 font-mono text-[10px] tracking-tighter leading-relaxed">
                    © 2024 Lupine Materials Science.<br/>
                    Engineered in the sub-arctic cluster.
                </p>
</div>
</div>
</footer>

    </>
  );
};

export default Pricing;
