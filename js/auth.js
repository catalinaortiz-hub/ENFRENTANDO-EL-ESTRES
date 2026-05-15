/* ═══════════════════════════════════════════════════════════════
   auth.js — Onboarding + Login/Register
   Enfrentando el Estrés · UAO Multimedia
   ═══════════════════════════════════════════════════════════════ */

const AuthModule = (() => {
  'use strict';

  const STORAGE_USERS   = 'ee_users';
  const STORAGE_SESSION = 'ee_session';

  let currentSlide = 0;
  const TOTAL_SLIDES = 3;

  /* ─── DEFAULT ACCOUNT ──────────────────────────────────────── */
  function _ensureDefaultUser() {
    const users = _getUsers();
    const existing = users.find(u => u.id === 'usr_default');

    if (!existing) {
      // Primera vez: insertar
      users.unshift({ id: 'usr_default', name: 'Estudiante UAO', email: 'demo@uao.edu.co', password: 'estres123' });
    } else {
      // Forzar contraseña en texto plano (por si quedó hasheada antes)
      existing.password = 'estres123';
    }
    _saveUsers(users);
  }

  /* ─── INIT ─────────────────────────────────────────────────── */
  function init() {
    _ensureDefaultUser();

    // Enlazar eventos siempre
    _bindOnboardingEvents();
    _bindAuthEvents();
    _bindLogoutEvent();

    // Onboarding SIEMPRE al cargar la página
    _showOnboarding();
  }

  /* ─── ONBOARDING ────────────────────────────────────────────── */
  function _showOnboarding() {
    document.getElementById('onboarding-overlay').classList.add('visible');
    _goToSlide(0);
  }

  function _goToSlide(index) {
    currentSlide = index;
    document.querySelectorAll('.ob-slide').forEach((s, i) => {
      s.classList.toggle('ob-slide--active', i === index);
    });
    document.querySelectorAll('.ob-dot').forEach((d, i) => {
      d.classList.toggle('ob-dot--active', i === index);
    });
  }

  function _bindOnboardingEvents() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('[data-ob-next]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (currentSlide < TOTAL_SLIDES - 1) {
          _goToSlide(currentSlide + 1);
        } else {
          _finishOnboarding();
        }
      });
    });

    overlay.querySelectorAll('.ob-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => _goToSlide(i));
    });

    overlay.querySelector('[data-ob-skip]')?.addEventListener('click', _finishOnboarding);
  }

  function _finishOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    overlay.classList.add('ob-fade-out');
    setTimeout(() => {
      overlay.classList.remove('visible', 'ob-fade-out');
      const session = _getSession();
      if (session) {
        _showApp(session.name); // Ya está logueado → entrar directo
      } else {
        _showLogin();           // Sin sesión → pedir login
      }
    }, 420);
  }

  /* ─── LOGIN / REGISTER ──────────────────────────────────────── */
  function _showLogin() {
    document.getElementById('auth-overlay').classList.add('visible');
  }

  function _bindAuthEvents() {
    const overlay = document.getElementById('auth-overlay');
    if (!overlay) return;

    const loginForm    = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Toggle entre formularios
    document.getElementById('to-register-btn')?.addEventListener('click', () => {
      loginForm.classList.add('auth-form--hidden');
      registerForm.classList.remove('auth-form--hidden');
      _clearErrors();
    });

    document.getElementById('to-login-btn')?.addEventListener('click', () => {
      registerForm.classList.add('auth-form--hidden');
      loginForm.classList.remove('auth-form--hidden');
      _clearErrors();
    });

    // Rellenar credenciales demo con un clic
    document.getElementById('fill-demo-btn')?.addEventListener('click', () => {
      document.getElementById('login-email').value    = 'demo@uao.edu.co';
      document.getElementById('login-password').value = 'estres123';
      _clearErrors();
    });

    // Login
    document.getElementById('login-submit-btn')?.addEventListener('click', _handleLogin);
    document.getElementById('login-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _handleLogin();
    });

    // Register
    document.getElementById('register-submit-btn')?.addEventListener('click', _handleRegister);
    document.getElementById('register-password2')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _handleRegister();
    });
  }

  function _handleLogin() {
    const email    = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
      _showError('login-error', 'Por favor completa todos los campos.');
      return;
    }

    const users = _getUsers();
    // Comparación directa en texto plano
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      _showError('login-error', 'Correo o contraseña incorrectos.');
      _shakeForm('login-form');
      return;
    }

    _saveSession(user);
    _hideOverlay('auth-overlay', () => _showApp(user.name));
  }

  function _handleRegister() {
    const name      = document.getElementById('register-name')?.value.trim();
    const email     = document.getElementById('register-email')?.value.trim();
    const password  = document.getElementById('register-password')?.value;
    const password2 = document.getElementById('register-password2')?.value;

    if (!name || !email || !password || !password2) {
      _showError('register-error', 'Por favor completa todos los campos.');
      return;
    }

    if (!_isValidEmail(email)) {
      _showError('register-error', 'Ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      _showError('register-error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== password2) {
      _showError('register-error', 'Las contraseñas no coinciden.');
      return;
    }

    const users = _getUsers();
    if (users.find(u => u.email === email)) {
      _showError('register-error', 'Este correo ya está registrado.');
      return;
    }

    const newUser = {
      id:       `usr_${Date.now()}`,
      name,
      email,
      password, // texto plano
    };

    users.push(newUser);
    _saveUsers(users);
    _saveSession(newUser);
    _hideOverlay('auth-overlay', () => _showApp(newUser.name));
  }

  /* ─── HIDE OVERLAY (timeout-based, no animationend) ────────── */
  function _hideOverlay(overlayId, callback) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) { if (callback) callback(); return; }
    overlay.classList.add('ob-fade-out');
    setTimeout(() => {
      overlay.classList.remove('visible', 'ob-fade-out');
      if (callback) callback();
    }, 420);
  }

  /* ─── APP SHOW ──────────────────────────────────────────────── */
  function _showApp(userName) {
    document.getElementById('main-app').classList.add('app--visible');

    // Desktop: nombre en navbar
    const userNameEl = document.getElementById('nav-user-name');
    if (userNameEl) userNameEl.textContent = userName;
    document.getElementById('nav-user-menu')?.classList.remove('hidden');

    // Móvil: nombre en menú hamburguesa
    const mobileNameEl = document.getElementById('mobile-user-name');
    if (mobileNameEl) mobileNameEl.textContent = userName;
    document.getElementById('mobile-user-menu')?.classList.remove('hidden');

    // Inicializar sub-módulos después del login
    if (typeof TasksModule       !== 'undefined') TasksModule.init();
    if (typeof MultimediaModule  !== 'undefined') MultimediaModule.init();
    if (typeof GameLoaderModule  !== 'undefined') GameLoaderModule.init();
  }

  /* ─── LOGOUT ────────────────────────────────────────────────── */
  function _doLogout() {
    localStorage.removeItem(STORAGE_SESSION);
    document.getElementById('main-app').classList.remove('app--visible');
    document.getElementById('nav-user-menu')?.classList.add('hidden');
    document.getElementById('mobile-user-menu')?.classList.add('hidden');
    _clearErrors();
    document.getElementById('login-email').value    = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-form').classList.remove('auth-form--hidden');
    document.getElementById('register-form').classList.add('auth-form--hidden');
    _showLogin();
  }

  function _bindLogoutEvent() {
    document.getElementById('logout-btn')?.addEventListener('click', _doLogout);
    document.getElementById('logout-btn-mobile')?.addEventListener('click', _doLogout);
  }

  /* ─── HELPERS ───────────────────────────────────────────────── */
  function _showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) { el.textContent = message; el.classList.add('visible'); }
  }

  function _clearErrors() {
    document.querySelectorAll('.auth-error').forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
  }

  function _shakeForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.classList.add('shake');
    form.addEventListener('animationend', () => form.classList.remove('shake'), { once: true });
  }

  function _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function _getUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_USERS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function _saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }

  function _getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function _saveSession(user) {
    localStorage.setItem(STORAGE_SESSION, JSON.stringify({
      id: user.id, name: user.name, email: user.email
    }));
  }

  /* ─── PUBLIC API ────────────────────────────────────────────── */
  return { init };
})();

window.AuthModule = AuthModule;
document.addEventListener('DOMContentLoaded', AuthModule.init);
