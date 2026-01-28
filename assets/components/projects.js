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
 */

import { store } from '../utils/store.js';
import { api } from '../utils/api.js';


export async function renderProjects() {
  const state = store.get();
  const projects = state.projects || [];
  const customers = state.customers || [];

  const container = document.createElement('div');
  container.className = 'max-w-6xl mx-auto animate-slide-up';

  container.innerHTML = `
    <div class="flex items-end justify-between mb-16 px-2">
      <div>
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-3">Portfolio</h2>
        <h1 class="text-3xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Projects.</span></h1>
      </div>
      <button id="add-project-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
        Create Project
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      ${ projects.map( p => {
        const org = customers.find( c => c.id == p.customer_id && c.is_client == 1 );
        const client = customers.find( c => c.id == p.client_id && c.is_client == 0 );
        return `
          <div class="bg-card rounded-2xl p-8 border border-soft shadow-sm group hover:-translate-y-1 transition-all duration-300 relative project-card" data-id="${ p.id }">
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
              <p class="text-[10px] font-black text-dim uppercase tracking-[0.2em]">
                ${ org ? org.name : 'Individual' }
                ${ client ? `<span class="opacity-40 mx-1">/</span> <span class="text-primary">${ client.name }</span>` : '' }
              </p>
            </div>
          </div>
        `;
      } ).join('') }
    </div>

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
        <div class="bg-card rounded-2xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0 text-center relative" id="project-modal-content">
          <button id="close-project-modal" class="absolute top-6 right-8 text-dim hover:text-main text-2xl transition-colors">&times;</button>

          <div class="mb-10">
            <h3 class="text-2xl font-bold text-main tracking-tight" id="modal-title">New Project</h3>
            <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Project Specification</p>
          </div>

          <form id="project-form" class="space-y-8">
            <input type="hidden" name="id">
            <div class="space-y-3">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Project Name</label>
              <input type="text" name="name" required placeholder="Enter name" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
            </div>

            <div class="space-y-3">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Organization</label>
              <div class="relative">
                <select name="customer_id" class="w-full bg-app border-none rounded-2xl py-4 px-6 appearance-none cursor-pointer text-center text-main font-bold">
                  <option value="">Individual / None</option>
                  ${ customers.filter( c => c.is_client == 1 ).map( c => `<option value="${ c.id }">${ c.name }</option>` ).join('') }
                </select>
              </div>
            </div>

            <div class="space-y-3">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Client Contact</label>
              <div class="relative">
                <select name="client_id" class="w-full bg-app border-none rounded-2xl py-4 px-6 appearance-none cursor-pointer text-center text-main font-bold">
                  <option value="">Select Client...</option>
                  <!-- Populated dynamically -->
                </select>
              </div>
            </div>

            <div class="space-y-3">
              <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Color Label</label>
              <div class="flex gap-4 justify-center flex-wrap">
                ${ ['#26a69a', '#fbc02d', '#607d8b', '#ab47bc', '#f4511e', '#5c6bc0'].map( ( color, idx ) => `
                  <label class="cursor-pointer group">
                    <input type="radio" name="color" value="${ color }" class="peer sr-only" ${ idx === 0 ? 'checked' : '' }>
                    <div class="w-10 h-10 rounded-xl bg-[${ color }] peer-checked:ring-offset-2 peer-checked:ring-2 peer-checked:ring-primary/40 transition-all border border-white hover:scale-110" style="background-color: ${ color }"></div>
                  </label>
                ` ).join('') }
              </div>
            </div>

            <div class="pt-6">
              <button type="submit" id="submit-btn" class="w-full h-18 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 py-5">
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
      
      // Ensure we only set the org ID if it's actually an organization
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
