import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

/**
 * assets/components/dashboard.js
 *
 * Dashboard - 28 Jan 2026
 *
 * Purpose: Consolidated time tracking view with active timer and history.
 *
 * @package Chompy
 *
 * @author Senpai
 *
 * Last 3 version commits:
 * @version 1.4 - UPD - 28 Jan 2026 - Compact layout and smaller radiuses
 * @version 1.3 - UPD - 28 Jan 2026 - Added history edit functionality
 * @version 1.2 - UPD - 28 Jan 2026 - Consolidated active timer and history
 */

export async function renderDashboard() {
  const state = store.get();
  const projects = state.projects || [];
  const activeTimer = state.activeTimer;
  const entries = state.timeEntries || [];
  const customers = state.customers || [];

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return h > 0 ? `${ h }h ${ m }m` : `${ m }m ${ s }s`;
  };

  const formatTime = (dateStr) => {
    if ( ! dateStr ) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDateForInput = (dateStr) => {
    if ( ! dateStr ) return '';
    const d = new Date(dateStr);
    const z = (n) => n.toString().padStart(2, '0');
    return `${ d.getFullYear() }-${ z(d.getMonth() + 1) }-${ z(d.getDate()) }T${ z(d.getHours()) }:${ z(d.getMinutes()) }`;
  };

  const container = document.createElement('div');
  container.className = 'max-w-5xl mx-auto pb-10 space-y-8';

  // Helper for color shifting
  const shiftColor = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
  };

  container.innerHTML = `
    <!-- Active Timer Widget -->
    <div class="relative overflow-hidden transition-all duration-300">
      <div class="relative z-10">
        ${ activeTimer ? `
          <div class="flex flex-col md:flex-row items-center justify-between gap-8 bg-card/40 backdrop-blur-sm rounded-2xl pb-4 shadow-sm">
            <div id="active-task-display" class="flex-1 cursor-pointer group/task relative py-3 px-5 rounded-xl hover:bg-primary/5 transition-all">
              <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-[9px] font-black text-primary uppercase tracking-widest mb-3">
                <span class="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                Chomping
              </div>
              <h3 class="text-4xl font-bold text-main mb-1 tracking-tight transition-colors">${ activeTimer.description || 'Focusing' }</h3>
              <p class="text-muted font-medium text-lg leading-relaxed">
                ${ activeTimer.project_name }
              </p>
              ${ activeTimer.notes ? `<p class="mt-1.5 text-xs text-dim italic">${ activeTimer.notes }</p>` : '' }
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
          <div class="bg-card rounded-2xl p-8 shadow-sm">
            <form id="start-timer-form" class="flex flex-col md:flex-row items-end gap-4">
              <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Project</label>
                  <select name="project_id" required class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20">
                    <option value="">Select Project...</option>
                    ${ projects.map(p => `<option value="${ p.id }">${ p.name }</option>`).join('') }
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">What are you doing?</label>
                  <input type="text" name="description" placeholder="Task description..." class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Notes (Optional)</label>
                  <input type="text" name="notes" placeholder="Additional details..." class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm focus:ring-2 focus:ring-primary/20">
                </div>
              </div>
              <button type="submit" class="h-12 px-8 bg-primary hover:bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-primary/20 whitespace-nowrap">
                Start
              </button>
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
        ${ entries.filter(e => e.end_time).slice(0, 10).map(e => {
          const proj = projects.find(p => p.id == e.project_id) || { name: 'Unassigned', color: '#eceff1' };
          const org = proj.customer_id ? customers.find(c => c.id == proj.customer_id && c.is_client == 1) : null;
          const duration = (new Date(e.end_time) - new Date(e.start_time)) / 1000;
          const taskColor = shiftColor(proj.color, -10);

          return `
            <div class="bg-card rounded-xl p-4 border border-soft shadow-sm group/row hover:border-primary/20 transition-all duration-300 flex items-center justify-between">
              <div class="flex items-center gap-4 flex-1">
                <div class="w-1 h-8 rounded-full" style="background-color: ${ taskColor }"></div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <h4 class="text-sm font-bold text-main tracking-tight">${ e.description || 'No description' }</h4>
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-app text-dim uppercase tracking-widest">${ e.resource_id || 'Main' }</span>
                  </div>
                  <p class="text-xs font-medium text-muted truncate">${ proj.name } ${ org ? `<span class="opacity-40 mx-1">•</span> ${ org.name }` : '' }</p>
                  ${ e.notes ? `<p class="text-[9px] text-dim italic mt-0.5">${ e.notes }</p>` : '' }
                </div>
              </div>

              <div class="flex items-center gap-6">
                <div class="text-right whitespace-nowrap">
                  <div class="text-[9px] font-black text-dim uppercase tracking-widest mb-0.5 opacity-40">${ formatTime(e.start_time) } – ${ formatTime(e.end_time) }</div>
                  <div class="text-base font-bold text-main tracking-tighter tabular-nums">${ formatDuration(duration) }</div>
                </div>
                <div class="flex gap-1">
                  <button class="resume-btn w-8 h-8 flex items-center justify-center rounded-lg bg-app text-dim hover:text-primary hover:bg-primary/10 transition-all"
                          data-project-id="${ e.project_id }"
                          data-description="${ e.description || '' }"
                          data-notes="${ e.notes || '' }">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </button>
                  <button class="edit-history-btn w-8 h-8 flex items-center justify-center rounded-lg bg-app text-dim hover:text-primary hover:bg-primary/10 transition-all"
                          data-id="${ e.id }">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </button>
                  <button class="delete-history-btn w-8 h-8 flex items-center justify-center rounded-lg bg-app text-dim hover:text-red-500 hover:bg-red-500/10 transition-all"
                          data-id="${ e.id }">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('') }
        ${ entries.length === 0 ? '<p class="text-center py-6 text-dim font-bold uppercase tracking-widest text-[9px] opacity-30">No history yet</p>' : '' }
      </div>
    </div>

    <!-- Edit History Entry Modal -->
    <div id="edit-history-panel" class="fixed inset-0 bg-secondary/40 hidden z-[60] backdrop-blur-md items-center justify-center p-4">
      <div class="bg-card rounded-2xl shadow-soft w-full max-w-lg p-8 transform scale-95 opacity-0 transition-all duration-300" id="edit-history-content">
        <div class="mb-6 text-center">
          <h3 class="text-xl font-bold text-main tracking-tight">Edit Entry</h3>
          <p class="text-[9px] font-black text-dim uppercase tracking-[0.3em] mt-2">Log Adjustment</p>
        </div>
        <form id="edit-history-form" class="space-y-4">
          <input type="hidden" name="id">
          <div class="space-y-1.5">
            <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Project</label>
            <select name="project_id" required class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm appearance-none cursor-pointer">
              ${ projects.map(p => `<option value="${ p.id }">${ p.name }</option>`).join('') }
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Description</label>
            <input type="text" name="description" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm">
          </div>
          <div class="space-y-1.5">
            <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Notes</label>
            <input type="text" name="notes" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Start</label>
              <input type="datetime-local" name="start_time" required class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm">
            </div>
            <div class="space-y-1.5">
              <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">End</label>
              <input type="datetime-local" name="end_time" required class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm">
            </div>
          </div>
          <div class="flex gap-3 pt-4">
            <button type="button" id="close-edit-history" class="flex-1 h-12 bg-app hover:bg-border-soft text-muted font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">Cancel</button>
            <button type="submit" class="flex-[2] h-12 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Active Task Modal -->
    <div id="edit-active-panel" class="fixed inset-0 bg-secondary/40 hidden z-[60] backdrop-blur-md items-center justify-center p-4">
      <div class="bg-card rounded-2xl shadow-soft w-full max-w-lg p-8 transform scale-95 opacity-0 transition-all duration-300" id="edit-active-content">
        <div class="mb-6 text-center">
          <h3 class="text-xl font-bold text-main tracking-tight">Edit Current Task</h3>
          <p class="text-[9px] font-black text-dim uppercase tracking-[0.3em] mt-2">Live Log Adjustment</p>
        </div>
        <form id="edit-active-form" class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Project</label>
            <select name="project_id" required class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm appearance-none cursor-pointer">
              ${ projects.map(p => `<option value="${ p.id }" ${ activeTimer?.project_id == p.id ? 'selected' : '' }>${ p.name }</option>`).join('') }
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Description</label>
            <input type="text" name="description" value="${ activeTimer?.description || '' }" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm">
          </div>
          <div class="space-y-1.5">
            <label class="block text-[9px] font-black text-dim uppercase tracking-widest ml-1">Notes</label>
            <input type="text" name="notes" value="${ activeTimer?.notes || '' }" class="w-full bg-app border-none rounded-xl px-4 py-3 font-bold text-main text-sm">
          </div>
          <div class="flex gap-3 pt-4">
            <button type="button" id="close-edit-active" class="flex-1 h-12 bg-app hover:bg-border-soft text-muted font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">Cancel</button>
            <button type="submit" class="flex-[2] h-12 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Timer Ticker
  if ( activeTimer ) {
    const counterEl = container.querySelector('#active-timer-counter');
    const startTime = new Date(activeTimer.start_time).getTime();

    const updateCounter = () => {
      const now = new Date().getTime();
      const diff = now - startTime;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      counterEl.textContent = `${ String(h).padStart(2, '0') }:${ String(m).padStart(2, '0') }:${ String(s).padStart(2, '0') }`;
    };

    const interval = setInterval(updateCounter, 1000);
    updateCounter();

    // Cleanup interval on remove
    const observer = new MutationObserver((mutations) => {
      if ( ! document.body.contains(container) ) {
        clearInterval(interval);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Event Handlers
  const startForm = container.querySelector('#start-timer-form');

  if ( startForm ) {
    startForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(startForm).entries());
      const project = projects.find(p => p.id == data.project_id);
      if (!project) return;
      data.project_name = project.name;
      data.resource_id = state.team?.[0]?.name || 'Main';

      try {
        const result = await api.post('time-entries.php?action=start', data);
        store.update('activeTimer', result);
        const newEntries = await api.get('time-entries.php');
        store.update('timeEntries', newEntries);
        refreshView();
      } catch (err) { alert('Failed to start'); }
    };
  }

  const stopBtn = container.querySelector('#dashboard-stop-btn');
  if ( stopBtn ) {
    stopBtn.onclick = async () => {
      try {
        await api.post('time-entries.php?action=stop', { id: activeTimer.id });
        store.update('activeTimer', null);
        const newEntries = await api.get('time-entries.php');
        store.update('timeEntries', newEntries);
        refreshView();
      } catch (err) { alert('Error stopping'); }
    };
  }

  container.querySelectorAll('.resume-btn').forEach(btn => {
    btn.onclick = async () => {
      const data = {
        project_id: btn.dataset.projectId,
        description: btn.dataset.description,
        notes: btn.dataset.notes,
        project_name: projects.find(p => p.id == btn.dataset.projectId)?.name || 'Unknown',
        resource_id: state.team?.[0]?.name || 'Main'
      };
      try {
        const result = await api.post('time-entries.php?action=start', data);
        store.update('activeTimer', result);
        const newEntries = await api.get('time-entries.php');
        store.update('timeEntries', newEntries);
        refreshView();
      } catch (err) { alert('Failed to resume'); }
    };
  });

  // Edit Panel Logic
  const editDisplay = container.querySelector('#active-task-display');
  const editPanel = container.querySelector('#edit-active-panel');
  const editContent = container.querySelector('#edit-active-content');
  const closeEdit = container.querySelector('#close-edit-active');
  const editForm = container.querySelector('#edit-active-form');

  if ( editDisplay ) {
    editDisplay.onclick = () => {
      editPanel.classList.remove('hidden');
      editPanel.classList.add('flex');
      setTimeout(() => editContent.classList.add('scale-100', 'opacity-100'), 10);
    };
  }

  const closeEditPanel = () => {
    editContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      editPanel.classList.add('hidden');
      editPanel.classList.remove('flex');
    }, 300);
  };

  if ( closeEdit ) closeEdit.onclick = closeEditPanel;

  if ( editForm ) {
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(editForm).entries());
      data.id = activeTimer.id;
      data.project_name = projects.find(p => p.id == data.project_id)?.name;
      try {
        const result = await api.post('time-entries.php?action=start', data);
        store.update('activeTimer', result);
        closeEditPanel();
        setTimeout(refreshView, 350);
      } catch (err) { alert('Update failed'); }
    };
  }

  // History Edit Logic
  const editHistoryPanel = container.querySelector('#edit-history-panel');
  const editHistoryContent = container.querySelector('#edit-history-content');
  const closeEditHistory = container.querySelector('#close-edit-history');
  const editHistoryForm = container.querySelector('#edit-history-form');

  container.querySelectorAll('.edit-history-btn').forEach(btn => {
    btn.onclick = () => {
      const entry = entries.find(e => e.id == btn.dataset.id);
      if ( ! entry ) return;

      editHistoryForm.id.value = entry.id;
      editHistoryForm.project_id.value = entry.project_id;
      editHistoryForm.description.value = entry.description || '';
      editHistoryForm.notes.value = entry.notes || '';
      editHistoryForm.start_time.value = formatDateForInput(entry.start_time);
      editHistoryForm.end_time.value = formatDateForInput(entry.end_time);

      editHistoryPanel.classList.remove('hidden');
      editHistoryPanel.classList.add('flex');
      setTimeout(() => editHistoryContent.classList.add('scale-100', 'opacity-100'), 10);
    };
  });

  const closeEditHistoryPanel = () => {
    editHistoryContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      editHistoryPanel.classList.add('hidden');
      editHistoryPanel.classList.remove('flex');
    }, 300);
  };

  if ( closeEditHistory ) closeEditHistory.onclick = closeEditHistoryPanel;

  if ( editHistoryForm ) {
    editHistoryForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(editHistoryForm).entries());
      data.start_time = new Date(data.start_time).toISOString();
      data.end_time = new Date(data.end_time).toISOString();
      data.project_name = projects.find(p => p.id == data.project_id)?.name;

      try {
        await api.post('time-entries.php', data);
        const newEntries = await api.get('time-entries.php');
        store.update('timeEntries', newEntries);
        closeEditHistoryPanel();
        setTimeout(refreshView, 350);
      } catch (err) { alert('Update failed'); }
    };
  }

  container.querySelectorAll('.delete-history-btn').forEach(btn => {
    btn.onclick = async () => {
      if ( ! confirm('Delete this entry?') ) return;
      try {
        await api.delete(`time-entries.php?id=${ btn.dataset.id }`);
        const newEntries = await api.get('time-entries.php');
        store.update('timeEntries', newEntries);
        refreshView();
      } catch (err) { alert('Delete failed'); }
    };
  });

  async function refreshView() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(await renderDashboard());
  }

  return container;
}
