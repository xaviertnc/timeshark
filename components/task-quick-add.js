/**
 * components/task-quick-add.js
 * 
 * Reusable component for quick-adding tasks with project selection.
 */

import { api } from '../utils/api.js';
import { store } from '../utils/store.js';
import { SearchableSelect } from './searchable-select.js';

export const TaskQuickAdd = {
    /**
     * Renders the quick-add input into a container.
     * @param {HTMLElement} container DOM element to render into
     * @param {Array} projects List of projects for the selector
     * @param {Object} options { onAdd: callback, placeholder: string }
     */
    render(container, projects, options = {}) {
        if (!container) return;
        const placeholder = options.placeholder || 'Add a task...';

        container.innerHTML = `
            <div class="flex items-center gap-2 w-full">
                <!-- Input Area: Flex-1 forces it to take all remaining space -->
                <div class="flex-1 min-w-[100px] relative">
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none select-none">
                        <span class="text-dim/30 text-base font-black">+</span>
                    </div>
                    <input type="text" id="quick-add-input" placeholder="${placeholder}"
                           class="w-full zen-input bg-highlight border border-soft pl-7 pr-4 text-main outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-dim/20 placeholder:font-normal">
                </div>

                <!-- Tag Input -->
                <div class="shrink-0 w-[140px] max-w-[220px]">
                    <div class="relative w-full overflow-hidden bg-highlight border border-soft rounded-lg zen-focus-within transition-all flex items-center h-[42px] px-3 shadow-sm">
                        <span class="text-dim/50 font-black text-[10px] uppercase tracking-widest mr-2 select-none shrink-0 opacity-40">#</span>
                        <input type="text" id="quick-add-tags" placeholder="Tags..." autocomplete="off"
                               class="bg-transparent border-none outline-none text-main font-bold text-[11px] tracking-widest w-full h-full placeholder:text-dim/40 placeholder:font-bold transition-all" style="border:none !important; outline:none !important; box-shadow:none !important; padding:0; background:transparent !important;">
                    </div>
                </div>

                <!-- Project Selector: Fixed max-width, shrinks if needed but preserves min-width -->
                <div id="quick-add-project-container" class="shrink-0 w-full min-w-[120px] max-w-[240px]"></div>

                <!-- Submit Button -->
                <button id="quick-add-submit" class="shrink-0 zen-btn px-4 bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 text-primary transition-all flex items-center justify-center group focus:ring-2 focus:ring-primary/40 outline-none" title="Add Task">
                    <svg class="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                </button>
            </div>
        `;

        const input = container.querySelector('#quick-add-input');
        const tagInput = container.querySelector('#quick-add-tags');
        const projectContainer = container.querySelector('#quick-add-project-container');
        const submitBtn = container.querySelector('#quick-add-submit');

        let selectedProjectId = '';

        // Recently used projects
        const state = store.get();
        const entries = state.timeEntries || [];
        const recentIds = [...new Set(entries
            .filter(e => e.project_id)
            .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0))
            .map(e => String(e.project_id))
        )].slice(0, 5);

        SearchableSelect.render(projectContainer, projects, {
            value: selectedProjectId,
            placeholder: 'Unassigned',
            recentIds,
            allLabel: 'All Projects',
            onChange: (id) => {
                selectedProjectId = id;
                submitBtn.focus();
            }
        });

        const handleSubmit = async () => {
            const title = input.value.trim();
            if (!title) {
                input.focus();
                return;
            }

            const project = projects.find(p => String(p.id) === String(selectedProjectId));
            const tags = tagInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

            try {
                const data = {
                    title,
                    project_id: selectedProjectId,
                    project_name: project?.name || 'Unassigned',
                    tags,
                    status: 'todo',
                    priority: 'low',
                    progress: 0
                };

                await api.post('planner.php?action=add_task', data);
                input.value = '';
                tagInput.value = '';
                if (options.onAdd) options.onAdd();
                input.focus();
            } catch (err) {
                console.error('Quick Add failed:', err);
            }
        };

        submitBtn.onclick = handleSubmit;

        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };

        tagInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };
    }
};

