import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { TaskModal } from './task-modal.js';
import { TimeEntryModal } from './time-entry-modal.js';

/**
 * components/project-modal.js
 * 
 * Centralized Project Editor
 */
export class ProjectModal {
    static open(project = null, options = {}) {
        const { onSave = () => { }, onCancel = () => { } } = options;
        const state = store.get();
        const customers = state.customers || [];
        const team = state.team || [];
        const modalPortal = document.getElementById('modal-portal');
        if (!modalPortal) return;

        const defaultPalette = ['#338a81', '#800000', '#4a148c', '#1a237e', '#006064', '#1b5e20', '#827717', '#e65100', '#bf360c', '#3e2723', '#263238', '#c2185b', '#00c853', '#ffd600', '#2c3e50'];
        let currentPalette = JSON.parse(localStorage.getItem('project_palette')) || defaultPalette;

        const closeModal = () => {
            const overlay = modalPortal.querySelector('.project-modal-overlay');
            if (!overlay) return;
            const content = overlay.querySelector('#project-modal-content');
            if (content) content.classList.remove('scale-100', 'opacity-100');
            setTimeout(() => { overlay.remove(); }, 300);
            onCancel();
        };

        const modalHtml = `
            <div class="project-modal-overlay fixed inset-0 bg-secondary/60 z-[100] backdrop-blur-xl pointer-events-auto overflow-hidden flex justify-center items-center">
                <div class="w-full flex items-center justify-center p-3 h-full max-h-screen">
                    <div id="project-modal-content" class="bg-card rounded-2xl shadow-2xl w-full max-w-5xl p-4 sm:p-5 transform scale-95 opacity-0 transition-all duration-300 relative border border-soft text-main text-center max-h-full flex flex-col">
                        <button id="close-project-modal" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5 z-10 shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>

                        <div class="mb-4 shrink-0">
                            <h3 class="text-2xl font-black text-main tracking-tighter" id="modal-title">${project ? 'Edit Project' : 'New Project'}</h3>
                            <p class="text-[9px] font-black text-dim uppercase tracking-[0.4em] mt-1 opacity-60">Manage Project Configuration</p>
                        </div>

                        <div class="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                            <div class="overflow-y-auto custom-scrollbar flex-1 px-1 -mx-1 pr-3 pb-1 w-full text-left lg:border-r lg:border-white/5 lg:mr-2">
                                <form id="project-form" class="flex flex-col gap-4">
                                <input type="hidden" name="id" value="${project ? project.id : ''}">
                                
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <!-- Name (Full Width) -->
                                    <div class="space-y-1.5 md:col-span-3">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Project Name</label>
                                        <input type="text" name="name" required value="${project ? project.name : ''}" placeholder="Launch Campaign" class="w-full py-2.5 px-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-main font-bold placeholder:opacity-30 text-sm outline-none">
                                    </div>

                                    <!-- Row 2: Progress, Priority, Visibility -->
                                    <div class="space-y-1.5" id="project-progress-container">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Progress</label>
                                        <div class="flex items-center gap-3 bg-app rounded-xl py-[11px] px-4">
                                            <input type="range" name="progress" min="0" max="100" value="${project ? project.progress || 0 : 0}" id="project-progress-slider" class="flex-1 h-1.5 bg-card rounded-lg appearance-none cursor-pointer accent-primary shadow-inner">
                                            <span id="project-progress-val" class="text-[10px] font-black text-primary tabular-nums shrink-0 w-8 text-right">${project ? project.progress || 0 : 0}%</span>
                                        </div>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Priority</label>
                                        <input type="number" min="1" max="99" name="priority" value="${project && project.priority !== undefined ? project.priority : 10}" class="w-full py-2.5 px-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-main font-bold text-sm outline-none">
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1" title="Hide from Planner & global reports">Visibility</label>
                                        <label class="flex items-center justify-between gap-3 bg-app rounded-xl py-[9px] px-4 cursor-pointer hover:bg-app/80 transition-colors">
                                            <span class="text-[10px] font-black text-main uppercase tracking-[0.2em] truncate">Hide Project</span>
                                            <input type="checkbox" name="hide_from_gantt" class="w-4 h-4 rounded border-soft bg-card text-primary focus:ring-primary/20" ${project && project.hide_from_gantt ? 'checked' : ''}>
                                        </label>
                                    </div>

                                    <!-- Row 3: Org, Client Contact, Project Lead -->
                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Organization</label>
                                        <div class="relative group">
                                            <select name="customer_id" id="modal-org-select" class="w-full bg-app border-none rounded-xl py-2.5 px-4 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20 transition-all uppercase text-[10px] tracking-widest outline-none">
                                                <option value="">Global / Internal</option>
                                                ${customers.filter(c => c.is_client == 1).map(c => `<option value="${c.id}" ${project && project.customer_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                            </select>
                                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Client Contact</label>
                                        <div class="relative group">
                                            <select name="client_id" id="modal-client-select" class="w-full bg-app border-none rounded-xl py-2.5 px-4 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20 transition-all uppercase text-[10px] tracking-widest outline-none">
                                                <option value="">Assign Later...</option>
                                            </select>
                                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Project Lead</label>
                                        <div class="relative group">
                                            <select name="lead_id" id="modal-lead-select" class="w-full bg-app border-none rounded-xl py-2.5 px-4 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20 transition-all uppercase text-[10px] tracking-widest outline-none">
                                                <option value="">No Lead</option>
                                                ${team.map(t => `<option value="${t.id}" ${project && project.lead_id == t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                                            </select>
                                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Row 4: Project Dev, Status, Type -->
                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Project Dev</label>
                                        <div class="relative group">
                                            <select name="dev_id" id="modal-dev-select" class="w-full bg-app border-none rounded-xl py-2.5 px-4 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20 transition-all uppercase text-[10px] tracking-widest outline-none">
                                                <option value="">No Dev</option>
                                                ${team.map(t => `<option value="${t.id}" ${project && project.dev_id == t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                                            </select>
                                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Status</label>
                                        <div class="relative group">
                                            <select name="status" class="w-full bg-app border-none rounded-xl py-2.5 px-4 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20 transition-all uppercase text-[10px] tracking-widest outline-none">
                                                <option value="Active" ${project && project.status === 'Active' ? 'selected' : ''}>Active</option>
                                                <option value="On Hold" ${project && project.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                                                <option value="Completed" ${project && project.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                                <option value="Cancelled" ${project && project.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                            </select>
                                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Type</label>
                                        <div class="relative group">
                                            <select name="type" id="modal-type-select" class="w-full bg-app border-none rounded-xl py-2.5 px-4 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20 transition-all uppercase text-[10px] tracking-widest outline-none">
                                                <option value="project" ${!project || (project.type !== 'epic' && project.type !== 'ops') ? 'selected' : ''}>Project</option>
                                                <option value="epic" ${project && project.type === 'epic' ? 'selected' : ''}>Epic</option>
                                                <option value="ops" ${project && project.type === 'ops' ? 'selected' : ''}>Ops</option>
                                            </select>
                                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Row 5: Parent Epic, Start Date, Deadline -->
                                    <div class="space-y-1.5" id="parent-epic-container">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Parent Epic</label>
                                        <div class="relative group">
                                            <select name="parent_id" id="modal-parent-select" class="w-full bg-app border-none rounded-xl py-2.5 px-4 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20 transition-all uppercase text-[10px] tracking-widest outline-none">
                                                <option value="">None</option>
                                                ${(state.projects || []).filter(p => p.type === 'epic' && (!project || p.id !== project.id)).map(p => `<option value="${p.id}" ${project && project.parent_id == p.id ? 'selected' : ''}>[EPIC] ${p.name}</option>`).join('')}
                                            </select>
                                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="space-y-1.5 date-container">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Start Date</label>
                                        <input type="date" name="started_at" value="${project && project.started_at ? project.started_at.split('T')[0] : ''}" class="w-full py-2.5 px-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-main font-bold text-sm outline-none">
                                    </div>

                                    <div class="space-y-1.5 date-container">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Deadline</label>
                                        <input type="date" name="completed_at" value="${project && project.completed_at ? project.completed_at.split('T')[0] : ''}" class="w-full py-2.5 px-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-main font-bold text-sm outline-none">
                                    </div>

                                    <!-- Notes -->
                                    <div class="space-y-1.5 md:col-span-3">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Notes</label>
                                        <textarea name="notes" rows="1" placeholder="Project notes and details..." class="w-full py-2.5 px-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-main font-bold placeholder:opacity-30 text-sm outline-none resize-y">${project && project.notes ? project.notes : ''}</textarea>
                                    </div>
                                    
                                    <!-- Tags -->
                                    <div class="space-y-1.5 md:col-span-3">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.2em] block ml-1">Tags</label>
                                        <div class="bg-app border border-white/5 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all flex flex-wrap gap-2 items-center min-h-[44px] shadow-inner" id="modal-tags-container">
                                            <input type="text" id="modal-tag-input" placeholder="Type tag and press Enter..." class="bg-transparent border-none outline-none text-main font-bold text-sm flex-1 min-w-[150px] placeholder:opacity-30" style="border: none !important; box-shadow: none !important; background: transparent !important; outline: none !important; padding: 0;">
                                        </div>
                                        <input type="hidden" name="tags" id="hidden-tags-input" value="${project && project.tags ? project.tags.join(',') : ''}">
                                        
                                        <div class="mt-2 ml-1 flex flex-wrap gap-1.5" id="suggested-tags-container">
                                            <!-- Suggestions -->
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-3 pt-3 border-t border-soft border-dashed">
                                    <div class="flex items-center justify-between mb-1">
                                        <label class="text-[9px] font-black text-dim uppercase tracking-[0.5em] opacity-60">Visual ID Palette</label>
                                        <button type="button" id="randomize-colors" class="text-[8px] font-black text-primary uppercase tracking-widest hover:underline px-3 py-1.5 bg-app rounded-md border border-soft shadow-inner">New Palette</button>
                                    </div>
                                    <div id="modal-palette-container" class="flex gap-2.5 justify-center flex-wrap max-w-lg mx-auto pb-1">
                                        <!-- Palette items added by JS -->
                                    </div>
                                </div>

                            <div>
                                <button type="submit" id="submit-btn" class="w-full bg-primary hover:bg-primary-dark text-white font-black text-[12px] uppercase tracking-[0.5em] rounded-2xl shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95 py-3.5 leading-none transform">
                                    Save Project
                                </button>
                            </div>
                            </form>
                            </div>
                            <!-- Right Column: Context Pane -->
                            <div class="w-full lg:w-[320px] xl:w-[380px] shrink-0 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-left pb-4 px-1 lg:pl-1">
                                ${project ? `
                                <div>
                                    <h4 class="text-[10px] font-black text-dim uppercase tracking-widest border-b border-soft pb-2 mb-3">Linked Tasks</h4>
                                    <div id="modal-related-tasks" class="space-y-2 flex flex-col">
                                        <div class="text-xs text-dim opacity-50 py-2">Loading tasks...</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="text-[10px] font-black text-dim uppercase tracking-widest border-b border-soft pb-2 mb-3">Recent Time Logs</h4>
                                    <div id="modal-related-time" class="space-y-2 flex flex-col">
                                        <div class="text-xs text-dim opacity-50 py-2">Loading logs...</div>
                                    </div>
                                </div>
                                ` : `
                                <div class="flex items-center justify-center h-full opacity-30 text-center flex-col gap-2 min-h-[300px]">
                                    <svg class="w-8 h-8 text-dim mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    <p class="text-[10px] font-black uppercase tracking-[0.1em] text-dim">Save project first<br>to view linked items.</p>
                                </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modalPortal.insertAdjacentHTML('beforeend', modalHtml);
        const overlay = modalPortal.querySelector('.project-modal-overlay:last-child');
        const content = overlay.querySelector('#project-modal-content');
        const projectForm = overlay.querySelector('#project-form');
        const orgSelect = projectForm.querySelector('#modal-org-select');
        const clientSelect = projectForm.querySelector('#modal-client-select');
        const paletteContainer = overlay.querySelector('#modal-palette-container');
        const progressSlider = overlay.querySelector('#project-progress-slider');
        const progressLabel = overlay.querySelector('#project-progress-val');

        setTimeout(() => {
            if (content) content.classList.add('scale-100', 'opacity-100');
        }, 10);

        if (project) {
            // Populate Context Pane
            const tasksContainer = overlay.querySelector('#modal-related-tasks');
            const timeContainer = overlay.querySelector('#modal-related-time');
            
            const relatedTasks = (state.tasks || []).filter(t => t.project_id == project.id).sort((a, b) => {
                if (a.status !== 'done' && b.status === 'done') return -1;
                if (a.status === 'done' && b.status !== 'done') return 1;
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            });
            const relatedEntries = (state.timeEntries || []).filter(e => e.project_id == project.id).sort((a, b) => new Date(b.start_time) - new Date(a.start_time)).slice(0, 50);

            if (tasksContainer) {
                if (relatedTasks.length > 0) {
                    tasksContainer.innerHTML = relatedTasks.map(t => {
                        const isDone = t.status === 'done';
                        const pcol = isDone ? 'text-emerald-500' : 'text-primary';
                        const bgcol = isDone ? 'bg-emerald-500/10' : 'bg-primary/10';
                        return `
                        <div class="px-3 py-2 bg-app rounded-xl border border-white/5 hover:border-primary/30 transition-colors cursor-pointer group flex items-start gap-3 task-jump-btn" data-id="${t.id}">
                            <div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]'}"></div>
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-main truncate group-hover:text-primary transition-colors">${t.title}</div>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-[8px] font-black uppercase tracking-widest ${pcol} ${bgcol} px-1.5 py-0.5 rounded">${t.status}</span>
                                    <span class="text-[9px] font-bold text-dim">${t.progress || 0}% ${t.resource_id ? '&bull; ' + t.resource_id : ''}</span>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('');
                    
                    tasksContainer.querySelectorAll('.task-jump-btn').forEach(btn => {
                        btn.onclick = () => {
                            const task = relatedTasks.find(x => String(x.id) === btn.dataset.id);
                            if (task) TaskModal.open(task, { onSave: () => {
                                // optional: refresh logic, for now we just rely on main view refresh
                                closeModal(); 
                                if(window.location.hash.includes('tasks') || window.location.hash.includes('planner')) {
                                    // already handled by components
                                } else {
                                    // force refresh
                                    setTimeout(() => window.dispatchEvent(new Event('hashchange')), 100);
                                }
                            }});
                        };
                    });
                } else {
                    tasksContainer.innerHTML = '<div class="text-[10px] font-bold text-dim/50 uppercase tracking-widest text-center py-4 bg-app/50 rounded-xl border border-white/5 border-dashed">No Tasks Linked</div>';
                }
            }

            if (timeContainer) {
                if (relatedEntries.length > 0) {
                    timeContainer.innerHTML = relatedEntries.map(e => {
                        const dur = e.duration ? (e.duration / 3600).toFixed(1) + 'h' : '?';
                        const dateStr = e.start_time ? new Date(e.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) : '';
                        return `
                        <div class="px-3 py-2 bg-app rounded-xl border border-white/5 hover:border-primary/30 transition-colors cursor-pointer group flex items-start justify-between gap-3 time-jump-btn" data-id="${e.id}">
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-medium text-dim/80 group-hover:text-primary transition-colors truncate">${e.notes ? e.notes : '<span class="italic opacity-50">Empty log</span>'}</div>
                                <div class="text-[9px] font-bold text-dim/50 uppercase tracking-widest mt-1">${dateStr} &bull; ${e.user_id ? e.user_id.substring(0,6) : 'Unk'}</div>
                            </div>
                            <div class="text-xs font-black text-main group-hover:text-primary transition-colors shrink-0 tabular-nums">${dur}</div>
                        </div>
                        `;
                    }).join('');
                    
                    timeContainer.querySelectorAll('.time-jump-btn').forEach(btn => {
                        btn.onclick = () => {
                            const entry = relatedEntries.find(x => String(x.id) === btn.dataset.id);
                            if (entry) TimeEntryModal.open(entry, { onSave: () => {
                                closeModal(); 
                                setTimeout(() => window.dispatchEvent(new Event('hashchange')), 100);
                            }});
                        };
                    });
                } else {
                    timeContainer.innerHTML = '<div class="text-[10px] font-bold text-dim/50 uppercase tracking-widest text-center py-4 bg-app/50 rounded-xl border border-white/5 border-dashed">No Time Tracked</div>';
                }
            }
        }

        overlay.querySelector('#close-project-modal').onclick = closeModal;
        overlay.onclick = (e) => { if (e.target === overlay || e.target === overlay.firstElementChild) closeModal(); };

        const updateClientOptions = (orgId, selectedClientId = null) => {
            let filteredClients = [];
            if (orgId) {
                filteredClients = customers.filter(c => {
                    if (c.is_client == 1) return false;
                    if (c.client_id === orgId) return true;
                    if (c.organization_ids && Array.isArray(c.organization_ids) && c.organization_ids.includes(orgId)) return true;
                    return false;
                });
            } else {
                filteredClients = customers.filter(c => c.is_client == 0 && (!c.client_id && (!c.organization_ids || c.organization_ids.length === 0)));
            }

            clientSelect.innerHTML = '<option value="">Assign Later...</option>' +
                filteredClients.map(c => `<option value="${c.id}" ${c.id == (selectedClientId || (project ? project.client_id : '')) ? 'selected' : ''}>${c.name}</option>`).join('');
        };

        const renderPalette = (selectedColor = null) => {
            let displayPalette = [...currentPalette];
            const activeColor = selectedColor || (project ? project.color : null);
            if (activeColor && !displayPalette.includes(activeColor)) {
                displayPalette.unshift(activeColor);
                if (displayPalette.length > 20) displayPalette.pop();
            }

            paletteContainer.innerHTML = displayPalette.map((color, idx) => `
                <label class="cursor-pointer group relative">
                    <input type="radio" name="color" value="${color}" class="peer sr-only" ${(activeColor ? color === activeColor : idx === 0) ? 'checked' : ''}>
                    <div class="w-8 h-8 rounded-full peer-checked:ring-offset-2 peer-checked:ring-2 peer-checked:ring-primary/40 transition-all border-2 border-white/5 hover:scale-110 shadow-md active:scale-90" style="background-color: ${color}; box-shadow: 0 4px 10px ${color}30"></div>
                </label>
            `).join('');
        };

        orgSelect.onchange = (e) => updateClientOptions(e.target.value);
        updateClientOptions(project ? project.customer_id : '');
        renderPalette();

        overlay.querySelector('#randomize-colors').onclick = () => {
            const colors = [];
            for (let i = 0; i < 15; i++) {
                const h = Math.floor(Math.random() * 360);
                const s = 40 + Math.floor(Math.random() * 50);
                const l = 25 + Math.floor(Math.random() * 45);
                const l2 = l / 100;
                const a = (s * Math.min(l2, 1 - l2)) / 100;
                const f = n => {
                    const k = (n + h / 30) % 12;
                    const color = l2 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                    return Math.round(255 * color).toString(16).padStart(2, '0');
                };
                colors.push(`#${f(0)}${f(8)}${f(4)}`);
            }
            currentPalette = colors;
            localStorage.setItem('project_palette', JSON.stringify(colors));
            const currentColor = projectForm.querySelector('input[name="color"]:checked')?.value;
            renderPalette(currentColor);
        };

        progressSlider.oninput = () => { progressLabel.textContent = `${progressSlider.value}%`; };

        // TAG BUILDER LOGIC
        const tagsContainer = overlay.querySelector('#modal-tags-container');
        const tagInput = overlay.querySelector('#modal-tag-input');
        const hiddenTagsInput = overlay.querySelector('#hidden-tags-input');
        const suggestedContainer = overlay.querySelector('#suggested-tags-container');
        
        let currentTags = project && project.tags ? [...project.tags].map(t => t.toLowerCase()) : [];
        const existingTagsRaw = (state.projects || []).flatMap(p => p.tags || []);
        let uniqueGlobalTags = [...new Set(existingTagsRaw.map(t => t.toLowerCase()))];
        
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

        const typeSelect = projectForm.querySelector('#modal-type-select');
        const parentContainer = projectForm.querySelector('#parent-epic-container');
        const dateContainers = projectForm.querySelectorAll('.date-container');
        const progressContainer = projectForm.querySelector('#project-progress-container');
        if (typeSelect) {
            typeSelect.onchange = (e) => {
                const isOps = e.target.value === 'ops';
                if (parentContainer) parentContainer.style.display = (e.target.value === 'epic' || isOps) ? 'none' : 'block';
                dateContainers.forEach(c => c.style.display = isOps ? 'none' : 'block');
                if (progressContainer) progressContainer.style.display = isOps ? 'none' : 'block';
            };
            typeSelect.dispatchEvent(new Event('change'));
        }

        projectForm.onsubmit = async (e) => {
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

            const data = Object.fromEntries(new FormData(projectForm).entries());
            
            data.hide_from_gantt = projectForm.querySelector('[name="hide_from_gantt"]').checked ? 1 : 0;
            data.tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            if (data.type === 'epic') data.parent_id = null;
            if (!data.parent_id) data.parent_id = null;
            if (data.priority === '') data.priority = 10;
            else data.priority = parseInt(data.priority);

            try {
                await api.post('projects.php', data);
                store.update('projects', await api.get('projects.php'));
                closeModal();
                onSave(data);
            } catch (err) {
                console.error('Project update failed:', err);
                alert('Project update failed');
            }
        };
    }
}

