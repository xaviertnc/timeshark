/**
 * assets/components/planner.js
 * 
 * Main Planner Controller (Refactored for Unified Task Model)
 */

import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { PlannerState } from './planner/planner-state.js';
import { PlannerUtils } from './planner/planner-utils.js';
import { PlannerTimeline } from './planner/planner-view-timeline.js';
import { PlannerList } from './planner/planner-view-list.js';
import { PlannerModal } from './planner/planner-modal.js';
import { TimeEntryModal } from './time-entry-modal.js';


let currentScale = 'week';     // 'day', 'week', 'month'
let currentZoom = 'regular';  // 'compact', 'regular', 'relaxed'
let timeOffset = 0;           // 0 = today/start, +/- to move
let sidebarCollapsed = false;
let projectFilter = 'all';
// displayLimit removed — all tasks shown, no artificial cap
let sidebarFilters = { today: true, completed: false, planned: false, projects: false };
let showSpans = true;
let sidebarCompactMode = localStorage.getItem('planner_sidebar_compact') === 'true';


export async function renderPlanner() {

    // Initialize State
    await PlannerState.init();

    // Setup Main Layout
    const container = document.createElement('div');
    container.className = 'planner-main h-full flex flex-col gap-6';

    // Header & Controls
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

                <!-- Period Label -->
                <span id="period-label" class="text-[10px] font-black uppercase tracking-widest text-muted whitespace-nowrap shrink-0"></span>

                <!-- Project Filter -->
                <div class="relative inline-block shrink-0">
                    <select id="project-filter" class="h-7 min-w-[120px] max-w-[180px] bg-app/60 border border-white/5 rounded-lg px-2 py-0 text-[10px] font-black uppercase tracking-widest text-white appearance-none cursor-pointer pr-7 focus:ring-1 focus:ring-primary/20 transition-all outline-none shadow-sm">
                        <option value="all" ${projectFilter === 'all' ? 'selected' : ''}>Global View</option>
                        ${projects.map(p => `<option value="${p.id}" ${projectFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                    <div class="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-dim opacity-50">
                        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
                <!-- Scale Toggle -->
                <div id="scale-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5">
                    ${['day', 'week', 'month', 'year'].map(s => `
                        <button class="scale-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentScale === s ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-muted opacity-40 hover:opacity-100'}" data-scale="${s}">
                            ${s}
                        </button>
                    `).join('')}
                </div>

                <!-- Zoom Toggle -->
                <div id="zoom-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5">
                    ${['compact', 'regular', 'relaxed'].map(z => `
                        <button class="zoom-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentZoom === z ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-muted opacity-40 hover:opacity-100'}" data-zoom="${z}">
                            ${z}
                        </button>
                    `).join('')}
                </div>

                <!-- Spans Toggle -->
                <button id="toggle-spans-btn" class="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all border ${showSpans ? 'bg-primary/15 text-primary border-primary/30' : 'bg-app/30 text-dim border-white/5 opacity-40 hover:opacity-100'}">
                    ▓ Spans
                </button>


            </div>
        </div>

        <div class="flex gap-4 flex-grow min-h-0 items-stretch overflow-hidden">
            <!-- Timeline -->
            <div id="timeline-wrapper" class="flex-grow flex flex-col bg-card/10 rounded-xl border border-white/5 overflow-hidden relative transition-all duration-500 min-w-0">
                 <div id="planner-timeline-container" class="flex-grow overflow-x-auto overflow-y-auto custom-scrollbar relative">
                    <!-- Timeline Content -->
                 </div>
            </div>



            <!-- Sidebar: Navigation & Tasks (RIGHT side) -->
            <div id="planner-sidebar" class="${sidebarCollapsed ? 'w-10' : 'w-72 lg:w-[28rem] xl:w-[32rem]'} flex flex-col bg-sidebar/20 rounded-xl border border-white/5 overflow-y-auto overflow-x-hidden backdrop-blur-sm transition-all duration-500 relative shrink-0 min-w-0">
                <!-- Sidebar Header -->
                <div class="${sidebarCollapsed ? 'p-1 justify-center' : 'p-2 justify-between'} border-b border-white/5 bg-app/20 backdrop-blur-sm sticky top-0 z-20 flex items-center min-h-[36px] gap-1">
                    <h3 id="sidebar-title" class="px-2 text-[9px] font-black text-dim uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden transition-all duration-500 ${sidebarCollapsed ? 'hidden' : 'block'}">Todo</h3>

                    <div class="flex items-center gap-0.5 shrink-0">
                        <button id="toggle-compact-mode-btn" class="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-main shrink-0 ${sidebarCollapsed ? 'hidden' : 'block'}" title="Toggle compact mode">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <button id="toggle-sidebar-btn" class="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-main shrink-0">
                            <svg class="w-3.5 h-3.5 transition-transform duration-500 ${sidebarCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 5l7 7-7 7m-8-14l7 7-7 7"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- Sidebar Content -->
                <div id="sidebar-nav" class="flex-grow overflow-y-auto custom-scrollbar transition-all duration-500 ${sidebarCollapsed ? 'opacity-0' : 'opacity-100'}">
                    <!-- Quick-add input -->
                    <div class="px-3 pt-3 pb-2">
                        <div class="flex items-center gap-1.5 bg-white/3 hover:bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 transition-all focus-within:bg-white/5 focus-within:ring-1 focus-within:ring-primary/20">
                            <svg class="w-3 h-3 text-primary/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                            <input type="text" id="sidebar-quick-add" placeholder="Add a task..." class="flex-1 bg-transparent border-none text-[13px] font-bold text-main outline-none placeholder:text-dim/15 placeholder:font-normal min-w-0" style="background: transparent; padding: 0; box-shadow: none;">
                        </div>
                    </div>

                    <!-- Filter toggle tabs (single row) -->
                    <div class="px-3 pb-2">
                        <div id="sidebar-filter-tabs" class="flex items-center gap-1 flex-wrap"></div>
                    </div>

                    <!-- Task list -->
                    <div class="px-1 border-t border-white/5">
                        <div id="planner-list-container" class="p-1 pb-10">
                            <!-- TODO Items Rendered Here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize Modal
    PlannerModal.render('modal-portal');
    PlannerModal.onSave = () => refresh();

    // Initial Render
    const updateUI = () => {
        const data = PlannerState.getCombinedData(projectFilter);
        const today = new Date();
        const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);

        const listContainer = container.querySelector('#planner-list-container');
        const timelineContainer = container.querySelector('#planner-timeline-container');
        const timelineWrapper = container.querySelector('#timeline-wrapper');
        const scaleContainer = container.querySelector('#scale-toggle-container');
        const sidebar = container.querySelector('#planner-sidebar');
        const sidebarTitle = sidebar.querySelector('h3');
        const sidebarNav = sidebar.querySelector('#sidebar-nav');
        const toggleSidebarBtn = sidebar.querySelector('#toggle-sidebar-btn');
        const periodLabel = container.querySelector('#period-label');
        const zoomContainer = container.querySelector('#zoom-toggle-container');

        // Update period label
        if (periodLabel) {
            let label = '';
            if (currentScale === 'day') {
                label = config.startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            } else if (currentScale === 'week') {
                const s = config.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const e = config.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                label = `${s} – ${e}`;
            } else if (currentScale === 'month') {
                label = config.startDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            } else if (currentScale === 'year') {
                label = config.startDate.getFullYear().toString();
            }
            periodLabel.textContent = label;
        }

        // Update Scale Toggle States
        container.querySelectorAll('.scale-toggle').forEach(btn => {
            if (btn.dataset.scale === currentScale) {
                btn.classList.add('bg-card', 'text-primary', 'shadow-sm', 'opacity-100');
                btn.classList.remove('text-dim', 'opacity-40');
            } else {
                btn.classList.remove('bg-card', 'text-primary', 'shadow-sm', 'opacity-100');
                btn.classList.add('text-dim', 'opacity-40');
            }
        });

        // Update Zoom Toggle States
        container.querySelectorAll('.zoom-toggle').forEach(btn => {
            if (btn.dataset.zoom === currentZoom) {
                btn.classList.add('bg-card', 'text-primary', 'shadow-sm', 'opacity-100');
                btn.classList.remove('text-dim', 'opacity-40');
            } else {
                btn.classList.remove('bg-card', 'text-primary', 'shadow-sm', 'opacity-100');
                btn.classList.add('text-dim', 'opacity-40');
            }
        });

        // Render Sidebar Filter Tabs
        const filterTabDefs = [
            { key: 'today', label: 'Today', icon: '☀' },
            { key: 'completed', label: 'Completed', icon: '✓' },
            { key: 'planned', label: 'Planned', icon: '📅' },
            { key: 'projects', label: 'Projects', icon: '▓' }
        ];
        const filterTabsEl = container.querySelector('#sidebar-filter-tabs');
        if (filterTabsEl) {
            filterTabsEl.innerHTML = filterTabDefs.map(f => `
                <button class="nav-cat inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wide leading-none transition-all ${sidebarFilters[f.key] ? 'bg-primary/20 text-primary shadow-sm' : 'text-dim/50 hover:text-dim hover:bg-white/5'
                }" data-cat="${f.key}">
                    <span class="text-[9px] leading-none">${f.icon}</span><span class="leading-none">${f.label}</span>
                </button>
            `).join('');
        }

        // Update Sidebar classes based on collapsed state
        // Get the sidebar header for layout changes
        const sidebarHeader = sidebar.querySelector('.border-b');
        const toggleCompactBtn = container.querySelector('#toggle-compact-mode-btn');

        if (sidebarCollapsed) {
            sidebar.classList.add('w-10');
            sidebar.classList.remove('w-72', 'lg:w-[28rem]', 'xl:w-[32rem]');
            sidebarTitle.classList.add('hidden');
            sidebarTitle.classList.remove('block');
            sidebarNav.classList.add('opacity-0', 'pointer-events-none');
            sidebarNav.classList.remove('opacity-100');
            sidebarHeader?.classList.add('p-1', 'justify-center');
            sidebarHeader?.classList.remove('p-2', 'justify-between');
            toggleSidebarBtn.querySelector('svg').classList.add('rotate-180');
            toggleSidebarBtn.querySelector('svg').classList.remove('rotate-0');
            toggleCompactBtn?.classList.add('hidden');
            toggleCompactBtn?.classList.remove('block');
        } else {
            sidebar.classList.remove('w-10');
            sidebar.classList.add('w-72', 'lg:w-[28rem]', 'xl:w-[32rem]');
            sidebarTitle.classList.remove('hidden');
            sidebarTitle.classList.add('block');
            sidebarNav.classList.remove('opacity-0', 'pointer-events-none');
            sidebarNav.classList.add('opacity-100');
            sidebarHeader?.classList.remove('p-1', 'justify-center');
            sidebarHeader?.classList.add('p-2', 'justify-between');
            toggleSidebarBtn.querySelector('svg').classList.remove('rotate-180');
            toggleSidebarBtn.querySelector('svg').classList.add('rotate-0');
            toggleCompactBtn?.classList.remove('hidden');
            toggleCompactBtn?.classList.add('block');
        }

        // Timeline always visible
        timelineWrapper.classList.remove('hidden');
        scaleContainer?.classList.remove('hidden');
        zoomContainer?.classList.remove('hidden');
        PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder, { showSpans });

        // Sidebar List Logic
        const allThisProjectTasks = [...data.backlog, ...data.rows.flatMap(r => r.tasks)];

        PlannerList.render(listContainer, allThisProjectTasks, data.projects, {
            showDone: sidebarFilters.completed,
            sidebarFilters: sidebarFilters,
            compactMode: sidebarCompactMode
        });
    };

    // Shared lane-reorder handler so both updateUI and ResizeObserver pass it
    const handleLaneReorder = async (move) => {
        // move = { id, lane_order }
        // Update local data immediately
        const data = PlannerState.getCombinedData(projectFilter);
        const proj = data.projects.find(p => String(p.id) === String(move.id));
        if (proj) proj.lane_order = move.lane_order;

        // Re-render immediately so the user sees the change
        updateUI();

        // Save to API — single call, backend shifts other projects
        try {
            await api.post('projects.php', { lane_reorder: move });
            store.update('projects', await api.get('projects.php'));
        } catch (err) {
            console.error('Lane reorder save failed:', err);
        }
    };

    // Resize Observer for Timeline scaling
    let resizeObserver = new ResizeObserver(() => {
        const data = PlannerState.getCombinedData(projectFilter);
        const today = new Date();
        const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);
        const timelineContainer = container.querySelector('#planner-timeline-container');
        if (timelineContainer) PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder, { showSpans });
    });

    const timelineContainer = container.querySelector('#planner-timeline-container');
    if (timelineContainer) resizeObserver.observe(timelineContainer);

    updateUI();

    // Helper to refresh everything
    async function refresh() {
        await PlannerState.init();
        // Update filter dropdown options just in case 
        const state = store.get();
        const projects = state.projects || [];
        const select = container.querySelector('#project-filter');
        if (select) {
            select.innerHTML = `<option value="all" ${projectFilter === 'all' ? 'selected' : ''}>Global View</option>` +
                projects.map(p => `<option value="${p.id}" ${projectFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('');
        }
        updateUI();
    }

    // Sidebar Quick-add handler
    const sidebarQuickAdd = container.querySelector('#sidebar-quick-add');
    if (sidebarQuickAdd) {
        sidebarQuickAdd.addEventListener('keydown', async (e) => {
            if (e.key !== 'Enter') return;
            const title = sidebarQuickAdd.value.trim();
            if (!title) return;
            sidebarQuickAdd.value = '';
            try {
                const state = store.get();
                const defaultProject = (state.projects || [])[0];
                await api.post('planner.php', {
                    action: 'add_task',
                    title,
                    project_id: defaultProject ? defaultProject.id : null,
                    start_date: new Date().toISOString().split('T')[0],
                    priority: 'low'
                });
                await PlannerState.init();
                refresh();
            } catch (err) {
                console.error('Failed to add task', err);
            }
        });
    }

    // Event Handlers
    container.addEventListener('click', async (e) => {
        // Toggle Sidebar
        const toggleBtn = e.target.closest('#toggle-sidebar-btn');
        if (toggleBtn) {
            sidebarCollapsed = !sidebarCollapsed;
            updateUI();
            return;
        }

        // Toggle Task Status (Checkbox)
        const statusBtn = e.target.closest('.toggle-status-btn');
        if (statusBtn) {
            e.stopPropagation(); // Don't open modal
            const taskId = statusBtn.dataset.taskId;
            const tasks = store.get().tasks || [];
            const task = tasks.find(t => t.id == taskId);
            if (task) {
                const newStatus = task.status === 'done' ? 'todo' : 'done';
                const newProgress = newStatus === 'done' ? 100 : 0;

                // Determine completed_at: use task end_date/end_time if available,
                // otherwise use current time. Never set a future completed_at.
                let completedAt = null;
                if (newStatus === 'done') {
                    const now = new Date();
                    if (task.end_date) {
                        const endStr = task.end_time
                            ? `${task.end_date}T${task.end_time}`
                            : `${task.end_date}T23:59:59`;
                        const endDate = new Date(endStr);
                        // Use end date if it's in the past, otherwise use now
                        completedAt = (endDate < now ? endDate : now).toISOString();
                    } else {
                        completedAt = now.toISOString();
                    }
                }

                // Optimistic Update
                task.status = newStatus;
                task.progress = newProgress;
                task.completed_at = completedAt;
                updateUI();

                try {
                    await api.post('planner.php?action=update_task', {
                        id: taskId,
                        status: newStatus,
                        progress: newProgress,
                        completed_at: completedAt
                    });
                } catch (err) {
                    console.error("Failed to update task status", err);
                    refresh();
                }
            }
            return;
        }

        // Toggle Completed Section
        const compToggle = e.target.closest('#toggle-completed-list');
        if (compToggle) {
            const compContainer = document.getElementById('completed-tasks-container');
            const svg = compToggle.querySelector('svg');
            if (compContainer) {
                const isHidden = compContainer.classList.contains('hidden');
                if (isHidden) {
                    compContainer.classList.remove('hidden');
                    svg.classList.remove('-rotate-90');
                } else {
                    compContainer.classList.add('hidden');
                    svg.classList.add('-rotate-90');
                }
            }
            return;
        }

        // Track Button (Start Timer)
        const trackBtn = e.target.closest('.track-btn');
        if (trackBtn) {
            e.stopPropagation();
            const taskId = trackBtn.dataset.taskId;
            const state = PlannerState.getCombinedData('all');
            const tasks = [...state.backlog, ...state.rows.flatMap(r => r.tasks)];
            const task = tasks.find(t => t.id == taskId);

            if (task) {
                const startData = {
                    task_id: task.id,
                    project_id: task.project_id,
                    description: task.title,
                    project_name: state.projects.find(p => p.id == task.project_id)?.name || 'Unassigned'
                };

                api.post('time-entries.php?action=start', startData).then(result => {
                    store.update('activeTimer', result);
                    window.location.hash = '#dashboard';
                });
            }
            return;
        }

        // Inline Progress Bar Click (cycle through 0/25/50/75/100)
        const progressBar = e.target.closest('.inline-progress-bar');
        if (progressBar) {
            e.stopPropagation();
            const taskId = progressBar.dataset.taskId;
            const currentProgress = parseInt(progressBar.dataset.progress) || 0;
            const newProgress = Math.min(100, currentProgress + 15);

            // Optimistic update
            const tasks = store.get().tasks || [];
            const task = tasks.find(t => t.id == taskId);
            if (task) {
                task.progress = newProgress;
                if (newProgress >= 100) task.status = 'done';
                else if (task.status === 'done') task.status = 'in-progress';
                updateUI();

                try {
                    await api.post('planner.php', {
                        id: taskId,
                        progress: newProgress,
                        status: task.status
                    });
                } catch (err) {
                    console.error("Failed to update progress", err);
                    refresh();
                }
            }
            return;
        }

        // Task Click (Open Modal) — .task-item (list) or .task-bar (timeline)
        const taskEl = e.target.closest('.task-item') || e.target.closest('.task-bar');
        if (taskEl) {
            const taskId = taskEl.dataset.taskId;
            const state = PlannerState.getCombinedData('all');
            const tasks = [...state.backlog, ...state.rows.flatMap(r => r.tasks)];
            const task = tasks.find(t => t.id == taskId);
            if (task) PlannerModal.open(task);
            return;
        }

        // Time Entry Click (Open Modal) — .time-entry (timeline)
        const entryEl = e.target.closest('.time-entry');
        if (entryEl) {
            const entryId = entryEl.dataset.entryId;
            const entries = store.get().timeEntries || [];
            const entry = entries.find(en => String(en.id) === String(entryId));
            if (entry) {
                TimeEntryModal.open(entry, { onSave: () => refresh() });
            }
            return;
        }

        // Sidebar Navigation Category Toggle (multi-select)
        const navCat = e.target.closest('.nav-cat');
        if (navCat) {
            const cat = navCat.dataset.cat;
            sidebarFilters[cat] = !sidebarFilters[cat];
            updateUI();
            return;
        }

        // Time Travel
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) {
            const dir = parseInt(navBtn.dataset.dir);
            if (dir === 0) timeOffset = 0;
            else timeOffset += dir;
            updateUI();
            return;
        }

        // Scale
        const scaleBtn = e.target.closest('.scale-toggle');
        if (scaleBtn) {
            currentScale = scaleBtn.dataset.scale;
            currentZoom = 'regular';
            timeOffset = 0;
            updateUI();
            return;
        }

        // Zoom Level
        const zoomBtn = e.target.closest('.zoom-toggle');
        if (zoomBtn) {
            currentZoom = zoomBtn.dataset.zoom;
            updateUI();
            return;
        }




    });

    // Quick Add
    const doQuickAdd = async () => {
        const input = container.querySelector('#quick-add-input');
        const projectSelect = container.querySelector('#quick-add-project');
        if (!input) return;
        const val = input.value.trim();
        if (!val) return;
        input.value = '';

        const selectedProject = projectSelect ? projectSelect.value : null;

        try {
            const state = store.get();
            const defaultResource = state.team?.[0]?.name || 'General';
            const now = new Date();
            const todayStart = now.toISOString();
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59);
            await api.post('planner.php', {
                title: val,
                project_id: selectedProject || (projectFilter === 'all' ? (state.projects?.[0]?.id || null) : projectFilter),
                resource_id: defaultResource,
                status: 'todo',
                progress: 0,
                priority: 'low',
                start_date: todayStart,
                end_date: endOfDay.toISOString()
            });
            refresh();
        } catch (err) {
            console.error("Failed to add task", err);
        }
    };

    container.addEventListener('keydown', async (e) => {
        if (e.target.id === 'quick-add-input' && e.key === 'Enter') {
            doQuickAdd();
        }
    });

    container.addEventListener('click', async (e) => {
        if (e.target.closest('#quick-add-btn')) {
            doQuickAdd();
        }
    });

    // Project Filter
    const filterSelect = container.querySelector('#project-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            projectFilter = e.target.value;
            updateUI();
        });
    }

    // Compact Mode Toggle
    const toggleCompactBtn = container.querySelector('#toggle-compact-mode-btn');
    if (toggleCompactBtn) {
        toggleCompactBtn.addEventListener('click', () => {
            sidebarCompactMode = !sidebarCompactMode;
            localStorage.setItem('planner_sidebar_compact', String(sidebarCompactMode));

            // Visual feedback: toggle icon highlight
            if (sidebarCompactMode) {
                toggleCompactBtn.classList.add('bg-primary/15', 'text-primary');
                toggleCompactBtn.classList.remove('text-dim');
            } else {
                toggleCompactBtn.classList.remove('bg-primary/15', 'text-primary');
                toggleCompactBtn.classList.add('text-dim');
            }

            updateUI();
        });

        // Set initial state
        if (sidebarCompactMode) {
            toggleCompactBtn.classList.add('bg-primary/15', 'text-primary');
            toggleCompactBtn.classList.remove('text-dim');
        }
    }

    // Spans Toggle
    const spansBtn = container.querySelector('#toggle-spans-btn');
    if (spansBtn) {
        spansBtn.addEventListener('click', () => {
            showSpans = !showSpans;
            // Update button styling
            if (showSpans) {
                spansBtn.classList.add('bg-primary/15', 'text-primary', 'border-primary/30');
                spansBtn.classList.remove('bg-app/30', 'text-dim', 'border-white/5', 'opacity-40');
            } else {
                spansBtn.classList.remove('bg-primary/15', 'text-primary', 'border-primary/30');
                spansBtn.classList.add('bg-app/30', 'text-dim', 'border-white/5', 'opacity-40');
            }
            updateUI();
        });
    }

    return container;
}
