/**
 * assets/components/planner/planner-view-list.js
 * 
 * Renders the Sidebar List for Unscheduled Tasks (Backlog).
 * Redesigned to match a modern premium TODO experience.
 */

import { PlannerUtils } from './planner-utils.js';

export const PlannerList = {
    render(container, tasks, projects, options = {}) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const isFull = options.fullWidth || false;
        const limit = options.limit || 0;
        const showDone = options.showDone || false;
        const viewMode = options.viewMode || 'list';
        const useGrid = isFull && viewMode === 'grid';

        container.innerHTML = '';

        // 1. Filter Tasks
        const today = new Date(); today.setHours(0, 0, 0, 0);

        let filtered = tasks.filter(t => {
            // In modern view, we always keep completed tasks for the "Completed" section
            // but we might still honor the global 'showDone' toggle if requested.
            return true;
        });

        // 2. Separate Active and Completed
        let activeTasks = filtered.filter(t => t.status !== 'done');
        let completedTasks = filtered.filter(t => t.status === 'done');

        // Apply limit if specified (to active tasks only)
        if (limit > 0) activeTasks = activeTasks.slice(0, limit);

        // 3. Sorting (Active: Date, Completed: Completion Date or ID)
        activeTasks.sort((a, b) => {
            const da = a.start_date ? new Date(a.start_date) : new Date(8640000000000000);
            const db = b.start_date ? new Date(b.start_date) : new Date(8640000000000000);
            return da - db;
        });

        // 4. Group Active Tasks by Date
        const groups = {
            'overdue': { label: 'Overdue', tasks: [], color: 'text-red-500/80' },
            'today': { label: 'Today', tasks: [], color: 'text-primary' },
            'later': { label: 'Planned', tasks: [], color: 'text-dim' },
            'nodate': { label: 'Tasks', tasks: [], color: 'text-dim' }
        };

        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        activeTasks.forEach(t => {
            if (!t.start_date) {
                groups['nodate'].tasks.push(t);
                return;
            }
            const d = new Date(t.start_date);
            if (d < today) groups['overdue'].tasks.push(t);
            else if (d < tomorrow) groups['today'].tasks.push(t);
            else groups['later'].tasks.push(t);
        });

        const listContent = document.createElement('div');
        listContent.className = isFull ? 'max-w-[1200px] mx-auto py-8 px-6 space-y-10' : 'space-y-6';

        const renderTaskItem = (t) => {
            const proj = projects.find(p => p.id == t.project_id) || { name: 'Unassigned', color: '#64748b' };
            const isCompleted = t.status === 'done';
            const hasDate = t.start_date;
            const dateLabel = hasDate ? new Date(t.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

            return `
                <div class="task-item group/task relative flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer overflow-hidden mb-1"
                     data-task-id="${t.id}">
                    
                    <!-- Checkbox Circle -->
                    <button class="toggle-status-btn mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${isCompleted ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}"
                            data-task-id="${t.id}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                    </button>

                    <div class="flex-grow min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-[13px] font-bold transition-all truncate leading-snug ${isCompleted ? 'text-dim line-through opacity-50' : 'text-main group-hover/task:text-primary'}">
                                ${t.title}
                            </span>
                        </div>
                        
                        <div class="flex items-center gap-2.5 mt-1">
                            <div class="flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${proj.color}"></span>
                                <span class="text-[9px] font-black text-dim/60 uppercase tracking-wider">${proj.name}</span>
                            </div>
                            ${hasDate ? `
                                <div class="flex items-center gap-1.5 text-dim/50">
                                    <span class="w-px h-2 bg-white/5"></span>
                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <span class="text-[9px] font-black uppercase tracking-tighter">${dateLabel}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center opacity-0 group-hover/task:opacity-100 transition-opacity gap-1">
                         <button class="track-btn p-1.5 rounded-lg hover:bg-primary/10 text-dim/50 hover:text-primary transition-colors" title="Track Time" data-task-id="${t.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                         </button>
                    </div>
                </div>
            `;
        };

        // Render Active Groups
        ['overdue', 'today', 'later', 'nodate'].forEach(key => {
            const gTasks = groups[key].tasks;
            if (gTasks.length === 0) return;

            const groupEl = document.createElement('div');
            groupEl.className = 'animate-in fade-in slide-in-from-bottom-2 duration-500';

            groupEl.innerHTML = `
                <div class="flex items-center gap-3 mb-3 px-1">
                    <span class="text-[10px] font-black uppercase tracking-[0.25em] ${groups[key].color}">${groups[key].label}</span>
                    <div class="h-px flex-grow bg-white/5"></div>
                    <span class="text-[9px] font-black text-dim opacity-30">${gTasks.length}</span>
                </div>
                <div class="${useGrid ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6' : 'flex flex-col'}">
                    ${gTasks.map(t => renderTaskItem(t)).join('')}
                </div>
            `;
            listContent.appendChild(groupEl);
        });

        // "Add a task" Input (Simplified and ghost styled)
        const quickAdd = document.createElement('div');
        quickAdd.className = 'mt-4 px-1';
        quickAdd.innerHTML = `
            <div class="relative group/add">
                <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-primary/40 group-focus-within/add:text-primary transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <input type="text" id="quick-add-input" placeholder="Add a task" 
                       class="w-full bg-white/2 hover:bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-main focus:bg-white/5 focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-dim/30 shadow-sm">
            </div>
        `;
        listContent.appendChild(quickAdd);

        // Completed Section
        if (completedTasks.length > 0 && showDone) {
            const completedEl = document.createElement('div');
            completedEl.className = 'mt-10 pt-4 border-t border-white/5';

            completedEl.innerHTML = `
                <button id="toggle-completed-list" class="flex items-center gap-3 mb-4 px-1 w-full text-left group/comp">
                    <svg class="w-3 h-3 text-dim/40 group-hover/comp:text-dim transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    <span class="text-[10px] font-black uppercase tracking-[0.25em] text-dim/60 group-hover/comp:text-dim transition-colors">Completed</span>
                    <span class="text-[9px] font-black text-dim opacity-30">${completedTasks.length}</span>
                </button>
                <div id="completed-tasks-container" class="flex flex-col opacity-60">
                    ${completedTasks.map(t => renderTaskItem(t)).join('')}
                </div>
            `;
            listContent.appendChild(completedEl);
        }

        if (activeTasks.length === 0 && completedTasks.length === 0) {
            listContent.innerHTML = `
                <div class="flex flex-col items-center justify-center py-24 opacity-30">
                    <div class="w-20 h-20 mb-6 text-dim bg-white/2 rounded-full flex items-center justify-center border border-dashed border-white/10">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </div>
                    <p class="text-[10px] font-black text-dim uppercase tracking-[0.4em]">All tasks finished</p>
                </div>
            `;
        }

        container.appendChild(listContent);
    }
};
