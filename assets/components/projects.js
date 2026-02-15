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
import { ProjectModal } from './project-modal.js';


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
  container.className = 'max-w-7xl mx-auto pb-20 px-4';

  const calculateProgress = (p) => {
    if (p.progress !== undefined) return p.progress;
    if (!p.todos || p.todos.length === 0) return 0;
    const completed = p.todos.filter(t => t.completed).length;
    return Math.round((completed / p.todos.length) * 100);
  };

  container.innerHTML = `
    <div class="flex items-end justify-between mb-10 px-2">
      <div>
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Portfolio</h2>
        <h1 class="text-3xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Projects.</span></h1>
      </div>
      <button id="add-project-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center font-black uppercase tracking-[0.2em] text-[11px] transform active:scale-95 leading-none">
        Create Project
      </button>
    </div>

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
                <td class="px-6 py-3">
                  <div class="flex items-center gap-2">
                    <div class="drag-handle p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 8h16M4 16h16"></path></svg>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-3">
                  <div class="flex items-center gap-4">
                    <span class="font-black text-main text-base tracking-tight">${p.name}</span>
                  </div>
                </td>
                <td class="px-6 py-3">
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md border" style="background-color: ${applyAlpha(p.color, 0.1)}; border-color: ${applyAlpha(p.color, 0.2)}; color: ${p.color}">${p.status || 'Active'}</span>
                </td>
                <td class="px-6 py-3">
                  <span class="text-xs font-black text-dim uppercase tracking-widest">${org ? org.name : 'Individual'}</span>
                </td>
                <td class="px-6 py-3">
                  <div class="flex items-center gap-4">
                    <div class="flex-1 bg-app rounded-full h-2.5 overflow-hidden border border-soft shadow-inner p-[1px]">
                      <div class="h-full rounded-full transition-all duration-1000" style="width: ${progress}%; background-color: ${p.color}"></div>
                    </div>
                    <span class="text-[10px] font-black text-main tabular-nums tracking-widest">${progress}%</span>
                  </div>
                </td>
                <td class="px-6 py-3 text-right">
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

    ${projects.length === 0 ? `
      <div class="text-center py-32 opacity-20 border-2 border-dashed border-soft rounded-[3rem]">
        <p class="text-xs font-black uppercase tracking-[0.5em]">The portfolio is currently empty</p>
      </div>
    ` : ''}
  `;

  container.querySelector('#add-project-btn').onclick = () => ProjectModal.open(null, { onSave: refreshView });

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



    // Click on table row to edit
    const row = e.target.closest('tr[data-id]');
    if (row && !e.target.closest('.delete-btn') && !e.target.closest('.move-up-btn') && !e.target.closest('.move-down-btn') && !e.target.closest('.drag-handle')) {
      if (project) ProjectModal.open(project, { onSave: refreshView });
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
