import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderDashboard() {
    const state = store.get();
    const projects = state.projects || [];
    const activeTimer = state.activeTimer;

    const container = document.createElement('div');
    container.className = "max-w-4xl mx-auto space-y-8";

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-slide-up">
            <!-- Left Side: The Chomper Widget -->
            <div class="lg:col-span-7">
                <div class="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-500/5 border border-slate-100 relative overflow-hidden group">
                    <!-- Background Decoration -->
                    <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700"></div>
                    
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-8">
                            <div class="w-12 h-1 bg-primary rounded-full"></div>
                            <span class="text-xs font-black text-primary uppercase tracking-[0.3em]">CHOMP TIME</span>
                        </div>

                        <h2 class="text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">Feed the <br/><span class="text-primary italic">Chomper.</span></h2>
                        <p class="text-slate-400 text-lg mb-10 max-w-sm">Assign your focus to a project and let the shark do the heavy lifting.</p>

                        ${activeTimer ? `
                            <div class="bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                                <div class="flex justify-between items-start relative z-10">
                                    <div>
                                        <p class="text-chomper-teal font-black text-xs uppercase tracking-widest mb-2">Actively Tracking</p>
                                        <h3 class="text-2xl font-bold text-white mb-1">${activeTimer.project_name}</h3>
                                        <p class="text-slate-400 text-sm italic font-medium">"${activeTimer.description || 'No description provided'}"</p>
                                    </div>
                                    <div class="w-12 h-12 bg-chomper-teal/10 rounded-2xl flex items-center justify-center">
                                         <div class="w-3 h-3 bg-chomper-teal rounded-full animate-ping"></div>
                                    </div>
                                </div>
                                <div class="mt-10 flex justify-center">
                                     <button id="dashboard-stop-btn" class="group relative px-12 py-5 bg-white text-slate-900 font-black text-lg rounded-2xl shadow-xl hover:bg-red-500 hover:text-white transition-all duration-300 active:scale-95 overflow-hidden">
                                        <span class="relative z-10 uppercase tracking-widest">Stop Chomping</span>
                                        <div class="absolute inset-0 bg-red-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500"></div>
                                     </button>
                                </div>
                            </div>
                        ` : `
                            <form id="start-timer-form" class="space-y-6">
                                <div class="grid gap-4">
                                     <div class="relative group">
                                        <label class="absolute -top-2 left-6 bg-white px-2 text-[10px] font-black text-slate-400 group-focus-within:text-primary uppercase tracking-widest z-10 transition-colors">Select Project</label>
                                        <select name="project_id" required class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-lg font-bold text-slate-700 outline-none focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer">
                                            <option value="">-- Choose Target --</option>
                                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                        </select>
                                        <div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                    
                                    <div class="relative group">
                                         <label class="absolute -top-2 left-6 bg-white px-2 text-[10px] font-black text-slate-400 group-focus-within:text-primary uppercase tracking-widest z-10 transition-colors">Mission Brief</label>
                                         <input type="text" name="description" placeholder="What are you conquering today?" 
                                            class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-lg font-bold text-slate-700 outline-none focus:border-primary focus:bg-white transition-all">
                                    </div>
                                </div>

                                <button type="submit" class="group relative w-full h-20 bg-slate-900 rounded-[1.5rem] shadow-xl shadow-slate-900/20 overflow-hidden transition-all hover:shadow-primary/20">
                                    <div class="absolute inset-0 bg-gradient-to-r from-primary to-chomper-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div class="relative z-10 flex items-center justify-center gap-4">
                                        <span class="text-white text-xl font-black uppercase tracking-[0.2em]">Start Tracking</span>
                                        <svg class="w-6 h-6 text-white transform group-hover:translate-x-2 transition-transform shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                                    </div>
                                </button>
                            </form>
                        `}
                    </div>
                </div>
            </div>

            <!-- Right Side: Stats / Hints -->
            <div class="lg:col-span-5 space-y-8">
                <div class="bg-gradient-to-br from-primary to-chomper-blue rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                     <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                     <h3 class="text-xs font-black uppercase tracking-[0.3em] mb-4 opacity-70">Focus Insight</h3>
                     <p class="text-2xl font-bold leading-tight">"Time is the only currency you can't earn back. Spend it wisely."</p>
                </div>
                
                <div class="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-500/5">
                    <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Recent Chops</h3>
                    <div class="space-y-6 shadow-sm">
                        <!-- We could map recent time entries here -->
                        <div class="flex items-center gap-4 opacity-50">
                             <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-bold text-slate-300 italic">TC</div>
                             <div>
                                 <div class="h-3 w-32 bg-slate-100 rounded-full mb-2"></div>
                                 <div class="h-2 w-20 bg-slate-50 rounded-full"></div>
                             </div>
                        </div>
                         <div class="flex items-center gap-4 opacity-30">
                             <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-bold text-slate-300 italic">TC</div>
                             <div>
                                 <div class="h-3 w-24 bg-slate-100 rounded-full mb-2"></div>
                                 <div class="h-2 w-16 bg-slate-50 rounded-full"></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Logic
    const startForm = container.querySelector('#start-timer-form');
    const stopBtn = container.querySelector('#dashboard-stop-btn');

    if (startForm) {
        startForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(startForm);
            const projectId = formData.get('project_id');
            const project = projects.find(p => p.id == projectId);

            const payload = {
                project_id: projectId,
                project_name: project ? project.name : 'Unknown',
                description: formData.get('description'),
            };

            try {
                await api.post('time-entries.php?action=start', payload);
                // Refresh
                const entries = await api.get('time-entries.php');
                store.update('timeEntries', entries);

                // Find active
                const active = entries.find(e => !e.end_time);
                store.update('activeTimer', active);

                // Re-render
                const app = document.getElementById('app');
                app.innerHTML = '';
                app.appendChild(await renderDashboard());

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
                store.update('timeEntries', await api.get('time-entries.php')); // refresh list
                // Re-render
                const app = document.getElementById('app');
                app.innerHTML = '';
                app.appendChild(await renderDashboard());
            } catch (err) {
                alert(err.message);
            }
        };
    }

    return container;
}
