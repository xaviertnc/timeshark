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
        if (!container._pageState) container._pageState = { completedLimit: localStorage.getItem('tasks_completed_limit') || 'today' };

        // Save focus/selection state before any DOM changes
        const activeEl = document.activeElement;
        const searchFocused = activeEl?.classList.contains('completed-search-input');
        const selStart = searchFocused ? activeEl.selectionStart : null;
        const selEnd = searchFocused ? activeEl.selectionEnd : null;

        // Initialize persistent controls if missing
        if (!container._completedControls) {
            const controls = document.createElement('div');
            controls.className = 'completed-controls-persistent flex items-center gap-2 lg:gap-3 ml-auto';
            controls.innerHTML = `
                <div class="relative w-48">
                    <input type="text" placeholder="Search..." class="completed-search-input w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-2 py-1 text-[11px] font-bold text-main outline-none focus:border-primary/30 transition-all placeholder:text-dim/20">
                    <svg class="w-2.5 h-2.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-dim/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <div class="relative">
                    <select class="completed-limit-select bg-highlight border border-white/5 rounded-md pl-2.5 pr-7 h-[24px] py-0 text-[9px] uppercase tracking-[0.2em] font-black text-primary outline-none appearance-none cursor-pointer hover:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm">
                        <option value="today">Today Only</option>
                        <option value="5">Show 5</option>
                        <option value="7">Show 7</option>
                        <option value="10">Show 10</option>
                        <option value="15">Show 15</option>
                        <option value="30">Show 30</option>
                        <option value="50">Show 50</option>
                        <option value="100">Show 100</option>
                        <option value="all">All History</option>
                    </select>
                    <svg class="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-primary pointer-events-none opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            `;

            const input = controls.querySelector('input');
            const select = controls.querySelector('select');

            input.oninput = (e) => {
                container._pageState.completedSearch = e.target.value;
                this.render(container, tasks, projects, options);
            };
            select.onchange = (e) => {
                container._pageState.completedLimit = e.target.value;
                localStorage.setItem('tasks_completed_limit', e.target.value);
                this.render(container, tasks, projects, options);
            };

            // Sync visual select value
            select.value = container._pageState.completedLimit;

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
        const activeFilters = options.activeFilters || null;

        Object.entries(groups).forEach(([key, group]) => {
            const isActive = activeFilters ? !!activeFilters[key] : true;
            
            // Overdue logic: if Today is active, we often show overdue tasks there too, 
            // but here we follow the filters. If no filters provided, show if has tasks.
            if (!activeFilters && group.tasks.length === 0) return;
            if (activeFilters && !isActive) return;

            // Apply Global Search from Options (if any)
            let groupTasks = group.tasks;
            if (options.searchTerm) {
                const term = options.searchTerm.toLowerCase();
                groupTasks = groupTasks.filter(t => 
                    (t.title || '').toLowerCase().includes(term) || 
                    (t.notes || '').toLowerCase().includes(term) ||
                    (t.tags && t.tags.some(tag => tag.toLowerCase().includes(term)))
                );
            }
            // Apply Project Filter from Options (if any)
            if (options.projectFilter && Array.isArray(options.projectFilter) && options.projectFilter.length > 0) {
                groupTasks = groupTasks.filter(t => options.projectFilter.includes(String(t.project_id)));
            } else if (options.projectFilter && typeof options.projectFilter === 'string' && options.projectFilter !== 'all') {
                groupTasks = groupTasks.filter(t => String(t.project_id) === String(options.projectFilter));
            }

            let showMoreBtn = '';
            let emptyLabel = '';
            let headerAnchor = '';

            if (key === 'completed') {
                const search = container._pageState.completedSearch || '';
                const limit = container._pageState.completedLimit || 'today';

                headerAnchor = `<div class="completed-controls-anchor ml-auto"></div>`;

                // Apply Internal Search
                if (search) {
                    const term = search.toLowerCase();
                    groupTasks = groupTasks.filter(t => 
                        (t.title || '').toLowerCase().includes(term) || 
                        (t.notes || '').toLowerCase().includes(term) ||
                        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(term)))
                    );
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
                } else if (limit !== 'all') {
                    const n = parseInt(limit);
                    groupTasks = groupTasks.slice(0, n);
                }
            } else if (key !== 'projects') {
                const PAGE_SIZE = 15;
                if (!container._pageState[key]) {
                    container._pageState[key] = parseInt(localStorage.getItem(`tasks_limit_${key}`)) || PAGE_SIZE;
                }
                const visibleCount = container._pageState[key];
                const totalInGroup = groupTasks.length;
                
                headerAnchor = `
                    <div class="ml-auto relative">
                        <select class="group-limit-select bg-highlight border border-white/5 rounded-md pl-2.5 pr-7 h-[24px] py-0 text-[9px] uppercase tracking-[0.2em] font-black text-primary outline-none appearance-none cursor-pointer hover:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm" data-group="${key}">
                            <option value="5" ${visibleCount === 5 ? 'selected' : ''}>Show 5</option>
                            <option value="7" ${visibleCount === 7 ? 'selected' : ''}>Show 7</option>
                            <option value="10" ${visibleCount === 10 ? 'selected' : ''}>Show 10</option>
                            <option value="15" ${visibleCount === 15 ? 'selected' : ''}>Show 15</option>
                            <option value="30" ${visibleCount === 30 ? 'selected' : ''}>Show 30</option>
                            <option value="50" ${visibleCount === 50 ? 'selected' : ''}>Show 50</option>
                            <option value="100" ${visibleCount === 100 ? 'selected' : ''}>Show 100</option>
                            <option value="9999" ${visibleCount >= 9999 ? 'selected' : ''}>All Tasks</option>
                        </select>
                        <svg class="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-primary pointer-events-none opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                `;
                
                if (totalInGroup > visibleCount) {
                    showMoreBtn = `
                        <button class="show-more-btn w-full mt-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-dim hover:text-primary transition-colors border border-dashed border-white/5 rounded-lg" data-group="${key}">
                            Show More (+${Math.min(PAGE_SIZE, totalInGroup - visibleCount)})
                        </button>
                    `;
                    groupTasks = groupTasks.slice(0, visibleCount);
                }
            }

            if (groupTasks.length === 0) {
                const padding = mode === 'compact' ? 'py-0.5 px-2' : 'py-1 px-3';
                emptyLabel = `
                    <div class="${padding} flex flex-col items-center justify-center bg-highlight/[0.01] rounded-lg border border-dashed border-white/[0.03]">
                        <div class="text-[8px] font-black italic uppercase tracking-[0.6em] text-dim/[0.1] leading-none">No ${key} tasks</div>
                    </div>
                `;
            }

            const groupEl = document.createElement('div');
            groupEl.className = 'task-group mb-4 last:mb-0';

            const dotColors = {
                overdue: '#ef4444',
                today: '#338a81',
                completed: '#338a81',
                planned: '#338a81',
                projects: '#338a81',
                backlog: '#338a81'
            };
            const dotColor = dotColors[key] || '#64748b';

            groupEl.innerHTML = `
                <div class="flex items-center gap-3 mb-3 px-1">
                    <div class="w-[6px] h-[6px] rounded-full shadow-[0_0_8px_rgba(51,138,129,0.2)]" style="background-color: ${dotColor};"></div>
                    <span class="text-[10px] font-black uppercase tracking-[0.3em]" style="color: ${key === 'overdue' ? '#ef4444' : 'var(--primary)'}">${group.label}</span>
                    <div class="px-2 py-0.5 rounded-full bg-highlight text-[9px] font-black text-dim/40 tabular-nums border border-white/5">
                        ${groupTasks.length}${groupTasks.length < group.tasks.length ? `<span class="opacity-30 mx-1">/</span>${group.tasks.length}` : ''}
                    </div>
                    <div class="flex-grow h-px bg-white/[0.04] ml-2"></div>
                    ${headerAnchor}
                </div>
                ${emptyLabel ? emptyLabel : `
                    <div class="${mode === 'full' ? 'grid grid-cols-1 gap-3' : 'space-y-0.5'}">
                        ${groupTasks.map(t => TaskItem.render(t, projects, { mode, selectionMode: options.selectionMode })).join('')}
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
                
                // Adjust search input width in compact mode
                const searchInput = container._completedControls.querySelector('.completed-search-input');
                if (searchInput) {
                    const totalCompleted = tasks.filter(t => t.status === 'done').length;
                    
                    if (mode === 'compact' && totalCompleted <= 30) {
                        searchInput.parentElement.classList.add('hidden'); // Hide search in sidebar
                    } else {
                        searchInput.parentElement.classList.remove('hidden');
                    }
                }
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
                    localStorage.setItem(`tasks_limit_${groupKey}`, container._pageState[groupKey]);
                    this.render(container, tasks, projects, options);
                };
            });

            // Attach handlers for standard group limit selects
            listDiv.querySelectorAll('.group-limit-select').forEach(select => {
                select.onchange = (e) => {
                    const groupKey = select.dataset.group;
                    const val = parseInt(e.target.value);
                    container._pageState[groupKey] = val;
                    localStorage.setItem(`tasks_limit_${groupKey}`, val);
                    this.render(container, tasks, projects, options);
                };
            });
        }
    },

    /**
     * Determines the effective "Display & Sort" date for a finished task.
     * Using the exact completion timestamp explicitly recorded by the user.
     */
    _getCompletedDisplayDate(t) {
        if (!t.completed_at) return null;
        return new Date(t.completed_at);
    },

    getGroupedTasks(tasks) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const groups = {
            today: { label: 'Today', tasks: [], color: 'text-primary' },
            overdue: { label: 'Overdue', tasks: [], color: 'text-red-500' },
            planned: { label: 'Planned', tasks: [], color: 'text-primary' },
            backlog: { label: 'Backlog', tasks: [], color: 'text-primary' },
            completed: { label: 'Completed', tasks: [], color: 'text-primary' }
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
            if (t.task_type === 'project_span') return;
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

        // Sort Today group: most recent start_date first
        groups.today.tasks.sort((a, b) => {
            const da = a.start_date ? new Date(a.start_date).getTime() : -Infinity;
            const db = b.start_date ? new Date(b.start_date).getTime() : -Infinity;
            return db - da;
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

