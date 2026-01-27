import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderDashboard() {
    const state = store.get();
    const projects = state.projects || [];
    const activeTimer = state.activeTimer;

    const container = document.createElement('div');
    container.className = "h-full flex flex-col items-center justify-center -mt-12";

    container.innerHTML = `
        <div class="max-w-xl w-full px-8 animate-slide-up">
            <div class="text-center mb-16">
                <h1 class="text-5xl font-light text-slate-800 tracking-tight leading-tight">
                    What are we <br/>
                    <span class="font-bold text-primary italic">conquering</span> next?
                </h1>
            </div>

            <div class="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-100 relative group overflow-hidden">
                <div class="relative z-10">
                    ${activeTimer ? `
                        <div class="text-center py-6">
                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-6">Actively Tracking</p>
                            <h3 class="text-4xl font-bold text-slate-800 mb-2 tracking-tight">${activeTimer.project_name}</h3>
                            <p class="text-slate-400 font-medium italic mb-12 opacity-60">"${activeTimer.description || 'Focusing on the mission'}"</p>
                            
                            <div class="flex justify-center">
                                 <button id="dashboard-stop-btn" class="px-14 py-5 bg-slate-900 text-white font-bold text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500 transition-all duration-500 active:scale-95">
                                    Stop Chomping
                                 </button>
                            </div>
                        </div>
                    ` : `
                        <form id="start-timer-form" class="space-y-10">
                            <div class="space-y-8">
                                 <div class="relative group">
                                    <label class="absolute -top-2.5 left-6 bg-white px-2 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] z-10 transition-colors group-focus-within:text-primary">Target Project</label>
                                    <select name="project_id" required class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-lg font-medium text-slate-600 outline-none focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer">
                                        <option value="">Select Target...</option>
                                        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                    </select>
                                    <div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-200">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                
                                <div class="relative group">
                                     <label class="absolute -top-2.5 left-6 bg-white px-2 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] z-10 transition-colors group-focus-within:text-primary">Brief Hint</label>
                                     <input type="text" name="description" placeholder="What's happening?" 
                                        class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-medium text-slate-600 outline-none focus:border-primary focus:bg-white transition-all">
                                </div>
                            </div>

                            <button type="submit" class="w-full h-24 bg-slate-900 hover:bg-primary text-white text-xs font-black uppercase tracking-[0.4em] rounded-[2.5rem] shadow-sm transition-all duration-500 active:scale-95">
                                Start Tracking
                            </button>
                        </form>
                    `}
                </div>
            </div>

            <div class="mt-20 text-center opacity-20 hover:opacity-100 transition-opacity duration-1000">
                 <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em]">Less Noise. More Work.</p>
            </div>
        </div>
    `;

    const form = container.querySelector('#start-timer-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());
            if (!data.project_id) return;

            const projects = store.get().projects;
            const project = projects.find(p => p.id == data.project_id);
            data.project_name = project.name;

            try {
                const result = await api.post('time-entries.php?action=start', data);
                store.update('activeTimer', result);
                refreshView();
            } catch (err) {
                alert('Launch failed');
            }
        };
    }

    const stopBtn = container.querySelector('#dashboard-stop-btn');
    if (stopBtn) {
        stopBtn.onclick = async () => {
            try {
                await api.post('time-entries.php?action=stop', { id: activeTimer.id });
                store.update('activeTimer', null);
                refreshView();
            } catch (err) {
                alert('Stop failed');
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
