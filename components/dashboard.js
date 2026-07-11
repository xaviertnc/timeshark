import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { TaskModal } from './task-modal.js';
import { PlannerState } from './planner/planner-state.js';
import { TaskList } from './task-list.js';
import { TaskQuickAdd } from './task-quick-add.js';
import { SearchableSelect } from './searchable-select.js';
import { TimeEntryModal } from './time-entry-modal.js';
import { TaskFilterBar } from './task-filter-bar.js';
import { ProjectModal } from './project-modal.js';
import { ConfirmModal } from './confirm-modal.js';
import { ExportModal } from './export-modal.js';
import { escapeHTML } from '../utils/dom.js';

/**
 * components/dashboard.js
 *
 * Dashboard - 08 Feb 2026
 * Fixed modals, pointer events and strict project selection logic.
 */

export async function renderDashboard(forceRefresh = false) {
  let isCompact = localStorage.getItem('planner_sidebar_compact') !== 'false'; // Default to true
  let isHistoryCompact = localStorage.getItem('dashboard_history_compact') === 'true'; // Default to false
  let isSearchRowVisible = localStorage.getItem('dashboard_search_visible') !== 'false';
  let isTodosCollapsed = localStorage.getItem('dashboard_todos_collapsed') === 'true';
  let isHistoryCollapsed = localStorage.getItem('dashboard_history_collapsed') === 'true';
  let isDashboardShowEpics = localStorage.getItem('dashboard_show_epics') !== 'false';
  let historySearchTerm = localStorage.getItem('dashboard_history_search') || '';
  let historyLimit = localStorage.getItem('dashboard_history_limit') || 'today';

  if (forceRefresh || !store.get().tasks || store.get().tasks.length === 0) {
    await PlannerState.init();
  }

  const state = store.get();
  const projects = state.projects || [];
  const activeTimer = state.activeTimer;
  const entries = state.timeEntries || [];
  const customers = state.customers || [];
  const modalPortal = document.getElementById('modal-portal');

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
  container.className = 'max-w-6xl mx-auto pb-10 space-y-8';
  const disposers = [];
  const registerDisposer = (dispose) => {
    if (typeof dispose === 'function') disposers.push(dispose);
  };
  container.__dispose = () => {
    disposers.splice(0).forEach(dispose => {
      try { dispose(); } catch (err) { console.warn('Dashboard cleanup failed', err); }
    });
    container.querySelectorAll('*').forEach(el => {
      if (typeof el.__ssDispose === 'function') el.__ssDispose();
      if (typeof el.__spansCleanup === 'function') el.__spansCleanup();
    });
  };

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

  let activeDisplayTags = [];
  if (activeTimer) {
     const activeTaskObj = activeTimer.task_id ? (state.tasks || []).find(t => String(t.id) === String(activeTimer.task_id)) : null;
     const projTags = activeProj?.tags || [];
     const taskTags = activeTaskObj?.tags || [];
     const entryTags = activeTimer.tags || [];
     activeDisplayTags = [...new Set([...projTags, ...taskTags, ...entryTags])];
  }

  container.innerHTML = `
    <!-- Active Timer Widget -->
    <div class="relative overflow-hidden transition-all duration-300">
      <div class="relative z-10">
        ${activeTimer ? `
          <div class="flex flex-col md:flex-row items-center justify-between gap-8 pb-4">
            <div id="active-task-display" class="flex-1 cursor-pointer group/task relative py-3 rounded-xl hover:bg-primary/5 transition-all">
              <div class="flex items-center gap-3 mb-3">
                <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style="background-color: ${pColor}1a; color: ${pColor}">
                  <span class="w-1 h-1 rounded-full animate-pulse" style="background-color: ${pColor}"></span>
                  Chomping
                </div>
              </div>
              <h3 class="text-4xl font-bold text-main mb-1 tracking-tight transition-colors">${escapeHTML(activeTimer.description) || 'Focusing'}</h3>
              <p class="text-muted font-medium text-lg leading-relaxed flex flex-wrap items-center gap-2">
                ${activeProj?.name && activeProj.name !== 'Unassigned' ? escapeHTML(activeProj.name) : (activeTimer.project_name && activeTimer.project_name !== 'Unassigned' ? escapeHTML(activeTimer.project_name) : '')}
                ${activeDisplayTags.length > 0 ? `
                    <span class="flex items-center gap-1.5 ml-2 overflow-hidden">
                        ${activeDisplayTags.map(t => `<span class="text-[9px] uppercase tracking-widest bg-white/5 text-dim/80 px-2 py-0.5 rounded-md leading-none border border-white/5 truncate" title="${escapeHTML(t)}">${escapeHTML(t)}</span>`).join('')}
                    </span>
                ` : ''}
              </p>
              ${activeTimer.notes ? `<p class="mt-1.5 text-xs text-dim italic">${escapeHTML(activeTimer.notes)}</p>` : ''}
              <div class="absolute top-3 right-3 opacity-0 group-hover/task:opacity-100 transition-opacity flex items-center gap-2">
                ${activeTimer.task_id ? (() => {
                   const t = (state.tasks || []).find(task => String(task.id) === String(activeTimer.task_id));
                   return `<div class="bg-primary/20 rounded-full p-2 text-primary cursor-help shadow-sm hover:scale-110 transition-transform" title="Linked to: ${t ? escapeHTML(t.title) : 'Unknown Todo'}">
                             <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                           </div>`;
                })() : `
                   <button type="button" class="turn-task-btn bg-white/5 hover:bg-emerald-500/10 rounded-full p-2 text-dim hover:text-emerald-500 hover:border-emerald-500/20 transition-all shadow-sm hover:scale-110" data-id="${activeTimer.id}" title="Make Task">
                     <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                   </button>
                `}
                <div class="bg-white/5 hover:bg-highlight hover:border-soft shadow-soft rounded-full p-2 text-dim hover:text-main border border-transparent transition-all hover:scale-110" title="Edit Time Entry">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-3">
              <div id="active-timer-counter" class="text-5xl font-black text-main tabular-nums tracking-tighter">00:00:00</div>
              <div class="flex gap-2">
                  <button id="dashboard-stop-btn" class="flex items-center justify-center min-w-[180px] h-12 bg-[#FF3B30] hover:bg-[#FF453A] text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all duration-150 active:scale-95 shadow-lg shadow-red-500/20">
                    Stop Tracking
                  </button>
              </div>
            </div>
          </div>
        ` : `
          <h3 class="text-xs font-black text-dim uppercase tracking-[0.4em] mb-4">What are you working on?</h3>
          <div class="bg-card zen-card border border-soft shadow-sm p-5">
            <form id="start-timer-form" class="space-y-3">
              <!-- Row 1: Spacious description + START -->
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <input type="text" name="description" placeholder="Task description..." class="w-full zen-input bg-highlight border border-soft text-main placeholder:text-dim/20 placeholder:font-normal transition-all">
                </div>
                <button type="submit" class="zen-btn px-10 bg-primary hover:bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-primary/20 whitespace-nowrap self-end">
                  Start
                </button>
              </div>
              <!-- Row 2: Compact context bar -->
              <div class="grid grid-cols-4 gap-3">
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
                  <label class="block text-[8px] font-black text-dim uppercase tracking-widest ml-1 opacity-60">Tags</label>
                  <div class="relative w-full overflow-hidden bg-highlight border border-subtle rounded-lg zen-focus-within transition-all flex items-center h-[42px] px-3 shadow-sm">
                      <span class="text-dim/50 font-black text-[10px] uppercase tracking-widest mr-2 select-none shrink-0 opacity-40">#</span>
                      <input type="text" name="tags" placeholder="Comma separated..." autocomplete="off" class="bg-transparent border-none outline-none text-main font-bold text-[11px] tracking-widest w-full h-full placeholder:text-dim/40 placeholder:font-bold transition-all" style="border:none !important; outline:none !important; box-shadow:none !important; padding:0; background:transparent !important;">
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="block text-[8px] font-black text-dim uppercase tracking-widest ml-1 opacity-60">Notes</label>
                  <div class="relative w-full overflow-hidden bg-highlight border border-subtle rounded-lg zen-focus-within transition-all flex items-center h-[42px] px-3 shadow-sm">
                      <input type="text" name="notes" placeholder="Optional..." autocomplete="off" class="bg-transparent border-none outline-none text-main font-bold text-[11px] tracking-widest w-full h-full placeholder:text-dim/40 placeholder:font-bold transition-all" style="border:none !important; outline:none !important; box-shadow:none !important; padding:0; background:transparent !important;">
                  </div>
                </div>
              </div>
            </form>
          </div>
        ` }
      </div>
    </div>

    <!-- Decorative Divider with Glow -->
    <div id="dashboard-todos-divider" class="flex flex-col items-center justify-center relative ${isTodosCollapsed ? 'hidden' : ''}">
      <div class="absolute w-64 h-24 bg-[${pColor}] opacity-[0.07] blur-[60px] rounded-full pointer-events-none"></div>
      <div class="relative z-10 flex flex-col items-center gap-2 group cursor-default">
        <div class="w-32 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>
        <div class="w-16 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-700 delay-75"></div>
        <div class="w-6 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-20 group-hover:opacity-40 transition-opacity duration-700 delay-150"></div>
      </div>
    </div>

    <!-- Todo Section -->
    <div>
      <div id="todos-collapse-toggle" class="flex items-center gap-2 mb-4 cursor-pointer group w-full" title="Toggle Todo Section">
        <h3 class="text-xs font-black text-dim group-hover:text-main transition-colors uppercase tracking-[0.4em]">Todo</h3>
        <div class="p-1 rounded-md transition-all ${isTodosCollapsed ? 'text-primary' : 'text-dim group-hover:text-main'}">
          <svg class="w-3 h-3 transition-transform ${isTodosCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"></path></svg>
        </div>
      </div>

      <div id="dashboard-todos-content" class="space-y-4 ${isTodosCollapsed ? 'hidden' : ''}">

      <!-- Quick Add Container -->
      <div id="dashboard-quick-add-container"></div>

      <!-- Row 1: Search, Filter & Utility Toggles -->
      <div id="dashboard-search-row" class="flex items-center gap-3 flex-wrap mb-4 ${isSearchRowVisible ? '' : 'hidden'}">
          <!-- Search Input -->
          <div class="relative flex-1 min-w-[280px]">
              <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input type="text" id="task-search-input" placeholder="Search tasks..." class="w-full h-9 px-3 bg-highlight border border-white/5 rounded-lg pl-9 text-[11px] font-bold text-main focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-dim/20">
          </div>
          
          <!-- Project Filter -->
          <div id="project-filter-wrapper" class="flex items-center gap-1 pl-1 pr-1 h-9 bg-highlight border border-white/5 rounded-lg transition-all focus-within:border-primary/20">
              <div id="task-project-filter-container" class="w-48 h-full"></div>
          </div>

          <button id="export-tasks-btn" class="h-9 px-3 rounded-lg transition-all text-dim hover:text-main hover:bg-white/10 bg-highlight border border-white/5 flex items-center justify-center shrink-0" title="Export Tasks">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          </button>
      </div>

      <!-- Row 2: Primary Group Filters -->
      <div class="mb-8">
          <div id="task-filter-toggles" class="inline-flex flex-wrap items-center gap-1 bg-highlight p-1 rounded-lg border border-white/5">
              <!-- Rendered by TaskFilterBar.render() -->
          </div>
      </div>

      <!-- Task List Container -->
      <div id="dashboard-task-list">
        <!-- Tasks rendered here by TaskList.render() -->
      </div>

      <!-- Spans Timeline Chart -->
      <div id="dashboard-spans-chart" class="mt-4">
        <!-- Mini Gantt rendered here when Spans tab active -->
      </div>

      </div>

      <!-- Bulk Action Toolbar -->
      <div id="bulk-action-toolbar" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] translate-y-32 transition-all duration-500 pointer-events-none">
        <div class="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-6 py-3 flex items-center gap-6 pointer-events-auto min-w-[500px]">
          <div class="flex items-center gap-4 pr-6 border-r border-white/10">
            <div class="flex flex-col">
                <span class="text-[10px] font-black text-white/90 uppercase tracking-widest" id="bulk-count-label">0 Selected</span>
                <div class="flex gap-2.5 mt-1">
                    <button class="text-[9px] font-black text-dim hover:text-white transition-colors uppercase tracking-widest" id="bulk-clear-btn">Clear</button>
                    <button class="text-[9px] font-black text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest" id="bulk-close-btn">Close</button>
                </div>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-grow">
             <div class="flex items-center gap-1.5 pr-1 pl-2 py-1 bg-white/5 rounded-lg border border-white/10 shrink-0" title="Set Start & End Times">
                 <input type="time" id="bulk-time-start" value="09:00" class="bg-transparent text-white font-bold text-[10px] outline-none" style="color-scheme: dark;">
                 <span class="text-white/30 text-[9px]">-</span>
                 <input type="time" id="bulk-time-end" value="17:00" class="bg-transparent text-white font-bold text-[10px] outline-none" style="color-scheme: dark;">
                 <button class="bg-primary/20 hover:bg-primary text-white rounded px-2 py-1 text-[9px] uppercase tracking-widest font-black transition-all ml-1" id="bulk-set-times-btn">Set</button>
             </div>
             <button class="zen-btn bg-emerald-600 text-white h-9 px-3 rounded-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0" id="bulk-move-today-btn">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span class="text-[10px] font-black uppercase tracking-widest hidden 2xl:inline">To Today</span>
                <span class="text-[10px] font-black uppercase tracking-widest 2xl:hidden">Today</span>
             </button>
             <button class="zen-btn bg-emerald-500 text-white h-9 px-3 rounded-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0" id="bulk-move-tomorrow-btn">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span class="text-[10px] font-black uppercase tracking-widest hidden 2xl:inline">To Tomorrow</span>
                <span class="text-[10px] font-black uppercase tracking-widest 2xl:hidden">Tmw</span>
             </button>
             <button class="zen-btn bg-primary text-white h-9 px-3 rounded-lg hover:shadow-[0_0_20px_rgba(51,138,129,0.3)] transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0" id="bulk-move-future-btn">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span class="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Move +1 Week</span>
                <span class="text-[10px] font-black uppercase tracking-widest xl:hidden">+1W</span>
             </button>
             <button class="zen-btn bg-white/5 text-white h-9 px-3 rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10 whitespace-nowrap shrink-0" id="bulk-move-backlog-btn">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                <span class="text-[10px] font-black uppercase tracking-widest hidden xl:inline">To Backlog</span>
                <span class="text-[10px] font-black uppercase tracking-widest xl:hidden">Bklg</span>
             </button>
             
             <div class="h-6 w-px bg-white/10 mx-1"></div>
             
             <div class="flex items-center gap-2 flex-1 min-w-[140px]" title="Assign Selected Tasks">
                <div id="bulk-assign-select-container" class="w-full text-[10px]"></div>
             </div>

             <button class="zen-btn bg-red-500/10 text-red-500 h-9 px-4 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 border border-red-500/20 whitespace-nowrap" id="bulk-delete-btn" title="Delete Selected">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                <span class="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Delete</span>
             </button>
          </div>
        </div>
      </div>

      </div> <!-- End Todo space-y-4 Container (dashboard-todos-content) -->
    </div> <!-- End Todo Section Wrapper -->

    <!-- Decorative Divider between Todo and History -->
    <div id="dashboard-history-divider" class="flex flex-col items-center justify-center relative py-3 ${isTodosCollapsed ? 'hidden' : ''}">
      <div class="absolute w-64 h-24 bg-[${pColor}] opacity-[0.05] blur-[60px] rounded-full pointer-events-none"></div>
      <div class="relative z-10 flex flex-col items-center gap-2 group cursor-default">
        <div class="w-32 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-30"></div>
        <div class="w-16 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-20"></div>
        <div class="w-6 h-[1px] bg-gradient-to-r from-transparent via-[${pColor}] to-transparent opacity-20"></div>
      </div>
    </div>

    <!-- History Section -->
    <div class="space-y-3">
      <div class="flex flex-col md:flex-row md:items-center gap-2 mb-4 w-full">
        <!-- Collapse Toggle -->
        <div id="history-collapse-toggle" class="flex items-center gap-2 cursor-pointer group flex-grow" title="Toggle History Section">
            <h3 class="text-xs font-black text-dim group-hover:text-main transition-colors uppercase tracking-[0.4em]">Recent History</h3>
            <div class="p-1 rounded-md transition-all ${isHistoryCollapsed ? 'text-primary' : 'text-dim group-hover:text-main'}">
              <svg class="w-3 h-3 transition-transform ${isHistoryCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"></path></svg>
            </div>
        </div>
        
        <!-- Controls -->
        <div id="history-controls-container" class="flex items-center gap-2 lg:gap-3 ml-auto ${isHistoryCollapsed ? 'hidden' : ''}">
            <div class="relative w-48">
                <input type="text" id="history-search-input" placeholder="Search..." value="${escapeHTML(historySearchTerm)}" class="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-2 py-1 text-[11px] font-bold text-main outline-none focus:border-primary/30 transition-all placeholder:text-dim/20">
                <svg class="w-2.5 h-2.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-dim/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <div class="relative flex-shrink-0">
                <select id="history-limit-select" class="bg-highlight border border-white/5 rounded-md pl-2.5 pr-7 h-[24px] py-0 text-[9px] uppercase tracking-[0.2em] font-black text-primary outline-none appearance-none cursor-pointer hover:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm">
                    <option value="today" ${historyLimit === 'today' ? 'selected' : ''}>Today Only</option>
                    <option value="5" ${historyLimit === '5' ? 'selected' : ''}>Show 5</option>
                    <option value="7" ${historyLimit === '7' ? 'selected' : ''}>Show 7</option>
                    <option value="10" ${historyLimit === '10' ? 'selected' : ''}>Show 10</option>
                    <option value="15" ${historyLimit === '15' ? 'selected' : ''}>Show 15</option>
                    <option value="30" ${historyLimit === '30' ? 'selected' : ''}>Show 30</option>
                    <option value="50" ${historyLimit === '50' ? 'selected' : ''}>Show 50</option>
                    <option value="100" ${historyLimit === '100' ? 'selected' : ''}>Show 100</option>
                    <option value="all" ${historyLimit === 'all' ? 'selected' : ''}>All History</option>
                </select>
                <svg class="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-primary pointer-events-none opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            <button id="history-compact-toggle" class="p-1 rounded-md transition-all ${isHistoryCompact ? 'bg-primary/20 text-primary' : 'text-dim hover:text-main hover:bg-highlight'}" title="Toggle Compact Mode">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <button id="export-history-btn" class="p-1 rounded-md transition-all text-dim hover:text-main hover:bg-highlight" title="Export Time Entries">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </button>
        </div>
      </div>

      <div id="dashboard-history-content" class="${isHistoryCollapsed ? 'hidden' : ''} ${isHistoryCompact ? 'space-y-0' : 'space-y-3'}">
        ${(() => {
            let filteredHistory = entries.filter(e => e.end_time);
            
            if (historyLimit === 'today') {
                const now = new Date();
                const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                filteredHistory = filteredHistory.filter(e => {
                    const d = new Date(e.start_time);
                    const eDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                    return eDay === todayMs;
                });
            }

            if (historySearchTerm) {
                const term = historySearchTerm.toLowerCase();
                filteredHistory = filteredHistory.filter(e => {
                    const desc = (e.description || '').toLowerCase();
                    const notes = (e.notes || '').toLowerCase();
                    const tTags = (e.tags || []).join(' ').toLowerCase();
                    const proj = projects.find(p => String(p.id) === String(e.project_id));
                    const projName = (proj ? proj.name : '').toLowerCase();
                    
                    const tsk = e.task_id ? (state.tasks || []).find(t => String(t.id) === String(e.task_id)) : null;
                    const taskName = (tsk ? tsk.title : '').toLowerCase();
                    const tagList = [...new Set([...(proj?.tags||[]), ...(tsk?.tags||[]), ...(e.tags||[])])].join(' ').toLowerCase();

                    return desc.includes(term) || notes.includes(term) || tTags.includes(term) || projName.includes(term) || taskName.includes(term) || tagList.includes(term);
                });
            }

            // Sort by start_time descending (newest first)
            filteredHistory.sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));

            if (historyLimit !== 'all' && historyLimit !== 'today') {
                const n = parseInt(historyLimit) || 10;
                filteredHistory = filteredHistory.slice(0, n);
            }

            const getDayStr = (dateStr) => {
                if (!dateStr) return 'Unknown';
                const d = new Date(dateStr);
                const today = new Date();
                const yest = new Date(today); yest.setDate(yest.getDate() - 1);
                if (d.toDateString() === today.toDateString()) return 'Today';
                if (d.toDateString() === yest.toDateString()) return 'Yesterday';
                return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
            };

            let currentDayStr = null;

            return filteredHistory.map(e => {
                const dayStr = getDayStr(e.start_time);
                let dayHeader = '';
                if (dayStr !== currentDayStr) {
                    currentDayStr = dayStr;
                    dayHeader = `<div class="pt-3 pb-1 mt-1 first:mt-0 first:pt-0 pointer-events-none select-none w-full"><span class="text-[9px] font-black text-dim uppercase tracking-[0.3em] bg-white/5 border border-white/5 rounded-md px-2 py-0.5">${escapeHTML(dayStr)}</span></div>`;
                }

    const proj = projects.find(p => String(p.id) === String(e.project_id)) || { name: 'Unassigned', color: '#eceff1' };
    const org = proj.customer_id ? customers.find(c => c.id == proj.customer_id && c.is_client == 1) : null;
    const duration = (new Date(e.end_time) - new Date(e.start_time)) / 1000;
    const taskColor = shiftColor(proj.color, -10);

    const taskObj = e.task_id ? (state.tasks || []).find(t => String(t.id) === String(e.task_id)) : null;
    const projTags = proj.tags || [];
    const taskTags = taskObj?.tags || [];
    const entryTags = e.tags || [];
    const displayTags = [...new Set([...projTags, ...taskTags, ...entryTags])];

    if (isHistoryCompact) {
      return dayHeader + `
            <div class="task-item group/row px-2 py-0 rounded-lg hover:bg-highlight transition-all cursor-pointer relative grid grid-cols-[4px_1fr_180px_120px_100px_min-content] gap-4 items-center border border-transparent hover:border-subtle" data-entry-id="${e.id}">
              <div class="w-1 h-4 rounded-full" style="background-color: ${taskColor}"></div>
              <div class="min-w-0">
                <span class="text-sm font-bold truncate text-main block group-hover/row:text-primary transition-colors" title="${escapeHTML(e.description) || 'No description'}">${escapeHTML(e.description) || 'No description'} ${e.notes ? `<span class="text-[10px] text-dim/40 font-normal italic">— ${escapeHTML(e.notes)}</span>` : ''}</span>
              </div>
              <div class="flex items-center gap-1.5 min-w-0">
                ${proj.name !== 'Unassigned' ? `<span class="text-[11px] font-bold truncate shrink-0 max-w-[120px]" style="color: ${proj.color}" title="${escapeHTML(proj.name)}">${escapeHTML(proj.name)}</span>` : ''}
                ${displayTags.length > 0 ? `
                    <div class="flex items-center gap-1 overflow-hidden shrink">
                        ${displayTags.map(t => `<span class="text-[8px] uppercase tracking-widest bg-white/5 text-dim/80 px-1 py-0.5 rounded leading-none border border-white/5 truncate" title="${escapeHTML(t)}">${escapeHTML(t)}</span>`).join('')}
                    </div>
                ` : (org ? `<span class="text-[10px] text-dim/30 font-medium truncate shrink" title="${escapeHTML(org.name)}"> @ ${escapeHTML(org.name)}</span>` : '')}
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
                        data-task-id="${e.task_id || ''}"
                        data-tags="${e.tags ? escapeHTML(e.tags.join(',')) : ''}"
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

    return dayHeader + `
            <div class="bg-card rounded-xl p-4 border border-soft shadow-sm group/row hover:border-primary/20 transition-all duration-300 flex items-center justify-between text-main cursor-pointer" data-entry-id="${e.id}">
              <div class="flex items-center gap-4 flex-1">
                <div class="w-1 h-10 rounded-full" style="background-color: ${taskColor}"></div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <h4 class="text-base font-bold tracking-tight">${escapeHTML(e.description) || 'No description'}</h4>
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-app text-dim uppercase tracking-widest">${escapeHTML(e.resource_id) || 'Main'}</span>
                  </div>
                  <div class="flex items-center gap-2 mb-0.5 min-w-0">
                    ${proj.name !== 'Unassigned' ? `<span class="text-sm font-medium text-muted truncate shrink-0 max-w-[50%]" title="${escapeHTML(proj.name)}">${escapeHTML(proj.name)}</span>` : ''}
                    ${org && proj.name !== 'Unassigned' ? `<span class="text-xs text-dim/40 truncate shrink-0" title="${escapeHTML(org.name)}">@ ${escapeHTML(org.name)}</span>` : ''}
                    ${displayTags.length > 0 ? `
                        <div class="flex items-center gap-1 overflow-hidden shrink ml-1">
                            ${displayTags.map(t => `<span class="text-[8px] uppercase tracking-widest bg-white/5 text-dim px-1.5 py-0.5 rounded border border-white/5 truncate" title="${escapeHTML(t)}">${escapeHTML(t)}</span>`).join('')}
                        </div>
                    ` : ''}
                  </div>
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
                          data-task-id="${e.task_id || ''}"
                          data-tags="${e.tags ? escapeHTML(e.tags.join(',')) : ''}"
                          data-description="${escapeHTML(e.description || '')}"
                          data-notes="${escapeHTML(e.notes || '')}" title="Resume">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </button>
                  ${!e.task_id ? `
                  <button class="turn-task-btn w-8 h-8 flex items-center justify-center rounded-lg text-dim/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all" data-id="${e.id}" title="Turn to Task">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                  </button>
                  ` : ''}
                  <button class="delete-history-btn w-8 h-8 flex items-center justify-center rounded-lg text-dim/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          data-id="${e.id}" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          `;

  }).join(''); })()}
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

    let initialProjectId = localStorage.getItem('timer_last_project_id');
    if (initialProjectId === null) {
        initialProjectId = recentProjectIds[0] || '';
    }
    projectInput.value = initialProjectId;
    
    let initialTodoId = localStorage.getItem('timer_last_todo_id') || '';
    todoInput.value = initialTodoId;

    const tagsInput = container.querySelector('input[name="tags"]');
    if (tagsInput) {
        tagsInput.addEventListener('input', () => renderTodoSelect(projectInput.value));
    }

    const renderProjectSelect = (pid) => {
      SearchableSelect.render(projectContainer, projects, {
        value: pid,
        placeholder: 'Select Project...',
        recentIds: recentProjectIds,
        allLabel: 'All Projects',
        clearable: true,
        onChange: (newPid) => {
          projectInput.value = newPid;
          todoInput.value = '';
          localStorage.setItem('timer_last_project_id', newPid || '');
          localStorage.setItem('timer_last_todo_id', '');
          renderTodoSelect(newPid);
        }
      });
    };

    const renderTodoSelect = (pid) => {
      const activeTags = tagsInput ? tagsInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
      
      const tasks = (state.tasks || []).filter(t => {
        if (pid && String(t.project_id) !== String(pid)) return false;
        
        if (activeTags.length > 0) {
            const taskTags = t.tags ? t.tags.map(x => x.toLowerCase()) : [];
            if (!activeTags.some(tag => taskTags.includes(tag))) return false;
        }
        
        return t.status !== 'done';
      }).sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));

      SearchableSelect.render(todoContainer, tasks, {
        value: todoInput.value,
        placeholder: tasks.length > 0 ? 'Link a task...' : 'No active tasks',
        allLabel: 'Available Tasks',
        nameField: 'title',
        clearable: true,
        onChange: (tid) => {
          todoInput.value = tid;
          localStorage.setItem('timer_last_todo_id', tid || '');
          const task = tasks.find(t => String(t.id) === String(tid));
          if (task && !descInput.value.trim()) {
            descInput.value = task.title;
          }
          
          if (task && task.project_id && String(task.project_id) !== String(projectInput.value)) {
              projectInput.value = task.project_id;
              localStorage.setItem('timer_last_project_id', task.project_id);
              renderProjectSelect(task.project_id);
          }
        }
      });
    };

    renderProjectSelect(initialProjectId);
    renderTodoSelect(initialProjectId);
  }

  // --- ACTIONS ---

  const activeTaskDisplay = container.querySelector('#active-task-display');
  if (activeTaskDisplay && activeTimer) {
    activeTaskDisplay.onclick = () => {
      TimeEntryModal.open(activeTimer, { onSave: refreshView });
    };
  }

  const todosCollapseToggle = container.querySelector('#todos-collapse-toggle');
  if (todosCollapseToggle) {
    todosCollapseToggle.onclick = () => {
      isTodosCollapsed = !isTodosCollapsed;
      localStorage.setItem('dashboard_todos_collapsed', String(isTodosCollapsed));
      const divider = container.querySelector('#dashboard-todos-divider');
      const content = container.querySelector('#dashboard-todos-content');
      const iconContainer = todosCollapseToggle.querySelector('div');
      const svgIcon = todosCollapseToggle.querySelector('svg');
      if (isTodosCollapsed) {
          divider?.classList.add('hidden');
          content?.classList.add('hidden');
          const historyDivider = container.querySelector('#dashboard-history-divider');
          if (historyDivider) historyDivider.classList.add('hidden');
          iconContainer.className = 'p-1 rounded-md transition-all text-primary';
          svgIcon.classList.add('rotate-180');
      } else {
          divider?.classList.remove('hidden');
          content?.classList.remove('hidden');
          const historyDivider = container.querySelector('#dashboard-history-divider');
          if (historyDivider) historyDivider.classList.remove('hidden');
          iconContainer.className = 'p-1 rounded-md transition-all text-dim group-hover:text-main';
          svgIcon.classList.remove('rotate-180');
      }
    };
  }

  const refreshView = async () => {
    // Explicitly fetch fresh data before re-rendering
    await PlannerState.init();
    const app = document.getElementById('app');
    if (typeof container.__dispose === 'function') container.__dispose();
    app.innerHTML = '';
    app.appendChild(await renderDashboard());
  };

  const exportBtn = container.querySelector('#export-history-btn');
  if (exportBtn) {
    exportBtn.onclick = () => ExportModal.open();
  }

  const exportTasksBtn = container.querySelector('#export-tasks-btn');
  if (exportTasksBtn) {
    exportTasksBtn.onclick = () => ExportModal.open({ type: 'tasks' });
  }

  // ─── TASK PANEL LOGIC ───

  const handleCompactChange = (e) => {
    isCompact = e.detail.isCompact;
    renderTaskToggles();
    renderDashboardTasks();
  };
  window.addEventListener('compact-mode-change', handleCompactChange);
  registerDisposer(() => window.removeEventListener('compact-mode-change', handleCompactChange));

  const taskFilters = JSON.parse(localStorage.getItem('dashboard_task_filters') || '{}');
  const filterDefaults = { today: true, overdue: true, planned: false, projects: false, timeline: true, backlog: false, completed: false };
  Object.keys(filterDefaults).forEach(k => { if (taskFilters[k] === undefined) taskFilters[k] = filterDefaults[k]; });

  let isProjectGrouped = localStorage.getItem('dashboard_project_grouped') === 'true';
  let searchTerm = localStorage.getItem('dashboard_search_term') || '';
  let projectFilter = [];
  try {
      const stored = localStorage.getItem('dashboard_project_filter');
      projectFilter = stored ? JSON.parse(stored) : [];
  } catch(e) {
      projectFilter = [];
  }
  let isSelectionMode = false;
  let lastCheckedTaskId = null;
  let selectedTaskIds = new Set();
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
      onToggleAll: () => {
        const keys = ['today', 'overdue', 'planned', 'projects', 'backlog', 'completed'];
        const allOn = keys.every(k => taskFilters[k]);
        keys.forEach(k => taskFilters[k] = !allOn);
        localStorage.setItem('dashboard_task_filters', JSON.stringify(taskFilters));
        renderTaskToggles();
        renderDashboardTasks();
      },
      showCompact: true,
      isCompact,
      onToggleCompact: (val) => {
        isCompact = val;
        localStorage.setItem('planner_sidebar_compact', String(val));
        window.dispatchEvent(new CustomEvent('compact-mode-change', { detail: { isCompact: val } }));
        renderTaskToggles();
        renderDashboardTasks();
      },
      showProjectGroupToggle: true,
      isProjectGrouped,
      onToggleProjectGroup: (val) => {
        isProjectGrouped = val;
        localStorage.setItem('dashboard_project_grouped', String(val));
        renderTaskToggles();
        renderDashboardTasks();
      },
      showSearchToggle: true,
      isSearchVisible: isSearchRowVisible,
      onToggleSearch: (val) => {
        isSearchRowVisible = val;
        localStorage.setItem('dashboard_search_visible', String(val));
        const searchRow = container.querySelector('#dashboard-search-row');
        if (searchRow) {
            if (val) searchRow.classList.remove('hidden');
            else searchRow.classList.add('hidden');
        }
        renderTaskToggles();
      },
      extraControls: `
          <button id="selection-mode-toggle" class="h-9 px-4 flex items-center gap-2 rounded-lg border transition-all whitespace-nowrap border-soft text-dim hover:text-main hover:bg-highlight">
              <span class="text-[11px] leading-none" id="selection-mode-icon">⊞</span>
              <span class="text-[10px] font-black uppercase tracking-widest leading-none" id="selection-mode-label">Bulk Select</span>
          </button>
      `
    });

    const selToggle = container.querySelector('#selection-mode-toggle');
    const selIcon = container.querySelector('#selection-mode-icon');
    const selLabel = container.querySelector('#selection-mode-label');
    
    if (selToggle) {
        if (isSelectionMode) {
            selToggle.className = 'h-9 px-4 flex items-center gap-2 rounded-lg border transition-all whitespace-nowrap bg-primary border-primary text-white shadow-lg shadow-primary/20';
            selIcon.textContent = '✓';
            selLabel.textContent = 'Selecting';
        } else {
            selToggle.className = 'h-9 px-4 flex items-center gap-2 rounded-lg border transition-all whitespace-nowrap border-white/5 text-dim hover:text-main hover:bg-highlight';
            selIcon.textContent = '⊞';
            selLabel.textContent = 'Bulk Select';
        }

        selToggle.onclick = () => {
            isSelectionMode = !isSelectionMode;
            if (!isSelectionMode) selectedTaskIds.clear();
            renderTaskToggles();
            renderDashboardTasks();
            renderBulkToolbar();
        };
    }

    // Search input logic
    const searchInput = container.querySelector('#task-search-input');
    if (searchInput) {
      searchInput.value = searchTerm;
      
      const updateSearchUI = () => {
          const wrapper = searchInput.parentElement;
          if (searchTerm) {
              searchInput.classList.remove('bg-highlight', 'border-white/5');
              searchInput.classList.add('bg-primary/10', 'border-primary/30');
              searchInput.style.paddingRight = '2rem';
              let clearBtn = wrapper.querySelector('.search-filter-clear');
              if (!clearBtn) {
                  clearBtn = document.createElement('button');
                  clearBtn.className = 'search-filter-clear absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded hover:bg-primary/20 text-primary transition-all';
                  clearBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>';
                  clearBtn.title = 'Clear Search';
                  clearBtn.onclick = (e) => {
                      e.stopPropagation();
                      searchTerm = '';
                      searchInput.value = '';
                      localStorage.setItem('dashboard_search_term', '');
                      updateSearchUI();
                      renderDashboardTasks();
                  };
                  wrapper.appendChild(clearBtn);
              }
          } else {
              searchInput.classList.add('bg-highlight', 'border-white/5');
              searchInput.classList.remove('bg-primary/10', 'border-primary/30');
              searchInput.style.paddingRight = '';
              const clearBtn = wrapper.querySelector('.search-filter-clear');
              if (clearBtn) clearBtn.remove();
          }
      };

      updateSearchUI();

      searchInput.oninput = (e) => {
        searchTerm = e.target.value.toLowerCase().trim();
        localStorage.setItem('dashboard_search_term', searchTerm);
        updateSearchUI();
        renderDashboardTasks();
      };
    }

    // Project filter logic
    const projectFilterContainer = container.querySelector('#task-project-filter-container');
      const updateWrapperState = () => {
        const wrapper = container.querySelector('#project-filter-wrapper');
        if (!wrapper) return;
        if (projectFilter && projectFilter.length > 0) {
            wrapper.className = 'flex items-center pl-1 pr-1 gap-1 h-9 rounded-lg transition-all focus-within:border-primary/20 bg-primary/10 border border-primary/30';
            let clearBtn = wrapper.querySelector('.project-filter-clear');
            if (!clearBtn) {
                clearBtn = document.createElement('button');
                clearBtn.className = 'project-filter-clear flex items-center justify-center w-6 h-6 rounded hover:bg-primary/20 text-primary transition-all';
                clearBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>';
                clearBtn.title = 'Clear Filter';
                clearBtn.onclick = (e) => {
                    e.stopPropagation();
                    projectFilter = [];
                    localStorage.setItem('dashboard_project_filter', JSON.stringify(projectFilter));
                    renderTaskToggles();
                    renderDashboardTasks();
                };
                wrapper.appendChild(clearBtn);
            }
        } else {
            wrapper.className = 'flex items-center gap-1 pl-1 pr-1 h-9 rounded-lg transition-all focus-within:border-primary/20 bg-highlight border border-white/5';
            const clearBtn = wrapper.querySelector('.project-filter-clear');
            if (clearBtn) clearBtn.remove();
        }
      };
      
      updateWrapperState(); // run once on init

    if (projectFilterContainer) {
      const recentIds = [...new Set((state.timeEntries || [])
          .filter(e => e.project_id)
          .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0))
          .map(e => String(e.project_id))
      )].slice(0, 5);

      SearchableSelect.render(projectFilterContainer, projects, {
        value: projectFilter,
        multiple: true,
        placeholder: 'All Projects',
        allLabel: 'Filter by Project',
        alignTarget: '#project-filter-wrapper',
        recentIds: recentIds,
        onChange: (val) => {
          projectFilter = val;
          localStorage.setItem('dashboard_project_filter', JSON.stringify(val));
          renderDashboardTasks();
          updateWrapperState();
        },
        variant: 'minimal',
        size: 'small'
      });
    }

    renderBulkToolbar();
  };

  const renderBulkToolbar = () => {
    const toolbar = container.querySelector('#bulk-action-toolbar');
    if (!toolbar) return;

    if (selectedTaskIds.size === 0) {
      toolbar.classList.add('translate-y-32', 'pointer-events-none');
      toolbar.classList.remove('translate-y-0');
      return;
    }

    toolbar.classList.remove('translate-y-32', 'pointer-events-none');
    toolbar.classList.add('translate-y-0');

    const countLabel = toolbar.querySelector('#bulk-count-label');
    if (countLabel) countLabel.textContent = `${selectedTaskIds.size} Selected`;

    const clearBtn = toolbar.querySelector('#bulk-clear-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        selectedTaskIds.clear();
        const checkboxes = container.querySelectorAll('.task-bulk-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        renderBulkToolbar();
      };
    }

    const closeBtn = toolbar.querySelector('#bulk-close-btn');
    if (closeBtn) {
       closeBtn.onclick = () => {
          isSelectionMode = false;
          selectedTaskIds.clear();
          renderTaskToggles();
          renderDashboardTasks();
          renderBulkToolbar();
       };
    }

    const getToolbarTimes = () => {
       const startStr = toolbar.querySelector('#bulk-time-start')?.value || '09:00';
       const endStr = toolbar.querySelector('#bulk-time-end')?.value || '17:00';
       return {
          startHr: parseInt(startStr.split(':')[0]) || 9,
          startMin: parseInt(startStr.split(':')[1]) || 0,
          endHr: parseInt(endStr.split(':')[0]) || 17,
          endMin: parseInt(endStr.split(':')[1]) || 0,
       };
    };

    const moveTodayBtn = toolbar.querySelector('#bulk-move-today-btn');
    if (moveTodayBtn) {
      moveTodayBtn.onclick = async () => {
        const confirmed = await ConfirmModal.show(`Move ${selectedTaskIds.size} tasks to Today?`, { confirmText: 'Move to Today' });
        if (!confirmed) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        
        try {
          for (const id of selectedTaskIds) {
            await api.post('planner.php', { 
              id, 
              status: 'todo', 
              start_date: todayStr,
              end_date: todayStr 
            });
          }
          selectedTaskIds.clear();
          refreshView();
        } catch (err) { alert('Failed to move tasks'); }
      };
    }

    const moveTomorrowBtn = toolbar.querySelector('#bulk-move-tomorrow-btn');
    if (moveTomorrowBtn) {
      moveTomorrowBtn.onclick = async () => {
        const confirmed = await ConfirmModal.show(`Move ${selectedTaskIds.size} tasks to Tomorrow?`, { confirmText: 'Move to Tomorrow' });
        if (!confirmed) return;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const tomorrowStr = tomorrow.toISOString();
        
        try {
          for (const id of selectedTaskIds) {
            await api.post('planner.php', { 
              id, 
              status: 'todo', 
              start_date: tomorrowStr,
              end_date: tomorrowStr 
            });
          }
          selectedTaskIds.clear();
          refreshView();
        } catch (err) { alert('Failed to move tasks'); }
      };
    }

    const moveFutureBtn = toolbar.querySelector('#bulk-move-future-btn');
    if (moveFutureBtn) {
      moveFutureBtn.onclick = async () => {
        const confirmed = await ConfirmModal.show(`Move ${selectedTaskIds.size} tasks into next week?`, { confirmText: 'Move +1 Week' });
        if (!confirmed) return;
        const tasksToMove = allTasks.filter(t => selectedTaskIds.has(String(t.id)));
        
        // Find the earliest start date among selected tasks to calculate the shift
        const startDates = tasksToMove.map(t => t.start_date ? new Date(t.start_date).getTime() : null).filter(d => d !== null);
        if (startDates.length === 0) return;

        const earliest = Math.min(...startDates);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dayMs = 24 * 60 * 60 * 1000;
        const target = today.getTime() + (7 * dayMs);
        
        const finalStartForEarliest = Math.max(target, earliest + (7 * dayMs));
        const shiftMs = finalStartForEarliest - earliest;

        try {
          for (const t of tasksToMove) {
            const updates = { id: t.id };
            
            if (t.start_date) {
               const newS = new Date(new Date(t.start_date).getTime() + shiftMs);
               updates.start_date = newS.toISOString();
            }
            if (t.end_date) {
               const newE = new Date(new Date(t.end_date).getTime() + shiftMs);
               updates.end_date = newE.toISOString();
            }
            updates.status = 'todo'; 
            await api.post('planner.php', updates);
          }
          selectedTaskIds.clear();
          refreshView();
        } catch (err) { alert('Failed to move tasks'); }
      };
    }

    const setTimesBtn = toolbar.querySelector('#bulk-set-times-btn');
    if (setTimesBtn) {
       setTimesBtn.onclick = async () => {
          const confirmed = await ConfirmModal.show(`Set customized times for ${selectedTaskIds.size} tasks?`, { confirmText: 'Set Times' });
          if (!confirmed) return;
          const { startHr, startMin, endHr, endMin } = getToolbarTimes();

          try {
             const tasksToUpdate = allTasks.filter(t => selectedTaskIds.has(String(t.id)));
             for (const t of tasksToUpdate) {
                const startD = t.start_date ? new Date(t.start_date) : new Date();
                const endD = t.end_date ? new Date(t.end_date) : new Date();
                
                startD.setHours(startHr, startMin, 0, 0);
                endD.setHours(endHr, endMin, 0, 0);

                await api.post('planner.php', {
                   id: t.id,
                   start_date: startD.toISOString(),
                   end_date: endD.toISOString()
                });
             }
             selectedTaskIds.clear();
             refreshView();
          } catch (err) { alert('Failed to set times'); }
       };
    }

    const moveBacklogBtn = toolbar.querySelector('#bulk-move-backlog-btn');
    if (moveBacklogBtn) {
      moveBacklogBtn.onclick = async () => {
        const confirmed = await ConfirmModal.show(`Move ${selectedTaskIds.size} tasks to Backlog?`, { confirmText: 'Move to Backlog' });
        if (!confirmed) return;
        try {
          for (const id of selectedTaskIds) {
            await api.post('planner.php', { id, status: 'backlog', start_date: null, end_date: null });
          }
          selectedTaskIds.clear();
          refreshView();
        } catch (err) { alert('Failed to move tasks'); }
      };
    }

    const deleteBtn = toolbar.querySelector('#bulk-delete-btn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        const confirmed = await ConfirmModal.show(`Are you sure you want to delete ${selectedTaskIds.size} tasks?`, { confirmText: 'Delete Tasks', isDestructive: true });
        if (!confirmed) return;
        try {
          for (const id of selectedTaskIds) {
            await api.delete(`planner.php?id=${id}`);
          }
          selectedTaskIds.clear();
          refreshView();
        } catch (err) { alert('Failed to delete tasks'); }
      };
    }

    const assignContainer = toolbar.querySelector('#bulk-assign-select-container');
    if (assignContainer) {
        const state = store.get();
        const resources = (state.team || []).map(m => ({ id: m.name, name: m.name }));
        if (!resources.some(r => r.id === 'General')) resources.push({ id: 'General', name: 'General' });
        resources.unshift({ id: 'me', name: 'Unassigned' });

        SearchableSelect.render(assignContainer, resources, {
            value: '',
            placeholder: 'Assign to...',
            allLabel: 'Team Members',
            alignTarget: '#bulk-action-toolbar',
            onChange: async (val) => {
                if (!val) return;
                const confirmed = await ConfirmModal.show(`Assign ${selectedTaskIds.size} tasks to ${val === 'me' ? 'Unassigned' : val}?`, { confirmText: 'Assign' });
                if (!confirmed) {
                    renderBulkToolbar(); // Reset select
                    return;
                }
                const assignedVal = val;
                try {
                  for (const id of selectedTaskIds) {
                    await api.post('planner.php', { id, resource_id: assignedVal });
                  }
                  selectedTaskIds.clear();
                  refreshView();
                } catch (err) { alert('Failed to assign tasks'); }
            }
        });
    }
  };

  const renderDashboardTasks = () => {
    const taskListEl = container.querySelector('#dashboard-task-list');
    if (!taskListEl) return;

    const activeFilters = { ...taskFilters };
    // If today is on, we show overdue unless explicitly hidden
    if (activeFilters.today && activeFilters.overdue === undefined) activeFilters.overdue = true;

    // 1. Handle Gantt Chart (Timeline) logic - tied to 'projects' filter
    if (taskFilters.projects) {
      const activeProjectsWithDates = projects.filter(p => p.started_at && p.completed_at);
      const filteredSpans = projectFilter.length > 0
        ? activeProjectsWithDates.filter(p => projectFilter.includes(String(p.id)))
        : activeProjectsWithDates;
      renderSpansChart(filteredSpans);
    } else {
      const spansChartEl = container.querySelector('#dashboard-spans-chart');
      if (spansChartEl) spansChartEl.innerHTML = '';
    }

    // 2. Handle Task List rendering logic (Sections inside TaskList.render)
    const anyListFilter = taskFilters.today || taskFilters.overdue || taskFilters.planned || taskFilters.backlog || taskFilters.completed;
    
    // If search is active but NO filter is on, we act on ALL tasks by temporarily enabling them for rendering
    let effectiveFilters = { ...taskFilters };
    if (searchTerm.length > 0 && !anyListFilter) {
        effectiveFilters = { ...effectiveFilters, today: true, overdue: true, planned: true, backlog: true, completed: true };
    }

    const shouldShowList = anyListFilter || searchTerm.length > 0;

    if (shouldShowList) {
      TaskList.render(taskListEl, allTasks, projects, {
        mode: isCompact ? 'compact' : 'full',
        showDone: effectiveFilters.completed,
        activeFilters: effectiveFilters,
        searchTerm,
        projectFilter,
        isProjectGrouped,
        selectionMode: isSelectionMode
      });

      // Restore checkbox states & Attach Selection Logic
      const checkboxes = taskListEl.querySelectorAll('.task-bulk-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = selectedTaskIds.has(String(cb.dataset.taskId));
        cb.onclick = (e) => {
          e.stopPropagation();
          const taskId = cb.dataset.taskId;
          
          if (e.shiftKey && lastCheckedTaskId) {
              const allCbs = [...taskListEl.querySelectorAll('.task-bulk-checkbox')];
              const startIdx = allCbs.findIndex(x => x.dataset.taskId === String(lastCheckedTaskId));
              const endIdx = allCbs.findIndex(x => x.dataset.taskId === String(taskId));
              
              if (startIdx !== -1 && endIdx !== -1) {
                  const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                  const isChecking = e.target.checked;
                  allCbs.slice(min, max + 1).forEach(el => {
                      el.checked = isChecking;
                      if (isChecking) selectedTaskIds.add(el.dataset.taskId);
                      else selectedTaskIds.delete(el.dataset.taskId);
                  });
              }
          } else {
              if (e.target.checked) selectedTaskIds.add(String(taskId));
              else selectedTaskIds.delete(String(taskId));
          }
          lastCheckedTaskId = taskId;
          renderBulkToolbar();
        };
      });
    } else {
      taskListEl.innerHTML = '';
    }
  };

  // ─── SPANS MINI GANTT CHART ───
  const renderSpansChart = (spans) => {
    const chartEl = container.querySelector('#dashboard-spans-chart');
    if (!chartEl) return;
    if (typeof chartEl.__spansCleanup === 'function') chartEl.__spansCleanup();

    if (!spans || spans.length === 0) {
      chartEl.innerHTML = ``;
      chartEl.classList.add('hidden');
      return;
    }
    chartEl.classList.remove('hidden');

    // Parse dates and filter out spans without valid dates or missing/archived projects
    const parsed = spans.map(p => {
      if (p.type === 'epic' && !isDashboardShowEpics) return null;
      const startDate = p.started_at ? new Date(p.started_at) : null;
      const endDate = p.completed_at ? new Date(p.completed_at) : null;
      return { project_id: p.id, proj: p, startDate, endDate };
    }).filter(s => s && s.startDate && s.endDate);

    if (parsed.length === 0) {
      chartEl.innerHTML = ``;
      chartEl.classList.add('hidden');
      return;
    }

    // Sort: earliest start first, if tie then latest end last
    parsed.sort((a, b) => {
      const d = a.startDate - b.startDate;
      return d !== 0 ? d : b.endDate - a.endDate;
    });

    // Find min/max with some padding (always include 'now')
    const now = new Date();
    const allDates = [...parsed.flatMap(s => [s.startDate, s.endDate]), now];
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
      <div class="flex items-center gap-3 mb-3 px-1">
          <div class="w-[6px] h-[6px] rounded-full shadow-[0_0_8px_rgba(51,138,129,0.2)]" style="background-color: #338a81;"></div>
          <span class="text-[10px] font-black uppercase tracking-[0.3em] text-primary">PROJECTS TIMELINE</span>
          <div class="flex-grow h-px bg-white/[0.04] ml-2"></div>
          <label class="flex items-center gap-2 cursor-pointer group mb-0">
             <span class="text-[9px] font-black uppercase tracking-widest text-dim group-hover:text-main transition-colors mt-0.5 whitespace-nowrap">Show Epics</span>
             <div class="relative w-8 h-5 bg-black/20 rounded-full border border-white/10 transition-colors">
                 <input type="checkbox" id="dashboard-show-epics-toggle" class="sr-only" ${isDashboardShowEpics ? 'checked' : ''}>
                 <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${isDashboardShowEpics ? 'translate-x-3 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'} pointer-events-none"></div>
             </div>
          </label>
      </div>
      <div class="bg-card/30 rounded-2xl border border-white/[0.04] p-6 overflow-hidden relative">
        <div class="relative" style="height: ${chartHeight}px;">
          <!-- Month tick labels -->
          ${ticks.map(t => `
            <div class="absolute top-0 text-[10px] font-black text-dim/20 uppercase tracking-widest" style="left: ${t.pct}%; transform: translateX(-50%);">
              ${t.label}
            </div>
          `).join('')}

          <!-- Tick grid lines -->
          ${ticks.map(t => `
            <div class="absolute bg-white/5" style="left: ${t.pct}%; top: ${chartPadTop}px; bottom: 0; width: 1px;"></div>
          `).join('')}

          <!-- Today indicator -->
          ${showToday ? `
            <div class="absolute z-20" style="left: ${todayPct}%; top: 0; bottom: 0;">
              <div class="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-red-600 text-[8px] font-black text-white uppercase tracking-wider whitespace-nowrap shadow-lg shadow-red-500/30">
                Today
              </div>
              <div class="absolute top-4 bottom-0 w-px border-l-2 border-dashed border-red-500/50 left-1/2 -translate-x-1/2"></div>
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
      
      const isEpic = s.proj.type === 'epic';
      const useSubtle = isEpic; // Always subtle when shown
      const barHeight = useSubtle ? 4 : 28;
      const barTop = useSubtle ? top + 34 : top + 22;

      return `
            <!-- Label row -->
            <div class="absolute flex items-center gap-2 whitespace-nowrap cursor-pointer ${isPast ? 'opacity-40' : ''} hover:bg-white/5 transition-colors px-2 py-1 -ml-2 rounded-lg" style="left: ${left}%; top: ${top}px; height: 26px; z-index: 10;" data-span-project-id="${s.project_id}">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: ${s.proj.color};"></span>
              ${isEpic ? `<span class="px-1.5 py-[1px] rounded-md bg-[${s.proj.color}]/10 border border-[${s.proj.color}]/20 text-[8px] font-black uppercase tracking-widest text-primary shrink-0 opacity-80 mt-px" style="color: ${s.proj.color};">EPIC</span>` : ''}
              <span class="text-xs font-bold text-main/80 hover:text-main">${s.proj.name}</span>
              <span class="text-[10px] text-dim/30 font-bold">${formatDate(s.startDate)} – ${formatDate(s.endDate)}</span>
              <span class="text-[11px] font-black" style="color: ${s.proj.color};">${prog}%</span>
            </div>

            <!-- Bar -->
            <div class="absolute rounded-xl overflow-hidden cursor-pointer ${isPast ? 'opacity-40' : ''} ${isCurrent && !useSubtle ? 'shadow-lg shadow-primary/5' : ''} hover:ring-2 hover:ring-white/10 transition-all" style="left: ${left}%; width: ${width}%; top: ${barTop}px; height: ${barHeight}px; background-color: ${useSubtle ? s.proj.color + '40' : s.proj.color + '10'}; border: 1px solid ${useSubtle ? 'transparent' : s.proj.color + '20'};" data-span-project-id="${s.project_id}">
              <!-- Progress fill -->
              <div class="absolute inset-y-0 left-0 ${useSubtle ? 'rounded-full' : 'rounded-xl'}" style="width: ${Math.max(prog, 1)}%; background-color: ${s.proj.color}; opacity: ${useSubtle ? '0.8' : '0.4'};"></div>
            </div>
          `;
    }).join('')}
        </div>
      </div>
    `;

    const handleSpansClick = (e) => {
      const spanEl = e.target.closest('[data-span-project-id]');
      if (spanEl) {
        const projectId = spanEl.dataset.spanProjectId;
        const project = projects.find(p => String(p.id) === String(projectId));
        if (project) {
          ProjectModal.open(project, { onSave: refreshView });
        }
      }
    };

    const handleSpansChange = (e) => {
      if (e.target.id === 'dashboard-show-epics-toggle') {
        localStorage.setItem('dashboard_show_epics', String(e.target.checked));
        isDashboardShowEpics = e.target.checked;
        refreshView();
      }
    };
    chartEl.addEventListener('click', handleSpansClick);
    chartEl.addEventListener('change', handleSpansChange);
    chartEl.__spansCleanup = () => {
      chartEl.removeEventListener('click', handleSpansClick);
      chartEl.removeEventListener('change', handleSpansChange);
      chartEl.__spansCleanup = null;
    };
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
        const now = new Date();
        const update = isDone
          ? { id: taskId, status: 'todo', progress: 0, completed_at: null }
          : { id: taskId, status: 'done', progress: 100, completed_at: now.toISOString() };
        // Backdate future dates when marking done
        if (!isDone && task.start_date) {
          const todayStr = now.toISOString().split('T')[0];
          const startTime = new Date(task.start_date).getTime();
          const endTime = task.end_date ? new Date(task.end_date).getTime() : startTime;
          const nowTime = now.getTime();
          if (startTime > nowTime && endTime > nowTime) {
            update.start_date = `${todayStr}T${now.toTimeString().substring(0, 5)}:00`;
            const endDt = new Date(nowTime + 3600000);
            update.end_date = `${todayStr}T${endDt.toTimeString().substring(0, 5)}:00`;
          } else if (endTime > nowTime) {
            update.end_date = `${todayStr}T${now.toTimeString().substring(0, 5)}:00`;
          }
        }
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
        if (newStatus === 'done') {
          const now = new Date();
          update.completed_at = now.toISOString();
          const task = allTasks.find(t => String(t.id) === String(taskId));
          if (task && task.start_date) {
            const todayStr = now.toISOString().split('T')[0];
            const startTime = new Date(task.start_date).getTime();
            const endTime = task.end_date ? new Date(task.end_date).getTime() : startTime;
            const nowTime = now.getTime();
            if (startTime > nowTime && endTime > nowTime) {
              update.start_date = `${todayStr}T${now.toTimeString().substring(0, 5)}:00`;
              const endDt = new Date(nowTime + 3600000);
              update.end_date = `${todayStr}T${endDt.toTimeString().substring(0, 5)}:00`;
            } else if (endTime > nowTime) {
              update.end_date = `${todayStr}T${now.toTimeString().substring(0, 5)}:00`;
            }
          }
        }
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
            resource_id: state.team?.[0]?.name || 'Main',
            tags: task.tags || []
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
        const confirmed = await ConfirmModal.show('Are you sure you want to delete this task?', { confirmText: 'Delete Task', isDestructive: true });
        if (!confirmed) return;
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
        if (isSelectionMode) return; // Prevent modal in selection mode

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
    registerDisposer(() => {
      clearInterval(interval);
      observer.disconnect();
    });
  }

  // Active Timer Actions
  const startForm = container.querySelector('#start-timer-form');
  if (startForm) {
    startForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(startForm).entries());
      const proj = projects.find(p => String(p.id) === String(data.project_id));

      data.project_name = proj ? proj.name : 'Unassigned';
      data.project_id = proj ? proj.id : '';
      data.resource_id = state.team?.[0]?.name || 'Main';

      // Use explicitly linked todo if selected, otherwise try silent match
      if (!data.task_id && data.description.trim()) {
        const allTasks = state.tasks || [];
        const match = allTasks.find(t =>
          String(t.project_id || '') === String(data.project_id || '') &&
          t.title.toLowerCase().trim() === data.description.toLowerCase().trim()
        );
        if (match) data.task_id = match.id;
      }
      // Clean up empty task_id
      if (!data.task_id) data.task_id = null;

      const manualTags = data.tags ? data.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
      let taskTags = [];
      if (data.task_id) {
          const matchedTask = (state.tasks || []).find(t => String(t.id) === String(data.task_id));
          if (matchedTask && matchedTask.tags) {
              taskTags = matchedTask.tags;
          }
      }
      data.tags = [...new Set([...manualTags, ...taskTags])];

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
        task_id: btn.dataset.taskId,
        tags: btn.dataset.tags ? btn.dataset.tags.split(',') : [],
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

  container.addEventListener('click', async (e) => {
    // Turn to Task Button
    const turnTaskBtn = e.target.closest('.turn-task-btn');
    if (turnTaskBtn) {
        e.stopPropagation();
        const entryId = turnTaskBtn.dataset.id;
        const entry = (activeTimer && String(activeTimer.id) === String(entryId)) ? activeTimer : (state.timeEntries || []).find(en => String(en.id) === String(entryId));
        if (entry) {
            // Create a task instantly
            const taskData = {
                title: entry.description || 'New Task',
                project_id: entry.project_id || null,
                resource_id: entry.resource_id || 'me',
                tags: entry.tags || [],
                notes: entry.notes || '',
                status: 'todo',
                priority: 'medium',
                progress: 0,
                start_date: null,
                end_date: null,
                completed_at: null
            };
            try {
                const newTask = await api.post('planner.php', taskData);
                const tasks = store.get().tasks || [];
                store.update('tasks', [...tasks, newTask]);
                
                // Update time entry
                const updatedEntry = { ...entry, task_id: newTask.id };
                updatedEntry.project_name = projects.find(p => p.id == updatedEntry.project_id)?.name || 'Unassigned';
                // Adjust times for server format
                updatedEntry.start_time = new Date(entry.start_time).toISOString();
                if (entry.end_time) updatedEntry.end_time = new Date(entry.end_time).toISOString();
                
                const result = await api.post('time-entries.php', updatedEntry);
                if (!entry.end_time) {
                    store.update('activeTimer', result);
                }
                store.update('timeEntries', await api.get('time-entries.php'));
                refreshView();
            } catch (err) {
                console.error('Turn to task failed', err);
                alert('Turn to task failed!');
            }
        }
        return;
    }

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
      const confirmed = await ConfirmModal.show('Are you sure you want to delete this entry?', { confirmText: 'Delete Entry', isDestructive: true });
      if (!confirmed) return;
      try {
        await api.delete(`time-entries.php?id=${btn.dataset.id}`);
        store.update('timeEntries', await api.get('time-entries.php'));
        refreshView();
      } catch (err) { alert('Delete failed'); }
    };
  });

  // History Controls
  const historyCollapseToggle = container.querySelector('#history-collapse-toggle');
  if (historyCollapseToggle) {
    historyCollapseToggle.onclick = () => {
      isHistoryCollapsed = !isHistoryCollapsed;
      localStorage.setItem('dashboard_history_collapsed', String(isHistoryCollapsed));
      const content = container.querySelector('#dashboard-history-content');
      const controls = container.querySelector('#history-controls-container');
      const iconContainer = historyCollapseToggle.querySelector('div');
      const svgIcon = historyCollapseToggle.querySelector('svg');
      
      if (isHistoryCollapsed) {
          content?.classList.add('hidden');
          controls?.classList.add('hidden');
          iconContainer.className = 'p-1 rounded-md transition-all text-primary';
          svgIcon.classList.add('rotate-180');
      } else {
          content?.classList.remove('hidden');
          controls?.classList.remove('hidden');
          iconContainer.className = 'p-1 rounded-md transition-all text-dim group-hover:text-main';
          svgIcon.classList.remove('rotate-180');
      }
    };
  }

  const historySearchInput = container.querySelector('#history-search-input');
  if (historySearchInput) {
    historySearchInput.oninput = (e) => {
      localStorage.setItem('dashboard_history_search', e.target.value);
      if (historySearchInput._timeout) clearTimeout(historySearchInput._timeout);
      historySearchInput._timeout = setTimeout(() => {
          refreshView();
      }, 300);
    };

    setTimeout(() => {
      if (document.activeElement?.id === 'history-search-input') return;
      if (window._focusHistorySearch) {
        const input = container.querySelector('#history-search-input');
        if (input) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange(len, len);
        }
      }
    }, 10);
    historySearchInput.addEventListener('focus', () => window._focusHistorySearch = true);
    historySearchInput.addEventListener('blur', () => window._focusHistorySearch = false);
  }

  const historyLimitSelect = container.querySelector('#history-limit-select');
  if (historyLimitSelect) {
    historyLimitSelect.onchange = (e) => {
      localStorage.setItem('dashboard_history_limit', e.target.value);
      refreshView();
    };
  }

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

