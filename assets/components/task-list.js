/**
 * assets/components/task-list.js
 * 
 * Reusable component for rendering lists of tasks.
 * Handles grouping, sorting, and delegates row rendering to TaskItem.
 */

import { TaskItem } from './task-item.js';

export const TaskList = {
    /**
     * Renders a list of tasks into a container.
     * @param {HTMLElement} container DOM element to render into
     * @param {Array} tasks List of task objects
     * @param {Array} projects List of projects for context
     * @param {Object} options { mode: 'full'|'compact', showDone: boolean }
     */
    render(container, tasks, projects, options = {}) {
        if (!container) return;
        const mode = options.mode || 'full';
        const showDone = options.showDone || false;

        // Initialize page state in container if not present
        if (!container._pageState) container._pageState = {};

        // Grouping & Sorting
        const groups = this.getGroupedTasks(tasks);

        container.innerHTML = '';
        const listDiv = document.createElement('div');
        listDiv.className = mode === 'full' ? 'space-y-6 px-1' : 'space-y-4';

        // Render Groups
        Object.entries(groups).forEach(([key, group]) => {
            if (group.tasks.length === 0) return;
            if (key === 'completed' && !showDone) return;

            const PAGE_SIZE = 15;
            if (!container._pageState[key]) container._pageState[key] = PAGE_SIZE;
            const visibleCount = container._pageState[key];
            const paginatedTasks = group.tasks.slice(0, visibleCount);
            const hasMore = group.tasks.length > visibleCount;

            const groupEl = document.createElement('div');
            groupEl.className = 'task-group mb-6';

            groupEl.innerHTML = `
                <div class="flex items-center gap-2 mb-2 px-2">
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] ${group.color}">${group.label}</span>
                    <span class="text-[9px] font-bold text-dim/30">(${group.tasks.length})</span>
                    <div class="flex-grow h-px bg-white/5"></div>
                </div>
                <div class="${mode === 'full' ? 'grid grid-cols-1 gap-3' : 'space-y-1'}">
                    ${paginatedTasks.map(t => TaskItem.render(t, projects, { mode })).join('')}
                </div>
                ${hasMore ? `
                    <button class="show-more-btn w-full mt-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-dim hover:text-primary transition-colors border border-dashed border-white/5 rounded-lg" data-group="${key}">
                        Show More (+${Math.min(PAGE_SIZE, group.tasks.length - visibleCount)})
                    </button>
                ` : ''}
            `;
            listDiv.appendChild(groupEl);
        });

        if (listDiv.children.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-dim/40 text-xs font-medium italic">No tasks found</div>`;
        } else {
            container.innerHTML = ''; // Clear previous
            container.appendChild(listDiv);

            // Re-attach handlers for show more
            listDiv.querySelectorAll('.show-more-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const groupKey = btn.dataset.group;
                    container._pageState[groupKey] += 15;
                    this.render(container, tasks, projects, options);
                };
            });
        }
    },

    getGroupedTasks(tasks) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const groups = {
            overdue: { label: 'Overdue', tasks: [], color: 'text-red-500/70' },
            today: { label: 'Today', tasks: [], color: 'text-primary' },
            completed: { label: 'Completed', tasks: [], color: 'text-emerald-500/60' },
            planned: { label: 'Planned', tasks: [], color: 'text-dim' },
            projects: { label: 'Projects', tasks: [], color: 'text-primary' },
            backlog: { label: 'Backlog', tasks: [], color: 'text-dim/60' }
        };

        const sorted = [...tasks].sort((a, b) => {
            const da = a.start_date ? new Date(a.start_date).getTime() : -Infinity;
            const db = b.start_date ? new Date(b.start_date).getTime() : -Infinity;
            return db - da; // Newest first
        });

        sorted.forEach(t => {
            if (t.status === 'done') {
                groups.completed.tasks.push(t);
                return;
            }
            if (t.status === 'backlog') {
                groups.backlog.tasks.push(t);
                return;
            }
            if (t.task_type === 'project_span') {
                groups.projects.tasks.push(t);
                return;
            }
            if (!t.start_date) {
                groups.backlog.tasks.push(t);
                return;
            }
            // Normalize task dates to compare full days
            const s = new Date(t.start_date);
            const startD = new Date(s.getFullYear(), s.getMonth(), s.getDate());
            const e = t.end_date ? new Date(t.end_date) : s;
            const endD = new Date(e.getFullYear(), e.getMonth(), e.getDate());

            if (endD < today) groups.overdue.tasks.push(t);
            else if (startD <= today && endD >= today) groups.today.tasks.push(t);
            else groups.planned.tasks.push(t);
        });

        return groups;
    }
};
