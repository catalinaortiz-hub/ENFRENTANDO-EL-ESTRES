/* ═══════════════════════════════════════════════════════════════
   app.js — Módulo Principal de la Aplicación
   Enfrentando el Estrés · UAO Multimedia
   ─────────────────────────────────────
   Responsabilidades:
   - Inicialización de todos los módulos
   - Control de la navbar (scroll + hamburger)
   - Smooth scrolling y navegación entre secciones
   - Animaciones de entrada (Intersection Observer)
   - Sistema de toast notifications (auto-dismiss 5s)
   - Canvas de partículas de fondo
   ═══════════════════════════════════════════════════════════════ */

const AppModule = (() => {
  'use strict';

  /* ─── CONSTANTS ─────────────────────────────────────────────── */
  const SCROLL_THRESHOLD = 60;    // px before navbar gets solid background
  const TOAST_DURATION   = 5000;  // ms — auto-dismiss time
  const TOAST_MAX        = 4;     // max toasts visible at once
  const PARTICLE_COUNT   = 55;

  /* ─── STATE ──────────────────────────────────────────────────── */
  let particles = [];
  let animFrame = null;
  let canvasCtx = null;
  let canvas    = null;

  /* ─── INIT ───────────────────────────────────────────────────── */
  function init() {
    _initNavbar();
    _initSmoothScroll();
    _initSectionObserver();
    _initParticles();
    _initActiveNavHighlight();
    // Sub-modules (TasksModule, MultimediaModule, GameLoaderModule)
    // are initialized by AuthModule after a successful login.
  }

  /* ─── NAVBAR ─────────────────────────────────────────────────── */
  function _initNavbar() {
    const navbar      = document.getElementById('navbar');
    const hamburger   = document.getElementById('hamburger');
    const mobileMenu  = document.getElementById('mobile-menu');
    const mobileLinks = mobileMenu?.querySelectorAll('.navbar__link');

    if (!navbar) return;

    // Scroll: add/remove scrolled class
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          navbar.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // Hamburger toggle
    hamburger?.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      mobileMenu.setAttribute('aria-hidden', !isOpen);
      hamburger.classList.toggle('open', isOpen);
      document.body.classList.toggle('menu-open', isOpen);
    });

    // Close mobile menu when a link is clicked
    mobileLinks?.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('menu-open');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (
        mobileMenu?.classList.contains('open') &&
        !mobileMenu.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('menu-open');
      }
    });
  }

  /* ─── SMOOTH SCROLL ──────────────────────────────────────────── */
  function _initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();
        const navbarH = document.getElementById('navbar')?.offsetHeight || 72;
        const targetY = target.getBoundingClientRect().top + window.scrollY - navbarH;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      });
    });
  }

  /* ─── SECTION OBSERVER ───────────────────────────────────────── */
  function _initSectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section--visible');
          entry.target.querySelectorAll('.glass-card, .hero__stat, .media-card').forEach((el, i) => {
            setTimeout(() => el.classList.add('card--visible'), i * 80);
          });
        }
      });
    }, { root: null, rootMargin: '0px 0px -80px 0px', threshold: 0.08 });

    document.querySelectorAll('section').forEach(section => {
      section.classList.add('section--hidden');
      observer.observe(section);
    });

    // Hero always visible
    const hero = document.getElementById('hero');
    if (hero) {
      hero.classList.remove('section--hidden');
      hero.classList.add('section--visible');
    }
  }

  /* ─── ACTIVE NAV HIGHLIGHT ───────────────────────────────────── */
  function _initActiveNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar__link[data-section]');

    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.toggle('navbar__link--active', link.dataset.section === id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(s => observer.observe(s));
  }

  /* ─── PARTICLES CANVAS ───────────────────────────────────────── */
  function _initParticles() {
    canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    canvasCtx = canvas.getContext('2d');
    _resizeCanvas();
    _createParticles();
    _animateParticles();

    window.addEventListener('resize', _debounce(() => {
      _resizeCanvas();
      _createParticles();
    }, 250));
  }

  function _resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function _createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(_newParticle());
    }
  }

  function _newParticle(fromBottom = false) {
    const colors = [
      'rgba(110,231,255,',
      'rgba(192,132,252,',
      'rgba(91,75,219,',
      'rgba(253,186,116,',
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return {
      x:            Math.random() * canvas.width,
      y:            fromBottom ? canvas.height + 10 : Math.random() * canvas.height,
      r:            Math.random() * 2.5 + 0.5,
      vx:           (Math.random() - 0.5) * 0.25,
      vy:           -(Math.random() * 0.4 + 0.1),
      alpha:        Math.random() * 0.5 + 0.1,
      color,
      twinkle:      Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
    };
  }

  function _animateParticles() {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
      p.twinkle += p.twinkleSpeed;
      const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.twinkle));

      canvasCtx.beginPath();
      canvasCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      canvasCtx.fillStyle = `${p.color}${alpha})`;
      canvasCtx.fill();

      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
        particles[i] = _newParticle(true);
        particles[i].x = Math.random() * canvas.width;
      }
    });

    animFrame = requestAnimationFrame(_animateParticles);
  }

  /* ─── TOAST SYSTEM ───────────────────────────────────────────── */

  /**
   * Display a toast notification that auto-dismisses after TOAST_DURATION.
   * @param {string} message
   * @param {'success'|'info'|'warning'|'error'} type
   */
  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Cap: remove oldest toast if at max
    const existing = container.querySelectorAll('.toast');
    if (existing.length >= TOAST_MAX) {
      _dismissToast(existing[0]);
    }

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'alert');
    el.textContent = message;

    container.appendChild(el);

    // Trigger enter animation (double rAF ensures the transition fires)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('toast--visible'));
    });

    // Auto-dismiss after TOAST_DURATION
    const timer = setTimeout(() => _dismissToast(el), TOAST_DURATION);

    // Allow manual dismiss by clicking
    el.addEventListener('click', () => {
      clearTimeout(timer);
      _dismissToast(el);
    });
  }

  /** Animate out then remove from DOM */
  function _dismissToast(el) {
    if (!el || !el.isConnected) return;
    el.classList.remove('toast--visible');
    // Remove from DOM after transition ends (fallback: 400ms)
    const cleanup = () => el.remove();
    el.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 400);
  }

  /* ─── HELPERS ────────────────────────────────────────────────── */
  function _debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* ─── PUBLIC API ─────────────────────────────────────────────── */
  return { init, toast };
})();

/* Expose globally so sub-modules can call AppModule.toast() */
window.AppModule = AppModule;

/* Bootstrap on DOM ready */
document.addEventListener('DOMContentLoaded', AppModule.init);