/**
 * components/planner.js
 * 
 * Main Planner Controller (Refactored for Unified Task Model & Stable UI)
 */

import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { PlannerState } from './planner/planner-state.js';
import { PlannerUtils } from './planner/planner-utils.js';
import { PlannerTimeline } from './planner/planner-view-timeline.js';
import { PlannerKanban } from './planner/planner-view-kanban.js';
import { PlannerHeatmap } from './planner/planner-view-heatmap.js';
import { PlannerAnalytics } from './planner/planner-view-analytics.js';
import { TaskModal } from './task-modal.js';
import { TimeEntryModal } from './time-entry-modal.js';
import { ProjectModal } from './project-modal.js';

let currentScale = 'week';     // 'day', 'week', 'month'
let currentZoom = 'regular';  // 'compact', 'regular', 'relaxed'
let timeOffset = 0;           // 0 = today/start, +/- to move
let projectFilter = 'all';
let showSpans = true;
let currentView = 'timeline'; // 'timeline', 'kanban', 'heatmap', 'analytics'

export async function renderPlanner() {
    await PlannerState.init();

    const container = document.createElement('div');
    container.className = 'planner-main h-full flex flex-col gap-6';

    const state = store.get();
    const projects = state.projects || [];

    container.innerHTML = `
        <!-- Title Row -->
        <div class="px-2 shrink-0 mb-4">
            <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Timeline</h2>
            <h1 class="text-3xl font-light text-main tracking-tight">Project <span class="font-bold italic text-primary">Planning.</span></h1>
        </div>

        <!--Filter Bar-->
        <div class="flex items-center justify-between px-2 shrink-0 mb-3 gap-2 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
                <div class="flex items-center gap-1 bg-app/30 p-0.5 rounded-lg border border-white/5">
                    <button class="nav-btn p-1.5 text-dim hover:text-main" data-dir="-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button class="nav-btn px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-dim hover:text-main" data-dir="0">Today</button>
                    <button class="nav-btn p-1.5 text-dim hover:text-main" data-dir="1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
                <span id="period-label" class="text-[10px] font-black uppercase tracking-widest text-muted whitespace-nowrap shrink-0"></span>
                <select id="project-filter" class="h-7 min-w-[120px] bg-app/60 border border-black/5 dark:border-white/5 rounded-lg px-2 text-[10px] font-black uppercase tracking-widest text-main appearance-none cursor-pointer outline-none shadow-sm">
                    <option value="all">Global View</option>
                    ${projects.filter(p => !p.hide_from_gantt || projectFilter == p.id).map(p => `<option value="${p.id}" ${projectFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>

            <div class="flex items-center gap-3 flex-wrap">
                <div id="view-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5">
                    ${['timeline', 'kanban', 'heatmap', 'analytics'].map(v => {
                        const labels = { timeline: 'Roadmap', kanban: 'Board', heatmap: 'Workload', analytics: 'Analytics' };
                        return `<button class="view-toggle px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentView === v ? 'bg-card text-primary shadow-sm ring-1 ring-white/10' : 'text-dim opacity-40 hover:opacity-100 hover:bg-white/5'}" data-view="${v}">${labels[v]}</button>`;
                    }).join('')}
                </div>

                <div class="w-px h-5 bg-white/10"></div>

                <div id="scale-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5 ${currentView !== 'timeline' && currentView !== 'heatmap' ? 'hidden' : ''}">
                    ${['day', 'week', 'month', 'year'].map(s => {
                        const tooltips = { day: 'Tactical execution & time logging', week: 'Operational planning & sprint tracking', month: 'Strategic milestones & bottlenecks', year: 'Executive roadmap' };
                        return `<button class="scale-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentScale === s ? 'bg-card text-primary shadow-sm' : 'text-dim opacity-40'}" data-scale="${s}" title="${tooltips[s]}">${s}</button>`;
                    }).join('')}
                </div>
                <div id="zoom-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5 ${currentView !== 'timeline' ? 'hidden' : ''}">
                    ${['compact', 'regular', 'relaxed'].map(z => {
                        const tooltips = { compact: 'High density for pattern recognition & heat-mapping', regular: 'Standard view for daily work', relaxed: 'Presentation sizing' };
                        return `<button class="zoom-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentZoom === z ? 'bg-card text-primary shadow-sm' : 'text-dim opacity-40'}" data-zoom="${z}" title="${tooltips[z]}">${z}</button>`;
                    }).join('')}
                </div>
            </div>
        </div>

        <div class="flex gap-4 flex-grow min-h-0 items-stretch overflow-hidden">
            <div id="timeline-wrapper" class="w-full flex-grow flex flex-col bg-card/10 rounded-xl border border-white/5 overflow-hidden relative transition-all duration-500">
                 <div id="planner-timeline-container" class="flex-grow overflow-x-auto overflow-y-auto custom-scrollbar relative"></div>
            </div>
        </div>
    `;

    const updateUI = () => {
        const data = PlannerState.getCombinedData(projectFilter);
        const today = new Date();
        const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);

        // Period Label
        const periodLabel = container.querySelector('#period-label');
        if (periodLabel) {
            let label = '';
            if (currentScale === 'day') label = config.startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            else if (currentScale === 'week') label = `${config.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${config.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
            else if (currentScale === 'month') label = config.startDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            else if (currentScale === 'year') label = config.startDate.getFullYear().toString();
            periodLabel.textContent = label;
        }

        // Toggles classes
        container.querySelectorAll('.view-toggle').forEach(btn => {
            const active = btn.dataset.view === currentView;
            btn.classList.toggle('bg-card', active);
            btn.classList.toggle('text-primary', active);
            btn.classList.toggle('shadow-sm', active);
            btn.classList.toggle('ring-1', active);
            btn.classList.toggle('ring-white/10', active);
            btn.classList.toggle('text-dim', !active);
            btn.classList.toggle('opacity-40', !active);
        });

        // Hide toggle groups if irrelevant
        const scaleGroup = container.querySelector('#scale-toggle-container');
        const zoomGroup = container.querySelector('#zoom-toggle-container');
        if (scaleGroup) scaleGroup.classList.toggle('hidden', currentView !== 'timeline' && currentView !== 'heatmap');
        if (zoomGroup) zoomGroup.classList.toggle('hidden', currentView !== 'timeline');

        container.querySelectorAll('.scale-toggle').forEach(btn => {
            const active = btn.dataset.scale === currentScale;
            btn.classList.toggle('bg-card', active);
            btn.classList.toggle('text-primary', active);
            btn.classList.toggle('shadow-sm', active);
            btn.classList.toggle('text-dim', !active);
            btn.classList.toggle('opacity-40', !active);
        });
        container.querySelectorAll('.zoom-toggle').forEach(btn => {
            const active = btn.dataset.zoom === currentZoom;
            btn.classList.toggle('bg-card', active);
            btn.classList.toggle('text-primary', active);
            btn.classList.toggle('shadow-sm', active);
            btn.classList.toggle('text-dim', !active);
            btn.classList.toggle('opacity-40', !active);
        });

        // Render Views
        const timelineContainer = container.querySelector('#planner-timeline-container');
        if (currentView === 'timeline') {
            PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder, {});
        } else if (currentView === 'kanban') {
            PlannerKanban.render(timelineContainer, data, config, today, projectFilter);
        } else if (currentView === 'heatmap') {
            PlannerHeatmap.render(timelineContainer, data, config, today, currentScale);
        } else if (currentView === 'analytics') {
            PlannerAnalytics.render(timelineContainer, data, config, today, projectFilter);
        }
    };

    const handleLaneReorder = async (move) => {
        const data = PlannerState.getCombinedData(projectFilter);
        const proj = data.projects.find(p => String(p.id) === String(move.id));
        if (proj) { proj.lane_order = move.lane_order; updateUI(); }
        try { await api.post('projects.php', { lane_reorder: move }); store.update('projects', await api.get('projects.php')); } catch (err) { console.error(err); }
    };

    const refresh = async () => { await PlannerState.init(); updateUI(); };

    // Interactions
    container.addEventListener('click', async (e) => {
        // 1. Task Item Click (Open Modal)
        const taskEl = e.target.closest('.task-item') || e.target.closest('.task-bar');
        if (taskEl && !e.target.closest('button') && !e.target.closest('.inline-progress-bar')) {
            const stateData = PlannerState.getCombinedData('all');
            const task = [...stateData.backlog, ...stateData.rows.flatMap(r => r.tasks)].find(t => t.id == taskEl.dataset.taskId);
            if (task) TaskModal.open(task, { onSave: () => refresh() });
            return;
        }

        // 3. Inline Progress Bar Click (Increment by 15%)
        const progressBar = e.target.closest('.inline-progress-bar');
        if (progressBar) {
            e.stopPropagation();
            const taskId = progressBar.dataset.taskId;
            const currentProgress = parseInt(progressBar.dataset.progress) || 0;
            const newProgress = Math.min(100, currentProgress + 15);
            const task = (store.get().tasks || []).find(t => t.id == taskId);
            if (task) {
                task.progress = newProgress;
                if (newProgress >= 100) task.status = 'done';
                else if (task.status === 'done') task.status = 'todo';
                updateUI();
                await api.post('planner.php?action=update_task', { id: taskId, progress: newProgress, status: task.status });
            }
            return;
        }

        // Project Click
        const projectEl = e.target.closest('.project-legend-item') || e.target.closest('.proj-row');
        if (projectEl && projectEl.dataset.projectId) {
            const project = (store.get().projects || []).find(p => String(p.id) === String(projectEl.dataset.projectId));
            if (project) ProjectModal.open(project, { onSave: () => refresh() });
            return;
        }

        // Time Entry Click
        const entryEl = e.target.closest('.time-entry');
        if (entryEl) {
            const entry = (store.get().timeEntries || []).find(en => String(en.id) === String(entryEl.dataset.entryId));
            if (entry) TimeEntryModal.open(entry, { onSave: () => refresh() });
            return;
        }

        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) { const dir = parseInt(navBtn.dataset.dir); timeOffset = (dir === 0 ? 0 : timeOffset + dir); updateUI(); return; }

        const scaleBtn = e.target.closest('.scale-toggle');
        if (scaleBtn) { currentScale = scaleBtn.dataset.scale; currentZoom = 'regular'; timeOffset = 0; updateUI(); return; }

        const zoomBtn = e.target.closest('.zoom-toggle');
        if (zoomBtn) { currentZoom = zoomBtn.dataset.zoom; updateUI(); return; }

        const viewBtn = e.target.closest('.view-toggle');
        if (viewBtn) { currentView = viewBtn.dataset.view; updateUI(); return; }
    });

    container.querySelector('#project-filter').onchange = (e) => { projectFilter = e.target.value; updateUI(); };



    // Resize Observer for basic cleanup
    let resizeObserver = new ResizeObserver(() => {
        const data = PlannerState.getCombinedData(projectFilter);
        const today = new Date();
        const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);
        const timelineContainer = container.querySelector('#planner-timeline-container');
        if (!timelineContainer) return;

        if (currentView === 'timeline') {
            PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder, {});
        } else if (currentView === 'kanban') {
            PlannerKanban.render(timelineContainer, data, config, today, projectFilter);
        } else if (currentView === 'heatmap') {
            PlannerHeatmap.render(timelineContainer, data, config, today, currentScale);
        } else if (currentView === 'analytics') {
            PlannerAnalytics.render(timelineContainer, data, config, today, projectFilter);
        }
    });
    const timelineContainer = container.querySelector('#planner-timeline-container');
    if (timelineContainer) resizeObserver.observe(timelineContainer);

    updateUI();
    return container;
}
