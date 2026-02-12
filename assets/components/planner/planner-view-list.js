/**
 * assets/components/planner/planner-view-list.js
 * 
 * Renders the Sidebar List for Unscheduled Tasks (Backlog).
 */

import { PlannerUtils } from './planner-utils.js';

export const PlannerList = {
    render(container, tasks, projects) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = '';

        // Group by Project
        const grouped = {};
        tasks.forEach(t => {
            const pid = t.project_id || 'uncategorized';
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push(t);
        });

        const listContent = document.createElement('div');
        listContent.className = 'space-y-6';

        // Quick Add Form
        const quickAdd = document.createElement('div');
        quickAdd.className = 'mb-6 sticky top-0 bg-app z-10 pb-4 border-b border-soft';
        quickAdd.innerHTML = `
            <div class="relative">
                <input type="text" id="quick-add-input" placeholder="Add new task..." 
                       class="w-full bg-card border border-soft rounded-xl px-4 py-3 text-sm font-bold text-main focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-dim/50">
                <button id="quick-add-btn" class="absolute right-2 top-2 bottom-2 aspect-square bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-dark transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                </button>
            </div>
        `;
        listContent.appendChild(quickAdd);

        // Projects List
        Object.keys(grouped).forEach(pid => {
            const project = projects.find(p => p.id == pid) || { name: 'Unassigned', color: '#94a3b8' };
            const projectTasks = grouped[pid];
            const contrast = PlannerUtils.getContrastColor(project.color);

            const groupEl = document.createElement('div');
            groupEl.className = 'animate-in fade-in slide-in-from-left-2 duration-300';
            groupEl.innerHTML = `
                <div class="flex items-center gap-2 mb-2 px-1">
                    <div class="w-2 h-2 rounded-full" style="background-color: ${project.color}"></div>
                    <span class="text-[10px] font-black text-dim uppercase tracking-widest">${project.name}</span>
                    <span class="ml-auto text-[9px] font-bold text-dim bg-card px-2 py-0.5 rounded-full border border-soft">${projectTasks.length}</span>
                </div>
                <div class="space-y-2">
                    ${projectTasks.map(t => `
                        <div class="task-item bg-card hover:bg-white border border-soft hover:border-primary/30 p-3 rounded-xl cursor-grab active:cursor-grabbing shadow-sm transition-all group/item relatiuve"
                             draggable="true"
                             data-task-id="${t.id}">
                            <div class="flex items-start justify-between gap-2">
                                <span class="text-xs font-bold text-main leading-snug line-clamp-2">${t.title}</span>
                                <button class="plan-btn opacity-0 group-hover/item:opacity-100 text-primary hover:bg-primary/10 p-1 rounded transition-all" title="Schedule">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                </button>
                            </div>
                            ${t.resource_id && t.resource_id !== 'me' ? `
                                <div class="mt-2 flex items-center gap-1">
                                    <span class="text-[9px] font-black text-dim bg-app px-1.5 py-0.5 rounded uppercase tracking-wider">${t.resource_id}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            listContent.appendChild(groupEl);
        });

        if (tasks.length === 0) {
            listContent.innerHTML += `
                <div class="text-center py-10 opacity-40">
                    <div class="text-4xl mb-2">🎉</div>
                    <p class="text-[10px] font-black text-dim uppercase tracking-widest">No backlog tasks</p>
                </div>
            `;
        }

        container.appendChild(listContent);
    }
};
