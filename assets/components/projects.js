import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderProjects() {
    const state = store.get();
    const projects = state.projects || [];
    const customers = state.customers || [];

    const container = document.createElement('div');
    container.className = "max-w-6xl mx-auto animate-slide-up";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-20">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Planning</h2>
                 <h1 class="text-4xl font-light text-slate-800 tracking-tight">Active <span class="font-bold italic text-primary">Missions.</span></h1>
            </div>
            <button id="add-project-btn" class="bg-slate-900 hover:bg-primary text-white px-10 py-5 rounded-2xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px] active:scale-95">
                New Mission
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            ${projects.map(p => {
        const customer = customers.find(c => c.id == p.customer_id);
        return `
                    <div class="bg-white rounded-[2.5rem] p-10 border border-slate-100/60 shadow-sm group hover:-translate-y-1 transition-all duration-500 relative cursor-pointer project-card" data-id="${p.id}">
                        <div class="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300">
                             <button class="delete-btn text-slate-200 hover:text-red-500 transition-colors p-2" data-id="${p.id}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                             </button>
                        </div>

                        <div class="flex flex-col h-full">
                            <div class="w-12 h-1.5 rounded-full mb-8" style="background-color: ${p.color || '#e2e8f0'}"></div>
                            <h3 class="text-2xl font-bold text-slate-800 mb-2 leading-tight">${p.name}</h3>
                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">${customer ? customer.name : 'Unknown Client'}</p>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>

        ${projects.length === 0 ? `
            <div class="text-center py-32 opacity-20">
                <p class="text-sm font-black uppercase tracking-[0.4em]">The roadmap is clear</p>
            </div>
        ` : ''}

        <!-- Modals with Zen styling -->
        <div id="project-modal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 backdrop-blur-xl transition-all">
            <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-14 transform transition-all scale-95 opacity-0" id="project-modal-content">
                <div class="flex justify-between items-center mb-12">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight" id="modal-title">New Mission</h3>
                    <button id="close-project-modal" class="text-slate-300 hover:text-slate-900 text-3xl transition-colors">&times;</button>
                </div>
                <form id="project-form" class="space-y-10">
                    <input type="hidden" name="id" id="project-id">
                    
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Mission Name</label>
                        <input type="text" name="name" required placeholder="Project Alpha"
                            class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                    </div>

                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Client</label>
                        <select name="customer_id" required class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all bg-white cursor-pointer appearance-none">
                            <option value="">Select Client...</option>
                            ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Theme</label>
                        <div class="flex gap-4 flex-wrap">
                            ${['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => `
                                <label class="cursor-pointer">
                                    <input type="radio" name="color" value="${color}" class="peer sr-only" ${color === '#3b82f6' ? 'checked' : ''}>
                                    <div class="w-10 h-10 rounded-xl bg-[${color}] peer-checked:ring-4 peer-checked:ring-primary/20 transition-all border border-slate-200" style="background-color: ${color}"></div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="pt-6">
                        <button type="submit" class="w-full h-24 bg-slate-900 hover:bg-primary text-white font-black text-xs uppercase tracking-[0.4em] rounded-[2.5rem] shadow-sm transition-all active:scale-95">
                            Launch
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Modal Logic
    const projModal = container.querySelector('#project-modal');
    const projModalContent = container.querySelector('#project-modal-content');
    const projectForm = container.querySelector('#project-form');

    const openProjModal = () => {
        projModal.classList.remove('hidden');
        projModal.classList.add('flex');
        setTimeout(() => {
            projModalContent.classList.remove('scale-95', 'opacity-0');
            projModalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    };

    const closeProjModal = () => {
        projModalContent.classList.remove('scale-100', 'opacity-100');
        projModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            projModal.classList.add('hidden');
            projModal.classList.remove('flex');
            projectForm.reset();
        }, 300);
    };

    container.querySelector('#add-project-btn').onclick = openProjModal;
    container.querySelector('#close-project-modal').onclick = closeProjModal;

    projectForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(projectForm).entries());
        try {
            await api.post('projects.php', data);
            store.update('projects', await api.get('projects.php'));
            closeProjModal();
            refreshView();
        } catch (err) {
            alert('Error saving mission');
        }
    };

    // Interactions
    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            e.stopPropagation();
            const id = e.target.closest('.delete-btn').dataset.id;
            if (confirm('Abort mission?')) {
                await api.delete(`projects.php?id=${id}`);
                store.update('projects', await api.get('projects.php'));
                refreshView();
            }
            return;
        }

        if (e.target.closest('.project-card')) {
            const id = e.target.closest('.project-card').dataset.id;
            // Handle details modal or edit here if needed. 
            // For zen simplicity, let's keep it minimal for now.
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderProjects());
    }

    return container;
}
