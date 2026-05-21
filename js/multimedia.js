/* ═══════════════════════════════════════════════════════════════
   multimedia.js — Módulo de Videos Relajantes
   Enfrentando el Estrés · UAO Multimedia
   ─────────────────────────────────────
   Responsabilidades:
   - Controles de reproducción para 3 tarjetas de video
   - Barra de progreso sincronizada con el video real
   - Play / Pause / Mute funcionales
   ═══════════════════════════════════════════════════════════════ */

const MultimediaModule = (() => {
  'use strict';

  /* ─── VIDEO CONFIGS ──────────────────────────────────────────── */
  const VIDEOS = [
    {
      playBtnId: 'video-play-btn',
      muteBtnId: 'video-mute-btn',
      barId:     'video-bar',
      videoId:   'relax-video',
      label:     'Respiración Profunda',
    },
    {
      playBtnId: 'video-play-btn-2',
      muteBtnId: 'video-mute-btn-2',
      barId:     'video-bar-2',
      videoId:   'relax-video-2',
      label:     'Respiración en Caja',
    },
    {
      playBtnId: 'video-play-btn-3',
      muteBtnId: 'video-mute-btn-3',
      barId:     'video-bar-3',
      videoId:   'relax-video-3',
      label:     'Relajación Guiada',
    },
  ];

  /* ─── SVG ICONS ──────────────────────────────────────────────── */
  const ICON_SOUND_ON = `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 6.5H1v5h2l4 3.5V3L3 6.5z" fill="currentColor"/>
      <path d="M12 9c0-1.66-1-3.08-2.5-3.73M15 9c0-3.31-2-6.16-5-7.5"
            stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`;

  const ICON_SOUND_OFF = `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 6.5H1v5h2l4 3.5V3L3 6.5z" fill="currentColor"/>
      <path d="M13 6l-4 4m0-4l4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`;

  /* ─── STATE ──────────────────────────────────────────────────── */
  const state = {};

  /* ─── INIT ───────────────────────────────────────────────────── */
  function init() {
    VIDEOS.forEach(cfg => _bindVideoCard(cfg));
  }

  /* ─── BIND VIDEO CARD ────────────────────────────────────────── */
  function _bindVideoCard(cfg) {
    const playBtn = document.getElementById(cfg.playBtnId);
    const muteBtn = document.getElementById(cfg.muteBtnId);
    const barFill = document.getElementById(cfg.barId);
    const videoEl = document.getElementById(cfg.videoId);

    if (!playBtn) return;

    state[cfg.playBtnId] = { playing: false, muted: false };

    // ── Play / Pause ──────────────────────────────────────────────
    playBtn.addEventListener('click', () => {
      const s = state[cfg.playBtnId];

      if (videoEl) {
        // Video real disponible: usar la API nativa
        if (s.playing) {
          videoEl.pause();
          s.playing = false;
        } else {
          // play() devuelve Promise; manejar rechazo silenciosamente
          videoEl.play().catch(() => {});
          s.playing = true;
        }
      } else {
        // Sin video: solo actualizar estado visual
        s.playing = !s.playing;
      }

      _updatePlayBtn(playBtn, s.playing);

      // Barra de progreso: animación CSS de placeholder si no hay video real
      if (barFill && !videoEl) {
        barFill.classList.toggle('playing', s.playing);
      }

      window.AppModule?.toast(
        s.playing ? `Reproduciendo: ${cfg.label}` : `Pausado: ${cfg.label}`,
        'info'
      );
    });

    // ── Mute / Unmute ─────────────────────────────────────────────
    muteBtn?.addEventListener('click', () => {
      const s = state[cfg.playBtnId];
      s.muted = !s.muted;
      if (videoEl) videoEl.muted = s.muted;

      const iconEl = muteBtn.querySelector('.media-btn__icon--sound');
      if (iconEl) iconEl.innerHTML = s.muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
      muteBtn.setAttribute('aria-label', s.muted ? 'Activar sonido' : 'Silenciar');
    });

    // ── Sincronización con el video real ──────────────────────────
    if (videoEl) {
      // Quitar la animación CSS de placeholder: la barra usará timeupdate
      if (barFill) {
        barFill.classList.remove('media-bar__fill--animated');
        barFill.style.width = '0%';
      }

      // Actualizar barra con la posición real del video
      videoEl.addEventListener('timeupdate', () => {
        if (barFill && videoEl.duration && !isNaN(videoEl.duration)) {
          const pct = (videoEl.currentTime / videoEl.duration) * 100;
          barFill.style.width = `${pct}%`;
        }
      });

      // Al terminar el video: resetear estado
      videoEl.addEventListener('ended', () => {
        const s = state[cfg.playBtnId];
        s.playing = false;
        _updatePlayBtn(playBtn, false);
        if (barFill) barFill.style.width = '0%';
      });

      // Si el video se pausa externamente (ej. otro tab o error)
      videoEl.addEventListener('pause', () => {
        const s = state[cfg.playBtnId];
        if (s.playing) {
          s.playing = false;
          _updatePlayBtn(playBtn, false);
        }
      });

      // Si el video arranca a reproducirse externamente
      videoEl.addEventListener('play', () => {
        const s = state[cfg.playBtnId];
        if (!s.playing) {
          s.playing = true;
          _updatePlayBtn(playBtn, true);
        }
      });

      // Si hay error de carga, degradar a barra animada de placeholder
      videoEl.addEventListener('error', () => {
        if (barFill) {
          barFill.classList.add('media-bar__fill--animated');
        }
        console.warn(`[MultimediaModule] No se pudo cargar el video: ${cfg.videoId}`);
      });
    }
  }

  /* ─── UPDATE PLAY BUTTON ─────────────────────────────────────── */
  function _updatePlayBtn(btn, playing) {
    const icon = btn.querySelector('.media-btn__icon');
    btn.classList.toggle('playing', playing);
    btn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    if (icon) icon.textContent = playing ? '⏸' : '▶';
  }

  /* ─── PUBLIC API ─────────────────────────────────────────────── */
  return { init };
})();