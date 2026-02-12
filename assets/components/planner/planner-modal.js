/**
 * assets/components/planner/planner-modal.js
 * 
 * Manages the Task Creation/Edit Modal.
 */

import { api } from '../../utils/api.js';
import { store } from '../../utils/store.js';

export const PlannerModal = {
    render(containerId) {
        const portal = document.getElementById(containerId);
        if (!portal) return;

        // Modal HTML Structure
        portal.innerHTML = `
            <div id="planner-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
                <div class="min-h-screen w-full flex items-center justify-center p-4">
                    <div class="bg-card rounded-2xl shadow-soft w-full max-w-md p-10 transform transition-all scale-95 opacity-0 text-center relative" id="planner-modal-content">
                        <button id="close-planner-modal" class="absolute top-8 right-10 text-dim hover:text-main text-2xl transition-colors">&times;</button>

                        <div class="mb-10">
                            <h3 id="planner-modal-title" class="text-2xl font-bold text-main tracking-tight">Assign Task</h3>
                            <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-3">Planning Registry</p>
                        </div>

                        <form id="planner-form" class="space-y-6">
                            <input type="hidden" name="id">
                            
                             <!-- Resource, Project & Status Row -->
                             <div class="grid grid-cols-3 gap-4">
                                 <div class="space-y-2">
                                     <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Member</label>
                                     <select name="resource_id" id="modal-resource" class="w-full bg-app border-none rounded-2xl py-3 px-3 text-center text-main font-bold cursor-pointer appearance-none text-[11px]">
                                         <!-- Populated dynamically -->
                                     </select>
                                 </div>
                                 <div class="space-y-2">
                                     <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Project</label>
                                     <select name="project_id" id="modal-project" required class="w-full bg-app border-none rounded-2xl py-3 px-3 text-center text-main font-bold cursor-pointer appearance-none text-[11px]">
                                         <!-- Populated dynamically -->
                                     </select>
                                 </div>
                                 <div class="space-y-2">
                                     <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Status</label>
                                     <select name="status" class="w-full bg-app border-none rounded-2xl py-3 px-3 text-center text-main font-bold cursor-pointer appearance-none text-[11px]">
                                         <option value="todo">Todo</option>
                                         <option value="in-progress">In-Progress</option>
                                         <option value="done">Done</option>
                                     </select>
                                 </div>
                             </div>

                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Description</label>
                                <input type="text" name="title" required placeholder="What needs to be done?" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold text-main">
                            </div>

                            <!-- Dates (Optional for Backlog) -->
                            <div class="space-y-4 border-t border-soft pt-4">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-black text-dim uppercase tracking-widest">Schedule</span>
                                    <label class="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="toggle-dates" class="sr-only peer">
                                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                        <span class="ml-2 text-[10px] font-bold text-dim">Active</span>
                                    </label>
                                </div>
                                
                                <div id="date-fields" class="hidden grid-cols-2 gap-4 transition-all">
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Start Date</label>
                                        <input type="date" name="start_date" class="w-full text-center py-3 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main">
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">End Date</label>
                                        <input type="date" name="end_date" class="w-full text-center py-3 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main">
                                    </div>
                                </div>
                            </div>

                            <!-- Manual Progress -->
                            <div class="space-y-2 pt-2">
                                <div class="flex justify-between items-center px-1">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest">Progress</label>
                                    <span id="progress-val" class="text-[10px] font-bold text-primary">0%</span>
                                </div>
                                <input type="range" name="progress" min="0" max="100" value="0" step="5" class="w-full h-2 bg-app rounded-lg appearance-none cursor-pointer accent-primary">
                            </div>

                            <div class="pt-6 grid grid-cols-4 gap-4">
                                <button type="button" id="delete-btn" class="hidden col-span-1 h-14 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all">
                                    <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                                <button type="submit" id="commit-btn" class="col-span-4 h-14 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 py-5 leading-none">
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
        const deleteBtn = portal.querySelector('#delete-btn');
        const commitBtn = portal.querySelector('#commit-btn');

        closeBtn.onclick = () => this.close();

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
            } else {
                dateFields.classList.add('hidden');
                dateFields.classList.remove('grid');
                // Clear values
                form.start_date.value = '';
                form.end_date.value = '';
            }
        };

        // Progress Slider
        progressInput.oninput = (e) => {
            progressVal.innerText = `${e.target.value}%`;
        };

        // Form Submit
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());

            // Handle Dates based on toggle
            if (!dateToggle.checked) {
                data.start_date = null;
                data.end_date = null;
            } else {
                // Ensure full ISO timestamp if needed, but YYYY-MM-DD matches PHP default
                if (data.start_date && data.start_date.length === 10) data.start_date += 'T09:00:00';
                if (data.end_date && data.end_date.length === 10) data.end_date += 'T17:00:00';
            }

            // Ensure numeric progress
            data.progress = parseInt(data.progress) || 0;

            try {
                await api.post('planner.php', data);
                this.onSave(); // Callback
                this.close();
            } catch (err) {
                alert('Failed to save task');
            }
        };
    },

    open(task = null, defaults = {}) {
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

            // Progress
            const prog = task.progress || 0;
            progressInput.value = prog;
            progressVal.innerText = `${prog}%`;

            // Dates
            if (task.start_date) {
                dateToggle.checked = true;
                dateFields.classList.remove('hidden');
                dateFields.classList.add('grid');
                form.start_date.value = task.start_date.split('T')[0];
                form.end_date.value = (task.end_date || task.start_date).split('T')[0];
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

            // Default to Checked date if opened from timeline? Or unchecked for backlog?
            // Let's default to unchecked for "New Task", unless we pass a date
            if (defaults.date) {
                dateToggle.checked = true;
                dateFields.classList.remove('hidden');
                dateFields.classList.add('grid');
                form.start_date.value = defaults.date;
                form.end_date.value = defaults.date;
            } else {
                dateToggle.checked = false;
                dateFields.classList.add('hidden');
                dateFields.classList.remove('grid');
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
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
