import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderReports() {
    const state = store.get();
    const entries = state.timeEntries || [];
    const projects = state.projects || [];

    const projectTimes = {};
    let totalSeconds = 0;

    entries.forEach(e => {
        if (!e.end_time) return;
        const diff = (new Date(e.end_time) - new Date(e.start_time)) / 1000;
        projectTimes[e.project_id] = (projectTimes[e.project_id] || 0) + diff;
        totalSeconds += diff;
    });

    const formatDuration = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const container = document.createElement('div');
    container.className = "max-w-5xl mx-auto animate-slide-up pb-16";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-16 px-2">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3">Analytics</h2>
                 <h1 class="text-3xl font-light text-slate-800 tracking-tight">Time <span class="font-bold italic text-primary">Pulse.</span></h1>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Total Effort</div>
                <div class="text-2xl font-light text-slate-700 tracking-tighter">${formatDuration(totalSeconds)}</div>
            </div>
        </div>

        <!-- Progress Summary -->
        <div class="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm mb-16">
            <h3 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-8">Mission Metrics</h3>
            <div class="space-y-8">
                ${Object.entries(projectTimes).map(([pid, secs]) => {
        const proj = projects.find(p => p.id == pid) || { name: 'Unknown', color: '#eceff1' };
        const percent = totalSeconds > 0 ? (secs / totalSeconds) * 100 : 0;
        return `
                        <div>
                            <div class="flex justify-between items-end mb-3">
                                <div>
                                    <span class="text-md font-bold text-slate-700">${proj.name}</span>
                                    <span class="ml-2 text-[10px] font-black text-slate-200 uppercase">${Math.round(percent)}%</span>
                                </div>
                                <span class="text-[11px] font-bold text-slate-400">${formatDuration(secs)}</span>
                            </div>
                            <div class="w-full bg-slate-50 rounded-full h-1 overflow-hidden">
                                <div class="h-full transition-all duration-700" style="width: ${percent}%; background-color: ${proj.color}"></div>
                            </div>
                        </div>
                    `;
    }).join('')}
                ${Object.keys(projectTimes).length === 0 ? '<p class="text-center py-6 text-slate-200 font-bold uppercase tracking-widest text-[9px]">Awaiting data</p>' : ''}
            </div>
        </div>

        <!-- History -->
        <div class="space-y-4">
            <h3 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-8 ml-2">Historical Logs</h3>
            ${entries.filter(e => e.end_time).map(e => {
        const proj = projects.find(p => p.id == e.project_id) || { name: 'Unassigned', color: '#eceff1' };
        const duration = formatDuration((new Date(e.end_time) - new Date(e.start_time)) / 1000);

        return `
                    <div class="bg-white rounded-2xl p-6 border border-slate-50 shadow-sm group hover:border-primary/20 transition-all duration-300 flex items-center justify-between">
                        <div class="flex items-center gap-6">
                            <div class="w-1.5 h-8 rounded-full" style="background-color: ${proj.color}"></div>
                            <div>
                                <h4 class="text-lg font-bold text-slate-700 tracking-tight mb-0.5">${proj.name}</h4>
                                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">${e.description || 'General progress'}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-8">
                            <div class="text-right">
                                <div class="text-lg font-light text-slate-800 tracking-tighter">${duration}</div>
                                <div class="text-[9px] font-black text-slate-200 uppercase">${new Date(e.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            </div>
                            <button class="delete-btn text-slate-100 hover:text-red-300 transition-colors p-2 opacity-0 group-hover:opacity-100" data-id="${e.id}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
    }).reverse().join('')}
        </div>
    `;

    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-btn');
        if (btn) {
            if (confirm('Delete log?')) {
                const id = btn.dataset.id;
                await api.delete(`time-entries.php?id=${id}`);
                store.update('timeEntries', await api.get('time-entries.php'));
                refreshView();
            }
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderReports());
    }

    return container;
}
