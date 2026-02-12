/**
 * assets/components/planner/planner-view-list.js
 * 
 * Renders the Sidebar List for Unscheduled Tasks (Backlog).
 */

import { PlannerUtils } from './planner-utils.js';

export const PlannerList = {
    render(container, tasks, projects, options = {}) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const isFull = options.fullWidth || false;
        const limit = options.limit || 0;
        const showDone = options.showDone || false;
        const showPast = options.showPast || false; // Default: hide past

        container.innerHTML = '';

        // 1. Filter Tasks
        const now = new Date();
        const today = new Date(); today.setHours(0, 0, 0, 0);

        let filtered = tasks.filter(t => {
            if (!showDone && t.status === 'done') return false;
            // "end dates in the past" implies they are over. If they are not done, they are overdue. 
            // I'll stick to: Hide if end_date < today (regardless of status? No, user probably means "old stuff").
            // Let's hide if end_date is in the past.
            if (!showPast && t.end_date && new Date(t.end_date) < today) return false;

            return true;
        });

        // 2. Sort by Date
        filtered.sort((a, b) => {
            const da = a.start_date ? new Date(a.start_date) : new Date(8640000000000000);
            const db = b.start_date ? new Date(b.start_date) : new Date(8640000000000000);
            return da - db;
        });

        // 3. Grouping (Date-based default)
        const groups = {
            'overdue': { label: 'Overdue', tasks: [], color: 'text-red-500' },
            'today': { label: 'Today', tasks: [], color: 'text-primary' },
            'tomorrow': { label: 'Tomorrow', tasks: [], color: 'text-main' },
            'week': { label: 'This Week', tasks: [], color: 'text-dim' },
            'later': { label: 'Later', tasks: [], color: 'text-dim' },
            'nodate': { label: 'No Date', tasks: [], color: 'text-dim' }
        };

        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

        filtered.forEach(t => {
            if (!t.start_date) {
                groups['nodate'].tasks.push(t);
                return;
            }
            const d = new Date(t.start_date);
            const end = t.end_date ? new Date(t.end_date) : d;

            if (end < today) groups['overdue'].tasks.push(t);
            else if (d < tomorrow) groups['today'].tasks.push(t);
            else if (d < new Date(tomorrow.getTime() + 86400000)) groups['tomorrow'].tasks.push(t); // d < day after tomorrow
            else if (d < nextWeek) groups['week'].tasks.push(t);
            else groups['later'].tasks.push(t);
        });

        const listContent = document.createElement('div');
        listContent.className = isFull ? 'max-w-[1600px] mx-auto space-y-8 py-6 px-4' : 'space-y-4';

        // Quick Add Form
        if (!isFull) {
            const quickAdd = document.createElement('div');
            quickAdd.className = 'mb-4 sticky top-0 bg-app/80 backdrop-blur-md z-10 pb-2 border-b border-soft';
            quickAdd.innerHTML = `
                <div class="relative">
                    <input type="text" id="quick-add-input" placeholder="Add TODO..." 
                           class="w-full bg-card border border-soft rounded-xl px-4 py-2 text-xs font-bold text-main focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-dim/40 shadow-inner-white">
                    <button id="quick-add-btn" class="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                </div>
            `;
            listContent.appendChild(quickAdd);
        }

        // Render Groups
        let totalRenderedTasks = 0;
        ['overdue', 'today', 'tomorrow', 'week', 'later', 'nodate'].forEach(key => {
            let gTasks = groups[key].tasks;
            if (gTasks.length === 0) return;

            if (limit > 0) gTasks = gTasks.slice(0, limit);
            totalRenderedTasks += gTasks.length;

            const groupEl = document.createElement('div');
            groupEl.className = 'animate-in fade-in slide-in-from-bottom-1 duration-400';

            groupEl.innerHTML = `
                <div class="flex items-center gap-2 mb-2 px-1">
                    <span class="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 ${groups[key].color}">${groups[key].label}</span>
                    <div class="h-px flex-grow bg-gradient-to-r from-soft/30 to-transparent mx-2"></div>
                    <span class="text-[8px] font-bold text-dim opacity-50">${gTasks.length}</span>
                </div>
                <div class="${isFull ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2' : 'space-y-0.5'}">
                    ${gTasks.map(t => {
                const hasProgress = t.progress && t.progress > 0;
                const proj = projects.find(p => p.id == t.project_id) || { color: '#334155' };
                const status = t.status || 'todo';
                let statusColor = 'text-dim';
                if (status === 'in-progress') statusColor = 'text-primary';
                if (status === 'done') statusColor = 'text-teal-500';

                // Single Line Compact View (Sidebar) vs Grid Card (Full)
                if (!isFull) {
                    return `
                                <div class="task-item group/item relative pl-2 pr-2 h-7 rounded hover:bg-white/5 border border-transparent transition-all cursor-pointer flex items-center gap-2 overflow-hidden"
                                     data-task-id="${t.id}">
                                    
                                    <div class="w-0.5 h-3 rounded-full" style="background-color: ${proj.color}"></div>

                                    <span class="text-xs font-bold text-main truncate flex-grow group-hover/item:text-primary transition-colors">${t.title}</span>

                                    <div class="flex items-center gap-2 shrink-0 opacity-60 group-hover/item:opacity-100 transition-opacity">
                                         ${hasProgress ? `<span class="text-[9px] font-black text-primary">${t.progress}%</span>` : ''}
                                         ${status !== 'todo' ? `<span class="text-[9px] font-black uppercase ${statusColor}">${status === 'in-progress' ? 'IP' : 'Done'}</span>` : ''}
                                         
                                        <button class="track-btn text-dim hover:text-primary opacity-0 group-hover/item:opacity-100 transition-opacity" title="Track" data-task-id="${t.id}">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                                        </button>
                                    </div>
                                    
                                    <!-- Progress Underline Removed as requested -->
                                </div>
                            `;
                } else {
                    // Full View Card (Slightly more detail but still compact)
                    return `
                                <div class="task-item bg-app/20 hover:bg-card border border-white/5 hover:border-primary/20 px-3 py-2 rounded-lg cursor-pointer transition-all group/item relative overflow-hidden flex flex-col gap-1"
                                     data-task-id="${t.id}">
                                    
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: ${proj.color}"></div>
                                        <span class="text-[11px] font-bold text-main truncate flex-grow group-hover/item:text-primary transition-colors">${t.title}</span>
                                    </div>
                                    
                                    <div class="flex items-center justify-between mt-1">
                                         <div class="flex items-center gap-2">
                                             <span class="text-[8px] font-black uppercase ${statusColor} opacity-70 tracking-wider">${status}</span>
                                             ${t.resource_id ? `<span class="text-[8px] font-black text-dim uppercase tracking-wider opacity-50 truncate max-w-[60px]">${t.resource_id}</span>` : ''}
                                         </div>
                                         <div class="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                             <button class="track-btn text-primary hover:bg-primary/10 p-1 rounded-md" data-task-id="${t.id}">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                                             </button>
                                         </div>
                                    </div>
                                    ${hasProgress ? `<div class="absolute bottom-0 left-0 h-[1.5px] bg-primary/20" style="width: ${t.progress}%"></div>` : ''}
                                </div>
                            `;
                }
            }).join('')}
                </div>
            `;
            listContent.appendChild(groupEl);
        });

        if (totalRenderedTasks === 0) {
            listContent.innerHTML += `
                <div class="flex flex-col items-center justify-center py-20 opacity-40">
                    <div class="w-24 h-24 mb-4 text-dim bg-app rounded-full flex items-center justify-center border-2 border-dashed border-soft">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </div>
                    <p class="text-[10px] font-black text-dim uppercase tracking-[0.4em]">All Caught Up</p>
                </div>
            `;
        }

        container.appendChild(listContent);
    }
};
