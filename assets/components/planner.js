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

let currentView = 'timeline'; // 'timeline' or 'list'
let currentScale = 'week';     // 'day', 'week', 'month'
let currentZoom = 'regular';  // 'compact', 'regular', 'relaxed'
let timeOffset = 0;           // 0 = today/start, +/- to move
let sidebarCollapsed = false;
let projectFilter = 'all';
// displayLimit removed — all tasks shown, no artificial cap
let sidebarCategory = 'today'; // 'today', 'planned', 'completed'
let listViewMode = localStorage.getItem('planner_list_view') || 'list'; // 'list' or 'grid'

export async function renderPlanner() {

    // Initialize State
    await PlannerState.init();

    // Setup Main Layout
    const container = document.createElement('div');
    container.className = 'planner-main h-full flex flex-col gap-6 animate-in fade-in duration-700';

    // Header & Controls
    const state = store.get();
    const projects = state.projects || [];

    container.innerHTML = `
        <!-- Title Row -->
        <div class="px-2 shrink-0 mb-4">
            <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-1">Workspace</h2>
            <h1 class="text-4xl font-light text-main tracking-tight">Unified <span class="font-bold italic text-primary">TODOs.</span></h1>
        </div>

        <!--Filter Bar-->
        <div class="flex items-center justify-between px-2 shrink-0 mb-3 gap-2 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
                <!-- View Toggle -->
                <div class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5">
                    ${[{ key: 'timeline', label: 'Timeline' }, { key: 'list', label: 'Todo List' }].map(v => `
                        <button class="view-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${currentView === v.key ? 'text-main bg-card shadow-sm ring-1 ring-black/5' : 'text-dim hover:text-main'}" data-view="${v.key}">
                            ${v.label}
                        </button>
                    `).join('')}
                </div>
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
                <div id="scale-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5 ${currentView === 'list' ? 'hidden' : ''}">
                    ${['day', 'week', 'month'].map(s => `
                        <button class="scale-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentScale === s ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-muted opacity-40 hover:opacity-100'}" data-scale="${s}">
                            ${s}
                        </button>
                    `).join('')}
                </div>

                <!-- Zoom Toggle -->
                <div id="zoom-toggle-container" class="flex items-center bg-app/30 p-0.5 rounded-lg border border-white/5 ${currentView === 'list' ? 'hidden' : ''}">
                    ${['compact', 'regular', 'relaxed'].map(z => `
                        <button class="zoom-toggle px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${currentZoom === z ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-muted opacity-40 hover:opacity-100'}" data-zoom="${z}">
                            ${z}
                        </button>
                    `).join('')}
                </div>


            </div>
        </div>

        <div class="flex gap-4 flex-grow min-h-0 items-stretch overflow-hidden">
            <!-- Sidebar: Navigation & Tasks -->
            <div id="planner-sidebar" class="${sidebarCollapsed ? 'w-10' : 'w-72 lg:w-80 xl:w-96'} flex flex-col bg-sidebar/20 rounded-xl border border-white/5 overflow-y-auto overflow-x-hidden backdrop-blur-sm transition-all duration-500 relative shrink-0 min-w-0">
                <!-- Sidebar Header -->
                <div class="${sidebarCollapsed ? 'p-1 justify-center' : 'p-2 justify-between'} border-b border-white/5 bg-app/20 backdrop-blur-sm sticky top-0 z-20 flex items-center min-h-[36px] gap-1">
                    <h3 id="sidebar-title" class="px-2 text-[9px] font-black text-dim uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden transition-all duration-500 ${sidebarCollapsed ? 'hidden' : 'block'}">Planner</h3>

                    <div class="flex items-center gap-0.5 shrink-0">
                        <button id="toggle-sidebar-btn" class="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-main shrink-0">
                            <svg class="w-3.5 h-3.5 transition-transform duration-500 ${sidebarCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- Navigation Sidebar (MS To Do style categories) -->
                <div id="sidebar-nav" class="flex-grow overflow-y-auto custom-scrollbar transition-all duration-500 ${sidebarCollapsed ? 'opacity-0' : 'opacity-100'}">
                    <div class="px-3 py-4 space-y-1">
                        <div class="flex items-center gap-1">
                            <button class="nav-cat flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl text-dim hover:bg-white/5 hover:text-main transition-all group/cat" data-cat="today">
                                <div class="flex items-center gap-3">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                    <span class="text-[13px] font-bold">Today</span>
                                </div>
                            </button>
                            <button id="sidebar-add-task" class="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-dim hover:text-primary shrink-0" title="Add Task">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                            </button>
                        </div>
                        <button class="nav-cat flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-dim hover:bg-white/5 hover:text-main transition-all group/cat" data-cat="planned">
                            <div class="flex items-center gap-3">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <span class="text-[13px] font-bold">Planned</span>
                            </div>
                        </button>
                        <button class="nav-cat flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-dim hover:bg-white/5 hover:text-main transition-all group/cat" data-cat="completed">
                            <div class="flex items-center gap-3">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                                <span class="text-[13px] font-bold">Completed</span>
                            </div>
                        </button>
                    </div>

                    <div class="mt-2 pt-2 border-t border-white/5 px-2">
                        <div id="planner-list-container" class="p-2 pb-10">
                            <!-- TODO Items Rendered Here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Timeline -->
            <div id="timeline-wrapper" class="flex-grow flex flex-col bg-card/10 rounded-xl border border-white/5 overflow-hidden relative transition-all duration-500 min-w-0">
                 <div id="planner-timeline-container" class="flex-grow overflow-x-auto overflow-y-auto custom-scrollbar relative">
                    <!-- Timeline Content -->
                 </div>
            </div>

            <!-- Full List View -->
            <div id="full-list-wrapper" class="hidden flex-grow flex flex-col bg-card/10 rounded-xl border border-white/5 overflow-hidden relative transition-all duration-500 min-w-0">
                <div class="p-3 border-b border-white/5 bg-app/20 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-6">
                    <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.2em]">All Tasks</h3>
                    <div class="flex bg-app p-0.5 rounded-lg border border-white/5">
                        <button id="toggle-list-grid" class="p-1.5 rounded-md transition-all ${listViewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-main'}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        </button>
                        <button id="toggle-list-list" class="p-1.5 rounded-md transition-all ${listViewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-main'}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                    </div>
                </div>
                <div id="planner-full-list-container" class="flex-grow overflow-y-auto p-4 md:p-10 custom-scrollbar">
                    <!-- List Content -->
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
        const listWrapper = container.querySelector('#full-list-wrapper');
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
            }
            periodLabel.textContent = label;
        }        // Update Toggle Button States
        container.querySelectorAll('.view-toggle').forEach(btn => {
            if (btn.dataset.view === currentView) {
                btn.classList.add('bg-card', 'text-primary', 'shadow-sm');
                btn.classList.remove('text-dim');
            } else {
                btn.classList.remove('bg-card', 'text-primary', 'shadow-sm');
                btn.classList.add('text-dim');
            }
        });

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

        // Update Sidebar Nav Categories
        container.querySelectorAll('.nav-cat').forEach(btn => {
            if (btn.dataset.cat === sidebarCategory) {
                btn.classList.add('bg-primary/10', 'text-primary', 'shadow-sm', 'shadow-primary/5');
                btn.classList.remove('text-dim');
            } else {
                btn.classList.remove('bg-primary/10', 'text-primary', 'shadow-sm', 'shadow-primary/5');
                btn.classList.add('text-dim');
            }
        });

        // Update Sidebar classes based on collapsed state
        // Get the sidebar header for layout changes
        const sidebarHeader = sidebar.querySelector('.border-b');

        if (sidebarCollapsed) {
            sidebar.classList.add('w-10');
            sidebar.classList.remove('w-72', 'lg:w-80', 'xl:w-96');
            sidebarTitle.classList.add('hidden');
            sidebarTitle.classList.remove('block');
            sidebarNav.classList.add('opacity-0', 'pointer-events-none');
            sidebarNav.classList.remove('opacity-100');
            sidebarHeader?.classList.add('p-1', 'justify-center');
            sidebarHeader?.classList.remove('p-2', 'justify-between');
            toggleSidebarBtn.querySelector('svg').classList.add('rotate-180');
            toggleSidebarBtn.querySelector('svg').classList.remove('rotate-0');
        } else {
            sidebar.classList.remove('w-10');
            sidebar.classList.add('w-72', 'lg:w-80', 'xl:w-96');
            sidebarTitle.classList.remove('hidden');
            sidebarTitle.classList.add('block');
            sidebarNav.classList.remove('opacity-0', 'pointer-events-none');
            sidebarNav.classList.add('opacity-100');
            sidebarHeader?.classList.remove('p-1', 'justify-center');
            sidebarHeader?.classList.add('p-2', 'justify-between');
            toggleSidebarBtn.querySelector('svg').classList.remove('rotate-180');
            toggleSidebarBtn.querySelector('svg').classList.add('rotate-0');
        }

        // Toggle Sidebar Visibility Logic
        if (currentView === 'list') {
            sidebar.classList.add('hidden');
        } else {
            sidebar.classList.remove('hidden');
        }

        // Timeline View Logic
        if (currentView === 'timeline') {
            timelineWrapper.classList.remove('hidden');
            listWrapper.classList.add('hidden');
            scaleContainer?.classList.remove('hidden');
            zoomContainer?.classList.remove('hidden');
            PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder);
        } else {
            // List View Logic (Global View)
            timelineWrapper.classList.add('hidden');
            listWrapper.classList.remove('hidden');
            scaleContainer?.classList.add('hidden');
            zoomContainer?.classList.add('hidden');

            // In List View, we show *all* tasks (scheduled + backlog)
            const allTasks = [...data.backlog, ...data.rows.flatMap(r => r.tasks)];
            PlannerList.render('planner-full-list-container', allTasks, data.projects, {
                fullWidth: true,
                showDone: true,
                viewMode: listViewMode,
                projectFilter: projectFilter
            });
        }

        // Sidebar List Logic
        const allThisProjectTasks = [...data.backlog, ...data.rows.flatMap(r => r.tasks)];

        PlannerList.render(listContainer, allThisProjectTasks, data.projects, {
            showDone: sidebarCategory === 'completed',
            category: sidebarCategory
        });
    };

    // Shared lane-reorder handler so both updateUI and ResizeObserver pass it
    const handleLaneReorder = async (newOrder) => {
        // Update local data immediately
        const data = PlannerState.getCombinedData(projectFilter);
        Object.entries(newOrder).forEach(([projectId, laneOrder]) => {
            const proj = data.projects.find(p => String(p.id) === String(projectId));
            if (proj) proj.lane_order = laneOrder;
        });

        // Re-render immediately so the user sees the change
        updateUI();

        // Save to API in background
        try {
            const savePromises = Object.entries(newOrder).map(([projectId, laneOrder]) =>
                api.post('projects.php', { id: projectId, lane_order: laneOrder })
            );
            await Promise.all(savePromises);
            store.update('projects', await api.get('projects.php'));
        } catch (err) {
            console.error('Lane reorder save failed:', err);
        }
    };

    // Resize Observer for Timeline scaling
    let resizeObserver = new ResizeObserver(() => {
        if (currentView === 'timeline') {
            const data = PlannerState.getCombinedData(projectFilter);
            const today = new Date();
            const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);
            const timelineContainer = container.querySelector('#planner-timeline-container');
            if (timelineContainer) PlannerTimeline.render(timelineContainer, data, config, today, currentZoom, handleLaneReorder);
        }
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
            select.innerHTML = `< option value = "all" ${projectFilter === 'all' ? 'selected' : ''}> Global View</option > ` +
                projects.map(p => `< option value = "${p.id}" ${projectFilter == p.id ? 'selected' : ''}> ${p.name}</option > `).join('');
        }
        updateUI();
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

        // Add Task from sidebar
        const addTaskBtn = e.target.closest('#sidebar-add-task');
        if (addTaskBtn) {
            PlannerModal.open(null, { start_date: new Date().toISOString().split('T')[0] });
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

                // Optimistic Update
                task.status = newStatus;
                task.progress = newProgress;
                updateUI();

                try {
                    await api.post('planner.php?action=update_task', {
                        id: taskId,
                        status: newStatus,
                        progress: newProgress
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
            const steps = [0, 25, 50, 75, 100];
            const nextIdx = (steps.indexOf(currentProgress) + 1) % steps.length;
            const newProgress = steps[nextIdx];

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

        // Sidebar Navigation Category Click
        const navCat = e.target.closest('.nav-cat');
        if (navCat) {
            sidebarCategory = navCat.dataset.cat;
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

        // List View Mode Toggle
        const gridBtn = e.target.closest('#toggle-list-grid');
        const listBtn = e.target.closest('#toggle-list-list');
        if (gridBtn || listBtn) {
            listViewMode = gridBtn ? 'grid' : 'list';
            localStorage.setItem('planner_list_view', listViewMode);
            updateUI();
            return;
        }

        // View Mode
        const viewBtn = e.target.closest('.view-toggle');
        if (viewBtn) {
            currentView = viewBtn.dataset.view;
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
            await api.post('planner.php', {
                title: val,
                project_id: selectedProject || (projectFilter === 'all' ? (state.projects?.[0]?.id || null) : projectFilter),
                resource_id: defaultResource,
                status: 'todo',
                progress: 0,
                priority: 'low'
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

    return container;
}
