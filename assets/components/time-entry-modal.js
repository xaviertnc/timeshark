import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { SearchableSelect } from './searchable-select.js';

/**
 * assets/components/time-entry-modal.js
 * 
 * Centralized Time Entry Editor
 */
export class TimeEntryModal {
    static open(entry, options = {}) {
        const { onSave = () => { }, onCancel = () => { } } = options;
        const state = store.get();
        const projects = state.projects || [];
        const entries = state.timeEntries || [];
        const modalPortal = document.getElementById('modal-portal');
        if (!modalPortal) return;

        const isLive = !entry.end_time;
        const currentPid = entry.project_id ? String(entry.project_id) : '';

        const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            const z = (n) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
        };

        const closeModal = () => {
            const overlay = modalPortal.querySelector('.time-entry-modal-overlay');
            if (!overlay) return;
            const content = overlay.querySelector('#modal-content');
            if (content) content.classList.remove('scale-100', 'opacity-100');
            setTimeout(() => { overlay.remove(); }, 300);
            onCancel();
        };

        const modalHtml = `
            <div class="time-entry-modal-overlay fixed inset-0 bg-secondary/40 backdrop-blur-md flex items-center justify-center p-4 z-[100] pointer-events-auto">
                <div id="modal-content" class="bg-card rounded-2xl shadow-soft w-full max-w-lg p-8 md:p-10 transform scale-95 opacity-0 transition-all duration-300 relative pointer-events-auto text-main">
                    <button id="close-modal-x" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5 z-10" title="Close">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <div class="text-center mb-8">
                        <h3 class="text-2xl font-bold tracking-tight">${isLive ? 'Edit Current Task' : 'Edit History Entry'}</h3>
                        <p class="text-[9px] font-black text-dim uppercase tracking-[0.3em] mt-2">${isLive ? 'Live Update' : 'Log Adjustment'}</p>
                    </div>
                    <form id="edit-time-entry-form" class="space-y-6">
                        <input type="hidden" name="id" value="${entry.id}">
                        
                        <!-- Description -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Description</label>
                            <input type="text" name="description" value="${entry.description || ''}" placeholder="What are you working on?" class="w-full py-3 px-4 bg-app border border-white/5 rounded-xl focus:ring-2 focus:ring-primary/20 font-bold text-main text-sm outline-none transition-all">
                        </div>

                        <!-- Project + Linked Todo -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2 text-left">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Project</label>
                                <div id="modal-project-select-container"></div>
                                <input type="hidden" name="project_id" value="${entry.project_id || ''}">
                            </div>
                            <div class="space-y-2 text-left">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Linked Todo</label>
                                <div id="modal-task-select-container"></div>
                                <input type="hidden" name="task_id" value="${entry.task_id || ''}">
                            </div>
                        </div>

                        <!-- Start/End + Notes -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Started At</label>
                                <input type="datetime-local" name="start_time" value="${formatDateForInput(entry.start_time)}" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 font-bold text-main text-[11px] outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                            </div>
                            ${!isLive ? `
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Ended At</label>
                                <input type="datetime-local" name="end_time" value="${formatDateForInput(entry.end_time)}" class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 font-bold text-main text-[11px] outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                            </div>
                            ` : `
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Notes</label>
                                <input type="text" name="notes" value="${entry.notes || ''}" placeholder="Optional details..." class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 font-bold text-main text-[11px] outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                            </div>
                            `}
                        </div>

                        ${!isLive ? `
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Notes</label>
                            <input type="text" name="notes" value="${entry.notes || ''}" placeholder="Optional details..." class="w-full bg-app border border-white/5 rounded-xl py-2.5 px-3 font-bold text-main text-[11px] outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                        </div>
                        ` : ''}

                        <!-- Actions -->
                        <div class="flex gap-4 pt-4 border-t border-white/5">
                            <button type="button" id="cancel-modal" class="flex-1 py-3.5 text-[10px] font-black uppercase text-dim tracking-widest hover:text-main rounded-xl hover:bg-white/5 transition-all">Cancel</button>
                            <button type="submit" class="flex-[2] py-3.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        modalPortal.insertAdjacentHTML('beforeend', modalHtml);
        const overlay = modalPortal.querySelector('.time-entry-modal-overlay:last-child');

        setTimeout(() => {
            const content = overlay.querySelector('#modal-content');
            if (content) content.classList.add('scale-100', 'opacity-100');
        }, 10);

        overlay.querySelector('#close-modal-x').onclick = closeModal;
        overlay.querySelector('#cancel-modal').onclick = closeModal;
        const projectContainer = overlay.querySelector('#modal-project-select-container');
        const taskContainer = overlay.querySelector('#modal-task-select-container');
        const projectInput = overlay.querySelector('input[name="project_id"]');
        const taskInput = overlay.querySelector('input[name="task_id"]');

        const recentProjectIds = [...new Set(entries
            .filter(e => e.project_id)
            .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0))
            .map(e => String(e.project_id))
        )].slice(0, 5);

        const renderTaskSelect = (pid) => {
            const tasks = (state.tasks || []).filter(t => String(t.project_id) === String(pid))
                .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));

            SearchableSelect.render(taskContainer, tasks, {
                value: taskInput.value,
                placeholder: 'No Linked Todo',
                allLabel: 'Available Tasks',
                nameField: 'title',
                onChange: (tid) => { taskInput.value = tid; }
            });
        };

        SearchableSelect.render(projectContainer, projects, {
            value: projectInput.value,
            placeholder: 'Unassigned',
            recentIds: recentProjectIds,
            allLabel: 'All Projects',
            onChange: (pid) => {
                projectInput.value = pid;
                taskInput.value = '';
                renderTaskSelect(pid);
            }
        });

        renderTaskSelect(projectInput.value);

        overlay.querySelector('#edit-time-entry-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            data.id = entry.id;
            data.task_id = data.task_id || null;
            data.project_name = projects.find(p => String(p.id) === String(data.project_id))?.name || 'Unassigned';
            data.resource_id = entry.resource_id || state.team?.[0]?.name || 'Main';
            data.start_time = new Date(data.start_time).toISOString();

            if (!isLive) {
                data.end_time = new Date(data.end_time).toISOString();
            } else {
                data.end_time = null;
            }

            try {
                const result = await api.post('time-entries.php', data);
                if (isLive) {
                    store.update('activeTimer', result);
                }
                store.update('timeEntries', await api.get('time-entries.php'));
                closeModal();
                onSave(result);
            } catch (err) {
                console.error('Update failed:', err);
                alert('Update failed');
            }
        };
    }
}
