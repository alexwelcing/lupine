import os

pages = {
    "platform-architecture": {
        "title": "Platform Architecture | Lupine Materials Science",
        "h1": "Deep Tech <em>Stack</em>",
        "sub": "How we unified DFT, ML, and MD into a single, memory-safe Rust kernel with zero-cost abstractions."
    },
    "research-manifesto": {
        "title": "Research Manifesto | Lupine Materials Science",
        "h1": "Science <em>As Code</em>",
        "sub": "Why the future of materials discovery requires abandoning legacy FORTRAN and fractured tooling."
    },
    "gpu-compute": {
        "title": "WebGPU Compute | Lupine Materials Science",
        "h1": "Browser Native <em>GPU</em>",
        "sub": "Leveraging WebGPU to deliver supercomputing performance directly to the researcher's browser without installation."
    },
    "sovereignty-materials": {
        "title": "Materials Sovereignty | Lupine Materials Science",
        "h1": "Strategic <em>Sovereignty</em>",
        "sub": "Why national security relies on independent, next-generation computational materials infrastructure."
    },
    "case-study-batteries": {
        "title": "Case Study: Solid-State Batteries | Lupine",
        "h1": "Solid State <em>Electrolytes</em>",
        "sub": "Accelerating ion conductivity analysis using ML-backed molecular dynamics at 100x the speed of standard DFT."
    },
    "case-study-superalloys": {
        "title": "Case Study: Superalloys | Lupine",
        "h1": "Aerospace <em>Superalloys</em>",
        "sub": "Exploring multi-principal element alloys (MPEAs) for high-temperature resilience through massive Permutation sweeps."
    },
    "ml-potentials-guide": {
        "title": "ML Potentials | Lupine Materials Science",
        "h1": "Machine Learned <em>Potentials</em>",
        "sub": "Bridging the gap between quantum accuracy and classical speed with integrated NequIP and Allegro models."
    },
    "rust-in-science": {
        "title": "Rust in Science | Lupine Materials Science",
        "h1": "Why We Chose <em>Rust</em>",
        "sub": "Memory safety, fearless concurrency, and robust WASM compilation are non-negotiable for modern scientific software."
    },
    "defense-aerospace": {
        "title": "Defense & Aerospace | Lupine Materials Science",
        "h1": "Defense <em>Applications</em>",
        "sub": "Providing secure, on-premise deployments of the Lupine stack for classified materials research."
    },
    "investors": {
        "title": "Investor Relations | Lupine Materials Science",
        "h1": "Investor <em>Relations</em>",
        "sub": "Data rooms, capitalization details, and deep-tech diligence materials for prospective partners."
    },
    "pricing": {
        "title": "Pricing & Enterprise Plans | Lupine Materials Science",
        "h1": "Enterprise <em>Pricing</em>",
        "sub": "Transparent, research-grade pricing for labs of every scale — from free exploration to unlimited enterprise deployments.",
        "stitch": True
    },
    "team": {
        "title": "Team & Advisory Board | Lupine Materials Science",
        "h1": "The <em>Team</em>",
        "sub": "Decades of computational materials science, HPC, and systems engineering expertise in a single founding team.",
        "stitch": True
    },
    "glimPSE-demo": {
        "title": "glimPSE Interactive Demo | Lupine Materials Science",
        "h1": "See Atoms <em>Move</em>",
        "sub": "Million-atom LAMMPS trajectories at 60fps using WebGPU compute shaders. No downloads. Just science.",
        "stitch": True
    },
    "docs": {
        "title": "Documentation & Getting Started | Lupine Materials Science",
        "h1": "Getting <em>Started</em>",
        "sub": "From zero to first simulation in five minutes. Everything you need to explore materials at the atomic scale.",
        "stitch": True
    },
    "contact": {
        "title": "Request Access & Contact | Lupine Materials Science",
        "h1": "Contact <em>Us</em>",
        "sub": "Whether you're exploring for research or deploying at enterprise scale, we'd love to hear from you.",
        "stitch": True
    }
}

# Read index.html to use as a template
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Extract header (up to the end of the <nav>)
header_end = html.find("<!-- ═══ Hero ═══ -->")
header = html[:header_end]

# Extract footer (from <!-- ═══ Footer ═══ -->)
footer_start = html.find("<!-- ═══ Footer ═══ -->")
footer = html[footer_start:]

# Inject new footer links to the original footer text
footer_links_html = """
    <div style="margin-top:40px; display:flex; justify-content:center; gap:32px; flex-wrap:wrap; max-width:800px; margin-left:auto; margin-right:auto; padding-top:32px; border-top:1px solid rgba(255,255,255,0.05);">
        <div style="text-align:left;">
            <h4 style="color:var(--slate-300); font-size:12px; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:12px;">Platform</h4>
            <a href="platform-architecture.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Architecture</a>
            <a href="ml-potentials-guide.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">ML Potentials</a>
            <a href="gpu-compute.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">WebGPU Compute</a>
            <a href="rust-in-science.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Why Rust</a>
        </div>
        <div style="text-align:left;">
            <h4 style="color:var(--slate-300); font-size:12px; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:12px;">Solutions</h4>
            <a href="case-study-batteries.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Solid-State Batteries</a>
            <a href="case-study-superalloys.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Aerospace Alloys</a>
            <a href="defense-aerospace.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Defense & Gov</a>
        </div>
        <div style="text-align:left;">
            <h4 style="color:var(--slate-300); font-size:12px; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:12px;">Company</h4>
            <a href="research-manifesto.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Manifesto</a>
            <a href="sovereignty-materials.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Sovereignty</a>
            <a href="investors.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Investors</a>
            <a href="team.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Team</a>
            <a href="contact.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Contact</a>
        </div>
        <div style="text-align:left;">
            <h4 style="color:var(--slate-300); font-size:12px; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:12px;">Products</h4>
            <a href="glimPSE-demo.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">glimPSE Demo</a>
            <a href="pricing.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Pricing</a>
            <a href="docs.html" style="display:block; color:var(--slate-500); font-size:13px; margin-bottom:8px; text-decoration:none;">Documentation</a>
        </div>
    </div>
"""
# Add links to the footer
footer = footer.replace("<footer>", "<footer>\n" + footer_links_html)

for slug, p in pages.items():
    # Skip Stitch-generated pages (they are standalone HTML)
    if p.get('stitch'):
        continue

    # Update title
    page_header = header.replace("<title>Lupine Materials Science — The Future of Computational Materials</title>", f"<title>{p['title']}</title>")
    
    # Fix nav links to point back to index if needed
    page_header = page_header.replace('href="#', 'href="index.html#')
    
    # Generic content section
    content = f"""
    <!-- ═══ Content ═══ -->
    <section style="padding: 180px 40px 100px; min-height: 80vh; max-width: 900px; margin: 0 auto;">
        <div class="hero-label">Lupine Deep Dive</div>
        <h1 style="font-family:var(--font-serif); font-size:clamp(36px, 5vw, 64px); color:var(--slate-100); margin-bottom:24px; font-weight:400; line-height:1.2;">
            {p['h1']}
        </h1>
        <p style="font-size:20px; color:var(--slate-400); font-weight:300; line-height:1.7; margin-bottom:48px;">
            {p['sub']}
        </p>
        
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); padding:40px; border-radius:16px;">
            <p style="color:var(--slate-300); margin-bottom:20px; font-size:15px; line-height:1.8;">
                This document is part of the Lupine Materials Science enriched architecture profile. It outlines the strategic design decisions, technical implementation details, and business value metrics associated with this specific pipeline segment.
            </p>
            <p style="color:var(--slate-300); margin-bottom:32px; font-size:15px; line-height:1.8;">
                Our core philosophy is that researchers should not have to context-switch between disparate tools. By vertically integrating this capability directly into our Rust-powered, WebGPU-accelerated kernel, we eliminate data silos and accelerate the time to novel material discovery.
            </p>
            <a href="index.html" class="btn-secondary" style="font-size:13px; padding:12px 24px;">Return to Hub</a>
        </div>
    </section>
    """
    
    with open(f"{slug}.html", "w", encoding="utf-8") as out:
        out.write(page_header + content + footer)

# Update index.html to include the new footer
with open("index.html", "w", encoding="utf-8") as f:
    html_new = html[:footer_start] + footer
    f.write(html_new)

# Automatically add them to vite.config.js rollup options
with open("vite.config.js", "r", encoding="utf-8") as f:
    vite_cfg = f.read()

import re

# find the rollupOptions inputs
inputs = ""
for slug in pages.keys():
    # e.g. "platform-architecture": resolve(__dirname, 'platform-architecture.html'),
    slug_key = slug.replace("-", "")
    inputs += f"        {slug_key}: resolve(__dirname, '{slug}.html'),\n"

vite_cfg = vite_cfg.replace(
    "onepager: resolve(__dirname, 'one-pager.html'),",
    "onepager: resolve(__dirname, 'one-pager.html'),\n" + inputs
)

with open("vite.config.js", "w", encoding="utf-8") as f:
    f.write(vite_cfg)

stitch_count = sum(1 for p in pages.values() if p.get('stitch'))
template_count = len(pages) - stitch_count
print(f"Generated {template_count} template pages + {stitch_count} Stitch standalone pages. Updated vite.config.js")
