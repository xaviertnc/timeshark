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

            <div class="bg-card rounded-[1.67rem] p-10 shadow-soft relative group transition-all duration-300">
                <div class="relative z-10">
                    ${activeTimer ? `
                        <div class="text-center py-2">
                            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-[9px] font-black text-primary uppercase tracking-widest mb-6">
                                <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Chomping
                            </div>
                            <div id="active-task-display" class="cursor-pointer group/task relative py-4 px-6 rounded-3xl hover:bg-slate-50/50 transition-all">
                                <h3 class="text-3xl font-bold text-main mb-2 tracking-tight group-hover/task:text-primary transition-colors">${activeTimer.project_name}</h3>
                                <p class="text-muted font-medium text-sm leading-relaxed px-4">
                                    <span class="opacity-50">"</span>${activeTimer.description || 'Focusing'}<span class="opacity-50">"</span>
                                </p>
                                <div class="absolute -top-1 -right-1 opacity-0 group-hover/task:opacity-100 transition-opacity bg-card shadow-soft rounded-full p-2 text-primary border border-soft">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </div>
                            </div>
                            
                            <div class="flex justify-center mt-10">
                                 <button id="dashboard-stop-btn" class="flex items-center justify-center min-w-[220px] h-16 bg-[#FF3B30] hover:bg-[#FF453A] text-white font-black text-[13px] uppercase tracking-[0.2em] rounded-2xl transition-all duration-150 active:scale-95 shadow-lg shadow-red-500/20 leading-none">
                                    Stop Tracking
                                 </button>
                            </div>
                        </div>

                        <!-- Edit Active Task Modal/Overlay -->
                        <div id="edit-active-panel" class="fixed inset-0 bg-secondary/40 hidden z-[60] backdrop-blur-md items-center justify-center p-4">
                            <div class="bg-card rounded-[2rem] shadow-soft w-full max-w-sm p-10 transform scale-95 opacity-0 transition-all duration-300" id="edit-active-content">
                                <div class="mb-8 text-center">
                                    <h3 class="text-2xl font-bold text-main tracking-tight">Edit Current Task</h3>
                                    <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-3">Live Log Adjustment</p>
                                </div>
                                <form id="edit-active-form" class="space-y-6">
                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-dim uppercase tracking-widest ml-1">Project</label>
                                        <select name="project_id" required class="w-full bg-app border-none rounded-2xl px-5 py-4 font-bold text-main text-sm appearance-none cursor-pointer">
                                            ${projects.map(p => `<option value="${p.id}" ${activeTimer.project_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-dim uppercase tracking-widest ml-1">Context</label>
                                        <input type="text" name="description" value="${activeTimer.description || ''}" class="w-full bg-app border-none rounded-2xl px-5 py-4 font-bold text-main text-sm">
                                    </div>
                                    <div class="flex gap-4 pt-4">
                                        <button type="button" id="close-edit-active" class="flex-1 h-14 bg-app hover:bg-border-soft text-muted font-black text-[11px] uppercase tracking-widest rounded-xl transition-all">Cancel</button>
                                        <button type="submit" class="flex-[2] h-14 bg-primary hover:bg-primary-dark text-white font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 transition-all">Save Changes</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    ` : `
                        <form id="start-timer-form" class="space-y-8">
                            <div class="space-y-5">
                                 <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Project</label>
                                    <div class="relative">
                                        <select name="project_id" required class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer font-bold text-slate-600 text-sm">
                                            <option value="">Select Target...</option>
                                            ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                        </select>
                                        <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="space-y-2">
                                     <label class="block text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Context</label>
                                     <input type="text" name="description" placeholder="What are we doing?" 
                                        class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-600 text-sm">
                                </div>
                            </div>

                            <button type="submit" class="flex items-center justify-center w-full h-16 bg-primary hover:bg-primary-dark text-white text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-150 active:scale-95 shadow-lg shadow-primary/20 leading-none">
                                Start Chomping
                            </button>
                        </form>
                    `}
                </div>
            </div>

            <div class="mt-16 text-center opacity-30">
                 <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em]">Steady & Calm.</p>
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

    const editPanel = container.querySelector('#edit-active-panel');
    const editContent = container.querySelector('#edit-active-content');
    const editDisplay = container.querySelector('#active-task-display');
    const closeEdit = container.querySelector('#close-edit-active');
    const editForm = container.querySelector('#edit-active-form');

    if (editDisplay) {
        editDisplay.onclick = () => {
            editPanel.classList.remove('hidden');
            editPanel.classList.add('flex');
            setTimeout(() => {
                editContent.classList.remove('scale-95', 'opacity-0');
                editContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        };
    }

    const closeEditPanel = () => {
        editContent.classList.remove('scale-100', 'opacity-100');
        editContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            editPanel.classList.add('hidden');
            editPanel.classList.remove('flex');
        }, 300);
    };

    if (closeEdit) closeEdit.onclick = closeEditPanel;

    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(editForm);
            const data = Object.fromEntries(formData.entries());

            const project = projects.find(p => p.id == data.project_id);
            data.project_name = project.name;
            data.id = activeTimer.id;

            try {
                // We reuse the start endpoint which handles updates if ID is provided
                const result = await api.post('time-entries.php?action=start', data);
                store.update('activeTimer', result);
                closeEditPanel();
                setTimeout(refreshView, 350);
            } catch (err) {
                alert('Update failed');
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
