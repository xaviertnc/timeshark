import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderProjects() {
    const state = store.get();
    const projects = state.projects || [];
    const customers = state.customers || [];

    const container = document.createElement('div');
    container.className = "max-w-6xl mx-auto animate-slide-up";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-16">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3">Missions</h2>
                 <h1 class="text-3xl font-light text-slate-800 tracking-tight">Active <span class="font-bold italic text-primary">Map.</span></h1>
            </div>
            <button id="add-project-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
                Create Mission
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${projects.map(p => {
        const customer = customers.find(c => c.id == p.customer_id);
        return `
                    <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm group hover:-translate-y-1 transition-all duration-300 relative project-card" data-id="${p.id}">
                        <div class="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                             <button class="delete-btn text-slate-200 hover:text-red-400 transition-colors p-2" data-id="${p.id}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                             </button>
                        </div>

                        <div class="flex flex-col h-full">
                            <div class="w-10 h-1.5 rounded-full mb-6" style="background-color: ${p.color || '#eceff1'}"></div>
                            <h3 class="text-xl font-bold text-slate-700 mb-1 leading-tight">${p.name}</h3>
                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">${customer ? customer.name : 'Unassigned'}</p>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>

        ${projects.length === 0 ? `
            <div class="text-center py-20 opacity-30">
                <p class="text-[10px] font-black uppercase tracking-[0.4em]">Ready for assignment</p>
            </div>
        ` : ''}

        <!-- Refined Modal -->
        <div id="project-modal" class="fixed inset-0 bg-secondary/20 hidden items-center justify-center z-50 backdrop-blur-md">
            <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0" id="project-modal-content">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-2xl font-bold text-slate-800 tracking-tight">New Mission</h3>
                    <button id="close-project-modal" class="text-slate-300 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <form id="project-form" class="space-y-8">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Name</label>
                        <input type="text" name="name" required class="w-full">
                    </div>

                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Client</label>
                        <select name="customer_id" required class="w-full bg-white appearance-none cursor-pointer">
                            <option value="">Choose Client...</option>
                            ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Theme</label>
                        <div class="flex gap-3 flex-wrap">
                            ${['#80cbc4', '#ffd54f', '#90a4ae', '#ce93d8', '#ffab91', '#9fa8da'].map(color => `
                                <label class="cursor-pointer">
                                    <input type="radio" name="color" value="${color}" class="peer sr-only">
                                    <div class="w-8 h-8 rounded-lg bg-[${color}] peer-checked:ring-2 peer-checked:ring-primary/40 transition-all border border-slate-50 shadow-sm" style="background-color: ${color}"></div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="pt-4">
                        <button type="submit" class="w-full h-16 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all">
                            Initialize
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

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
        }, 200);
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
            alert('Initialization failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            e.stopPropagation();
            const id = e.target.closest('.delete-btn').dataset.id;
            if (confirm('Erase mission?')) {
                await api.delete(`projects.php?id=${id}`);
                store.update('projects', await api.get('projects.php'));
                refreshView();
            }
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderProjects());
    }

    return container;
}
