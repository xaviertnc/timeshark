import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderTeam() {
    const state = store.get();
    const team = state.team || [];

    const container = document.createElement('div');
    container.className = "max-w-6xl mx-auto space-y-12 animate-slide-up";

    container.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-4xl font-black text-slate-900 tracking-tight">The Team</h2>
                <p class="text-slate-400 font-medium">Resources ready for the chomper.</p>
            </div>
            <button id="add-member-btn" class="bg-slate-900 hover:bg-primary text-white px-8 py-4 rounded-2xl shadow-xl transition-all flex items-center font-bold uppercase tracking-widest text-xs group">
                <span class="mr-3 text-xl group-hover:rotate-90 transition-transform duration-300">+</span> Add Human
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${team.map(m => `
                <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-500/5 group relative hover:-translate-y-2 transition-all duration-300">
                    <div class="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 translate-y-2 group-hover:translate-y-0">
                         <button class="delete-member-btn text-slate-300 hover:text-red-500 transition-colors p-2 bg-white rounded-xl shadow-lg border border-slate-100" data-id="${m.id}" title="Remove Member">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                         </button>
                    </div>

                    <div class="flex flex-col items-center text-center">
                        <div class="w-24 h-24 rounded-[2rem] mb-6 flex items-center justify-center text-2xl font-black text-white shadow-2xl transform -rotate-3 group-hover:rotate-0 transition-transform" 
                             style="background: linear-gradient(135deg, ${m.color}, ${m.color}88)">
                            ${m.name.substring(0, 2).toUpperCase()}
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 mb-1">${m.name}</h3>
                        <p class="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">${m.role}</p>
                        
                        <div class="w-full pt-6 border-t border-slate-50 flex justify-around opacity-60">
                             <div class="text-center">
                                 <div class="text-lg font-bold text-slate-800">0</div>
                                 <div class="text-[10px] font-black uppercase tracking-tighter text-slate-400">Tasks</div>
                             </div>
                             <div class="text-center">
                                 <div class="text-lg font-bold text-slate-800">0h</div>
                                 <div class="text-[10px] font-black uppercase tracking-tighter text-slate-400">Total</div>
                             </div>
                        </div>
                    </div>
                </div>
            `).join('')}
            
            ${team.length === 0 ? `
                <div class="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
                    <p class="text-lg font-bold mb-2">Nobody here but us ghosts.</p>
                    <p class="text-sm">Click "+ Add Human" to populate your team.</p>
                </div>
            ` : ''}
        </div>

        <!-- Add Member Modal -->
        <div id="member-modal" class="fixed inset-0 bg-slate-900/80 hidden items-center justify-center z-50 backdrop-blur-md">
            <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 transform transition-all scale-95 opacity-0" id="member-modal-content">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-3xl font-black text-slate-900 tracking-tighter">New Recruit</h3>
                    <button id="close-member-modal" class="text-slate-300 hover:text-slate-900 text-3xl transition-colors">&times;</button>
                </div>
                <form id="member-form" class="space-y-6">
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input type="text" name="name" required placeholder="John Doe"
                            class="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                    </div>
                    
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialization / Role</label>
                        <input type="text" name="role" required placeholder="Design Ninja / Code Shark"
                            class="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                    </div>

                    <div class="pt-4">
                        <button type="submit" class="w-full h-16 bg-slate-900 hover:bg-primary text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-95">
                            Welcome Aboard
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Logic
    const modal = container.querySelector('#member-modal');
    const modalContent = container.querySelector('#member-modal-content');
    const form = container.querySelector('#member-form');

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
        }, 200);
    };

    container.querySelector('#add-member-btn').onclick = openModal;
    container.querySelector('#close-member-modal').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('team.php', data);
            store.update('team', await api.get('team.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-member-btn')) {
            const id = e.target.closest('.delete-member-btn').dataset.id;
            if (confirm('Eject from team?')) {
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
