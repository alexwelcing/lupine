"""
glim Full Deployment Orchestrator
---
1. Rebuild atlas-view-native WASM binary
2. Copy WASM artifacts into deploy_bundle/public/native/
3. Build the premium research site
4. Build web viewer
5. Deploy everything to Cloud Run
6. Verify all endpoints
"""
import os
import subprocess
import shutil
import sys
import time
import urllib.request
import glob
import re
import markdown  # pip install markdown

BASE_DIR = r"c:\Users\alexw\Downloads\shed\glim"
NATIVE_DIR = os.path.join(BASE_DIR, "atlas-view-native")
DEPLOY_DIR = os.path.join(BASE_DIR, "atlas", "deploy_bundle")
DEPLOY_PUBLIC = os.path.join(DEPLOY_DIR, "public")
DEPLOY_NATIVE = os.path.join(DEPLOY_PUBLIC, "native")
DEPLOY_WEB = os.path.join(DEPLOY_PUBLIC, "web")
DEPLOY_RESEARCH = os.path.join(DEPLOY_PUBLIC, "research")
ATLAS_VIEW_DIR = os.path.join(BASE_DIR, "atlas", "atlas-view")
WEB_DIST = os.path.join(ATLAS_VIEW_DIR, "apps", "web", "dist")

CLOUD_URL = "https://atlas-viewer-350452481649.us-central1.run.app"

def section(title):
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}\n")

# ────────────────────────────────────────────────────────────
# STEP 1: Rebuild native WASM
# ────────────────────────────────────────────────────────────
def build_native_wasm():
    section("Step 1/5: Building Native WASM Binary")
    try:
        # Build the Rust project for the wasm32 target
        subprocess.run(
            ["cargo", "build", "--target", "wasm32-unknown-unknown", "--release"],
            cwd=NATIVE_DIR, shell=True, check=True
        )
        # Generate the JS bindings using wasm-bindgen
        subprocess.run(
            ["wasm-bindgen", "--out-dir", "wasm-out", "--target", "web", "target/wasm32-unknown-unknown/release/atlas-view-native.wasm"],
            cwd=NATIVE_DIR, shell=True, check=True
        )
        print("  ✅ WASM build succeeded")
    except Exception as e:
        print(f"  ❌ WASM build failed: {e}")
        return False
    
    # Copy output to deploy
    pkg_dir = os.path.join(NATIVE_DIR, "wasm-out")
    if os.path.exists(pkg_dir):
        for f in os.listdir(pkg_dir):
            src = os.path.join(pkg_dir, f)
            dst = os.path.join(DEPLOY_NATIVE, f)
            if os.path.isfile(src):
                shutil.copy2(src, dst)
                print(f"  Copied {f}")
    return True

# ────────────────────────────────────────────────────────────
# STEP 2: Build premium research site
# ────────────────────────────────────────────────────────────

# Research documents organized by category
RESEARCH_DOCS = {
    "Ecosystem Research": [
        {"file": "deep-research-report.md", "title": "LAMMPS Ecosystem Analysis", "desc": "Comprehensive landscape analysis of the LAMMPS ecosystem — ML potentials, workflow automation, post-processing gaps, and distribution challenges"},
        {"file": "ancillary-research-opps.md", "title": "2025–2026 People, Labs & Methods", "desc": "Current-state landscape with 60-paper corpus, 25-person advisory council prospects, and actionable opportunity clusters"},
        {"file": "foundational-research.md", "title": "Advisory Council Prospectus", "desc": "Origin document with tiered 12-person priority outreach list — core LAMMPS stewards, workflow/MLIP leaders, and international collaborators"},
        {"file": "example-research-papers.md", "title": "Downloadable LAMMPS Datasets", "desc": "Curated catalog of publicly deposited simulation packages — inputs, potentials, and trajectories from metals to polymers to 2D materials"},
        {"file": "chinese-md-sources.md", "title": "Chinese MD Research Sources", "desc": "Landscape of molecular dynamics research from Chinese institutions and collaboration networks"},
    ],
    "Platform Vision": [
        {"file": os.path.join("atlas", "glim-project-plan.md"), "title": "glim Platform Architecture", "desc": "Three-pillar vision — Quantum DFT Engine, Molecular Dynamics Engine, and ML Potential Pipeline — unified for seamless materials discovery"},
        {"file": os.path.join("atlas", "openDFT-project-plan.md"), "title": "OpenDFT: VASP-Compatible DFT Engine", "desc": "Technical plan for an open-source plane-wave PAW DFT engine with VASP I/O compatibility and Delta Codes verification"},
    ],
    "Product Strategy": [
        {"file": os.path.join("atlas", "glimPSE-web-product-plan.md"), "title": "glimPSE — Web Product Plan", "desc": "Active strategy document — WebGPU-powered web visualization vs Python library, OVITO paid wall analysis, and zero-install deployment"},
        {"file": os.path.join("atlas", "glimPSE-product-plan.md"), "title": "glimPSE — Original Python Plan", "desc": "Earlier product strategy proposing glimPSE as a pip-installable library — superseded by the web approach but valuable for competitive context"},
        {"file": os.path.join("atlas", "glimPSE-example-gallery.md"), "title": "Example Gallery Specification", "desc": "12 curated LAMMPS simulations for website launch — crack propagation, nanoindentation, LJ melt, granular pour, CNT tensile pull, and more"},
    ],
    "Strategic Documents": [
        {"file": "STATUS.md", "title": "Project Status", "desc": "Current implementation status and near-term development roadmap"},
        {"file": "RESEARCH-CHAIN.md", "title": "Research Chain", "desc": "Linked evidence chain connecting ecosystem analysis to product decisions to implementation priorities"},
        {"file": "GLOSSARY.md", "title": "Glossary", "desc": "Key terms, acronyms, and concepts used throughout the glim research and planning documents"},
    ],
    "GLIM Deep Research (2025–2026)": [
        {"file": os.path.join("docs", "multi_fidelity_uq_glimMER_report.md"), "title": "Multi-Fidelity UQ & glimMER", "desc": "Cross-potential meta-analysis and systematic bias correction paradigm using PCA of prediction errors."},
        {"file": os.path.join("docs", "bayesian_active_learning_report.md"), "title": "Bayesian Active Learning", "desc": "Strategies for potential selection using Gaussian Process surrogates and active learning at scale."},
        {"file": os.path.join("docs", "phonon_benchmarking_report.md"), "title": "Phonon Frequency Benchmarking", "desc": "Using second-order energy derivatives as the gold standard for potential validation across 12,000 materials."},
        {"file": os.path.join("docs", "gnn_error_prediction_report.md"), "title": "GNN Error Prediction", "desc": "Predicting interatomic potential errors from crystal structure topology using Graph Neural Networks."},
        {"file": os.path.join("docs", "sloppy_models_report.md"), "title": "Sloppy Model Theory", "desc": "Fisher Information Matrix analysis to identify stiff and sloppy parameter directions in interatomic potentials."},
        {"file": os.path.join("docs", "rg_coarsegraining_report.md"), "title": "Renormalization Group Coarse-Graining", "desc": "Systematic methodology for deriving effective coarse-grained potentials via partition function matching."},
        {"file": os.path.join("docs", "info_theoretic_report.md"), "title": "Information-Theoretic Model Selection", "desc": "Kolmogorov complexity, Rate-Distortion Theory, and Shannon entropy applied to model error compression."},
        {"file": os.path.join("docs", "weather_climate_ensembles_report.md"), "title": "Climate Science Ensemble Methods", "desc": "Transferring multi-model ensemble weight strategies from climate modeling to materials science."},
        {"file": os.path.join("docs", "tda_error_landscapes_report.md"), "title": "Topological Data Analysis of Error Landscapes", "desc": "Applying persistent homology to characterize high-dimensional error surfaces of interatomic potentials."},
        {"file": os.path.join("docs", "funding_landscape_report.md"), "title": "Federal Funding Landscape (2025–2026)", "desc": "Comprehensive review of MGI, NSF DMREF, DOE BES, and DARPA strategic priorities for materials informatics."},
    ],
}

RESEARCH_CSS = """
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: Georgia, 'Times New Roman', serif;
    background: #fafafa;
    color: #1a1a1a;
    line-height: 1.9;
    font-size: 17px;
    -webkit-font-smoothing: antialiased;
}

::selection {
    background: #000;
    color: #fff;
}

.container {
    max-width: 640px;
    margin: 0 auto;
    padding: 0 40px 100px;
}

nav.top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 30px 40px;
    max-width: 640px;
    margin: 0 auto;
}
nav.top-bar .logo { font-size: 14px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #000; text-decoration: none; }
nav.top-bar .logo span { font-style: italic; font-weight: 400; color: #666; }
nav.top-bar .links { display: flex; gap: 24px; }
nav.top-bar .links a { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #666; text-decoration: none; transition: color 0.3s ease; }
nav.top-bar .links a:hover { color: #000; }

.hero {
    text-align: center;
    margin-bottom: 80px;
    padding-top: 60px;
    max-width: 640px;
    margin: 0 auto;
    padding-left: 40px;
    padding-right: 40px;
}
.hero h1 { font-size: 32px; font-weight: 400; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 16px; color: #000; }
.hero .sub { font-size: 13px; letter-spacing: 0.3em; color: #666; text-transform: uppercase; font-style: italic; }
.hero .badge { display: block; font-size: 12px; color: #999; margin-top: 40px; letter-spacing: 0.2em; text-transform: uppercase; }

.category { margin-top: 80px; }
.category-header { text-align: center; margin-bottom: 40px; }
.category-header .bar { display: none; }
.category-header h2 { font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color: #666; font-weight: 600; }

.card-grid { display: flex; flex-direction: column; gap: 20px; }
.card { display: block; padding: 30px 40px; background: #f5f5f5; border-left: 3px solid #000; text-decoration: none; color: inherit; transition: background 0.3s ease; }
.card:hover { background: #eee; }
.card h3 { font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; color: #000; margin-bottom: 16px; font-weight: 600; }
.card p { font-size: 15px; color: #444; margin-bottom: 0; line-height: 1.8; text-align: left; }

.article { max-width: 640px; margin: 0 auto; padding: 60px 40px 120px; }
.article .back { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #666; text-decoration: none; display: inline-block; margin-bottom: 60px; transition: color 0.3s ease; }
.article .back:hover { color: #000; }
.article h1 { font-size: 32px; font-weight: 400; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 30px; color: #000; line-height: 1.3; text-align: center; }
.article h2 { font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color: #666; margin-top: 80px; margin-bottom: 40px; font-weight: 600; border: none; }
.article h3 { font-size: 16px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #000; margin-top: 40px; margin-bottom: 20px; }
.article h4 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; color: #666; margin-top: 30px; margin-bottom: 15px; }

.article p { margin-bottom: 28px; text-align: justify; hyphens: auto; }
.article a { color: #000; font-weight: 600; text-decoration: none; border-bottom: 1px solid #000; transition: opacity 0.3s ease; }
.article a:hover { opacity: 0.6; }

.article ul, .article ol { list-style: none; padding: 0; margin: 40px 0; }
.article li { padding: 20px 0; padding-left: 40px; position: relative; border-bottom: 1px solid #e5e5e5; }
.article li::before { content: ''; position: absolute; left: 0; top: 28px; width: 20px; height: 1px; background: #000; }

.article strong { font-weight: 600; color: #000; }

.article code { font-family: monospace; background: #f5f5f5; padding: 2px 6px; font-size: 14px; color: #000; }
.article pre { background: #f5f5f5; border-left: 3px solid #000; padding: 30px 40px; margin: 40px 0; overflow-x: auto; font-family: monospace; font-size: 14px; line-height: 1.6; color: #333; }
.article pre code { padding: 0; background: none; border: none; }

.article blockquote { border-left: 3px solid #000; padding: 30px 40px; margin: 60px 0; background: #f5f5f5; color: #222; font-style: italic; font-size: 18px; line-height: 1.8; }

.article table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 15px; }
.article th, .article td { border: 1px solid #e5e5e5; padding: 16px 20px; text-align: left; }
.article th { background: #f5f5f5; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: #666; }
.article tr:hover td { background: #fafafa; }

.article hr { border: 0; text-align: center; margin: 80px 0; color: #ccc; letter-spacing: 3em; font-size: 14px; overflow: visible; height: auto; background: transparent; }
.article hr::after { content: "* * *"; }

.article img { max-width: 100%; border-radius: 0; margin: 40px 0; display: block; border: 1px solid #e5e5e5; }

footer { text-align: center; padding: 60px 24px; margin-top: 80px; border-top: 1px solid #e5e5e5; }
footer p { font-size: 12px; color: #999; letter-spacing: 0.2em; text-transform: uppercase; }

@media (max-width: 640px) {
    .hero h1 { font-size: 24px; letter-spacing: 0.1em; }
    .container, .article, .hero, nav.top-bar { padding-left: 24px; padding-right: 24px; }
    .article blockquote, .article pre, .card { padding: 24px; }
}
"""

def slugify(filename):
    return os.path.splitext(os.path.basename(filename))[0]

def build_research_site():
    section("Step 2/5: Building Premium Research Site")
    
    if os.path.exists(DEPLOY_RESEARCH):
        shutil.rmtree(DEPLOY_RESEARCH)
    os.makedirs(DEPLOY_RESEARCH)
    
    # Write CSS
    with open(os.path.join(DEPLOY_RESEARCH, "style.css"), "w", encoding="utf-8") as f:
        f.write(RESEARCH_CSS)
    print("  ✅ Wrote style.css")
    
    # Convert each markdown doc to a beautiful article page
    converted = []
    for cat, docs in RESEARCH_DOCS.items():
        for doc in docs:
            md_path = os.path.join(BASE_DIR, doc["file"])
            if not os.path.exists(md_path):
                print(f"  ⚠️ Missing: {doc['file']}")
                continue
            
            slug = slugify(doc["file"])
            with open(md_path, "r", encoding="utf-8") as f:
                md_content = f.read()
            
            try:
                html_body = markdown.markdown(
                    md_content, 
                    extensions=['tables', 'fenced_code', 'codehilite', 'toc'],
                    extension_configs={'codehilite': {'noclasses': True, 'pygments_style': 'monokai'}}
                )
            except:
                html_body = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
            
            # Fix internal links to point to other research pages
            html_body = re.sub(
                r'<code>([\w/.-]+\.md)</code>',
                lambda m: f'<a href="{slugify(m.group(1))}.html">{m.group(1)}</a>',
                html_body
            )
            
            article_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{doc['title']} — glim Research</title>
    <meta name="description" content="{doc['desc']}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav class="top-bar">
        <a href="/" class="logo">glim<span>research</span></a>
        <div class="links">
            <a href="/research/">Index</a>
            <a href="/web/">glimPSE</a>
            <a href="/">Manifesto</a>
        </div>
    </nav>
    <div class="article">
        <a href="/research/" class="back">← Research Index</a>
        <h1>{doc['title']}</h1>
        {html_body}
    </div>
    <footer><p>glim — Computational Materials Science Platform · 2026</p></footer>
</body>
</html>"""
            
            out_path = os.path.join(DEPLOY_RESEARCH, f"{slug}.html")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(article_html)
            
            converted.append({"cat": cat, "slug": slug, "title": doc["title"], "desc": doc["desc"]})
            print(f"  ✅ {slug}.html")
    
    # Build the index page
    cards_html = ""
    current_cat = None
    for item in converted:
        if item["cat"] != current_cat:
            if current_cat is not None:
                cards_html += "</div></section>"
            current_cat = item["cat"]
            cards_html += f"""
        <section class="category">
            <div class="category-header">
                <div class="bar"></div>
                <h2>{item['cat']}</h2>
            </div>
            <div class="card-grid">"""
        
        cards_html += f"""
                <a href="{item['slug']}.html" class="card">
                    <h3>{item['title']}</h3>
                    <p>{item['desc']}</p>
                </a>"""
    
    if current_cat is not None:
        cards_html += "</div></section>"
    
    index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>glim Research Library</title>
    <meta name="description" content="Complete research library for the glim Computational Materials Science Platform — ecosystem analysis, product strategy, and technical architecture.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav class="top-bar">
        <a href="/" class="logo">glim<span>research</span></a>
        <div class="links">
            <a href="/web/">glimPSE</a>
            <a href="/">Manifesto</a>
        </div>
    </nav>
    <div class="hero">
        <h1>Research Library</h1>
        <p class="sub">Complete ecosystem analysis, product strategy, and technical architecture for the glim Computational Materials Science Platform.</p>
        <span class="badge">{len(converted)} documents</span>
    </div>
    <div class="container">
        {cards_html}
    </div>
    <footer><p>glim — Computational Materials Science Platform · 2026</p></footer>
</body>
</html>"""
    
    with open(os.path.join(DEPLOY_RESEARCH, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html)
    print(f"  ✅ index.html ({len(converted)} documents)")

# ────────────────────────────────────────────────────────────
# STEP 3: Build web viewer
# ────────────────────────────────────────────────────────────
def build_web_viewer():
    section("Step 3/5: Building glimPSE")
    subprocess.run(["pnpm", "build"], cwd=ATLAS_VIEW_DIR, shell=True, check=True)
    
    if os.path.exists(DEPLOY_WEB):
        shutil.rmtree(DEPLOY_WEB)
    shutil.copytree(WEB_DIST, DEPLOY_WEB)
    print("  ✅ glimPSE built and copied")
    
    trailer_src = os.path.join(ATLAS_VIEW_DIR, "apps", "remotion-trailer", "out", "trailer.mp4")
    trailer_dst = os.path.join(DEPLOY_PUBLIC, "trailer.mp4")
    if os.path.exists(trailer_src):
        shutil.copy2(trailer_src, trailer_dst)
        print("  ✅ Trailer copied to public root")

# ────────────────────────────────────────────────────────────
# STEP 4: Deploy to Cloud Run
# ────────────────────────────────────────────────────────────
def deploy():
    section("Step 4/5: Deploying to Cloud Run")
    subprocess.run([
        "gcloud", "run", "deploy", "glim-viewer",
        "--source", ".",
        "--project", "shed-489901",
        "--region", "us-central1",
        "--allow-unauthenticated",
        "--port=8080"
    ], cwd=DEPLOY_DIR, shell=True, check=True)

# ────────────────────────────────────────────────────────────
# STEP 5: Verify
# ────────────────────────────────────────────────────────────
def verify():
    section("Step 5/5: Verifying Endpoints")
    time.sleep(5)
    
    checks = [
        f"{CLOUD_URL}/", f"{CLOUD_URL}/web/",
        f"{CLOUD_URL}/research/", f"{CLOUD_URL}/research/style.css",
        f"{CLOUD_URL}/native/", f"{CLOUD_URL}/trailer.mp4",
    ]
    ok = fail = 0
    for url in checks:
        try:
            req = urllib.request.Request(url, method="HEAD")
            resp = urllib.request.urlopen(req, timeout=10)
            ct = resp.headers.get("Content-Type", "")
            print(f"  ✅ [{resp.status}] {url.replace(CLOUD_URL, '')}  ({ct})")
            ok += 1
        except Exception as e:
            print(f"  ❌ {url.replace(CLOUD_URL, '')}: {e}")
            fail += 1
    
    print(f"\n  Results: {ok}/{ok+fail} passed")

# ────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        build_native_wasm()
    except Exception as e:
        print(f"  ⚠️ Native WASM build skipped: {e}")
        print("     Using existing binary in deploy_bundle/public/native/")
    build_research_site()
    build_web_viewer()
    deploy()
    verify()
    print("\n✅ All done.")
