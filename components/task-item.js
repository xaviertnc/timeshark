/**
 * components/task-item.js
 * 
 * Reusable component for rendering a single task card.
 * Supports 'full' (ref dashboard) and 'compact' (ref sidebar) modes.
 */

import { PlannerUtils } from './planner/planner-utils.js';

export const TaskItem = {
    /**
     * Renders a task card HTML string.
     * @param {Object} task The task object
     * @param {Array} projects List of projects for context
     * @param {Object} options { mode: 'full'|'compact', onStatusToggle, onProgressUpdate }
     */
    render(task, projects, options = {}) {
        const mode = options.mode || 'full'; // 'full' or 'compact'
        const proj = projects.find(p => p.id == task.project_id) || { name: 'Unassigned', color: '#64748b' };
        const isDone = task.status === 'done';
        const progress = task.progress || 0;
        
        const taskTags = task.tags || [];
        const projTags = proj.tags || [];
        const displayTags = [...new Set([...taskTags, ...projTags])];

        // Priority config
        const prioConf = {
            high: { dot: 'bg-red-500', label: 'High', bg: 'bg-red-500/10', color: 'text-red-500' },
            medium: { dot: 'bg-amber-500', label: 'Med', bg: 'bg-amber-500/10', color: 'text-amber-500' },
            low: { dot: 'bg-emerald-500', label: 'Low', bg: 'bg-emerald-500/10', color: 'text-emerald-500' }
        };
        const prio = prioConf[task.priority] || prioConf.low;

        const timeStr = this.formatTime(task);

        if (mode === 'compact') {
            return this.renderCompact(task, proj, isDone, progress, prio, timeStr, displayTags, options);
        }
        return this.renderFull(task, proj, isDone, progress, prio, timeStr, displayTags, options);
    },

    renderFull(t, proj, isDone, progress, prio, timeStr, displayTags, options = {}) {
        const isSelectionMode = !!options.selectionMode;
        let displayTimeStr = timeStr;
        if (isDone && t.completed_at) {
            const comp = new Date(t.completed_at);
            displayTimeStr = 'Done ' + comp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + comp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        return `
            <div class="task-item group/task relative flex items-center gap-3 py-3 px-3 rounded-xl bg-card border border-white/5 shadow-sm hover:border-primary/20 transition-all cursor-pointer" data-task-id="${t.id}">
                <!-- Bulk Selection Checkbox -->
                <div class="task-selector-container shrink-0 items-center justify-center w-5 h-5 ${isSelectionMode ? 'flex' : 'hidden'}">
                    <input type="checkbox" class="task-bulk-checkbox w-4 h-4 rounded border-white/10 text-primary focus:ring-primary/20 cursor-pointer accent-primary" data-task-id="${t.id}" onclick="event.stopPropagation()">
                </div>

                <button class="toggle-status-btn shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}" data-task-id="${t.id}">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                </button>

                <div class="flex-grow min-w-0">
                    <span class="text-base font-bold transition-all truncate leading-snug block ${isDone ? 'text-dim line-through opacity-50' : 'text-main group-hover/task:text-primary'}" title="${t.title ? t.title.replace(/"/g, '&quot;') : ''}">${t.title}</span>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 opacity-40">
                        ${!options.hideProjectName && proj.name !== 'Unassigned' ? `
                        <div class="flex items-center gap-1 shrink-0 min-w-0 max-w-[200px]">
                            <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: ${proj.color}"></span>
                            <span class="text-sm font-medium text-muted truncate" title="${proj.name ? proj.name.replace(/"/g, '&quot;') : ''}">${proj.name}</span>
                        </div>
                        ` : ''}
                        ${displayTags.length > 0 ? `
                            <div class="flex items-center gap-1 shrink-0">
                                ${displayTags.map(tag => {
                                    const isUrgent = tag && tag.toLowerCase().includes('urgent');
                                    const colorClasses = isUrgent ? 'bg-red-500/20 text-red-500 border-red-500/20' : 'bg-white/5 text-dim border-white/5';
                                    return `<span class="text-[8px] uppercase tracking-widest ${colorClasses} px-1.5 py-0.5 rounded border truncate max-w-[60px]" title="${tag ? tag.replace(/"/g, '&quot;') : ''}">${tag}</span>`;
                                }).join('')}
                            </div>
                        ` : ''}
                        ${displayTimeStr ? `<div class="flex items-center gap-1 ${isDone ? 'text-primary opacity-100' : 'text-dim'} shrink-0">
                            ${isDone ? `<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>` : `<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`}
                            <span class="text-xs font-bold tracking-tight">${displayTimeStr}</span>
                        </div>` : ''}
                        ${t.priority && t.priority !== 'low' ? `<span class="${prio.bg} ${prio.color} text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none shrink-0">${prio.label}</span>` : ''}
                        ${t.status ? `<span class="bg-white/5 text-dim text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none shrink-0 border border-white/5 uppercase">${t.status}</span>` : ''}
                    </div>
                </div>

                <div class="inline-progress-bar shrink-0 w-24 h-5 bg-highlight rounded-md overflow-hidden cursor-pointer relative" data-task-id="${t.id}" data-progress="${progress}">
                    <div class="absolute inset-y-0 left-0 rounded-md transition-all duration-300" style="width: ${Math.max(progress, 6)}%; background-color: ${proj.color}; opacity: ${isDone ? 0.35 : 1}"></div>
                    <span class="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-sm leading-none ${isDone ? 'opacity-50' : ''}">${progress}%</span>
                </div>

                <div class="flex items-center opacity-0 group-hover/task:opacity-100 transition-opacity gap-1 shrink-0">
                     <button class="track-btn w-8 h-8 flex items-center justify-center rounded-lg text-dim/50 hover:text-primary hover:bg-primary/10 transition-all" title="Track Time" data-task-id="${t.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     </button>
                </div>
            </div>
        `;
    },

    renderCompact(t, proj, isDone, progress, prio, timeStr, displayTags, options = {}) {
        const isSelectionMode = !!options.selectionMode;
        // High-density grid layout (the "perfect" original compact view)
        let startStr = '';
        let endStr = '';

        if (t.start_date) {
            const s = new Date(t.start_date.includes('T') ? t.start_date : `${t.start_date}T00:00:00`);
            startStr = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (t.start_date.includes('T')) startStr += ' ' + s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        if (t.end_date) {
            const e = new Date(t.end_date.includes('T') ? t.end_date : `${t.end_date}T00:00:00`);
            endStr = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (t.end_date.includes('T')) endStr += ' ' + e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        let endStrClass = 'opacity-60';
        if (isDone && t.completed_at) {
            const comp = new Date(t.completed_at);
            startStr = comp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            endStr = comp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }) + ' ✓';
            endStrClass = 'opacity-100 text-primary';
        }

        return `
            <div class="task-item group/task px-2 py-0.5 rounded-lg hover:bg-highlight transition-all cursor-pointer relative grid grid-cols-[${isSelectionMode ? '24px_' : ''}20px_1fr_minmax(250px,0.8fr)_70px_min-content] gap-3 items-center min-h-[28px]" data-task-id="${t.id}">
                <!-- Bulk Selection Checkbox -->
                <div class="task-selector-container shrink-0 items-center justify-center w-4 h-4 ${isSelectionMode ? 'flex' : 'hidden'}">
                    <input type="checkbox" class="task-bulk-checkbox w-3.5 h-3.5 rounded border-white/10 text-primary focus:ring-primary/20 cursor-pointer accent-primary" data-task-id="${t.id}" onclick="event.stopPropagation()">
                </div>

                <button class="toggle-status-btn shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-white' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}" data-task-id="${t.id}">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                </button>
                <span class="text-sm font-bold truncate ${isDone ? 'text-dim line-through opacity-50' : 'text-main'}" title="${t.title ? t.title.replace(/"/g, '&quot;') : ''}">${t.title}</span>
                <div class="flex flex-col justify-center gap-[3px] min-w-0 overflow-hidden py-0.5">
                    ${!options.hideProjectName && proj.name !== 'Unassigned' ? `<span class="text-xs font-semibold truncate leading-none" style="color: ${proj.color}" title="${proj.name ? proj.name.replace(/"/g, '&quot;') : ''}">${proj.name}</span>` : ''}
                    ${displayTags.length > 0 ? `
                        <div class="flex items-center gap-1 overflow-hidden">
                            ${displayTags.map(tag => {
                                const isUrgent = tag && tag.toLowerCase().includes('urgent');
                                const colorClasses = isUrgent ? 'bg-red-500/20 text-red-500 border-red-500/20' : 'bg-white/5 text-dim/80 border-white/5';
                                return `<span class="text-[7px] uppercase tracking-widest ${colorClasses} px-1 py-[1px] rounded-sm leading-none border truncate max-w-[80px]" title="${tag ? tag.replace(/"/g, '&quot;') : ''}">${tag}</span>`;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="flex flex-col text-[9px] font-bold text-dim/50 text-left leading-[1.1] break-words">
                    <span>${startStr}</span>
                    ${endStr ? `<span class="${endStrClass}">${endStr}</span>` : ''}
                </div>
                <div class="flex items-center opacity-0 group-hover/task:opacity-100 transition-opacity gap-1 shrink-0">
                    <button class="track-btn h-6 px-[0.34rem] flex items-center justify-center rounded-lg text-dim/50 hover:text-primary hover:bg-primary/10 transition-all" title="Track Time" data-task-id="${t.id}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                </div>
            </div>
        `;
    },

    formatTime(t) {
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
    }
};

