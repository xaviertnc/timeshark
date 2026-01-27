import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderDashboard() {
    const state = store.get();
    const projects = state.projects || [];
    const activeTimer = state.activeTimer;

    const container = document.createElement('div');
    container.className = "max-w-4xl mx-auto space-y-8";

    container.innerHTML = `
        <div class="max-w-2xl mx-auto pt-10 animate-slide-up">
            <div class="text-center mb-16 px-4">
                <h2 class="text-xs font-black text-primary uppercase tracking-[0.4em] mb-4 opacity-60">Focus Mode</h2>
                <h1 class="text-4xl font-black text-slate-900 tracking-tight leading-tight">What are we <br/><span class="italic text-primary">conquering</span> next?</h1>
            </div>

            <div class="bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                <!-- Subtle Zen Decoration -->
                <div class="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 group-hover:bg-primary/5 transition-colors duration-700"></div>
                
                <div class="relative z-10">
                    ${activeTimer ? `
                        <div class="text-center py-4">
                            <p class="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Actively Tracking</p>
                            <h3 class="text-4xl font-black text-slate-900 mb-2 tracking-tighter">${activeTimer.project_name}</h3>
                            <p class="text-slate-400 font-medium italic mb-12">"${activeTimer.description || 'Focusing on the mission'}"</p>
                            
                            <div class="flex justify-center">
                                 <button id="dashboard-stop-btn" class="group relative px-12 py-5 bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-red-500 transition-all duration-300 active:scale-95 overflow-hidden">
                                    <span class="relative z-10">Stop Chomping</span>
                                 </button>
                            </div>
                        </div>
                    ` : `
                        <form id="start-timer-form" class="space-y-8">
                            <div class="space-y-6">
                                 <div class="relative group">
                                    <label class="absolute -top-2 left-6 bg-white px-2 text-[10px] font-black text-slate-400 group-focus-within:text-primary uppercase tracking-widest z-10 transition-colors">Select Project</label>
                                    <select name="project_id" required class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-lg font-bold text-slate-700 outline-none focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer">
                                        <option value="">-- Select Target --</option>
                                        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                    </select>
                                    <div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                
                                <div class="relative group">
                                     <label class="absolute -top-2 left-6 bg-white px-2 text-[10px] font-black text-slate-400 group-focus-within:text-primary uppercase tracking-widest z-10 transition-colors">Description</label>
                                     <input type="text" name="description" placeholder="Brief hint of what's happening..." 
                                        class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-700 outline-none focus:border-primary focus:bg-white transition-all">
                                </div>
                            </div>

                            <button type="submit" class="group relative w-full h-20 bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-900/10 overflow-hidden transition-all hover:bg-primary">
                                <span class="relative z-10 text-white text-sm font-black uppercase tracking-[0.3em]">Start Tracking</span>
                            </button>
                        </form>
                    `}
                </div>
            </div>

            <!-- Minimal Insight Footer -->
            <div class="mt-20 text-center">
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Less Noise. More Work.</p>
            </div>
        </div>
    `;

    // Logic
    const startForm = container.querySelector('#start-timer-form');
    const stopBtn = container.querySelector('#dashboard-stop-btn');
    const projectSelect = container.querySelector('select[name="project_id"]');
    const taskContainer = document.createElement('div');
    taskContainer.className = "hidden animate-in fade-in slide-in-from-top-2";

    if (projectSelect) {
        // Insert task container after project select
        projectSelect.parentElement.after(taskContainer);

        projectSelect.onchange = (e) => {
            const pid = e.target.value;
            const project = projects.find(p => p.id == pid);

            if (project && project.todos && project.todos.length > 0) {
                taskContainer.innerHTML = `
                    <div class="relative group mt-4">
                        <label class="absolute -top-2 left-6 bg-white px-2 text-[10px] font-black text-slate-400 group-focus-within:text-primary uppercase tracking-widest z-10 transition-colors">Target Task</label>
                        <select name="selected_task" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-lg font-bold text-slate-700 outline-none focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer">
                            <option value="">-- General Project Time --</option>
                            ${project.todos.map(t => `<option value="${t.title}" ${t.done ? 'disabled' : ''}>${t.title} ${t.done ? '(Done)' : ''}</option>`).join('')}
                        </select>
                         <div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                `;
                taskContainer.classList.remove('hidden');
            } else {
                taskContainer.innerHTML = '';
                taskContainer.classList.add('hidden');
            }
        };
    }

    if (startForm) {
        startForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(startForm);
            const projectId = formData.get('project_id');
            const project = projects.find(p => p.id == projectId);
            const taskTitle = formData.get('selected_task');

            const payload = {
                project_id: projectId,
                project_name: project ? project.name : 'Unknown',
                description: taskTitle ? `Task: ${taskTitle} | ${formData.get('description')}` : formData.get('description'),
            };

            try {
                await api.post('time-entries.php?action=start', payload);
                const entries = await api.get('time-entries.php');
                store.update('timeEntries', entries);
                const active = entries.find(e => !e.end_time);
                store.update('activeTimer', active);
                refreshView();
            } catch (err) {
                alert('Failed to start timer: ' + err.message);
            }
        };
    }

    if (stopBtn) {
        stopBtn.onclick = async () => {
            try {
                await api.post('time-entries.php?action=stop', { id: activeTimer.id });
                store.update('activeTimer', null);
                store.update('timeEntries', await api.get('time-entries.php'));
                refreshView();
            } catch (err) {
                alert(err.message);
            }
        };
    }

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderDashboard());
    }

    return container;
}
