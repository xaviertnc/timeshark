import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderTeam() {
    const state = store.get();
    const team = state.team || [];

    const container = document.createElement('div');
    container.className = "max-w-6xl mx-auto";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-16 px-2">
            <div>
                 <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-3">Resources</h2>
                 <h1 class="text-3xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Team.</span></h1>
            </div>
            <button id="add-member-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
                Add Team Member
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${team.map(m => `
                <div class="bg-card rounded-2xl p-10 border border-soft shadow-sm group hover:-translate-y-1 transition-all duration-300 relative flex flex-col items-center text-center">
                     <div class="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1">
                        <button class="edit-member-btn text-dim/50 hover:text-primary transition-colors p-2" data-id="${m.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button class="delete-member-btn text-dim/50 hover:text-red-300 transition-colors p-2" data-id="${m.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>

                    <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-[14px] font-black text-primary mb-6">
                        ${m.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-main tracking-tight mb-1">${m.name}</h3>
                        <p class="text-[10px] font-black text-dim uppercase tracking-widest">${m.role || 'Contributor'}</p>
                    </div>
                </div>
            `).join('')}
        </div>

        ${team.length === 0 ? `
            <div class="text-center py-20 opacity-20">
                <p class="text-[10px] font-black uppercase tracking-[0.4em]">Sole Operator</p>
            </div>
        ` : ''}
    `;

    const modalPortal = document.getElementById('modal-portal');
    modalPortal.innerHTML = `
        <div id="team-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
            <div class="min-h-screen w-full flex items-center justify-center p-4">
                <div class="bg-card rounded-2xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0 text-center relative" id="team-modal-content">
                    <button id="close-team-modal" class="absolute top-6 right-8 text-dim hover:text-main text-2xl">&times;</button>

                    <div class="mb-10">
                        <h3 class="text-2xl font-bold text-main tracking-tight" id="modal-title">New Team Member</h3>
                        <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Member Details</p>
                    </div>

                    <form id="team-form" class="space-y-8">
                        <input type="hidden" name="id">
                        <div class="space-y-3">
                             <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Name</label>
                             <input type="text" name="name" required placeholder="Enter name" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                        </div>
                        <div class="space-y-3">
                             <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Role</label>
                             <input type="text" name="role" placeholder="Enter role" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                        </div>
                        <div class="pt-6">
                            <button type="submit" id="submit-btn" class="w-full h-18 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 py-5">
                                Save Member
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = modalPortal.querySelector('#team-modal');
    const modalContent = modalPortal.querySelector('#team-modal-content');
    const form = modalPortal.querySelector('#team-form');
    const modalTitle = modalPortal.querySelector('#modal-title');
    const submitBtn = modalPortal.querySelector('#submit-btn');

    const openModal = (member = null) => {
        if (member) {
            modalTitle.textContent = 'Edit Member';
            submitBtn.textContent = 'Update';
            form.id.value = member.id;
            form.name.value = member.name;
            form.role.value = member.role || '';
        } else {
            modalTitle.textContent = 'New Member';
            submitBtn.textContent = 'Add';
            form.reset();
            form.id.value = '';
        }

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

    container.querySelector('#add-member-btn').onclick = () => openModal();
    modalPortal.querySelector('#close-team-modal').onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('team.php', data);
            store.update('team', await api.get('team.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Operation failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-member-btn')) {
            const id = e.target.closest('.delete-member-btn').dataset.id;
            if (confirm('Delete team member?')) {
                await api.delete(`team.php?id=${id}`);
                const [newTeam, newTasks] = await Promise.all([
                    api.get('team.php'),
                    api.get('planner.php')
                ]);
                store.update('team', newTeam);
                store.update('tasks', newTasks);
                refreshView();
            }
        }

        if (e.target.closest('.edit-member-btn')) {
            const id = e.target.closest('.edit-member-btn').dataset.id;
            const member = team.find(m => m.id == id);
            if (member) openModal(member);
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderTeam());
    }

    return container;
}
