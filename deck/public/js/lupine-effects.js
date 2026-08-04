/* ═══════════════════════════════════════════════════════════════
   LUPINE.SCIENCE EFFECTS LAYER
   Vanilla JS polish: scroll reveals, magnetic buttons, mobile nav,
   active section highlighting, page transitions, and a hero canvas.
   Degrades gracefully when JS is disabled.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── HERO CANVAS: particle network ─────────────────────────── */
  function initHeroCanvas() {
    const canvas = document.querySelector('.hero-canvas');
    if (!canvas || prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const lupine = rootStyles.getPropertyValue('--lupine').trim() || '#3d4db3';
    const inkMuted = rootStyles.getPropertyValue('--ink-muted').trim() || '#8a8e99';

    let width, height, dpr;
    let particles = [];
    let mouse = { x: -1000, y: -1000, active: false };
    let rafId = null;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
    }

    function buildParticles() {
      const area = width * height;
      const count = Math.max(20, Math.min(70, Math.floor(area / 18000)));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.5 + 1,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 0) {
            const force = (120 - dist) / 120;
            p.x += (dx / dist) * force * 0.8;
            p.y += (dy / dist) * force * 0.8;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = lupine;
        ctx.globalAlpha = 0.35;
        ctx.fill();
      }

      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = lupine;
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.globalAlpha = 0.12 * (1 - dist / 120);
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
    });
    canvas.addEventListener('mouseleave', () => { mouse.active = false; });

    window.addEventListener('resize', resize, { passive: true });
    resize();
    draw();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && rafId) cancelAnimationFrame(rafId);
      else if (!document.hidden) draw();
    });
  }

  /* ── SCROLL REVEAL ─────────────────────────────────────────── */
  function initScrollReveal() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.animate').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.animate').forEach((el) => observer.observe(el));
  }

  /* ── MAGNETIC BUTTONS ──────────────────────────────────────── */
  function initMagneticButtons() {
    if (prefersReducedMotion || window.matchMedia('(pointer: coarse)').matches) return;

    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ── MOBILE NAV ────────────────────────────────────────────── */
  function initMobileNav() {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelectorAll('.nav-links a');
    if (!nav || !toggle) return;

    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    links.forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── ACTIVE SECTION HIGHLIGHTING ───────────────────────────── */
  function initActiveSectionNav() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('.nav-links a[href^="#"], .nav-links a[href*=".html#"]'));
    if (links.length === 0) return;

    const sections = links
      .map((link) => {
        const hash = new URL(link.href).hash;
        if (!hash) return null;
        const id = hash.slice(1);
        const el = document.getElementById(id);
        return el ? { link, el } : null;
      })
      .filter(Boolean);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            links.forEach((link) => {
              const linkHash = new URL(link.href).hash.slice(1);
              link.classList.toggle('active', linkHash === id);
            });
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );

    sections.forEach(({ el }) => observer.observe(el));
  }

  /* ── PAGE TRANSITIONS ──────────────────────────────────────── */
  function initPageTransitions() {
    if (prefersReducedMotion) return;

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;

      e.preventDefault();
      document.body.classList.add('is-transitioning');
      setTimeout(() => {
        window.location = link.href;
      }, 220);
    });
  }

  /* ── BOOT ──────────────────────────────────────────────────── */
  function boot() {
    initHeroCanvas();
    initScrollReveal();
    initMagneticButtons();
    initMobileNav();
    initActiveSectionNav();
    initPageTransitions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
