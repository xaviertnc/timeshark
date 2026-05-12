import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { TaskModal } from './task-modal.js';
import { PlannerState } from './planner/planner-state.js';
import { TaskList } from './task-list.js';
import { TaskQuickAdd } from './task-quick-add.js';
import { SearchableSelect } from './searchable-select.js';
import { syncSpanToProject } from '../utils/project-span-sync.js';
import { TimeEntryModal } from './time-entry-modal.js';
import { TaskFilterBar } from './task-filter-bar.js';
import { escapeHTML } from '../utils/dom.js';

/**
 * components/dashboard.js
 *
 * Dashboard - 08 Feb 2026
 * Fixed modals, pointer events and strict project selection logic.
 */

export async function renderDashboard(forceRefresh = false) {
  if (forceRefresh || !store.get().tasks || store.get().tasks.length === 0) {
    await PlannerState.init();
  }

  const state = store.get();
  const projects = state.projects || [];
  const activeTimer = state.activeTimer;
  const entries = state.timeEntries || [];
  const customers = state.customers || [];
  const modalPortal = document.getElementById('modal-portal');

  let isCompact = localStorage.getItem('planner_sidebar_compact') !== 'false'; // Default to true
  let isHistoryCompact = localStorage.getItem('dashboard_history_compact') === 'true'; // Default to false

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const z = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  };

  const container = document.createElement('div');
  container.className = 'max-w-6xl mx-auto pb-10 space-y-14';

  const shiftColor = (color, percent) => {
    if (!color || typeof color !== 'string' || !color.startsWith('#')) return color;
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
  };

  const activeProj = activeTimer ? projects.find(p => String(p.id) === String(activeTimer.project_id)) : null;
  const pColor = activeProj?.color || '#338a81';

  container.innerHTML = `
    <!-- Active Timer Widget -->
    <div class="relative overflow-hidden transition-all duration-300">
      <div class="relative z-10">
        ${activeTimer ? `
          <div class="flex flex-col md:flex-row items-center justify-between gap-8 pb-4">
            <div id="active-task-display" class="flex-1 cursor-pointer group/task relative py-3 rounded-xl hover:bg-primary/5 transition-all">
              <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3" style="background-color: ${pColor}1a; color: ${pColor}">
                <span class="w-1 h-1 rounded-full animate-pulse" style="background-color: ${pColor}"></span>
                Chomping
              </div>
              <h3 class="text-4xl font-bold text-main mb-1 tracking-tight transition-colors">${escapeHTML(activeTimer.description) || 'Focusing'}</h3>
              <p class="text-muted font-medium text-lg leading-relaxed">
                ${escapeHTML(activeProj?.name || activeTimer.project_name || 'Unassigned')}
              </p>
              ${activeTimer.notes ? `<p class="mt-1.5 text-xs text-dim italic">${escapeHTML(activeTimer.notes)}</p>` : ''}
              <div class="absolute top-3 right-3 opacity-0 group-hover/task:opacity-100 transition-opacity bg-card shadow-soft rounded-full p-1.5 text-primary border border-soft">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </div>
            </div>

            <div class="flex flex-col items-end gap-4">
              <div id="active-timer-counter" class="text-5xl font-black text-main tabular-nums tracking-tighter">00:00:00</div>
              <button id="dashboard-stop-btn" class="flex items-center justify-center min-w-[180px] h-12 bg-[#FF3B30] hover:bg-[#FF453A] text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all duration-150 active:scale-95 shadow-lg shadow-red-500/20">
                Stop Tracking
              </button>
            </div>
          </div>
        ` : `
          <h3 class="text-xs font-black text-dim uppercase tracking-[0.4em] mb-4">What are you working on?</h3>
          <div class="bg-card rounded-2xl border border-soft shadow-sm p-5">
            <form id="start-timer-form" class="space-y-3">
              <!-- Row 1: Spacious description + START -->
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <input type="text" name="description" placeholder="Task description..." class="w-full bg-app border-none rounded-lg px-5 py-2.5 font-bold text-main text-[15px] focus:ring-2 focus:ring-primary/20 placeholder:text-dim/15 placeholder:font-normal">
                </div>
                <button type="submit" class="h-[42px] px-10 bg-primary hover:bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-primary/20 whitespace-nowrap self-end">
                  Start
                </button>
              </div>
              <!-- Row 2: Compact context bar -->
              <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label class="block text-[8px] font-black text-dim uppercase tracking-widest ml-1 opacity-60">Project</label>
                  <div id="timer-project-select-container"></div>
                  <input type="hidden" name="project_id">
                </div>
                <div class="space-y-1">
                  <label class="block text-[8px] font-black text-dim uppercase tracking-widest ml-1 opacity-60">Link Todo</label>
                  <div id="timer-todo-select-container"></div>
                  <input type="hidden" name="task_id" id="link-todo-input">
                </div>
                <div class="space-y-1">
                  <label class="block text-[8px] font-black text-dim uppercase tracking-widest ml-1 opacity-60">Notes</label>
                  <input type="text" name="notes" placeholder="Optional..." class="w-full bg-app/60 border-none rounded-lg px-3 py-2 font-bold text-main text-[11px] focus:ring-1 focus:ring-primary/20 placeholder:text-dim/25">
                </div>
              </div>
            </form>
          </div>
        ` }
      </div>
    </div>

    <!-- Decorative Divider with Glow -->
    <div class="flex flex-col items-center justify-center relative">
      <div class="absolute w-64 h-24 bg-[${pColor}] opacity-[0.07] blur-[60px] rounded-full pointer-events-none"></div>
      <div class="relative z-10 flex flex-col items-center gap-2 group cursor-default">
        <div class="w-32 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>
        <div class="w-16 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-700 delay-75"></div>
        <div class="w-6 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-20 group-hover:opacity-40 transition-opacity duration-700 delay-150"></div>
      </div>
    </div>

    <!-- Todo Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h3 class="text-xs font-black text-dim uppercase tracking-[0.4em]">Todo</h3>
        <div id="task-filter-toggles" class="flex items-center gap-1 bg-app/30 p-1  rounded-lg border border-white/5">
        </div>
      </div>

      <!-- Quick Add Container -->
      <div id="dashboard-quick-add-container"></div>

      <!-- Task List Container -->
      <div id="dashboard-task-list">
        <!-- Tasks rendered here by TaskList.render() -->
      </div>

      <!-- Spans Timeline Chart -->
      <div id="dashboard-spans-chart">
        <!-- Mini Gantt rendered here when Spans tab active -->
      </div>
    </div>

    <!-- Decorative Divider between Todo and History -->
    <div class="flex flex-col items-center justify-center relative py-3">
      <div class="absolute w-64 h-24 bg-[${pColor}] opacity-[0.05] blur-[60px] rounded-full pointer-events-none"></div>
      <div class="relative z-10 flex flex-col items-center gap-2 group cursor-default">
        <div class="w-32 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-30"></div>
        <div class="w-16 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-20"></div>
        <div class="w-6 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-20"></div>
      </div>
    </div>

    <!-- History Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-black text-dim uppercase tracking-[0.4em]">Recent History</h3>
        <button id="history-compact-toggle" class="p-1 rounded-md transition-all ${isHistoryCompact ? 'bg-primary/20 text-primary' : 'text-dim/50 hover:text-dim hover:bg-white/5'}" title="Toggle Compact Mode">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>

      <div class="${isHistoryCompact ? 'space-y-0' : 'space-y-3'}">
        ${entries.filter(e => e.end_time).slice(0, 10).map(e => {
    const proj = projects.find(p => String(p.id) === String(e.project_id)) || { name: 'Unassigned', color: '#eceff1' };
    const org = proj.customer_id ? customers.find(c => c.id == proj.customer_id && c.is_client == 1) : null;
    const duration = (new Date(e.end_time) - new Date(e.start_time)) / 1000;
    const taskColor = shiftColor(proj.color, -10);

    if (isHistoryCompact) {
      return `
            <div class="task-item group/row px-2 py-0 rounded-lg hover:bg-white/5 transition-all cursor-pointer relative grid grid-cols-[4px_1fr_180px_120px_100px_min-content] gap-4 items-center border border-transparent hover:border-white/5" data-entry-id="${e.id}">
              <div class="w-1 h-4 rounded-full" style="background-color: ${taskColor}"></div>
              <div class="min-w-0">
                <span class="text-sm font-bold truncate text-main block group-hover/row:text-primary transition-colors">${escapeHTML(e.description) || 'No description'} ${e.notes ? `<span class="text-[10px] text-dim/40 font-normal italic">— ${escapeHTML(e.notes)}</span>` : ''}</span>
              </div>
              <div class="flex items-center gap-1.5 truncate">
                <span class="text-[11px] font-bold" style="color: ${proj.color}">${escapeHTML(proj.name)}</span>
                ${org ? `<span class="text-[10px] text-dim/30 font-medium"> @ ${escapeHTML(org.name)}</span>` : ''}
              </div>
              <div class="text-[10px] font-black text-dim/40 uppercase tracking-widest whitespace-nowrap">
                ${formatTime(e.start_time)} – ${formatTime(e.end_time)}
              </div>
              <div class="text-xs font-black text-main tabular-nums tracking-tighter text-right">
                ${formatDuration(duration)}
              </div>
              <div class="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity whitespace-nowrap">
                <button class="resume-btn h-6 px-1.5 flex items-center justify-center rounded-md text-dim/50 hover:text-primary hover:bg-primary/10 transition-all"
                        data-project-id="${e.project_id}"
                        data-description="${escapeHTML(e.description || '')}"
                        data-notes="${escapeHTML(e.notes || '')}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                </button>
                <button class="delete-history-btn h-6 px-1.5 flex items-center justify-center rounded-md text-dim/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        data-id="${e.id}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </div>
          `;
    }

    return `
            <div class="bg-card rounded-xl p-4 border border-soft shadow-sm group/row hover:border-primary/20 transition-all duration-300 flex items-center justify-between text-main cursor-pointer" data-entry-id="${e.id}">
              <div class="flex items-center gap-4 flex-1">
                <div class="w-1 h-10 rounded-full" style="background-color: ${taskColor}"></div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <h4 class="text-base font-bold tracking-tight">${escapeHTML(e.description) || 'No description'}</h4>
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-app text-dim uppercase tracking-widest">${escapeHTML(e.resource_id) || 'Main'}</span>
                  </div>
                  <p class="text-sm font-medium text-muted truncate">${escapeHTML(proj.name)} ${org ? `<span class="opacity-40 mx-1">•</span> ${escapeHTML(org.name)}` : ''}</p>
                  ${(() => {
        if (e.task_id) {
          const t = (state.tasks || []).find(task => String(task.id) === String(e.task_id));
          return `<div class="mt-1 flex items-center gap-1.5">
                      <span class="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 flex items-center gap-1 uppercase tracking-tighter">
                        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                        Linked Todo: ${t ? escapeHTML(t.title) : 'Deleted Todo'}
                      </span>
                    </div>`;
        }
        return '';
      })()}
                  ${e.notes ? `<p class="text-xs text-dim italic mt-1.5">${escapeHTML(e.notes)}</p>` : ''}
                </div>
              </div>

              <div class="flex items-center gap-6">
                <div class="text-right whitespace-nowrap">
                  <div class="text-xs font-black text-dim uppercase tracking-widest mb-0.5 opacity-40">${formatTime(e.start_time)} – ${formatTime(e.end_time)}</div>
                  <div class="text-lg font-bold tracking-tighter tabular-nums">${formatDuration(duration)}</div>
                </div>
                <div class="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button class="resume-btn w-8 h-8 flex items-center justify-center rounded-lg text-dim/50 hover:text-primary hover:bg-primary/10 transition-all"
                          data-project-id="${e.project_id}"
                          data-description="${escapeHTML(e.description || '')}"
                          data-notes="${escapeHTML(e.notes || '')}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </button>
                  <button class="delete-history-btn w-8 h-8 flex items-center justify-center rounded-lg text-dim/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          data-id="${e.id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          `;

  }).join('')}
        ${entries.length === 0 ? '<p class="text-center py-6 text-dim font-bold uppercase tracking-widest text-xs opacity-30">No history yet</p>' : ''}
      </div>
    </div>
  `;

  // Link Todo logic with SearchableSelect
  if (!activeTimer) {
    const projectContainer = container.querySelector('#timer-project-select-container');
    const todoContainer = container.querySelector('#timer-todo-select-container');
    const projectInput = container.querySelector('input[name="project_id"]');
    const todoInput = container.querySelector('#link-todo-input');
    const descInput = container.querySelector('input[name="description"]');

    const recentProjectIds = [...new Set(entries
      .filter(e => e.project_id)
      .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0))
      .map(e => String(e.project_id))
    )].slice(0, 5);

    const initialProjectId = recentProjectIds[0] || '';
    projectInput.value = initialProjectId;

    const renderTodoSelect = (pid) => {
      const tasks = (state.tasks || []).filter(t =>
        String(t.project_id) === String(pid) && t.status !== 'done'
      ).sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));

      SearchableSelect.render(todoContainer, tasks, {
        value: todoInput.value,
        placeholder: tasks.length > 0 ? 'Link a task...' : 'No active tasks',
        allLabel: 'Available Tasks',
        nameField: 'title',
        onChange: (tid) => {
          todoInput.value = tid;
          const task = tasks.find(t => String(t.id) === String(tid));
          if (task && !descInput.value.trim()) {
            descInput.value = task.title;
          }
        }
      });
    };

    SearchableSelect.render(projectContainer, projects, {
      value: initialProjectId,
      placeholder: 'Select Project...',
      recentIds: recentProjectIds,
      allLabel: 'All Projects',
      onChange: (pid) => {
        projectInput.value = pid;
        todoInput.value = '';
        renderTodoSelect(pid);
      }
    });

    renderTodoSelect(initialProjectId);
  }

  // --- ACTIONS ---

  const activeTaskDisplay = container.querySelector('#active-task-display');
  if (activeTaskDisplay && activeTimer) {
    activeTaskDisplay.onclick = () => {
      TimeEntryModal.open(activeTimer, { onSave: refreshView });
    };
  }

  const refreshView = async () => {
    // Explicitly fetch fresh data before re-rendering
    await PlannerState.init();
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(await renderDashboard());
  };

  // ─── TASK PANEL LOGIC ───

  const handleCompactChange = (e) => {
    isCompact = e.detail.isCompact;
    renderTaskToggles();
    renderDashboardTasks();
  };
  window.addEventListener('compact-mode-change', handleCompactChange);

  const taskFilters = JSON.parse(localStorage.getItem('dashboard_task_filters') || '{"today":true,"completed":false,"planned":false,"projects":false,"backlog":false}');
  const allTasks = state.tasks || [];

  const renderTaskToggles = () => {
    const toggleContainer = container.querySelector('#task-filter-toggles');
    if (!toggleContainer) return;

    const quickAddContainer = container.querySelector('#dashboard-quick-add-container');
    if (quickAddContainer) {
      TaskQuickAdd.render(quickAddContainer, projects, {
        onAdd: refreshView,
        placeholder: 'Add a task...'
      });
    }

    TaskFilterBar.render(toggleContainer, taskFilters, {
      onFilterChange: (key) => {
        taskFilters[key] = !taskFilters[key];
        localStorage.setItem('dashboard_task_filters', JSON.stringify(taskFilters));
        renderTaskToggles();
        renderDashboardTasks();
      },
      isCompact,
      onToggleCompact: (val) => {
        isCompact = val;
        localStorage.setItem('planner_sidebar_compact', String(val));
        window.dispatchEvent(new CustomEvent('compact-mode-change', { detail: { isCompact: val } }));
        renderTaskToggles();
        renderDashboardTasks();
      }
    });
  };

  const renderDashboardTasks = () => {
    const taskListEl = container.querySelector('#dashboard-task-list');
    if (!taskListEl) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomMid = new Date(today); tomMid.setDate(today.getDate() + 1);

    const intersectsToday = (t) => {
      if (!t.start_date) return false;
      const s = new Date(t.start_date); s.setHours(0, 0, 0, 0);
      const e = t.end_date ? new Date(t.end_date) : s; e.setHours(23, 59, 59, 999);
      return s < tomMid && e >= today;
    };

    const filtered = [];
    const seen = new Set();
    const add = (list) => list.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); filtered.push(t); } });

    if (taskFilters.today) {
      add(allTasks.filter(t => (t.status === 'todo' || t.status === 'in-progress') && t.task_type !== 'project_span' && intersectsToday(t)));
    }
    if (taskFilters.planned) {
      add(allTasks.filter(t => (t.status === 'todo' || t.status === 'in-progress') && t.task_type !== 'project_span' && t.start_date && !intersectsToday(t)));
    }
    if (taskFilters.backlog) {
      add(allTasks.filter(t => t.status === 'backlog' || (!t.start_date && t.status !== 'done' && t.task_type !== 'project_span')));
    }
    if (taskFilters.completed) {
      add(allTasks.filter(t => t.status === 'done'));
    }

    if (taskFilters.projects) {
      const spanTasks = allTasks.filter(t => t.task_type === 'project_span');
      renderSpansChart(spanTasks);
    } else {
      const spansChartEl = container.querySelector('#dashboard-spans-chart');
      if (spansChartEl) spansChartEl.innerHTML = '';
    }

    // Only render task list if there are filtered tasks or at least one relevant filter (excluding projects) is on
    const relevantFilterOn = taskFilters.today || taskFilters.planned || taskFilters.backlog || taskFilters.completed;

    if (relevantFilterOn || filtered.length > 0) {
      TaskList.render(taskListEl, filtered, projects, {
        mode: isCompact ? 'compact' : 'full',
        showDone: taskFilters.completed
      });
    } else {
      taskListEl.innerHTML = '';
    }
  };

  // ─── SPANS MINI GANTT CHART ───
  const renderSpansChart = (spans) => {
    const chartEl = container.querySelector('#dashboard-spans-chart');
    if (!chartEl) return;
    if (!spans || spans.length === 0) {
      chartEl.innerHTML = `<div class="text-center py-6 opacity-30">
        <p class="text-xs font-bold text-dim uppercase tracking-widest">No project spans found</p>
      </div>`;
      return;
    }

    // Parse dates and filter out spans without valid dates
    const parsed = spans.map(s => {
      const proj = projects.find(p => String(p.id) === String(s.project_id)) || { name: 'Unassigned', color: '#64748b' };
      const startDate = s.start_date ? new Date(s.start_date) : null;
      const endDate = s.end_date ? new Date(s.end_date) : null;
      return { ...s, proj, startDate, endDate };
    }).filter(s => s.startDate && s.endDate);

    if (parsed.length === 0) {
      chartEl.innerHTML = `<div class="text-center py-6 opacity-30">
        <p class="text-xs font-bold text-dim uppercase tracking-widest">No dated spans to display</p>
      </div>`;
      return;
    }

    // Sort: earliest start first, if tie then latest end last
    parsed.sort((a, b) => {
      const d = a.startDate - b.startDate;
      return d !== 0 ? d : b.endDate - a.endDate;
    });

    // Find min/max with some padding
    const allDates = parsed.flatMap(s => [s.startDate, s.endDate]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));

    // Add ~5% padding on each side
    const totalMs = maxDate - minDate || 1;
    const padMs = totalMs * 0.05;
    const scaleStart = new Date(minDate.getTime() - padMs);
    const scaleEnd = new Date(maxDate.getTime() + padMs);
    const scaleMs = scaleEnd - scaleStart;

    const toPercent = (date) => ((date.getTime() - scaleStart.getTime()) / scaleMs) * 100;

    // Today indicator
    const now = new Date();
    const todayPct = toPercent(now);
    const showToday = todayPct >= 0 && todayPct <= 100;

    // Generate month ticks
    const ticks = [];
    const tickStart = new Date(scaleStart.getFullYear(), scaleStart.getMonth(), 1);
    let cursor = new Date(tickStart);
    while (cursor <= scaleEnd) {
      const pct = toPercent(cursor);
      if (pct >= 0 && pct <= 100) {
        const label = cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        ticks.push({ pct, label });
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const rowHeight = 64;
    const chartPadTop = 24;
    const chartHeight = chartPadTop + parsed.length * rowHeight + 8;

    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const progress = (s) => {
      // Use synced project progress field
      const proj = projects.find(p => String(p.id) === String(s.project_id));
      return proj?.progress || 0;
    };

    chartEl.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Projects</span>
        <div class="h-px flex-grow bg-white/5"></div>
        <span class="text-[9px] font-black text-dim opacity-30">${parsed.length}</span>
      </div>
      <div class="bg-card rounded-xl border border-soft shadow-sm p-4 pb-3 overflow-hidden">
        <div class="relative" style="height: ${chartHeight}px;">
          <!-- Month tick labels -->
          ${ticks.map(t => `
            <div class="absolute top-0 text-[9px] font-black text-dim/25 uppercase tracking-wider" style="left: ${t.pct}%; transform: translateX(-50%);">
              ${t.label}
            </div>
          `).join('')}

          <!-- Tick grid lines -->
          ${ticks.map(t => `
            <div class="absolute bg-white/4" style="left: ${t.pct}%; top: ${chartPadTop}px; bottom: 0; width: 1px;"></div>
          `).join('')}

          <!-- Today indicator -->
          ${showToday ? `
            <div class="absolute z-20" style="left: ${todayPct}%; top: 0; bottom: 0;">
              <div class="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-red-500/90 text-[7px] font-black text-white uppercase tracking-wider whitespace-nowrap shadow-lg shadow-red-500/30">
                Today
              </div>
              <div class="absolute top-4 bottom-0 w-px bg-red-500/50 left-1/2 -translate-x-1/2">
                <div class="absolute inset-0 bg-red-500/30 animate-pulse"></div>
              </div>
            </div>
          ` : ''}

          <!-- Span rows -->
          ${parsed.map((s, i) => {
      const left = toPercent(s.startDate);
      const right = toPercent(s.endDate);
      const width = Math.max(right - left, 2);
      const top = chartPadTop + i * rowHeight;
      const prog = progress(s);
      const isPast = s.endDate < now;
      const isCurrent = s.startDate <= now && s.endDate >= now;
      const barHeight = 28;

      return `
            <!-- Label row -->
            <div class="absolute flex items-center gap-2 whitespace-nowrap cursor-pointer ${isPast ? 'opacity-40' : ''}" style="left: ${left}%; top: ${top}px; height: 20px;" data-span-project-id="${s.project_id}">
              <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${s.proj.color};"></span>
              <span class="text-xs font-bold text-main">${s.proj.name}</span>
              <span class="text-[10px] text-dim/40 font-bold">${formatDate(s.startDate)} – ${formatDate(s.endDate)}</span>
              <span class="text-xs font-black" style="color: ${s.proj.color};">${prog}%</span>
            </div>

            <!-- Bar -->
            <div class="absolute rounded-lg overflow-hidden cursor-pointer ${isPast ? 'opacity-40' : ''} ${isCurrent ? 'shadow-md' : ''}" style="left: ${left}%; width: ${width}%; top: ${top + 22}px; height: ${barHeight}px; background-color: ${s.proj.color}15; border: 1px solid ${s.proj.color}30;" data-span-project-id="${s.project_id}">
              <!-- Progress fill -->
              <div class="absolute inset-y-0 left-0 rounded-lg pointer-events-none" style="width: ${Math.max(prog, 1)}%; background-color: ${s.proj.color}; opacity: 0.5;"></div>
            </div>
          `;
    }).join('')}
        </div>
      </div>
    `;

    // Click handler: open span task in TaskModal for editing
    chartEl.addEventListener('click', (e) => {
      const el = e.target.closest('[data-span-project-id]');
      if (!el) return;
      const projectId = el.dataset.spanProjectId;
      const spanTask = allTasks.find(t => t.task_type === 'project_span' && String(t.project_id) === String(projectId));
      if (spanTask) {
        TaskModal.open(spanTask, {
          onSave: async () => {
            // Trigger sync after span task save
            const tasks = await api.get('planner.php');
            const updatedSpan = tasks.find(t => String(t.id) === String(spanTask.id));
            if (updatedSpan) {
              await syncSpanToProject(updatedSpan);
            }
            store.update({ tasks });
            renderDashboardTasks();
          }
        });
      }
    });
  };

  renderTaskToggles();
  renderDashboardTasks();

  // Toggle filter clicks (Redundant listener removed to prevent double-toggle bug)

  // No-op (dead code removed)

  // Task interaction handlers (delegated)
  const dashboardTaskList = container.querySelector('#dashboard-task-list');
  if (dashboardTaskList) {
    dashboardTaskList.addEventListener('click', async (e) => {
      // Toggle status
      const toggleBtn = e.target.closest('.toggle-status-btn');
      if (toggleBtn) {
        e.stopPropagation();
        const taskId = toggleBtn.dataset.taskId;
        const task = (store.get().tasks || []).find(t => String(t.id) === String(taskId));
        if (!task) return;
        const isDone = task.status === 'done';
        const update = isDone
          ? { id: taskId, status: 'todo', progress: 0, completed_at: null }
          : { id: taskId, status: 'done', progress: 100, completed_at: new Date().toISOString() };
        try {
          await api.post('planner.php', update);
          await PlannerState.init();
          refreshView();
        } catch (err) { console.error('Toggle failed:', err); }
        return;
      }

      // Progress bar click
      const progressBar = e.target.closest('.inline-progress-bar');
      if (progressBar) {
        e.stopPropagation();
        const taskId = progressBar.dataset.taskId;
        const current = parseInt(progressBar.dataset.progress) || 0;
        const steps = [0, 25, 50, 75, 100];
        const nextIdx = (steps.indexOf(current) + 1) % steps.length;
        const newProgress = steps[nextIdx] !== undefined ? steps[nextIdx] : steps[0];
        const newStatus = newProgress >= 100 ? 'done' : newProgress > 0 ? 'in-progress' : 'todo';
        const update = { id: taskId, progress: newProgress, status: newStatus };
        if (newStatus === 'done') update.completed_at = new Date().toISOString();
        if (newStatus !== 'done') update.completed_at = null;
        try {
          await api.post('planner.php', update);
          await PlannerState.init();
          refreshView();
        } catch (err) { console.error('Progress update failed:', err); }
        return;
      }

      // Track button
      const trackBtn = e.target.closest('.track-btn');
      if (trackBtn) {
        e.stopPropagation();
        const taskId = trackBtn.dataset.taskId;
        const task = (store.get().tasks || []).find(t => String(t.id) === String(taskId));
        if (!task) return;
        const proj = projects.find(p => String(p.id) === String(task.project_id));
        try {
          const result = await api.post('time-entries.php?action=start', {
            description: task.title,
            project_id: task.project_id,
            project_name: proj?.name || 'Unassigned',
            task_id: task.id,
            resource_id: state.team?.[0]?.name || 'Main'
          });
          store.update('activeTimer', result);
          store.update('timeEntries', await api.get('time-entries.php'));
          refreshView();
        } catch (err) { console.error('Track failed:', err); }
        return;
      }
      // Delete task button
      const deleteTaskBtn = e.target.closest('.delete-task-btn');
      if (deleteTaskBtn) {
        e.stopPropagation();
        const taskId = deleteTaskBtn.dataset.taskId;
        if (!confirm('Delete this task?')) return;
        try {
          await api.post('planner.php?action=delete', { id: taskId });
          await PlannerState.init();
          refreshView();
        } catch (err) { console.error('Delete task failed:', err); }
        return;
      }

      // Click task item → open TaskModal for editing
      const taskItem = e.target.closest('.task-item');
      if (taskItem) {
        const taskId = taskItem.dataset.taskId;
        const task = (store.get().tasks || []).find(t => String(t.id) === String(taskId));
        if (task) {
          TaskModal.open(task, {
            onSave: async () => {
              await PlannerState.init();
              refreshView();
            }
          });
        }
        return;
      }
    });
  }


  // Timer Ticker
  if (activeTimer) {
    const counterEl = container.querySelector('#active-timer-counter');
    const startTime = new Date(activeTimer.start_time).getTime();
    const updateCounter = () => {
      const now = new Date().getTime();
      const diff = now - startTime;
      const hString = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const mString = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const sString = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      if (counterEl) {
        counterEl.textContent = hString + ':' + mString + ':' + sString;
      }
    };
    const interval = setInterval(updateCounter, 1000);
    updateCounter();
    const observer = new MutationObserver(() => {
      if (!document.body.contains(container)) {
        clearInterval(interval);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Active Timer Actions
  const startForm = container.querySelector('#start-timer-form');
  if (startForm) {
    startForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(startForm).entries());
      const proj = projects.find(p => String(p.id) === String(data.project_id));
      if (!proj) return;

      data.project_name = proj.name;
      data.resource_id = state.team?.[0]?.name || 'Main';

      // Use explicitly linked todo if selected, otherwise try silent match
      if (!data.task_id && data.description.trim()) {
        const allTasks = state.tasks || [];
        const match = allTasks.find(t =>
          String(t.project_id) === String(data.project_id) &&
          t.title.toLowerCase().trim() === data.description.toLowerCase().trim()
        );
        if (match) data.task_id = match.id;
      }
      // Clean up empty task_id
      if (!data.task_id) data.task_id = null;

      try {
        const result = await api.post('time-entries.php?action=start', data);
        store.update('activeTimer', result);
        store.update('timeEntries', await api.get('time-entries.php'));
        refreshView();
      } catch (err) { alert('Failed to start'); }
    };
  }

  const stopBtn = container.querySelector('#dashboard-stop-btn');
  if (stopBtn) {
    stopBtn.onclick = async () => {
      try {
        await api.post('time-entries.php?action=stop', { id: activeTimer.id });
        store.update('activeTimer', null);
        store.update('timeEntries', await api.get('time-entries.php'));
        refreshView();
      } catch (err) { alert('Stop failed'); }
    };
  }

  // Resume Action
  container.querySelectorAll('.resume-btn').forEach(btn => {
    btn.onclick = async () => {
      const data = {
        project_id: btn.dataset.projectId,
        description: btn.dataset.description,
        notes: btn.dataset.notes,
        project_name: projects.find(p => String(p.id) === String(btn.dataset.projectId))?.name || 'Unassigned',
        resource_id: state.team?.[0]?.name || 'Main'
      };
      try {
        const result = await api.post('time-entries.php?action=start', data);
        store.update('activeTimer', result);
        store.update('timeEntries', await api.get('time-entries.php'));
        refreshView();
      } catch (err) { alert('Resume failed'); }
    };
  });

  // Main Click Handler for History Entries
  container.addEventListener('click', (e) => {
    // History Entry Row Click (Edit)
    const row = e.target.closest('[data-entry-id]');
    if (row && !e.target.closest('button')) {
      const entry = (state.timeEntries || []).find(en => String(en.id) === String(row.dataset.entryId));
      if (entry) TimeEntryModal.open(entry, { onSave: refreshView });
    }
  });

  // Delete History Entry
  container.querySelectorAll('.delete-history-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this entry?')) return;
      try {
        await api.delete(`time-entries.php?id=${btn.dataset.id}`);
        store.update('timeEntries', await api.get('time-entries.php'));
        refreshView();
      } catch (err) { alert('Delete failed'); }
    };
  });

  // History Compact Toggle
  const historyToggle = container.querySelector('#history-compact-toggle');
  if (historyToggle) {
    historyToggle.onclick = () => {
      isHistoryCompact = !isHistoryCompact;
      localStorage.setItem('dashboard_history_compact', String(isHistoryCompact));
      refreshView();
    };
  }

  return container;
}

