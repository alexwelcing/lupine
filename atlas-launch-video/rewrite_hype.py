import os

scenes = {
    "cold-open.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <link rel="stylesheet" href="../styles/global.css" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    .hype-text { font-family: var(--font-sans); font-size: 100px; font-weight: 900; color: white; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); }
    .hype-sub { font-size: 40px; color: var(--lupine-400); margin-top: 20px; font-weight: 500; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="cold-open" data-start="0" data-duration="4" data-width="1920" data-height="1080">
    <div class="grid-bg clip" id="grid" data-start="0" data-duration="4"></div>
    <div class="hype-text clip" id="t1" data-start="0.5" data-duration="1.5">Materials Discovery<br><div class="hype-sub">Is too slow.</div></div>
    <div class="hype-text clip" id="t2" data-start="2.0" data-duration="2.0">40 Years of Data.<br><div class="hype-sub">Waiting to be unlocked.</div></div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.to("#t1", { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" }, 0.5);
    tl.to("#t1", { opacity: 0, scale: 1.1, duration: 0.2 }, 1.8);
    tl.to("#t2", { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" }, 2.0);
    tl.to("#t2", { opacity: 0, scale: 1.1, duration: 0.2 }, 3.8);
    tl.set({}, {}, 4);
    window.__timelines["cold-open"] = tl;
  </script>
</body>
</html>""",

    "brand-reveal.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <link rel="stylesheet" href="../styles/global.css" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    .brand-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo { width: 300px; height: 300px; opacity: 0; }
    .title { font-size: 120px; font-weight: 800; color: white; margin-top: 40px; letter-spacing: 0.2em; opacity: 0; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="brand-reveal" data-start="0" data-duration="4" data-width="1920" data-height="1080">
    <div class="grid-bg clip" data-start="0" data-duration="4"></div>
    <div class="brand-wrap">
      <svg class="logo clip" id="logo" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
         <circle cx="40" cy="40" r="5" fill="#9ba6ea" />
         <circle cx="40" cy="40" r="4" fill="#7b8ae0" />
         <path d="M40 8 C43 20, 46 30, 40 35 C34 30, 37 20, 40 8Z" fill="#5565d4" />
         <path d="M40 72 C37 60, 34 50, 40 45 C46 50, 43 60, 40 72Z" fill="#5565d4" />
         <path d="M8 40 C20 37, 30 34, 35 40 C30 46, 20 43, 8 40Z" fill="#8b6bc4" />
         <path d="M72 40 C60 43, 50 46, 45 40 C50 34, 60 37, 72 40Z" fill="#8b6bc4" />
      </svg>
      <div class="title clip" id="title">LUPINE</div>
    </div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#logo", { scale: 0.5, rotation: -90 }, { opacity: 1, scale: 1, rotation: 0, duration: 1, ease: "elastic.out(1, 0.5)" }, 0.5);
    tl.to("#title", { opacity: 1, y: -20, duration: 0.6, ease: "power3.out" }, 1.0);
    tl.to(".brand-wrap", { opacity: 0, scale: 1.2, duration: 0.5 }, 3.5);
    tl.set({}, {}, 4);
    window.__timelines["brand-reveal"] = tl;
  </script>
</body>
</html>""",

    "drag-drop.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <link rel="stylesheet" href="../styles/global.css" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    .huge { font-size: 150px; font-weight: 900; color: #4ecdc4; text-transform: uppercase; position: absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:0; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="drag-drop" data-start="0" data-duration="6" data-width="1920" data-height="1080">
    <div class="huge" id="t1">GPU ACCELERATED</div>
    <div class="huge" id="t2" style="color: #ff5472;">RUST KERNEL</div>
    <div class="huge" id="t3" style="color: #f0b840;">LEAN 4 FORMALIZED</div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.to("#t1", { opacity:1, scale:1.1, duration:0.2 }, 0.5);
    tl.to("#t1", { opacity:0, duration:0.2 }, 2.0);
    tl.to("#t2", { opacity:1, scale:1.1, duration:0.2 }, 2.2);
    tl.to("#t2", { opacity:0, duration:0.2 }, 3.8);
    tl.to("#t3", { opacity:1, scale:1.1, duration:0.2 }, 4.0);
    tl.to("#t3", { opacity:0, duration:0.2 }, 5.8);
    tl.set({}, {}, 6);
    window.__timelines["drag-drop"] = tl;
  </script>
</body>
</html>""",

    "gallery-tour.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <link rel="stylesheet" href="../styles/global.css" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    .impact { position:absolute; left: 100px; top: 300px; font-size: 130px; font-weight: 900; color: white; opacity: 0; line-height: 1.1; }
    .impact span { color: var(--lupine-400); }
  </style>
</head>
<body>
  <div id="root" data-composition-id="gallery-tour" data-start="0" data-duration="6" data-width="1920" data-height="1080">
    <div class="impact" id="msg">10,000+ ATOMS.<br><span>60 FPS.</span><br>ZERO PYTHON.</div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#msg", { x: -100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power4.out" }, 0.5);
    tl.to("#msg", { x: 100, opacity: 0, duration: 0.5 }, 5.0);
    tl.set({}, {}, 6);
    window.__timelines["gallery-tour"] = tl;
  </script>
</body>
</html>""",

    "rendering-power.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <link rel="stylesheet" href="../styles/global.css" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    .center-text { font-size: 100px; color: white; font-weight: 900; text-align: center; position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0;}
    .number { font-size: 200px; color: #28c840; line-height:1; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="rendering-power" data-start="0" data-duration="10" data-width="1920" data-height="1080">
    <div class="center-text" id="t1">PROVING THE<br><span style="color:var(--lupine-300);">HYPER-RIBBON</span></div>
    <div class="center-text" id="t2"><div class="number">48</div>THEOREMS<br>FORMALLY VERIFIED.</div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.to("#t1", { opacity:1, scale:1.05, duration: 0.5, ease: "power2.out" }, 1.0);
    tl.to("#t1", { opacity:0, scale:1.1, duration: 0.5 }, 4.5);
    tl.fromTo("#t2", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "back.out" }, 5.0);
    tl.to("#t2", { opacity:0, duration: 0.5 }, 9.0);
    tl.set({}, {}, 10);
    window.__timelines["rendering-power"] = tl;
  </script>
</body>
</html>""",

    "flythrough.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <link rel="stylesheet" href="../styles/global.css" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    .huge-squad { font-size: 140px; font-weight: 900; color: white; text-align: center; position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity: 0;}
    .bg-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity: 0.4; z-index: -1; filter: grayscale(100%) contrast(120%);}
  </style>
</head>
<body>
  <div id="root" data-composition-id="flythrough" data-start="0" data-duration="10" data-width="1920" data-height="1080">
    <div class="grid-bg"></div>
    <div class="huge-squad" id="squad">FOR THE SQUAD.<br><span style="color:var(--accent-gold);">LET'S BUILD.</span></div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.to("#squad", { opacity: 1, scale: 1.1, duration: 2, ease: "power2.out" }, 2.0);
    tl.to("#squad", { opacity: 0, scale: 1.2, duration: 1 }, 8.0);
    tl.set({}, {}, 10);
    window.__timelines["flythrough"] = tl;
  </script>
</body>
</html>""",

    "publication-export.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <link rel="stylesheet" href="../styles/global.css" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    .ship-it { font-size: 180px; font-weight: 900; color: #ff5472; position: absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:0; text-transform:uppercase; letter-spacing: 0.05em;}
  </style>
</head>
<body>
  <div id="root" data-composition-id="publication-export" data-start="0" data-duration="8" data-width="1920" data-height="1080">
    <div class="ship-it" id="ship">WE ARE SHIPPING.</div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.fromTo("#ship", { scale: 0.8, opacity:0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" }, 1.0);
    tl.to("#ship", { scale: 1.5, opacity: 0, duration: 0.5 }, 6.5);
    tl.set({}, {}, 8);
    window.__timelines["publication-export"] = tl;
  </script>
</body>
</html>""",

    "outro.html": """<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <link rel="stylesheet" href="../styles/global.css" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    .outro-wrap { position: absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0;}
    .join { font-size: 80px; font-weight: 800; color: white; margin-bottom: 20px;}
    .url { font-size: 50px; font-family: var(--font-mono); color: var(--lupine-400);}
  </style>
</head>
<body>
  <div id="root" data-composition-id="outro" data-start="0" data-duration="12" data-width="1920" data-height="1080">
    <div class="outro-wrap" id="wrap">
      <div class="join">JOIN THE REVOLUTION</div>
      <div class="url">lupine.science</div>
    </div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.to("#wrap", { opacity: 1, y: -30, duration: 1, ease: "power3.out" }, 1.0);
    tl.set({}, {}, 12);
    window.__timelines["outro"] = tl;
  </script>
</body>
</html>"""
}

for filename, content in scenes.items():
    filepath = os.path.join(r"c:\Users\alexw\Downloads\shed\glim\atlas-launch-video\compositions", filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Successfully rewrote hyperframes to be hype squad oriented.")
