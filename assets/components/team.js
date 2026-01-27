import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderTeam() {
    const state = store.get();
    const team = state.team || [];

    const container = document.createElement('div');
    container.className = "max-w-6xl mx-auto animate-slide-up";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-20">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Resources</h2>
                 <h1 class="text-4xl font-light text-slate-800 tracking-tight">Active <span class="font-bold italic text-primary">Humanity.</span></h1>
            </div>
            <button id="add-member-btn" class="bg-slate-900 hover:bg-primary text-white px-10 py-5 rounded-2xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px] active:scale-95">
                Assemble Member
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            ${team.map(m => `
                <div class="bg-white rounded-[2.5rem] p-10 border border-slate-100/60 shadow-sm group hover:-translate-y-1 transition-all duration-500 relative">
                     <div class="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button class="delete-member-btn text-slate-200 hover:text-red-500 transition-colors p-2" data-id="${m.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>

                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-300">
                            ${m.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-slate-800 tracking-tight">${m.name}</h3>
                            <p class="text-[10px] font-black text-primary uppercase tracking-widest opacity-40">${m.role || 'Member'}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        ${team.length === 0 ? `
            <div class="text-center py-32 opacity-20">
                <p class="text-sm font-black uppercase tracking-[0.4em]">Solitary Operation</p>
            </div>
        ` : ''}

        <div id="team-modal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 backdrop-blur-xl">
            <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-14 transform transition-all scale-95 opacity-0" id="team-modal-content">
                <div class="flex justify-between items-center mb-12">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight">Add Member</h3>
                    <button id="close-team-modal" class="text-slate-300 hover:text-slate-900 text-3xl transition-colors">&times;</button>
                </div>
                <form id="team-form" class="space-y-10">
                    <div class="space-y-3">
                         <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Member Name</label>
                         <input type="text" name="name" required placeholder="John Doe"
                            class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                    </div>
                    <div class="space-y-3">
                         <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Designation</label>
                         <input type="text" name="role" placeholder="Architect"
                            class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                    </div>
                    <div class="pt-6">
                        <button type="submit" class="w-full h-24 bg-slate-900 hover:bg-primary text-white font-black text-xs uppercase tracking-[0.4em] rounded-[2.5rem] shadow-sm transition-all active:scale-95">
                            Assemble
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modal = container.querySelector('#team-modal');
    const modalContent = container.querySelector('#team-modal-content');
    const form = container.querySelector('#team-form');

    const openModal = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    };

    const closeModal = () => {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            form.reset();
        }, 300);
    };

    container.querySelector('#add-member-btn').onclick = openModal;
    container.querySelector('#close-team-modal').onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('team.php', data);
            store.update('team', await api.get('team.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Assemblage failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-member-btn')) {
            const id = e.target.closest('.delete-member-btn').dataset.id;
            if (confirm('De-commission member?')) {
                await api.delete(`team.php?id=${id}`);
                store.update('team', await api.get('team.php'));
                refreshView();
            }
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderTeam());
    }

    return container;
}
