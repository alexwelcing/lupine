import os

# New highly targeted SEO page
page_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How to Visualize LAMMPS Output in the Browser | Lupine glimPSE</title>
    <meta name="description" content="Stop downloading desktop apps. Drag and drop your LAMMPS trajectory (.lammpstrj) or dump files into the browser and render 1M+ atoms instantly with WebGPU.">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        :root {
            --lupine-600: #3d4db3; --lupine-500: #5565d4; --lupine-400: #7b8ae0;
            --slate-950: #0a0b12; --slate-900: #0f1119; --slate-800: #181b28;
            --slate-400: #9096ab; --slate-300: #b4b9cc; --slate-200: #d4d7e3; --slate-100: #eceef4;
            --accent-cyan: #4ecdc4;
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            --font-serif: 'Playfair Display', Georgia, serif;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: var(--font-sans); background: transparent; color: var(--slate-200); line-height: 1.7; overflow-x: hidden; }
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; background: rgba(10, 11, 18, 0.92); border-bottom: 1px solid rgba(91, 58, 140, 0.15); backdrop-filter: blur(20px); }
        .nav-brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .nav-brand-text { font-size: 15px; font-weight: 700; color: var(--slate-100); letter-spacing: 0.05em; }
        .hero { padding: 180px 40px 100px; text-align: center; max-width: 900px; margin: 0 auto; position: relative; z-index: 2; }
        .hero h1 { font-family: var(--font-serif); font-size: clamp(36px, 5vw, 64px); color: var(--slate-100); font-weight: 400; line-height: 1.15; margin-bottom: 24px; }
        .hero h1 em { font-style: italic; background: linear-gradient(135deg, var(--lupine-400), var(--accent-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero p { font-size: 18px; color: var(--slate-400); max-width: 620px; margin: 0 auto 40px; }
        .dropzone { border: 2px dashed rgba(123, 138, 224, 0.5); background: rgba(10, 11, 18, 0.6); padding: 80px 40px; border-radius: 24px; cursor: pointer; transition: all 0.3s; margin-bottom: 60px; }
        .dropzone:hover { border-color: var(--accent-cyan); background: rgba(123, 138, 224, 0.1); }
        .dropzone h3 { color: var(--slate-100); font-size: 24px; margin-bottom: 12px; }
        .dropzone p { color: var(--slate-400); font-size: 16px; margin: 0; }
        
        .seo-content { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 48px; text-align: left; }
        .seo-content h2 { font-size: 24px; color: var(--slate-100); margin-bottom: 16px; }
        .seo-content h3 { font-size: 18px; color: var(--slate-200); margin-top: 32px; margin-bottom: 12px; }
        .seo-content p { color: var(--slate-400); margin-bottom: 16px; }
        .seo-content code { background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 4px; color: var(--accent-cyan); font-size: 14px; }
    </style>
</head>
<body>
    <div id="global-bg" style="position:fixed; inset:0; background:var(--slate-950); z-index:-3;"></div>
    <div id="global-scrim" style="position:fixed; inset:0; background:rgba(10, 11, 18, 0.5); z-index:-1;"></div>
    <nav>
        <a href="index.html" class="nav-brand">
            <span class="nav-brand-text">Lupine glimPSE</span>
        </a>
    </nav>

    <section class="hero">
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent-cyan); margin-bottom: 24px;">Free Tool</div>
        <h1>Visualize LAMMPS Output<br><em>Instantly in the Browser</em></h1>
        <p>You asked ChatGPT how to visualize `dump.lammpstrj` files. The answer isn't downloading a massive desktop app. It's dragging and dropping right here.</p>
        
        <div class="dropzone" id="dz">
            <h3>Drag & Drop LAMMPS Trajectory</h3>
            <p>Supports .lammpstrj, .dump, .xyz — powered by WebGPU and WASM.</p>
        </div>

        <div class="seo-content">
            <h2>The modern way to view Molecular Dynamics</h2>
            <p>Historically, researchers have turned to OVITO or VMD to visualize LAMMPS output. While powerful, they require local installations, dependencies, and complex setups. <strong>Lupine glimPSE</strong> leverages modern WebGPU to parse and render millions of atoms directly in your browser tab.</p>
            
            <h3>How to generate compliant LAMMPS dumps:</h3>
            <p>To ensure smooth visualization, use the custom dump command in your LAMMPS input script:</p>
            <code>dump 1 all custom 1000 dump.lammpstrj id type x y z</code>
            
            <h3>What is Lupine Materials Science?</h3>
            <p>We are building the definitive deep-tech infrastructure for computational materials design. From unified Rust-based MD engines to browser-native visualization. <a href="index.html" style="color:var(--lupine-400);">Learn more about our platform</a>.</p>
        </div>
    </section>
</body>
</html>
"""

with open("lammps-visualizer.html", "w", encoding="utf-8") as f:
    f.write(page_html)

# Update vite config to include this specifically engineered landing page
with open("vite.config.js", "r", encoding="utf-8") as f:
    vite_cfg = f.read()

if "lammpsvisualizer" not in vite_cfg:
    vite_cfg = vite_cfg.replace(
        "onepager: resolve(__dirname, 'one-pager.html'),",
        "onepager: resolve(__dirname, 'one-pager.html'),\n        lammpsvisualizer: resolve(__dirname, 'lammps-visualizer.html'),"
    )
    with open("vite.config.js", "w", encoding="utf-8") as f:
        f.write(vite_cfg)

print("Generated LAMMPS SEO Landing Page")
