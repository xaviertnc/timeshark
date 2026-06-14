import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { TimeEntryModal } from './time-entry-modal.js';
import { ConfirmModal } from './confirm-modal.js';
import { PlannerState } from './planner/planner-state.js';
import { PlannerAnalytics } from './planner/planner-view-analytics.js';
import { PlannerActivity } from './planner/planner-view-activity.js';
import { SearchableSelect } from './searchable-select.js';

/**
 * components/reports.js
 *
 * Reports - 08 Feb 2026
 * Fixed modals, project selection logic and interactive pointer events.
 */

let currentPage = 1;
const DAYS_PER_PAGE = 5;
let projectFilter = [];
let selectedMember = '';
let dailyReportDate = localStorage.getItem('timeshark_reports_daily_date') || new Date().toLocaleDateString('en-CA');
let analyticsScale = localStorage.getItem('timeshark_reports_analytics_scale') || 'month';

export async function renderReports() {
  await PlannerState.init();
  
  const state = store.get();
  const rawEntries = state.timeEntries || [];
  const projects = state.projects || [];
  
  const hiddenProjectIds = new Set(projects.filter(p => p.hide_from_gantt == 1 && !projectFilter.includes(String(p.id))).map(p => String(p.id)));
  const entries = rawEntries.filter(e => !hiddenProjectIds.has(String(e.project_id)));
  
  const plannerData = PlannerState.getCombinedData(projectFilter.length > 0 ? projectFilter : 'all');
  const today = new Date();
  
  const generateDates = (days) => {
      const dates = [];
      for (let i = days; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          d.setHours(0,0,0,0);
          dates.push(d);
      }
      return dates;
  };
  const timeframes = { 'week': 7, 'month': 30, 'quarter': 90 };
  const analyticsConfig = { dates: generateDates(timeframes[analyticsScale] || 30) };

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
    if (projectFilter.length > 0 && !projectFilter.includes(String(e.project_id))) return false;
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
    <!-- Performance Section -->
    <div class="flex items-end justify-between px-2 mb-6 mt-4">
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


      </div>

      <div class="lg:w-[320px] space-y-8 flex-shrink-0">
        <div class="bg-card rounded-2xl p-5 border border-soft shadow-soft space-y-4 sticky top-8">
          <div class="flex gap-1 bg-app rounded-xl p-1 border border-soft">
            <button class="day-select-btn flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${dailyReportDate === todayStr ? 'bg-primary text-white shadow-md' : 'text-dim hover:text-main'}" data-date="${todayStr}">Today</button>
            <button class="day-select-btn flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${dailyReportDate === yesterdayStr ? 'bg-primary text-white shadow-md' : 'text-dim hover:text-main'}" data-date="${yesterdayStr}">Yesterday</button>
          </div>
          <div class="flex items-center justify-between px-2 py-3 rounded-xl border transition-all ${(![todayStr, yesterdayStr].includes(dailyReportDate)) ? 'bg-primary border-primary text-white shadow-md' : 'bg-app/50 border-soft'}">
            <button class="prev-daily-btn w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <input type="date" id="daily-date-picker" value="${dailyReportDate}" class="bg-transparent border-none text-[10px] font-black uppercase tracking-widest ${(![todayStr, yesterdayStr].includes(dailyReportDate)) ? 'text-white' : 'text-main'} focus:ring-0 cursor-pointer p-0 text-center flex-1 mx-1">
            <button class="next-daily-btn w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
          <div class="pt-4 space-y-6">
            <h4 class="text-[9px] font-black text-dim uppercase tracking-widest px-1">Daily Mix</h4>
            <div class="h-48 relative"><canvas id="daily-pie"></canvas></div>
            <div id="daily-pie-legend" class="space-y-2 px-1"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Section -->
    <div class="mt-16 pt-8 border-t border-b border-white/5 pb-12 mb-12">
        <div class="flex items-end justify-between px-2 mb-6">
          <div>
            <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Project Analytics</h2>
            <h1 class="text-3xl font-light text-main tracking-tight">Delivery <span class="font-bold italic text-primary">Overview.</span></h1>
          </div>
          <div class="flex items-center gap-3">
             <div id="reports-project-filter-container" class="w-[200px] h-7 relative z-10 shrink-0 mr-2"></div>
             <div class="flex gap-2">
                 ${['week', 'month', 'quarter'].map(s => {
                     const labels = { week: 'Past Week', month: 'Past Month', quarter: 'Past Quarter' };
                     const active = analyticsScale === s;
                     return `<button class="analytics-scale-btn px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-card text-primary shadow-sm ring-1 ring-white/10' : 'text-dim opacity-40 hover:opacity-100 hover:bg-white/5'}" data-scale="${s}">${labels[s]}</button>`;
                 }).join('')}
             </div>
          </div>
        </div>
        <div id="project-analytics-container" class="w-full bg-card/10 rounded-xl border border-white/5 overflow-hidden flex flex-col h-[500px]"></div>
    </div>
    
    <div id="reports-activity-container" class="w-full flex flex-col mt-4"></div>
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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#64748b', callback: (v, i) => i % 240 === 0 ? `${i / 60}:00` : '' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, ticks: { font: { size: 9 }, color: '#64748b', stepSize: 60, callback: (v) => `${(v / 60).toFixed(0)}h` } } } }
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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
        plugins: [{
          id: 'percentLabels',
          afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            ctx.save();
            const meta = chart.getDatasetMeta(0);
            const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
            if (total === 0) return;
            meta.data.forEach((arc, i) => {
              const val = data.datasets[0].data[i];
              if (val === 0) return;
              const percent = Math.round((val / total) * 100);
              if (percent < 5) return;
              
              const centerPoint = arc.tooltipPosition();
              ctx.font = '9px sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = 'rgba(0,0,0,0.8)';
              ctx.shadowBlur = 3;
              ctx.fillText(percent + '%', centerPoint.x, centerPoint.y);
            });
            ctx.restore();
          }
        }]
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
    
    const analyticsContainer = container.querySelector('#project-analytics-container');
    if (analyticsContainer) {
        PlannerAnalytics.render(analyticsContainer, plannerData, analyticsConfig, today, projectFilter);
    }

    const activityContainer = container.querySelector('#reports-activity-container');
    if (activityContainer) {
        PlannerActivity.render(activityContainer, PlannerState.getCombinedData('all'));
    }
    
    const filterContainer = container.querySelector('#reports-project-filter-container');
    if (filterContainer) {
        SearchableSelect.render(filterContainer, projects.filter(p => !p.hide_from_gantt), {
            value: projectFilter,
            multiple: true,
            placeholder: 'Global View',
            allLabel: 'All Projects',
            size: 'small',
            clearable: true,
            alignTarget: '#reports-project-filter-container',
            onChange: (newVal) => {
                projectFilter = newVal;
                refreshView(); 
            }
        });
    }
  }, 100);

  container.addEventListener('click', async (e) => {
    const dayBtn = e.target.closest('.day-select-btn');
    if (dayBtn) { 
        dailyReportDate = dayBtn.dataset.date; 
        localStorage.setItem('timeshark_reports_daily_date', dailyReportDate);
        refreshView(); 
    }
    
    if (e.target.closest('.prev-daily-btn')) {
        const d = new Date(dailyReportDate + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        dailyReportDate = d.toLocaleDateString('en-CA');
        localStorage.setItem('timeshark_reports_daily_date', dailyReportDate);
        refreshView();
    }
    
    if (e.target.closest('.next-daily-btn')) {
        const d = new Date(dailyReportDate + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        dailyReportDate = d.toLocaleDateString('en-CA');
        localStorage.setItem('timeshark_reports_daily_date', dailyReportDate);
        refreshView();
    }
    
    const scaleBtn = e.target.closest('.analytics-scale-btn');
    if (scaleBtn) { 
        analyticsScale = scaleBtn.dataset.scale; 
        localStorage.setItem('timeshark_reports_analytics_scale', analyticsScale);
        refreshView(); 
    }

    if (e.target.closest('#prev-page') && currentPage > 1) { currentPage--; refreshView(); }
    if (e.target.closest('#next-page') && currentPage < totalPages) { currentPage++; refreshView(); }
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      const confirmed = await ConfirmModal.show('Delete this entry?', { confirmText: 'Delete Entry', isDestructive: true });
      if (confirmed) {
        await api.delete(`time-entries.php?id=${deleteBtn.dataset.id}`);
        store.update('timeEntries', await api.get('time-entries.php'));
        refreshView();
      }
    }
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      const entry = entries.find(ent => String(ent.id) === String(editBtn.dataset.id));
      if (entry) TimeEntryModal.open(entry, { onSave: refreshView });
    }
  });

  container.querySelector('#daily-date-picker').onchange = (e) => { 
      dailyReportDate = e.target.value; 
      localStorage.setItem('timeshark_reports_daily_date', dailyReportDate);
      refreshView(); 
  };


  async function refreshView() {
    const app = document.getElementById('app');
    const scrollY = window.scrollY;
    const appScroll = app.scrollTop;

    const newContent = await renderReports();
    app.innerHTML = '';
    app.appendChild(newContent);

    window.scrollTo(0, scrollY);
    app.scrollTop = appScroll;
  }


  return container;
}

