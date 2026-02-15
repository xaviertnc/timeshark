/**
 * assets/components/task-quick-add.js
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
                           class="w-full bg-white/[0.03] border border-white/10 rounded-md pl-10 pr-4 py-2.5 text-base font-bold text-main outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-dim/15 placeholder:font-normal">
                </div>

                <!-- Project Selector: Fixed max-width, shrinks if needed but preserves min-width -->
                <div id="quick-add-project-container" class="shrink-0 w-full min-w-[120px] max-w-[240px]"></div>
            </div>
        `;

        const input = container.querySelector('#quick-add-input');
        const projectContainer = container.querySelector('#quick-add-project-container');

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
            variant: 'minimal',
            onChange: (id) => { selectedProjectId = id; }
        });

        const handleSubmit = async () => {
            const title = input.value.trim();
            if (!title) return;

            const project = projects.find(p => String(p.id) === String(selectedProjectId));

            try {
                const data = {
                    title,
                    project_id: selectedProjectId,
                    project_name: project?.name || 'Unassigned',
                    status: 'todo',
                    priority: 'medium',
                    progress: 0
                };

                await api.post('planner.php?action=add_task', data);
                input.value = '';
                if (options.onAdd) options.onAdd();
            } catch (err) {
                console.error('Quick Add failed:', err);
            }
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };
    }
};
