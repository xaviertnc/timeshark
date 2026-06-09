import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { ConfirmModal } from './confirm-modal.js';

export async function renderTeam() {
    const state = store.get();
    const team = state.team || [];

    const container = document.createElement('div');
    container.className = "max-w-7xl mx-auto pb-20 px-4";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-16 px-2">
            <div>
                 <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Resources</h2>
                 <h1 class="text-3xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Team.</span></h1>
            </div>
            <button id="add-member-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
                Add Team Member
            </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            ${team.map(m => `
                <div class="team-card-btn cursor-pointer bg-card rounded-xl p-5 border border-soft shadow-sm group hover:-translate-y-1 transition-all duration-300 relative flex flex-col items-center text-center" data-id="${m.id}">
                     <div class="absolute top-2 left-2 flex gap-1 z-10">
                         <button class="default-member-btn text-dim/50 hover:text-yellow-400 transition-all p-1" data-id="${m.id}" title="Set as Default Assignee">
                            <svg class="w-4 h-4 ${m.is_default ? 'text-yellow-400 fill-current opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100 hover:scale-110'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                        </button>
                     </div>
                     <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-0.5 z-10">
                        <button class="delete-member-btn text-red-500/60 hover:text-red-400 transition-all hover:scale-110 p-1" data-id="${m.id}" title="Delete Member">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>

                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-[12px] font-black text-primary mb-4 shrink-0 transition-all ${m.is_default ? 'ring-2 ring-primary/40 shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : ''}">
                        ${m.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div class="min-w-0 w-full px-1">
                        <h3 class="text-base font-bold text-main tracking-tight mb-1 truncate" title="${m.name}">${m.name}</h3>
                        <p class="text-[8.5px] font-black text-dim uppercase tracking-widest truncate" title="${m.role || 'Contributor'}">${m.role || 'Contributor'} ${m.is_default ? ' <span class="text-yellow-500/80">(Def)</span>' : ''}</p>
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
                <div class="bg-card rounded-2xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0 text-center relative max-h-[90vh] overflow-y-auto" id="team-modal-content">
                    <button id="close-team-modal" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5 z-10" title="Close">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

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
                        <div class="flex items-center justify-center gap-2 pt-2">
                            <input type="checkbox" name="is_default" id="is_default_checkbox" value="true" class="w-4 h-4 bg-app border border-white/10 rounded accent-primary">
                            <label for="is_default_checkbox" class="text-[10px] font-black text-dim uppercase tracking-widest cursor-pointer select-none">Set as Default Assignee</label>
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
            form.is_default.checked = !!member.is_default;
        } else {
            modalTitle.textContent = 'New Member';
            submitBtn.textContent = 'Add';
            form.reset();
            form.id.value = '';
            form.is_default.checked = false;
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
        if (e.target.closest('.default-member-btn')) {
            e.stopPropagation();
            const id = e.target.closest('.default-member-btn').dataset.id;
            const member = team.find(m => m.id == id);
            if (member) {
                const isCurrentlyDefault = !!member.is_default;
                await api.post('team.php', { id: member.id, is_default: !isCurrentlyDefault });
                store.update('team', await api.get('team.php'));
                refreshView();
            }
            return;
        }

        if (e.target.closest('.delete-member-btn')) {
            e.stopPropagation();
            const id = e.target.closest('.delete-member-btn').dataset.id;
            const confirmed = await ConfirmModal.show('Delete team member?', { confirmText: 'Delete', isDestructive: true });
            if (confirmed) {
                await api.delete(`team.php?id=${id}`);
                const [newTeam, newTasks] = await Promise.all([
                    api.get('team.php'),
                    api.get('planner.php')
                ]);
                store.update('team', newTeam);
                store.update('tasks', newTasks);
                refreshView();
            }
            return;
        }

        if (e.target.closest('.team-card-btn')) {
            const id = e.target.closest('.team-card-btn').dataset.id;
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
