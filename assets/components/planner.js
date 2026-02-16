/**
 * assets/components/planner.js
 * 
 * Main Planner Controller (Refactored for Unified Task Model & Stable UI)
 */

import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { PlannerState } from './planner/planner-state.js';
import { PlannerUtils } from './planner/planner-utils.js';
import { PlannerTimeline } from './planner/planner-view-timeline.js';
import { TaskList } from './task-list.js';
import { TaskQuickAdd } from './task-quick-add.js';
import { TaskModal } from './task-modal.js';
import { TimeEntryModal } from './time-entry-modal.js';
import { ProjectModal } from './project-modal.js';

let currentScale = 'week';     // 'day', 'week', 'month'
let currentZoom = 'regular';  // 'compact', 'regular', 'relaxed'
let timeOffset = 0;           // 0 = today/start, +/- to move
let sidebarCollapsed = window.innerWidth < 1440;
let projectFilter = 'all';
let sidebarFilters = { today: true, completed: false, planned: false, projects: false, backlog: false };
let showSpans = true;
let sidebarCompactMode = localStorage.getItem('planner_sidebar_compact') !== 'false'; // Default to true

export async function renderPlanner() {
    await PlannerState.init();

    // Listen for compact mode changes from other components
    const handleCompactChange = (e) => {
        sidebarCompactMode = e.detail.isCompact;
        updateUI();
    };
    window.addEventListener('compact-mode-change', handleCompactChange);

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
                <select id="project-filter" class="h-7 min-w-[120px] bg-app/60 border border-white/5 rounded-lg px-2 text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer outline-none shadow-sm">
                    <option value="all">Global View</option>
                    ${projects.map(p => `<option value="${p.id}" ${projectFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
                <div id="scale-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5">
                    ${['day', 'week', 'month', 'year'].map(s => `
                        <button class="scale-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentScale === s ? 'bg-card text-primary shadow-sm' : 'text-dim opacity-40'}" data-scale="${s}">${s}</button>
                    `).join('')}
                </div>
                <div id="zoom-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5">
                    ${['compact', 'regular', 'relaxed'].map(z => `
                        <button class="zoom-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentZoom === z ? 'bg-card text-primary shadow-sm' : 'text-dim opacity-40'}" data-zoom="${z}">${z}</button>
                    `).join('')}
                </div>
                <button id="toggle-spans-btn" class="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all border ${showSpans ? 'bg-primary/15 text-primary border-primary/30' : 'bg-app/30 text-dim border-white/5 opacity-40'}">
                    ▓ Spans
                </button>
            </div>
        </div>

        <div class="flex gap-4 flex-grow min-h-0 items-stretch overflow-hidden">
            <div id="timeline-wrapper" class="flex-grow flex flex-col bg-card/10 rounded-xl border border-white/5 overflow-hidden relative transition-all duration-500 min-w-0">
                 <div id="planner-timeline-container" class="flex-grow overflow-x-auto overflow-y-auto custom-scrollbar relative"></div>
            </div>

            <div id="planner-sidebar" class="${sidebarCollapsed ? 'w-10' : 'w-72 lg:w-[28rem] xl:w-[32rem]'} flex flex-col bg-sidebar/20 rounded-xl border border-white/5 overflow-y-auto overflow-x-hidden backdrop-blur-sm transition-all duration-500 relative shrink-0 min-w-0">
                <div id="sidebar-header-toggle" class="cursor-pointer group/sidebar-bar backdrop-blur-sm sticky top-0 z-20 flex flex-col items-center gap-1 transition-all duration-500">
                    <div id="header-top" class="w-full flex items-center justify-between">
                        <h3 class="px-2 text-[9px] font-black text-dim uppercase tracking-[0.2em] whitespace-nowrap">Todo</h3>
                        
                        <div class="flex items-center gap-1">
                            <div class="toggle-arrows flex items-center gap-1 text-dim group-hover/sidebar-bar:text-primary transition-colors">
                                <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                    <div id="collapsed-sidebar-label" class="hidden flex-col items-center gap-6 py-8 pointer-events-none">
                        <span class="text-[12px] font-black text-primary/40 group-hover/sidebar-bar:text-primary uppercase tracking-[0.6em]" style="writing-mode: vertical-rl; text-orientation: upright;">TODO</span>
                    </div>
                </div>

                <div id="sidebar-nav" class="flex-grow overflow-y-auto custom-scrollbar transition-all duration-500">
                    <div class="px-3 pt-3 pb-2">
                        <div id="sidebar-filter-tabs" class="w-full flex items-center justify-between p-1 bg-app/30 rounded-xl border border-white/5"></div>
                    </div>
                    
                    <!-- Quick Add -->
                    <div id="sidebar-quick-add-container" class="w-full px-3 pb-2"></div>

                    <div class="px-1 border-t border-white/5"><div id="planner-list-container" class="p-1 pb-10"></div></div>
                </div>
            </div>
        </div>
    `;

    const updateUI = () => {
        const data = PlannerState.getCombinedData(projectFilter);
        const today = new Date();
        const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);

        const sidebar = container.querySelector('#planner-sidebar');
        const sidebarNav = container.querySelector('#sidebar-nav');
        const sidebarHeader = container.querySelector('#sidebar-header-toggle');
        const headerTop = container.querySelector('#header-top');
        const labelEl = container.querySelector('#collapsed-sidebar-label');
        const arrowSvg = sidebarHeader.querySelector('svg');
        const titleEl = sidebarHeader.querySelector('h3');

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

        // Sidebar Dynamics
        sidebar.className = `${sidebarCollapsed ? 'w-10' : 'w-72 lg:w-[28rem] xl:w-[32rem]'} flex flex-col bg-sidebar/20 rounded-xl border border-white/5 overflow-y-auto overflow-x-hidden backdrop-blur-sm transition-all duration-500 relative shrink-0 min-w-0`;
        sidebarHeader.className = `cursor-pointer group/sidebar-bar backdrop-blur-sm sticky top-0 z-20 flex flex-col items-center gap-1 transition-all duration-500 ${sidebarCollapsed ? 'p-1 h-full bg-primary/5' : 'p-2 border-b border-white/5 bg-app/20'}`;
        sidebarNav.classList.toggle('hidden', sidebarCollapsed);
        headerTop.className = `w-full flex items-center ${sidebarCollapsed ? 'flex-col gap-6 py-8' : 'justify-between'}`;
        labelEl.classList.toggle('hidden', !sidebarCollapsed);
        labelEl.classList.toggle('flex', sidebarCollapsed);
        titleEl.classList.toggle('hidden', sidebarCollapsed);
        arrowSvg.classList.toggle('rotate-180', !sidebarCollapsed);


        // Sidebar filters
        const filterTabDefs = [
            { key: 'today', label: 'Today', icon: '☀' },
            { key: 'completed', label: 'Completed', icon: '✓' },
            { key: 'planned', label: 'Planned', icon: '📅' },
            { key: 'projects', label: 'Projects', icon: '▓' },
            { key: 'backlog', label: 'Backlog', icon: '📋' }
        ];
        const filterTabsEl = container.querySelector('#sidebar-filter-tabs');
        if (filterTabsEl) {
            filterTabsEl.innerHTML = filterTabDefs.map(f => `
                <button class="sidebar-filter-btn inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wide leading-none transition-all ${sidebarFilters[f.key] ? 'bg-primary/20 text-primary' : 'text-dim/50'}" data-filter="${f.key}">
                    <span class="text-[9px] leading-none">${f.icon}</span><span class="leading-none">${f.label}</span>
                </button>
            `).join('') + `
                <div class="w-px h-3 bg-white/10 mx-0.5"></div>
                <button id="sidebar-compact-toggle" title="Toggle Compact Mode" class="p-1 rounded-md transition-all ${sidebarCompactMode ? 'bg-primary/20 text-primary' : 'text-dim/50 hover:text-dim hover:bg-white/5'}">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            `;

            filterTabsEl.querySelectorAll('.sidebar-filter-btn').forEach(btn => {
                btn.onclick = () => {
                    const key = btn.dataset.filter;
                    sidebarFilters[key] = !sidebarFilters[key];
                    updateUI();
                };
            });

            const compactBtn = filterTabsEl.querySelector('#sidebar-compact-toggle');
            if (compactBtn) {
                compactBtn.onclick = () => {
                    sidebarCompactMode = !sidebarCompactMode;
                    localStorage.setItem('planner_sidebar_compact', String(sidebarCompactMode));
                    window.dispatchEvent(new CustomEvent('compact-mode-change', { detail: { isCompact: sidebarCompactMode } }));
                    updateUI();
                };
            }
        }

        // Sidebar Quick Add
        const quickAddContainer = container.querySelector('#sidebar-quick-add-container');
        if (quickAddContainer) {
            TaskQuickAdd.render(quickAddContainer, state.projects || [], {
                onAdd: refresh,
                placeholder: 'Quick add...',
                onToggleCompact: (val) => {
                    sidebarCompactMode = val;
                    updateUI();
                }
            });
        }

        // Render Views
        const listContainer = container.querySelector('#planner-list-container');
        const timelineContainer = container.querySelector('#planner-timeline-container');
        PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder, { showSpans });
        // Sidebar List Logic & Filtering
        let sidebarTasks = [...data.backlog, ...data.rows.flatMap(r => r.tasks)];

        if (sidebarFilters) {
            const todayMid = new Date(today); todayMid.setHours(0, 0, 0, 0);
            const tomMid = new Date(todayMid); tomMid.setDate(todayMid.getDate() + 1);

            const intersectsToday = (t) => {
                if (!t.start_date) return false;
                const s = new Date(t.start_date); s.setHours(0, 0, 0, 0);
                const e = t.end_date ? new Date(t.end_date) : s; e.setHours(23, 59, 59, 999);
                return s < tomMid && e >= todayMid;
            };

            const filtered = [];
            const seen = new Set();
            const add = (list) => list.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); filtered.push(t); } });

            // 1. Projects (Spans)
            if (sidebarFilters.projects) {
                add(sidebarTasks.filter(t => t.task_type === 'project_span'));
            }

            // 2. Today (Intersects Today, excludes spans and backlog status)
            if (sidebarFilters.today) {
                add(sidebarTasks.filter(t => (t.status === 'todo' || t.status === 'in-progress') && t.task_type !== 'project_span' && intersectsToday(t)));
            }

            // 3. Planned (Has date, doesn't intersect today, excludes spans and backlog status)
            if (sidebarFilters.planned) {
                add(sidebarTasks.filter(t => (t.status === 'todo' || t.status === 'in-progress') && t.task_type !== 'project_span' && t.start_date && !intersectsToday(t)));
            }

            // 4. Completed
            if (sidebarFilters.completed) {
                add(sidebarTasks.filter(t => t.status === 'done'));
            }

            // 5. Backlog (Backlog status OR No date tasks)
            if (sidebarFilters.backlog) {
                add(sidebarTasks.filter(t => t.status === 'backlog' || (!t.start_date && t.status !== 'done' && t.task_type !== 'project_span')));
            }

            // Fallback: If no filters are active, clear the list (matches previous behavior)
            if (!sidebarFilters.today && !sidebarFilters.planned && !sidebarFilters.projects && !sidebarFilters.completed && !sidebarFilters.backlog) {
                sidebarTasks = [];
            } else {
                sidebarTasks = filtered;
            }
        }

        TaskList.render(listContainer, sidebarTasks, data.projects, {
            mode: sidebarCompactMode ? 'compact' : 'full',
            showDone: sidebarFilters.completed
        });
    };

    const handleLaneReorder = async (move) => {
        const data = PlannerState.getCombinedData(projectFilter);
        const proj = data.projects.find(p => String(p.id) === String(move.id));
        if (proj) { proj.lane_order = move.lane_order; updateUI(); }
        try { await api.post('projects.php', { lane_reorder: move }); store.update('projects', await api.get('projects.php')); } catch (err) { console.error(err); }
    };

    const handleToggleSidebar = () => {
        sidebarCollapsed = !sidebarCollapsed;
        updateUI();
        const timelineWrapper = container.querySelector('#timeline-wrapper');
        if (timelineWrapper) setTimeout(() => window.dispatchEvent(new Event('resize')), 510);
    };

    const refresh = async () => { await PlannerState.init(); updateUI(); };

    // Interactions
    container.querySelector('#sidebar-header-toggle').onclick = (e) => {
        handleToggleSidebar();
    };

    container.addEventListener('click', async (e) => {
        // 1. Task Item Click (Open Modal)
        const taskEl = e.target.closest('.task-item') || e.target.closest('.task-bar');
        if (taskEl && !e.target.closest('button') && !e.target.closest('.inline-progress-bar')) {
            const stateData = PlannerState.getCombinedData('all');
            const task = [...stateData.backlog, ...stateData.rows.flatMap(r => r.tasks)].find(t => t.id == taskEl.dataset.taskId);
            if (task) TaskModal.open(task, { onSave: () => refresh() });
            return;
        }

        // 2. Status Toggle Click
        const statusBtn = e.target.closest('.toggle-status-btn');
        if (statusBtn) {
            e.stopPropagation();
            const taskId = statusBtn.dataset.taskId;
            const task = (store.get().tasks || []).find(t => t.id == taskId);
            if (task) {
                task.status = (task.status === 'done' ? 'todo' : 'done');
                task.progress = (task.status === 'done' ? 100 : 0);
                updateUI();
                await api.post('planner.php?action=update_task', { id: taskId, status: task.status, progress: task.progress });
            }
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

        // 4. Track Button Click
        const trackBtn = e.target.closest('.track-btn');
        if (trackBtn) {
            e.stopPropagation();
            const taskId = trackBtn.dataset.taskId;
            const task = (store.get().tasks || []).find(t => t.id == taskId);
            if (task) {
                const projects = store.get().projects || [];
                const startData = {
                    task_id: task.id,
                    project_id: task.project_id,
                    description: task.title,
                    project_name: projects.find(p => p.id == task.project_id)?.name || 'Unassigned',
                    resource_id: store.get().team?.[0]?.name || 'Main'
                };
                const result = await api.post('time-entries.php?action=start', startData);
                store.update('activeTimer', result);
                updateUI();
            }
            return;
        }

        const projectEl = e.target.closest('.project-legend-item');
        if (projectEl) {
            const project = (store.get().projects || []).find(p => String(p.id) === String(projectEl.dataset.projectId));
            if (project) ProjectModal.open(project, { onSave: () => refresh() });
            return;
        }

        const entryEl = e.target.closest('.time-entry');
        if (entryEl) {
            const entry = (store.get().timeEntries || []).find(en => String(en.id) === String(entryEl.dataset.entryId));
            if (entry) TimeEntryModal.open(entry, { onSave: () => refresh() });
            return;
        }

        const navCat = e.target.closest('.nav-cat');
        if (navCat) { sidebarFilters[navCat.dataset.cat] = !sidebarFilters[navCat.dataset.cat]; updateUI(); return; }

        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) { const dir = parseInt(navBtn.dataset.dir); timeOffset = (dir === 0 ? 0 : timeOffset + dir); updateUI(); return; }

        const scaleBtn = e.target.closest('.scale-toggle');
        if (scaleBtn) { currentScale = scaleBtn.dataset.scale; currentZoom = 'regular'; timeOffset = 0; updateUI(); return; }

        const zoomBtn = e.target.closest('.zoom-toggle');
        if (zoomBtn) { currentZoom = zoomBtn.dataset.zoom; updateUI(); return; }
    });


    container.querySelector('#project-filter').onchange = (e) => { projectFilter = e.target.value; updateUI(); };

    const spansBtn = container.querySelector('#toggle-spans-btn');
    if (spansBtn) spansBtn.onclick = () => { showSpans = !showSpans; updateUI(); };

    // Resize Observer for basic cleanup
    let resizeObserver = new ResizeObserver(() => {
        const data = PlannerState.getCombinedData(projectFilter);
        const today = new Date();
        const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);
        PlannerTimeline.render(container.querySelector('#planner-timeline-container'), data, config, today, currentZoom, handleLaneReorder, { showSpans });
    });
    const timelineContainer = container.querySelector('#planner-timeline-container');
    if (timelineContainer) resizeObserver.observe(timelineContainer);

    updateUI();
    return container;
}
