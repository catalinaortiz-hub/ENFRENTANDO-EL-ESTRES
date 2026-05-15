/* ═══════════════════════════════════════════════════════════════
   game-loader.js — Módulo Cargador del Mini Juego
   Enfrentando el Estrés · UAO Multimedia
   ─────────────────────────────────────
   Responsabilidades:
   - Detectar si el juego Unity WebGL (game/index.html) está disponible
   - Mostrar placeholder animado mientras el juego no exista
   - Cargar el iframe de Unity WebGL al pulsar el botón
   - Controlar pantalla completa (Fullscreen API)
   - Generar estrellas decorativas en el placeholder

   Integración esperada (Unity WebGL Build):
     /game/
       index.html          ← punto de entrada del build
       Build/              ← archivos .data, .wasm, .framework.js
       TemplateData/       ← assets del template Unity
   ═══════════════════════════════════════════════════════════════ */

const GameLoaderModule = (() => {
  'use strict';

  /* ─── CONFIG ─────────────────────────────────────────────────── */
  // Punto de entrada del build Unity WebGL.
  // Cuando el equipo exporte el juego, colocar el build en /game/
  // y este loader lo detectará y habilitará el botón automáticamente.
  const GAME_SRC      = 'game/index.html';
  const STAR_COUNT    = 60;
  const STATUS_COLORS = {
    ready:       '#6EE7FF',
    loading:     '#FDBA74',
    unavailable: '#C084FC',
  };

  /* ─── STATE ──────────────────────────────────────────────────── */
  let gameAvailable = false;
  let gameLoaded    = false;

  /* ─── DOM REFS ───────────────────────────────────────────────── */
  let DOM = {};

  /* ─── INIT ───────────────────────────────────────────────────── */
  function init() {
    _resolveDOM();
    _generateStars();
    _checkGameAvailability();
    _bindControls();
  }

  /* ─── RESOLVE DOM ────────────────────────────────────────────── */
  function _resolveDOM() {
    DOM = {
      frame:          document.getElementById('game-frame'),
      iframe:         document.getElementById('game-iframe'),
      placeholder:    document.getElementById('game-placeholder'),
      loadBtn:        document.getElementById('game-load-btn'),
      fullscreenBtn:  document.getElementById('game-fullscreen-btn'),
      statusDot:      document.querySelector('.game__status-dot'),
      statusText:     document.getElementById('game-status-text'),
      starsContainer: document.getElementById('game-stars'),
    };
  }

  /* ─── GENERATE STARS ─────────────────────────────────────────── */
  function _generateStars() {
    const container = DOM.starsContainer;
    if (!container) return;

    for (let i = 0; i < STAR_COUNT; i++) {
      const star    = document.createElement('span');
      star.className = 'game__star';

      const size    = Math.random() * 2.5 + 0.5;
      const top     = Math.random() * 100;
      const left    = Math.random() * 100;
      const delay   = Math.random() * 4;
      const opacity = Math.random() * 0.7 + 0.2;

      star.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        top: ${top}%;
        left: ${left}%;
        background: rgba(110, 231, 255, ${opacity});
        border-radius: 50%;
        animation: starTwinkle ${2 + Math.random() * 3}s ease-in-out ${delay}s infinite alternate;
      `;
      container.appendChild(star);
    }

    if (!document.getElementById('game-star-style')) {
      const style = document.createElement('style');
      style.id    = 'game-star-style';
      style.textContent = `
        @keyframes starTwinkle {
          from { opacity: 0.2; transform: scale(0.8); }
          to   { opacity: 1;   transform: scale(1.3); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* ─── CHECK GAME AVAILABILITY ────────────────────────────────── */
  // Hace un HEAD request a game/index.html.
  // Si el build Unity WebGL ya está en /game/, el botón se habilita.
  // Si no, el botón queda deshabilitado y el placeholder permanece visible.
  function _checkGameAvailability() {
    fetch(GAME_SRC, { method: 'HEAD' })
      .then(res => {
        gameAvailable = res.ok;
        _updateStatus(gameAvailable ? 'ready' : 'unavailable');
        if (DOM.loadBtn) {
          DOM.loadBtn.disabled = !gameAvailable;
          DOM.loadBtn.title    = gameAvailable
            ? 'Cargar el mini juego Wave Catcher'
            : 'El juego aún no está disponible';
        }
      })
      .catch(() => {
        gameAvailable = false;
        _updateStatus('unavailable');
        if (DOM.loadBtn) {
          DOM.loadBtn.disabled = true;
          DOM.loadBtn.title    = 'El juego aún no está disponible';
        }
      });
  }

  /* ─── UPDATE STATUS ──────────────────────────────────────────── */
  function _updateStatus(status) {
    const labels = {
      ready:       'Listo para cargar',
      loading:     'Cargando juego...',
      unavailable: 'En desarrollo',
    };

    if (DOM.statusText) DOM.statusText.textContent = labels[status] || status;
    if (DOM.statusDot) {
      DOM.statusDot.style.background = STATUS_COLORS[status] || '#fff';
      DOM.statusDot.style.boxShadow  = `0 0 8px ${STATUS_COLORS[status] || '#fff'}`;
    }
  }

  /* ─── BIND CONTROLS ──────────────────────────────────────────── */
  function _bindControls() {
    DOM.loadBtn?.addEventListener('click', _loadGame);
    DOM.fullscreenBtn?.addEventListener('click', _toggleFullscreen);

    // Escuchar mensajes postMessage desde el iframe de Unity WebGL.
    // El build Unity puede enviar { type: 'WAVE_CATCHER_READY' }
    // cuando el juego termine de inicializar (opcional, depende del build).
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'WAVE_CATCHER_READY') {
        _updateStatus('ready');
        window.AppModule?.toast('Wave Catcher listo para jugar.', 'success');
      }
    });
  }

  /* ─── LOAD GAME ──────────────────────────────────────────────── */
  // Asigna el src al iframe para iniciar la carga del build Unity WebGL.
  // Unity WebGL puede tardar varios segundos en inicializar;
  // el estado "loading" permanece hasta que el iframe dispara el evento load.
  function _loadGame() {
    if (!gameAvailable) {
      window.AppModule?.toast('El juego aún está en desarrollo. Vuelve pronto.', 'info');
      return;
    }

    if (gameLoaded) {
      _showIframe();
      return;
    }

    _updateStatus('loading');

    if (DOM.iframe) {
      DOM.iframe.src = GAME_SRC;

      DOM.iframe.addEventListener('load', () => {
        gameLoaded = true;
        _showIframe();
        _updateStatus('ready');
        window.AppModule?.toast('Wave Catcher cargado correctamente.', 'success');
      }, { once: true });

      DOM.iframe.addEventListener('error', () => {
        gameAvailable = false;
        gameLoaded    = false;
        _updateStatus('unavailable');
        window.AppModule?.toast('No se pudo cargar el juego. Intenta más tarde.', 'warning');
      }, { once: true });
    }
  }

  /* ─── SHOW IFRAME ────────────────────────────────────────────── */
  function _showIframe() {
    if (!DOM.iframe || !DOM.placeholder) return;

    DOM.placeholder.style.opacity    = '0';
    DOM.placeholder.style.transition = 'opacity 0.4s ease';

    setTimeout(() => {
      DOM.placeholder.hidden        = true;
      DOM.iframe.hidden             = false;
      DOM.iframe.style.opacity      = '0';
      DOM.iframe.style.transition   = 'opacity 0.4s ease';
      requestAnimationFrame(() => {
        DOM.iframe.style.opacity = '1';
      });
    }, 400);

    if (DOM.loadBtn) {
      DOM.loadBtn.textContent = 'Reiniciar Juego';
      DOM.loadBtn.removeEventListener('click', _loadGame);
      DOM.loadBtn.addEventListener('click', _reloadGame);
    }
  }

  /* ─── RELOAD GAME ────────────────────────────────────────────── */
  function _reloadGame() {
    if (!DOM.iframe) return;
    DOM.iframe.src = GAME_SRC;
    window.AppModule?.toast('Reiniciando Wave Catcher...', 'info');
  }

  /* ─── FULLSCREEN ─────────────────────────────────────────────── */
  function _toggleFullscreen() {
    const el   = DOM.frame;
    if (!el) return;

    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;

    if (!fsEl) {
      const request =
        el.requestFullscreen?.() ||
        el.webkitRequestFullscreen?.() ||
        el.mozRequestFullScreen?.();

      request?.then?.(() => {
        if (DOM.fullscreenBtn) DOM.fullscreenBtn.textContent = 'Salir de Pantalla Completa';
      }).catch(() => {
        window.AppModule?.toast('Tu navegador no permite pantalla completa aquí.', 'warning');
      });
    } else {
      const exit =
        document.exitFullscreen?.() ||
        document.webkitExitFullscreen?.();

      exit?.then?.(() => {
        if (DOM.fullscreenBtn) DOM.fullscreenBtn.textContent = 'Pantalla Completa';
      });
    }
  }

  /* ─── PUBLIC API ─────────────────────────────────────────────── */
  return { init };
})();