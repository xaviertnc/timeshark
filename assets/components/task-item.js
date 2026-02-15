/**
 * assets/components/task-item.js
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
        const isSpan = task.task_type === 'project_span';
        const progress = task.progress || 0;

        // Priority config
        const prioConf = {
            high: { dot: 'bg-red-500', label: 'High', bg: 'bg-red-500/10', color: 'text-red-500' },
            medium: { dot: 'bg-amber-500', label: 'Med', bg: 'bg-amber-500/10', color: 'text-amber-500' },
            low: { dot: 'bg-emerald-500', label: 'Low', bg: 'bg-emerald-500/10', color: 'text-emerald-500' }
        };
        const prio = prioConf[task.priority] || prioConf.low;

        const timeStr = this.formatTime(task);

        if (mode === 'compact') {
            return this.renderCompact(task, proj, isDone, isSpan, progress, prio, timeStr);
        }
        return this.renderFull(task, proj, isDone, isSpan, progress, prio, timeStr);
    },

    renderFull(t, proj, isDone, isSpan, progress, prio, timeStr) {
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
                            <span class="text-sm font-medium text-muted">${proj.name}</span>
                        </div>
                        ${timeStr ? `<div class="flex items-center gap-1 text-dim">
                            <span class="w-px h-2 bg-white/5"></span>
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span class="text-xs font-bold tracking-tight">${timeStr}</span>
                        </div>` : ''}
                        ${t.priority && t.priority !== 'low' ? `<span class="${prio.bg} ${prio.color} text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none">${prio.label}</span>` : ''}
                    </div>
                </div>

                <div class="inline-progress-bar shrink-0 w-24 h-5 bg-white/10 rounded-md overflow-hidden cursor-pointer relative" data-task-id="${t.id}" data-progress="${progress}">
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

    renderCompact(t, proj, isDone, isSpan, progress, prio, timeStr) {
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

        return `
            <div class="task-item group/task px-2 py-0.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer relative grid grid-cols-[20px_1fr_180px_60px] gap-3 items-center min-h-[28px]" data-task-id="${t.id}">
                ${isSpan
                ? `<div class="shrink-0 w-4 h-4 rounded-sm bg-primary flex items-center justify-center">
                            <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                       </div>`
                : `<button class="toggle-status-btn shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-primary border-primary text-white' : 'border-dim/40 hover:border-primary/60 text-transparent hover:text-primary/40'}" data-task-id="${t.id}">
                            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path></svg>
                       </button>`
            }
                <span class="text-base font-bold truncate ${isDone ? 'text-dim line-through opacity-50' : 'text-main'}">${t.title}</span>
                <span class="text-sm font-medium truncate" style="color: ${proj.color}">${proj.name}</span>
                <div class="flex flex-col text-[9px] font-bold text-dim/50 text-left leading-[1.1] break-words">
                    <span>${startStr}</span>
                    ${endStr ? `<span class="opacity-60">${endStr}</span>` : ''}
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
