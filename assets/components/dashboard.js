import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { PlannerModal } from './planner/planner-modal.js';
import { PlannerState } from './planner/planner-state.js';

/**
 * assets/components/dashboard.js
 *
 * Dashboard - 08 Feb 2026
 * Fixed modals, pointer events and strict project selection logic.
 */

export async function renderDashboard() {
  // Modal & State Initialization for Unified Planner interaction
  PlannerModal.render('modal-portal');
  if (!store.get().tasks) await PlannerState.init();

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
  container.className = 'max-w-5xl mx-auto pb-10 space-y-8';

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
          <div class="flex flex-col md:flex-row items-center justify-between gap-8 bg-card/40 backdrop-blur-sm rounded-2xl pb-4 shadow-sm">
            <div id="active-task-display" class="flex-1 cursor-pointer group/task relative py-3 px-5 rounded-xl hover:bg-primary/5 transition-all">
              <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3" style="background-color: ${pColor}1a; color: ${pColor}">
                <span class="w-1 h-1 rounded-full animate-pulse" style="background-color: ${pColor}"></span>
                Chomping
              </div>
              <h3 class="text-4xl font-bold text-main mb-1 tracking-tight transition-colors">${activeTimer.description || 'Focusing'}</h3>
              <p class="text-muted font-medium text-lg leading-relaxed">
                ${activeProj?.name || activeTimer.project_name || 'Unassigned'}
              </p>
              ${activeTimer.notes ? `<p class="mt-1.5 text-xs text-dim italic">${activeTimer.notes}</p>` : ''}
              <div class="absolute top-3 right-3 opacity-0 group-hover/task:opacity-100 transition-opacity bg-card shadow-soft rounded-full p-1.5 text-primary border border-soft">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </div>
            </div>

            <div class="flex flex-col items-center gap-4 px-8">
              <div id="active-timer-counter" class="text-5xl font-black text-main tabular-nums tracking-tighter">00:00:00</div>
              <button id="dashboard-stop-btn" class="flex items-center justify-center min-w-[180px] h-12 bg-[#FF3B30] hover:bg-[#FF453A] text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all duration-150 active:scale-95 shadow-lg shadow-red-500/20">
                Stop Tracking
              </button>
            </div>
          </div>
        ` : `
          <div class="bg-card rounded-2xl p-6 shadow-sm">
            <form id="start-timer-form" class="space-y-3">
              <!-- Row 1: Spacious description + START -->
              <div class="flex items-center gap-3">
                <div class="flex-1 space-y-1">
                  <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">What are you working on?</label>
                  <input type="text" name="description" placeholder="Task description..." class="w-full bg-app border-none rounded-xl px-5 py-3.5 font-bold text-main text-[15px] focus:ring-2 focus:ring-primary/20 placeholder:text-dim/25">
                </div>
                <button type="submit" class="h-[52px] px-10 bg-primary hover:bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-primary/20 whitespace-nowrap self-end">
                  Start
                </button>
              </div>
              <!-- Row 2: Compact context bar -->
              <div class="grid grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label class="block text-[8px] font-black text-dim uppercase tracking-widest ml-1 opacity-60">Project</label>
                  <div class="relative">
                    <select name="project_id" required class="w-full bg-app/60 border-none rounded-lg px-3 py-2 font-bold text-main text-[11px] appearance-none cursor-pointer focus:ring-1 focus:ring-primary/20 uppercase tracking-wider">
                      ${projects.map(p => `<option value="${p.id}" ${(p.name || '').toLowerCase() === 'personal' ? 'selected' : ''}>${p.name || 'Unnamed'}</option>`).join('')}
                    </select>
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-dim opacity-30">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="block text-[8px] font-black text-dim uppercase tracking-widest ml-1 opacity-60">Link Todo</label>
                  <div class="relative">
                    <select name="task_id" id="link-todo-select" class="w-full bg-app/60 border-none rounded-lg px-3 py-2 font-bold text-main text-[11px] appearance-none cursor-pointer focus:ring-1 focus:ring-primary/20 uppercase tracking-wider">
                      <option value="">None</option>
                    </select>
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-dim opacity-30">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
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

    <!-- History Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between px-2">
        <h3 class="text-[9px] font-black text-dim uppercase tracking-[0.4em]">Recent History</h3>
      </div>

      <div class="space-y-3">
        ${entries.filter(e => e.end_time).slice(0, 10).map(e => {
    const proj = projects.find(p => String(p.id) === String(e.project_id)) || { name: 'Unassigned', color: '#eceff1' };
    const org = proj.customer_id ? customers.find(c => c.id == proj.customer_id && c.is_client == 1) : null;
    const duration = (new Date(e.end_time) - new Date(e.start_time)) / 1000;
    const taskColor = shiftColor(proj.color, -10);

    return `
            <div class="bg-card rounded-xl p-4 border border-soft shadow-sm group/row hover:border-primary/20 transition-all duration-300 flex items-center justify-between text-main cursor-pointer" data-entry-id="${e.id}">
              <div class="flex items-center gap-4 flex-1">
                <div class="w-1 h-8 rounded-full" style="background-color: ${taskColor}"></div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <h4 class="text-sm font-bold tracking-tight">${e.description || 'No description'}</h4>
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-app text-dim uppercase tracking-widest">${e.resource_id || 'Main'}</span>
                  </div>
                  <p class="text-xs font-medium text-muted truncate">${proj.name} ${org ? `<span class="opacity-40 mx-1">•</span> ${org.name}` : ''}</p>
                  ${(() => {
        if (e.task_id) {
          const t = (state.tasks || []).find(task => String(task.id) === String(e.task_id));
          return `<div class="mt-1 flex items-center gap-1.5">
                      <span class="text-[8px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 flex items-center gap-1 uppercase tracking-tighter">
                        <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                        Linked Todo: ${t ? t.title : 'Deleted Todo'}
                      </span>
                    </div>`;
        }
        return '';
      })()}
                  ${e.notes ? `<p class="text-[9px] text-dim italic mt-1.5">${e.notes}</p>` : ''}
                </div>
              </div>

              <div class="flex items-center gap-6">
                <div class="text-right whitespace-nowrap">
                  <div class="text-[9px] font-black text-dim uppercase tracking-widest mb-0.5 opacity-40">${formatTime(e.start_time)} – ${formatTime(e.end_time)}</div>
                  <div class="text-base font-bold tracking-tighter tabular-nums">${formatDuration(duration)}</div>
                </div>
                <div class="flex gap-1">
                  <button class="resume-btn w-8 h-8 flex items-center justify-center rounded-lg bg-app text-dim hover:text-primary hover:bg-primary/10 transition-all"
                          data-project-id="${e.project_id}"
                          data-description="${e.description || ''}"
                          data-notes="${e.notes || ''}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </button>
                  <button class="delete-history-btn w-8 h-8 flex items-center justify-center rounded-lg bg-app text-dim hover:text-red-500 hover:bg-red-500/10 transition-all"
                          data-id="${e.id}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
  }).join('')}
        ${entries.length === 0 ? '<p class="text-center py-6 text-dim font-bold uppercase tracking-widest text-[9px] opacity-30">No history yet</p>' : ''}
      </div>
    </div>
  `;

  // Link Todo dropdown — update when project changes
  if (!activeTimer) {
    const projectSelect = container.querySelector('select[name="project_id"]');
    const todoSelect = container.querySelector('#link-todo-select');
    const descInput = container.querySelector('input[name="description"]');
    const updateTodoOptions = () => {
      const pid = projectSelect.value;
      const tasks = (state.tasks || []).filter(t =>
        String(t.project_id) === String(pid) && t.status !== 'done'
      );
      todoSelect.innerHTML = `<option value="">None</option>` +
        tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
    };
    projectSelect.addEventListener('change', updateTodoOptions);
    updateTodoOptions();

    // Auto-fill description when a todo is selected
    todoSelect.addEventListener('change', () => {
      if (!todoSelect.value) return;
      const task = (state.tasks || []).find(t => String(t.id) === String(todoSelect.value));
      if (task && !descInput.value.trim()) {
        descInput.value = task.title;
      }
    });
  }

  // --- ACTIONS ---

  const activeTaskDisplay = container.querySelector('#active-task-display');
  if (activeTaskDisplay && activeTimer?.task_id) {
    activeTaskDisplay.onclick = () => {
      const task = (store.get().tasks || []).find(t => String(t.id) === String(activeTimer.task_id));
      if (task) PlannerModal.open(task);
    };
  }

  const refreshView = async () => {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(await renderDashboard());
  };

  const closeModal = () => {
    const content = modalPortal.querySelector('#modal-content');
    if (content) content.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => { modalPortal.innerHTML = ''; }, 300);
  };

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

  // Edit Active Task
  const editTaskDisplay = container.querySelector('#active-task-display');
  if (editTaskDisplay) {
    editTaskDisplay.onclick = () => {
      const currentPid = activeTimer.project_id ? String(activeTimer.project_id) : '';
      const projExists = projects.some(p => String(p.id) === currentPid);

      modalPortal.innerHTML = `
        <div class="fixed inset-0 bg-secondary/40 backdrop-blur-md flex items-center justify-center p-4 z-[100] pointer-events-auto">
          <div id="modal-content" class="bg-card rounded-2xl shadow-soft w-full max-w-lg p-8 md:p-10 transform scale-95 opacity-0 transition-all duration-300 relative pointer-events-auto text-main">
            <button id="close-modal-x" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5 z-10" title="Close">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div class="mb-8">
              <h3 class="text-2xl font-bold text-main tracking-tight">Edit Current Task</h3>
              <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Live Update</p>
            </div>
            <form id="edit-active-form" class="space-y-6">
              <!-- Description -->
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Description</label>
                <input type="text" name="description" value="${activeTimer.description || ''}" placeholder="What are you working on?" class="w-full py-3 px-4 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 font-bold text-main text-sm outline-none transition-all">
              </div>

              <!-- Project + Linked Todo -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Project</label>
                  <select name="project_id" id="active-project-select" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none">
                    <option value="" ${!projExists ? 'selected' : ''}>Unassigned</option>
                    ${projects.map(p => {
        const pid = String(p.id);
        const isSelected = currentPid === pid;
        return `<option value="${pid}" ${isSelected ? 'selected' : ''}>${p.name}</option>`;
      }).join('')}
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Linked Todo</label>
                  <select name="task_id" id="active-task-select" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none">
                    <option value="">No Linked Todo</option>
                  </select>
                </div>
              </div>

              <!-- Started At + Notes -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Started At</label>
                  <input type="datetime-local" name="start_time" value="${formatDateForInput(activeTimer.start_time)}" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 font-bold text-main text-[11px] outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Notes</label>
                  <input type="text" name="notes" value="${activeTimer.notes || ''}" placeholder="Optional details..." class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 font-bold text-main text-[11px] outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-4 pt-4 border-t border-white/5">
                <button type="button" id="cancel-modal" class="flex-1 py-3.5 text-[10px] font-black uppercase text-dim tracking-widest hover:text-main rounded-xl hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" class="flex-[2] py-3.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      `;
      setTimeout(() => {
        const content = modalPortal.querySelector('#modal-content');
        if (content) content.classList.add('scale-100', 'opacity-100');
      }, 10);
      modalPortal.querySelector('#close-modal-x').onclick = closeModal;
      modalPortal.querySelector('#cancel-modal').onclick = closeModal;

      const projectSelect = modalPortal.querySelector('#active-project-select');
      const taskSelect = modalPortal.querySelector('#active-task-select');

      const updateTasks = () => {
        const pid = projectSelect.value;
        const tasks = (store.get().tasks || []).filter(t => String(t.project_id) === String(pid));
        taskSelect.innerHTML = `<option value="">No Linked Todo</option>` +
          tasks.map(t => `<option value="${t.id}" ${String(t.id) === String(activeTimer.task_id) ? 'selected' : ''}>${t.title}</option>`).join('');
      };

      projectSelect.onchange = updateTasks;
      updateTasks();

      modalPortal.querySelector('#edit-active-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.id = activeTimer.id;
        data.task_id = data.task_id || null;
        data.project_name = projects.find(p => String(p.id) === String(data.project_id))?.name || 'Unassigned';
        data.resource_id = activeTimer.resource_id || state.team?.[0]?.name || 'Main';
        data.start_time = new Date(data.start_time).toISOString();
        data.end_time = null;
        try {
          const result = await api.post('time-entries.php', data);
          store.update('activeTimer', result);
          store.update('timeEntries', await api.get('time-entries.php'));
          closeModal();
          setTimeout(refreshView, 350);
        } catch (err) { alert('Update failed'); }
      };
    };
  }

  // Edit History Entry — click anywhere on the row (except action buttons)
  container.addEventListener('click', (e) => {
    const row = e.target.closest('[data-entry-id]');
    if (!row) return;
    // Don't trigger edit if clicking action buttons
    if (e.target.closest('.resume-btn') || e.target.closest('.delete-history-btn')) return;

    const entry = entries.find(en => String(en.id) === String(row.dataset.entryId));
    if (!entry) return;
    const currentPid = entry.project_id ? String(entry.project_id) : '';
    const projExists = projects.some(p => String(p.id) === currentPid);

    modalPortal.innerHTML = `
        <div class="fixed inset-0 bg-secondary/40 backdrop-blur-md flex items-center justify-center p-4 z-[100] pointer-events-auto">
          <div id="modal-content" class="bg-card rounded-2xl shadow-soft w-full max-w-lg p-8 transform scale-95 opacity-0 transition-all duration-300 relative pointer-events-auto text-main text-main">
            <button id="close-modal-x" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5 z-10" title="Close">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div class="text-center mb-8">
              <h3 class="text-xl font-bold">Edit History Entry</h3>
              <p class="text-[9px] font-black text-dim uppercase tracking-widest mt-2">Log Adjustment</p>
            </div>
            <form id="edit-history-form" class="space-y-4">
              <input type="hidden" name="id" value="${entry.id}">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Project</label>
                  <select name="project_id" id="history-project-select" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold appearance-none cursor-pointer">
                    <option value="" ${!projExists ? 'selected' : ''}>Unassigned</option>
                    ${projects.map(p => {
      const pid = String(p.id);
      const isSelected = currentPid === pid;
      return `<option value="${pid}" ${isSelected ? 'selected' : ''}>${p.name}</option>`;
    }).join('')}
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Linked Todo</label>
                  <select name="task_id" id="history-task-select" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold appearance-none cursor-pointer">
                    <option value="">No Linked Todo</option>
                  </select>
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Description</label>
                <input type="text" name="description" value="${entry.description || ''}" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold">
              </div>
              <div class="space-y-1.5">
                <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Notes</label>
                <input type="text" name="notes" value="${entry.notes || ''}" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Start</label>
                  <input type="datetime-local" name="start_time" required value="${formatDateForInput(entry.start_time)}" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">End</label>
                  <input type="datetime-local" name="end_time" required value="${formatDateForInput(entry.end_time)}" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main">
                </div>
              </div>
              <div class="flex gap-4 pt-4">
                <button type="button" id="cancel-modal" class="flex-1 py-4 text-[10px] font-black uppercase text-dim tracking-widest hover:text-main">Cancel</button>
                <button type="submit" class="flex-[2] py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      `;
    setTimeout(() => {
      const content = modalPortal.querySelector('#modal-content');
      if (content) content.classList.add('scale-100', 'opacity-100');
    }, 10);
    modalPortal.querySelector('#close-modal-x').onclick = closeModal;
    modalPortal.querySelector('#cancel-modal').onclick = closeModal;

    const projectSelect = modalPortal.querySelector('#history-project-select');
    const taskSelect = modalPortal.querySelector('#history-task-select');

    const updateTasks = () => {
      const pid = projectSelect.value;
      const tasks = (store.get().tasks || []).filter(t => String(t.project_id) === String(pid));
      taskSelect.innerHTML = `<option value="">No Linked Todo</option>` +
        tasks.map(t => `<option value="${t.id}" ${String(t.id) === String(entry.task_id) ? 'selected' : ''}>${t.title}</option>`).join('');
    };

    projectSelect.onchange = updateTasks;
    updateTasks();

    modalPortal.querySelector('#edit-history-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      data.task_id = data.task_id || null;
      data.start_time = new Date(data.start_time).toISOString();
      data.end_time = new Date(data.end_time).toISOString();
      data.project_name = projects.find(p => String(p.id) === String(data.project_id))?.name || 'Unassigned';
      try {
        await api.post('time-entries.php', data);
        store.update('timeEntries', await api.get('time-entries.php'));
        closeModal();
        setTimeout(refreshView, 350);
      } catch (err) { alert('Update failed'); }
    };
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

  return container;
}
