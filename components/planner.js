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
import { PlannerAnalytics } from './planner/planner-view-analytics.js';
import { TaskModal } from './task-modal.js';
import { TimeEntryModal } from './time-entry-modal.js';
import { ProjectModal } from './project-modal.js';
import { SearchableSelect } from './searchable-select.js';

let currentScale = localStorage.getItem('timeshark_planner_scale') || 'week';     // 'day', 'week', 'month'
let currentZoom = localStorage.getItem(`timeshark_planner_zoom_${currentScale}`) || 'regular';  // 'compact', 'regular', 'relaxed'
let timeOffset = 0;           // 0 = today/start, +/- to move
let projectFilter = [];       // empty is global
let showSpans = true;
let currentView = localStorage.getItem('timeshark_planner_view') || 'timeline'; // 'timeline', 'kanban', 'analytics'
let subtleEpics = localStorage.getItem(`timeshark_planner_subtle_epics_${currentScale}`) === 'true';
let showEpics = localStorage.getItem(`timeshark_planner_show_epics_${currentScale}`) !== 'false';
let showTimeEntries = localStorage.getItem(`timeshark_planner_show_time_entries_${currentScale}`) !== 'false';
let showTasks = localStorage.getItem(`timeshark_planner_show_tasks_${currentScale}`) !== 'false';
let showOps = localStorage.getItem(`timeshark_planner_show_ops_${currentScale}`) !== 'false';


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
        <div class="flex items-center justify-between px-2 shrink-0 mb-3 gap-4 flex-wrap">
            <div class="flex items-center gap-3 flex-wrap">
                <div id="project-filter-container" class="w-[200px] h-7 relative z-10 shrink-0"></div>
                
                <div class="flex items-center gap-1 bg-app/30 p-0.5 rounded-lg border border-white/5 shrink-0">
                    <button class="nav-btn p-1.5 text-dim hover:text-main" data-dir="-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button class="nav-btn px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-dim hover:text-main" data-dir="0">Today</button>
                    <button class="nav-btn p-1.5 text-dim hover:text-main" data-dir="1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
                <span id="period-label" class="text-[10px] font-black uppercase tracking-widest text-muted whitespace-nowrap shrink-0"></span>
            </div>

            <div class="flex items-center gap-3 flex-wrap">
                <div id="view-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5">
                    ${['timeline', 'kanban'].map(v => {
                        const labels = { timeline: 'Gantt', kanban: 'Kanban' };
                        return `<button class="view-toggle px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentView === v ? 'bg-card text-primary shadow-sm ring-1 ring-white/10' : 'text-dim opacity-40 hover:opacity-100 hover:bg-white/5'}" data-view="${v}">${labels[v]}</button>`;
                    }).join('')}
                </div>

                <div class="w-px h-5 bg-white/10"></div>

                <div id="scale-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5 ${currentView !== 'timeline' && currentView !== 'kanban' ? 'hidden' : ''}">
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

                <div id="epic-span-toggle-container" class="flex items-center bg-app/30 px-2 h-7 rounded-lg border border-white/5 gap-4 ${currentView !== 'timeline' ? 'hidden' : ''}">
                    <label class="flex items-center gap-2 cursor-pointer group mb-0">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim group-hover:text-main transition-colors mt-0.5">Show Epics</span>
                        <div class="relative w-7 h-4 bg-black/20 rounded-full border border-white/10 transition-colors">
                            <input type="checkbox" id="show-epics-toggle" class="sr-only" ${showEpics ? 'checked' : ''}>
                            <div class="absolute left-1 top-[1px] w-3 h-3 rounded-full transition-all ${showEpics ? 'translate-x-3 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                        </div>
                    </label>
                    <label id="subtle-epics-label" class="flex items-center gap-2 cursor-pointer group mb-0 transition-opacity">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim group-hover:text-main transition-colors mt-0.5">Subtle Epics</span>
                        <div class="relative w-7 h-4 bg-black/20 rounded-full border border-white/10 transition-colors">
                            <input type="checkbox" id="subtle-epics-toggle" class="sr-only" ${subtleEpics ? 'checked' : ''}>
                            <div class="absolute left-1 top-[1px] w-3 h-3 rounded-full transition-all ${subtleEpics ? 'translate-x-3 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                        </div>
                    </label>
                    <div class="w-px h-4 bg-white/10 ml-2 mr-2"></div>
                    <label class="flex items-center gap-2 cursor-pointer group mb-0">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim group-hover:text-main transition-colors mt-0.5">Logs</span>
                        <div class="relative w-7 h-4 bg-black/20 rounded-full border border-white/10 transition-colors">
                            <input type="checkbox" id="show-time-toggle" class="sr-only" ${showTimeEntries ? 'checked' : ''}>
                            <div class="absolute left-1 top-[1px] w-3 h-3 rounded-full transition-all ${showTimeEntries ? 'translate-x-3 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                        </div>
                    </label>
                    <div class="w-px h-4 bg-white/10 mx-2"></div>
                    <label class="flex items-center gap-2 cursor-pointer group mb-0">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim group-hover:text-main transition-colors mt-0.5">Tasks</span>
                        <div class="relative w-7 h-4 bg-black/20 rounded-full border border-white/10 transition-colors">
                            <input type="checkbox" id="show-tasks-toggle" class="sr-only" ${showTasks ? 'checked' : ''}>
                            <div class="absolute left-1 top-[1px] w-3 h-3 rounded-full transition-all ${showTasks ? 'translate-x-3 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                        </div>
                    </label>
                    <div class="w-px h-4 bg-white/10 mx-2"></div>
                    <label class="flex items-center gap-2 cursor-pointer group mb-0">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim group-hover:text-main transition-colors mt-0.5">OPS</span>
                        <div class="relative w-7 h-4 bg-black/20 rounded-full border border-white/10 transition-colors">
                            <input type="checkbox" id="show-ops-toggle" class="sr-only" ${showOps ? 'checked' : ''}>
                            <div class="absolute left-1 top-[1px] w-3 h-3 rounded-full transition-all ${showOps ? 'translate-x-3 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                        </div>
                    </label>
                </div>
            </div>
        </div>

        <div class="flex gap-4 flex-grow min-h-0 items-stretch overflow-hidden">
            <div id="timeline-wrapper" class="w-full flex-grow flex flex-col bg-card/10 rounded-xl border border-white/5 overflow-hidden relative transition-all duration-500">
                 <div id="planner-timeline-container" class="flex-grow overflow-x-auto overflow-y-auto custom-scrollbar relative"></div>
            </div>
        </div>
    `;

    const renderFilterUI = () => {
        const filterContainer = container.querySelector('#project-filter-container');
        if (filterContainer) {
            const currentProjs = store.get().projects || [];
            SearchableSelect.render(filterContainer, currentProjs.filter(p => !p.hide_from_gantt), {
                value: projectFilter,
                multiple: true,
                placeholder: 'Global View',
                allLabel: 'All Projects',
                size: 'small',
                clearable: true,
                alignTarget: '#project-filter-container',
                onChange: (newVal) => {
                    projectFilter = newVal;
                    updateUI(); 
                }
            });
        }
    };
    renderFilterUI();

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
        const epicGroup = container.querySelector('#epic-span-toggle-container');
        if (scaleGroup) scaleGroup.classList.toggle('hidden', currentView !== 'timeline' && currentView !== 'kanban');
        if (zoomGroup) zoomGroup.classList.toggle('hidden', currentView !== 'timeline');
        if (epicGroup) epicGroup.classList.toggle('hidden', currentView !== 'timeline');

        const showEpicsToggleInput = container.querySelector('#show-epics-toggle');
        if (showEpicsToggleInput) {
            showEpicsToggleInput.checked = showEpics;
            const knob = showEpicsToggleInput.nextElementSibling;
            if (showEpics) {
                knob.classList.add('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.remove('bg-dim');
            } else {
                knob.classList.remove('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.add('bg-dim');
            }
        }

        const subtleEpicsLabel = container.querySelector('#subtle-epics-label');
        if (subtleEpicsLabel) {
            if (showEpics) subtleEpicsLabel.classList.remove('hidden');
            else subtleEpicsLabel.classList.add('hidden');
        }

        const subtleEpicsToggleInput = container.querySelector('#subtle-epics-toggle');
        if (subtleEpicsToggleInput) {
            subtleEpicsToggleInput.checked = subtleEpics;
            const knob = subtleEpicsToggleInput.nextElementSibling;
            if (subtleEpics) {
                knob.classList.add('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.remove('bg-dim');
            } else {
                knob.classList.remove('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.add('bg-dim');
            }
        }

        const showTimeToggleInput = container.querySelector('#show-time-toggle');
        if (showTimeToggleInput) {
            showTimeToggleInput.checked = showTimeEntries;
            const knob = showTimeToggleInput.nextElementSibling;
            if (showTimeEntries) {
                knob.classList.add('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.remove('bg-dim');
            } else {
                knob.classList.remove('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.add('bg-dim');
            }
        }

        const showTasksToggleInput = container.querySelector('#show-tasks-toggle');
        if (showTasksToggleInput) {
            showTasksToggleInput.checked = showTasks;
            const knob = showTasksToggleInput.nextElementSibling;
            if (showTasks) {
                knob.classList.add('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.remove('bg-dim');
            } else {
                knob.classList.remove('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.add('bg-dim');
            }
        }

        const showOpsToggleInput = container.querySelector('#show-ops-toggle');
        if (showOpsToggleInput) {
            showOpsToggleInput.checked = showOps;
            const knob = showOpsToggleInput.nextElementSibling;
            if (showOps) {
                knob.classList.add('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.remove('bg-dim');
            } else {
                knob.classList.remove('translate-x-3', 'bg-primary', 'shadow-[0_0_8px_rgba(51,138,129,0.5)]');
                knob.classList.add('bg-dim');
            }
        }

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
            PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder, { subtleEpics, showEpics, showTimeEntries, showTasks, showOps });
        } else if (currentView === 'kanban') {
            PlannerKanban.render(timelineContainer, data, config, today, projectFilter, { refresh });
        }
    };

    const handleLaneReorder = async (move) => {
        const data = PlannerState.getCombinedData(projectFilter);
        const proj = data.projects.find(p => String(p.id) === String(move.id));
        if (proj) { proj.lane_order = move.lane_order; updateUI(); }
        try { await api.post('projects.php', { lane_reorder: move }); store.update('projects', await api.get('projects.php')); } catch (err) { console.error(err); }
    };

    const refresh = async () => { await PlannerState.init(); renderFilterUI(); updateUI(); };

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

        // Kanban Add Task
        const addKanbanBtn = e.target.closest('.add-kanban-task-btn');
        if (addKanbanBtn) {
            e.stopPropagation();
            TaskModal.open(null, { onSave: () => refresh(), defaults: { status: addKanbanBtn.dataset.status } });
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
                const updatePayload = { id: taskId, progress: newProgress, status: task.status };
                // Backdate future dates when completing
                if (task.status === 'done') {
                    const now = new Date();
                    updatePayload.completed_at = now.toISOString();
                    if (task.start_date) {
                        const todayStr = now.toISOString().split('T')[0];
                        const startTime = new Date(task.start_date).getTime();
                        const endTime = task.end_date ? new Date(task.end_date).getTime() : startTime;
                        const nowTime = now.getTime();
                        if (startTime > nowTime && endTime > nowTime) {
                            updatePayload.start_date = `${todayStr}T${now.toTimeString().substring(0, 5)}:00`;
                            const endDt = new Date(nowTime + 3600000);
                            updatePayload.end_date = `${todayStr}T${endDt.toTimeString().substring(0, 5)}:00`;
                        } else if (endTime > nowTime) {
                            updatePayload.end_date = `${todayStr}T${now.toTimeString().substring(0, 5)}:00`;
                        }
                    }
                }
                await api.post('planner.php?action=update_task', updatePayload);
            }
            return;
        }

        // Project Click
        const projectEl = e.target.closest('.project-legend-item') || e.target.closest('.proj-row') || e.target.closest('.project-envelope');
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
        if (scaleBtn) { 
            currentScale = scaleBtn.dataset.scale; 
            localStorage.setItem('timeshark_planner_scale', currentScale);
            currentZoom = localStorage.getItem(`timeshark_planner_zoom_${currentScale}`) || 'regular';
            subtleEpics = localStorage.getItem(`timeshark_planner_subtle_epics_${currentScale}`) === 'true';
            showEpics = localStorage.getItem(`timeshark_planner_show_epics_${currentScale}`) !== 'false';
            showTimeEntries = localStorage.getItem(`timeshark_planner_show_time_entries_${currentScale}`) !== 'false';
            showTasks = localStorage.getItem(`timeshark_planner_show_tasks_${currentScale}`) !== 'false';
            showOps = localStorage.getItem(`timeshark_planner_show_ops_${currentScale}`) !== 'false';
            timeOffset = 0; 
            updateUI(); 
            return; 
        }

        const zoomBtn = e.target.closest('.zoom-toggle');
        if (zoomBtn) { 
            currentZoom = zoomBtn.dataset.zoom; 
            localStorage.setItem(`timeshark_planner_zoom_${currentScale}`, currentZoom);
            updateUI(); 
            return; 
        }

        const viewBtn = e.target.closest('.view-toggle');
        if (viewBtn) { 
            currentView = viewBtn.dataset.view; 
            localStorage.setItem('timeshark_planner_view', currentView);
            updateUI(); 
            return; 
        }
    });

    container.addEventListener('change', (e) => {
        if (e.target.id === 'subtle-epics-toggle') {
            subtleEpics = e.target.checked;
            localStorage.setItem(`timeshark_planner_subtle_epics_${currentScale}`, subtleEpics);
            updateUI();
        }
        if (e.target.id === 'show-epics-toggle') {
            showEpics = e.target.checked;
            localStorage.setItem(`timeshark_planner_show_epics_${currentScale}`, showEpics);
            updateUI();
        }
        if (e.target.id === 'show-time-toggle') {
            showTimeEntries = e.target.checked;
            localStorage.setItem(`timeshark_planner_show_time_entries_${currentScale}`, showTimeEntries);
            updateUI();
        }
        if (e.target.id === 'show-tasks-toggle') {
            showTasks = e.target.checked;
            localStorage.setItem(`timeshark_planner_show_tasks_${currentScale}`, showTasks);
            updateUI();
        }
        if (e.target.id === 'show-ops-toggle') {
            showOps = e.target.checked;
            localStorage.setItem(`timeshark_planner_show_ops_${currentScale}`, showOps);
            updateUI();
        }
    });

    // Resize Observer for basic cleanup
    let resizeObserver = new ResizeObserver(() => {
        const data = PlannerState.getCombinedData(projectFilter);
        const today = new Date();
        const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);
        const timelineContainer = container.querySelector('#planner-timeline-container');
        if (!timelineContainer) return;

        if (currentView === 'timeline') {
            PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder, { subtleEpics, showEpics, showTimeEntries, showTasks, showOps });
        } else if (currentView === 'kanban') {
            PlannerKanban.render(timelineContainer, data, config, today, projectFilter, { refresh });
        }
    });
    const timelineContainer = container.querySelector('#planner-timeline-container');
    if (timelineContainer) resizeObserver.observe(timelineContainer);

    updateUI();
    return container;
}
