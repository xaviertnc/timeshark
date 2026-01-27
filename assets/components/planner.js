import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderPlanner() {
    const state = store.get();
    const tasks = state.tasks || []; // These are allocations
    const projects = state.projects || [];

    // Determine unique resources + 'Me'
    const resourceSet = new Set(['Me']);
    tasks.forEach(t => { if (t.resource_id) resourceSet.add(t.resource_id); });
    const resources = Array.from(resourceSet);

    // Timeline Settings: Show next 14 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysToShow = 14;
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
    }

    const container = document.createElement('div');
    container.className = "space-y-6 h-full flex flex-col";

    container.innerHTML = `
        <div class="flex items-center justify-between">
            <h2 class="text-3xl font-bold text-slate-800">Resource Planner</h2>
            <button id="add-allocation-btn" class="bg-accent hover:bg-orange-500 text-white px-4 py-2 rounded-lg shadow transition-all font-bold">
                + Allocate Time
            </button>
        </div>

        <div class="flex-1 overflow-auto bg-white rounded-xl shadow border border-slate-200 relative">
            <div class="min-w-max">
                <!-- Header Row -->
                <div class="flex border-b border-slate-200">
                    <div class="w-40 p-4 font-bold text-slate-600 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">Resource</div>
                    ${dates.map(d => `
                        <div class="w-32 p-3 text-center border-r border-slate-100 last:border-0 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-50' : ''}">
                            <div class="text-xs text-slate-400 uppercase font-bold">${d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div class="text-lg font-bold text-slate-700">${d.getDate()}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Resource Rows -->
                ${resources.map(resource => `
                    <div class="flex border-b border-slate-100">
                        <div class="w-40 p-4 font-medium text-slate-700 bg-slate-50 sticky left-0 z-10 border-r border-slate-200 flex items-center">
                            <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mr-3 font-bold text-xs">
                                ${resource.substring(0, 2).toUpperCase()}
                            </div>
                            ${resource}
                        </div>
                        
                        <!-- Cells -->
                        ${dates.map(d => {
        // Find tasks active on this day for this resource
        const activeTasks = tasks.filter(t =>
            t.resource_id === resource &&
            isWithinDate(t.start_date, t.end_date, d)
        );

        return `
                                <div class="w-32 p-2 border-r border-slate-100 relative ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-50' : ''}">
                                    ${activeTasks.map(t => {
            const proj = projects.find(p => p.id == t.project_id) || { color: '#ccc', name: 'Unknown' };
            return `
                                            <div class="mb-1 text-xs rounded px-2 py-1 text-white shadow-sm truncate cursor-pointer hover:opacity-80 transition-opacity relative group" 
                                                style="background-color: ${proj.color}" 
                                                title="${t.title} (${proj.name})"> 
                                                ${t.title}
                                                <button class="delete-task-btn absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px]" data-id="${t.id}">&times;</button>
                                            </div>
                                        `;
        }).join('')}
                                </div>
                            `;
    }).join('')}
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Add Allocation Modal -->
        <div id="planner-modal" class="fixed inset-0 bg-slate-900/50 hidden items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800">Allocate Time</h3>
                    <button id="close-planner-modal" class="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <form id="planner-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Resource Name</label>
                        <input type="text" name="resource_id" value="Me" required 
                            class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary outline-none">
                    </div>
                     <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Project</label>
                        <select name="project_id" required class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary outline-none bg-white">
                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Task Title</label>
                        <input type="text" name="title" placeholder="What to do?" required 
                            class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                            <input type="date" name="start_date" required 
                                class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                            <input type="date" name="end_date" required 
                                class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary outline-none">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-accent hover:bg-orange-600 text-white font-bold py-3 rounded-xl mt-4">
                        Save Allocation
                    </button>
                </form>
            </div>
        </div>
    `;

    // Helpers
    function isWithinDate(start, end, checkDate) {
        const s = new Date(start); s.setHours(0, 0, 0, 0);
        const e = new Date(end); e.setHours(0, 0, 0, 0);
        const c = new Date(checkDate); c.setHours(0, 0, 0, 0);
        return c >= s && c <= e;
    }

    // Interactions
    const modal = container.querySelector('#planner-modal');
    const form = container.querySelector('#planner-form');

    container.querySelector('#add-allocation-btn').onclick = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };
    container.querySelector('#close-planner-modal').onclick = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };
    modal.onclick = (e) => { if (e.target === modal) modal.click(); }; // Close on bg click? no logic implemented, reusing previous logic is better

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('planner.php', data);
            store.update('tasks', await api.get('planner.php')); // Refresh tasks

            // Re-Render (Simulated)
            const app = document.getElementById('app');
            app.innerHTML = '';
            app.appendChild(await renderPlanner());
        } catch (err) {
            alert(err.message);
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-task-btn')) {
            const id = e.target.closest('.delete-task-btn').dataset.id;
            if (confirm('Delete allocation?')) {
                await api.delete(`planner.php?id=${id}`);
                store.update('tasks', await api.get('planner.php'));
                const app = document.getElementById('app');
                app.innerHTML = '';
                app.appendChild(await renderPlanner());
            }
        }
    });

    return container;
}
