import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderReports() {
    const state = store.get();
    const entries = state.timeEntries || [];
    const projects = state.projects || [];

    // Aggregation Logic
    const projectTimes = {}; // { projectId: seconds }
    let totalSeconds = 0;

    entries.forEach(e => {
        if (!e.end_time) return; // Skip active
        const start = new Date(e.start_time);
        const end = new Date(e.end_time);
        const diff = (end - start) / 1000;

        projectTimes[e.project_id] = (projectTimes[e.project_id] || 0) + diff;
        totalSeconds += diff;
    });

    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const container = document.createElement('div');
    container.className = "max-w-4xl mx-auto space-y-8";

    container.innerHTML = `
        <h2 class="text-3xl font-bold text-slate-800">Time Reports</h2>
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div class="text-blue-100 text-sm font-bold uppercase tracking-wider mb-2">Total Time Tracked</div>
                <div class="text-4xl font-bold">${formatTime(totalSeconds)}</div>
            </div>
            
            <div class="bg-white rounded-xl p-6 shadow border border-slate-100 col-span-2">
                <h3 class="font-bold text-slate-700 mb-4">Project Breakdown</h3>
                <div class="space-y-3">
                    ${Object.entries(projectTimes).map(([pid, secs]) => {
        const proj = projects.find(p => p.id == pid) || { name: 'Unknown', color: '#ccc' };
        const percent = (secs / totalSeconds) * 100;
        return `
                        <div class="flex items-center">
                            <div class="w-3 h-3 rounded-full mr-3" style="background-color: ${proj.color}"></div>
                            <div class="flex-1">
                                <div class="flex justify-between text-sm mb-1">
                                    <span class="font-medium text-slate-700">${proj.name}</span>
                                    <span class="text-slate-500">${formatTime(secs)}</span>
                                </div>
                                <div class="w-full bg-slate-100 rounded-full h-2">
                                    <div class="h-2 rounded-full" style="width: ${percent}%; background-color: ${proj.color}"></div>
                                </div>
                            </div>
                        </div>
                        `;
    }).join('')}
                    ${Object.keys(projectTimes).length === 0 ? '<p class="text-slate-400 italic">No completed time entries yet.</p>' : ''}
                </div>
            </div>
        </div>

        <!-- Detailed Log -->
        <div class="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
            <div class="p-6 border-b border-slate-100">
                <h3 class="font-bold text-slate-800">Detailed Log</h3>
            </div>
            <div class="divide-y divide-slate-100">
                ${entries.map(e => {
        const proj = projects.find(p => p.id == e.project_id) || { name: 'Unknown', color: '#ccc' };
        const duration = e.end_time ? formatTime((new Date(e.end_time) - new Date(e.start_time)) / 1000) : '<span class="text-blue-500 font-bold animate-pulse">Running</span>';

        return `
                        <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                            <div class="flex items-center space-x-4">
                                <div class="w-2 h-10 rounded-full" style="background-color: ${proj.color}"></div>
                                <div>
                                    <div class="font-bold text-slate-700">${proj.name}</div>
                                    <div class="text-sm text-slate-500">${new Date(e.start_time).toLocaleString()}</div>
                                </div>
                            </div>
                            <div class="flex items-center space-x-6">
                                <div class="text-right">
                                    <div class="font-mono font-bold text-slate-600">${duration}</div>
                                    <div class="text-xs text-slate-400 max-w-[200px] truncate">${e.description || 'No description'}</div>
                                </div>
                                <button class="delete-entry-btn text-slate-300 hover:text-red-500 p-2 transition-colors rounded-lg hover:bg-slate-100" data-id="${e.id}" title="Delete Entry">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
    }).join('')}
                ${entries.length === 0 ? '<div class="p-8 text-center text-slate-400">No time entries found.</div>' : ''}
            </div>
        </div>
    `;

    // Interactions
    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-entry-btn')) {
            const id = e.target.closest('.delete-entry-btn').dataset.id;
            if (confirm('Delete this time entry?')) {
                await api.delete(`time-entries.php?id=${id}`);
                store.update('timeEntries', await api.get('time-entries.php'));

                const app = document.getElementById('app');
                app.innerHTML = '';
                app.appendChild(await renderReports());
            }
        }
    });

    return container;
}
