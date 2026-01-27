import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

let currentScale = 'week';
let projectFilter = 'all';
let timeOffset = 0;

// Helper to determine if text should be dark or light based on background hex
function getContrastColor(hex) {
    if (!hex || hex === 'transparent') return 'text-slate-800';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? 'text-slate-900' : 'text-white';
}

export async function renderPlanner() {
    try {
        const freshTasks = await api.get('planner.php');
        store.update('tasks', freshTasks);
    } catch (err) {
        console.error("Planner failed to fetch tasks", err);
    }

    const state = store.get();
    const tasks = state.tasks || [];
    const projects = state.projects || [];
    const team = state.team || [];

    const resources = team.length > 0 ? team.map(m => m.name) : ['General'];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getTimelineConfig = (scale, offset) => {
        const dates = [];
        let groups = [];

        const baseDate = new Date(today);
        if (scale === 'day') baseDate.setDate(today.getDate() + offset);
        if (scale === 'week') baseDate.setDate(today.getDate() + (offset * 14));
        if (scale === 'month') baseDate.setDate(today.getDate() + (offset * 28));
        if (scale === 'year') baseDate.setFullYear(today.getFullYear() + offset);

        const getWeekNum = (d) => {
            const date = new Date(d.getTime());
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        };

        if (scale === 'day') {
            for (let i = 0; i < 24; i++) {
                const d = new Date(baseDate);
                d.setHours(i, 0, 0, 0);
                dates.push(d);
            }
            groups = [{ label: baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), count: 24 }];
            return {
                dates, groups,
                label: (d) => `${d.getHours()}h`,
                sublabel: () => 'Time',
                colWidth: 'min-w-[45px]',
                filter: (t, d) => {
                    const s = new Date(t.start_date);
                    return s.toDateString() === d.toDateString() && s.getHours() === d.getHours();
                }
            };
        } else if (scale === 'month') {
            const start = new Date(baseDate);
            start.setDate(baseDate.getDate() - baseDate.getDay());
            for (let i = 0; i < 28; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push(d);
            }
            for (let i = 0; i < 4; i++) {
                const weekStart = new Date(start);
                weekStart.setDate(start.getDate() + (i * 7));
                groups.push({ label: `WEEK ${getWeekNum(weekStart)}: ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`, count: 7 });
            }
            return {
                dates, groups,
                label: (d) => d.getDate(),
                sublabel: (d) => d.toLocaleDateString('en-US', { weekday: 'narrow' }),
                colWidth: 'min-w-[40px]',
                filter: (t, d) => {
                    const taskStart = new Date(t.start_date);
                    const taskEnd = new Date(t.end_date) || t.start_date;
                    const target = new Date(d);
                    target.setHours(0, 0, 0, 0);
                    const s = new Date(taskStart); s.setHours(0, 0, 0, 0);
                    const e = new Date(taskEnd); e.setHours(23, 59, 59, 999);
                    return target >= s && target <= e;
                }
            };
        } else if (scale === 'year') {
            const start = new Date(baseDate.getFullYear(), 0, 1);
            for (let i = 0; i < 12; i++) {
                const d = new Date(start.getFullYear(), i, 1);
                dates.push(d);
            }
            groups = [{ label: baseDate.getFullYear(), count: 12 }];
            return {
                dates, groups,
                label: (d) => d.toLocaleDateString('en-US', { month: 'short' }),
                sublabel: () => 'Month',
                colWidth: 'min-w-[100px]',
                filter: (t, d) => {
                    const taskStart = new Date(t.start_date);
                    const taskEnd = new Date(t.end_date) || t.start_date;
                    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    return new Date(taskStart) <= monthEnd && new Date(taskEnd) >= d;
                }
            };
        } else {
            const start = new Date(baseDate);
            start.setDate(baseDate.getDate() - baseDate.getDay());
            for (let i = 0; i < 14; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push(d);
            }

            const nextWeek = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

            groups = [
                { label: `WEEK ${getWeekNum(start)}: ${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`, count: 7 },
                { label: `WEEK ${getWeekNum(nextWeek)}: ${new Date(nextWeek).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`, count: 7 }
            ];

            return {
                dates, groups,
                label: (d) => d.getDate(),
                sublabel: (d) => d.toLocaleDateString('en-US', { weekday: 'short' }),
                colWidth: 'min-w-[80px]',
                filter: (t, d) => {
                    const taskStart = new Date(t.start_date);
                    const taskEnd = new Date(t.end_date) || t.start_date;
                    taskStart.setHours(0, 0, 0, 0);
                    const target = new Date(d);
                    target.setHours(0, 0, 0, 0);
                    const compareEnd = new Date(taskEnd);
                    compareEnd.setHours(23, 59, 59, 999);
                    return target >= taskStart && target <= compareEnd;
                }
            };
        }
    };

    const config = getTimelineConfig(currentScale, timeOffset);
    const filteredTasks = projectFilter === 'all' ? tasks : tasks.filter(t => t.project_id === projectFilter);

    const container = document.createElement('div');
    container.className = "max-w-[1600px] mx-auto animate-slide-up pb-16 px-4";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-8 px-2">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">Resource Flow</h2>
                 <h1 class="text-2xl font-light text-slate-800 tracking-tight">Active <span class="font-bold italic text-primary">Planner.</span></h1>
            </div>
            
            <div class="flex items-center gap-6">
                <div class="flex items-center bg-slate-100/50 p-1 rounded-xl gap-1">
                    <button id="prev-time" class="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-primary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button id="today-time" class="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">Today</button>
                    <button id="next-time" class="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-primary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>

                <div class="relative group">
                    <select id="project-filter" class="appearance-none bg-slate-50 border-none rounded-xl px-4 py-2.5 pr-9 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:text-primary transition-all cursor-pointer outline-none">
                        <option value="all">Global View</option>
                        ${projects.map(p => `<option value="${p.id}" ${projectFilter === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-200">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                <div class="bg-slate-100/50 p-1 rounded-xl flex items-center">
                    ${['day', 'week', 'month', 'year'].map(s => `
                        <button class="scale-toggle px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currentScale === s ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}" data-scale="${s}">
                            ${s}
                        </button>
                    `).join('')}
                </div>

                <button id="add-task-btn" class="bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center font-black uppercase tracking-[0.1em] text-[10px]">
                    Assign Task
                </button>
            </div>
        </div>

        <div class="bg-white rounded-[2rem] border border-slate-50 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.02)] overflow-hidden">
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-slate-50/10 border-b border-slate-100/20">
                            <th class="p-2 border-r border-slate-100/20 sticky left-0 bg-white z-40"></th>
                            ${config.groups.map(g => `
                                <th colspan="${g.count}" class="p-2 text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] text-center border-r border-slate-100/20 last:border-r-0">
                                    ${g.label}
                                </th>
                            `).join('')}
                        </tr>
                        <tr class="bg-slate-50/20 border-b border-slate-100/30">
                            <th class="p-4 py-3 text-left text-[9px] font-black text-slate-300 uppercase tracking-widest min-w-[180px] sticky left-0 bg-white/95 backdrop-blur-md z-30 border-r border-slate-100/30">Resource</th>
                            ${config.dates.map(date => `
                                <th class="p-3 text-center border-r border-slate-100/10 last:border-r-0 ${config.colWidth} ${date.toDateString() === today.toDateString() ? 'bg-primary/[0.03]' : ''}">
                                    <div class="text-[7px] font-black text-slate-200 uppercase mb-0.5 tracking-tighter">${config.sublabel(date)}</div>
                                    <div class="text-sm font-bold text-slate-500 tracking-tight leading-tight transition-colors ${date.toDateString() === today.toDateString() ? 'text-primary' : ''}">${config.label(date)}</div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${resources.map(resource => `
                            <tr class="border-b border-slate-50/50 last:border-b-0 hover:bg-slate-50/5 transition-colors">
                                <td class="p-4 py-2 bg-white/95 backdrop-blur-md sticky left-0 z-20 border-r border-slate-100/30">
                                    <div class="flex items-center gap-3">
                                         <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-200 border border-slate-100/50">
                                            ${resource.substring(0, 2).toUpperCase()}
                                         </div>
                                         <span class="text-[13px] font-bold tracking-tight text-slate-700">${resource}</span>
                                    </div>
                                </td>
                                ${config.dates.map(date => {
        const activeTasks = filteredTasks.filter(t => t.resource_id === resource && config.filter(t, date));
        return `
                                        <td class="p-1 border-r border-slate-50/10 last:border-r-0 align-top ${date.toDateString() === today.toDateString() ? 'bg-primary/[0.01]' : ''}">
                                            <div class="min-h-[75px] space-y-3 flex flex-col items-center justify-start py-2 px-1">
                                                ${activeTasks.map(t => {
            const proj = projects.find(p => p.id == t.project_id) || { color: '#eceff1', name: '?' };
            const textColorClass = getContrastColor(proj.color);
            return `
                                                        <div class="task-card group/item relative w-full" data-id="${t.id}">
                                                            <div class="text-[10px] rounded-xl px-3 py-3 shadow-md cursor-pointer hover:shadow-lg transition-all border border-black/5" 
                                                                 style="background-color: ${proj.color}"> 
                                                                 <div class="font-bold mb-1 line-clamp-2 leading-tight ${textColorClass}">${t.title}</div>
                                                                 <div class="opacity-60 font-black uppercase tracking-widset text-[8px] line-clamp-1 ${textColorClass}">${proj.name}</div>
                                                             </div>
                                                             <button class="delete-task-btn absolute -top-2 -right-2 bg-white text-red-500 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover/item:opacity-100 shadow-xl border border-slate-100 transition-all z-30 transform hover:scale-110 active:scale-90" data-id="${t.id}">
                                                                 <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
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
    `;

    // Modal portal setup
    const modalPortal = document.getElementById('modal-portal');
    modalPortal.innerHTML = `
        <div id="planner-modal" class="fixed inset-0 bg-secondary/20 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
            <div class="min-h-screen w-full flex items-center justify-center p-4">
                <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0 text-center relative" id="planner-modal-content">
                    <button id="close-planner-modal" class="absolute top-8 right-10 text-slate-300 hover:text-slate-600 text-2xl transition-colors">&times;</button>
                    
                    <div class="mb-10">
                        <h3 id="planner-modal-title" class="text-2xl font-bold text-slate-800 tracking-tight">Assign Task</h3>
                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-3">Planning Registry</p>
                    </div>

                    <form id="planner-form" class="space-y-6">
                        <input type="hidden" name="id">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block text-left ml-2">Team Member</label>
                            <select name="resource_id" required class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-center text-slate-600 font-bold cursor-pointer appearance-none">
                                ${resources.map(r => `<option value="${r}">${r}</option>`).join('')}
                            </select>
                        </div>

                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block text-left ml-2">Project</label>
                            <select name="project_id" required class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-center text-slate-600 font-bold cursor-pointer appearance-none">
                                <option value="">Select Target...</option>
                                ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                            </select>
                        </div>

                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block text-left ml-2">Description</label>
                            <input type="text" name="title" required placeholder="What are we achieving?" class="w-full text-center py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold text-slate-600">
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block text-left ml-2">Start</label>
                                <input type="date" name="start_date" required class="w-full text-center py-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-slate-600">
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block text-left ml-2">End</label>
                                <input type="date" name="end_date" required class="w-full text-center py-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-slate-600">
                            </div>
                        </div>

                        <div class="pt-6">
                            <button type="submit" id="commit-btn" class="w-full h-16 bg-primary hover:bg-primary-dark text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 py-5 leading-none">
                                Commit Assignment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = modalPortal.querySelector('#planner-modal');
    const modalContent = modalPortal.querySelector('#planner-modal-content');
    const form = modalPortal.querySelector('#planner-form');
    const modalTitle = modalPortal.querySelector('#planner-modal-title');
    const commitBtn = modalPortal.querySelector('#commit-btn');

    const openModal = (task = null) => {
        if (task) {
            modalTitle.innerText = 'Edit Assignment';
            commitBtn.innerText = 'Update Assignment';
            form.id.value = task.id;
            form.resource_id.value = task.resource_id;
            form.project_id.value = task.project_id;
            form.title.value = task.title;
            form.start_date.value = task.start_date;
            form.end_date.value = task.end_date;
        } else {
            modalTitle.innerText = 'Assign Task';
            commitBtn.innerText = 'Commit Assignment';
            form.reset();
            form.id.value = '';
        }

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

    container.querySelector('#add-task-btn').onclick = () => openModal();
    modalPortal.querySelector('#close-planner-modal').onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('planner.php', data);
            const updated = await api.get('planner.php');
            store.update('tasks', updated);
            closeModal();
            refreshView();
        } catch (err) {
            alert('Save failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('#prev-time')) {
            timeOffset--;
            refreshView();
            return;
        }
        if (e.target.closest('#next-time')) {
            timeOffset++;
            refreshView();
            return;
        }
        if (e.target.closest('#today-time')) {
            timeOffset = 0;
            refreshView();
            return;
        }

        const taskCard = e.target.closest('.task-card');
        if (taskCard && !e.target.closest('.delete-task-btn')) {
            const id = taskCard.dataset.id;
            const task = tasks.find(t => t.id == id);
            if (task) openModal(task);
            return;
        }

        const toggle = e.target.closest('.scale-toggle');
        if (toggle) {
            currentScale = toggle.dataset.scale;
            timeOffset = 0;
            refreshView();
            return;
        }

        if (e.target.closest('.delete-task-btn')) {
            const id = e.target.closest('.delete-task-btn').dataset.id;
            if (confirm('Erase assignment?')) {
                await api.delete(`planner.php?id=${id}`);
                const updated = await api.get('planner.php');
                store.update('tasks', updated);
                refreshView();
            }
        }
    });

    const filterDropdown = container.querySelector('#project-filter');
    if (filterDropdown) {
        filterDropdown.onchange = (e) => {
            projectFilter = e.target.value;
            refreshView();
        };
    }

    async function refreshView() {
        const app = document.getElementById('app');
        const content = await renderPlanner();
        app.innerHTML = '';
        app.appendChild(content);
    }

    return container;
}
