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
        const viewMode = options.viewMode || 'list';
        const useGrid = isFull && viewMode === 'grid';
        const category = options.category || null;

        container.innerHTML = '';

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        // Separate Active and Completed
        let activeTasks = tasks.filter(t => t.status !== 'done');
        let completedTasks = tasks.filter(t => t.status === 'done');

        // Category filtering for sidebar
        if (category === 'today') {
            activeTasks = activeTasks.filter(t => {
                if (!t.start_date) return false;
                const d = new Date(t.start_date); d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (category === 'completed') {
            activeTasks = [];
        }

        if (limit > 0) activeTasks = activeTasks.slice(0, limit);

        // Sort by date
        activeTasks.sort((a, b) => {
            const da = a.start_date ? new Date(a.start_date) : new Date(8640000000000000);
            const db = b.start_date ? new Date(b.start_date) : new Date(8640000000000000);
            return da - db;
        });

        // Group
        const groups = {
            'overdue': { label: 'Overdue', tasks: [], color: 'text-red-500/80' },
            'today': { label: 'Today', tasks: [], color: 'text-primary' },
            'later': { label: 'Planned', tasks: [], color: 'text-dim' },
            'nodate': { label: 'Backlog', tasks: [], color: 'text-dim' }
        };

        activeTasks.forEach(t => {
            if (!t.start_date) { groups['nodate'].tasks.push(t); return; }
            const d = new Date(t.start_date);
            if (d < today) groups['overdue'].tasks.push(t);
            else if (d < tomorrow) groups['today'].tasks.push(t);
            else groups['later'].tasks.push(t);
        });

        const listContent = document.createElement('div');
        listContent.className = isFull ? 'py-6 px-6 space-y-8' : 'space-y-4';

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
                return `${dateStr}, ${sTime} – ${eTime}`;
            }
            return `${dateStr}, ${sTime}`;
        };

        // ──── SIDEBAR COMPACT CARD (progress BELOW content) ────
        const renderCompactCard = (t) => {
            const proj = projects.find(p => p.id == t.project_id) || { name: 'Unassigned', color: '#64748b' };
            const isDone = t.status === 'done';
            const progress = t.progress || 0;
            const prio = prioConf[t.priority] || prioConf.medium;
            const timeStr = formatTime(t);

            return `
                <div class="task-item group/task px-2.5 py-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer relative" data-task-id="${t.id}">
                    ${t.priority && t.priority !== 'low' ? `<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${prio.dot}"></span>` : ''}
                    <div class="flex items-start gap-2">
                        <button class="toggle-status-btn shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-white' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}" data-task-id="${t.id}">
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                        </button>

                        <div class="flex-grow min-w-0">
                            <div class="text-[12px] font-bold leading-tight truncate pr-4 ${isDone ? 'text-dim line-through opacity-50' : 'text-main'}">${t.title}</div>
                            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span class="text-[9px] font-bold text-dim/50 truncate">${proj.name}</span>
                                ${timeStr ? `<span class="text-[8px] font-bold text-dim/40 truncate">${timeStr}</span>` : ''}
                            </div>
                            <!-- Progress bar — fill uses project color -->
                            <div class="inline-progress-bar mt-1.5 w-full h-2.5 bg-white/5 rounded-full overflow-hidden cursor-pointer relative" data-task-id="${t.id}" data-progress="${progress}">
                                <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-300" style="width: ${Math.max(progress, 4)}%; background-color: ${proj.color}"></div>
                                <span class="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white/90 leading-none drop-shadow-sm">${progress}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        // ──── FULL LIST CARD ────
        const renderFullCard = (t) => {
            const proj = projects.find(p => p.id == t.project_id) || { name: 'Unassigned', color: '#64748b' };
            const isDone = t.status === 'done';
            const progress = t.progress || 0;
            const prio = prioConf[t.priority] || prioConf.medium;
            const timeStr = formatTime(t);

            if (useGrid) {
                return `
                    <div class="task-item group/task bg-card/40 rounded-xl border border-white/5 hover:border-white/10 p-4 transition-all cursor-pointer hover:shadow-lg hover:shadow-black/10 relative overflow-hidden" data-task-id="${t.id}">
                        <div class="absolute top-0 left-0 right-0 h-0.5 ${prio.dot} opacity-60"></div>

                        <div class="flex items-start gap-3 mb-3">
                            <button class="toggle-status-btn mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-white' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}" data-task-id="${t.id}">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            <span class="text-[13px] font-bold leading-snug truncate ${isDone ? 'text-dim line-through opacity-50' : 'text-main'}">${t.title}</span>
                        </div>

                        <div class="flex flex-wrap items-center gap-2 mb-3 pl-8">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${prio.bg} ${prio.color}">
                                <span class="w-1 h-1 rounded-full ${prio.dot}"></span>${prio.label}
                            </span>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-white/5 text-dim">
                                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${proj.color}"></span>${proj.name}
                            </span>
                        </div>

                        ${timeStr ? `<div class="flex items-center gap-1.5 text-dim/50 mb-3 pl-8">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span class="text-[9px] font-bold tracking-tight">${timeStr}</span>
                        </div>` : ''}

                        <div class="pl-8">
                            <div class="inline-progress-bar relative h-5 bg-white/5 rounded-md overflow-hidden cursor-pointer w-full" data-task-id="${t.id}" data-progress="${progress}">
                                <div class="absolute inset-y-0 left-0 ${progressBarColor(progress)} rounded-md transition-all duration-300" style="width: ${Math.max(progress, 6)}%"></div>
                                <span class="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white drop-shadow-sm leading-none">${progress}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            // List row — fills full width
            return `
                <div class="task-item group/task relative flex items-center gap-4 p-3 px-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" data-task-id="${t.id}">
                    <button class="toggle-status-btn shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}" data-task-id="${t.id}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                    </button>

                    <div class="flex-grow min-w-0">
                        <span class="text-[13px] font-bold transition-all truncate leading-snug block ${isDone ? 'text-dim line-through opacity-50' : 'text-main group-hover/task:text-primary'}">${t.title}</span>
                        <div class="flex items-center gap-2.5 mt-1">
                            <span class="w-1.5 h-1.5 rounded-full ${prio.dot}" title="${prio.label} priority"></span>
                            <div class="flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${proj.color}"></span>
                                <span class="text-[9px] font-black text-dim/60 uppercase tracking-wider">${proj.name}</span>
                            </div>
                            ${timeStr ? `<div class="flex items-center gap-1 text-dim/50">
                                <span class="w-px h-2 bg-white/5"></span>
                                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span class="text-[9px] font-bold tracking-tight">${timeStr}</span>
                            </div>` : ''}
                        </div>
                    </div>

                    <!-- Progress bar with centered % -->
                    <div class="inline-progress-bar shrink-0 w-24 h-5 bg-white/10 rounded-md overflow-hidden cursor-pointer relative" data-task-id="${t.id}" data-progress="${progress}">
                        <div class="absolute inset-y-0 left-0 ${progressBarColor(progress)} rounded-md transition-all duration-300" style="width: ${Math.max(progress, 6)}%"></div>
                        <span class="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white drop-shadow-sm leading-none">${progress}%</span>
                    </div>

                    <div class="flex items-center opacity-0 group-hover/task:opacity-100 transition-opacity gap-1 shrink-0">
                         <button class="track-btn p-1.5 rounded-lg hover:bg-primary/10 text-dim/50 hover:text-primary transition-colors" title="Track Time" data-task-id="${t.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                         </button>
                    </div>
                </div>
            `;
        };

        // Choose render function
        const renderCard = isFull ? renderFullCard : renderCompactCard;

        // Render Groups
        ['overdue', 'today', 'later', 'nodate'].forEach(key => {
            const gTasks = groups[key].tasks;
            if (gTasks.length === 0) return;

            const groupEl = document.createElement('div');
            groupEl.className = 'animate-in fade-in slide-in-from-bottom-2 duration-500';

            groupEl.innerHTML = `
                <div class="flex items-center gap-2 mb-2 px-1">
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] ${groups[key].color}">${groups[key].label}</span>
                    <div class="h-px flex-grow bg-white/5"></div>
                    <span class="text-[9px] font-black text-dim opacity-30">${gTasks.length}</span>
                </div>
                <div class="${useGrid ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'flex flex-col'}">
                    ${gTasks.map(t => renderCard(t)).join('')}
                </div>
            `;
            listContent.appendChild(groupEl);
        });

        // Quick-add (only for full view)
        if (isFull) {
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
        }

        // Completed Section — no opacity reduction, better contrast
        if (completedTasks.length > 0 && showDone) {
            const completedEl = document.createElement('div');
            completedEl.className = isFull ? 'mt-8 pt-4 border-t border-white/5' : 'mt-4 pt-3 border-t border-white/5';

            completedEl.innerHTML = `
                <button id="toggle-completed-list" class="flex items-center gap-2 mb-3 px-1 w-full text-left group/comp">
                    <svg class="w-3 h-3 text-dim/40 group-hover/comp:text-dim transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] text-dim/60 group-hover/comp:text-dim transition-colors">Completed</span>
                    <span class="text-[9px] font-black text-dim opacity-30">${completedTasks.length}</span>
                </button>
                <div id="completed-tasks-container" class="${useGrid ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'flex flex-col'}">
                    ${completedTasks.map(t => renderCard(t)).join('')}
                </div>
            `;
            listContent.appendChild(completedEl);
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
