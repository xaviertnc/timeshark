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

export async function renderPlanner() {

    // Initialize State
    await PlannerState.init();

    // Setup Main Layout
    const container = document.createElement('div');
    container.className = "max-w-[1700px] mx-auto pb-16 px-4 h-full flex flex-col";

    // Header & Controls
    const state = store.get();
    const projects = state.projects || [];

    container.innerHTML = `
        <div class="flex items-end justify-between mb-6 px-2 flex-shrink-0">
            <div>
                 <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2">Workspace</h2>
                 <h1 class="text-2xl font-light text-main tracking-tight">Unified <span class="font-bold italic text-primary">Planner.</span></h1>
            </div>

            <div class="flex items-center gap-6">
                <!-- Time Travel -->
                <div class="flex items-center bg-app p-1 rounded-xl gap-1">
                    <button id="prev-time" class="p-2 hover:bg-card rounded-lg transition-all text-dim hover:text-primary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button id="today-time" class="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-dim hover:text-primary transition-all">Today</button>
                    <button id="next-time" class="p-2 hover:bg-card rounded-lg transition-all text-dim hover:text-primary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>

                <!-- Project Filter -->
                <div class="relative group">
                    <select id="project-filter" class="appearance-none bg-app border-none rounded-xl px-4 py-2.5 pr-9 text-[10px] font-black uppercase tracking-widest text-dim focus:text-primary transition-all cursor-pointer outline-none">
                        <option value="all" ${projectFilter === 'all' ? 'selected' : ''}>Global View</option>
                        ${projects.map(p => `<option value="${p.id}" ${projectFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-dim/50">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                <!-- Scale Toggle -->
                <div class="bg-app p-1 rounded-xl flex items-center">
                    ${['week', 'month'].map(s => `
                        <button class="scale-toggle px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currentScale === s ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-muted'}" data-scale="${s}">
                            ${s}
                        </button>
                    `).join('')}
                </div>

                <button id="add-task-btn" class="bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center font-black uppercase tracking-[0.1em] text-[10px]">
                    Create Task
                </button>
            </div>
        </div>

        <div class="flex gap-6 h-[calc(100vh-200px)] min-h-[600px] items-stretch">
            <!-- Sidebar: Backlog / Task List (25%) -->
            <div class="w-1/4 min-w-[300px] flex flex-col bg-sidebar/50 rounded-2xl border border-soft shadow-inner-white overflow-hidden backdrop-blur-sm">
                <div class="p-4 border-b border-soft bg-app/50 backdrop-blur-sm sticky top-0 z-10">
                    <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.2em]">Task Backlog</h3>
                </div>
                <div id="planner-list-container" class="flex-grow overflow-y-auto p-4 custom-scrollbar">
                    <!-- List Content -->
                </div>
            </div>

            <!-- Timeline: Gantt (75%) -->
            <div class="flex-grow flex flex-col bg-card rounded-2xl border border-soft shadow-soft overflow-hidden relative">
                 <div id="planner-timeline-container" class="flex-grow overflow-x-auto overflow-y-auto custom-scrollbar relative">
                    <!-- Timeline Content -->
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

        PlannerList.render(listContainer, data.backlog, data.projects);
        PlannerTimeline.render(timelineContainer, data, config, today);
    };

    updateUI();

    // Helper to refresh everything
    async function refresh() {
        await PlannerState.init();
        // Update filter dropdown options just in case 
        const state = store.get();
        const projects = state.projects || [];
        const select = container.querySelector('#project-filter');
        select.innerHTML = `<option value="all" ${projectFilter === 'all' ? 'selected' : ''}>Global View</option>` +
            projects.map(p => `<option value="${p.id}" ${projectFilter == p.id ? 'selected' : ''}>${p.name}</option>`).join('');

        updateUI();
    }

    // Event Handlers
    container.addEventListener('click', (e) => {
        // Time Travel
        if (e.target.closest('#prev-time')) { timeOffset--; updateUI(); return; }
        if (e.target.closest('#next-time')) { timeOffset++; updateUI(); return; }
        if (e.target.closest('#today-time')) { timeOffset = 0; updateUI(); return; }

        // Scale
        if (e.target.closest('.scale-toggle')) {
            currentScale = e.target.closest('.scale-toggle').dataset.scale;
            timeOffset = 0;
            updateUI();
            return;
        }

        // Add Task (Header Btn)
        if (e.target.closest('#add-task-btn')) {
            PlannerModal.open();
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

        // Schedule Button in List (Plan icon)
        const planBtn = e.target.closest('.plan-btn');
        if (planBtn) {
            // Handled by task click above since btn is inside task-item
            // But if we want specific behavior (like defaulting to today), we can intercept.
            // For now, opening modal is fine.
        }
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

    return container;
}
