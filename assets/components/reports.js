import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

/**
 * assets/components/reports.js
 *
 * Reports - 28 Jan 2026
 *
 * Purpose: High-end performance reporting with cumulative build-up, hourly distribution, and planned vs actual analysis.
 *
 * @package Chompy
 * @author Senpai
 */

let currentPage = 1;
const DAYS_PER_PAGE = 5;
let selectedProject = '';
let selectedMember = '';
let dailyReportDate = new Date().toLocaleDateString('en-CA');
let showAllProjects = false;

export async function renderReports() {
  const state = store.get();
  const entries = state.timeEntries || [];
  const projects = state.projects || [];
  const tasks = state.tasks || [];

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

  // --- 1. DAILY INSIGHTS DATA ---
  const dailyEntries = entries.filter(e => e.end_time && e.start_time.startsWith(dailyReportDate));
  const dailyProjectData = {};
  let dailyTotalSeconds = 0;
  
  // Cumulative Data Points (Minute-by-Minute)
  const cumulativePoints = Array(1440).fill(0); // 24h * 60m
  
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
      
      // Fill cumulative points
      for (let i = minuteOfDay; i < 1440; i++) {
        cumulativePoints[i] += segmentSeconds / 60;
      }
      
      current = endOfSegment;
    }
  });

  // --- 2. PLANNED VS ACTUAL DATA ---
  const comparisonData = {};
  entries.filter(e => e.end_time).forEach(e => {
    const pid = e.project_id;
    if (!comparisonData[pid]) comparisonData[pid] = { actual: 0, planned: 0 };
    comparisonData[pid].actual += (new Date(e.end_time) - new Date(e.start_time)) / 3600000;
  });

  tasks.forEach(t => {
    const pid = t.project_id;
    if (!comparisonData[pid]) comparisonData[pid] = { actual: 0, planned: 0 };
    let plannedHours = 1;
    if (t.slots && typeof t.slots === 'string') plannedHours = t.slots.split(',').filter(s => s.trim() !== '').length;
    else plannedHours = (new Date(t.end_date || t.start_date) - new Date(t.start_date)) / 3600000 || 1;
    comparisonData[pid].planned += plannedHours;
  });

  const sortedPidsByRecency = [...new Set(entries.filter(e => e.project_id).map(e => e.project_id))];
  const displayedComparisonPids = showAllProjects ? Object.keys(comparisonData) : sortedPidsByRecency.slice(0, 3);

  // --- 3. HISTORY DATA ---
  const filteredEntries = entries.filter(e => {
    if (!e.end_time) return false;
    if (selectedProject && e.project_id !== selectedProject) return false;
    if (selectedMember && (e.resource_id || 'Main') !== selectedMember) return false;
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
  container.className = "max-w-7xl mx-auto pb-20 px-4 space-y-12";

  const todayStr = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  container.innerHTML = `
    <div class="flex items-end justify-between px-2 pt-8">
      <div>
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Analytics</h2>
        <h1 class="text-4xl font-light text-main tracking-tight">System <span class="font-bold italic text-primary">Performance.</span></h1>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Main Column -->
      <div class="flex-1 space-y-8 min-w-0">
        <!-- Dashboard Header -->
        <div class="flex items-center justify-between px-2">
          <div>
            <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2">Daily Performance</h3>
            <p class="text-lg font-bold text-slate-200 uppercase tracking-widest">
              ${ new Date(dailyReportDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }
            </p>
          </div>
          <div class="text-right">
            <div class="text-[10px] font-black text-dim uppercase tracking-widest mb-1 opacity-50">Total Burned</div>
            <div class="text-4xl font-black text-primary tracking-tighter tabular-nums leading-none">${ formatDuration(dailyTotalSeconds) }</div>
          </div>
        </div>

        <!-- Cumulative Build-up Card -->
        <div class="bg-card rounded-2xl p-8 border border-soft/50 shadow-soft relative overflow-hidden group">
          <h4 class="text-[10px] font-black text-dim uppercase tracking-widest mb-8">Cumulative Build-up (8h Goal)</h4>
          <div class="h-64">
            <canvas id="cumulative-build-chart"></canvas>
          </div>
        </div>

        <!-- Hourly Distribution Card -->
        <div class="bg-card rounded-2xl p-8 border border-soft/50 shadow-soft">
          <h4 class="text-[10px] font-black text-dim uppercase tracking-widest mb-8">Hourly Project Intensity</h4>
          <div class="h-64">
            <canvas id="daily-stacked-bar"></canvas>
          </div>
        </div>

        <!-- Planned vs Actual Card -->
        <div class="space-y-4 pt-4">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.4em]">Resource Allocation</h3>
            <button id="toggle-all-projects" class="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">${showAllProjects ? 'Top 3 Projects' : 'View All Projects'}</button>
          </div>
          <div class="bg-card rounded-2xl p-8 border border-soft/50 shadow-soft min-h-[400px]">
            <canvas id="comparison-grouped-bar"></canvas>
          </div>
        </div>

        <!-- Detailed History -->
        <div class="space-y-6 pt-8">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.4em]">Time History</h3>
            <div class="flex items-center gap-3">
              <select id="filter-project" class="bg-card border border-soft rounded-lg py-1.5 px-3 text-[9px] font-black text-dim uppercase tracking-widest appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20">
                <option value="">All Projects</option>
                ${projects.map(p => `<option value="${p.id}" ${selectedProject === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
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
                      const proj = projects.find(p => p.id == e.project_id) || { name: 'Unassigned', color: '#eceff1' };
                      return `
                        <div class="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-soft/30 hover:border-primary/30 transition-all group/row flex items-center justify-between">
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

      <!-- Sidebar -->
      <div class="lg:w-[320px] space-y-8 flex-shrink-0">
        <!-- Controls Sidebar -->
        <div class="bg-card rounded-2xl p-5 border border-soft/50 shadow-soft space-y-4 sticky top-8">
          <div class="flex gap-1 bg-app rounded-xl p-1 border border-soft/50">
            <button class="day-select-btn flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${dailyReportDate === todayStr ? 'bg-primary text-white shadow-md' : 'text-dim hover:text-main'}" data-date="${todayStr}">Today</button>
            <button class="day-select-btn flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${dailyReportDate === yesterdayStr ? 'bg-primary text-white shadow-md' : 'text-dim hover:text-main'}" data-date="${yesterdayStr}">Yesterday</button>
          </div>
          <div class="flex items-center justify-center px-2 py-3 bg-app/50 rounded-xl border border-soft/30">
            <input type="date" id="daily-date-picker" value="${dailyReportDate}" class="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-main focus:ring-0 cursor-pointer p-0 text-center">
          </div>
          
          <!-- Daily Pie -->
          <div class="pt-4 space-y-6">
            <h4 class="text-[9px] font-black text-dim uppercase tracking-widest px-1">Daily Mix</h4>
            <div class="h-48 relative">
              <canvas id="daily-pie"></canvas>
            </div>
            <div id="daily-pie-legend" class="space-y-2 px-1"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- CHART INITIALIZATION ---
  setTimeout(() => {
    // 1. Cumulative Build-up
    const cumCtx = container.querySelector('#cumulative-build-chart');
    if (cumCtx) {
      new Chart(cumCtx, {
        type: 'line',
        data: {
          labels: Array.from({ length: 1440 }, (_, i) => `${Math.floor(i/60)}:${String(i%60).padStart(2,'0')}`),
          datasets: [
            {
              label: 'Time Logged',
              data: cumulativePoints,
              borderColor: '#338a81',
              backgroundColor: 'rgba(51, 138, 129, 0.1)',
              borderWidth: 3,
              fill: true,
              pointRadius: 0,
              tension: 0.2
            },
            {
              label: 'Target (8h)',
              data: Array(1440).fill(480),
              borderColor: '#ef4444',
              borderWidth: 1,
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#64748b', callback: (v, i) => i % 240 === 0 ? `${i/60}:00` : '' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 9 }, color: '#64748b', callback: (v) => `${(v/60).toFixed(0)}h` } }
          }
        }
      });
    }

    // 2. Daily Stacked Bar
    const dailyBarCtx = container.querySelector('#daily-stacked-bar');
    if (dailyBarCtx) {
      const datasets = Object.entries(dailyProjectData).map(([pid, data]) => ({
        label: projects.find(p => p.id == pid)?.name || 'Unknown',
        data: data.hourly,
        backgroundColor: projects.find(p => p.id == pid)?.color || '#eceff1',
        borderRadius: 4,
        borderWidth: 0
      }));
      new Chart(dailyBarCtx, {
        type: 'bar',
        data: { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { mode: 'index' } },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 }, color: '#64748b', callback: (v, i) => i % 4 === 0 ? `${i}:00` : '' } },
            y: { stacked: true, beginAtZero: true, max: 60, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 9 }, color: '#64748b', stepSize: 15, callback: (v) => `${v}m` } }
          }
        }
      });
    }

    // 3. Daily Pie
    const dailyPieCtx = container.querySelector('#daily-pie');
    if (dailyPieCtx) {
      const pieData = Object.entries(dailyProjectData).map(([pid, data]) => ({
        total: data.total,
        color: projects.find(p => p.id == pid)?.color || '#eceff1',
        name: projects.find(p => p.id == pid)?.name || 'Unknown'
      }));
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

    // 4. Comparison Grouped Bar
    const compBarCtx = container.querySelector('#comparison-grouped-bar');
    if (compBarCtx) {
      const labels = displayedComparisonPids.map(pid => projects.find(p => p.id == pid)?.name || 'Unknown');
      const actualData = displayedComparisonPids.map(pid => comparisonData[pid]?.actual || 0);
      const plannedData = displayedComparisonPids.map(pid => comparisonData[pid]?.planned || 0);
      new Chart(compBarCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Actual Work', data: actualData, backgroundColor: '#338a81', borderRadius: 4, barThickness: 24 },
            { label: 'Planned Time', data: plannedData, backgroundColor: '#475569', borderRadius: 4, barThickness: 24 }
          ]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { 
            legend: { position: 'top', align: 'end', labels: { boxWidth: 8, font: { size: 10, weight: 'bold' }, color: '#94a3b8' } },
            afterDatasetsDraw: (chart) => {
              const { ctx, data } = chart;
              ctx.save(); ctx.font = 'bold 10px Outfit'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
              data.datasets.forEach((dataset, i) => {
                chart.getDatasetMeta(i).data.forEach((bar, index) => {
                  const val = dataset.data[index];
                  if (val > 0) ctx.fillText(`${val.toFixed(1)}h`, bar.x + 8, bar.y);
                });
              });
              ctx.restore();
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 9 }, color: '#64748b', callback: (v) => `${v}h` }, suggestedMax: Math.max(...actualData, ...plannedData) * 1.2 },
            y: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' }, color: '#f8fafc' } }
          }
        }
      });
    }
  }, 100);

  // --- EVENT HANDLERS ---
  container.addEventListener('click', async (e) => {
    const dayBtn = e.target.closest('.day-select-btn');
    if (dayBtn) { dailyReportDate = dayBtn.dataset.date; refreshView(); }
    if (e.target.id === 'toggle-all-projects') { showAllProjects = !showAllProjects; refreshView(); }
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
      const entry = entries.find(ent => ent.id == editBtn.dataset.id);
      if (entry) openModal(entry);
    }
  });

  container.querySelector('#daily-date-picker').onchange = (e) => { dailyReportDate = e.target.value; refreshView(); };
  container.querySelector('#filter-project').onchange = (e) => { selectedProject = e.target.value; currentPage = 1; refreshView(); };

  async function refreshView() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(await renderReports());
  }

  // Modal logic simplified for brevity
  const openModal = (entry) => {
    const modalPortal = document.getElementById('modal-portal');
    modalPortal.innerHTML = `<div id="edit-modal" class="fixed inset-0 bg-secondary/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div class="bg-card rounded-2xl p-10 w-full max-w-lg shadow-2xl border border-soft">
        <h3 class="text-2xl font-bold text-main mb-8">Edit Entry</h3>
        <form id="edit-form" class="space-y-6">
          <input type="hidden" name="id" value="${entry.id}">
          <div class="space-y-2"><label class="text-[10px] font-black text-dim uppercase">Project</label>
          <select name="project_id" class="w-full bg-app border-none rounded-xl px-4 py-3 text-main font-bold">${projects.map(p => `<option value="${p.id}" ${entry.project_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}</select></div>
          <div class="space-y-2"><label class="text-[10px] font-black text-dim uppercase">Description</label>
          <input type="text" name="description" value="${entry.description || ''}" class="w-full bg-app border-none rounded-xl px-4 py-3 text-main font-bold"></div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2"><label class="text-[10px] font-black text-dim uppercase">Start</label><input type="datetime-local" name="start_time" value="${entry.start_time.slice(0,16)}" class="w-full bg-app border-none rounded-xl px-4 py-3 text-main font-bold"></div>
            <div class="space-y-2"><label class="text-[10px] font-black text-dim uppercase">End</label><input type="datetime-local" name="end_time" value="${entry.end_time.slice(0,16)}" class="w-full bg-app border-none rounded-xl px-4 py-3 text-main font-bold"></div>
          </div>
          <div class="flex gap-4 pt-6">
            <button type="button" onclick="this.closest('#edit-modal').remove()" class="flex-1 py-4 text-[10px] font-black uppercase text-dim tracking-widest">Cancel</button>
            <button type="submit" class="flex-[2] py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Save Changes</button>
          </div>
        </form>
      </div>
    </div>`;
    modalPortal.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      data.start_time = new Date(data.start_time).toISOString();
      data.end_time = new Date(data.end_time).toISOString();
      await api.post('time-entries.php', data);
      store.update('timeEntries', await api.get('time-entries.php'));
      modalPortal.innerHTML = '';
      refreshView();
    };
  };

  return container;
}
