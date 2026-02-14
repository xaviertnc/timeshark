/**
 * assets/components/projects.js
 *
 * Project Management - 28 Jan 2026
 *
 * Purpose: Manage projects and link them to Organizations and Clients.
 *
 * @package Time Shark
 *
 * @author Senpai
 *
 * Last 3 version commits:
 * @version 1.0 - INIT - 28 Jun 2025 - Initial commit
 * @version 1.1 - UPD - 28 Jan 2026 - Align with Organizations & Clients terminology
 * @version 1.4 - UPD - 08 Feb 2026 - Redesign and fix syntax errors
 */

import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { syncProjectToSpan } from '../utils/project-span-sync.js';


const applyAlpha = (color, alpha) => {
  if (!color) return 'transparent';
  if (color.startsWith('#')) {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return color + a;
  }
  if (color.startsWith('hsl')) {
    return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
  }
  return color;
};


let viewMode = localStorage.getItem('project_view_mode') || 'grid';


export async function renderProjects() {
  const state = store.get();
  const projects = [...(state.projects || [])].sort((a, b) => {
    const orderA = a.sort_order ?? 0;
    const orderB = b.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.id).localeCompare(String(b.id));
  });
  const customers = state.customers || [];

  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto animate-slide-up pb-20 px-4';

  const calculateProgress = (p) => {
    if (p.progress !== undefined) return p.progress;
    if (!p.todos || p.todos.length === 0) return 0;
    const completed = p.todos.filter(t => t.completed).length;
    return Math.round((completed / p.todos.length) * 100);
  };

  container.innerHTML = `
    <div class="flex items-end justify-between mb-16 px-2 pt-12">
      <div>
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-3">Portfolio</h2>
        <h1 class="text-4xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Projects.</span></h1>
      </div>
      <div class="flex items-center gap-6">
        <div class="flex bg-app p-1 rounded-2xl border border-soft shadow-inner">
          <button id="toggle-grid" class="p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-main'}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          </button>
          <button id="toggle-list" class="p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-main'}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </div>
        <button id="add-project-btn" class="bg-primary hover:bg-primary-dark text-white px-10 py-5 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center font-black uppercase tracking-[0.2em] text-[11px] transform active:scale-95 leading-none">
          Create Project
        </button>
      </div>
    </div>

    ${viewMode === 'grid' ? `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
        ${projects.map(p => {
    const org = customers.find(c => c.id == p.customer_id && c.is_client == 1);
    const client = customers.find(c => c.id == p.client_id && c.is_client == 0);
    const progress = calculateProgress(p);
    const status = p.status || 'Active';

    return `
            <div class="bg-card rounded-[2.5rem] p-8 border border-soft shadow-sm group hover:-translate-y-2 transition-all duration-500 relative project-card overflow-hidden h-full flex flex-col cursor-pointer" data-id="${p.id}">
              
              <div class="flex justify-between items-start mb-10">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all group-hover:shadow-lg" style="background-color: ${applyAlpha(p.color, 0.1)}; border-color: ${applyAlpha(p.color, 0.2)}">
                  <span class="text-[9px] font-black uppercase tracking-widest" style="color: ${p.color}">${status}</span>
                </div>
                
                <div class="opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 -mr-3 -mt-2">
                  <button class="delete-btn text-dim/40 hover:text-red-500 transition-all p-2.5 hover:scale-125" data-id="${p.id}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>

              <div class="flex flex-col flex-1 pointer-events-none items-center text-center">
                <h3 class="text-2xl font-black text-main mb-3 leading-tight tracking-tight group-hover:text-primary transition-colors duration-300 px-2">${p.name}</h3>
                <div class="flex flex-col items-center gap-1.5 mb-auto pb-12">
                    <span class="text-[11px] font-black text-dim uppercase tracking-[0.25em] bg-app px-3 py-1 rounded-lg border border-soft shadow-inner">${org ? org.name : 'Individual'}</span>
                    ${client ? `<span class="text-[10px] font-bold text-primary italic opacity-70 mt-1">${client.name}</span>` : ''}
                </div>
                
                <div class="w-full space-y-4">
                  <div class="flex justify-between w-full text-[10px] font-black uppercase tracking-[0.2em] text-dim/70">
                    <span>Progress</span>
                    <span class="text-main font-black">${progress}%</span>
                  </div>
                  <div class="w-full bg-app rounded-full h-3 overflow-hidden border-2 border-soft p-[2px] shadow-inner">
                    <div class="h-full rounded-full transition-all duration-1000 ease-out" style="width: ${progress}%; background-color: ${p.color}; box-shadow: 0 0 15px ${applyAlpha(p.color, 0.5)}"></div>
                  </div>
                </div>
              </div>
            </div>
          `;
  }).join('')}
      </div>
    ` : `
      <div class="bg-card rounded-[2rem] border border-soft shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-app border-b border-soft">
              <th class="p-6 text-[10px] font-black text-dim uppercase tracking-widest w-16 text-center">#</th>
              <th class="p-6 text-[10px] font-black text-dim uppercase tracking-widest">Project</th>
              <th class="p-6 text-[10px] font-black text-dim uppercase tracking-widest">Status</th>
              <th class="p-6 text-[10px] font-black text-dim uppercase tracking-widest">Organization</th>
              <th class="p-6 text-[10px] font-black text-dim uppercase tracking-widest w-48">Progress</th>
              <th class="p-6 text-[10px] font-black text-dim uppercase tracking-widest w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${projects.map((p, idx) => {
    const org = customers.find(c => c.id == p.customer_id && c.is_client == 1);
    const progress = calculateProgress(p);

    return `
                <tr class="border-b border-soft last:border-b-0 hover:bg-app/50 transition-all group cursor-grab active:cursor-grabbing" data-id="${p.id}" draggable="true">
                  <td class="p-6">
                    <div class="flex items-center gap-2">
                      <div class="drag-handle p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 8h16M4 16h16"></path></svg>
                      </div>
                    </div>
                  </td>
                  <td class="p-6">
                    <div class="flex items-center gap-4">
                      <span class="font-black text-main text-base tracking-tight">${p.name}</span>
                    </div>
                  </td>
                  <td class="p-6">
                    <span class="text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md border" style="background-color: ${applyAlpha(p.color, 0.1)}; border-color: ${applyAlpha(p.color, 0.2)}; color: ${p.color}">${p.status || 'Active'}</span>
                  </td>
                  <td class="p-6">
                    <span class="text-xs font-black text-dim uppercase tracking-widest">${org ? org.name : 'Individual'}</span>
                  </td>
                  <td class="p-6">
                    <div class="flex items-center gap-4">
                      <div class="flex-1 bg-app rounded-full h-2.5 overflow-hidden border border-soft shadow-inner p-[1px]">
                        <div class="h-full rounded-full transition-all duration-1000" style="width: ${progress}%; background-color: ${p.color}"></div>
                      </div>
                      <span class="text-[10px] font-black text-main tabular-nums tracking-widest">${progress}%</span>
                    </div>
                  </td>
                  <td class="p-6 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button class="delete-btn p-2 text-dim/40 hover:text-red-500 transition-all transform hover:scale-125" data-id="${p.id}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      </div>
    `}

    ${projects.length === 0 ? `
      <div class="text-center py-32 opacity-20 border-2 border-dashed border-soft rounded-[3rem]">
        <p class="text-xs font-black uppercase tracking-[0.5em]">The portfolio is currently empty</p>
      </div>
    ` : ''}
  `;

  const modalPortal = document.getElementById('modal-portal');
  modalPortal.innerHTML = `
    <div id="project-modal" class="fixed inset-0 bg-secondary/60 hidden z-50 backdrop-blur-xl pointer-events-auto overflow-y-auto">
      <div class="w-full flex items-start justify-center py-6 px-4">
        <div class="bg-card rounded-2xl shadow-2xl w-full max-w-4xl p-8 md:p-10 transform transition-all scale-95 opacity-0 text-center relative border border-soft mx-3 sm:mx-auto" id="project-modal-content">
          <button id="close-project-modal" class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div class="mb-12">
            <h3 class="text-3xl font-black text-main tracking-tighter" id="modal-title">Define Project</h3>
            <p class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mt-3 opacity-60">System Registry Entry</p>
          </div>

          <form id="project-form" class="space-y-6 text-left">
            <input type="hidden" name="id">
            
            <!-- Row 1: Name + Organization -->
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Project Name</label>
                <input type="text" name="name" required placeholder="Launch Campaign" class="w-full py-3 px-5 bg-app border-none rounded-xl focus:ring-4 focus:ring-primary/10 text-main font-bold placeholder:opacity-30 text-sm">
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Parent Organization</label>
                <div class="relative group">
                  <select name="customer_id" class="w-full bg-app border-none rounded-xl py-3 px-5 appearance-none cursor-pointer text-main font-bold focus:ring-4 focus:ring-primary/10 transition-all uppercase text-[11px] tracking-widest">
                    <option value="">Global / Internal</option>
                    ${customers.filter(c => c.is_client == 1).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Row 2: Status + Lead Contact -->
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Status</label>
                <div class="relative group">
                  <select name="status" class="w-full bg-app border-none rounded-xl py-3 px-5 appearance-none cursor-pointer text-main font-bold focus:ring-4 focus:ring-primary/10 transition-all uppercase text-[11px] tracking-widest">
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Lead Contact</label>
                <div class="relative group">
                  <select name="client_id" class="w-full bg-app border-none rounded-xl py-3 px-5 appearance-none cursor-pointer text-main font-bold focus:ring-4 focus:ring-primary/10 transition-all uppercase text-[11px] tracking-widest">
                    <option value="">Assign Later...</option>
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- Row 3: Start Date + Deadline -->
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Start Date</label>
                <input type="date" name="started_at" class="w-full py-3 px-5 bg-app border-none rounded-xl focus:ring-4 focus:ring-primary/10 text-main font-bold text-sm">
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Deadline</label>
                <input type="date" name="completed_at" class="w-full py-3 px-5 bg-app border-none rounded-xl focus:ring-4 focus:ring-primary/10 text-main font-bold text-sm">
              </div>
            </div>

            <!-- Row 4: Progress (full width) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between ml-2 mr-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em]">Progress</label>
                <span id="project-progress-val" class="text-sm font-black text-primary tabular-nums">0%</span>
              </div>
              <div class="bg-app p-4 rounded-xl space-y-2 shadow-inner">
                <input type="range" name="progress" min="0" max="100" value="0" id="project-progress-slider" class="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer accent-primary shadow-sm border border-soft">
                <div class="flex justify-between text-[8px] font-black text-dim/30 uppercase tracking-widest px-1">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            </div>

            <!-- Row 5: Lane Order + Continuous -->
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Timeline Lane Order</label>
                <input type="number" name="lane_order" min="1" max="99" placeholder="Auto" class="w-full py-3 px-5 bg-app border-none rounded-xl focus:ring-4 focus:ring-primary/10 text-main font-bold text-sm">
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Tracking</label>
                <label class="flex items-center gap-3 w-full py-3 px-5 bg-app rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                  <input type="checkbox" name="continuous" class="accent-primary w-4 h-4">
                  <span class="text-[11px] font-black text-main uppercase tracking-widest">∞ Continuous</span>
                </label>
              </div>
            </div>

            <div class="space-y-6 pt-10 border-t-2 border-soft border-dashed">
              <div class="flex items-center justify-between mb-4">
                <label class="text-[10px] font-black text-dim uppercase tracking-[0.5em] opacity-60">Visual ID Palette</label>
                <button type="button" id="randomize-colors" class="text-[9px] font-black text-primary uppercase tracking-widest hover:underline px-4 py-2 bg-app rounded-lg border border-soft shadow-inner">Generate New Palette</button>
              </div>
              <div id="palette-container" class="flex gap-5 justify-center flex-wrap max-w-lg mx-auto">
                ${['#338a81', '#800000', '#4a148c', '#1a237e', '#006064', '#1b5e20', '#827717', '#e65100', '#bf360c', '#3e2723', '#263238', '#c2185b', '#00c853', '#ffd600', '#2c3e50'].map((color, idx) => `
                  <label class="cursor-pointer group relative">
                    <input type="radio" name="color" value="${color}" class="peer sr-only" ${idx === 0 ? 'checked' : ''}>
                    <div class="w-11 h-11 rounded-full peer-checked:ring-offset-4 peer-checked:ring-4 peer-checked:ring-primary/20 transition-all border-4 border-white/5 hover:scale-125 shadow-lg active:scale-90" style="background-color: ${color}; box-shadow: 0 5px 15px ${applyAlpha(color, 0.3)}"></div>
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="pt-8">
              <button type="submit" id="submit-btn" class="w-full h-22 bg-primary hover:bg-primary-dark text-white font-black text-[12px] uppercase tracking-[0.5em] rounded-3xl shadow-2xl shadow-primary/30 transition-all hover:-translate-y-2 active:scale-95 py-8 leading-none transform">
                Authorize Changes
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

  const updateClientOptions = (orgId, selectedClientId = null) => {
    let filteredClients = [];
    if (orgId) {
      filteredClients = customers.filter(c => {
        if (c.is_client == 1) return false;
        if (c.client_id === orgId) return true;
        if (c.organization_ids && Array.isArray(c.organization_ids) && c.organization_ids.includes(orgId)) return true;
        return false;
      });
    } else {
      filteredClients = customers.filter(c => c.is_client == 0 && (!c.client_id && (!c.organization_ids || c.organization_ids.length === 0)));
    }

    clientSelect.innerHTML = '<option value="">Assign Later...</option>' +
      filteredClients.map(c => `<option value="${c.id}" ${c.id == selectedClientId ? 'selected' : ''}>${c.name}</option>`).join('');
  };

  orgSelect.onchange = (e) => updateClientOptions(e.target.value);

  const defaultPalette = ['#338a81', '#800000', '#4a148c', '#1a237e', '#006064', '#1b5e20', '#827717', '#e65100', '#bf360c', '#3e2723', '#263238', '#c2185b', '#00c853', '#ffd600', '#2c3e50'];
  let currentPalette = JSON.parse(localStorage.getItem('project_palette')) || defaultPalette;

  const renderPalette = (selectedColor = null) => {
    const paletteContainer = modalPortal.querySelector('#palette-container');
    if (!paletteContainer) return;

    let displayPalette = [...currentPalette];
    if (selectedColor && !displayPalette.includes(selectedColor)) {
      displayPalette.unshift(selectedColor);
      if (displayPalette.length > 20) displayPalette.pop();
    }

    paletteContainer.innerHTML = displayPalette.map((color, idx) => `
      <label class="cursor-pointer group relative">
        <input type="radio" name="color" value="${color}" class="peer sr-only" ${(selectedColor ? color === selectedColor : idx === 0) ? 'checked' : ''}>
        <div class="w-11 h-11 rounded-full peer-checked:ring-offset-4 peer-checked:ring-4 peer-checked:ring-primary/20 transition-all border-4 border-white/5 hover:scale-125 shadow-lg active:scale-90" style="background-color: ${color}; box-shadow: 0 5px 15px ${color}30"></div>
      </label>
    `).join('');
  };

  const randomizeColors = () => {
    const colors = [];
    for (let i = 0; i < 15; i++) {
      const h = Math.floor(Math.random() * 360);
      const s = 40 + Math.floor(Math.random() * 50); // 40% to 90%
      const l = 25 + Math.floor(Math.random() * 45); // 25% to 70%

      const l2 = l / 100;
      const a = (s * Math.min(l2, 1 - l2)) / 100;
      const f = n => {
        const k = (n + h / 30) % 12;
        const color = l2 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      colors.push(`#${f(0)}${f(8)}${f(4)}`);
    }
    currentPalette = colors;
    localStorage.setItem('project_palette', JSON.stringify(colors));

    const currentColor = projectForm.querySelector('input[name="color"]:checked')?.value;
    renderPalette(currentColor);
  };

  modalPortal.querySelector('#randomize-colors').onclick = randomizeColors;

  const openProjModal = (project = null) => {
    const pSlider = modalPortal.querySelector('#project-progress-slider');
    const pLabel = modalPortal.querySelector('#project-progress-val');

    if (project) {
      modalTitle.textContent = 'Update Registry';
      submitBtn.textContent = 'Authorize Changes';
      projectForm.id.value = project.id;
      projectForm.name.value = project.name;
      projectForm.status.value = project.status || 'Active';
      projectForm.started_at.value = project.started_at ? project.started_at.split('T')[0] : '';
      projectForm.completed_at.value = project.completed_at ? project.completed_at.split('T')[0] : '';
      projectForm.progress.value = project.progress || 0;
      if (pLabel) pLabel.textContent = `${project.progress || 0}%`;

      // Lane order & continuous
      projectForm.lane_order.value = project.lane_order || '';
      projectForm.continuous.checked = !!project.continuous;

      const org = customers.find(c => c.id == project.customer_id && c.is_client == 1);
      projectForm.customer_id.value = org ? org.id : '';

      updateClientOptions(projectForm.customer_id.value, project.client_id);
      renderPalette(project.color);
    } else {
      modalTitle.textContent = 'Project Initialization';
      submitBtn.textContent = 'Initialize Project';
      projectForm.reset();
      projectForm.id.value = '';
      if (pLabel) pLabel.textContent = '0%';
      updateClientOptions('');
      renderPalette();
    }

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

  container.querySelector('#add-project-btn').onclick = () => openProjModal();
  modalPortal.querySelector('#close-project-modal').onclick = closeProjModal;

  // Backdrop click to close
  projModal.addEventListener('click', (e) => {
    if (e.target === projModal || e.target === projModal.firstElementChild) {
      closeProjModal();
    }
  });

  // Progress slider live update
  const progressSlider = modalPortal.querySelector('#project-progress-slider');
  const progressLabel = modalPortal.querySelector('#project-progress-val');
  if (progressSlider && progressLabel) {
    progressSlider.oninput = () => {
      progressLabel.textContent = `${progressSlider.value}%`;
    };
  }

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

  projectForm.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(projectForm).entries());
    // Handle continuous checkbox (present = 'on' or absent)
    data.continuous = data.continuous === 'on' ? true : false;
    // Parse lane_order as number or null
    data.lane_order = data.lane_order ? parseInt(data.lane_order) : null;
    try {
      await api.post('projects.php', data);

      // Sync project → span if project has dates
      if (data.started_at && data.completed_at) {
        await syncProjectToSpan(data);
      }

      store.update('projects', await api.get('projects.php'));
      closeProjModal();
      refreshView();
    } catch (err) {
      alert('Security violation: Project update failed');
    }
  };

  container.addEventListener('click', async (e) => {
    const moveUpBtn = e.target.closest('.move-up-btn');
    const moveDownBtn = e.target.closest('.move-down-btn');

    if (moveUpBtn || moveDownBtn) {
      const id = (moveUpBtn || moveDownBtn).dataset.id;
      const index = projects.findIndex(p => p.id == id);
      const newProjects = [...projects];
      const targetIndex = moveUpBtn ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < projects.length) {
        const currentOrder = newProjects[index].sort_order || 0;
        const targetOrder = newProjects[targetIndex].sort_order || 0;

        newProjects[index].sort_order = targetOrder;
        newProjects[targetIndex].sort_order = currentOrder;

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

    if (e.target.closest('.delete-btn')) {
      e.stopPropagation();
      const id = e.target.closest('.delete-btn').dataset.id;
      if (confirm('Critical: Wipe project data permanently?')) {
        await api.delete(`projects.php?id=${id}`);
        const [newProjects, newTasks, newTimeEntries] = await Promise.all([
          api.get('projects.php'),
          api.get('planner.php'),
          api.get('time-entries.php')
        ]);
        store.update('projects', newProjects);
        store.update('tasks', newTasks);
        store.update('timeEntries', newTimeEntries);
        refreshView();
      }
    }



    // Click on project card or table row to edit
    const card = e.target.closest('.project-card, tr[data-id]');
    if (card && !e.target.closest('.delete-btn') && !e.target.closest('.move-up-btn') && !e.target.closest('.move-down-btn') && !e.target.closest('.drag-handle')) {
      const id = card.dataset.id;
      const project = projects.find(p => p.id == id);
      if (project) openProjModal(project);
    }
  });

  // Drag & Drop Ordering
  let draggedId = null;

  container.addEventListener('dragstart', (e) => {
    const target = e.target.closest('[draggable="true"]');
    if (!target) return;
    draggedId = target.dataset.id;
    target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('[draggable="true"]');

    // Clear other highlights
    container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      if (el !== target) el.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    if (!target || target.dataset.id === draggedId) return;

    const rect = target.getBoundingClientRect();
    const isTop = e.clientY < rect.top + (rect.height / 2);

    if (isTop) {
      target.classList.remove('drag-over-bottom');
      target.classList.add('drag-over-top');
    } else {
      target.classList.remove('drag-over-top');
      target.classList.add('drag-over-bottom');
    }
  });

  container.addEventListener('dragleave', (e) => {
    // Only clear if completely leaving a target or the container
    const target = e.target.closest('[draggable="true"]');
    if (!target) {
      container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    }
  });

  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    const target = e.target.closest('[draggable="true"]');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const isBottom = e.clientY > rect.top + rect.height / 2;

    container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    if (target.dataset.id === draggedId) return;

    const dragIdx = projects.findIndex(p => p.id == draggedId);
    let dropIdx = projects.findIndex(p => p.id == target.dataset.id);

    if (dragIdx === -1 || dropIdx === -1) return;

    if (isBottom) dropIdx++;
    if (dragIdx < dropIdx) dropIdx--;
    if (dragIdx === dropIdx) return;

    const [movedProject] = projects.splice(dragIdx, 1);
    projects.splice(dropIdx, 0, movedProject);

    projects.forEach((p, idx) => p.sort_order = idx);
    const reorder = projects.map(p => ({ id: p.id, sort_order: p.sort_order }));

    store.update('projects', [...projects]);
    refreshView();

    try {
      await api.post('projects.php', { reorder });
    } catch (err) {
      console.error('Batch reorder failed:', err);
      const fresh = await api.get('projects.php');
      store.update('projects', fresh);
      refreshView();
    }
  });

  container.addEventListener('dragend', (e) => {
    container.querySelectorAll('.dragging, .drag-over-top, .drag-over-bottom').forEach(el => {
      el.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    });
    draggedId = null;
  });

  async function refreshView() {
    const app = document.getElementById('app');
    const newContent = await renderProjects();
    app.innerHTML = '';
    app.appendChild(newContent);
    // Maintain scroll position if needed, but for reorder, scroll to top helps confirm change
  }

  return container;
}
