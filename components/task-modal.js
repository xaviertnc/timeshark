/**
 * components/task-modal.js
 * 
 * Centralized Task/Todo Editor.
 * Replaces legacy PlannerModal with a dynamic, self-cleaning static interface.
 */

import { api } from '../utils/api.js';
import { store } from '../utils/store.js';
import { SearchableSelect } from './searchable-select.js';
import { escapeHTML } from '../utils/dom.js';
import { ConfirmModal } from './confirm-modal.js';
import { TimeEntryModal } from './time-entry-modal.js';

export class TaskModal {
    static open(task = null, options = {}) {
        const { onSave = () => { }, onCancel = () => { }, defaults = {} } = options;

        // Remove existing modal if any
        const existing = document.getElementById('task-modal-container');
        if (existing) existing.remove();

        const modalPortal = document.getElementById('modal-portal');
        if (!modalPortal) return;

        const container = document.createElement('div');
        container.id = 'task-modal-container';
        modalPortal.appendChild(container);

        container.innerHTML = `
            <div id="task-modal" class="fixed inset-0 bg-secondary/40 flex items-start justify-center z-[110] backdrop-blur-md pointer-events-auto overflow-y-auto py-6 px-4">
                <div class="bg-card zen-card shadow-soft w-full max-w-5xl p-8 md:p-10 transform transition-all scale-95 opacity-0 relative mx-3 sm:mx-auto" id="task-modal-content">
                    <button id="close-task-modal" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-highlight hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-subtle z-10" title="Close">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

                    <div class="mb-8">
                        <h3 id="task-modal-title" class="text-2xl font-bold text-main tracking-tight">${task ? 'Edit Task' : 'New Task'}</h3>
                        <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Planning Registry</p>
                    </div>

                    <div class="flex flex-col lg:flex-row gap-8">
                        <div class="flex-1 min-w-0 lg:border-r lg:border-subtle lg:pr-8">
                            <form id="task-form" class="space-y-6">
                        <input type="hidden" name="id" value="${task?.id || ''}">

                        <!-- Title -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Task Name</label>
                            <input type="text" name="title" required placeholder="What needs to be done?" class="w-full zen-input bg-highlight border border-subtle focus:ring-2 focus:ring-primary/20 text-main outline-none transition-all" value="${escapeHTML(task?.title || '')}">
                        </div>

                        <!-- Row: Member, Project -->
                        <div class="flex flex-col sm:flex-row gap-3">
                            <div class="space-y-2 w-full sm:w-[130px] shrink-0">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Member</label>
                                <div id="modal-member-select-container"></div>
                                <input type="hidden" name="resource_id" id="modal-resource-input">
                            </div>
                            <div class="space-y-2 flex-grow min-w-0">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Project</label>
                                <div id="modal-project-select-container"></div>
                                <input type="hidden" name="project_id" id="modal-project-input">
                            </div>
                        </div>
                        
                        <!-- Row: Status -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Status</label>
                                <select name="status" class="w-full zen-input bg-highlight border border-subtle text-main cursor-pointer appearance-none outline-none">
                                    <option value="todo" ${(!task && defaults.status === 'todo') || task?.status === 'todo' ? 'selected' : ''}>Todo</option>
                                    <option value="in-progress" ${(!task && (defaults.status === 'in-progress' || defaults.status === 'doing')) || task?.status === 'in-progress' ? 'selected' : ''}>In-Progress</option>
                                    <option value="done" ${(!task && defaults.status === 'done') || task?.status === 'done' ? 'selected' : ''}>Done</option>
                                    <option value="backlog" ${(!task && defaults.status === 'backlog') || task?.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Priority</label>
                                <select name="priority" class="w-full zen-input bg-highlight border border-subtle text-main cursor-pointer appearance-none outline-none">
                                    <option value="low" ${(!task && (!defaults.priority || defaults.priority === 'low')) || task?.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                                    <option value="medium" ${(!task && defaults.priority === 'medium') || task?.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                                    <option value="high" ${(!task && defaults.priority === 'high') || task?.priority === 'high' ? 'selected' : ''}>🔴 High</option>
                                </select>
                            </div>
                        </div>

                        <!-- Row: Status -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Tags</label>
                            <div class="bg-highlight border border-subtle rounded-xl p-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all flex flex-wrap gap-2 items-center min-h-[50px] shadow-sm" id="modal-tags-container">
                                <input type="text" id="modal-tag-input" placeholder="Type tag and press Enter..." class="bg-transparent border-none outline-none text-main font-bold text-sm flex-1 min-w-[150px] placeholder:opacity-30 placeholder:font-normal" style="border: none !important; box-shadow: none !important; background: transparent !important; outline: none !important; padding: 0;">
                            </div>
                            <input type="hidden" name="tags" id="hidden-tags-input" value="${task && task.tags ? (Array.isArray(task.tags) ? escapeHTML(task.tags.join(',')) : escapeHTML(String(task.tags))) : ''}">
                            <div class="mt-2 ml-1 flex flex-wrap gap-1.5" id="suggested-tags-container"></div>
                        </div>

                        <!-- Notes -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Notes</label>
                            <textarea name="notes" rows="3" placeholder="Add details, links, or anything helpful..." class="w-full zen-input !h-auto py-4 bg-highlight border border-subtle focus:ring-2 focus:ring-primary/20 text-main outline-none transition-all resize-none font-medium">${escapeHTML(task?.notes || '')}</textarea>
                        </div>

                        <!-- Schedule Section -->
                        <div class="space-y-4 border-t border-subtle pt-5">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black text-dim uppercase tracking-widest">Schedule</span>
                                <label class="inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="toggle-dates" class="sr-only peer" ${(task && task.status !== 'backlog') || (!task && defaults.status !== 'backlog') ? 'checked' : ''}>
                                    <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
                                    <span class="ml-2 text-[10px] font-bold text-dim">Active</span>
                                </label>
                            </div>

                            <div id="date-fields" class="${(task && task.status !== 'backlog') || (!task && defaults.status !== 'backlog') ? 'grid' : 'hidden'} grid-cols-2 gap-4 transition-all">
                                <!-- Start -->
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Start</label>
                                    <div class="flex gap-2">
                                        <div class="flex-1 flex gap-1 items-center">
                                            <input type="date" name="start_date" class="flex-1 zen-input bg-highlight border border-subtle text-main outline-none transition-all">
                                            <div class="flex flex-col gap-0.5">
                                                <button type="button" class="date-shift-btn px-1.5 py-0.5 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded text-dim hover:text-primary transition-all" data-direction="1" title="+1 day">
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"></path></svg>
                                                </button>
                                                <button type="button" class="date-shift-btn px-1.5 py-0.5 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded text-dim hover:text-primary transition-all" data-direction="-1" title="-1 day">
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="flex gap-1 items-center">
                                            <input type="time" name="start_time" class="w-24 zen-input bg-highlight border border-subtle text-main outline-none transition-all">
                                            <div class="flex flex-col gap-0.5">
                                                <button type="button" class="time-shift-btn px-1.5 py-0.5 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded text-dim hover:text-primary transition-all" data-direction="1" title="+15 min">
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"></path></svg>
                                                </button>
                                                <button type="button" class="time-shift-btn px-1.5 py-0.5 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded text-dim hover:text-primary transition-all" data-direction="-1" title="-15 min">
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <!-- End -->
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">End</label>
                                    <div class="flex gap-2">
                                        <div class="flex-1 flex gap-1 items-center">
                                            <input type="date" name="end_date" class="flex-1 zen-input bg-highlight border border-subtle text-main outline-none transition-all">
                                            <div class="flex flex-col gap-0.5">
                                                <button type="button" class="date-shift-btn px-1.5 py-0.5 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded text-dim hover:text-primary transition-all" data-direction="1" title="+1 day">
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"></path></svg>
                                                </button>
                                                <button type="button" class="date-shift-btn px-1.5 py-0.5 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded text-dim hover:text-primary transition-all" data-direction="-1" title="-1 day">
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="flex gap-1 items-center">
                                            <input type="time" name="end_time" class="w-24 zen-input bg-highlight border border-subtle text-main outline-none transition-all">
                                            <div class="flex flex-col gap-0.5">
                                                <button type="button" class="time-shift-btn px-1.5 py-0.5 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded text-dim hover:text-primary transition-all" data-direction="1" title="+15 min">
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"></path></svg>
                                                </button>
                                                <button type="button" class="time-shift-btn px-1.5 py-0.5 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 rounded text-dim hover:text-primary transition-all" data-direction="-1" title="-15 min">
                                                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Completed At (Only for Done tasks) -->
                            <div id="completed-fields" class="${task?.status === 'done' ? 'grid' : 'hidden'} grid-cols-2 gap-4 transition-all pt-2">
                                <div class="col-span-2 flex items-center gap-1.5 pb-1">
                                    <div class="h-px flex-grow bg-emerald-500/20"></div>
                                    <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                                    <span class="text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center">Checkout Timestamp</span>
                                    <div class="h-px flex-grow bg-emerald-500/20"></div>
                                </div>
                                <div class="space-y-2">
                                    <div class="flex gap-2">
                                        <div class="flex-1 flex gap-1 items-center">
                                            <input type="date" name="completed_date" class="flex-1 zen-input bg-emerald-500/5 border border-emerald-500/20 focus:ring-emerald-500/20 text-emerald-400 outline-none transition-all">
                                        </div>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div class="flex gap-2">
                                        <div class="flex gap-1 items-center">
                                            <input type="time" name="completed_time" class="w-24 zen-input bg-emerald-500/5 border border-emerald-500/20 focus:ring-emerald-500/20 text-emerald-400 outline-none transition-all">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Progress Section -->
                        <div id="progress-section" class="space-y-3 border-t border-white/5 pt-5">
                            <div class="flex justify-between items-center gap-3">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Progress</label>
                                <div class="flex items-center gap-2">
                                    <input type="number" id="progress-number-input" min="0" max="100" step="1" value="${task?.progress || 0}" class="w-16 h-8 bg-highlight border border-subtle rounded-md text-xs font-black text-primary text-center outline-none focus:ring-2 focus:ring-primary/20 tabular-nums">
                                    <span class="text-xs font-black text-dim">%</span>
                                </div>
                            </div>

                            <!-- Combined Progress Bar + Slider -->
                            <div class="relative h-3 bg-white/5 rounded-full group/progress cursor-pointer">
                                <div id="progress-bar-fill" class="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300 pointer-events-none" style="width: ${task?.progress || 0}%"></div>
                                <input type="range" name="progress" min="0" max="100" value="${task?.progress || 0}" step="1" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                            </div>

                            <!-- Quick Buttons -->
                            <div class="flex gap-2">
                                ${[0, 25, 50, 75, 100].map(v => `
                                    <button type="button" class="progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${v === (task?.progress || 0) ? 'bg-primary/15 border-primary/30 text-primary ring-1 ring-primary/20' : 'bg-highlight border-subtle text-dim hover:bg-primary/10 hover:text-primary hover:border-primary/20'}" data-progress="${v}">
                                        ${v}%
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="pt-4 grid grid-cols-4 gap-3">
                            ${task ? `
                                <button type="button" id="delete-task-btn" class="col-span-1 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all">
                                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                                <button type="submit" id="commit-task-btn" class="col-span-3 zen-btn bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                                    Update Task
                                </button>
                            ` : `
                                <button type="submit" id="commit-task-btn" class="col-span-4 zen-btn bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                                    Create Task
                                </button>
                            `}
                        </div>
                    </form>
                    </div>
                        
                    <!-- Right Column: Context Pane -->
                    <div class="w-full lg:w-[300px] shrink-0 flex flex-col gap-6 text-left">
                        ${task ? `
                        <div>
                            <div class="flex items-center justify-between border-b border-subtle pb-2 mb-3">
                                <h4 class="text-[10px] font-black text-dim uppercase tracking-widest mb-0">Time Logs</h4>
                                <div class="flex items-center gap-1.5" id="task-modal-time-filters">
                                    <button type="button" class="time-filter-btn px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest transition-colors bg-white/10 text-main" data-filter="all">ALL</button>
                                    <button type="button" class="time-filter-btn px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest transition-colors opacity-50 hover:opacity-100 text-main" data-filter="today">TODAY</button>
                                    <button type="button" class="time-filter-btn px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest transition-colors opacity-50 hover:opacity-100 text-main" data-filter="week">WEEK</button>
                                    <div class="w-px h-3 bg-white/10 mx-0.5"></div>
                                    <button type="button" id="time-toggle-compact-btn" class="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest transition-colors opacity-50 hover:opacity-100 text-main">CMPCT</button>
                                </div>
                            </div>
                            <div id="modal-task-time" class="space-y-2 flex flex-col max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                <div class="text-xs text-dim opacity-50 py-2">Loading...</div>
                            </div>
                        </div>
                        ` : `
                        <div class="flex items-center justify-center h-full opacity-30 text-center flex-col gap-2 min-h-[200px]">
                            <svg class="w-8 h-8 text-dim mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <p class="text-[10px] font-black uppercase tracking-[0.1em] text-dim">Save task first<br>to view time logs.</p>
                        </div>
                        `}
                    </div>

                    </div>
                </div>
            </div>
        `;

        // ───── LOGIC PORTED FROM PlannerModal ─────

        setTimeout(() => {
            const content = container.querySelector('#task-modal-content');
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);

        if (task) {
            const timeContainer = container.querySelector('#modal-task-time');
            if (timeContainer) {
                const state = store.get();
                let timeFilter = localStorage.getItem('tm_time_filter') || 'all';
                let isCompactTime = localStorage.getItem('tm_time_compact') === 'true';

                const renderRelatedEntries = () => {
                    let relatedEntries = (state.timeEntries || []).filter(e => e.task_id == task.id).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
                    
                    const now = new Date();
                    if (timeFilter === 'today') {
                        relatedEntries = relatedEntries.filter(e => new Date(e.start_time).toDateString() === now.toDateString());
                    } else if (timeFilter === 'week') {
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        relatedEntries = relatedEntries.filter(e => new Date(e.start_time) > weekAgo);
                    }
                    
                    relatedEntries = relatedEntries.slice(0, 50);

                    if (isCompactTime) {
                        timeContainer.className = 'space-y-0.5 flex flex-col';
                    } else {
                        timeContainer.className = 'space-y-2 flex flex-col';
                    }

                    if (relatedEntries.length > 0) {
                        timeContainer.innerHTML = relatedEntries.map(e => {
                            let dur = '?';
                            if (e.start_time && e.end_time) {
                                dur = ((new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000).toFixed(1) + 'h';
                            } else if (e.start_time && !e.end_time) {
                                dur = '...';
                            }
                            
                            const dateStr = e.start_time ? new Date(e.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) : '';
                            
                            if (isCompactTime) {
                                return `
                                <div class="px-2 py-1 bg-highlight rounded border border-subtle hover:border-primary/30 transition-colors cursor-pointer group flex items-center justify-between gap-3 time-jump-btn" data-id="${e.id}">
                                    <div class="flex-1 min-w-0 flex items-center gap-2">
                                        <div class="text-[10px] font-bold text-main truncate group-hover:text-primary transition-colors" title="${e.description ? escapeHTML(e.description) : ''}">${e.description ? escapeHTML(e.description) : (e.notes ? escapeHTML(e.notes) : '<span class="italic text-dim opacity-50">Unnamed session</span>')}</div>
                                    </div>
                                    <div class="flex items-center gap-2 shrink-0">
                                        <div class="text-[9px] font-bold text-dim uppercase tracking-widest">${dateStr}</div>
                                        <div class="text-[10px] font-black text-primary tabular-nums">${dur}</div>
                                    </div>
                                </div>
                                `;
                            }

                            return `
                            <div class="px-3 py-2 bg-highlight rounded-xl border border-subtle hover:border-primary/30 transition-colors cursor-pointer group flex items-start justify-between gap-3 time-jump-btn" data-id="${e.id}">
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-medium text-main group-hover:text-primary transition-colors truncate" title="${e.description ? escapeHTML(e.description) : ''}">${e.description ? escapeHTML(e.description) : (e.notes ? escapeHTML(e.notes) : '<span class="italic text-dim opacity-50">Unnamed session</span>')}</div>
                                    <div class="text-[9px] font-bold text-dim uppercase tracking-widest mt-1">${dateStr} &bull; ${e.user_id ? e.user_id.substring(0,6) : 'Unk'}</div>
                                </div>
                                <div class="text-xs font-black text-primary shrink-0 tabular-nums">${dur}</div>
                            </div>
                            `;
                        }).join('');
                        
                        timeContainer.querySelectorAll('.time-jump-btn').forEach(btn => {
                            btn.onclick = () => {
                                const entry = relatedEntries.find(x => String(x.id) === btn.dataset.id);
                                if (entry) TimeEntryModal.open(entry, { onSave: () => {
                                    setTimeout(() => window.dispatchEvent(new Event('hashchange')), 100);
                                }});
                            };
                        });
                    } else {
                        timeContainer.innerHTML = '<div class="text-[10px] font-bold text-dim/50 uppercase tracking-widest text-center py-4 bg-app/50 rounded-xl border border-white/5 border-dashed">No Time Tracked</div>';
                    }
                };

                const filterBtns = container.querySelectorAll('.time-filter-btn');
                const applyTimeFilterStyle = () => {
                    filterBtns.forEach(b => {
                        if (b.dataset.filter === timeFilter) {
                            b.classList.add('bg-white/10', 'text-main');
                            b.classList.remove('opacity-50');
                        } else {
                            b.classList.remove('bg-white/10', 'text-main');
                            b.classList.add('opacity-50');
                        }
                    });
                };
                
                filterBtns.forEach(btn => {
                    btn.onclick = () => {
                        timeFilter = btn.dataset.filter;
                        localStorage.setItem('tm_time_filter', timeFilter);
                        applyTimeFilterStyle();
                        renderRelatedEntries();
                    };
                });

                const compactBtn = container.querySelector('#time-toggle-compact-btn');
                if (compactBtn) {
                    const applyCompactStyle = () => {
                        if (isCompactTime) {
                            compactBtn.classList.add('bg-white/10', 'text-main');
                            compactBtn.classList.remove('opacity-50');
                        } else {
                            compactBtn.classList.remove('bg-white/10', 'text-main');
                            compactBtn.classList.add('opacity-50');
                        }
                    };
                    
                    compactBtn.onclick = () => {
                        isCompactTime = !isCompactTime;
                        localStorage.setItem('tm_time_compact', isCompactTime);
                        applyCompactStyle();
                        renderRelatedEntries();
                    };
                    applyCompactStyle();
                }

                applyTimeFilterStyle();
                renderRelatedEntries();
            }
        }

        const close = () => {
            const content = container.querySelector('#task-modal-content');
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                container.remove();
                onCancel();
            }, 200);
        };

        const modal = container.querySelector('#task-modal');
        const form = container.querySelector('#task-form');
        const dateToggle = container.querySelector('#toggle-dates');
        const dateFields = container.querySelector('#date-fields');
        const progressInput = container.querySelector('input[name="progress"]');
        const progressNumberInput = container.querySelector('#progress-number-input');
        const progressBar = container.querySelector('#progress-bar-fill');
        const deleteBtn = container.querySelector('#delete-task-btn');
        const statusSelect = form.querySelector('select[name="status"]');

        // Populate Selects
        const state = store.get();
        const resources = (state.team || []).map(m => ({ id: m.name, name: m.name }));
        if (!resources.some(r => r.id === 'General')) resources.push({ id: 'General', name: 'General' });
        resources.unshift({ id: 'me', name: 'Unassigned' });

        const memberContainer = form.querySelector('#modal-member-select-container');
        const memberInput = form.querySelector('#modal-resource-input');
        
        // Find default member
        const defaultMember = (state.team || []).find(m => m.is_default);
        let defaultResourceId = 'me';
        if (defaultMember) defaultResourceId = defaultMember.name;

        const initialMember = task?.resource_id || defaults.resource_id || defaultResourceId;
        memberInput.value = initialMember;

        SearchableSelect.render(memberContainer, resources, {
            value: initialMember,
            placeholder: 'Member...',
            allLabel: 'Team Members',
            onChange: (val) => { memberInput.value = val; }
        });

        const projectContainer = form.querySelector('#modal-project-select-container');
        const projectInput = form.querySelector('#modal-project-input');
        const initialProject = task?.project_id || defaults.project_id || '';
        projectInput.value = initialProject;

        const entries = state.timeEntries || [];
        const recentProjectIds = [...new Set(entries
            .filter(e => e.project_id)
            .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0))
            .map(e => String(e.project_id))
        )].slice(0, 5);

        SearchableSelect.render(projectContainer, state.projects || [], {
            value: initialProject,
            placeholder: 'Select Project...',
            recentIds: recentProjectIds,
            allLabel: 'All Projects',
            onChange: (val) => { projectInput.value = val; }
        });

        // Priority
        if (!task) {
            form.priority.value = defaults.priority || 'low';
        }

        // Date Defaults for New Tasks
        if (!task) {
            const now = new Date();
            const end = new Date(now.getTime() + 60 * 60 * 1000);

            // Default to today and now
            const dateVal = now.toISOString().split('T')[0];
            form.start_date.value = dateVal;
            form.end_date.value = dateVal;
            form.start_time.value = now.toTimeString().substring(0, 5);
            form.end_time.value = end.toTimeString().substring(0, 5);
        } else if (task.start_date) {
            const startParts = task.start_date.split('T');
            const endParts = (task.end_date || task.start_date).split('T');
            form.start_date.value = startParts[0];
            form.end_date.value = endParts[0];
            form.start_time.value = startParts[1] ? startParts[1].substring(0, 5) : '09:00';
            form.end_time.value = endParts[1] ? endParts[1].substring(0, 5) : '17:00';
        }

        // Completed Date Defaults
        if (task && task.completed_at) {
            const compParts = task.completed_at.split('T');
            form.completed_date.value = compParts[0];
            form.completed_time.value = compParts[1] ? compParts[1].substring(0, 5) : '17:00';
        } else {
            const now = new Date();
            form.completed_date.value = now.toISOString().split('T')[0];
            form.completed_time.value = now.toTimeString().substring(0, 5);
        }

        // --- Tag Logic ---
        const tagsContainer = container.querySelector('#modal-tags-container');
        const tagInput = container.querySelector('#modal-tag-input');
        const hiddenTagsInput = container.querySelector('#hidden-tags-input');
        const suggestedContainer = container.querySelector('#suggested-tags-container');
        
        let taskTagsRaw = [];
        if (task && task.tags) {
            taskTagsRaw = Array.isArray(task.tags) ? task.tags : (typeof task.tags === 'string' ? task.tags.split(',') : []);
        }
        
        let projTagsRaw = [];
        if (task && task.project_id) {
            const proj = (state.projects || []).find(p => String(p.id) === String(task.project_id));
            if (proj && proj.tags) {
                projTagsRaw = Array.isArray(proj.tags) ? proj.tags : (typeof proj.tags === 'string' ? proj.tags.split(',') : []);
            }
        }
        
        const combinedTags = [...new Set([...taskTagsRaw, ...projTagsRaw])];
        let currentTags = combinedTags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
        
        const existingTagsRaw = [...(state.projects || []).flatMap(p => p.tags || []), ...(state.tasks || []).flatMap(t => t.tags || [])];
        let uniqueGlobalTags = [...new Set(existingTagsRaw.map(t => typeof t === 'string' ? t.toLowerCase() : String(t).toLowerCase()))];
        
        const renderTags = () => {
            const badges = currentTags.map(t => `<span class="bg-primary/20 text-primary border border-primary/20 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5">${t} <button type="button" class="remove-tag hover:text-white" data-tag="${t}">&times;</button></span>`).join('');
            
            const suggestions = uniqueGlobalTags.filter(t => !currentTags.includes(t)).slice(0, 15);
            suggestedContainer.innerHTML = suggestions.length > 0 
                ? `<span class="text-[9px] font-black text-dim/50 uppercase tracking-widest mr-2 py-1">Suggestions:</span>` + suggestions.map(t => `<button type="button" class="suggested-tag bg-white/5 hover:bg-primary/20 hover:text-primary text-dim text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded transition-colors border border-white/5" data-tag="${t}">+ ${t}</button>`).join('')
                : '';

            tagsContainer.querySelectorAll('span').forEach(el => el.remove());
            tagInput.insertAdjacentHTML('beforebegin', badges);
            hiddenTagsInput.value = currentTags.join(',');
            
            tagsContainer.querySelectorAll('.remove-tag').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    currentTags = currentTags.filter(t => t !== btn.dataset.tag);
                    renderTags();
                };
            });
            
            suggestedContainer.querySelectorAll('.suggested-tag').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    const newTag = btn.dataset.tag;
                    if (!currentTags.includes(newTag)) {
                        currentTags.push(newTag);
                        tagInput.value = '';
                        renderTags();
                    }
                };
            });
        };
        
        if (tagsContainer) renderTags();
        
        if (tagInput) {
            tagInput.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const rawTags = tagInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                    let added = false;
                    rawTags.forEach(t => {
                        if (!currentTags.includes(t)) {
                            currentTags.push(t);
                            if (!uniqueGlobalTags.includes(t)) uniqueGlobalTags.push(t);
                            added = true;
                        }
                    });
                    if (added) {
                        tagInput.value = '';
                        renderTags();
                    }
                }
            };
        }

        // --- Event Handlers ---

        container.querySelector('#close-task-modal').onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };

        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                const confirmed = await ConfirmModal.show('Delete this task?', { confirmText: 'Delete Task', isDestructive: true });
                if (confirmed) {
                    await api.delete(`planner.php?id=${task.id}`);
                    onSave();
                    close();
                }
            };
        }

        dateToggle.onchange = (e) => {
            if (e.target.checked) {
                dateFields.classList.remove('hidden');
                dateFields.classList.add('grid');
                if (statusSelect.value === 'backlog') statusSelect.value = 'todo';
            } else {
                dateFields.classList.add('hidden');
                dateFields.classList.remove('grid');
                statusSelect.value = 'backlog';
            }
            statusSelect.dispatchEvent(new Event('change'));
        };

        statusSelect.addEventListener('change', () => {
             const completedContainer = container.querySelector('#completed-fields');
             if (statusSelect.value === 'done') {
                 completedContainer.classList.remove('hidden');
                 completedContainer.classList.add('grid');
             } else {
                 completedContainer.classList.add('hidden');
                 completedContainer.classList.remove('grid');
             }
        });

        const updateProgressUI = (val) => {
            val = Math.max(0, Math.min(100, parseInt(val) || 0));
            progressNumberInput.value = val;
            progressInput.value = val;
            progressBar.style.width = `${val}%`;

            if (val >= 100 && statusSelect.value !== 'done') {
                statusSelect.value = 'done';
                statusSelect.dispatchEvent(new Event('change'));
            } else if (val < 100 && statusSelect.value === 'done') {
                statusSelect.value = val > 0 ? 'in-progress' : 'todo';
                statusSelect.dispatchEvent(new Event('change'));
            }

            progressBar.className = `absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${val >= 100 ? 'bg-emerald-500' : 'bg-primary'}`;

            container.querySelectorAll('.progress-quick-btn').forEach(btn => {
                const bv = parseInt(btn.dataset.progress);
                if (bv === val) {
                    btn.className = `progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ring-1 ${bv === 100 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 ring-emerald-500/20' : 'bg-primary/15 border-primary/30 text-primary ring-primary/20'}`;
                } else {
                    btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-white/5 border-white/10 text-dim hover:bg-primary/10 hover:text-primary hover:border-primary/20';
                }
            });
        };

        progressInput.oninput = (e) => updateProgressUI(e.target.value);
        progressNumberInput.oninput = (e) => updateProgressUI(e.target.value);
        container.querySelectorAll('.progress-quick-btn').forEach(btn => {
            btn.onclick = () => updateProgressUI(btn.dataset.progress);
        });

        // Date/Time Shift Logic
        container.addEventListener('click', (e) => {
            const shiftBtn = e.target.closest('.time-shift-btn, .date-shift-btn');
            if (!shiftBtn) return;
            const isTime = shiftBtn.classList.contains('time-shift-btn');
            const direction = parseInt(shiftBtn.dataset.direction);
            const shiftMinutes = isTime ? direction * 15 : direction * 1440;

            const shift = (dateIn, timeIn) => {
                if (!dateIn.value || !timeIn.value) return;
                const dt = new Date(`${dateIn.value}T${timeIn.value}`);
                dt.setMinutes(dt.getMinutes() + shiftMinutes);
                dateIn.value = dt.toISOString().split('T')[0];
                timeIn.value = dt.toTimeString().substring(0, 5);
            };

            shift(form.start_date, form.start_time);
            shift(form.end_date, form.end_time);
        });

        form.onsubmit = async (e) => {
            e.preventDefault();
            
            // flush any floating text left in tag input into tags
            if (tagInput && tagInput.value.trim()) {
                const rawTags = tagInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                rawTags.forEach(t => {
                    if (!currentTags.includes(t)) {
                        currentTags.push(t);
                    }
                });
                hiddenTagsInput.value = currentTags.join(',');
                tagInput.value = '';
                renderTags();
            }

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            data.tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

            // Format dates
            const st = data.start_time || '09:00';
            const et = data.end_time || '17:00';
            if (data.start_date) data.start_date = `${data.start_date}T${st}:00`;
            if (data.end_date) data.end_date = `${data.end_date}T${et}:00`;
            delete data.start_time;
            delete data.end_time;

            data.progress = parseInt(data.progress) || 0;

            if (data.status === 'done') {
                const ct = data.completed_time || '17:00';
                if (data.completed_date) {
                    data.completed_at = `${data.completed_date}T${ct}:00`;
                } else {
                    const now = new Date();
                    data.completed_at = now.toISOString();
                }
            } else {
                data.completed_at = null;
            }

            try {
                await api.post('planner.php', data);
                onSave();
                close();
            } catch (err) {
                alert('Failed to save task');
            }
        };
    }
}

