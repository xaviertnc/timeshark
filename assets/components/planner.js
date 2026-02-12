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

let currentScale = 'week';
let timeOffset = 0;
let projectFilter = 'all';
let currentView = 'timeline';
let sidebarCollapsed = false;
let displayLimit = 25;
let showCompleted = false;

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
        <!-- Header -->
        <div class="flex items-center justify-between px-2 h-12 shrink-0">
            <div class="flex items-center gap-6">
                <div>
                    <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-1">Workspace</h2>
                    <div class="flex items-center gap-2">
                        <span class="text-2xl font-black text-main tracking-tighter italic">Unified <span class="text-primary not-italic">TODOs.</span></span>
                    </div>
                </div>

                <div class="flex items-center gap-2 bg-app p-1 rounded-xl ml-4">
                    <button class="nav-btn p-2 text-dim hover:text-main" data-dir="-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button class="nav-btn px-4 py-1 text-[9px] font-black uppercase tracking-widest text-dim hover:text-main" data-dir="0">Today</button>
                    <button class="nav-btn p-2 text-dim hover:text-main" data-dir="1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <!-- Intelligent Controls -->
                <div class="flex items-center gap-2 bg-app p-1 rounded-xl">
                    <select id="display-limit" class="bg-card border-none rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-main appearance-none cursor-pointer focus:ring-0 transition-all outline-none text-center min-w-[80px]">
                        <option value="15" ${displayLimit == 15 ? 'selected' : ''}>Show 15</option>
                        <option value="25" ${displayLimit == 25 ? 'selected' : ''}>Show 25</option>
                        <option value="50" ${displayLimit == 50 ? 'selected' : ''}>Show 50</option>
                        <option value="0" ${displayLimit == 0 ? 'selected' : ''}>Show All</option>
                    </select>
                    <button id="toggle-completed" class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showCompleted ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-app text-dim hover:text-muted'}" title="Show Done">
                        Done
                    </button>
                    <div class="w-px h-3 bg-soft mx-1"></div>
                </div>

                <!-- Project Filter -->
                <div class="relative group mr-4">
                    <select id="project-filter" class="bg-app border-none rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-main appearance-none cursor-pointer pr-10 focus:ring-2 focus:ring-primary/20 transition-all outline-none shadow-sm">
                        <option value="all" ${projectFilter === 'all' ? 'selected' : ''}>Global View</option>
                        ${projects.map(p => `<option value="${p.id}" ${projectFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                    <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                <!-- View Controls Group -->
                <div class="flex items-center gap-3 bg-app/50 p-1.5 rounded-2xl border border-soft/30">
                    <!-- Scale Toggle (Only if in timeline view) -->
                    <div id="scale-toggle-container" class="flex items-center bg-app rounded-lg p-0.5 ${currentView === 'list' ? 'hidden' : ''}">
                        ${['day', 'week', 'month'].map(s => `
                            <button class="scale-toggle px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${currentScale === s ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-muted opacity-60 hover:opacity-100'}" data-scale="${s}">
                                ${s}
                            </button>
                        `).join('')}
                    </div>

                    ${currentView === 'timeline' ? '<div class="w-px h-4 bg-soft/50"></div>' : ''}

                    <!-- View Toggle -->
                    <div class="flex items-center">
                        ${['timeline', 'list'].map(v => `
                            <button class="view-toggle px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currentView === v ? 'text-main bg-card shadow-sm ring-1 ring-black/5' : 'text-dim hover:text-main'}" data-view="${v}">
                                ${v}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="flex gap-6 flex-grow min-h-0 items-stretch overflow-hidden">
            <!-- Sidebar: TODO List (Collapsible) -->
            <div id="planner-sidebar" class="${sidebarCollapsed ? 'w-12' : 'w-1/4'} min-w-[50px] flex flex-col bg-sidebar/50 rounded-2xl border border-soft shadow-inner-white overflow-hidden backdrop-blur-sm transition-all duration-500 relative">
                <div class="p-4 border-b border-soft bg-app/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
                    <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden transition-all duration-500 ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}">TODO List</h3>
                    <button id="toggle-sidebar-btn" class="p-1 rounded-lg hover:bg-soft/40 transition-colors text-dim hover:text-main shrink-0">
                        <svg class="w-4 h-4 transition-transform duration-500 ${sidebarCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                    </button>
                </div>
                <div id="planner-list-container" class="flex-grow overflow-y-auto p-4 custom-scrollbar transition-all duration-500 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}">
                    <!-- List Content -->
                </div>
            </div>

            <!-- Timeline: Gantt -->
            <div id="timeline-wrapper" class="${currentView === 'list' ? 'hidden' : 'flex-grow'} flex flex-col bg-card rounded-2xl border border-soft shadow-soft overflow-hidden relative transition-all duration-500">
                 <div id="planner-timeline-container" class="flex-grow overflow-x-auto overflow-y-auto custom-scrollbar relative">
                    <!-- Timeline Content -->
                 </div>
            </div>

            <!-- Full List View (Alternative to Timeline) -->
            <div id="full-list-wrapper" class="${currentView === 'timeline' ? 'hidden' : 'flex-grow'} flex flex-col bg-card rounded-2xl border border-soft shadow-soft overflow-hidden relative transition-all duration-500">
                <div class="p-4 border-b border-soft bg-app/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-8">
                    <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.2em]">Planned TODOs</h3>
                </div>
                <div id="planner-full-list-container" class="flex-grow overflow-y-auto p-8 custom-scrollbar">
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
        const sidebarContent = sidebar.querySelector('#planner-list-container');
        const toggleSidebarBtn = sidebar.querySelector('#toggle-sidebar-btn');


        // Update Toggle Button States
        container.querySelectorAll('.view-toggle').forEach(btn => {
            if (btn.dataset.view === currentView) {
                btn.classList.add('bg-card', 'text-primary', 'shadow-sm');
                btn.classList.remove('text-dim');
            } else {
                btn.classList.remove('bg-card', 'text-primary', 'shadow-sm');
                btn.classList.add('text-dim');
            }
        });

        // Update Sidebar classes based on collapsed state
        if (sidebarCollapsed) {
            sidebar.classList.add('w-12');
            sidebar.classList.remove('w-1/4');
            sidebarTitle.classList.add('opacity-0', 'w-0');
            sidebarTitle.classList.remove('opacity-100');
            sidebarContent.classList.add('opacity-0', 'pointer-events-none');
            sidebarContent.classList.remove('opacity-100');
            toggleSidebarBtn.querySelector('svg').classList.add('rotate-180');
            toggleSidebarBtn.querySelector('svg').classList.remove('rotate-0');
        } else {
            sidebar.classList.remove('w-12');
            sidebar.classList.add('w-1/4');
            sidebarTitle.classList.remove('opacity-0', 'w-0');
            sidebarTitle.classList.add('opacity-100');
            sidebarContent.classList.remove('opacity-0', 'pointer-events-none');
            sidebarContent.classList.add('opacity-100');
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
            PlannerTimeline.render(timelineContainer, data, config, today);
        } else {
            // List View Logic (Global View)
            timelineWrapper.classList.add('hidden');
            listWrapper.classList.remove('hidden');
            scaleContainer?.classList.add('hidden');

            // In List View, we show *all* tasks (scheduled + backlog)
            const allTasks = [...data.backlog, ...data.rows.flatMap(r => r.tasks)];
            PlannerList.render('planner-full-list-container', allTasks, data.projects, {
                fullWidth: true,
                limit: displayLimit,
                showDone: showCompleted
            });
        }

        // Sidebar List Logic (Always visible unless collapsed)
        // User feedback implies they want to see "TODOs" here. 
        // Showing *only* backlog might be confusing. Let's show everything but sort by backlog first?
        // actually, let's keep it as backlog + scheduled to ensure they see everything.
        const allThisProjectTasks = [...data.backlog, ...data.rows.flatMap(r => r.tasks)];

        PlannerList.render(listContainer, allThisProjectTasks, data.projects, {
            limit: displayLimit,
            showDone: showCompleted
        });
    };

    // Resize Observer for Timeline scaling
    let resizeObserver = new ResizeObserver(() => {
        if (currentView === 'timeline') {
            const data = PlannerState.getCombinedData(projectFilter);
            const today = new Date();
            const config = PlannerUtils.getTimelineConfig(currentScale, timeOffset, today);
            const timelineContainer = container.querySelector('#planner-timeline-container');
            if (timelineContainer) PlannerTimeline.render(timelineContainer, data, config, today);
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
            select.innerHTML = `<option value="all" ${projectFilter === 'all' ? 'selected' : ''}>Global View</option>` +
                projects.map(p => `<option value="${p.id}" ${projectFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('');
        }
        updateUI();
    }

    // Event Handlers
    container.addEventListener('click', (e) => {
        // Toggle Sidebar
        if (e.target.closest('#toggle-sidebar-btn')) {
            sidebarCollapsed = !sidebarCollapsed;
            updateUI();
            return;
        }

        // Time Travel (Using .nav-btn class)
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) {
            const dir = parseInt(navBtn.dataset.dir);
            if (dir === 0) timeOffset = 0;
            else timeOffset += dir;
            updateUI();
            return;
        }

        // Scale
        if (e.target.closest('.scale-toggle')) {
            currentScale = e.target.closest('.scale-toggle').dataset.scale;
            timeOffset = 0;
            updateUI();
            return;
        }

        // View Mode
        if (e.target.closest('.view-toggle')) {
            currentView = e.target.closest('.view-toggle').dataset.view;
            updateUI();
            return;
        }

        // Quick Add Button (List)
        if (e.target.closest('#quick-add-btn')) {
            const input = container.querySelector('#quick-add-input');
            const title = input.value.trim();
            if (title) {
                api.post('planner.php', {
                    title: title,
                    project_id: null,
                    start_date: null,
                    end_date: null
                }).then(() => {
                    input.value = ''; // Clear input
                    refresh();
                });
            }
            return;
        }


        // Task Click (List or Timeline)
        const taskEl = e.target.closest('[data-task-id]');
        if (taskEl) {
            const taskId = taskEl.dataset.taskId;
            // Find in state (either backlog or rows)
            const state = PlannerState.getCombinedData('all');
            let task = state.backlog.find(t => t.id == taskId);

            if (!task) {
                // Search rows
                for (const row of state.rows) {
                    task = row.tasks.find(t => t.id == taskId);
                    if (task) break;
                }
            }

            if (task) PlannerModal.open(task);
            return;
        }

        // Track Button in List (Play icon)
        const trackBtn = e.target.closest('.track-btn');
        if (trackBtn) {
            const taskId = trackBtn.dataset.taskId;
            const state = PlannerState.getCombinedData('all');
            const task = state.backlog.find(t => t.id == taskId);

            if (task) {
                const startData = {
                    task_id: task.id,
                    project_id: task.project_id,
                    description: task.title,
                    project_name: state.projects.find(p => p.id == task.project_id)?.name || 'Unassigned',
                    resource_id: store.get().team?.[0]?.name || 'Main'
                };

                api.post('time-entries.php?action=start', startData).then(result => {
                    store.update('activeTimer', result);
                    // Optionally notify user or switch to dashboard
                    // For now, let's just refresh to show the timer state if we add a global timer display
                    // But usually, the user would want to see the dashboard timer running.
                    window.location.hash = '#dashboard';
                });
            }
            return;
        }

        // Schedule Button in List (Plan icon)
    });

    // Enter on Quick Add
    container.addEventListener('keypress', (e) => {
        if (e.target.id === 'quick-add-input' && e.key === 'Enter') {
            const title = e.target.value.trim();
            if (title) {
                api.post('planner.php', {
                    title: title,
                    project_id: null,
                    start_date: null,
                    end_date: null
                }).then(() => {
                    e.target.value = '';
                    refresh();
                });
            }
        }
    });

    // Filter Change
    const filterSelect = container.querySelector('#project-filter');
    filterSelect.onchange = (e) => {
        projectFilter = e.target.value;
        updateUI();
    };

    // Keyboard Listeners
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.id === 'quick-add-input') {
            container.querySelector('#quick-add-btn')?.click();
        }
    });

    return container;
}
