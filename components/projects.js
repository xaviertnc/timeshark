/**
 * components/projects.js
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

// Persistent UI State
let searchTerm = '';
let statusFilter = 'active'; // 'active' or 'archived'
let sortConfig = { key: 'list_order', direction: 'asc' };
let groupByOrg = false;
let groupByTag = false;
let collapseEpics = false;
let tagFilter = '';
let selectedProjectIds = new Set();
let lastCheckedProjectValue = null;

export async function renderProjects() {
  const state = store.get();
  const customers = state.customers || [];

  // We need to fetch projects based on the filter
  let projects = [];
  try {
    if (statusFilter === 'archived') {
      projects = await api.get('projects.php?action=archives');
    } else {
      projects = await api.get('projects.php');
    }
  } catch (err) {
    console.error('Failed to fetch projects', err);
    projects = state.projects || [];
  }

  // Get all unique tags
  const allTags = [...new Set(projects.flatMap(p => p.tags || []))].sort();

  // Filter Logic
  let filtered = projects.filter(p => {
    if (tagFilter && (!p.tags || !p.tags.includes(tagFilter))) return false;

    const searchTermLower = searchTerm.toLowerCase();
    const matchesTag = p.tags && p.tags.some(t => t.toLowerCase().includes(searchTermLower));
    const searchMatch = !searchTerm ||
      p.name.toLowerCase().includes(searchTermLower) ||
      (customers.find(c => c.id == p.customer_id)?.name || '').toLowerCase().includes(searchTermLower) ||
      matchesTag;
    return searchMatch;
  });

  // Set explicit Progress for all
  filtered = filtered.map(p => ({ ...p, _progress: p.progress || 0 }));

  // Sorting Logic (Apply before grouping)
  if (sortConfig.key) {
    filtered.sort((a, b) => {
      let valA, valB;

      switch (sortConfig.key) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'status':
          valA = (a.status || 'Active').toLowerCase();
          valB = (b.status || 'Active').toLowerCase();
          break;
        case 'customer':
          valA = (customers.find(c => c.id == a.customer_id)?.name || 'Individual').toLowerCase();
          valB = (customers.find(c => c.id == b.customer_id)?.name || 'Individual').toLowerCase();
          break;
        case 'progress':
          valA = a._progress;
          valB = b._progress;
          break;
        case 'list_order':
          valA = a.list_order ?? 0;
          valB = b.list_order ?? 0;
          break;
        default:
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto pb-20 px-4';

  container.innerHTML = `
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 px-2">
      <div>
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Portfolio</h2>
        <h1 class="text-3xl font-light text-main tracking-tight">
          ${statusFilter === 'active' ? 'Active' : 'Archived'} <span class="font-bold italic text-primary">Projects.</span>
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <button id="add-project-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px] transform active:scale-95 leading-none">
          + Create Project
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 px-2">
        <div class="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div class="relative w-full sm:w-80 group">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-dim/30 group-focus-within:text-primary/50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input type="text" id="project-search" placeholder="Quick search..." 
                       class="w-full bg-card/50 border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold text-main outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-dim/20"
                       value="${searchTerm}">
            </div>

            <div class="relative group hidden sm:block">
                <select id="tag-filter" class="bg-card/50 border border-white/5 rounded-xl pl-4 pr-10 py-2.5 text-[10px] uppercase tracking-widest font-bold text-main outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer group-hover:bg-card/80">
                    <option value="">All Tags</option>
                    ${allTags.map(t => `<option value="${t}" ${tagFilter === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <div class="flex items-center gap-1.5 p-1 bg-card/30 rounded-xl border border-white/5">
                <button class="status-filter-btn px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'active' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dim/50 hover:text-dim'}" data-status="active">Active</button>
                <button class="status-filter-btn px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'archived' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dim/50 hover:text-dim'}" data-status="archived">Archived</button>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-3 cursor-pointer group">
                <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Group by Tag</span>
                <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                    <input type="checkbox" id="group-by-tag" class="sr-only" ${groupByTag ? 'checked' : ''}>
                    <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${groupByTag ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                </div>
            </label>
            <div class="w-px h-4 bg-white/10 hidden sm:block"></div>
            <label class="flex items-center gap-3 cursor-pointer group">
                <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Group by Org</span>
                <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                    <input type="checkbox" id="group-by-org" class="sr-only" ${groupByOrg ? 'checked' : ''}>
                    <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${groupByOrg ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                </div>
            </label>
            <div class="w-px h-4 bg-white/10 hidden sm:block"></div>
            <label class="flex items-center gap-3 cursor-pointer group">
                <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Collapse Epics</span>
                <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                    <input type="checkbox" id="collapse-epics" class="sr-only" ${collapseEpics ? 'checked' : ''}>
                    <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${collapseEpics ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                </div>
            </label>
        </div>
    </div>

    <!-- Projects Table -->
    <div class="zen-card bg-card border border-soft shadow-sm overflow-hidden backdrop-blur-sm relative">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse table-fixed">
            <thead>
            <tr class="bg-app/50 border-b border-soft">
                <th class="py-2.5 px-4 w-12 text-center border-r border-white/5">
                    <input type="checkbox" id="select-all-projects" class="cursor-pointer accent-primary w-3.5 h-3.5" ${filtered.length > 0 && selectedProjectIds.size === filtered.length ? 'checked' : ''}>
                </th>
                <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-12 text-center" data-sort="list_order">
                    <div class="flex items-center justify-center gap-1"># ${renderSortIcon('list_order')}</div>
                </th>
                <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-1/4" data-sort="name">
                    <div class="flex items-center gap-2">Project ${renderSortIcon('name')}</div>
                </th>
                <th class="hidden sm:table-cell py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-24" data-sort="status">
                    <div class="flex items-center gap-2">Status ${renderSortIcon('status')}</div>
                </th>
                <th class="hidden md:table-cell py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-1/4" data-sort="customer">
                    <div class="flex items-center gap-2">Organization ${renderSortIcon('customer')}</div>
                </th>
                <th class="hidden lg:table-cell py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-40" data-sort="progress">
                    <div class="flex items-center gap-2">Progress ${renderSortIcon('progress')}</div>
                </th>
                <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest w-24 text-right">Actions</th>
            </tr>
            </thead>
            <tbody id="projects-table-body">
            ${renderTableRows(filtered, customers)}
            </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk Actions Overaly -->
    ${selectedProjectIds.size > 0 ? `
    <div id="bulk-action-bar" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-card border border-primary/30 shadow-[0_10px_40px_rgba(35,35,35,1)] rounded-2xl px-6 py-3 flex items-center gap-6 animate-fade-in backdrop-blur-md">
        <span class="text-xs font-black text-main uppercase tracking-widest"><span class="text-primary">${selectedProjectIds.size}</span> Selected</span>
        <div class="w-px h-6 bg-white/10"></div>
        <div class="flex items-center gap-2">
            ${statusFilter === 'active' ? `
            <button id="bulk-archive" class="px-4 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Archive</button>
            ` : `
            <button id="bulk-restore" class="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Restore</button>
            `}
            <button id="bulk-delete" class="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Delete</button>
            <button id="bulk-clear" class="px-4 py-2 ml-2 text-dim hover:text-main text-[10px] font-bold uppercase tracking-widest transition-colors">Cancel</button>
        </div>
    </div>
    ` : ''}

  `;

  // --- RENDERING HELPERS ---

  function renderTableRows(inItems, customers) {
    const items = collapseEpics ? inItems.filter(p => !p.parent_id) : inItems;

    if (items.length === 0) {
      return `<tr><td colspan="6" class="py-20 text-center opacity-20"><p class="text-xs font-black uppercase tracking-[0.3em]">No projects found</p></td></tr>`;
    }

    if (!groupByOrg && !groupByTag) {
      // Group by Epic hierarchically
      const epics = items.filter(p => p.type === 'epic');
      const standalone = items.filter(p => p.type !== 'epic' && !p.parent_id);

      let rowsHtml = '';

      epics.forEach(epic => {
        rowsHtml += renderProjectRow(epic, customers, false);
        const children = items.filter(p => p.parent_id == epic.id);
        children.forEach(child => {
          rowsHtml += renderProjectRow(child, customers, true);
        });
      });

      standalone.forEach(p => {
        rowsHtml += renderProjectRow(p, customers, false);
      });

      // Orphaned children (parent filtered out or missing)
      const orphaned = items.filter(p => p.type !== 'epic' && p.parent_id && !epics.find(e => e.id == p.parent_id));
      orphaned.forEach(p => {
        rowsHtml += renderProjectRow(p, customers, false);
      });

      return rowsHtml;
    }

    if (groupByTag) {
      const groups = {};
      items.forEach(p => {
        const pTags = p.tags && p.tags.length > 0 ? p.tags : ['Untagged'];
        pTags.forEach(t => {
          if (!groups[t]) groups[t] = [];
          groups[t].push(p);
        });
      });

      return Object.entries(groups).sort(([a], [b]) => a === 'Untagged' ? 1 : b === 'Untagged' ? -1 : a.localeCompare(b)).map(([tag, groupProjects]) => `
            <tr class="bg-app/40">
                <td colspan="7" class="px-5 py-2.5 text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b border-white/5">
                    <span class="opacity-50 mr-2">#</span> ${tag} 
                    <span class="text-dim/40 ml-2 font-black tabular-nums">[${groupProjects.length}]</span>
                </td>
            </tr>
            ${groupProjects.map(p => renderProjectRow(p, customers, false)).join('')}
        `).join('');
    }

    const groups = items.reduce((acc, p) => {
      const org = customers.find(c => c.id == p.customer_id && c.is_client == 1);
      const orgName = org ? org.name : 'Individual';
      if (!acc[orgName]) acc[orgName] = [];
      acc[orgName].push(p);
      return acc;
    }, {});

    return Object.entries(groups).map(([orgName, projects]) => `
        <tr class="bg-app/40">
            <td colspan="7" class="px-5 py-2.5 text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b border-white/5">
                <span class="opacity-50 mr-2">/</span> ${orgName} 
                <span class="text-dim/40 ml-2 font-black tabular-nums">[${projects.length}]</span>
            </td>
        </tr>
        ${projects.map(p => renderProjectRow(p, customers, false)).join('')}
    `).join('');
  }

  function renderProjectRow(p, customers, isChild = false) {
    const org = customers.find(c => c.id == p.customer_id && c.is_client == 1);
    const progress = p._progress;
    const pColor = p.color || '#338a81';

    // Tag rendering
    const tagsHtml = p.tags && p.tags.length > 0
      ? `<div class="flex flex-wrap gap-1 mt-1">${p.tags.map(t => `<span class="whitespace-nowrap text-[8px] uppercase tracking-widest bg-white/5 text-dim px-1.5 py-0.5 rounded">${t}</span>`).join('')}</div>`
      : '';

    // Type formatting
    let typeBadge = '';
    if (p.type === 'epic') {
      typeBadge = '<span class="whitespace-nowrap px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] uppercase tracking-widest font-black mr-1 border border-primary/20">EPIC</span>';
    } else if (p.type === 'full-time') {
      typeBadge = '<span class="whitespace-nowrap px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] uppercase tracking-widest font-black mr-1 border border-blue-500/20 hover:bg-blue-500/30 transition-colors" title="Full Time">FULL TIME</span>';
    }

    return `
    <tr draggable="true" class="border-b border-soft last:border-b-0 hover:bg-app/40 transition-all group/row cursor-pointer ${isChild ? 'bg-black/10' : ''}" data-id="${p.id}">
        <td class="px-4 py-2 text-center border-r border-white/5 project-checkbox-td">
            <input type="checkbox" class="project-checkbox cursor-pointer accent-primary w-3.5 h-3.5" value="${p.id}" ${selectedProjectIds.has(String(p.id)) ? 'checked' : ''}>
        </td>
        <td class="px-4 py-2 text-center">
             <div class="w-2 h-2 rounded-full mx-auto shadow-sm" style="background-color: ${pColor}"></div>
        </td>
        <td class="px-4 py-2 ${isChild ? 'pl-8' : ''}">
            <div class="flex items-center gap-2">
                ${isChild ? '<div class="w-3 h-3 border-l-2 border-b-2 border-dim/40 rounded-bl-sm mb-1 ml-1 shrink-0"></div>' : ''}
                ${typeBadge}
                <span class="${isChild ? 'font-semibold text-main/80 text-xs' : 'font-bold text-main text-sm'} tracking-tight group-hover/row:text-primary transition-colors truncate block" title="${p.name}">${p.name}</span>
            </div>
            ${tagsHtml}
        </td>
        <td class="hidden sm:table-cell px-4 py-2">
            <span class="text-[8px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-md border" 
                  style="background-color: ${applyAlpha(pColor, 0.08)}; border-color: ${applyAlpha(pColor, 0.15)}; color: ${pColor}">${p.status || 'Active'}</span>
        </td>
        <td class="hidden md:table-cell px-4 py-2">
            <span class="text-[10px] font-bold text-dim/60 group-hover/row:text-main transition-colors uppercase tracking-widest truncate block" title="${org ? org.name : 'Individual'}">${org ? org.name : 'Individual'}</span>
        </td>
        <td class="hidden lg:table-cell px-4 py-2">
            <div class="flex items-center gap-4">
                <div class="flex-1 bg-app rounded-full h-1.5 overflow-hidden border border-white/5 shadow-inner">
                    <div class="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.2)]" style="width: ${progress}%; background-color: ${pColor}"></div>
                </div>
                <span class="text-[10px] font-black text-main tabular-nums tracking-widest w-8 text-right">${progress}%</span>
            </div>
        </td>
        <td class="px-4 py-2 text-right">
            <div class="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all transform translate-x-1 group-hover/row:translate-x-0">
                ${statusFilter === 'active' ? `
                    <button class="archive-btn w-7 h-7 flex items-center justify-center rounded-md text-dim/30 hover:text-amber-500 hover:bg-amber-500/10 transition-all" title="Archive Project" data-id="${p.id}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                    </button>
                ` : `
                    <button class="restore-btn w-7 h-7 flex items-center justify-center rounded-md text-dim/30 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all" title="Restore Project" data-id="${p.id}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                    </button>
                `}
                <button class="delete-btn w-7 h-7 flex items-center justify-center rounded-md text-dim/30 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Delete Permanently" data-id="${p.id}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </td>
    </tr>
    `;
  }

  function renderSortIcon(key) {
    if (sortConfig.key !== key) return '<span class="opacity-0 group-hover:opacity-20 text-[8px] transition-opacity">↕</span>';
    return `<span class="text-primary text-[8px]">${sortConfig.direction === 'asc' ? '▲' : '▼'}</span>`;
  }

  // --- ACTIONS ---

  // Add Project
  container.querySelector('#add-project-btn').onclick = () => ProjectModal.open(null, { onSave: refreshView });

  // Search
  const searchInput = container.querySelector('#project-search');
  searchInput.oninput = (e) => {
    searchTerm = e.target.value;
    // We can't easily re-render just the body without re-fetching archives if needed, 
    // but for active, client side is fine. Let's just debounce re-render.
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(refreshView, 200);
  };

  // Status Filter
  container.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.onclick = () => {
      statusFilter = btn.dataset.status;
      refreshView();
    };
  });

  // Group by Organization Toggle
  container.querySelector('#group-by-org').onchange = (e) => {
    groupByOrg = e.target.checked;
    if (groupByOrg) groupByTag = false;
    refreshView();
  };

  if (container.querySelector('#group-by-tag')) {
    container.querySelector('#group-by-tag').onchange = (e) => {
      groupByTag = e.target.checked;
      if (groupByTag) groupByOrg = false;
      refreshView();
    };
  }

  // Tag filter
  const tagSelect = container.querySelector('#tag-filter');
  if (tagSelect) {
    tagSelect.onchange = (e) => {
      tagFilter = e.target.value;
      refreshView();
    };
  }

  // Collapse Epics Toggle
  if (container.querySelector('#collapse-epics')) {
    container.querySelector('#collapse-epics').onchange = (e) => {
      collapseEpics = e.target.checked;
      refreshView();
    };
  }

  // Sorting
  container.querySelectorAll('th[data-sort]').forEach(th => {
    th.onclick = () => {
      const key = th.dataset.sort;
      if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
      } else {
        sortConfig.key = key;
        sortConfig.direction = 'asc';
      }
      refreshView();
    };
  });

  // Table Interactions
  container.addEventListener('change', (e) => {
    if (e.target.id === 'select-all-projects') {
      const isChecked = e.target.checked;
      const boxes = container.querySelectorAll('.project-checkbox');
      boxes.forEach(b => {
        b.checked = isChecked;
        if (isChecked) selectedProjectIds.add(String(b.value));
        else selectedProjectIds.delete(String(b.value));
      });
      refreshView();
    }
  });

  container.addEventListener('click', async (e) => {
    // Project Checkbox (Shift + Click Range Selection)
    if (e.target.classList.contains('project-checkbox')) {
      const id = e.target.value;
      const isChecked = e.target.checked;

      if (e.shiftKey && lastCheckedProjectValue) {
        const boxes = Array.from(container.querySelectorAll('.project-checkbox'));
        const startIdx = boxes.findIndex(b => b.value === lastCheckedProjectValue);
        const endIdx = boxes.findIndex(b => b === e.target);

        if (startIdx !== -1 && endIdx !== -1) {
          const start = Math.min(startIdx, endIdx);
          const end = Math.max(startIdx, endIdx);

          for (let i = start; i <= end; i++) {
            boxes[i].checked = isChecked;
            if (isChecked) selectedProjectIds.add(String(boxes[i].value));
            else selectedProjectIds.delete(String(boxes[i].value));
          }
        }
      } else {
        if (isChecked) selectedProjectIds.add(String(id));
        else selectedProjectIds.delete(String(id));
      }

      lastCheckedProjectValue = id;

      // Defer refresh to allow click handlers to resolve native checkbox state fully
      setTimeout(refreshView, 10);
      return;
    }

    // Bulk Clear
    if (e.target.id === 'bulk-clear') {
      selectedProjectIds.clear();
      refreshView();
      return;
    }

    // Bulk Delete
    if (e.target.id === 'bulk-delete') {
      if (confirm(`CRITICAL: Permanently delete ${selectedProjectIds.size} projects? This cannot be undone.`)) {
        const arr = Array.from(selectedProjectIds);
        for (const id of arr) {
          await api.delete(`projects.php?id=${id}`);
        }

        const [newProjects, newTasks, newTimeEntries] = await Promise.all([
          api.get('projects.php'),
          api.get('planner.php'),
          api.get('time-entries.php')
        ]);
        store.update('projects', newProjects);
        store.update('tasks', newTasks);
        store.update('timeEntries', newTimeEntries);
        selectedProjectIds.clear();
        refreshView();
      }
      return;
    }

    // Bulk Archive
    if (e.target.id === 'bulk-archive') {
      if (confirm(`Archive ${selectedProjectIds.size} selected projects?`)) {
        const arr = Array.from(selectedProjectIds);
        for (const id of arr) {
          await api.get(`projects.php?action=archive&id=${id}`);
        }
        store.update('projects', await api.get('projects.php'));
        selectedProjectIds.clear();
        refreshView();
      }
      return;
    }

    // Bulk Restore
    if (e.target.id === 'bulk-restore') {
      if (confirm(`Restore ${selectedProjectIds.size} archived projects?`)) {
        const arr = Array.from(selectedProjectIds);
        for (const id of arr) {
          await api.get(`projects.php?action=restore&id=${id}`);
        }
        store.update('projects', await api.get('projects.php'));
        selectedProjectIds.clear();
        refreshView();
      }
      return;
    }

    // Archive
    const archiveBtn = e.target.closest('.archive-btn');
    if (archiveBtn) {
      e.stopPropagation();
      const id = archiveBtn.dataset.id;
      if (confirm('Archive this project? It will be moved to the yearly archive shards.')) {
        await api.get(`projects.php?action=archive&id=${id}`);
        // Success, refresh the main store so other views know
        store.update('projects', await api.get('projects.php'));
        refreshView();
      }
      return;
    }

    // Restore
    const restoreBtn = e.target.closest('.restore-btn');
    if (restoreBtn) {
      e.stopPropagation();
      const id = restoreBtn.dataset.id;
      if (confirm('Restore this project to the active portfolio?')) {
        await api.get(`projects.php?action=restore&id=${id}`);
        store.update('projects', await api.get('projects.php'));
        refreshView();
      }
      return;
    }

    // Delete
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      e.stopPropagation();
      const id = deleteBtn.dataset.id;
      if (confirm('Critical: Wipe project data permanently? This cannot be undone.')) {
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
      return;
    }

    // Edit (Row click)
    const row = e.target.closest('tr[data-id]');
    if (row && !e.target.closest('button') && !e.target.closest('.project-checkbox-td') && !e.target.closest('input[type="checkbox"]')) {
      const id = row.dataset.id;
      // We need the project object. For archives, it's not in the main store.
      let project;
      if (statusFilter === 'archived') {
        // If archives, fetch or find in local list? 
        // Simplest is to find in the 'filtered' or 'projects' array we just fetched.
        project = filtered.find(p => String(p.id) === String(id));
      } else {
        project = (state.projects || []).find(p => String(p.id) === String(id));
      }

      if (project) {
        ProjectModal.open(project, {
          onSave: async () => {
            store.update('projects', await api.get('projects.php'));
            refreshView();
          }
        });
      }
    }
  });

  // Drag and Drop (List Order)
  let draggedRow = null;

  container.addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) {
      draggedRow = tr;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tr.dataset.id);
      setTimeout(() => tr.classList.add('opacity-50'), 0);
    }
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const tr = e.target.closest('tr[data-id]');
    if (tr && tr !== draggedRow && draggedRow) {
      // Reorder in DOM
      const rect = tr.getBoundingClientRect();
      const offset = e.clientY - rect.top;
      if (offset > rect.height / 2) {
        tr.parentNode.insertBefore(draggedRow, tr.nextSibling);
      } else {
        tr.parentNode.insertBefore(draggedRow, tr);
      }
    }
  });

  container.addEventListener('dragend', async (e) => {
    if (draggedRow) {
      draggedRow.classList.remove('opacity-50');
      draggedRow = null;

      // Extract new list order
      const tbody = container.querySelector('#projects-table-body');
      const rows = Array.from(tbody.querySelectorAll('tr[data-id]'));
      const reorderPayload = rows.map((r, index) => ({ id: r.dataset.id, list_order: index }));

      try {
        await api.post('projects.php', { reorder: reorderPayload });
        const updatedProjects = await api.get('projects.php');
        store.update('projects', updatedProjects);

        // Ensure sort is by list_order if dropped so the change persists visually
        if (sortConfig.key !== 'list_order') {
          sortConfig.key = 'list_order';
          sortConfig.direction = 'asc';
        }

        // Refresh view to update the table sort state headers
        refreshView();
      } catch (err) {
        console.error('Failed to save list order', err);
      }
    }
  });

  async function refreshView() {
    const app = document.getElementById('app');
    const newContent = await renderProjects();
    app.innerHTML = '';
    app.appendChild(newContent);

    // Focus search back if it was focused
    const search = document.getElementById('project-search');
    if (search && searchTerm) {
      search.focus();
      search.setSelectionRange(searchTerm.length, searchTerm.length);
    }
  }

  return container;
}
