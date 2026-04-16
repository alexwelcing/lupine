"""Optimized deployment pipeline for glim.

Stages:
  1. Build research docs (markdown → HTML)
  2. Pre-compress all compressible assets (gzip_static)
  3. Deploy to Cloud Run
  4. Verify endpoints
"""
import os, subprocess, shutil, sys, time, urllib.request, re, gzip

try:
    import markdown
except ImportError:
    print("Installing markdown...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "markdown", "-q"])
    import markdown

BASE_DIR = r"c:\Users\alexw\Downloads\shed\glim"
DEPLOY_DIR = os.path.join(BASE_DIR, "atlas", "deploy_bundle")
DEPLOY_PUBLIC = os.path.join(DEPLOY_DIR, "public")
DEPLOY_RESEARCH = os.path.join(DEPLOY_PUBLIC, "research")
CLOUD_URL = "https://atlas-viewer-350452481649.us-central1.run.app"

def section(t): print(f"\n{'='*60}\n {t}\n{'='*60}\n")

# ── Research docs config ──
RESEARCH_DOCS = {
    "Ecosystem Research": [
        {"file": "deep-research-report.md", "title": "LAMMPS Ecosystem Analysis", "desc": "Comprehensive landscape analysis of the LAMMPS ecosystem -- ML potentials, workflow automation, post-processing gaps, and distribution challenges"},
        {"file": "ancillary-research-opps.md", "title": "2025-2026 People, Labs & Methods", "desc": "Current-state landscape with 60-paper corpus, 25-person advisory council prospects, and actionable opportunity clusters"},
        {"file": "foundational-research.md", "title": "Advisory Council Prospectus", "desc": "Origin document with tiered 12-person priority outreach list -- core LAMMPS stewards, workflow/MLIP leaders, and international collaborators"},
        {"file": "example-research-papers.md", "title": "Downloadable LAMMPS Datasets", "desc": "Curated catalog of publicly deposited simulation packages -- inputs, potentials, and trajectories from metals to polymers to 2D materials"},
        {"file": "chinese-md-sources.md", "title": "Chinese MD Research Sources", "desc": "Landscape of molecular dynamics research from Chinese institutions and collaboration networks"},
    ],
    "Platform Vision": [
        {"file": os.path.join("atlas", "glim-project-plan.md"), "title": "glim Platform Architecture", "desc": "Three-pillar vision -- Quantum DFT Engine, Molecular Dynamics Engine, and ML Potential Pipeline -- unified for seamless materials discovery"},
        {"file": os.path.join("atlas", "openDFT-project-plan.md"), "title": "OpenDFT: VASP-Compatible DFT Engine", "desc": "Technical plan for an open-source plane-wave PAW DFT engine with VASP I/O compatibility and Delta Codes verification"},
    ],
    "Product Strategy": [
        {"file": os.path.join("atlas", "glimPSE-web-product-plan.md"), "title": "glimPSE -- Web Product Plan", "desc": "Active strategy -- WebGPU-powered web visualization vs Python library, OVITO paid wall analysis, and zero-install deployment"},
        {"file": os.path.join("atlas", "glimPSE-product-plan.md"), "title": "glimPSE -- Original Python Plan", "desc": "Earlier product strategy proposing glimPSE as a pip-installable library -- superseded by the web approach but valuable for competitive context"},
        {"file": os.path.join("atlas", "glimPSE-example-gallery.md"), "title": "Example Gallery Specification", "desc": "12 curated LAMMPS simulations for website launch -- crack propagation, nanoindentation, LJ melt, granular pour, CNT tensile pull, and more"},
    ],
    "Strategic Documents": [
        {"file": "STATUS.md", "title": "Project Status", "desc": "Current implementation status and near-term development roadmap"},
        {"file": "RESEARCH-CHAIN.md", "title": "Research Chain", "desc": "Linked evidence chain connecting ecosystem analysis to product decisions to implementation priorities"},
        {"file": "GLOSSARY.md", "title": "Glossary", "desc": "Key terms, acronyms, and concepts used throughout the glim research and planning documents"},
    ],
}

CSS = """* { margin: 0; padding: 0; box-sizing: border-box; }

body { font-family: Georgia, 'Times New Roman', serif; background: #fafafa; color: #1a1a1a; line-height: 1.9; font-size: 17px; -webkit-font-smoothing: antialiased; }
::selection { background: #000; color: #fff; }

.container { max-width: 640px; margin: 0 auto; padding: 0 40px 100px; }
nav.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 30px 40px; max-width: 640px; margin: 0 auto; }
nav.top-bar .logo { font-size: 14px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #000; text-decoration: none; }
nav.top-bar .logo span { font-style: italic; font-weight: 400; color: #666; }
nav.top-bar .links { display: flex; gap: 24px; }
nav.top-bar .links a { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #666; text-decoration: none; transition: color 0.3s ease; }
nav.top-bar .links a:hover { color: #000; }

.hero { text-align: center; margin-bottom: 80px; padding-top: 60px; max-width: 640px; margin: 0 auto; padding-left: 40px; padding-right: 40px; }
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

@media (max-width: 640px) { .hero h1 { font-size: 24px; letter-spacing: 0.1em; } .container, .article, .hero, nav.top-bar { padding-left: 24px; padding-right: 24px; } .article blockquote, .article pre, .card { padding: 24px; } }
"""

COMPRESS_EXTS = {".html", ".css", ".js", ".json", ".wasm", ".svg",
                 ".lammpstrj", ".xyz", ".dump", ".txt", ".xml"}

def slugify(fn): return os.path.splitext(os.path.basename(fn))[0]

def build_research():
    section("Step 1/4: Building Research Site")
    if os.path.exists(DEPLOY_RESEARCH): shutil.rmtree(DEPLOY_RESEARCH)
    os.makedirs(DEPLOY_RESEARCH)
    
    with open(os.path.join(DEPLOY_RESEARCH, "style.css"), "w", encoding="utf-8") as f:
        f.write(CSS)
    print("  Wrote style.css")
    
    converted = []
    for cat, docs in RESEARCH_DOCS.items():
        for doc in docs:
            md_path = os.path.join(BASE_DIR, doc["file"])
            if not os.path.exists(md_path):
                print(f"  SKIP: {doc['file']}")
                continue
            slug = slugify(doc["file"])
            with open(md_path, "r", encoding="utf-8") as f:
                md_content = f.read()
            try:
                html_body = markdown.markdown(md_content, extensions=['tables', 'fenced_code', 'toc'])
            except:
                html_body = markdown.markdown(md_content)
            
            html_body = re.sub(r'<code>([\w/.-]+\.md)</code>',
                lambda m: f'<a href="{slugify(m.group(1))}.html">{m.group(1)}</a>', html_body)
            
            page = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{doc['title']} -- glim Research</title><meta name="description" content="{doc['desc']}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css"></head><body>
<nav class="top-bar"><a href="/" class="logo">glim<span>research</span></a><div class="links"><a href="/research/">Index</a><a href="/web/">Viewer</a><a href="/">Manifesto</a></div></nav>
<div class="article"><a href="/research/" class="back">&larr; Research Index</a><h1>{doc['title']}</h1>{html_body}</div>
<footer><p>glim -- Computational Materials Science Platform -- 2026</p></footer></body></html>"""
            
            with open(os.path.join(DEPLOY_RESEARCH, f"{slug}.html"), "w", encoding="utf-8") as f:
                f.write(page)
            converted.append({"cat": cat, "slug": slug, "title": doc["title"], "desc": doc["desc"]})
            print(f"  OK {slug}.html")
    
    # Build index
    cards = ""
    cur = None
    for item in converted:
        if item["cat"] != cur:
            if cur: cards += "</div></section>"
            cur = item["cat"]
            cards += f'<section class="category"><div class="category-header"><div class="bar"></div><h2>{cur}</h2></div><div class="card-grid">'
        cards += f'<a href="{item["slug"]}.html" class="card"><h3>{item["title"]}</h3><p>{item["desc"]}</p></a>'
    if cur: cards += "</div></section>"
    
    idx = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>glim Research Library</title><meta name="description" content="Complete research library for the glim Computational Materials Science Platform.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css"></head><body>
<nav class="top-bar"><a href="/" class="logo">glim<span>research</span></a><div class="links"><a href="/web/">Viewer</a><a href="/">Manifesto</a></div></nav>
<div class="hero"><h1>Research Library</h1><p class="sub">Complete ecosystem analysis, product strategy, and technical architecture for the glim Computational Materials Science Platform.</p><span class="badge">{len(converted)} documents</span></div>
<div class="container">{cards}</div>
<footer><p>glim -- Computational Materials Science Platform -- 2026</p></footer></body></html>"""
    
    with open(os.path.join(DEPLOY_RESEARCH, "index.html"), "w", encoding="utf-8") as f:
        f.write(idx)
    print(f"  OK index.html ({len(converted)} docs)")


def clean_dead_weight():
    section("Step 2/4: Removing Dead Weight")
    removed = 0
    for p in [
        os.path.join(DEPLOY_PUBLIC, "web", "testdata"),
        os.path.join(DEPLOY_PUBLIC, "web", "gallery", "open_data"),
    ]:
        if os.path.exists(p):
            shutil.rmtree(p)
            print(f"  Removed {os.path.relpath(p, DEPLOY_PUBLIC)}")
            removed += 1
    
    # Remove bloated gallery files (>10 MB)
    nanoparticle = os.path.join(DEPLOY_PUBLIC, "web", "gallery", "advanced_samples", "dump.multielement_nanoparticle.lammpstrj")
    if os.path.exists(nanoparticle):
        size_mb = os.path.getsize(nanoparticle) / 1024 / 1024
        os.remove(nanoparticle)
        print(f"  Removed nanoparticle dump ({size_mb:.0f} MB)")
        removed += 1
    
    # Remove old PNG if WebP exists
    png = os.path.join(DEPLOY_PUBLIC, "screenshot.png")
    webp = os.path.join(DEPLOY_PUBLIC, "screenshot.webp")
    if os.path.exists(png) and os.path.exists(webp):
        os.remove(png)
        print("  Removed screenshot.png (WebP available)")
        removed += 1
    
    if removed == 0:
        print("  Already clean")


def precompress():
    section("Step 3/4: Pre-compressing Assets (gzip_static)")
    total_saved = 0
    compressed_count = 0
    
    # Remove stale .gz files
    for root, _dirs, files in os.walk(DEPLOY_PUBLIC):
        for fname in files:
            if fname.endswith(".gz"):
                gz_path = os.path.join(root, fname)
                orig = gz_path[:-3]
                if not os.path.exists(orig):
                    os.remove(gz_path)
    
    for root, _dirs, files in os.walk(DEPLOY_PUBLIC):
        for fname in files:
            fpath = os.path.join(root, fname)
            ext = os.path.splitext(fname)[1].lower()
            
            if ext not in COMPRESS_EXTS:
                continue
            
            gz_path = fpath + ".gz"
            original_size = os.path.getsize(fpath)
            
            if original_size < 256:
                continue
            
            # Skip if .gz already exists and is newer than original
            if os.path.exists(gz_path) and os.path.getmtime(gz_path) >= os.path.getmtime(fpath):
                gz_size = os.path.getsize(gz_path)
                total_saved += original_size - gz_size
                compressed_count += 1
                continue
            
            with open(fpath, "rb") as f_in:
                with gzip.open(gz_path, "wb", compresslevel=9) as f_out:
                    f_out.write(f_in.read())
            
            gz_size = os.path.getsize(gz_path)
            saved = original_size - gz_size
            total_saved += saved
            compressed_count += 1
            
            rel = os.path.relpath(fpath, DEPLOY_PUBLIC)
            if original_size > 50000:  # Only log large files
                print(f"  {rel:50s}  {original_size:>10,} → {gz_size:>10,}")
    
    print(f"\n  {compressed_count} files pre-compressed")
    print(f"  Transfer savings: {total_saved / 1024 / 1024:.1f} MB")


def deploy_and_verify():
    section("Step 4/4: Deploy + Verify")
    subprocess.run(["gcloud", "run", "deploy", "atlas-viewer", "--source", ".", "--project", "shed-489901",
        "--region", "us-central1", "--allow-unauthenticated", "--port=8080", "--memory=512Mi"],
        cwd=DEPLOY_DIR, shell=True, check=True)
    time.sleep(5)
    
    print("\nVerifying endpoints...")
    endpoints = [
        ("/", "Landing page"),
        ("/web/", "Web viewer"),
        ("/research/", "Research index"),
        ("/research/style.css", "Research CSS"),
        ("/native/", "Native WASM"),
    ]
    
    all_ok = True
    for path, label in endpoints:
        url = f"{CLOUD_URL}{path}"
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=10)
            ct = r.headers.get("Content-Type", "?")
            ce = r.headers.get("Content-Encoding", "none")
            print(f"  OK [{r.status}] {label:20s}  enc={ce}")
        except Exception as e:
            print(f"  FAIL {label}: {e}")
            all_ok = False
    
    # Test gzip_static is working
    print("\n  Testing gzip_static...")
    try:
        req = urllib.request.Request(f"{CLOUD_URL}/research/style.css")
        req.add_header("Accept-Encoding", "gzip")
        r = urllib.request.urlopen(req, timeout=10)
        ce = r.headers.get("Content-Encoding", "none")
        print(f"  gzip_static: {'✅ ACTIVE' if ce == 'gzip' else '⚠️ NOT ACTIVE (got: ' + ce + ')'}")
    except Exception as e:
        print(f"  gzip test failed: {e}")
    
    return all_ok

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    
    if mode == "full":
        build_research()
        clean_dead_weight()
        precompress()
        deploy_and_verify()
    elif mode == "quick":
        # Skip research rebuild — just precompress and deploy
        clean_dead_weight()
        precompress()
        deploy_and_verify()
    elif mode == "local":
        # Just build + compress, no deploy
        build_research()
        clean_dead_weight()
        precompress()
        print("\n✅ Local build complete. Run with 'full' to deploy.")
    else:
        print(f"Usage: python deploy_optimized.py [full|quick|local]")
    
    print("\nDone.")
