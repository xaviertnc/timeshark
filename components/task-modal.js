/**
 * components/task-modal.js
 * 
 * Centralized Task/Todo Editor.
 * Replaces legacy PlannerModal with a dynamic, self-cleaning static interface.
 */

import { api } from '../utils/api.js';
import { store } from '../utils/store.js';
import { SearchableSelect } from './searchable-select.js';
import { syncSpanToProject } from '../utils/project-span-sync.js';
import { escapeHTML } from '../utils/dom.js';

export class TaskModal {
    static open(task = null, options = {}) {
        const { onSave = () => { }, onCancel = () => { }, defaults = {} } = options;

        // Remove existing modal if any
        const existing = document.getElementById('task-modal-container');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'task-modal-container';
        document.body.appendChild(container);

        container.innerHTML = `
            <div id="task-modal" class="fixed inset-0 bg-secondary/40 flex items-start justify-center z-50 backdrop-blur-md pointer-events-auto overflow-y-auto py-6 px-4">
                <div class="bg-card rounded-2xl shadow-soft w-full max-w-2xl p-8 md:p-10 transform transition-all scale-95 opacity-0 relative mx-3 sm:mx-auto" id="task-modal-content">
                    <button id="close-task-modal" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-highlight hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-subtle z-10" title="Close">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

                    <div class="mb-8">
                        <h3 id="task-modal-title" class="text-2xl font-bold text-main tracking-tight">${task ? 'Edit Task' : 'New Task'}</h3>
                        <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Planning Registry</p>
                    </div>

                    <form id="task-form" class="space-y-6">
                        <input type="hidden" name="id" value="${task?.id || ''}">

                        <!-- Title -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Task Name</label>
                            <input type="text" name="title" required placeholder="What needs to be done?" class="w-full py-3 px-4 bg-app border border-subtle rounded-xl focus:ring-2 focus:ring-primary/20 font-bold text-main text-sm outline-none transition-all" value="${escapeHTML(task?.title || '')}">
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
                                <select name="status" class="w-full bg-app border border-subtle rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none">
                                    <option value="todo" ${task?.status === 'todo' ? 'selected' : ''}>Todo</option>
                                    <option value="in-progress" ${task?.status === 'in-progress' ? 'selected' : ''}>In-Progress</option>
                                    <option value="done" ${task?.status === 'done' ? 'selected' : ''}>Done</option>
                                    <option value="backlog" ${task?.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Priority</label>
                                <select name="priority" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none">
                                    <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                                    <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                                    <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>🔴 High</option>
                                </select>
                            </div>
                        </div>

                        <!-- Row: Type -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Type</label>
                            <select name="task_type" id="modal-task-type" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none">
                                <option value="task" ${task?.task_type === 'task' ? 'selected' : ''}>📋 Task</option>
                                <option value="project_span" ${task?.task_type === 'project_span' ? 'selected' : ''}>🎯 Project Span</option>
                            </select>
                        </div>

                        <!-- Notes -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Notes</label>
                            <textarea name="notes" rows="3" placeholder="Add details, links, or anything helpful..." class="w-full py-3 px-4 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-main text-sm outline-none transition-all resize-none font-medium">${escapeHTML(task?.notes || '')}</textarea>
                        </div>

                        <!-- Schedule Section -->
                        <div class="space-y-4 border-t border-subtle pt-5">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black text-dim uppercase tracking-widest">Schedule</span>
                                <label class="inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="toggle-dates" class="sr-only peer" ${(task?.status && task.status !== 'backlog') || !task ? 'checked' : ''}>
                                    <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
                                    <span class="ml-2 text-[10px] font-bold text-dim">Active</span>
                                </label>
                            </div>

                            <div id="date-fields" class="${(task?.status && task.status !== 'backlog') || !task ? 'grid' : 'hidden'} grid-cols-2 gap-4 transition-all">
                                <!-- Start -->
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Start</label>
                                    <div class="flex gap-2">
                                        <div class="flex-1 flex gap-1 items-center">
                                            <input type="date" name="start_date" class="flex-1 py-2.5 px-3 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main outline-none transition-all">
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
                                            <input type="time" name="start_time" class="w-24 py-2.5 px-3 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main outline-none transition-all">
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
                                            <input type="date" name="end_date" class="flex-1 py-2.5 px-3 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main outline-none transition-all">
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
                                            <input type="time" name="end_time" class="w-24 py-2.5 px-3 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main outline-none transition-all">
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
                        </div>

                        <!-- Progress Section -->
                        <div id="progress-section" class="space-y-3 border-t border-white/5 pt-5">
                            <div class="flex justify-between items-center gap-3">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Progress</label>
                                <div class="flex items-center gap-2">
                                    <input type="number" id="progress-number-input" min="0" max="100" step="1" value="${task?.progress || 0}" class="w-16 py-1 px-2 bg-app border border-white/5 rounded-lg text-xs font-black text-primary text-center outline-none focus:ring-2 focus:ring-primary/20 tabular-nums">
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
                                <button type="submit" id="commit-task-btn" class="col-span-3 h-12 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-[0.98] leading-none">
                                    Update Task
                                </button>
                            ` : `
                                <button type="submit" id="commit-task-btn" class="col-span-4 h-12 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-[0.98] leading-none">
                                    Create Task
                                </button>
                            `}
                        </div>
                    </form>
                </div>
            </div>
        `;

        // ───── LOGIC PORTED FROM PlannerModal ─────

        setTimeout(() => {
            const content = container.querySelector('#task-modal-content');
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);

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
        const initialMember = task?.resource_id || defaults.resource_id || 'me';
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

        // --- Event Handlers ---

        container.querySelector('#close-task-modal').onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };

        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (confirm('Delete this task?')) {
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
        };

        const updateProgressUI = (val) => {
            val = Math.max(0, Math.min(100, parseInt(val) || 0));
            progressNumberInput.value = val;
            progressInput.value = val;
            progressBar.style.width = `${val}%`;

            if (val >= 100 && statusSelect.value !== 'done') {
                statusSelect.value = 'done';
            } else if (val < 100 && statusSelect.value === 'done') {
                statusSelect.value = val > 0 ? 'in-progress' : 'todo';
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
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Format dates
            const st = data.start_time || '09:00';
            const et = data.end_time || '17:00';
            if (data.start_date) data.start_date = `${data.start_date}T${st}:00`;
            if (data.end_date) data.end_date = `${data.end_date}T${et}:00`;
            delete data.start_time;
            delete data.end_time;

            data.progress = parseInt(data.progress) || 0;

            if (data.status === 'done') {
                if (task && task.completed_at) {
                    data.completed_at = task.completed_at;
                } else {
                    const now = new Date();
                    data.completed_at = now.toISOString();
                }
            } else {
                data.completed_at = null;
            }

            try {
                await api.post('planner.php', data);

                // Project Span Sync
                if (data.task_type === 'project_span' && data.project_id) {
                    const tasks = await api.get('planner.php');
                    store.update('tasks', tasks);
                    const saved = tasks.find(t => String(t.id) === String(data.id || 'new'));
                    if (saved) await syncSpanToProject(saved);
                }

                onSave();
                close();
            } catch (err) {
                alert('Failed to save task');
            }
        };
    }
}

