/* ═══════════════════════════════════════════════════════════════
   app.js — Módulo Principal de la Aplicación
   Enfrentando el Estrés · UAO Multimedia
   ─────────────────────────────────────
   Responsabilidades:
   - Inicialización de todos los módulos
   - Control de la navbar (hamburger)
   - Navegación SPA: muestra una sola sección a la vez
   - Sistema de toast notifications (auto-dismiss 5s)
   - Canvas de partículas de fondo
   ═══════════════════════════════════════════════════════════════ */

const AppModule = (() => {
  'use strict';

  /* ─── CONSTANTS ─────────────────────────────────────────────── */
  const TOAST_DURATION = 5000;
  const TOAST_MAX      = 4;
  const PARTICLE_COUNT = 55;
  const DEFAULT_VIEW   = 'tasks'; // primera pantalla al entrar

  /* ─── STATE ──────────────────────────────────────────────────── */
  let particles  = [];
  let animFrame  = null;
  let canvasCtx  = null;
  let canvas     = null;
  let activeView = null;

  /* ─── INIT ───────────────────────────────────────────────────── */
  function init() {
    _initNavbar();
    _initSPANavigation();
    _initParticles();
    // Sub-modules (TasksModule, MultimediaModule, GameLoaderModule)
    // son inicializados por AuthModule tras el login exitoso.
  }

  /* ─── NAVBAR ─────────────────────────────────────────────────── */
  function _initNavbar() {
    const navbar      = document.getElementById('navbar');
    const hamburger   = document.getElementById('hamburger');
    const mobileMenu  = document.getElementById('mobile-menu');
    const mobileLinks = mobileMenu?.querySelectorAll('.navbar__link');

    if (!navbar) return;

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

  /* ─── SPA NAVIGATION ─────────────────────────────────────────── */
  /**
   * Muestra una sola sección/vista a la vez.
   * Añade clase `app-view--active` a la sección seleccionada
   * y la quita de las demás. Hace fade-in suave.
   */
  function _initSPANavigation() {
    // Delegar sobre el document para capturar links del footer también
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-view]');
      if (!link) return;
      e.preventDefault();
      const viewId = link.dataset.view;
      if (viewId) showView(viewId);
    });

    // Mostrar la vista por defecto al cargar
    // (se llamará también desde AuthModule._showApp)
    showView(DEFAULT_VIEW);
  }

  /**
   * Cambia la vista activa.
   * @param {string} viewId — id de la sección ('tasks' | 'multimedia' | 'game')
   */
  function showView(viewId) {
    if (activeView === viewId) return;
    activeView = viewId;

    const views   = document.querySelectorAll('.app-view');
    const navLinks = document.querySelectorAll('[data-view]');

    // Ocultar todas las vistas
    views.forEach(v => {
      v.classList.remove('app-view--active');
    });

    // Mostrar la vista solicitada
    const target = document.querySelector(`[data-view-section="${viewId}"]`);
    if (target) {
      // Forzar reflow para que la transición CSS funcione correctamente
      requestAnimationFrame(() => {
        target.classList.add('app-view--active');
        // Scroll al top de la página al cambiar de vista
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        // IMPORTANTE: Si es la vista del juego, dar foco al iframe
        // para que capture inputs correctamente
        if (viewId === 'game') {
          setTimeout(() => {
            const iframe = document.getElementById('game-iframe');
            if (iframe && !iframe.hidden) {
              iframe.focus();
            }
          }, 100);
        }
      });
    }

    // Actualizar estado activo en los links de navbar
    navLinks.forEach(link => {
      link.classList.toggle('navbar__link--active', link.dataset.view === viewId);
    });
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
   * Muestra una notificación toast que se cierra sola tras TOAST_DURATION.
   * @param {string} message
   * @param {'success'|'info'|'warning'|'error'} type
   */
  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const existing = container.querySelectorAll('.toast');
    if (existing.length >= TOAST_MAX) {
      _dismissToast(existing[0]);
    }

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'alert');
    el.textContent = message;

    container.appendChild(el);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('toast--visible'));
    });

    const timer = setTimeout(() => _dismissToast(el), TOAST_DURATION);

    el.addEventListener('click', () => {
      clearTimeout(timer);
      _dismissToast(el);
    });
  }

  function _dismissToast(el) {
    if (!el || !el.isConnected) return;
    el.classList.remove('toast--visible');
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
  return { init, toast, showView };
})();

/* Exponer globalmente para que sub-módulos puedan llamar AppModule.toast() */
window.AppModule = AppModule;

/* Bootstrap al cargar el DOM */
document.addEventListener('DOMContentLoaded', AppModule.init);