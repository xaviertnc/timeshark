import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderDashboard() {
    const state = store.get();
    const projects = state.projects || [];
    const activeTimer = state.activeTimer;

    const container = document.createElement('div');
    container.className = "h-full flex flex-col items-center justify-center -mt-16";

    container.innerHTML = `
        <div class="max-w-md w-full px-6 animate-slide-up">
            
            ${!activeTimer ? `
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-light text-slate-700 tracking-tight leading-tight">
                        What's on the <br/>
                        <span class="font-bold text-primary italic">horizon?</span>
                    </h1>
                </div>
            ` : ''}

            <div class="${activeTimer ? 'bg-white border-primary/20' : 'bg-white border-slate-100'} rounded-[1.5rem] p-8 shadow-sm border relative group transition-colors duration-200">
                <div class="relative z-10">
                    ${activeTimer ? `
                        <div class="text-center py-2">
                            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-[8px] font-black text-primary uppercase tracking-widest mb-4">
                                <span class="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                                Chomping
                            </div>
                            <h3 class="text-2xl font-bold text-slate-800 mb-0.5 tracking-tight">${activeTimer.project_name}</h3>
                            <p class="text-slate-400 font-medium text-xs italic mb-8 opacity-80">"${activeTimer.description || 'Focusing'}"</p>
                            
                            <div class="flex justify-center">
                                 <button id="dashboard-stop-btn" class="flex items-center justify-center min-w-[200px] h-14 bg-[#FF3B30] hover:bg-[#FF2D55] text-white font-black text-[13px] uppercase tracking-[0.1em] rounded-full transition-all duration-150 active:scale-95 shadow-sm leading-none pt-0.5">
                                    Stop Tracking
                                 </button>
                            </div>
                        </div>
                    ` : `
                        <form id="start-timer-form" class="space-y-6">
                            <div class="space-y-4">
                                 <div class="relative">
                                    <label class="block text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">Mission</label>
                                    <select name="project_id" required class="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer font-bold text-slate-600 text-sm">
                                        <option value="">Select Target...</option>
                                        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                    </select>
                                    <div class="absolute right-4 top-[2.3rem] pointer-events-none text-slate-300">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                
                                <div class="relative">
                                     <label class="block text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">Context</label>
                                     <input type="text" name="description" placeholder="What are we doing?" 
                                        class="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-600 text-sm">
                                </div>
                            </div>

                            <button type="submit" class="flex items-center justify-center w-full h-14 bg-primary hover:bg-primary-dark text-white text-[13px] font-black uppercase tracking-[0.1em] rounded-full transition-all duration-150 active:scale-95 shadow-sm leading-none pt-0.5">
                                Start Chomping
                            </button>
                        </form>
                    `}
                </div>
            </div>

            <div class="mt-12 text-center opacity-30">
                 <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.6em]">Steady & Calm.</p>
            </div>
        </div>
    `;

    const form = container.querySelector('#start-timer-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            if (!data.project_id) return;

            const projects = store.get().projects;
            const project = projects.find(p => p.id == data.project_id);
            data.project_name = project.name;

            try {
                const result = await api.post('time-entries.php?action=start', data);
                store.update('activeTimer', result);
                refreshView();
            } catch (err) {
                alert('Request failed');
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
                alert('Error stopping');
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
