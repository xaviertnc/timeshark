/**
 * assets/components/planner/planner-modal.js
 * 
 * Manages the Task Creation/Edit Modal.
 * Redesigned: wider layout, time pickers, progress quick-buttons, notes, priority.
 */

import { api } from '../../utils/api.js';
import { store } from '../../utils/store.js';

export const PlannerModal = {
    render(containerId) {
        const portal = document.getElementById(containerId);
        if (!portal) return;

        portal.innerHTML = `
            <div id="planner-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto overflow-y-auto">
                <div class="w-full flex items-start justify-center py-6 px-4">
                    <div class="bg-card rounded-2xl shadow-soft w-full max-w-2xl p-8 md:p-10 transform transition-all scale-95 opacity-0 relative mx-3 sm:mx-auto" id="planner-modal-content">
                        <button id="close-planner-modal" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5 z-10" title="Close">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>

                        <div class="mb-8">
                            <h3 id="planner-modal-title" class="text-2xl font-bold text-main tracking-tight">New Task</h3>
                            <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Planning Registry</p>
                        </div>

                        <form id="planner-form" class="space-y-6">
                            <input type="hidden" name="id">

                            <!-- Title -->
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Task Name</label>
                                <input type="text" name="title" required placeholder="What needs to be done?" class="w-full py-3 px-4 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 font-bold text-main text-sm outline-none transition-all">
                            </div>

                            <!-- Row: Member, Project, Status -->
                            <div class="flex gap-3">
                                <div class="space-y-2 w-[130px] shrink-0">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Member</label>
                                    <select name="resource_id" id="modal-resource" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none"></select>
                                </div>
                                <div class="space-y-2 flex-1 min-w-0">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Project</label>
                                    <select name="project_id" id="modal-project" required class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none"></select>
                                </div>
                                <div class="space-y-2 w-[130px] shrink-0">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Status</label>
                                    <select name="status" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none">
                                        <option value="todo">Todo</option>
                                        <option value="in-progress">In-Progress</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Row: Type, Priority -->
                            <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Type</label>
                                    <select name="task_type" id="modal-task-type" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none">
                                        <option value="task">📋 Task</option>
                                        <option value="project_span">🎯 Project Span</option>
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Priority</label>
                                    <select name="priority" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 text-main font-bold cursor-pointer appearance-none text-[11px] outline-none">
                                        <option value="low">🟢 Low</option>
                                        <option value="medium">🟡 Medium</option>
                                        <option value="high">🔴 High</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Notes -->
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Notes</label>
                                <textarea name="notes" rows="3" placeholder="Add details, links, or anything helpful..." class="w-full py-3 px-4 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-main text-sm outline-none transition-all resize-none font-medium"></textarea>
                            </div>

                            <!-- Schedule Section -->
                            <div class="space-y-4 border-t border-white/5 pt-5">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-black text-dim uppercase tracking-widest">Schedule</span>
                                    <label class="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="toggle-dates" class="sr-only peer">
                                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
                                        <span class="ml-2 text-[10px] font-bold text-dim">Active</span>
                                    </label>
                                </div>

                                <div id="date-fields" class="hidden grid-cols-2 gap-4 transition-all">
                                    <!-- Start -->
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Start</label>
                                        <div class="flex gap-2">
                                            <input type="date" name="start_date" class="flex-1 py-2.5 px-3 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main outline-none transition-all">
                                            <input type="time" name="start_time" value="09:00" class="w-24 py-2.5 px-3 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main outline-none transition-all">
                                        </div>
                                    </div>
                                    <!-- End -->
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">End</label>
                                        <div class="flex gap-2">
                                            <input type="date" name="end_date" class="flex-1 py-2.5 px-3 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main outline-none transition-all">
                                            <input type="time" name="end_time" value="17:00" class="w-24 py-2.5 px-3 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main outline-none transition-all">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Progress Section -->
                            <div id="progress-section" class="space-y-3 border-t border-white/5 pt-5">
                                <div class="flex justify-between items-center">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest">Progress</label>
                                    <span id="progress-val" class="text-xs font-black text-primary tabular-nums">0%</span>
                                </div>

                                <!-- Combined Progress Bar + Slider -->
                                <div class="relative h-3 bg-white/5 rounded-full group/progress cursor-pointer">
                                    <div id="progress-bar-fill" class="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300 pointer-events-none" style="width: 0%"></div>
                                    <input type="range" name="progress" min="0" max="100" value="0" step="5" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                                </div>

                                <!-- Quick Buttons -->
                                <div class="flex gap-2">
                                    ${[0, 25, 50, 75, 100].map(v => `
                                        <button type="button" class="progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${v === 0 ? 'bg-primary/15 border-primary/30 text-primary ring-1 ring-primary/20' : 'bg-white/5 border-white/10 text-dim hover:bg-primary/10 hover:text-primary hover:border-primary/20'}" data-progress="${v}">
                                            ${v}%
                                        </button>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="pt-4 grid grid-cols-4 gap-3">
                                <button type="button" id="delete-btn" class="hidden col-span-1 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all">
                                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                                <button type="submit" id="commit-btn" class="col-span-4 h-12 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-[0.98] leading-none">
                                    Save Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.attachEvents();
    },

    attachEvents() {
        const portal = document.getElementById('modal-portal');
        const modal = portal.querySelector('#planner-modal');
        const content = portal.querySelector('#planner-modal-content');
        const closeBtn = portal.querySelector('#close-planner-modal');
        const form = portal.querySelector('#planner-form');
        const dateToggle = portal.querySelector('#toggle-dates');
        const dateFields = portal.querySelector('#date-fields');
        const progressInput = portal.querySelector('input[name="progress"]');
        const progressVal = portal.querySelector('#progress-val');
        const progressBar = portal.querySelector('#progress-bar-fill');
        const deleteBtn = portal.querySelector('#delete-btn');
        const commitBtn = portal.querySelector('#commit-btn');
        const taskTypeSelect = portal.querySelector('#modal-task-type');

        closeBtn.onclick = () => this.close();

        // Click backdrop to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target === modal.firstElementChild) {
                this.close();
            }
        });

        // Delete Handler
        deleteBtn.onclick = async () => {
            const id = form.id.value;
            if (id && confirm('Delete this task?')) {
                await api.delete(`planner.php?id=${id}`);
                this.onSave();
                this.close();
            }
        };

        // Date Toggle Logic
        dateToggle.onchange = (e) => {
            if (e.target.checked) {
                dateFields.classList.remove('hidden');
                dateFields.classList.add('grid');
                if (!form.start_date.value) {
                    const today = new Date().toISOString().split('T')[0];
                    form.start_date.value = today;
                    form.end_date.value = today;
                }
                if (!form.start_time.value) form.start_time.value = '09:00';
                if (!form.end_time.value) form.end_time.value = '17:00';
            } else {
                dateFields.classList.add('hidden');
                dateFields.classList.remove('grid');
                form.start_date.value = '';
                form.end_date.value = '';
                form.start_time.value = '09:00';
                form.end_time.value = '17:00';
            }
        };

        // Task Type change handler - hide progress for span tasks
        const progressSection = portal.querySelector('#progress-section');
        taskTypeSelect.onchange = () => {
            if (taskTypeSelect.value === 'project_span') {
                progressSection.classList.add('hidden');
            } else {
                progressSection.classList.remove('hidden');
            }
        };

        // Progress Slider
        const statusSelect = form.querySelector('select[name="status"]');
        const updateProgress = (val) => {
            progressVal.innerText = `${val}%`;
            progressInput.value = val;
            progressBar.style.width = `${val}%`;

            // Auto-sync status with progress
            if (val >= 100 && statusSelect.value !== 'done') {
                statusSelect.value = 'done';
            } else if (val < 100 && statusSelect.value === 'done') {
                statusSelect.value = val > 0 ? 'in-progress' : 'todo';
            }

            // Color transitions
            if (val >= 100) {
                progressBar.className = 'absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-300';
                progressVal.className = 'text-xs font-black text-emerald-500 tabular-nums';
            } else if (val > 0) {
                progressBar.className = 'absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300';
                progressVal.className = 'text-xs font-black text-primary tabular-nums';
            } else {
                progressBar.className = 'absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300';
                progressVal.className = 'text-xs font-black text-dim tabular-nums';
            }

            // Highlight active quick button
            portal.querySelectorAll('.progress-quick-btn').forEach(btn => {
                const bv = parseInt(btn.dataset.progress);
                if (bv === val) {
                    if (bv === 100) {
                        btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-emerald-500/20 border-emerald-500/30 text-emerald-400 ring-1 ring-emerald-500/20';
                    } else {
                        btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-primary/15 border-primary/30 text-primary ring-1 ring-primary/20';
                    }
                } else {
                    btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-white/5 border-white/10 text-dim hover:bg-primary/10 hover:text-primary hover:border-primary/20';
                }
            });
        };

        progressInput.oninput = (e) => updateProgress(parseInt(e.target.value));

        // Quick Progress Buttons
        portal.querySelectorAll('.progress-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                updateProgress(parseInt(btn.dataset.progress));
            });
        });

        // Form Submit
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());

            // Handle Dates + Times
            if (!dateToggle.checked) {
                data.start_date = null;
                data.end_date = null;
                delete data.start_time;
                delete data.end_time;
            } else {
                // Combine date + time into ISO strings
                const st = data.start_time || '09:00';
                const et = data.end_time || '17:00';
                if (data.start_date) data.start_date = `${data.start_date}T${st}:00`;
                if (data.end_date) data.end_date = `${data.end_date}T${et}:00`;
                delete data.start_time;
                delete data.end_time;
            }

            // Ensure numeric progress
            data.progress = parseInt(data.progress) || 0;


            // Preserve task_type
            data.task_type = data.task_type || 'task';

            // Track completion timestamp
            if (data.status === 'done') {
                // Preserve existing completed_at if task was already done
                const existingTask = this._currentTask;
                if (existingTask && existingTask.completed_at) {
                    data.completed_at = existingTask.completed_at;
                } else {
                    // New completion: use end date if available, otherwise now
                    const now = new Date();
                    if (data.end_date) {
                        const endStr = data.end_time
                            ? `${data.end_date}T${data.end_time}`
                            : `${data.end_date}T23:59:59`;
                        const endDate = new Date(endStr);
                        data.completed_at = (endDate < now ? endDate : now).toISOString();
                    } else {
                        data.completed_at = now.toISOString();
                    }
                }
            } else {
                data.completed_at = null;
            }

            try {
                await api.post('planner.php', data);
                this.onSave();
                this.close();
            } catch (err) {
                alert('Failed to save task');
            }
        };
    },

    open(task = null, defaults = {}) {
        this._currentTask = task; // Store reference for save logic
        const portal = document.getElementById('modal-portal');
        const modal = portal.querySelector('#planner-modal');
        const content = portal.querySelector('#planner-modal-content');
        const form = portal.querySelector('#planner-form');
        const title = portal.querySelector('#planner-modal-title');
        const commitBtn = portal.querySelector('#commit-btn');
        const deleteBtn = portal.querySelector('#delete-btn');
        const dateToggle = portal.querySelector('#toggle-dates');
        const dateFields = portal.querySelector('#date-fields');
        const progressInput = portal.querySelector('input[name="progress"]');
        const progressVal = portal.querySelector('#progress-val');
        const progressBar = portal.querySelector('#progress-bar-fill');

        // Populate Selects
        const state = store.get();
        const resources = state.team ? state.team.map(m => m.name) : ['General'];
        if (!resources.includes('General')) resources.push('General');

        const rSelect = form.querySelector('#modal-resource');
        rSelect.innerHTML = resources.map(r => `<option value="${r}">${r}</option>`).join('');

        const pSelect = form.querySelector('#modal-project');
        pSelect.innerHTML = `<option value="">Select Project...</option>` +
            (state.projects || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        // Reset
        form.reset();
        progressBar.style.width = '0%';
        progressVal.innerText = '0%';
        progressVal.className = 'text-xs font-black text-dim tabular-nums';
        progressBar.className = 'absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300';

        // Reset type
        const taskTypeSelect = portal.querySelector('#modal-task-type');
        taskTypeSelect.value = 'task';

        // Reset quick buttons
        portal.querySelectorAll('.progress-quick-btn').forEach(btn => {
            const bv = parseInt(btn.dataset.progress);
            if (bv === 0) {
                btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-primary/15 border-primary/30 text-primary ring-1 ring-primary/20';
            } else if (bv === 100) {
                btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20';
            } else {
                btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-white/5 border-white/10 text-dim hover:bg-primary/10 hover:text-primary hover:border-primary/20';
            }
        });

        if (task) {
            title.innerText = 'Edit Task';
            commitBtn.innerText = 'Update Task';
            commitBtn.classList.remove('col-span-4');
            commitBtn.classList.add('col-span-3');
            deleteBtn.classList.remove('hidden');

            form.id.value = task.id;
            form.title.value = task.title;
            form.resource_id.value = task.resource_id || 'General';
            form.project_id.value = task.project_id;
            form.status.value = task.status || 'todo';
            form.priority.value = task.priority || 'medium';
            form.notes.value = task.notes || '';

            // Type
            taskTypeSelect.value = task.task_type || 'task';
            // Hide progress for span tasks
            const progressSection = portal.querySelector('#progress-section');
            if (task.task_type === 'project_span') {
                progressSection.classList.add('hidden');
            } else {
                progressSection.classList.remove('hidden');
            }

            // Progress
            const prog = task.progress || 0;
            progressInput.value = prog;
            progressVal.innerText = `${prog}%`;
            progressBar.style.width = `${prog}%`;
            if (prog >= 100) {
                progressBar.className = 'absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-300';
                progressVal.className = 'text-xs font-black text-emerald-500 tabular-nums';
            } else if (prog > 0) {
                progressVal.className = 'text-xs font-black text-primary tabular-nums';
            }

            // Highlight matching quick button
            portal.querySelectorAll('.progress-quick-btn').forEach(btn => {
                const bv = parseInt(btn.dataset.progress);
                if (bv === prog) {
                    if (bv === 100) {
                        btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-emerald-500/20 border-emerald-500/30 text-emerald-400 ring-1 ring-emerald-500/20';
                    } else {
                        btn.className = 'progress-quick-btn flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all bg-primary/15 border-primary/30 text-primary ring-1 ring-primary/20';
                    }
                }
            });

            // Dates + Times
            if (task.start_date) {
                dateToggle.checked = true;
                dateFields.classList.remove('hidden');
                dateFields.classList.add('grid');

                const startParts = task.start_date.split('T');
                const endParts = (task.end_date || task.start_date).split('T');

                form.start_date.value = startParts[0];
                form.end_date.value = endParts[0];
                form.start_time.value = startParts[1] ? startParts[1].substring(0, 5) : '09:00';
                form.end_time.value = endParts[1] ? endParts[1].substring(0, 5) : '17:00';
            } else {
                dateToggle.checked = false;
                dateFields.classList.add('hidden');
                dateFields.classList.remove('grid');
            }

        } else {
            title.innerText = 'New Task';
            commitBtn.innerText = 'Create Task';
            commitBtn.classList.remove('col-span-3');
            commitBtn.classList.add('col-span-4');
            deleteBtn.classList.add('hidden');
            form.id.value = '';

            // Defaults
            if (defaults.resource_id) form.resource_id.value = defaults.resource_id;
            if (defaults.project_id) form.project_id.value = defaults.project_id;
            form.priority.value = defaults.priority || 'medium';

            if (defaults.date) {
                dateToggle.checked = true;
                dateFields.classList.remove('hidden');
                dateFields.classList.add('grid');
                form.start_date.value = defaults.date;
                form.end_date.value = defaults.date;
                form.start_time.value = '09:00';
                form.end_time.value = '17:00';
            } else {
                dateToggle.checked = false;
                dateFields.classList.add('hidden');
                dateFields.classList.remove('grid');
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.scrollTop = 0; // Ensure top is visible
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    },

    close() {
        const portal = document.getElementById('modal-portal');
        const modal = portal.querySelector('#planner-modal');
        const content = portal.querySelector('#planner-modal-content');

        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 200);
    },

    // Callback hook
    onSave: () => { }
};
