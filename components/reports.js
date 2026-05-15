import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { TimeEntryModal } from './time-entry-modal.js';

/**
 * components/reports.js
 *
 * Reports - 08 Feb 2026
 * Fixed modals, project selection logic and interactive pointer events.
 */

let currentPage = 1;
const DAYS_PER_PAGE = 5;
let selectedProject = '';
let selectedMember = '';
let dailyReportDate = new Date().toLocaleDateString('en-CA');

export async function renderReports() {
  const state = store.get();
  const rawEntries = state.timeEntries || [];
  const projects = state.projects || [];
  
  const hiddenProjectIds = new Set(projects.filter(p => p.hide_from_gantt == 1 && String(p.id) !== selectedProject).map(p => String(p.id)));
  const entries = rawEntries.filter(e => !hiddenProjectIds.has(String(e.project_id)));

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

  const dailyEntries = entries.filter(e => e.end_time && e.start_time.startsWith(dailyReportDate));
  const dailyProjectData = {};
  let dailyTotalSeconds = 0;
  const cumulativePoints = Array(1440).fill(0);

  dailyEntries.forEach(e => {
    const start = new Date(e.start_time);
    const end = new Date(e.end_time);
    const pid = e.project_id;
    if (!dailyProjectData[pid]) dailyProjectData[pid] = { total: 0, hourly: Array(24).fill(0) };
    let current = new Date(start);
    while (current < end) {
      const minuteOfDay = current.getHours() * 60 + current.getMinutes();
      const hour = current.getHours();
      const nextHour = new Date(current);
      nextHour.setHours(hour + 1, 0, 0, 0);
      const endOfSegment = end < nextHour ? end : nextHour;
      const segmentSeconds = (endOfSegment - current) / 1000;
      dailyProjectData[pid].hourly[hour] += segmentSeconds / 60;
      dailyProjectData[pid].total += segmentSeconds;
      dailyTotalSeconds += segmentSeconds;
      for (let i = minuteOfDay; i < 1440; i++) cumulativePoints[i] += segmentSeconds / 60;
      current = endOfSegment;
    }
  });

  const filteredEntries = entries.filter(e => {
    if (!e.end_time) return false;
    if (selectedProject && String(e.project_id) !== String(selectedProject)) return false;
    if (selectedMember && String(e.resource_id || 'Main') !== String(selectedMember)) return false;
    return true;
  });

  const grouped = {};
  filteredEntries.forEach(e => {
    const d = new Date(e.start_time);
    const dayKey = d.toLocaleDateString('en-CA');
    if (!grouped[dayKey]) grouped[dayKey] = { entries: [], total: 0, date: d };
    grouped[dayKey].entries.push(e);
    grouped[dayKey].total += (new Date(e.end_time) - new Date(e.start_time)) / 1000;
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const totalPages = Math.ceil(sortedDays.length / DAYS_PER_PAGE);
  const paginatedDays = sortedDays.slice((currentPage - 1) * DAYS_PER_PAGE, currentPage * DAYS_PER_PAGE);

  const container = document.createElement('div');
  container.className = "max-w-7xl mx-auto pb-20 px-4";

  const todayStr = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  container.innerHTML = `
    <div class="flex items-end justify-between px-2 mb-6">
      <div>
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Analytics</h2>
        <h1 class="text-3xl font-light text-main tracking-tight">Daily <span class="font-bold italic text-primary">Performance.</span></h1>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-8">
      <div class="flex-1 space-y-8 min-w-0">
        <div class="flex items-center justify-between px-2">
          <div>
            <p class="text-lg font-bold text-slate-200 uppercase tracking-widest">
              ${new Date(dailyReportDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div class="text-right">
            <div class="text-[10px] font-black text-dim uppercase tracking-widest mb-1 opacity-50">Total Burned</div>
            <div class="text-4xl font-black text-primary tracking-tighter tabular-nums leading-none">${formatDuration(dailyTotalSeconds)}</div>
          </div>
        </div>

        <div class="bg-card rounded-2xl p-8 border border-soft shadow-soft relative overflow-hidden group">
          <h4 class="text-[10px] font-black text-dim uppercase tracking-widest mb-8">Cumulative Build-up (8h Goal)</h4>
          <div class="h-64"><canvas id="cumulative-build-chart"></canvas></div>
        </div>

        <div class="bg-card rounded-2xl p-8 border border-soft shadow-soft">
          <h4 class="text-[10px] font-black text-dim uppercase tracking-widest mb-8">Hourly Project Intensity</h4>
          <div class="h-64"><canvas id="daily-stacked-bar"></canvas></div>
        </div>

        <div class="space-y-6 pt-8">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.4em]">Time History</h3>
            <div class="flex items-center gap-3">
              <select id="filter-project" class="bg-card border border-soft rounded-lg py-1.5 px-3 text-[9px] font-black text-dim uppercase tracking-widest appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20">
                <option value="">All Projects</option>
                ${projects.filter(p => !p.hide_from_gantt || selectedProject == p.id).map(p => `<option value="${p.id}" ${selectedProject === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
              </select>
              ${totalPages > 1 ? `
                <div class="flex items-center gap-1 bg-card rounded-lg p-0.5 border border-soft">
                  <button id="prev-page" ${currentPage === 1 ? 'disabled' : ''} class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-app transition-colors disabled:opacity-20"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg></button>
                  <span class="text-[9px] font-black text-dim px-2">${currentPage}/${totalPages}</span>
                  <button id="next-page" ${currentPage === totalPages ? 'disabled' : ''} class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-app transition-colors disabled:opacity-20"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="space-y-10">
            ${paginatedDays.map(dayKey => {
    const group = grouped[dayKey];
    return `
                <div class="space-y-3">
                  <div class="flex items-center justify-between px-2 opacity-40">
                    <div class="text-[9px] font-black text-dim uppercase tracking-[0.2em]">${group.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div class="text-[9px] font-black text-dim uppercase tracking-[0.2em]">${formatDuration(group.total)}</div>
                  </div>
                  <div class="space-y-2">
                    ${group.entries.map(e => {
      const proj = projects.find(p => String(p.id) === String(e.project_id)) || { name: 'Unassigned', color: '#eceff1' };
      return `
                        <div class="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-soft hover:border-primary/30 transition-all group/row flex items-center justify-between">
                          <div class="flex items-center gap-4 flex-1 min-w-0">
                            <div class="w-1 h-8 rounded-full" style="background-color: ${proj.color}"></div>
                            <div class="min-w-0">
                              <h4 class="text-sm font-bold text-main truncate">${e.description || 'No description'}</h4>
                              <p class="text-[10px] font-bold text-dim uppercase tracking-wider">${proj.name}</p>
                            </div>
                          </div>
                          <div class="flex items-center gap-6">
                            <div class="text-right tabular-nums">
                              <div class="text-[10px] font-black text-dim uppercase tracking-widest opacity-30">${formatTime(e.start_time)} – ${formatTime(e.end_time)}</div>
                              <div class="text-sm font-black text-main">${formatDuration((new Date(e.end_time) - new Date(e.start_time)) / 1000)}</div>
                            </div>
                            <div class="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <button class="edit-btn p-1.5 text-dim hover:text-primary transition-colors" data-id="${e.id}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                              <button class="delete-btn p-1.5 text-dim hover:text-red-400 transition-colors" data-id="${e.id}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                          </div>
                        </div>
                      `;
    }).join('')}
                  </div>
                </div>
              `;
  }).join('')}
          </div>
        </div>
      </div>

      <div class="lg:w-[320px] space-y-8 flex-shrink-0">
        <div class="bg-card rounded-2xl p-5 border border-soft shadow-soft space-y-4 sticky top-8">
          <div class="flex gap-1 bg-app rounded-xl p-1 border border-soft">
            <button class="day-select-btn flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${dailyReportDate === todayStr ? 'bg-primary text-white shadow-md' : 'text-dim hover:text-main'}" data-date="${todayStr}">Today</button>
            <button class="day-select-btn flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${dailyReportDate === yesterdayStr ? 'bg-primary text-white shadow-md' : 'text-dim hover:text-main'}" data-date="${yesterdayStr}">Yesterday</button>
          </div>
          <div class="flex items-center justify-center px-2 py-3 bg-app/50 rounded-xl border border-soft">
            <input type="date" id="daily-date-picker" value="${dailyReportDate}" class="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-main focus:ring-0 cursor-pointer p-0 text-center">
          </div>
          <div class="pt-4 space-y-6">
            <h4 class="text-[9px] font-black text-dim uppercase tracking-widest px-1">Daily Mix</h4>
            <div class="h-48 relative"><canvas id="daily-pie"></canvas></div>
            <div id="daily-pie-legend" class="space-y-2 px-1"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const cumCtx = container.querySelector('#cumulative-build-chart');
    if (cumCtx) {
      new Chart(cumCtx, {
        type: 'line',
        data: {
          labels: Array.from({ length: 1440 }, (_, i) => `${Math.floor(i / 60)}:${String(i % 60).padStart(2, '0')}`),
          datasets: [{ label: 'Time Logged', data: cumulativePoints, borderColor: '#338a81', backgroundColor: 'rgba(51, 138, 129, 0.1)', borderWidth: 3, fill: true, pointRadius: 0, tension: 0.2 }, { label: 'Target (8h)', data: Array(1440).fill(480), borderColor: '#ef4444', borderWidth: 1, borderDash: [5, 5], fill: false, pointRadius: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#64748b', callback: (v, i) => i % 240 === 0 ? `${i / 60}:00` : '' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 9 }, color: '#64748b', callback: (v) => `${(v / 60).toFixed(0)}h` } } } }
      });
    }

    const dailyBarCtx = container.querySelector('#daily-stacked-bar');
    if (dailyBarCtx) {
      const datasets = Object.entries(dailyProjectData).map(([pid, data]) => ({ label: projects.find(p => String(p.id) === String(pid))?.name || 'Unassigned', data: data.hourly, backgroundColor: projects.find(p => String(p.id) === String(pid))?.color || '#eceff1', borderRadius: 4, borderWidth: 0 }));
      new Chart(dailyBarCtx, {
        type: 'bar',
        data: { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index' } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 }, color: '#64748b', callback: (v, i) => i % 4 === 0 ? `${i}:00` : '' } }, y: { stacked: true, beginAtZero: true, max: 60, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 9 }, color: '#64748b', stepSize: 15, callback: (v) => `${v}m` } } } }
      });
    }

    const dailyPieCtx = container.querySelector('#daily-pie');
    if (dailyPieCtx) {
      const pieData = Object.entries(dailyProjectData).map(([pid, data]) => ({ total: data.total, color: projects.find(p => String(p.id) === String(pid))?.color || '#eceff1', name: projects.find(p => String(p.id) === String(pid))?.name || 'Unassigned' }));
      new Chart(dailyPieCtx, {
        type: 'doughnut',
        data: { labels: pieData.map(d => d.name), datasets: [{ data: pieData.map(d => d.total / 60), backgroundColor: pieData.map(d => d.color), borderWidth: 0, cutout: '80%' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
      container.querySelector('#daily-pie-legend').innerHTML = pieData.map(d => `
        <div class="flex items-center justify-between text-[10px] font-bold">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${d.color}"></div>
            <span class="text-slate-400 truncate">${d.name}</span>
          </div>
          <span class="text-white font-black ml-2">${formatDuration(d.total)}</span>
        </div>
      `).join('');
    }
  }, 100);

  container.addEventListener('click', async (e) => {
    const dayBtn = e.target.closest('.day-select-btn');
    if (dayBtn) { dailyReportDate = dayBtn.dataset.date; refreshView(); }
    if (e.target.closest('#prev-page') && currentPage > 1) { currentPage--; refreshView(); }
    if (e.target.closest('#next-page') && currentPage < totalPages) { currentPage++; refreshView(); }
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn && confirm('Delete this entry?')) {
      await api.delete(`time-entries.php?id=${deleteBtn.dataset.id}`);
      store.update('timeEntries', await api.get('time-entries.php'));
      refreshView();
    }
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      const entry = entries.find(ent => String(ent.id) === String(editBtn.dataset.id));
      if (entry) TimeEntryModal.open(entry, { onSave: refreshView });
    }
  });

  container.querySelector('#daily-date-picker').onchange = (e) => { dailyReportDate = e.target.value; refreshView(); };
  container.querySelector('#filter-project').onchange = (e) => { selectedProject = e.target.value; currentPage = 1; refreshView(); };

  async function refreshView() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(await renderReports());
  }


  return container;
}

