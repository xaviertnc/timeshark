/**
 * assets/components/projects.js
 *
 * Project Management - 28 Jan 2026
 *
 * Purpose: Manage projects and link them to Organizations and Clients.
 *
 * @package Chompy
 *
 * @author Senpai
 *
 * Last 3 version commits:
 * @version 1.0 - INIT - 28 Jun 2025 - Initial commit
 * @version 1.1 - UPD - 28 Jan 2026 - Align with Organizations & Clients terminology
 * @version 1.2 - UPD - 28 Jan 2026 - Fixed form logic and multi-org support
 * @version 1.3 - UPD - 28 Jan 2026 - Added List/Grid toggle, reordering, and progress tracking
 */

import { store } from '../utils/store.js';
import { api } from '../utils/api.js';


let viewMode = localStorage.getItem('project_view_mode') || 'grid';


export async function renderProjects() {
  const state = store.get();
  const projects = (state.projects || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const customers = state.customers || [];

  const container = document.createElement('div');
  container.className = 'max-w-6xl mx-auto animate-slide-up pb-20';

  const calculateProgress = (p) => {
    if (p.progress !== undefined) return p.progress;
    if (!p.todos || p.todos.length === 0) return 0;
    const completed = p.todos.filter(t => t.completed).length;
    return Math.round((completed / p.todos.length) * 100);
  };

  container.innerHTML = `
    <div class="flex items-end justify-between mb-16 px-2">
      <div>
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-3">Portfolio</h2>
        <h1 class="text-3xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Projects.</span></h1>
      </div>
      <div class="flex items-center gap-6">
        <div class="flex bg-app p-1 rounded-xl border border-soft">
          <button id="toggle-grid" class="p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-main'}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          </button>
          <button id="toggle-list" class="p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-main'}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </div>
        <button id="add-project-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
          Create Project
        </button>
      </div>
    </div>

    ${viewMode === 'grid' ? `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${ projects.map( p => {
          const org = customers.find( c => c.id == p.customer_id && c.is_client == 1 );
          const client = customers.find( c => c.id == p.client_id && c.is_client == 0 );
          const progress = calculateProgress(p);
          const status = p.status || 'Active';
          const statusColor = status === 'Active' ? 'text-primary bg-primary/10' : (status === 'Completed' ? 'text-green-500 bg-green-500/10' : 'text-dim bg-app');

          return `
            <div class="bg-card rounded-2xl p-8 border border-soft shadow-sm group hover:-translate-y-1 transition-all duration-300 relative project-card" data-id="${ p.id }">
              <div class="absolute top-6 left-6">
                <span class="text-[7px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md ${statusColor}">${status}</span>
              </div>
              <div class="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-2">
                <button class="edit-btn text-dim/50 hover:text-primary transition-colors p-2" data-id="${ p.id }">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button class="delete-btn text-dim/50 hover:text-red-400 transition-colors p-2" data-id="${ p.id }">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>

              <div class="flex flex-col h-full pointer-events-none items-center text-center">
                <div class="w-10 h-1.5 rounded-full mb-6" style="background-color: ${ p.color || '#eceff1' }"></div>
                <h3 class="text-xl font-bold text-main mb-1 leading-tight">${ p.name }</h3>
                <p class="text-[10px] font-black text-dim uppercase tracking-[0.2em] mb-6">
                  ${ org ? org.name : 'Individual' }
                  ${ client ? `<span class="opacity-40 mx-1">/</span> <span class="text-primary">${ client.name }</span>` : '' }
                </p>
                
                <div class="w-full bg-app rounded-full h-1.5 mb-2 overflow-hidden">
                  <div class="h-full bg-primary transition-all duration-1000" style="width: ${progress}%"></div>
                </div>
                <div class="flex justify-between w-full text-[8px] font-black uppercase tracking-widest text-dim">
                  <span>Progress</span>
                  <span class="text-main">${progress}%</span>
                </div>
              </div>
            </div>
          `;
        } ).join('') }
      </div>
    ` : `
      <div class="bg-card rounded-2xl border border-soft shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-app border-b border-soft">
              <th class="p-4 text-[9px] font-black text-dim uppercase tracking-widest w-12 text-center">#</th>
              <th class="p-4 text-[9px] font-black text-dim uppercase tracking-widest">Project</th>
              <th class="p-4 text-[9px] font-black text-dim uppercase tracking-widest">Status</th>
              <th class="p-4 text-[9px] font-black text-dim uppercase tracking-widest">Owner / Contact</th>
              <th class="p-4 text-[9px] font-black text-dim uppercase tracking-widest">Timeline</th>
              <th class="p-4 text-[9px] font-black text-dim uppercase tracking-widest w-40">Progress</th>
              <th class="p-4 text-[9px] font-black text-dim uppercase tracking-widest w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${ projects.map( (p, idx) => {
              const org = customers.find( c => c.id == p.customer_id && c.is_client == 1 );
              const client = customers.find( c => c.id == p.client_id && c.is_client == 0 );
              const progress = calculateProgress(p);
              const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
              
              return `
                <tr class="border-b border-soft last:border-b-0 hover:bg-app/50 transition-colors group">
                  <td class="p-4">
                    <div class="flex flex-col items-center gap-0.5">
                      <button class="move-up-btn text-dim/20 hover:text-primary transition-colors ${idx === 0 ? 'invisible' : ''}" data-id="${p.id}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"></path></svg>
                      </button>
                      <button class="move-down-btn text-dim/20 hover:text-primary transition-colors ${idx === projects.length - 1 ? 'invisible' : ''}" data-id="${p.id}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                      </button>
                    </div>
                  </td>
                  <td class="p-4">
                    <div class="flex items-center gap-3">
                      <div class="w-1 h-6 rounded-full" style="background-color: ${p.color || '#eceff1'}"></div>
                      <span class="font-bold text-main text-sm tracking-tight">${p.name}</span>
                    </div>
                  </td>
                  <td class="p-4">
                    <span class="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-app border border-soft ${p.status === 'Active' ? 'text-primary' : (p.status === 'Completed' ? 'text-green-500' : 'text-dim')}">${p.status || 'Active'}</span>
                  </td>
                  <td class="p-4">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-main">${org ? org.name : 'Individual'}</span>
                      ${client ? `<span class="text-[10px] text-dim/50">•</span> <span class="text-[10px] text-dim font-medium">${client.name}</span>` : ''}
                    </div>
                  </td>
                  <td class="p-4">
                    <div class="flex items-center gap-4 text-[9px] font-black uppercase tracking-tighter">
                      <div class="flex flex-col">
                        <span class="text-dim/30 text-[7px]">Created</span>
                        <span class="text-main">${formatDate(p.created_at)}</span>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-dim/30 text-[7px]">Started</span>
                        <span class="text-main">${formatDate(p.started_at)}</span>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-dim/30 text-[7px]">Done</span>
                        <span class="text-main">${formatDate(p.completed_at)}</span>
                      </div>
                    </div>
                  </td>
                  <td class="p-4">
                    <div class="flex items-center gap-3">
                      <div class="flex-1 bg-app rounded-full h-1 overflow-hidden border border-soft">
                        <div class="h-full bg-primary transition-all duration-1000" style="width: ${progress}%"></div>
                      </div>
                      <span class="text-[9px] font-black text-main tabular-nums">${progress}%</span>
                    </div>
                  </td>
                  <td class="p-4 text-right">
                    <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button class="edit-btn p-1.5 text-dim/50 hover:text-primary transition-colors" data-id="${p.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>
                      <button class="delete-btn p-1.5 text-dim/50 hover:text-red-400 transition-colors" data-id="${p.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') }
          </tbody>
        </table>
      </div>
    `}

    ${ projects.length === 0 ? `
      <div class="text-center py-20 opacity-30">
        <p class="text-[10px] font-black uppercase tracking-[0.4em]">Ready for work</p>
      </div>
    ` : '' }
  `;

  const modalPortal = document.getElementById('modal-portal');
  modalPortal.innerHTML = `
    <div id="project-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
      <div class="min-h-screen w-full flex items-center justify-center p-4">
        <div class="bg-card rounded-3xl shadow-xl w-full max-w-2xl p-10 transform transition-all scale-95 opacity-0 text-center relative" id="project-modal-content">
          <button id="close-project-modal" class="absolute top-6 right-8 text-dim hover:text-main text-2xl transition-colors">&times;</button>

          <div class="mb-10">
            <h3 class="text-2xl font-bold text-main tracking-tight" id="modal-title">New Project</h3>
            <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Project Specification</p>
          </div>

          <form id="project-form" class="space-y-8">
            <input type="hidden" name="id">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div class="space-y-6">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Project Name</label>
                  <input type="text" name="name" required placeholder="Enter name" class="w-full py-4 px-6 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Status</label>
                  <div class="relative group">
                    <select name="status" class="w-full bg-app border-none rounded-2xl py-4 px-6 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20">
                      <option value="Active">Active</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Manual Progress (%)</label>
                  <div class="bg-app p-6 rounded-2xl space-y-3">
                    <input type="range" name="progress" min="0" max="100" value="0" class="w-full accent-primary">
                    <div class="flex justify-between text-[8px] font-black text-dim uppercase">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-6">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Organization</label>
                  <div class="relative group">
                    <select name="customer_id" class="w-full bg-app border-none rounded-2xl py-4 px-6 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20">
                      <option value="">Individual / None</option>
                      ${ customers.filter( c => c.is_client == 1 ).map( c => `<option value="${ c.id }">${ c.name }</option>` ).join('') }
                    </select>
                    <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Client Contact</label>
                  <div class="relative group">
                    <select name="client_id" class="w-full bg-app border-none rounded-2xl py-4 px-6 appearance-none cursor-pointer text-main font-bold focus:ring-2 focus:ring-primary/20">
                      <option value="">Select Client...</option>
                      <!-- Populated dynamically -->
                    </select>
                    <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Start Date</label>
                    <input type="date" name="started_at" class="w-full py-4 px-6 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-dim uppercase tracking-widest block ml-1">Completed Date</label>
                    <input type="date" name="completed_at" class="w-full py-4 px-6 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4 pt-4 border-t border-soft">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Color Label</label>
              <div class="flex gap-4 justify-center flex-wrap">
                ${ ['#26a69a', '#fbc02d', '#607d8b', '#ab47bc', '#f4511e', '#5c6bc0'].map( ( color, idx ) => `
                  <label class="cursor-pointer group">
                    <input type="radio" name="color" value="${ color }" class="peer sr-only" ${ idx === 0 ? 'checked' : '' }>
                    <div class="w-12 h-12 rounded-2xl bg-[${ color }] peer-checked:ring-offset-2 peer-checked:ring-2 peer-checked:ring-primary/40 transition-all border border-white/10 hover:scale-110 shadow-sm" style="background-color: ${ color }"></div>
                  </label>
                ` ).join('') }
              </div>
            </div>

            <div class="pt-6">
              <button type="submit" id="submit-btn" class="w-full h-18 bg-primary hover:bg-primary-dark text-white font-black text-[11px] uppercase tracking-[0.4em] rounded-2xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 py-6">
                Save Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const projModal = modalPortal.querySelector('#project-modal');
  const projModalContent = modalPortal.querySelector('#project-modal-content');
  const projectForm = modalPortal.querySelector('#project-form');
  const modalTitle = modalPortal.querySelector('#modal-title');
  const submitBtn = modalPortal.querySelector('#submit-btn');
  const orgSelect = projectForm.querySelector('select[name="customer_id"]');
  const clientSelect = projectForm.querySelector('select[name="client_id"]');

  const updateClientOptions = ( orgId, selectedClientId = null ) => {
    let filteredClients = [];
    if ( orgId ) {
      filteredClients = customers.filter( c => {
        if ( c.is_client == 1 ) return false;
        if ( c.client_id === orgId ) return true;
        if ( c.organization_ids && Array.isArray( c.organization_ids ) && c.organization_ids.includes( orgId ) ) return true;
        return false;
      } );
    } else {
      filteredClients = customers.filter( c => c.is_client == 0 && ( ! c.client_id && ( ! c.organization_ids || c.organization_ids.length === 0 ) ) );
    }

    clientSelect.innerHTML = '<option value="">Select Client...</option>' +
      filteredClients.map( c => `<option value="${ c.id }" ${ c.id == selectedClientId ? 'selected' : '' }>${ c.name }</option>` ).join('');
  };

  orgSelect.onchange = ( e ) => updateClientOptions( e.target.value );

  const openProjModal = ( project = null ) => {
    if ( project ) {
      modalTitle.textContent = 'Edit Project';
      submitBtn.textContent = 'Update';
      projectForm.id.value = project.id;
      projectForm.name.value = project.name;
      projectForm.status.value = project.status || 'Active';
      projectForm.started_at.value = project.started_at ? project.started_at.split('T')[0] : '';
      projectForm.completed_at.value = project.completed_at ? project.completed_at.split('T')[0] : '';
      projectForm.progress.value = project.progress || 0;
      
      const org = customers.find(c => c.id == project.customer_id && c.is_client == 1);
      projectForm.customer_id.value = org ? org.id : '';
      
      updateClientOptions( projectForm.customer_id.value, project.client_id );
      const colorRadio = projectForm.querySelector( `input[name="color"][value="${ project.color }"]` );
      if ( colorRadio ) colorRadio.checked = true;
    } else {
      modalTitle.textContent = 'New Project';
      submitBtn.textContent = 'Create';
      projectForm.reset();
      projectForm.id.value = '';
      updateClientOptions( '' );
    }

    projModal.classList.remove('hidden');
    projModal.classList.add('flex');
    setTimeout( () => {
      projModalContent.classList.remove('scale-95', 'opacity-0');
      projModalContent.classList.add('scale-100', 'opacity-100');
    }, 10 );
  };

  const closeProjModal = () => {
    projModalContent.classList.remove('scale-100', 'opacity-100');
    projModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout( () => {
      projModal.classList.add('hidden');
      projModal.classList.remove('flex');
      projectForm.reset();
    }, 200 );
  };

  container.querySelector('#add-project-btn').onclick = () => openProjModal();
  modalPortal.querySelector('#close-project-modal').onclick = closeProjModal;

  container.querySelector('#toggle-grid').onclick = () => {
    viewMode = 'grid';
    localStorage.setItem('project_view_mode', 'grid');
    refreshView();
  };
  container.querySelector('#toggle-list').onclick = () => {
    viewMode = 'list';
    localStorage.setItem('project_view_mode', 'list');
    refreshView();
  };

  projectForm.onsubmit = async ( e ) => {
    e.preventDefault();
    const data = Object.fromEntries( new FormData( projectForm ).entries() );
    try {
      await api.post( 'projects.php', data );
      store.update( 'projects', await api.get('projects.php') );
      closeProjModal();
      refreshView();
    } catch ( err ) {
      alert('Operation failed');
    }
  };

  container.addEventListener( 'click', async ( e ) => {
    const moveUpBtn = e.target.closest('.move-up-btn');
    const moveDownBtn = e.target.closest('.move-down-btn');

    if ( moveUpBtn || moveDownBtn ) {
      const id = (moveUpBtn || moveDownBtn).dataset.id;
      const index = projects.findIndex(p => p.id == id);
      const newProjects = [...projects];
      const targetIndex = moveUpBtn ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < projects.length) {
        // Swap sort orders
        const currentOrder = newProjects[index].sort_order || 0;
        const targetOrder = newProjects[targetIndex].sort_order || 0;
        
        newProjects[index].sort_order = targetOrder;
        newProjects[targetIndex].sort_order = currentOrder;

        // If orders are same (uninitialized), fix them
        if (currentOrder === targetOrder) {
          newProjects[index].sort_order = index > targetIndex ? index : targetIndex;
          newProjects[targetIndex].sort_order = index > targetIndex ? targetIndex : index;
        }

        await Promise.all([
          api.post('projects.php', { id: newProjects[index].id, sort_order: newProjects[index].sort_order }),
          api.post('projects.php', { id: newProjects[targetIndex].id, sort_order: newProjects[targetIndex].sort_order })
        ]);

        store.update('projects', await api.get('projects.php'));
        refreshView();
      }
      return;
    }

    if ( e.target.closest('.delete-btn') ) {
      e.stopPropagation();
      const id = e.target.closest('.delete-btn').dataset.id;
      if ( confirm('Delete project?') ) {
        await api.delete( `projects.php?id=${ id }` );
        const [ newProjects, newTasks, newTimeEntries ] = await Promise.all([
          api.get('projects.php'),
          api.get('planner.php'),
          api.get('time-entries.php')
        ]);
        store.update( 'projects', newProjects );
        store.update( 'tasks', newTasks );
        store.update( 'timeEntries', newTimeEntries );
        refreshView();
      }
    }

    if ( e.target.closest('.edit-btn') ) {
      e.stopPropagation();
      const id = e.target.closest('.edit-btn').dataset.id;
      const project = projects.find( p => p.id == id );
      if ( project ) openProjModal( project );
    }
  } );

  async function refreshView() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild( await renderProjects() );
  }

  return container;
}
