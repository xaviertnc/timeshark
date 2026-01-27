import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderPlanner() {
    const state = store.get();
    const tasks = state.tasks || [];
    const projects = state.projects || [];
    const team = state.team || [];

    const resources = team.length > 0 ? team.map(m => m.name) : ['Main'];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = [];
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
    }

    const isWithinDate = (start, end, target) => {
        const s = new Date(start);
        const e = new Date(end);
        s.setHours(0, 0, 0, 0);
        e.setHours(0, 0, 0, 0);
        return target >= s && target <= e;
    };

    const container = document.createElement('div');
    container.className = "max-w-7xl mx-auto animate-slide-up pb-16";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-16 px-4">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3">Timeline</h2>
                 <h1 class="text-3xl font-light text-slate-800 tracking-tight">Mission <span class="font-bold italic text-primary">Flow.</span></h1>
            </div>
            <button id="add-task-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
                Create Assignment
            </button>
        </div>

        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-slate-50/30 border-b border-slate-100">
                            <th class="p-6 text-left text-[10px] font-black text-slate-300 uppercase tracking-widest min-w-[200px] sticky left-0 bg-white/95 backdrop-blur-sm z-20 border-r border-slate-100">Team</th>
                            ${dates.map(date => `
                                <th class="p-4 text-center border-r border-slate-100/50 last:border-r-0 min-w-[100px]">
                                    <div class="text-[9px] font-black text-slate-300 uppercase mb-1">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                    <div class="text-lg font-light text-slate-600">${date.getDate()}</div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${resources.map(resource => `
                            <tr class="border-b border-slate-50 last:border-b-0 group hover:bg-slate-50/30 transition-colors">
                                <td class="p-6 font-bold text-slate-700 bg-white/95 backdrop-blur-sm sticky left-0 z-10 border-r border-slate-100">
                                    <div class="flex items-center gap-3">
                                         <div class="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[9px] font-black text-slate-300">
                                            ${resource.substring(0, 2).toUpperCase()}
                                         </div>
                                         <span class="text-sm tracking-tight text-slate-800">${resource}</span>
                                    </div>
                                </td>
                                ${dates.map(date => {
        const activeTasks = tasks.filter(t => t.resource_id === resource && isWithinDate(t.start_date, t.end_date, date));
        return `
                                        <td class="p-2 border-r border-slate-50 last:border-r-0 align-top">
                                            <div class="min-h-[100px] space-y-2">
                                                ${activeTasks.map(t => {
            const proj = projects.find(p => p.id == t.project_id) || { color: '#eceff1', name: '?' };
            return `
                                                        <div class="text-[9px] rounded-xl px-3 py-3 text-white shadow-sm truncate cursor-pointer hover:opacity-90 transition-all relative group/item" 
                                                             style="background-color: ${proj.color}"> 
                                                             <div class="font-bold mb-0.5">${t.title}</div>
                                                             <div class="opacity-70 font-black uppercase tracking-tighter">${proj.name}</div>
                                                             <button class="delete-task-btn absolute -top-1 -right-1 bg-white text-red-400 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 shadow-sm transition-all" data-id="${t.id}">
                                                                 <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                             </button>
                                                         </div>
                                                    `;
        }).join('')}
                                            </div>
                                        </td>
                                    `;
    }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add Allocation Modal -->
        <div id="planner-modal" class="fixed inset-0 bg-secondary/20 hidden items-center justify-center z-50 backdrop-blur-md">
            <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0" id="planner-modal-content">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-2xl font-bold text-slate-800 tracking-tight">New Allocation</h3>
                    <button id="close-planner-modal" class="text-slate-300 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <form id="planner-form" class="space-y-6">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Team Member</label>
                        <select name="resource_id" required class="w-full bg-white appearance-none cursor-pointer">
                            ${resources.map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </div>

                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Mission</label>
                        <select name="project_id" required class="w-full bg-white appearance-none cursor-pointer">
                            <option value="">Choose Mission...</option>
                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Title</label>
                        <input type="text" name="title" required placeholder="Project Tasks..." class="w-full">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">From</label>
                            <input type="date" name="start_date" required class="w-full">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">To</label>
                            <input type="date" name="end_date" required class="w-full">
                        </div>
                    </div>

                    <div class="pt-4">
                        <button type="submit" class="w-full h-16 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all">
                            Save Allocation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modal = container.querySelector('#planner-modal');
    const modalContent = container.querySelector('#planner-modal-content');
    const form = container.querySelector('#planner-form');

    const openModal = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    };

    const closeModal = () => {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            form.reset();
        }, 200);
    };

    container.querySelector('#add-task-btn').onclick = openModal;
    container.querySelector('#close-planner-modal').onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('planner.php', data);
            store.update('tasks', await api.get('planner.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Save failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-task-btn')) {
            const id = e.target.closest('.delete-task-btn').dataset.id;
            if (confirm('Delete?')) {
                await api.delete(`planner.php?id=${id}`);
                store.update('tasks', await api.get('planner.php'));
                refreshView();
            }
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderPlanner());
    }

    return container;
}
