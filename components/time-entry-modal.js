import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { SearchableSelect } from './searchable-select.js';
import { escapeHTML } from '../utils/dom.js';

/**
 * components/time-entry-modal.js
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
            <div class="time-entry-modal-overlay fixed inset-0 bg-secondary/40 backdrop-blur-md flex items-center justify-center p-4 z-[120] pointer-events-auto">
                <div id="modal-content" class="bg-card zen-card shadow-soft w-full max-w-lg p-8 md:p-10 transform scale-95 opacity-0 transition-all duration-300 relative pointer-events-auto text-main">
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
                            <input type="text" name="description" value="${escapeHTML(entry.description || '')}" placeholder="What are you working on?" class="w-full zen-input bg-highlight border border-subtle focus:ring-2 focus:ring-primary/20 text-main outline-none transition-all">
                        </div>

                        <!-- Project + Linked Todo -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2 text-left">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Project</label>
                                <div id="modal-project-select-container"></div>
                                <input type="hidden" name="project_id" value="${entry.project_id || ''}">
                            </div>
                            <div class="space-y-2 text-left">
                                <div class="flex items-center justify-between ml-1 mb-0.5">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block leading-none">Linked Todo</label>
                                    <button type="button" id="modal-auto-create-task-btn" class="text-[9px] font-black text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded tracking-widest transform transition-transform active:scale-95 flex items-center gap-1 leading-none" title="Auto-create a linked task from this description">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                                        NEW
                                    </button>
                                </div>
                                <div id="modal-task-select-container"></div>
                                <input type="hidden" name="task_id" value="${entry.task_id || ''}">
                            </div>
                        </div>

                        <!-- Start/End + Notes -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Started At</label>
                                <input type="datetime-local" name="start_time" value="${formatDateForInput(entry.start_time)}" class="w-full zen-input bg-highlight border border-subtle text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                            </div>
                            ${!isLive ? `
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Ended At</label>
                                <input type="datetime-local" name="end_time" value="${formatDateForInput(entry.end_time)}" class="w-full zen-input bg-highlight border border-subtle text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                            </div>
                            ` : `
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Notes</label>
                            <input type="text" name="notes" value="${escapeHTML(entry.notes || '')}" placeholder="Optional details..." class="w-full zen-input bg-highlight border border-subtle text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                            </div>
                            `}
                        </div>

                        ${!isLive ? `
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Notes</label>
                            <input type="text" name="notes" value="${escapeHTML(entry.notes || '')}" placeholder="Optional details..." class="w-full zen-input bg-highlight border border-subtle text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                        </div>
                        ` : ''}

                        <!-- Row: Tags -->
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Tags</label>
                            <div class="bg-highlight border border-subtle rounded-xl p-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all flex flex-wrap gap-2 items-center min-h-[50px] shadow-sm" id="modal-tags-container">
                                <input type="text" id="modal-tag-input" placeholder="Type tag and press Enter..." class="bg-transparent border-none outline-none text-main font-bold text-sm flex-1 min-w-[150px] placeholder:opacity-30 placeholder:font-normal" style="border: none !important; box-shadow: none !important; background: transparent !important; outline: none !important; padding: 0;">
                            </div>
                            <input type="hidden" name="tags" id="hidden-tags-input" value="${entry && entry.tags ? escapeHTML(entry.tags.join(',')) : ''}">
                            <div class="mt-2 ml-1 flex flex-wrap gap-1.5" id="suggested-tags-container"></div>
                        </div>

                        <!-- Actions -->
                        <div class="flex gap-4 pt-4 border-t border-subtle">
                            <button type="button" id="cancel-modal" class="flex-1 zen-btn text-[10px] font-black uppercase text-dim tracking-widest hover:text-main hover:bg-highlight transition-all">Cancel</button>
                            <button type="submit" class="flex-[2] zen-btn bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">Save Changes</button>
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

        const autoCreateBtn = overlay.querySelector('#modal-auto-create-task-btn');
        if (autoCreateBtn) {
            autoCreateBtn.onclick = async (e) => {
                e.preventDefault();
                const descInput = overlay.querySelector('input[name="description"]');
                if (!descInput.value.trim()) {
                    alert('Please enter a description first so we can name the Task.');
                    return;
                }
                const taskData = {
                    title: descInput.value.trim(),
                    project_id: projectInput.value || null,
                    resource_id: 'me',
                    tags: overlay.querySelector('#hidden-tags-input').value.split(',').filter(Boolean) || [],
                    notes: '',
                    status: 'todo',
                    priority: 'medium',
                    progress: 0,
                    start_date: null,
                    end_date: null,
                    completed_at: null
                };
                
                try {
                    const originalText = autoCreateBtn.innerHTML;
                    autoCreateBtn.innerHTML = '<span class="animate-pulse">...</span>';
                    
                    const newTask = await api.post('planner.php', taskData);
                    const tasks = store.get().tasks || [];
                    store.update('tasks', [...tasks, newTask]);
                    
                    // Automatically select it in the dropdown
                    taskInput.value = newTask.id;
                    renderTaskSelect(projectInput.value);
                    
                    autoCreateBtn.innerHTML = `✓ CREATED`;
                    setTimeout(() => autoCreateBtn.style.opacity = '0', 2000);
                } catch (err) {
                    console.error(err);
                    alert('Failed to auto-create task.');
                    autoCreateBtn.innerHTML = 'ERROR';
                }
            };
        }

        const recentProjectIds = [...new Set(entries
            .filter(e => e.project_id)
            .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0))
            .map(e => String(e.project_id))
        )].slice(0, 5);

        // --- Tag Logic Initialization ---
        const tagsContainer = overlay.querySelector('#modal-tags-container');
        const tagInput = overlay.querySelector('#modal-tag-input');
        const hiddenTagsInput = overlay.querySelector('#hidden-tags-input');
        const suggestedContainer = overlay.querySelector('#suggested-tags-container');
        
        let currentTags = entry && entry.tags ? [...entry.tags].map(t => t.toLowerCase()) : [];
        const existingTagsRaw = [...(state.projects || []).flatMap(p => p.tags || []), ...(state.tasks || []).flatMap(t => t.tags || []), ...(state.timeEntries || []).flatMap(en => en.tags || [])];
        let uniqueGlobalTags = [...new Set(existingTagsRaw.map(t => t.toLowerCase()))];

        const renderTaskSelect = (pid) => {
            const tasks = (store.get().tasks || []).filter(t => {
                // If project is set, task must match it. If not set, show all projects' tasks.
                if (pid && String(t.project_id) !== String(pid)) return false;
                return true;
            }).sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));

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

        // Ensure tags render uses updated TaskSelect
        
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
            
            renderTaskSelect(projectInput.value);
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

        overlay.querySelector('#edit-time-entry-form').onsubmit = async (e) => {
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

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            data.tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

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

