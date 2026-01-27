import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderPlanner() {
    const state = store.get();
    const tasks = state.tasks || [];
    const projects = state.projects || [];
    const team = state.team || [];

    const resources = team.length > 0 ? team.map(m => m.name) : ['Me'];

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
    container.className = "max-w-7xl mx-auto animate-slide-up pb-20";

    const isWithinDate = (startStr, endStr, targetDate) => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return targetDate >= start && targetDate <= end;
    };

    container.innerHTML = `
        <div class="flex items-end justify-between mb-20 px-4">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Timeline</h2>
                 <h1 class="text-4xl font-light text-slate-800 tracking-tight">Resource <span class="font-bold italic text-primary">Map.</span></h1>
            </div>
            <button id="add-task-btn" class="bg-slate-900 hover:bg-primary text-white px-10 py-5 rounded-2xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px] active:scale-95">
                New Allocation
            </button>
        </div>

        <div class="bg-white rounded-[3rem] border border-slate-100/60 shadow-sm overflow-hidden">
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-slate-50/50 border-b border-slate-100">
                            <th class="p-8 text-left text-[10px] font-black text-slate-300 uppercase tracking-widest min-w-[220px] sticky left-0 bg-white/90 backdrop-blur-md z-20 border-r border-slate-100">Human</th>
                            ${dates.map(date => `
                                <th class="p-8 text-center border-r border-slate-100/50 last:border-r-0 min-w-[120px]">
                                    <div class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 opacity-50">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                    <div class="text-xl font-light text-slate-600">${date.getDate()}</div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${resources.map(resource => `
                            <tr class="border-b border-slate-100/40 last:border-b-0 group hover:bg-slate-50/50 transition-colors">
                                <td class="p-8 font-bold text-slate-700 bg-white/90 backdrop-blur-md sticky left-0 z-10 border-r border-slate-100 group-hover:bg-slate-50 transition-all">
                                    <div class="flex items-center gap-4">
                                         <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-300">
                                            ${resource.substring(0, 2).toUpperCase()}
                                         </div>
                                         <span class="tracking-tight text-slate-800">${resource}</span>
                                    </div>
                                </td>
                                ${dates.map(date => {
        const activeTasks = tasks.filter(t => t.resource_id === resource && isWithinDate(t.start_date, t.end_date, date));
        return `
                                        <td class="p-4 border-r border-slate-100 last:border-r-0 align-top">
                                            <div class="min-h-[120px] space-y-3">
                                                ${activeTasks.map(t => {
            const proj = projects.find(p => p.id == t.project_id) || { color: '#ccc', name: 'Unknown' };
            return `
                                                        <div class="text-[10px] rounded-2xl px-4 py-4 text-white shadow-sm truncate cursor-pointer hover:opacity-90 transition-all relative group/item" 
                                                             style="background-color: ${proj.color}" 
                                                             title="${t.title} (${proj.name})"> 
                                                             <div class="font-bold leading-tight mb-1">${t.title}</div>
                                                             <div class="opacity-60 font-black uppercase tracking-tighter">${proj.name}</div>
                                                             <button class="delete-task-btn absolute -top-1 -right-1 bg-white text-red-500 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover/item:opacity-100 shadow-md border border-slate-50 transition-all hover:scale-110" data-id="${t.id}">
                                                                 <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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
        <div id="planner-modal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 backdrop-blur-xl">
            <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-14 transform transition-all scale-95 opacity-0" id="planner-modal-content">
                <div class="flex justify-between items-center mb-12">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight">New Allocation</h3>
                    <button id="close-planner-modal" class="text-slate-300 hover:text-slate-900 text-3xl transition-colors">&times;</button>
                </div>
                <form id="planner-form" class="space-y-10">
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Assign To</label>
                        <select name="resource_id" required class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all bg-white cursor-pointer appearance-none">
                            ${resources.map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </div>

                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Mission / Project</label>
                        <select name="project_id" required class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all bg-white cursor-pointer appearance-none">
                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Target Action</label>
                        <input type="text" name="title" required placeholder="Designing Core UI..." 
                            class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Start</label>
                            <input type="date" name="start_date" required class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                        </div>
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">End</label>
                            <input type="date" name="end_date" required class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                        </div>
                    </div>

                    <div class="pt-6">
                        <button type="submit" class="w-full h-24 bg-slate-900 hover:bg-primary text-white font-black text-xs uppercase tracking-[0.4em] rounded-[2.5rem] shadow-sm transition-all active:scale-95">
                            Finalize Map
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
        }, 300);
    };

    container.querySelector('#add-task-btn').onclick = openModal;
    container.querySelector('#close-planner-modal').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('planner.php', data);
            store.update('tasks', await api.get('planner.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Error Mapping');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-task-btn')) {
            const id = e.target.closest('.delete-task-btn').dataset.id;
            if (confirm('Delete allocation?')) {
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
