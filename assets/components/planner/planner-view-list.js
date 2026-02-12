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
        container.innerHTML = '';

        // Group by Project
        const grouped = {};
        tasks.forEach(t => {
            const pid = t.project_id || 'uncategorized';
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push(t);
        });

        const listContent = document.createElement('div');
        listContent.className = isFull ? 'max-w-4xl mx-auto space-y-10 py-4' : 'space-y-6';

        // Quick Add Form
        if (!isFull) {
            const quickAdd = document.createElement('div');
            quickAdd.className = 'mb-6 sticky top-0 bg-app z-10 pb-4 border-b border-soft';
            quickAdd.innerHTML = `
                <div class="relative">
                    <input type="text" id="quick-add-input" placeholder="Add new task..." 
                           class="w-full bg-card border border-soft rounded-xl px-4 py-3 text-sm font-bold text-main focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-dim/50 shadow-inner-white">
                    <button id="quick-add-btn" class="absolute right-2 top-2 bottom-2 aspect-square bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                </div>
            `;
            listContent.appendChild(quickAdd);
        }

        // Projects List
        Object.keys(grouped).forEach(pid => {
            const project = projects.find(p => String(p.id) === String(pid)) || { name: 'Unassigned', color: '#94a3b8' };
            const projectTasks = grouped[pid];

            const groupEl = document.createElement('div');
            groupEl.className = 'animate-in fade-in slide-in-from-bottom-2 duration-300';

            groupEl.innerHTML = `
                <div class="flex items-center gap-3 mb-4 px-1">
                    <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background-color: ${project.color}"></div>
                    <span class="${isFull ? 'text-sm' : 'text-[10px]'} font-black text-dim uppercase tracking-widest">${project.name}</span>
                    <div class="h-px flex-grow bg-soft/30 mx-2"></div>
                    <span class="text-[9px] font-black text-dim bg-app px-2.5 py-1 rounded-full border border-soft shadow-inner-white">${projectTasks.length} TODOs</span>
                </div>
                <div class="${isFull ? 'grid grid-cols-1 gap-3' : 'space-y-2'}">
                    ${projectTasks.map(t => {
                const hasProgress = t.progress && t.progress > 0;
                const dateStr = t.start_date ? new Date(t.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

                return `
                            <div class="task-item bg-card hover:bg-white border border-soft hover:border-primary/40 p-4 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all group/item relative overflow-hidden"
                                 data-task-id="${t.id}">
                                
                                ${hasProgress ? `<div class="absolute bottom-0 left-0 h-[2px] bg-primary/20" style="width: ${t.progress}%"></div>` : ''}

                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex-grow min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="${isFull ? 'text-base' : 'text-xs'} font-bold text-main leading-tight truncate">${t.title}</span>
                                            ${dateStr && isFull ? `<span class="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tracking-tighter">${dateStr}</span>` : ''}
                                        </div>
                                        <div class="flex items-center gap-2 mt-1">
                                             <span class="text-[9px] font-black text-dim bg-app px-2 py-0.5 rounded uppercase tracking-wider border border-soft/50 shadow-inner-white">${t.resource_id || 'Anyone'}</span>
                                             ${hasProgress ? `<span class="text-[9px] font-black text-primary uppercase tracking-wider">${t.progress}% Done</span>` : ''}
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1 shrink-0">
                                        <button class="track-btn opacity-0 group-hover/item:opacity-100 text-teal-600 hover:bg-teal-600/10 p-2 rounded-lg transition-all" title="Start Tracking" data-task-id="${t.id}">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        </button>
                                        ${!t.start_date ? `
                                            <button class="plan-btn opacity-0 group-hover/item:opacity-100 text-primary hover:bg-primary/10 p-2 rounded-lg transition-all" title="Schedule">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
            listContent.appendChild(groupEl);
        });

        if (tasks.length === 0) {
            listContent.innerHTML += `
                <div class="text-center py-20 opacity-30">
                    <div class="text-6xl mb-4">✨</div>
                    <p class="text-xs font-black text-dim uppercase tracking-[0.3em]">No tasks in this view</p>
                </div>
            `;
        }

        container.appendChild(listContent);
    }
};
