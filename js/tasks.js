/* ═══════════════════════════════════════════════════════════════
   tasks.js — Módulo de Gestión de Tareas
   Enfrentando el Estrés · UAO Multimedia
   ─────────────────────────────────────
   Responsabilidades:
   - CRUD completo de tareas
   - Persistencia con LocalStorage
   - Filtrado por estado, categoría, prioridad y fecha
   - Actualización de progreso y contadores
   ═══════════════════════════════════════════════════════════════ */

const TasksModule = (() => {
  'use strict';

  /* ─── CONSTANTS ─────────────────────────────────────────────── */
  const STORAGE_KEY  = 'enfrentando_estres_tasks_v3';
  const MAX_TASK_LEN = 120;

  /* ─── STATE ──────────────────────────────────────────────────── */
  let tasks = [];

  // Active filters
  let filterStatus   = 'all';      // all | pending | completed
  let filterCategory = 'all';      // all | academica | personal | proyecto | otro
  let filterPriority = 'all';      // all | low | medium | high
  let filterDate     = 'all';      // all | today | upcoming | overdue

  // Current priority being set for new tasks
  let currentPriority = 'medium';

  /* ─── DOM REFS ───────────────────────────────────────────────── */
  let DOM = {};

  /* ─── INIT ───────────────────────────────────────────────────── */
  function init() {
    _resolveDOM();
    _bindEvents();
    _loadFromStorage();
    _render();
  }

  /* ─── RESOLVE DOM ────────────────────────────────────────────── */
  function _resolveDOM() {
    DOM = {
      input:           document.getElementById('task-input'),
      categorySelect:  document.getElementById('task-category'),
      dueDateInput:    document.getElementById('task-due-date'),
      addBtn:          document.getElementById('add-task-btn'),
      tasksList:       document.getElementById('tasks-list'),
      emptyState:      document.getElementById('tasks-empty'),
      clearBtn:        document.getElementById('clear-completed-btn'),
      progressFill:    document.getElementById('progress-fill'),
      progressText:    document.getElementById('progress-text'),
      progressBar:     document.querySelector('.tasks__progress-bar'),
      countDisplay:    document.getElementById('task-count-display'),
      statPending:     document.getElementById('stat-pending'),
      statDone:        document.getElementById('stat-done'),

      // Status filter buttons
      filterBtns:      document.querySelectorAll('.filter-btn[data-filter]'),
      // Category filter buttons
      filterCatBtns:   document.querySelectorAll('.filter-cat-btn'),
      // Priority filter buttons
      filterPriBtns:   document.querySelectorAll('.filter-pri-btn'),
      // Date filter buttons
      filterDateBtns:  document.querySelectorAll('.filter-date-btn'),

      // Priority selector for new task
      priorityBtns:    document.querySelectorAll('.priority-btn'),
    };
  }

  /* ─── BIND EVENTS ────────────────────────────────────────────── */
  function _bindEvents() {
    // Add task
    DOM.addBtn.addEventListener('click', _handleAdd);
    DOM.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _handleAdd();
    });

    // Status filters (Todas / Pendientes / Completadas)
    DOM.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterStatus = btn.dataset.filter;
        _setActiveBtn(DOM.filterBtns, btn);
        _render();
      });
    });

    // Category filters
    DOM.filterCatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterCategory = btn.dataset.category;
        _setActiveBtn(DOM.filterCatBtns, btn);
        _render();
      });
    });

    // Priority filters
    DOM.filterPriBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterPriority = btn.dataset.priorityFilter;
        _setActiveBtn(DOM.filterPriBtns, btn);
        _render();
      });
    });

    // Date filters
    DOM.filterDateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterDate = btn.dataset.dateFilter;
        _setActiveBtn(DOM.filterDateBtns, btn);
        _render();
      });
    });

    // Priority selector for new task input
    DOM.priorityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        currentPriority = btn.dataset.priority;
        DOM.priorityBtns.forEach(b => {
          b.classList.toggle('selected', b === btn);
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
      });
    });

    // Set default priority selected state
    DOM.priorityBtns.forEach(btn => {
      if (btn.dataset.priority === currentPriority) {
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
      }
    });

    // Clear completed
    DOM.clearBtn.addEventListener('click', _clearCompleted);
  }

  /* ─── HANDLE ADD ─────────────────────────────────────────────── */
  function _handleAdd() {
    const text = DOM.input.value.trim();

    if (!text) {
      _shakeInput();
      window.AppModule?.toast('Escribe una tarea antes de agregar.', 'warning');
      return;
    }

    if (text.length > MAX_TASK_LEN) {
      window.AppModule?.toast(`Máximo ${MAX_TASK_LEN} caracteres.`, 'warning');
      return;
    }

    const newTask = {
      id:        _uid(),
      text,
      category:  DOM.categorySelect?.value || 'otro',
      priority:  currentPriority,
      dueDate:   DOM.dueDateInput?.value || null,  // ISO date string or null
      completed: false,
      createdAt: Date.now(),
    };

    tasks.unshift(newTask);
    _saveToStorage();
    _render();

    // Reset form
    DOM.input.value = '';
    if (DOM.dueDateInput) DOM.dueDateInput.value = '';
    DOM.input.focus();

    window.AppModule?.toast('Tarea agregada correctamente.', 'success');
  }

  /* ─── TOGGLE COMPLETE ────────────────────────────────────────── */
  function _toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    _saveToStorage();
    _render();

    window.AppModule?.toast(
      task.completed ? 'Tarea marcada como completada.' : 'Tarea marcada como pendiente.',
      'info'
    );
  }

  /* ─── DELETE TASK ────────────────────────────────────────────── */
  function _deleteTask(id) {
    const item = document.querySelector(`[data-task-id="${id}"]`);

    if (item) {
      item.classList.add('removing');
      item.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== id);
        _saveToStorage();
        _render();
      }, { once: true });
    } else {
      tasks = tasks.filter(t => t.id !== id);
      _saveToStorage();
      _render();
    }

    window.AppModule?.toast('Tarea eliminada.', 'info');
  }

  /* ─── CLEAR COMPLETED ────────────────────────────────────────── */
  function _clearCompleted() {
    const count = tasks.filter(t => t.completed).length;
    if (count === 0) {
      window.AppModule?.toast('No hay tareas completadas que limpiar.', 'info');
      return;
    }
    tasks = tasks.filter(t => !t.completed);
    _saveToStorage();
    _render();
    window.AppModule?.toast(`${count} tarea(s) completada(s) eliminada(s).`, 'success');
  }

  /* ─── RENDER ─────────────────────────────────────────────────── */
  function _render() {
    const filtered = _getFiltered();
    const isEmpty  = filtered.length === 0;

    DOM.emptyState.classList.toggle('visible', isEmpty);
    DOM.emptyState.setAttribute('aria-hidden', !isEmpty);

    DOM.countDisplay.textContent = `${filtered.length} tarea${filtered.length !== 1 ? 's' : ''}`;

    DOM.tasksList.innerHTML = '';
    filtered.forEach(task => {
      DOM.tasksList.appendChild(_buildTaskElement(task));
    });

    _updateStats();
  }

  /* ─── BUILD TASK ELEMENT ─────────────────────────────────────── */
  function _buildTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}`;
    li.dataset.taskId  = task.id;
    li.dataset.priority = task.priority;
    li.setAttribute('role', 'listitem');

    const categoryLabels = {
      academica: 'Académica',
      personal:  'Personal',
      proyecto:  'Proyecto',
      otro:      'Otro',
    };

    const createdStr = new Date(task.createdAt).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short'
    });

    // Build due date display
    let dueDateHTML = '';
    if (task.dueDate) {
      const dueDateObj  = new Date(task.dueDate + 'T00:00:00');
      const today       = _todayDate();
      const isOverdue   = !task.completed && dueDateObj < today;
      const isToday     = dueDateObj.toDateString() === today.toDateString();
      const dueDateStr  = dueDateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

      let dueDateClass = 'task-item__due';
      if (isOverdue) dueDateClass += ' task-item__due--overdue';
      else if (isToday) dueDateClass += ' task-item__due--today';

      dueDateHTML = `<span class="${dueDateClass}" title="Vence: ${dueDateStr}">Vence: ${dueDateStr}</span>`;
    }

    li.innerHTML = `
      <button
        class="task-item__checkbox"
        aria-label="${task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}"
        title="${task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}"
      >
        <span class="task-item__check-icon" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
      <div class="task-item__content">
        <p class="task-item__text">${_escapeHTML(task.text)}</p>
        <div class="task-item__meta">
          <span class="task-item__category">${categoryLabels[task.category] || task.category}</span>
          <span class="task-item__date">${createdStr}</span>
          ${dueDateHTML}
        </div>
      </div>
      <button class="task-item__delete" aria-label="Eliminar tarea" title="Eliminar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    li.querySelector('.task-item__checkbox').addEventListener('click', () => _toggleComplete(task.id));
    li.querySelector('.task-item__delete').addEventListener('click', () => _deleteTask(task.id));

    return li;
  }

  /* ─── UPDATE STATS ───────────────────────────────────────────── */
  function _updateStats() {
    const total     = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending   = total - completed;
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

    DOM.progressFill.style.width = `${pct}%`;
    DOM.progressText.textContent = `${completed} / ${total}`;
    DOM.progressBar?.setAttribute('aria-valuenow', pct);
    DOM.progressBar?.setAttribute('aria-valuetext', `${pct}% completado`);

    if (DOM.statPending) DOM.statPending.textContent = pending;
    if (DOM.statDone)    DOM.statDone.textContent    = completed;
  }

  /* ─── FILTER LOGIC ───────────────────────────────────────────── */
  function _getFiltered() {
    const today = _todayDate();

    return tasks.filter(task => {
      // Status filter
      if (filterStatus === 'pending'   && task.completed)  return false;
      if (filterStatus === 'completed' && !task.completed) return false;

      // Category filter
      if (filterCategory !== 'all' && task.category !== filterCategory) return false;

      // Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;

      // Date filter
      if (filterDate !== 'all') {
        if (!task.dueDate) return false; // Tasks without date hidden in date filters

        const dueObj = new Date(task.dueDate + 'T00:00:00');

        if (filterDate === 'today') {
          return dueObj.toDateString() === today.toDateString();
        }
        if (filterDate === 'upcoming') {
          return dueObj > today;
        }
        if (filterDate === 'overdue') {
          return dueObj < today && !task.completed;
        }
      }

      return true;
    });
  }

  /* ─── LOCAL STORAGE ──────────────────────────────────────────── */
  function _saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn('[TasksModule] LocalStorage write failed:', err);
    }
  }

  function _loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) tasks = parsed;
      }
    } catch (err) {
      console.warn('[TasksModule] LocalStorage read failed:', err);
      tasks = [];
    }
  }

  /* ─── HELPERS ────────────────────────────────────────────────── */

  /** Returns today as a Date object (midnight local time) */
  function _todayDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Sets the active class on the clicked filter button in a group */
  function _setActiveBtn(btnList, activeBtn) {
    btnList.forEach(b => {
      b.classList.toggle('filter-btn--active', b === activeBtn);
      b.setAttribute('aria-pressed', b === activeBtn ? 'true' : 'false');
    });
  }

  function _uid() {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function _escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function _shakeInput() {
    DOM.input.classList.add('shake');
    DOM.input.addEventListener('animationend', () => {
      DOM.input.classList.remove('shake');
    }, { once: true });
  }

  /* ─── PUBLIC API ─────────────────────────────────────────────── */
  return { init };
})();

/* ─── INJECT SHAKE KEYFRAME ─────────────────────────────────────── */
(function injectShakeStyle() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }
    .shake {
      animation: shake 0.4s ease !important;
      border-color: var(--c-priority-high) !important;
    }
  `;
  document.head.appendChild(style);
})();