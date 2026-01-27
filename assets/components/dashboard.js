import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderDashboard() {
    const state = store.get();
    const projects = state.projects || [];
    const activeTimer = state.activeTimer;

    const container = document.createElement('div');
    container.className = "max-w-4xl mx-auto space-y-8";

    container.innerHTML = `
        <!-- Welcome / chomper -->
        <div class="bg-white rounded-2xl p-8 shadow-xl border border-blue-100 flex flex-col items-center text-center relative overflow-hidden">
            <div class="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-400 via-primary to-accent"></div>
            
            <h2 class="text-4xl font-bold text-slate-800 mb-2">What are you working on?</h2>
            <p class="text-slate-400 mb-8">Select a project and start chomping time.</p>

            ${activeTimer ? `
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 w-full max-w-lg mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <p class="text-blue-600 font-bold uppercase tracking-wide text-xs mb-2">Currently Chomping</p>
                    <div class="text-3xl font-bold text-slate-800 mb-1">${activeTimer.project_name}</div>
                    <div class="text-slate-500 text-sm mb-4">${activeTimer.description || 'No description'}</div>
                    <button id="dashboard-stop-btn" class="bg-red-500 hover:bg-red-600 text-white w-full py-3 rounded-xl font-bold shadow transition-transform active:scale-95">
                        Stop Timer
                    </button>
                </div>
            ` : `
                <form id="start-timer-form" class="w-full max-w-lg space-y-4">
                    <div class="relative">
                        <select name="project_id" required class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-lg rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors">
                            <option value="">Select Project...</option>
                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                    
                    <input type="text" name="description" placeholder="What are you doing? (Optional)" 
                        class="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none hover:bg-slate-100 transition-colors">

                    <button type="submit" class="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0">
                        Start Timer
                    </button>
                </form>
            `}
        </div>

        <!-- Recent Activity Hints or Tips could go here -->
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
