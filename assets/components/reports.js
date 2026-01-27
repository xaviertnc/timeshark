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
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const container = document.createElement('div');
    container.className = "max-w-5xl mx-auto animate-slide-up pb-20";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-20 px-4">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Analytics</h2>
                 <h1 class="text-4xl font-light text-slate-800 tracking-tight">Time <span class="font-bold italic text-primary">Pulse.</span></h1>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Total Effort</div>
                <div class="text-3xl font-light text-slate-800 tracking-tighter">${formatDuration(totalSeconds)}</div>
            </div>
        </div>

        <!-- Breakdown Section -->
        <div class="bg-white rounded-[3rem] p-16 border border-slate-100/60 shadow-sm mb-20">
            <h3 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-12">Mission Distribution</h3>
            <div class="space-y-10">
                ${Object.entries(projectTimes).map(([pid, secs]) => {
        const proj = projects.find(p => p.id == pid) || { name: 'Unknown Mission', color: '#e2e8f0' };
        const percent = totalSeconds > 0 ? (secs / totalSeconds) * 100 : 0;
        return `
                        <div>
                            <div class="flex justify-between items-end mb-4 px-1">
                                <div>
                                    <span class="text-lg font-bold text-slate-700">${proj.name}</span>
                                    <span class="ml-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">${Math.round(percent)}%</span>
                                </div>
                                <span class="text-xs font-bold text-slate-400">${formatDuration(secs)}</span>
                            </div>
                            <div class="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-1000 ease-out" style="width: ${percent}%; background-color: ${proj.color}"></div>
                            </div>
                        </div>
                    `;
    }).join('')}
                ${Object.keys(projectTimes).length === 0 ? '<p class="text-center py-10 text-slate-200 font-black uppercase tracking-[0.4em] text-[10px]">No telemetry found</p>' : ''}
            </div>
        </div>

        <!-- History Section -->
        <div>
            <h3 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-12 ml-4">Historical Logs</h3>
            <div class="space-y-4">
                ${entries.map(e => {
        const proj = projects.find(p => p.id == e.project_id) || { name: 'Unknown Mission', color: '#e2e8f0' };
        const duration = e.end_time ? formatDuration((new Date(e.end_time) - new Date(e.start_time)) / 1000) : 'Active...';

        return `
                        <div class="bg-white rounded-[2rem] p-8 border border-slate-100/40 shadow-sm group hover:-translate-y-1 transition-all duration-500">
                            <div class="flex items-center justify-between gap-10">
                                <div class="flex items-center gap-8">
                                    <div class="w-1.5 h-10 rounded-full" style="background-color: ${proj.color}"></div>
                                    <div>
                                        <h3 class="text-xl font-bold text-slate-800 tracking-tight">${proj.name}</h3>
                                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest truncate max-w-sm">${e.description || 'Focusing'}</p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-12">
                                    <div class="text-right">
                                        <div class="text-xl font-light text-slate-800 tabular-nums tracking-tighter">${duration}</div>
                                        <div class="text-[9px] font-black text-slate-300 uppercase tracking-widest opacity-60">${formatDate(e.start_time)}</div>
                                    </div>
                                    
                                    <button class="delete-btn text-slate-200 hover:text-red-500 transition-all p-3 opacity-0 group-hover:opacity-100" data-id="${e.id}">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
    }).reverse().join('')}
            </div>
        </div>
    `;

    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-btn');
        if (btn) {
            if (confirm('Erase this log?')) {
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
