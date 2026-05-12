/**
 * components/task-list.js
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
        if (!container._pageState) container._pageState = { completedLimit: 'today' };

        // Save focus/selection state before any DOM changes
        const activeEl = document.activeElement;
        const searchFocused = activeEl?.classList.contains('completed-search-input');
        const selStart = searchFocused ? activeEl.selectionStart : null;
        const selEnd = searchFocused ? activeEl.selectionEnd : null;

        // Initialize persistent controls if missing (Full mode only)
        if (!container._completedControls && mode === 'full') {
            const controls = document.createElement('div');
            controls.className = 'completed-controls-persistent flex items-center gap-3 ml-auto';
            controls.innerHTML = `
                <div class="relative w-48">
                    <input type="text" placeholder="Search..." class="completed-search-input w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-2 py-1 text-[11px] font-bold text-main outline-none focus:border-primary/30 transition-all placeholder:text-dim/20">
                    <svg class="w-2.5 h-2.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-dim/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <select class="completed-limit-select bg-white/5 border-none rounded-lg px-2 py-1 text-[11px] font-black text-primary outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer">
                    <option value="today">Today Only</option>
                    <option value="15">Show 15</option>
                    <option value="30">Show 30</option>
                    <option value="50">Show 50</option>
                    <option value="100">Show 100</option>
                    <option value="all">All History</option>
                </select>
            `;

            const input = controls.querySelector('input');
            const select = controls.querySelector('select');

            input.oninput = (e) => {
                container._pageState.completedSearch = e.target.value;
                this.render(container, tasks, projects, options);
            };
            select.onchange = (e) => {
                container._pageState.completedLimit = e.target.value;
                this.render(container, tasks, projects, options);
            };

            container._completedControls = controls;
        }

        // Sync control values from state
        if (container._completedControls) {
            const input = container._completedControls.querySelector('input');
            const select = container._completedControls.querySelector('select');
            if (input && input !== document.activeElement) {
                input.value = container._pageState.completedSearch || '';
            }
            if (select) {
                select.value = container._pageState.completedLimit || 'today';
            }
        }

        // Grouping & Sorting
        const groups = this.getGroupedTasks(tasks);

        const listDiv = document.createElement('div');
        listDiv.className = mode === 'full' ? 'space-y-6 px-1' : 'space-y-4';

        // Render Groups
        Object.entries(groups).forEach(([key, group]) => {
            if (group.tasks.length === 0 && (key !== 'completed' || !showDone)) return;
            if (key === 'completed' && !showDone) return;

            let groupTasks = group.tasks;
            let showMoreBtn = '';
            let emptyLabel = '';
            let headerAnchor = '';

            if (key === 'completed') {
                const search = container._pageState.completedSearch || '';
                const limit = container._pageState.completedLimit || 'today';

                if (mode === 'full') {
                    headerAnchor = `<div class="completed-controls-anchor ml-auto"></div>`;
                }

                // Apply Search
                if (search) {
                    groupTasks = groupTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
                }

                // Apply Limit/Today Logic
                if (limit === 'today') {
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                    groupTasks = groupTasks.filter(t => {
                        const d = this._getCompletedDisplayDate(t);
                        if (!d) return false;
                        const taskDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                        return taskDay === today;
                    });

                    if (groupTasks.length === 0) {
                        const padding = mode === 'compact' ? 'py-1 px-2' : 'py-2 px-4';
                        emptyLabel = `<div class="${padding} text-center text-dim/10 text-[9px] font-black italic uppercase tracking-[0.3em] bg-white/[0.01] rounded-lg border border-white/[0.02]">No items for today</div>`;
                    }
                } else if (limit !== 'all') {
                    const n = parseInt(limit);
                    groupTasks = groupTasks.slice(0, n);
                }

                if (groupTasks.length === 0 && !emptyLabel) {
                    const padding = mode === 'compact' ? 'py-1 px-2' : 'py-2 px-4';
                    emptyLabel = `<div class="${padding} text-center text-dim/10 text-[9px] font-black italic uppercase tracking-[0.3em] bg-white/[0.01] rounded-lg border border-white/[0.02]">No matching tasks</div>`;
                }
            } else {
                const PAGE_SIZE = 15;
                if (!container._pageState[key]) container._pageState[key] = PAGE_SIZE;
                const visibleCount = container._pageState[key];
                groupTasks = group.tasks.slice(0, visibleCount);
                if (group.tasks.length > visibleCount) {
                    showMoreBtn = `
                        <button class="show-more-btn w-full mt-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-dim hover:text-primary transition-colors border border-dashed border-white/5 rounded-lg" data-group="${key}">
                            Show More (+${Math.min(PAGE_SIZE, group.tasks.length - visibleCount)})
                        </button>
                    `;
                }
            }

            const groupEl = document.createElement('div');
            groupEl.className = 'task-group mb-6';

            groupEl.innerHTML = `
                <div class="flex items-center gap-2 mb-2 px-2">
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] ${group.color}">${group.label}</span>
                    <span class="text-[9px] font-bold text-dim/30 mr-2">(${groupUsage(groupTasks, key, container)})</span>
                    <div class="flex-grow h-px bg-white/5"></div>
                    ${headerAnchor}
                </div>
                ${emptyLabel ? emptyLabel : `
                    <div class="${mode === 'full' ? 'grid grid-cols-1 gap-3' : 'space-y-0'}">
                        ${groupTasks.map(t => TaskItem.render(t, projects, { mode })).join('')}
                    </div>
                `}
                ${showMoreBtn}
            `;
            listDiv.appendChild(groupEl);
        });

        function groupUsage(tasks, key, container) {
            return tasks.length;
        }

        if (listDiv.children.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-dim/40 text-xs font-medium italic">No tasks found</div>`;
        } else {
            container.innerHTML = '';
            container.appendChild(listDiv);

            // Move persistent controls into anchor
            const anchor = listDiv.querySelector('.completed-controls-anchor');
            if (anchor && container._completedControls) {
                anchor.appendChild(container._completedControls);
            }

            // Restore focus and selection if search was active
            if (searchFocused) {
                const input = container._completedControls?.querySelector('input');
                if (input) {
                    input.focus();
                    if (selStart !== null) {
                        input.setSelectionRange(selStart, selEnd);
                    }
                }
            }

            // Re-attach handlers for show more (non-completed groups)
            listDiv.querySelectorAll('.show-more-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const groupKey = btn.dataset.group;
                    const current = container._pageState[groupKey] || 15;
                    container._pageState[groupKey] = current + 15;
                    this.render(container, tasks, projects, options);
                };
            });
        }
    },

    /**
     * COMPLETED TASK DATE LOGIC (DO NOT CHANGE):
     * Determines the effective "Display & Sort" date for a finished task.
     * 
     * RULE: 
     * - We MUST use the Date (day/month/year) from the scheduled 'end_date' if it exists.
     * - We MUST use the Time (hours/mins/secs) from the 'completed_at' timestamp.
     * - If no 'end_date' exists, we default to the full 'completed_at' timestamp.
     * 
     * IMPLEMENTATION NOTE:
     * - We construct the date using Year/Month/Day integers from the string to ensure
     *   it matches the LOCAL calendar day exactly, avoiding timezone shifts.
     */
    _getCompletedDisplayDate(t) {
        if (!t.completed_at) return null;
        const comp = new Date(t.completed_at);

        if (t.end_date) {
            // Force strict local date construction from the string
            // Formats are typically "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"
            const datePart = t.end_date.split('T')[0];
            const [y, m, d] = datePart.split('-').map(Number);

            // Note: Month is 0-indexed in JS Date
            return new Date(y, m - 1, d, comp.getHours(), comp.getMinutes(), comp.getSeconds());
        }
        return comp;
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

        // Sort Today group: earliest start_date first
        groups.today.tasks.sort((a, b) => {
            const da = a.start_date ? new Date(a.start_date).getTime() : Infinity;
            const db = b.start_date ? new Date(b.start_date).getTime() : Infinity;
            return da - db;
        });

        // Special Sort for Completed (Newest display date first)
        groups.completed.tasks.sort((a, b) => {
            const da = this._getCompletedDisplayDate(a)?.getTime() || 0;
            const db = this._getCompletedDisplayDate(b)?.getTime() || 0;
            return db - da;
        });

        return groups;
    }
};

