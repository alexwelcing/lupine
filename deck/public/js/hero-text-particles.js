/* ═══════════════════════════════════════════════════════════════
   HERO TEXT PARTICLES
   The headline is not rendered as type — it is a field of particles
   that coalesce into words and scatter at the cursor. A screen-reader
   accessible h1 remains in the DOM; the canvas is the visual layer.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const canvas = document.querySelector('.hero-text-particles');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rootStyles = getComputedStyle(document.documentElement);
  const ink = rootStyles.getPropertyValue('--ink').trim() || '#14161d';
  const lupine = rootStyles.getPropertyValue('--lupine').trim() || '#3d4db3';
  const muted = rootStyles.getPropertyValue('--ink-muted').trim() || '#8a8e99';

  const palette = [ink, lupine, muted, '#1f7a4d', '#9a5a2e'];

  let width, height;
  let particles = [];
  let mouse = { x: -1000, y: -1000, active: false };
  let time = 0;
  let rafId = null;

  const TEXT = 'Step 1 of a real-world Replicator.';
  const FONT = "'Newsreader', Georgia, serif";

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    buildParticles();
  }

  function sampleText() {
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');

    // Render at a crisp but not oversized resolution.
    const fontSize = Math.min(96, Math.max(42, width / 16));
    off.width = Math.max(1, Math.floor(width * 0.9));
    off.height = Math.max(1, Math.floor(fontSize * 2.8));

    octx.font = `300 italic ${fontSize}px ${FONT}`;
    octx.textBaseline = 'middle';
    octx.textAlign = 'center';
    octx.fillStyle = '#000';
    octx.fillText(TEXT, off.width / 2, off.height / 2);

    const imageData = octx.getImageData(0, 0, off.width, off.height);
    const data = imageData.data;
    const step = 3;
    const targets = [];

    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const i = (y * off.width + x) * 4;
        if (data[i + 3] > 100) {
          targets.push({
            x: (x / off.width) * width,
            y: (y / off.height) * height * 0.55 + height * 0.22,
            color: palette[(x + y) % palette.length],
          });
        }
      }
    }
    return targets.slice(0, 2200);
  }

  function buildParticles() {
    const targets = sampleText();
    const newParticles = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const p = particles[i];
      if (p) {
        p.tx = t.x;
        p.ty = t.y;
        p.color = t.color;
      } else {
        newParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          tx: t.x,
          ty: t.y,
          color: t.color,
          r: Math.random() * 1.2 + 0.6,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    // Trim excess if resized smaller.
    particles = particles.slice(0, targets.length).concat(newParticles).slice(0, targets.length);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    time += 0.005;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Spring toward target.
      const ax = (p.tx - p.x) * 0.025;
      const ay = (p.ty - p.y) * 0.025;
      p.vx += ax;
      p.vy += ay;

      // Brownian drift.
      p.vx += (Math.random() - 0.5) * 0.04;
      p.vy += (Math.random() - 0.5) * 0.04;

      // Mouse repulsion.
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140 && dist > 0.5) {
          const force = (1 - dist / 140) * 2.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      // Damping.
      p.vx *= 0.88;
      p.vy *= 0.88;

      p.x += p.vx;
      p.y += p.vy;

      // Occasional scatter/reform: every few seconds a particle forgets its target briefly.
      if (Math.sin(time + p.phase) > 0.999) {
        p.vx += (Math.random() - 0.5) * 3;
        p.vy += (Math.random() - 0.5) * 3;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
    }

    // Faint connectors near the cursor for a filament feel.
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = lupine;
    ctx.lineWidth = 0.5;
    if (mouse.active) {
      for (let i = 0; i < particles.length; i += 2) {
        const p = particles[i];
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(draw);
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });

  canvas.addEventListener('mouseleave', () => { mouse.active = false; }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches[0]) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    }
  }, { passive: true });

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 150);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) cancelAnimationFrame(rafId);
    else if (!document.hidden) draw();
  });

  resize();
  draw();
})();
