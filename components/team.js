import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { ConfirmModal } from './confirm-modal.js';

let viewMode = localStorage.getItem('team_view_mode') || 'grid';

export async function renderTeam() {
    const state = store.get();
    const team = state.team || [];

    const container = document.createElement('div');
    container.className = "max-w-7xl mx-auto pb-20 px-4";

    container.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-16 px-2 gap-4">
            <div>
                 <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Resources</h2>
                 <h1 class="text-3xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Team.</span></h1>
            </div>
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5 p-1 bg-card/30 rounded-xl border border-white/5 mr-4 hidden md:flex">
                    <button id="view-list-btn" class="w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dim/50 hover:text-main'}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                    </button>
                    <button id="view-grid-btn" class="w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dim/50 hover:text-main'}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z"></path></svg>
                    </button>
                </div>
                <button id="add-member-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px] transform active:scale-95 leading-none">
                    + Add Member
                </button>
            </div>
        </div>

        ${viewMode === 'list' ? `
            <div class="zen-card bg-card border border-soft shadow-sm overflow-hidden backdrop-blur-sm relative mb-10">
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr class="bg-app/50 border-b border-soft">
                      <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest w-16 text-center border-r border-white/5">Icon</th>
                      <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest min-w-[200px]">Team Member</th>
                      <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest w-48 text-center border-l border-r border-white/5">Role</th>
                      <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest w-32 text-center border-r border-white/5">Status</th>
                      <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest w-32 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${team.map(m => {
                      const isActive = m.is_active === undefined || Number(m.is_active) === 1;
                      return `
                      <tr class="border-b border-soft last:border-b-0 hover:bg-app/40 transition-all group/row cursor-pointer team-card-btn bg-card border-t-[3px] border-t-card ${!isActive ? 'opacity-40 grayscale' : ''}" data-id="${m.id}">
                        <td class="px-4 py-2 text-center border-r border-white/5 relative">
                            <div class="w-8 h-8 rounded-full bg-app flex items-center justify-center text-primary border border-soft mx-auto shadow-sm ${m.is_default && isActive ? 'ring-2 ring-primary/40 shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : ''}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            </div>
                        </td>
                        <td class="px-4 py-2 font-bold text-main text-sm truncate group-hover/row:text-primary transition-colors h-[48px]">
                            <div class="flex items-center gap-2">
                                ${m.name}
                                ${m.is_default ? '<svg class="w-3.5 h-3.5 text-yellow-500/80 fill-current shrink-0" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>' : ''}
                            </div>
                        </td>
                        <td class="px-4 py-2 text-[10px] font-black text-dim uppercase tracking-widest text-center truncate border-l border-r border-white/5 opacity-70">${m.role || 'Contributor'}</td>
                        <td class="px-4 py-2 text-center border-r border-white/5">
                            ${isActive 
                              ? `<span class="text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-1 rounded-md border inline-block w-full truncate border-primary/20 bg-primary/10 text-primary">Active</span>`
                              : `<span class="text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-1 rounded-md border inline-block w-full truncate border-white/10 bg-white/5 text-dim">Inactive</span>`
                            }
                        </td>
                        <td class="px-4 py-2 text-right">
                            <div class="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all transform translate-x-1 group-hover/row:translate-x-0">
                                <button class="default-member-btn w-7 h-7 flex items-center justify-center rounded-md text-dim/30 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all bg-app" data-id="${m.id}" title="Set as Default">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                                </button>
                                <button class="delete-member-btn w-7 h-7 flex items-center justify-center rounded-md text-dim/30 hover:text-red-500 hover:bg-red-500/10 transition-all bg-app" data-id="${m.id}" title="Delete Member">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </td>
                      </tr>
                    `;
                    }).join('')}
                    ${team.length === 0 ? `
                        <tr>
                            <td colspan="5" class="py-20 text-center opacity-20"><p class="text-[10px] font-black uppercase tracking-[0.4em]">Sole Operator</p></td>
                        </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            </div>
        ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            ${team.map(m => {
                const isActive = m.is_active === undefined || Number(m.is_active) === 1;
                return `
                <div class="team-card-btn cursor-pointer bg-card rounded-2xl p-5 border border-soft shadow-sm group hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex items-center gap-4 ${!isActive ? 'opacity-40 grayscale' : ''}" data-id="${m.id}">
                    
                    <div class="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>

                    <div class="w-10 h-10 rounded-full bg-app flex-shrink-0 flex items-center justify-center text-primary border border-soft transition-all ${m.is_default && isActive ? 'ring-2 ring-primary/40 shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : ''}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    
                    <div class="flex flex-col min-w-0 flex-1 pr-2 text-left">
                        <h3 class="text-base font-bold text-main tracking-tight truncate flex items-center gap-2" title="${m.name}">
                            ${m.name}
                            ${m.is_default ? '<svg class="w-3.5 h-3.5 text-yellow-500/80 fill-current" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>' : ''}
                        </h3>
                        <p class="text-muted font-medium text-xs truncate opacity-70" title="${m.role || 'Contributor'}">${m.role || 'Contributor'}</p>
                    </div>

                    <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 flex-shrink-0 bg-card/90 backdrop-blur-sm rounded-lg p-1 z-10">
                        <button class="default-member-btn text-dim/50 hover:text-yellow-400 transition-colors p-2" data-id="${m.id}" title="Set as Default Assignee">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                        </button>
                        <button class="delete-member-btn text-dim/50 hover:text-red-400 transition-colors p-2" data-id="${m.id}" title="Delete Member">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            }).join('')}
        </div>

        ${team.length === 0 ? `
            <div class="text-center py-20 opacity-20">
                <p class="text-[10px] font-black uppercase tracking-[0.4em]">Sole Operator</p>
            </div>
        ` : ''}
        `}
    `;

    const modalPortal = document.getElementById('modal-portal');
    modalPortal.innerHTML = `
        <div id="team-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto overflow-y-auto py-6 px-4 flex items-start justify-center">
            <div class="min-h-[calc(100vh-3rem)] w-full flex items-start justify-center">
                <div class="bg-card rounded-2xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0 text-center relative my-auto mx-auto" id="team-modal-content">
                    <button id="close-team-modal" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5 z-10" title="Close">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

                    <div class="mb-10">
                        <h3 class="text-2xl font-bold text-main tracking-tight" id="modal-title">New Team Member</h3>
                        <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Member Details</p>
                    </div>

                    <form id="team-form" class="flex flex-col gap-8">
                        <input type="hidden" name="id">
                        <div class="space-y-3">
                             <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Name</label>
                             <input type="text" name="name" required placeholder="Enter name" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                        </div>
                        <div class="space-y-3">
                             <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Role</label>
                             <input type="text" name="role" placeholder="Enter role" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                        </div>
                        <div class="flex flex-col items-center justify-center gap-3 pt-2">
                            <div class="flex items-center gap-2">
                                <input type="checkbox" name="is_active" id="is_active_checkbox" value="1" class="w-4 h-4 bg-app border border-white/10 rounded accent-primary" checked>
                                <label for="is_active_checkbox" class="text-[10px] font-black text-dim uppercase tracking-widest cursor-pointer select-none">Active Member</label>
                            </div>
                            <div class="flex items-center gap-2">
                                <input type="checkbox" name="is_default" id="is_default_checkbox" value="true" class="w-4 h-4 bg-app border border-white/10 rounded accent-primary">
                                <label for="is_default_checkbox" class="text-[10px] font-black text-dim uppercase tracking-widest cursor-pointer select-none">Set as Default Assignee</label>
                            </div>
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
            form.is_active.checked = member.is_active === undefined ? true : Number(member.is_active) === 1;
        } else {
            modalTitle.textContent = 'New Member';
            submitBtn.textContent = 'Add';
            form.reset();
            form.id.value = '';
            form.is_default.checked = false;
            form.is_active.checked = true;
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

    const listBtn = container.querySelector('#view-list-btn');
    if (listBtn) listBtn.onclick = () => { localStorage.setItem('team_view_mode', 'list'); viewMode = 'list'; refreshView(); };
    const gridBtn = container.querySelector('#view-grid-btn');
    if (gridBtn) gridBtn.onclick = () => { localStorage.setItem('team_view_mode', 'grid'); viewMode = 'grid'; refreshView(); };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        data.is_active = form.is_active.checked ? 1 : 0;
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
