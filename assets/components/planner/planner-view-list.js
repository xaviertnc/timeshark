/**
 * assets/components/planner/planner-view-list.js
 * 
 * Renders task lists for both the sidebar (compact) and full list view.
 * Supports category filtering, inline progress, time display, and priority indicators.
 */

import { PlannerUtils } from './planner-utils.js';

export const PlannerList = {
    render(container, tasks, projects, options = {}) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const isFull = options.fullWidth || false;
        const limit = options.limit || 0;
        const showDone = options.showDone || false;
        const category = options.category || null;
        const sidebarFilters = options.sidebarFilters || null;
        const hideQuickAdd = options.hideQuickAdd || false;

        container.innerHTML = '';

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        // Separate Active and Completed
        const isCompletedToday = (t) => {
            if (t.status !== 'done') return false;
            const completedDate = t.completed_at || t.start_date;
            if (!completedDate) return false;
            const d = new Date(completedDate); d.setHours(0, 0, 0, 0);
            return d.getTime() >= today.getTime() && d.getTime() < tomorrow.getTime();
        };
        // Completed tasks always go to completedTasks, never in active list
        let activeTasks = tasks.filter(t => t.status !== 'done');
        let completedTasks = tasks.filter(t => t.status === 'done');

        // Helper: does a task's date range intersect with today?
        const intersectsToday = (t) => {
            if (!t.start_date) return false;
            const startDay = new Date(t.start_date); startDay.setHours(0, 0, 0, 0);
            const endDay = t.end_date ? new Date(t.end_date) : new Date(startDay);
            endDay.setHours(23, 59, 59, 999);
            return startDay <= tomorrow && endDay >= today;
        };

        // Multi-select sidebar filtering
        if (sidebarFilters) {
            const merged = new Set();
            const mergedTasks = [];
            const addTasks = (list) => {
                list.forEach(t => { if (!merged.has(t.id)) { merged.add(t.id); mergedTasks.push(t); } });
            };
            if (sidebarFilters.today) addTasks(activeTasks.filter(t => intersectsToday(t)));
            if (sidebarFilters.planned) addTasks(activeTasks.filter(t => t.task_type !== 'project_span'));
            if (sidebarFilters.projects) addTasks(activeTasks.filter(t => t.task_type === 'project_span'));
            // If only completed is on, clear active tasks
            if (!sidebarFilters.today && !sidebarFilters.planned && !sidebarFilters.projects) {
                activeTasks = [];
            } else {
                activeTasks = mergedTasks;
            }
        } else if (category === 'today') {
            // Legacy single-category (dashboard uses this)
            activeTasks = activeTasks.filter(t => intersectsToday(t));
        } else if (category === 'completed') {
            activeTasks = [];
        } else if (category === 'projects') {
            activeTasks = activeTasks.filter(t => t.task_type === 'project_span');
        }

        if (limit > 0) activeTasks = activeTasks.slice(0, limit);

        // Sort: completed tasks go to the bottom, then by start_time descending (newest first), then by id descending
        activeTasks.sort((a, b) => {
            // Completed tasks sink to bottom
            const aDone = a.status === 'done' ? 1 : 0;
            const bDone = b.status === 'done' ? 1 : 0;
            if (aDone !== bDone) return aDone - bDone;

            const da = a.start_date ? new Date(a.start_date).getTime() : -Infinity;
            const db = b.start_date ? new Date(b.start_date).getTime() : -Infinity;
            if (da !== db) return db - da; // Newest first
            // Fall back to id descending (newest created first)
            const ia = a.id || '';
            const ib = b.id || '';
            return ia > ib ? -1 : ia < ib ? 1 : 0;
        });

        // Group
        const groups = {
            'overdue': { label: 'Overdue', tasks: [], color: 'text-red-500/80' },
            'projects': { label: 'Projects', tasks: [], color: 'text-primary' },
            'today': { label: 'Today', tasks: [], color: 'text-primary' },
            'later': { label: 'Planned', tasks: [], color: 'text-dim' },
            'nodate': { label: 'Backlog', tasks: [], color: 'text-dim' }
        };

        activeTasks.forEach(t => {
            // Project span tasks always go to PROJECTS group
            if (t.task_type === 'project_span') {
                groups['projects'].tasks.push(t);
                return;
            }
            if (!t.start_date) { groups['nodate'].tasks.push(t); return; }
            const startD = new Date(t.start_date);
            // Use end_date for overdue check — task is only overdue if its end time has passed
            const endD = t.end_date ? new Date(t.end_date) : startD;
            // Completed tasks should never show as overdue
            if (t.status === 'done') { groups['today'].tasks.push(t); }
            else if (endD < new Date()) groups['overdue'].tasks.push(t);
            else if (intersectsToday(t)) groups['today'].tasks.push(t);
            else groups['later'].tasks.push(t);
        });

        const listContent = document.createElement('div');
        listContent.className = isFull ? 'space-y-6' : 'space-y-4';

        // Compute project-level progress for span tasks
        const getProjectProgress = (projectId) => {
            // First: use the project's own progress field (authoritative source)
            const proj = projects.find(p => p.id == projectId);
            if (proj && proj.progress !== undefined && proj.progress !== null) {
                return parseInt(proj.progress) || 0;
            }
            // Fallback: compute average from non-span tasks
            const projectTasks = tasks.filter(t =>
                (t.project_id || 'personal') == projectId &&
                t.task_type !== 'project_span'
            );
            if (projectTasks.length === 0) return 0;
            const total = projectTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
            return Math.round(total / projectTasks.length);
        };

        // Priority config
        const prioConf = {
            high: { dot: 'bg-red-500', label: 'High', bg: 'bg-red-500/10', color: 'text-red-500' },
            medium: { dot: 'bg-amber-500', label: 'Med', bg: 'bg-amber-500/10', color: 'text-amber-500' },
            low: { dot: 'bg-emerald-500', label: 'Low', bg: 'bg-emerald-500/10', color: 'text-emerald-500' }
        };

        const progressBarColor = (v) => v >= 100 ? 'bg-emerald-500' : v >= 50 ? 'bg-primary' : v > 0 ? 'bg-amber-500' : 'bg-white/20';

        const formatTime = (t) => {
            if (!t.start_date) return '';
            const s = new Date(t.start_date);
            const dateStr = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (!t.start_date.includes('T')) return dateStr;
            const sTime = s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
            if (t.end_date && t.end_date.includes('T')) {
                const e = new Date(t.end_date);
                const eTime = e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
                const eDateStr = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                // Show end date if it differs from start date
                if (eDateStr !== dateStr) {
                    return `${dateStr} ${sTime} – ${eDateStr} ${eTime}`;
                }
                return `${dateStr}, ${sTime} – ${eTime}`;
            }
            return `${dateStr}, ${sTime}`;
        };

        // ──── SIDEBAR COMPACT CARD (progress BELOW content) ────
        const renderCompactCard = (t) => {
            const proj = projects.find(p => p.id == t.project_id) || { name: 'Unassigned', color: '#64748b' };
            const isDone = t.status === 'done';
            const isSpan = t.task_type === 'project_span';
            const progress = isSpan ? getProjectProgress(t.project_id || 'personal') : (t.progress || 0);
            const prio = prioConf[t.priority] || prioConf.medium;
            const timeStr = formatTime(t);
            const isContinuous = !!proj.continuous;

            return `
                <div class="task-item group/task px-2.5 py-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer relative" data-task-id="${t.id}">
                    ${t.priority && t.priority !== 'low' ? `<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${prio.dot}"></span>` : ''}
                    <div class="flex items-start gap-2">
                        ${isSpan
                    ? `<div class="shrink-0 w-4 h-4 mt-0.5 rounded-sm bg-primary flex items-center justify-center">
                                <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                               </div>`
                    : `<button class="toggle-status-btn shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-white' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}" data-task-id="${t.id}">
                                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                               </button>`
                }

                        <div class="flex-grow min-w-0">
                            <div class="text-sm font-bold leading-tight truncate pr-4 ${isDone ? 'text-dim line-through opacity-50' : 'text-main'}">${t.title}</div>
                            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap opacity-40">
                                ${isSpan ? '<span class="text-[7px] font-black uppercase tracking-wider px-1 py-px rounded bg-white/8 text-dim">SPAN</span>' : ''}
                                <span class="text-[9px] font-bold text-dim truncate">${proj.name}</span>
                                ${timeStr ? `<span class="text-[8px] font-bold text-dim truncate">${timeStr}</span>` : ''}
                            </div>
                            ${!isContinuous ? `
                            <!-- Progress bar — fill uses project color -->
                            <div class="flex items-center gap-1.5 mt-1.5">
                                <div class="inline-progress-bar flex-grow h-2.5 bg-white/5 rounded-full overflow-hidden cursor-pointer relative" data-task-id="${t.id}" data-progress="${progress}">
                                    <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-300" style="width: ${Math.max(progress, 4)}%; background-color: ${proj.color}"></div>
                                    <span class="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white/90 leading-none drop-shadow-sm">${progress}%</span>
                                </div>
                                ${isDone && t.completed_at ? `<span class="text-[7px] font-bold text-emerald-500/60 whitespace-nowrap shrink-0">✓ ${new Date(t.completed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
                            </div>` : `
                            <div class="mt-1.5">
                                <span class="text-[7px] font-black uppercase tracking-wider text-dim/30">∞ Continuous</span>
                            </div>`}
                        </div>
                    </div>
                </div>
            `;
        };

        // ──── FULL LIST CARD ────
        const renderFullCard = (t) => {
            const proj = projects.find(p => p.id == t.project_id) || { name: 'Unassigned', color: '#64748b' };
            const isDone = t.status === 'done';
            const isSpan = t.task_type === 'project_span';
            const progress = isSpan ? getProjectProgress(t.project_id || 'personal') : (t.progress || 0);
            const prio = prioConf[t.priority] || prioConf.medium;
            const timeStr = formatTime(t);
            const isContinuous = !!proj.continuous;

            // List row — card style matching history entries
            return `
                <div class="task-item group/task relative flex items-center gap-3 p-4 rounded-xl bg-card border border-soft shadow-sm hover:border-primary/20 transition-all cursor-pointer" data-task-id="${t.id}">
                    ${isSpan
                    ? `<div class="shrink-0 w-5 h-5 rounded-sm bg-primary flex items-center justify-center">
                            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                           </div>`
                    : `<button class="toggle-status-btn shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}" data-task-id="${t.id}">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                           </button>`
                }

                    <div class="flex-grow min-w-0">
                        <span class="text-base font-bold transition-all truncate leading-snug block ${isDone ? 'text-dim line-through opacity-50' : 'text-main group-hover/task:text-primary'}">${t.title}</span>
                        <div class="flex items-center gap-2.5 mt-1 opacity-40">
                            <div class="flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${proj.color}"></span>
                                <span class="text-xs font-black text-dim uppercase tracking-wider">${proj.name}</span>
                            </div>
                            ${timeStr ? `<div class="flex items-center gap-1 text-dim">
                                <span class="w-px h-2 bg-white/5"></span>
                                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span class="text-xs font-bold tracking-tight">${timeStr}</span>
                            </div>` : ''}
                            ${t.priority && t.priority !== 'low' ? `<span class="${prio.bg} ${prio.color} text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none" title="${prio.label} priority">${prio.label}</span>` : ''}
                        </div>
                    </div>

                    <!-- Progress bar with centered % -->
                    ${!isContinuous ? `
                    <div class="inline-progress-bar shrink-0 w-24 h-5 bg-white/10 rounded-md overflow-hidden cursor-pointer relative" data-task-id="${t.id}" data-progress="${progress}">
                        <div class="absolute inset-y-0 left-0 rounded-md transition-all duration-300" style="width: ${Math.max(progress, 6)}%; background-color: ${proj.color}; opacity: ${isDone ? 0.35 : 1}"></div>
                        <span class="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-sm leading-none ${isDone ? 'opacity-50' : ''}">${progress}%</span>
                    </div>` : `
                    <span class="shrink-0 text-[8px] font-black uppercase tracking-wider text-dim/30">∞ Continuous</span>`}

                    <div class="flex items-center opacity-0 group-hover/task:opacity-100 transition-opacity gap-1 shrink-0">
                         <button class="track-btn w-8 h-8 flex items-center justify-center rounded-lg text-dim/50 hover:text-primary hover:bg-primary/10 transition-all" title="Track Time" data-task-id="${t.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                         </button>
                         <button class="delete-task-btn w-8 h-8 flex items-center justify-center rounded-lg text-dim/50 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Delete" data-task-id="${t.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                         </button>
                    </div>
                </div>
            `;
        };

        // Choose render function
        const renderCard = isFull ? renderFullCard : renderCompactCard;

        // Render Groups
        ['today', 'overdue', 'projects', 'later', 'nodate'].forEach(key => {
            const gTasks = groups[key].tasks;
            if (gTasks.length === 0) return;
            // Hide projects group unless projects filter is on
            if (key === 'projects' && sidebarFilters && !sidebarFilters.projects) return;

            const groupEl = document.createElement('div');
            groupEl.className = 'animate-in fade-in slide-in-from-bottom-2 duration-500';

            groupEl.innerHTML = `
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] ${groups[key].color}">${groups[key].label}</span>
                    <div class="h-px flex-grow bg-white/5"></div>
                    <span class="text-[9px] font-black text-dim opacity-30">${gTasks.length}</span>
                </div>
                <div class="flex flex-col space-y-3">
                    ${gTasks.map(t => renderCard(t)).join('')}
                </div>
            `;
            listContent.appendChild(groupEl);
        });

        // Quick-add (only for full view, unless explicitly hidden)
        if (isFull && !hideQuickAdd) {
            const currentProjectFilter = options.projectFilter || 'all';

            const quickAdd = document.createElement('div');
            quickAdd.className = 'mt-4 px-1';
            quickAdd.innerHTML = `
                <div class="bg-white/2 hover:bg-white/3 border border-white/5 rounded-xl p-2 transition-all focus-within:bg-white/5 focus-within:ring-1 focus-within:ring-primary/20 shadow-sm">
                    <div class="flex items-center gap-2">
                        <!-- Plus icon -->
                        <div class="shrink-0 w-8 h-8 flex items-center justify-center text-primary/40">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        <!-- Task name -->
                        <input type="text" id="quick-add-input" placeholder="Add a task..."
                               class="flex-1 bg-transparent border-none text-sm font-bold text-main outline-none placeholder:text-dim/30 min-w-0 px-3 py-2">
                        <!-- Project selector -->
                        <div class="relative shrink-0">
                            <select id="quick-add-project" class="h-8 bg-white/5 border border-white/5 rounded-lg px-3 pr-7 text-[10px] font-black uppercase tracking-widest text-dim appearance-none cursor-pointer focus:ring-1 focus:ring-primary/20 outline-none transition-all hover:bg-white/8">
                                ${projects.map(p => `<option value="${p.id}" ${String(p.id) === String(currentProjectFilter !== 'all' ? currentProjectFilter : '') ? 'selected' : ''}>${p.name}</option>`).join('')}
                            </select>
                            <div class="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-dim opacity-40">
                                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                        <!-- Add button -->
                        <button id="quick-add-btn" class="shrink-0 h-8 px-4 bg-primary/15 hover:bg-primary/25 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
                            Add
                        </button>
                    </div>
                </div>
            `;
            listContent.appendChild(quickAdd);
        }

        // Completed Section — with search, grouping, and pagination
        if (completedTasks.length > 0 && showDone) {
            const completedEl = document.createElement('div');
            completedEl.className = isFull ? 'mt-8 pt-4 border-t border-white/5' : 'mt-4 pt-3 border-t border-white/5';
            listContent.appendChild(completedEl);

            let perPage = 'today';
            let currentPage = 1;
            let searchQuery = '';
            const groupBy = 'day';

            // Group tasks by time period
            const getGroupLabel = (dateStr, mode) => {
                if (!dateStr) return 'Unknown';
                const d = new Date(dateStr);
                if (mode === 'day') return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                if (mode === 'week') {
                    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
                    const end = new Date(start); end.setDate(start.getDate() + 6);
                    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
                }
                if (mode === 'month') return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                if (mode === 'year') return d.getFullYear().toString();
                return '';
            };

            const renderCompleted = () => {
                // Filter
                let filtered = completedTasks;

                // 'today' show filter: only show tasks completed today
                if (perPage === 'today') {
                    filtered = filtered.filter(t => {
                        const completedDate = t.completed_at || t.start_date;
                        if (!completedDate) return false;
                        const d = new Date(completedDate); d.setHours(0, 0, 0, 0);
                        return d.getTime() >= today.getTime() && d.getTime() < tomorrow.getTime();
                    });
                }

                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    filtered = filtered.filter(t => {
                        const proj = projects.find(p => p.id == t.project_id);
                        const projName = proj ? proj.name.toLowerCase() : '';
                        const resourceName = (t.resource_id || '').toLowerCase();
                        return t.title.toLowerCase().includes(q) || projName.includes(q) || resourceName.includes(q);
                    });
                }

                // Sort by completed_at descending (most recent first)
                filtered.sort((a, b) => {
                    const da = a.completed_at ? new Date(a.completed_at) : new Date(0);
                    const db = b.completed_at ? new Date(b.completed_at) : new Date(0);
                    return db - da;
                });

                // Group all filtered tasks
                const groups = new Map();
                filtered.forEach(t => {
                    const label = getGroupLabel(t.completed_at || t.start_date, groupBy);
                    if (!groups.has(label)) groups.set(label, []);
                    groups.get(label).push(t);
                });

                // Pagination (skip when perPage is 'today' — show all today's items)
                const numericPerPage = (perPage === 'today') ? filtered.length || 1 : perPage;
                let totalPages;
                let pageGroups;

                if (groupBy === 'day') {
                    const totalItems = filtered.length;
                    totalPages = Math.max(1, Math.ceil(totalItems / numericPerPage));
                    if (currentPage > totalPages) currentPage = totalPages;
                    const startIdx = (currentPage - 1) * numericPerPage;
                    const pageItems = filtered.slice(startIdx, startIdx + numericPerPage);

                    pageGroups = new Map();
                    pageItems.forEach(t => {
                        const label = getGroupLabel(t.completed_at || t.start_date, groupBy);
                        if (!pageGroups.has(label)) pageGroups.set(label, []);
                        pageGroups.get(label).push(t);
                    });
                } else {
                    // Paginate by groups
                    const groupsArr = [...groups.entries()];
                    totalPages = Math.max(1, Math.ceil(groupsArr.length / numericPerPage));
                    if (currentPage > totalPages) currentPage = totalPages;
                    const startIdx = (currentPage - 1) * numericPerPage;
                    pageGroups = new Map(groupsArr.slice(startIdx, startIdx + numericPerPage));
                }

                const innerEl = completedEl.querySelector('#completed-inner');
                innerEl.innerHTML = '';

                // Render grouped items
                pageGroups.forEach((tasks, label) => {
                    const groupHtml = `
                        <div class="mb-3">
                            <div class="flex items-center gap-2 mb-1.5 px-1">
                                <span class="text-[9px] font-black uppercase tracking-[0.15em] text-dim/50">${label}</span>
                                <div class="h-px flex-grow bg-white/5"></div>
                                <span class="text-[8px] font-black text-dim/30">${tasks.length}</span>
                            </div>
                            <div class="flex flex-col">
                                ${tasks.map(t => renderCard(t)).join('')}
                            </div>
                        </div>
                    `;
                    innerEl.insertAdjacentHTML('beforeend', groupHtml);
                });

                if (pageGroups.size === 0) {
                    innerEl.innerHTML = `<div class="text-center py-6 text-dim/30 text-[10px] font-bold uppercase tracking-widest">No completed tasks found</div>`;
                }

                // Pagination
                const pagEl = completedEl.querySelector('#completed-header-pagination');
                if (totalPages > 1) {
                    pagEl.innerHTML = `
                        <div class="flex items-center gap-1 flex-wrap">
                            <button class="comp-page-btn w-6 h-6 rounded-md transition-all flex items-center justify-center ${currentPage <= 1 ? 'opacity-15 pointer-events-none bg-white/3' : 'bg-white/5 border border-white/8 text-dim/60 hover:text-main hover:bg-white/10'}" data-page="1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                            </button>
                            <button class="comp-page-btn w-6 h-6 rounded-md transition-all flex items-center justify-center ${currentPage <= 1 ? 'opacity-15 pointer-events-none bg-white/3' : 'bg-white/5 border border-white/8 text-dim/60 hover:text-main hover:bg-white/10'}" data-page="${currentPage - 1}">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <span class="px-1.5 py-0.5 text-[10px] font-bold text-dim/50 tabular-nums whitespace-nowrap">${currentPage}/${totalPages}</span>
                            <button class="comp-page-btn w-6 h-6 rounded-md transition-all flex items-center justify-center ${currentPage >= totalPages ? 'opacity-15 pointer-events-none bg-white/3' : 'bg-white/5 border border-white/8 text-dim/60 hover:text-main hover:bg-white/10'}" data-page="${currentPage + 1}">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                            <button class="comp-page-btn w-6 h-6 rounded-md transition-all flex items-center justify-center ${currentPage >= totalPages ? 'opacity-15 pointer-events-none bg-white/3' : 'bg-white/5 border border-white/8 text-dim/60 hover:text-main hover:bg-white/10'}" data-page="${totalPages}">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                            </button>
                        </div>
                    `;
                    pagEl.querySelectorAll('.comp-page-btn').forEach(btn => {
                        btn.onclick = () => { currentPage = parseInt(btn.dataset.page); renderCompleted(); };
                    });
                } else {
                    pagEl.innerHTML = '';
                }
            };

            const initCompleted = () => {
                completedEl.innerHTML = `
                    <!-- Header row: styled like TODAY/OVERDUE sections -->
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">${perPage === 'today' ? 'Completed Today' : 'Completed'}</span>
                        <div class="h-px flex-grow bg-white/5"></div>
                        <span class="text-[9px] font-black text-dim opacity-30">${completedTasks.length}</span>
                    </div>

                    <div id="completed-controls" class="flex items-center gap-2 mb-4">
                        <!-- Show -->
                        <div class="flex items-center gap-1.5 shrink-0">
                            <span class="text-[9px] font-bold text-dim/25 uppercase tracking-widest whitespace-nowrap">Show:</span>
                            <div class="flex items-center gap-0 bg-white/3 rounded-lg border border-white/5 p-0.5">
                                ${['today', 3, 5, 10, 16, 20].map(n => `
                                    <button class="comp-perpage-btn px-1.5 py-1 rounded-md text-[9px] font-bold tabular-nums transition-all ${String(n) === String(perPage) ? 'bg-primary/20 text-primary shadow-sm' : 'text-dim/40 hover:text-dim hover:bg-white/5'}" data-perpage="${n}">${n === 'today' ? 'Today' : n}</button>
                                `).join('')}
                            </div>
                        </div>
                        <!-- Pagination -->
                        <div id="completed-header-pagination" class="shrink-0"></div>
                        <!-- Search (only when not 'today') -->
                        ${perPage !== 'today' ? `
                        <div class="relative w-48 shrink-0">
                            <div class="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-dim/30">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <input type="text" id="completed-search" placeholder="Search..." class="w-full bg-white/3 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-bold text-main focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-dim/25">
                        </div>` : ''}
                    </div>

                    <div id="completed-inner"></div>
                `;

                // Wire up controls
                const searchInput = completedEl.querySelector('#completed-search');
                if (searchInput) {
                    searchInput.oninput = (e) => { searchQuery = e.target.value; currentPage = 1; renderCompleted(); };
                }

                completedEl.querySelectorAll('.comp-perpage-btn').forEach(btn => {
                    btn.onclick = () => {
                        const val = btn.dataset.perpage;
                        perPage = val === 'today' ? 'today' : parseInt(val);
                        currentPage = 1;
                        searchQuery = '';
                        initCompleted();
                    };
                });

                renderCompleted();
            };

            initCompleted();
        }

        // Empty state
        if (activeTasks.length === 0 && completedTasks.length === 0) {
            listContent.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 opacity-30">
                    <div class="w-14 h-14 mb-4 text-dim bg-white/2 rounded-full flex items-center justify-center border border-dashed border-white/10">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    </div>
                    <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em]">No tasks</p>
                </div>
            `;
        }

        container.appendChild(listContent);
    }
};
