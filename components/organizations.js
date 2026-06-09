/**
 * components/organizations.js
 *
 * Organizations & Clients Management - 28 Jan 2026
 *
 * Purpose: Manage organizations (companies) and clients (people).
 *
 * @package Time Shark
 *
 * @author Senpai
 *
 * Last 3 version commits:
 * @version 1.0 - INIT - 28 Jan 2026 - Initial version from customers.js
 * @version 1.1 - UPD - 28 Jan 2026 - Refined UI and logic for Organizations/Clients
 * @version 1.2 - UPD - 28 Jan 2026 - Multi-org support and selectable colors
 */

import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { ConfirmModal } from './confirm-modal.js';


export async function renderOrganizations() {
  const state = store.get();
  const customers = state.customers || [];

  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto pb-20 px-4';

  container.innerHTML = `
    <div class="flex items-end justify-between mb-16 px-2">
      <div>
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">CRM</h2>
        <h1 class="text-3xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Organizations & Clients.</span></h1>
      </div>
      <div class="flex gap-4">
        <button id="add-org-btn" class="bg-secondary hover:bg-slate-700 text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
          New Organization
        </button>
        <button id="add-client-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
          New Client
        </button>
      </div>
    </div>

    <div class="space-y-20">
      ${customers.filter(c => c.is_client == 1).map(org => {
    const orgClients = customers.filter(c => {
      if (c.is_client == 1) return false;
      if (c.client_id === org.id) return true;
      if (c.organization_ids && Array.isArray(c.organization_ids) && c.organization_ids.includes(org.id)) return true;
      return false;
    });

    return `
          <div class="space-y-8">
            <div class="flex items-center gap-4 px-2 border-b border-soft pb-6">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style="background-color: ${org.color}20; border: 2px solid ${org.color}40">
                <svg class="w-6 h-6" style="color: ${org.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
              <div>
                <h2 class="text-3xl font-bold text-main tracking-tight leading-none">${org.name}</h2>
                <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-3 opacity-50">Organization Profile</p>
              </div>
              <div class="flex gap-2 ml-auto">
                <button class="add-client-to-org-btn bg-primary/10 hover:bg-primary/20 text-primary transition-all px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2" data-org-id="${org.id}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                  Add Client
                </button>
                <button class="edit-org-btn text-dim/50 hover:text-primary transition-colors p-3 bg-app rounded-xl" data-id="${org.id}">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button class="delete-btn text-dim/50 hover:text-red-400 transition-colors p-3 bg-app rounded-xl" data-id="${org.id}">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              ${orgClients.map(client => `
                <div class="bg-card rounded-2xl p-5 border border-soft shadow-sm group hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex items-center gap-4">
                  <div class="absolute top-0 left-0 w-1 h-full" style="background-color: ${org.color}40"></div>
                  
                  <div class="w-10 h-10 rounded-full bg-app flex-shrink-0 flex items-center justify-center text-primary border border-soft">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  
                  <div class="flex flex-col min-w-0 flex-1 pr-2">
                    <h3 class="text-base font-bold text-main tracking-tight truncate">${client.name}</h3>
                    <p class="text-muted font-medium text-xs truncate opacity-70">${client.email || 'No email provided'}</p>
                  </div>

                  <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 flex-shrink-0 bg-card/90 backdrop-blur-sm rounded-lg p-1">
                    <button class="edit-client-btn text-dim/50 hover:text-primary transition-colors p-2" data-id="${client.id}">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button class="delete-btn text-dim/50 hover:text-red-400 transition-colors p-2" data-id="${client.id}">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ` ).join('')}
              ${orgClients.length === 0 ? `
                <div class="col-span-full py-12 opacity-30 text-center border-2 border-dashed border-soft rounded-3xl bg-app/50">
                  <p class="text-[10px] font-black uppercase tracking-[0.5em]">No clients assigned to this organization</p>
                </div>
              ` : ''}
            </div>
          </div>
        `;
  }).join('')}

      ${customers.some(c => c.is_client == 0 && (!c.client_id && (!c.organization_ids || c.organization_ids.length === 0))) ? `
        <div class="space-y-8">
          <div class="px-2 border-b border-soft pb-6">
            <h2 class="text-3xl font-bold text-main tracking-tight">Individual Clients</h2>
            <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-3 opacity-50">Private / Unassociated Contacts</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            ${customers.filter(c => c.is_client == 0 && (!c.client_id && (!c.organization_ids || c.organization_ids.length === 0))).map(client => `
              <div class="bg-card rounded-2xl p-5 border border-soft shadow-sm group hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-app flex-shrink-0 flex items-center justify-center text-primary border border-soft">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                
                <div class="flex flex-col min-w-0 flex-1 pr-2">
                  <h3 class="text-base font-bold text-main tracking-tight truncate">${client.name}</h3>
                  <p class="text-muted font-medium text-xs truncate opacity-70">${client.email || 'No email provided'}</p>
                </div>

                <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 flex-shrink-0 bg-card/90 backdrop-blur-sm rounded-lg p-1">
                  <button class="edit-client-btn text-dim/50 hover:text-primary transition-colors p-2" data-id="${client.id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </button>
                  <button class="delete-btn text-dim/50 hover:text-red-400 transition-colors p-2" data-id="${client.id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
            ` ).join('')}
          </div>
        </div>
      ` : ''}
    </div>

    ${customers.length === 0 ? `
      <div class="col-span-full py-32 opacity-20 text-center">
        <p class="text-[10px] font-black uppercase tracking-[0.4em]">The registry is currently empty</p>
      </div>
    ` : ''}
  `;

  const modalPortal = document.getElementById('modal-portal');
  modalPortal.innerHTML = `
    <div id="org-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
      <div class="min-h-screen w-full flex items-center justify-center p-4">
        <div class="bg-card rounded-2xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0 text-center relative max-h-[90vh] overflow-y-auto" id="org-modal-content">
          <button id="close-modal-btn" class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5 z-10" title="Close">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div class="mb-10">
            <h3 class="text-2xl font-bold text-main tracking-tight" id="modal-title">New Organization</h3>
            <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2" id="modal-subtitle">Details</p>
          </div>

          <form id="org-form" class="space-y-6">
            <input type="hidden" name="id">
            <input type="hidden" name="is_client" value="1">
            <div class="space-y-2">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block" id="name-label">Organization Name</label>
              <input type="text" name="name" required placeholder="Enter name" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
            </div>
            <div class="space-y-2" id="email-field">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Email Address</label>
              <input type="email" name="email" placeholder="Enter email" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
            </div>
            <div class="space-y-2" id="org-select-field">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Belongs to Organization(s)</label>
              <select name="organization_ids" multiple class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold appearance-none min-h-[120px]">
                ${customers.filter(c => c.is_client == 1).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
              <p class="text-[8px] text-dim mt-1">Hold Ctrl (Cmd) to select multiple organizations</p>
            </div>
            <div class="space-y-3" id="color-field">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Brand Color</label>
              <div class="flex gap-3 justify-center flex-wrap">
                ${['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'].map((color, idx) => `
                  <label class="cursor-pointer group">
                    <input type="radio" name="color" value="${color}" class="peer sr-only" ${idx === 0 ? 'checked' : ''}>
                    <div class="w-8 h-8 rounded-full bg-[${color}] peer-checked:ring-offset-2 peer-checked:ring-2 peer-checked:ring-primary/40 transition-all border border-white/10 hover:scale-110" style="background-color: ${color}"></div>
                  </label>
                ` ).join('')}
              </div>
            </div>
            <div class="pt-6">
              <button type="submit" id="submit-btn" class="w-full h-18 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 py-5">
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const modal = modalPortal.querySelector('#org-modal');
  const modalContent = modalPortal.querySelector('#org-modal-content');
  const form = modalPortal.querySelector('#org-form');
  const modalTitle = modalPortal.querySelector('#modal-title');
  const modalSubtitle = modalPortal.querySelector('#modal-subtitle');
  const nameLabel = modalPortal.querySelector('#name-label');
  const submitBtn = modalPortal.querySelector('#submit-btn');

  const openModal = (data = null, isOrg = false, orgId = null) => {
    form.reset();
    form.is_client.value = isOrg ? '1' : '0';
    modalPortal.querySelector('#email-field').style.display = isOrg ? 'none' : 'block';
    modalPortal.querySelector('#org-select-field').style.display = isOrg ? 'none' : 'block';
    modalPortal.querySelector('#color-field').style.display = isOrg ? 'block' : 'none';

    nameLabel.textContent = isOrg ? 'Organization Name' : 'Client Name';
    modalSubtitle.textContent = isOrg ? 'Organization Profile' : 'Client Profile';

    if (orgId) {
      const select = form.querySelector('select[name="organization_ids"]');
      Array.from(select.options).forEach(opt => opt.selected = opt.value === orgId);
    }

    if (data) {
      modalTitle.textContent = isOrg ? 'Edit Organization' : 'Edit Client';
      form.id.value = data.id;
      form.name.value = data.name;
      if (isOrg) {
        const colorRadio = form.querySelector(`input[name="color"][value="${data.color}"]`);
        if (colorRadio) colorRadio.checked = true;
      } else {
        form.email.value = data.email || '';
        const orgIds = data.organization_ids || (data.client_id ? [data.client_id] : []);
        const select = form.querySelector('select[name="organization_ids"]');
        Array.from(select.options).forEach(opt => opt.selected = orgIds.includes(opt.value));
      }
    } else {
      modalTitle.textContent = isOrg ? 'New Organization' : 'New Client';
      form.id.value = '';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
      modalContent.classList.remove('scale-95', 'opacity-0');
      modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
  };

  const addOrgBtn = container.querySelector('#add-org-btn');
  if (addOrgBtn) addOrgBtn.onclick = () => openModal(null, true);
  const addClientBtn = container.querySelector('#add-client-btn');
  if (addClientBtn) addClientBtn.onclick = () => openModal(null, false);

  container.addEventListener('click', async (e) => {
    const addClientToOrgBtn = e.target.closest('.add-client-to-org-btn');
    if (addClientToOrgBtn) {
      openModal(null, false, addClientToOrgBtn.dataset.orgId);
    }

    const editOrgBtn = e.target.closest('.edit-org-btn');
    if (editOrgBtn) {
      const org = customers.find(c => c.id == editOrgBtn.dataset.id);
      openModal(org, true);
    }

    const editClientBtn = e.target.closest('.edit-client-btn');
    if (editClientBtn) {
      const client = customers.find(c => c.id == editClientBtn.dataset.id);
      openModal(client, false);
    }

    if (e.target.closest('.delete-btn')) {
      const id = e.target.closest('.delete-btn').dataset.id;
      const item = customers.find(c => c.id == id);
      const label = item.is_client == 1 ? 'organization' : 'client';
      const confirmed = await ConfirmModal.show(`Delete ${label}?`, { confirmText: 'Delete', isDestructive: true });
      if (confirmed) {
        await api.delete(`organizations.php?id=${id}`);
        const [newCustomers, newProjects] = await Promise.all([
          api.get('organizations.php'),
          api.get('projects.php')
        ]);
        store.update('customers', newCustomers);
        store.update('projects', newProjects);
        refreshView();
      }
    }
  });

  const closeModal = () => {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      form.reset();
    }, 200);
  };

  modalPortal.querySelector('#close-modal-btn').onclick = closeModal;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Handle multiple selection for organization_ids
    if (data.is_client === '0') {
      data.organization_ids = Array.from(formData.getAll('organization_ids'));
      // Keep client_id for backward compatibility (use first selected org)
      data.client_id = data.organization_ids[0] || '';
    }

    try {
      await api.post('organizations.php', data);
      store.update('customers', await api.get('organizations.php'));
      closeModal();
      refreshView();
    } catch (err) {
      alert('Operation failed');
    }
  };

  async function refreshView() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(await renderOrganizations());
  }

  return container;
}

