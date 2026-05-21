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
import { ProjectModal } from './project-modal.js';
import { TaskModal } from './task-modal.js';

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
let statusFilter = localStorage.getItem('project_status_filter') || 'active'; // 'all', 'active', 'on hold', 'completed', 'cancelled', 'archived'
let sortConfig = JSON.parse(localStorage.getItem('project_sort_config') || '{"key":"list_order","direction":"asc"}');
let groupByOrg = localStorage.getItem('project_group_by_org') === 'true';
let groupByTag = localStorage.getItem('project_group_by_tag') === 'true';
let groupByLead = localStorage.getItem('project_group_by_lead') === 'true';
let collapseEpics = localStorage.getItem('project_collapse_epics') === 'true';
let hideEpics = localStorage.getItem('project_hide_epics') === 'true';
let hideOps = localStorage.getItem('project_hide_ops') === 'true';
let hideNotes = localStorage.getItem('project_hide_notes') === 'true';
let tagFilter = localStorage.getItem('project_tag_filter') || '';
let leadFilter = localStorage.getItem('project_lead_filter') || '';
let devFilter = localStorage.getItem('project_dev_filter') || '';
let selectedProjectIds = new Set();
let lastCheckedProjectValue = null;
let viewMode = localStorage.getItem('project_view_mode') || 'table';
let hiddenKanbanProjects = new Set(JSON.parse(localStorage.getItem('hidden_kanban_projects') || '[]'));
let compactKanban = localStorage.getItem('compact_kanban') === 'true';

export async function renderProjects() {
  const state = store.get();
  const customers = state.customers || [];
  const team = state.team || [];

  // We need to fetch projects based on the filter
  let projects = [];
  try {
    if (statusFilter === 'all') {
      const activeP = await api.get('projects.php') || [];
      const archP = await api.get('projects.php?action=archives') || [];
      projects = [...activeP, ...archP];
    } else if (statusFilter === 'archived') {
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
    if (statusFilter === 'active') {
        if (p.status !== 'Active' && p.status !== undefined) return false;
    } else if (statusFilter !== 'all' && statusFilter !== 'archived') {
        if ((p.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    if (tagFilter && (!p.tags || !p.tags.includes(tagFilter))) return false;
    if (leadFilter && p.lead_id != leadFilter) return false;
    if (devFilter && p.dev_id != devFilter) return false;
    if (hideEpics && p.type === 'epic') return false;
    if (hideOps && p.type === 'ops') return false;

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
        case 'priority':
          valA = parseFloat(a.priority);
          valB = parseFloat(b.priority);
          if (isNaN(valA)) valA = 10;
          if (isNaN(valB)) valB = 10;
          break;
        case 'lead':
          valA = (team.find(t => t.id == a.lead_id)?.name || 'No Lead').toLowerCase();
          valB = (team.find(t => t.id == b.lead_id)?.name || 'No Lead').toLowerCase();
          break;
        case 'dev':
          valA = (team.find(t => t.id == a.dev_id)?.name || 'No Dev').toLowerCase();
          valB = (team.find(t => t.id == b.dev_id)?.name || 'No Dev').toLowerCase();
          break;
        case 'customer':
          valA = (customers.find(c => c.id == a.customer_id)?.name || 'Individual').toLowerCase();
          valB = (customers.find(c => c.id == b.customer_id)?.name || 'Individual').toLowerCase();
          break;
        case 'progress':
          valA = parseFloat(a._progress);
          valB = parseFloat(b._progress);
          if (isNaN(valA)) valA = 0;
          if (isNaN(valB)) valB = 0;
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
        <h1 class="text-3xl font-light text-main tracking-tight flex items-center gap-4">
          <span>${statusFilter === 'all' ? 'All' : (statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1))} <span class="font-bold italic text-primary">Projects.</span></span>
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5 p-1 bg-card/30 rounded-xl border border-white/5 mr-4 hidden md:flex">
            <button id="view-table-btn" class="w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dim/50 hover:text-main'}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
            </button>
            <button id="view-kanban-btn" class="w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'kanban' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dim/50 hover:text-main'}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 17v2m3-10v10m3-6v6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"></path></svg>
            </button>
        </div>
        <button id="add-project-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px] transform active:scale-95 leading-none">
          + Create Project
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6 px-2">
        <div class="flex flex-wrap items-center gap-4 w-full xl:w-auto">
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

            <div class="relative group hidden sm:block">
                <select id="lead-filter" class="bg-card/50 border border-white/5 rounded-xl pl-4 pr-10 py-2.5 text-[10px] uppercase tracking-widest font-bold text-main outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer group-hover:bg-card/80">
                    <option value="">All Leads</option>
                    ${team.map(t => `<option value="${t.id}" ${leadFilter == t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <div class="relative group hidden sm:block">
                <select id="dev-filter" class="bg-card/50 border border-white/5 rounded-xl pl-4 pr-10 py-2.5 text-[10px] uppercase tracking-widest font-bold text-main outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer group-hover:bg-card/80">
                    <option value="">All Devs</option>
                    ${team.map(t => `<option value="${t.id}" ${devFilter == t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <div class="flex items-center gap-1.5 p-1 bg-card/30 rounded-xl border border-white/5 overflow-x-auto whitespace-nowrap scrollbar-hide">
                ${['all', 'active', 'on hold', 'completed', 'cancelled', 'archived'].map(status => 
                '<button class="status-filter-btn px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ' + (statusFilter === status ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dim/50 hover:text-dim') + '" data-status="' + status + '">' + status + '</button>'
                ).join('')}
            </div>
            
            ${viewMode === 'kanban' && [...hiddenKanbanProjects].length > 0 ? 
            '<div class="relative group ml-auto"><select id="unhide-project-select" class="bg-primary/10 text-primary border border-primary/20 rounded-xl pl-4 pr-10 py-2.5 text-[10px] uppercase tracking-widest font-bold outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none cursor-pointer"><option value="">Unhide Project...</option>' +
            [...hiddenKanbanProjects].map(id => {
                const p = projects.find(x => String(x.id) === String(id));
                return p ? '<option value="' + p.id + '">' + p.name + '</option>' : '';
            }).join('') + '<option value="ALL">-- SHOW ALL --</option></select></div>' : ''}
            
            ${viewMode === 'kanban' && filtered.length > [...hiddenKanbanProjects].length ? 
            '<button id="hide-all-kanban" class="px-4 py-2.5 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ml-3 border border-white/5">Hide All</button>' : ''}
        </div>

        <div class="flex flex-wrap items-center justify-end gap-4 w-full lg:w-auto">
            <label class="flex items-center gap-3 cursor-pointer group ${viewMode === 'table' ? 'hidden' : ''}">
                <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Compact Mode</span>
                <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                    <input type="checkbox" id="compact-kanban" class="sr-only" ${compactKanban ? 'checked' : ''}>
                    <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${compactKanban ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                </div>
            </label>
            <div class="${viewMode === 'kanban' ? 'hidden' : 'flex'} flex-wrap items-center gap-4">
                <label class="flex items-center gap-3 cursor-pointer group">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Group by Tag</span>
                    <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                        <input type="checkbox" id="group-by-tag" class="sr-only" ${groupByTag ? 'checked' : ''}>
                        <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${groupByTag ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                    </div>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Group by Org</span>
                    <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                        <input type="checkbox" id="group-by-org" class="sr-only" ${groupByOrg ? 'checked' : ''}>
                        <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${groupByOrg ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                    </div>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Group by Lead</span>
                    <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                        <input type="checkbox" id="group-by-lead" class="sr-only" ${groupByLead ? 'checked' : ''}>
                        <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${groupByLead ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                    </div>
                </label>
                <div class="flex items-center gap-4 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                    <label class="flex items-center gap-3 cursor-pointer group">
                        <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Hide Epics</span>
                        <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                            <input type="checkbox" id="hide-epics" class="sr-only" ${hideEpics ? 'checked' : ''}>
                            <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${hideEpics ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                        </div>
                    </label>
                    <div class="w-px h-4 bg-white/10"></div>
                    <label class="flex items-center gap-3 group ${hideEpics ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}">
                        <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Collapse Epics</span>
                        <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors ${hideEpics ? '' : 'group-hover:border-primary/30'}">
                            <input type="checkbox" id="collapse-epics" class="sr-only" ${collapseEpics ? 'checked' : ''} ${hideEpics ? 'disabled' : ''}>
                            <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${collapseEpics ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                        </div>
                    </label>
                </div>
                <label class="flex items-center gap-3 cursor-pointer group">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Hide Ops</span>
                    <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                        <input type="checkbox" id="hide-ops" class="sr-only" ${hideOps ? 'checked' : ''}>
                        <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${hideOps ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                    </div>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 group-hover:text-dim transition-colors">Hide Notes</span>
                    <div class="relative w-9 h-5 bg-white/5 rounded-full border border-white/10 transition-colors group-hover:border-primary/30">
                        <input type="checkbox" id="hide-notes" class="sr-only" ${hideNotes ? 'checked' : ''}>
                        <div class="absolute left-1 top-1 w-3 h-3 rounded-full transition-all ${hideNotes ? 'translate-x-4 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                    </div>
                </label>
            </div>
        </div>
    </div>

    <!-- View Mode Wrapper -->
    ${viewMode === 'table' ? `
    <!-- Projects Table -->
    <div class="zen-card bg-card border border-soft shadow-sm overflow-hidden backdrop-blur-sm relative">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse table-fixed">
            <thead>
            <tr class="bg-app/50 border-b border-soft">
                <th class="py-2.5 px-4 w-12 text-center border-r border-white/5">
                    <input type="checkbox" id="select-all-projects" class="cursor-pointer accent-primary w-3.5 h-3.5" ${filtered.length > 0 && selectedProjectIds.size === filtered.length ? 'checked' : ''}>
                </th>
                <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-full min-w-[200px]" data-sort="name">
                    <div class="flex items-center gap-2">Project ${renderSortIcon('name')}</div>
                </th>
                <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-12 text-center" data-sort="priority">
                    <div class="flex items-center justify-center gap-1" title="Priority">PRI ${renderSortIcon('priority')}</div>
                </th>
                <th class="hidden xl:table-cell py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-20" data-sort="lead">
                    <div class="flex items-center gap-2">Lead ${renderSortIcon('lead')}</div>
                </th>
                <th class="hidden xl:table-cell py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-20" data-sort="dev">
                    <div class="flex items-center gap-2">Dev ${renderSortIcon('dev')}</div>
                </th>
                <th class="hidden xl:table-cell py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-32" data-sort="customer">
                    <div class="flex items-center gap-2">Org ${renderSortIcon('customer')}</div>
                </th>

                <th class="py-2.5 px-2 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-20 text-center" data-sort="status">
                    <div class="flex items-center justify-center gap-1">Status ${renderSortIcon('status')}</div>
                </th>
                <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest cursor-pointer group hover:text-primary transition-colors w-16 xl:w-32 text-right xl:text-left" data-sort="progress">
                    <div class="flex items-center justify-end xl:justify-start gap-2"><span class="hidden xl:inline">Progress</span> <span class="xl:hidden">%</span> ${renderSortIcon('progress')}</div>
                </th>
                <th class="py-2.5 px-4 text-[9px] font-black text-dim uppercase tracking-widest w-24 text-right">Actions</th>
            </tr>
            </thead>
            <tbody id="projects-table-body">
            ${renderTableRows(filtered, customers, team)}
            </tbody>
        </table>
      </div>
    </div>

    ` : `
    <!-- Kanban Board -->
    <div class="flex gap-6 overflow-x-auto pb-6 items-start custom-scrollbar hide-scroll kanban-board" style="min-height: calc(100vh - 280px);">
        ${filtered.filter(p => !hiddenKanbanProjects.has(String(p.id))).map(p => `
        <div class="shrink-0 flex flex-col bg-white/5 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-white/10 rounded-3xl max-h-full kanban-column animate-fade-in resize-x overflow-hidden w-[340px] min-w-[200px] max-w-[600px] relative" data-project-id="${p.id}">
            <div class="p-5 pb-4 flex items-center justify-between group/colheader rounded-t-3xl bg-transparent">
                <div class="min-w-0 pr-3 cursor-pointer project-title-click flex-1 z-10" data-id="${p.id}">
                    <div class="font-black text-[15px] truncate transition-colors drop-shadow-md" style="color: ${p.color || '#fff'}" title="${p.name}">${p.name}</div>
                    <div class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1.5">${p.status || 'Active'} &bull; ${(state.tasks || []).filter(t => String(t.project_id) === String(p.id)).length || 0} tasks</div>
                </div>
                <button class="hide-col-btn opacity-0 group-hover/colheader:opacity-100 transition-opacity text-white/30 hover:text-red-500 bg-white/5 hover:bg-red-500/10 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 z-10 shadow-sm" data-id="${p.id}" title="Hide Project Column">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-3 ${compactKanban ? 'space-y-0' : 'space-y-3'} kanban-dropzone group/dropzone min-h-[150px] custom-scrollbar" data-project-id="${p.id}">
                ${(state.tasks || []).filter(t => String(t.project_id) === String(p.id))
                    .sort((a,b) => {
                        if (a.status !== 'done' && b.status === 'done') return -1;
                        if (a.status === 'done' && b.status !== 'done') return 1;
                        return 0;
                    })
                    .map(t => renderKanbanTask(t, team)).join('')}
                ${(state.tasks || []).filter(t => String(t.project_id) === String(p.id)).length === 0 ? `<div class="opacity-0 group-hover/dropzone:opacity-30 transition-opacity text-center text-[10px] font-black uppercase tracking-widest text-dim py-6 border-2 border-dashed border-dim/20 rounded-xl pointer-events-none">Drop tasks here</div>` : ''}
            </div>
        </div>
        `).join('')}
        ${filtered.filter(p => !hiddenKanbanProjects.has(String(p.id))).length === 0 ? `<div class="w-full py-20 text-center opacity-30 text-xs font-black uppercase tracking-[0.3em]">No projects visible in kanban</div>` : ''}
    </div>
    `}

    <!-- Bulk Actions Overaly -->
    ${selectedProjectIds.size > 0 ? `
    <div id="bulk-action-bar" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-card border border-primary/30 shadow-[0_10px_40px_rgba(35,35,35,1)] rounded-2xl px-6 py-3 flex items-center gap-6 animate-fade-in backdrop-blur-md">
        <span class="text-xs font-black text-main uppercase tracking-widest"><span class="text-primary">${selectedProjectIds.size}</span> Selected</span>
        <div class="w-px h-6 bg-white/10"></div>
        <div class="flex items-center gap-3 pr-4 border-r border-white/5">
            <select id="bulk-lead-select" class="bg-app border-none text-[9px] uppercase tracking-widest font-bold text-main py-1.5 px-3 rounded outline-none focus:ring-1 focus:ring-primary/50">
                <option value="">Set Lead...</option>
                <option value="none">Empty (No Lead)</option>
                ${team.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
            </select>
            <select id="bulk-dev-select" class="bg-app border-none text-[9px] uppercase tracking-widest font-bold text-main py-1.5 px-3 rounded outline-none focus:ring-1 focus:ring-primary/50">
                <option value="">Set Dev...</option>
                <option value="none">Empty (No Dev)</option>
                ${team.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
            </select>
            <button id="bulk-assign-apply" class="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors rounded text-[9px] font-black uppercase tracking-widest cursor-pointer">Apply</button>
        </div>
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

  function renderKanbanTask(t, team) {
    const isDone = t.status === 'done';
    const bgcol = isDone ? 'bg-black/20 shadow-none' : 'bg-[#1a1b1e] hover:bg-[#202226] border-white/5 hover:border-white/10 hover:-translate-y-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-md relative';
    const resName = t.resource_id ? (t.resource_id === 'me' ? 'ME' : (team.find(tm => tm.id == t.resource_id)?.initials || t.resource_id.substring(0,2).toUpperCase())) : '';
    
    if (compactKanban) {
        const compactBg = isDone ? 'bg-black/20' : 'bg-transparent hover:bg-white/5 border-b border-white/5 last:border-b-0';
        return `
        <div class="${compactBg} flex items-center py-1.5 px-3 cursor-grab active:cursor-grabbing kanban-task-card transition-colors ${isDone ? 'opacity-50 grayscale-[0.5]' : ''}" draggable="true" data-task-id="${t.id}">
            <div class="font-medium text-[11px] text-main leading-none truncate transition-colors flex-1 min-w-0" title="${t.title}">${t.title}</div>
            ${resName ? `<div class="ml-2 text-[8px] font-black text-dim/70 uppercase tracking-widest shrink-0" title="${t.resource_id}">${resName}</div>` : ''}
        </div>
        `;
    }

    const tagHtml = (t.tags && t.tags.length > 0) ? `<div class="flex flex-wrap gap-1.5 mt-3">${t.tags.map(tag => `<span class="px-2 py-0.5 bg-black/40 text-[8px] font-bold uppercase tracking-widest rounded-md text-dim/80 shadow-inner">${tag}</span>`).join('')}</div>` : '';

    return `
    <div class="${bgcol} border rounded-2xl p-4 cursor-grab active:cursor-grabbing kanban-task-card transition-all duration-300 ${isDone ? 'opacity-50 grayscale-[0.5]' : ''} overflow-hidden" draggable="true" data-task-id="${t.id}">
        <div class="flex gap-2 items-start justify-between">
            <div class="font-semibold text-xs text-main leading-snug break-words transition-colors">${t.title}</div>
        </div>
        ${tagHtml}
        <div class="flex justify-between items-end mt-4 pt-3 border-t border-white/5">
            <span class="text-[8px] font-black uppercase tracking-[0.1em] text-white/40">${t.status}</span>
            ${resName ? `<div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[8px] font-black text-white/60 border border-white/10 shrink-0 shadow-sm" title="${t.resource_id}">${resName}</div>` : ''}
        </div>
    </div>
    `;
  }

  function renderTableRows(inItems, customers, team) {
    const items = collapseEpics ? inItems.filter(p => !p.parent_id) : inItems;

    if (items.length === 0) {
      return `<tr><td colspan="11" class="py-20 text-center opacity-20"><p class="text-xs font-black uppercase tracking-[0.3em]">No projects found</p></td></tr>`;
    }

    if (!groupByOrg && !groupByTag && !groupByLead) {
      // Find all top-level items (no parent, or parent isn't in the current filtered list)
      const topLevelItems = items.filter(p => !p.parent_id || !items.find(parent => parent.id == p.parent_id));

      let rowsHtml = '';

      topLevelItems.forEach(topLevel => {
        rowsHtml += renderProjectRow(topLevel, customers, team, false);
        
        // Render children immediately under their parent
        const children = items.filter(p => p.parent_id == topLevel.id);
        children.forEach(child => {
          rowsHtml += renderProjectRow(child, customers, team, true);
        });
      });

      return rowsHtml;
    }

    if (groupByTag) {
      const tree = {};
      items.forEach(p => {
        const pTags = p.tags && p.tags.length > 0 ? p.tags : ['Untagged'];
        let currentLevel = tree;
        pTags.forEach((t, i) => {
          if (!currentLevel[t]) {
            currentLevel[t] = { _projects: [], _children: {} };
          }
          if (i === pTags.length - 1) {
            currentLevel[t]._projects.push(p);
          }
          currentLevel = currentLevel[t]._children;
        });
      });

      function countProjects(node) {
        let count = node._projects.length;
        for (const child in node._children) {
          count += countProjects(node._children[child]);
        }
        return count;
      }

      function renderNode(nodes, level) {
        let html = '';
        const sortedTags = Object.keys(nodes).sort((a, b) => a === 'Untagged' ? 1 : b === 'Untagged' ? -1 : a.localeCompare(b));
        
        sortedTags.forEach(tag => {
          const node = nodes[tag];
          const totalProjects = countProjects(node);
          
          if (totalProjects > 0) {
            const paddingLeft = 1.25 + (level * 1.5);
            html += `
            <tr class="bg-app/40">
                <td colspan="11" class="px-5 py-2.5 text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b border-white/5" style="padding-left: ${paddingLeft}rem;">
                    <span class="opacity-50 mr-2">${'#'.repeat(level + 1)}</span> ${tag} 
                    <span class="text-dim/40 ml-2 font-black tabular-nums">[${totalProjects}]</span>
                </td>
            </tr>
            `;
            
            node._projects.forEach(p => {
              html += renderProjectRow(p, customers, team, false);
            });
            
            html += renderNode(node._children, level + 1);
          }
        });
        
        return html;
      }

      return renderNode(tree, 0);
    }

    if (groupByLead) {
      const groups = items.reduce((acc, p) => {
        const leadMember = team.find(t => t.id == p.lead_id);
        const leadName = leadMember ? leadMember.name : 'No Lead';
        if (!acc[leadName]) acc[leadName] = [];
        acc[leadName].push(p);
        return acc;
      }, {});

      return Object.entries(groups).map(([leadName, projects]) => `
        <tr class="bg-app/40">
            <td colspan="11" class="px-5 py-2.5 text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b border-white/5">
                <span class="opacity-50 mr-2">@</span> ${leadName} 
                <span class="text-dim/40 ml-2 font-black tabular-nums">[${projects.length}]</span>
            </td>
        </tr>
        ${projects.map(p => renderProjectRow(p, customers, team, false)).join('')}
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
            <td colspan="11" class="px-5 py-2.5 text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b border-white/5">
                <span class="opacity-50 mr-2">/</span> ${orgName} 
                <span class="text-dim/40 ml-2 font-black tabular-nums">[${projects.length}]</span>
            </td>
        </tr>
        ${projects.map(p => renderProjectRow(p, customers, team, false)).join('')}
    `).join('');
  }

  function renderProjectRow(p, customers, team, isChild = false) {
    const hasVisibleChildren = !collapseEpics && !groupByOrg && !groupByTag && !groupByLead && filtered.some(child => child.parent_id == p.id);
    let isLastChild = false;
    if (isChild && p.parent_id) {
        const siblings = filtered.filter(child => child.parent_id == p.parent_id);
        if (siblings.length > 0) {
            isLastChild = siblings[siblings.length - 1].id == p.id;
        }
    }
    const org = customers.find(c => c.id == p.customer_id && c.is_client == 1);
    const progress = p._progress;
    const pColor = p.color || '#338a81';
    const leadMember = team.find(t => t.id == p.lead_id);
    const devMember = team.find(t => t.id == p.dev_id);
    const priority = parseInt(p.priority) || 10;

    const tagsHtml = p.tags && p.tags.length > 0
      ? `<div class="flex flex-wrap items-center gap-1.5 ml-2">${p.tags.map(t => {
          if (t.toLowerCase().includes('urgent')) {
            return `<span class="whitespace-nowrap text-[8px] uppercase tracking-widest bg-red-500/20 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded">${t}</span>`;
          }
          return `<span class="whitespace-nowrap text-[8px] uppercase tracking-widest bg-white/5 text-dim px-1.5 py-0.5 rounded">${t}</span>`;
        }).join('')}</div>`
      : '';

    // Type formatting
    let typeBadge = '';
    if (p.type === 'epic') {
      typeBadge = '<span class="whitespace-nowrap px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] uppercase tracking-widest font-black mr-1 border border-primary/20">EPIC</span>';
    } else if (p.type === 'ops') {
      typeBadge = '<span class="whitespace-nowrap px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] uppercase tracking-widest font-black mr-1 border border-blue-500/20 hover:bg-blue-500/30 transition-colors" title="Operations">OPS</span>';
    }

    return `
    <tr draggable="true" class="border-b border-soft last:border-b-0 hover:bg-app/40 transition-all group/row cursor-pointer ${isChild ? 'bg-app/20' : 'border-t-[3px] border-t-card bg-card'}" data-id="${p.id}">
        <td class="px-4 py-2 text-center border-r border-white/5 project-checkbox-td">
            <input type="checkbox" class="project-checkbox cursor-pointer accent-primary w-3.5 h-3.5" value="${p.id}" ${selectedProjectIds.has(String(p.id)) ? 'checked' : ''}>
        </td>
        <td class="px-4 py-2 relative ${isChild ? 'pl-11' : ''}">
            ${isChild && !isLastChild ? `<div class="absolute left-[19px] top-0 bottom-[-1rem] border-l-2 border-dim/40 pointer-events-none z-0"></div>` : ''}
            <div class="flex items-center gap-2 relative z-10">
                ${isChild ? `<div class="absolute -left-[25px] -top-[10px] w-[25px] h-[21px] border-l-2 border-b-2 border-dim/40 rounded-bl-sm pointer-events-none"></div>` : ''}
                <div class="w-2 h-2 rounded-full shadow-sm shrink-0" style="background-color: ${pColor}"></div>
                ${typeBadge}
                <span class="${isChild ? 'font-medium text-main/70 text-[13px]' : 'font-bold text-main text-sm'} tracking-tight group-hover/row:text-primary transition-colors truncate block" title="${p.name}">${p.name}</span>
                ${tagsHtml}
            </div>
            <div class="relative ${isChild ? '' : 'ml-[1.75rem]'} ${!isChild && hasVisibleChildren ? 'z-0' : ''}">
                ${!isChild && hasVisibleChildren ? `<div class="absolute -left-[25px] -top-3 -bottom-6 border-l-2 border-dim/40 pointer-events-none"></div>` : ''}
                <div class="flex flex-wrap items-center gap-3 mt-1.5 opacity-60 group-hover/row:opacity-100 transition-opacity">
                ${leadMember ? `
                <div class="flex items-center gap-1.5 xl:hidden" title="Lead: ${leadMember.name}">
                    <div class="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-black text-primary border border-primary/30 uppercase shrink-0">${leadMember.initials || leadMember.name.substring(0, 2)}</div>
                    <span class="text-[9px] font-bold text-dim uppercase tracking-widest">${leadMember.name}</span>
                </div>` : ''}
                ${devMember ? `
                <div class="flex items-center gap-1.5 xl:hidden" title="Dev: ${devMember.name}">
                    <div class="w-3.5 h-3.5 rounded-full bg-blue-500/20 flex items-center justify-center text-[7px] font-black text-blue-400 border border-blue-500/30 uppercase shrink-0">${devMember.initials || devMember.name.substring(0, 2)}</div>
                    <span class="text-[9px] font-bold text-dim uppercase tracking-widest">${devMember.name}</span>
                </div>` : ''}
                <div class="flex items-center gap-1 xl:hidden" title="Org: ${org ? org.name : 'Individual'}">
                    <span class="text-dim/50 text-[10px] font-black">/</span>
                    <span class="text-[9px] font-bold text-dim uppercase tracking-widest truncate max-w-[100px]">${org ? org.name : 'Individual'}</span>
                </div>
                ${(p.notes && !hideNotes) ? `
                <div class="flex items-center gap-1.5 flex-1 min-w-0 max-w-full" title="${p.notes.replace(/"/g, '&quot;')}">
                    <svg class="w-3 h-3 md:w-3.5 md:h-3.5 text-dim/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                    <span class="text-[9px] md:text-[11px] font-medium text-dim/70 truncate">${p.notes.split(/\r?\n/)[0].trim()}</span>
                </div>` : ''}
                </div>
            </div>
        </td>
        <td class="px-4 py-2 text-center text-dim/60 font-black text-[10px] tabular-nums">
             ${priority}
        </td>
        <td class="hidden xl:table-cell px-4 py-2">
            <div class="flex items-center gap-2">
                ${leadMember ? `
                    <div class="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-black text-primary border border-primary/30 uppercase shrink-0">
                        ${leadMember.initials || leadMember.name.substring(0, 2)}
                    </div>
                ` : ``}
            </div>
        </td>
        <td class="hidden xl:table-cell px-4 py-2">
            <div class="flex items-center gap-2">
                ${devMember ? `
                    <div class="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-black text-blue-400 border border-blue-500/30 uppercase shrink-0">
                        ${devMember.initials || devMember.name.substring(0, 2)}
                    </div>
                ` : ``}
            </div>
        </td>
        <td class="hidden xl:table-cell px-4 py-2">
            <span class="text-[10px] font-bold text-dim/60 group-hover/row:text-main transition-colors uppercase tracking-widest truncate block" title="${org ? org.name : 'Individual'}">${org ? org.name : 'Individual'}</span>
        </td>

        <td class="px-2 py-2 text-center">
            <span class="text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-1 rounded-md border inline-block w-full truncate" 
                  style="background-color: ${applyAlpha(pColor, 0.08)}; border-color: ${applyAlpha(pColor, 0.15)}; color: ${pColor}" title="${p.status || 'Active'}">${p.status || 'Active'}</span>
        </td>
        <td class="px-4 py-2 text-right xl:text-left">
            ${p.type === 'ops' ? '' : `
            <div class="flex items-center justify-end xl:justify-start gap-3">
                <div class="hidden xl:block flex-1 bg-app rounded-full h-1.5 overflow-hidden border border-white/5 shadow-inner">
                    <div class="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.2)]" style="width: ${progress}%; background-color: ${pColor}"></div>
                </div>
                <span class="text-[10px] font-black text-main tabular-nums tracking-widest shrink-0">${progress}%</span>
            </div>
            `}
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

  const kanbanBtn = container.querySelector('#view-kanban-btn');
  if (kanbanBtn) kanbanBtn.onclick = () => { localStorage.setItem('project_view_mode', 'kanban'); viewMode = 'kanban'; refreshView(); };
  
  const tableBtn = container.querySelector('#view-table-btn');
  if (tableBtn) tableBtn.onclick = () => { localStorage.setItem('project_view_mode', 'table'); viewMode = 'table'; refreshView(); };

  const unhideSelect = container.querySelector('#unhide-project-select');
  if (unhideSelect) {
      unhideSelect.onchange = (e) => {
          if (e.target.value === 'ALL') {
              hiddenKanbanProjects.clear();
          } else if (e.target.value) {
              hiddenKanbanProjects.delete(String(e.target.value));
          }
          if (e.target.value) {
              localStorage.setItem('hidden_kanban_projects', JSON.stringify([...hiddenKanbanProjects]));
              refreshView();
          }
      };
  }

  const hideAllKanbanBtn = container.querySelector('#hide-all-kanban');
  if (hideAllKanbanBtn) {
      hideAllKanbanBtn.onclick = () => {
          filtered.forEach(p => hiddenKanbanProjects.add(String(p.id)));
          localStorage.setItem('hidden_kanban_projects', JSON.stringify([...hiddenKanbanProjects]));
          refreshView();
      };
  }

  const compactKanbanToggle = container.querySelector('#compact-kanban');
  if (compactKanbanToggle) {
      compactKanbanToggle.onchange = (e) => {
          compactKanban = e.target.checked;
          localStorage.setItem('compact_kanban', compactKanban.toString());
          refreshView();
      };
  }

  // Hide Column Handlers
  container.querySelectorAll('.hide-col-btn').forEach(btn => {
      btn.onclick = (e) => {
          e.stopPropagation();
          const pid = btn.dataset.id;
          if (pid) {
              hiddenKanbanProjects.add(String(pid));
              localStorage.setItem('hidden_kanban_projects', JSON.stringify([...hiddenKanbanProjects]));
              refreshView();
          }
      };
  });

  // Kanban Horizontal Scroll with Mouse Wheel
  const kanbanBoardDiv = container.querySelector('.kanban-board');
  if (kanbanBoardDiv) {
      kanbanBoardDiv.addEventListener('wheel', (e) => {
          // Map vertical scroll (deltaY) to horizontal scroll (scrollLeft)
          // Avoid mapping if the user is scrolling horizontally naturally (deltaX !== 0)
          if (e.deltaY !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
              kanbanBoardDiv.scrollLeft += e.deltaY;
              e.preventDefault();
          }
      }, { passive: false });
  }

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
      localStorage.setItem('project_status_filter', statusFilter);
      refreshView();
    };
  });

  // Group by Organization Toggle
  container.querySelector('#group-by-org').onchange = (e) => {
    groupByOrg = e.target.checked;
    localStorage.setItem('project_group_by_org', groupByOrg);
    if (groupByOrg) { groupByTag = false; groupByLead = false; localStorage.setItem('project_group_by_tag', false); localStorage.setItem('project_group_by_lead', false); }
    refreshView();
  };

  if (container.querySelector('#group-by-tag')) {
    container.querySelector('#group-by-tag').onchange = (e) => {
      groupByTag = e.target.checked;
      localStorage.setItem('project_group_by_tag', groupByTag);
      if (groupByTag) { groupByOrg = false; groupByLead = false; localStorage.setItem('project_group_by_org', false); localStorage.setItem('project_group_by_lead', false); }
      refreshView();
    };
  }

  const groupByLeadToggle = container.querySelector('#group-by-lead');
  if (groupByLeadToggle) {
    groupByLeadToggle.onchange = (e) => {
      groupByLead = e.target.checked;
      localStorage.setItem('project_group_by_lead', groupByLead);
      if (groupByLead) { groupByOrg = false; groupByTag = false; localStorage.setItem('project_group_by_org', false); localStorage.setItem('project_group_by_tag', false); }
      refreshView();
    };
  }

  // Tag filter
  const tagSelect = container.querySelector('#tag-filter');
  if (tagSelect) {
    tagSelect.onchange = (e) => {
      tagFilter = e.target.value;
      localStorage.setItem('project_tag_filter', tagFilter);
      refreshView();
    };
  }

  // Lead filter
  const leadSelect = container.querySelector('#lead-filter');
  if (leadSelect) {
    leadSelect.onchange = (e) => {
      leadFilter = e.target.value;
      localStorage.setItem('project_lead_filter', leadFilter);
      refreshView();
    };
  }

  // Dev filter
  const devSelect = container.querySelector('#dev-filter');
  if (devSelect) {
    devSelect.onchange = (e) => {
      devFilter = e.target.value;
      localStorage.setItem('project_dev_filter', devFilter);
      refreshView();
    };
  }

  // Hide Epics Toggle
  if (container.querySelector('#hide-epics')) {
    container.querySelector('#hide-epics').onchange = (e) => {
      hideEpics = e.target.checked;
      localStorage.setItem('project_hide_epics', hideEpics);
      if (hideEpics) { collapseEpics = false; localStorage.setItem('project_collapse_epics', false); }
      refreshView();
    };
  }

  // Collapse Epics Toggle
  if (container.querySelector('#collapse-epics')) {
    container.querySelector('#collapse-epics').onchange = (e) => {
      collapseEpics = e.target.checked;
      localStorage.setItem('project_collapse_epics', collapseEpics);
      refreshView();
    };
  }

  // Hide Ops Toggle
  if (container.querySelector('#hide-ops')) {
    container.querySelector('#hide-ops').onchange = (e) => {
      hideOps = e.target.checked;
      localStorage.setItem('project_hide_ops', hideOps);
      refreshView();
    };
  }

  // Hide Notes Toggle
  if (container.querySelector('#hide-notes')) {
    container.querySelector('#hide-notes').onchange = (e) => {
      hideNotes = e.target.checked;
      localStorage.setItem('project_hide_notes', hideNotes);
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
      localStorage.setItem('project_sort_config', JSON.stringify(sortConfig));
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

    // Bulk Assign Lead/Dev
    if (e.target.id === 'bulk-assign-apply') {
        const leadId = document.getElementById('bulk-lead-select').value;
        const devId = document.getElementById('bulk-dev-select').value;
        
        if (leadId === '' && devId === '') return; // Nothing selected

        const arr = Array.from(selectedProjectIds);
        for (const id of arr) {
            const projectToUpdate = (statusFilter === 'archived' ? filtered : state.projects || []).find(p => String(p.id) === String(id));
            if (!projectToUpdate) continue;

            const payload = { id, name: projectToUpdate.name };
            if (leadId !== '') payload.lead_id = leadId === 'none' ? null : leadId;
            if (devId !== '') payload.dev_id = devId === 'none' ? null : devId;
            
            await api.post('projects.php', payload);
        }

        store.update('projects', await api.get('projects.php'));
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

    // Edit Kanban Task
    const kanbanTask = e.target.closest('.kanban-task-card');
    if (kanbanTask) {
        const taskId = kanbanTask.dataset.taskId;
        if (taskId) {
            const task = (state.tasks || []).find(t => String(t.id) === String(taskId));
            if (task) {
                TaskModal.open(task, {
                    onSave: async () => {
                        store.update('tasks', await api.get('planner.php'));
                        refreshView();
                    }
                }, team);
            }
        }
        return;
    }

  });

  // Drag and Drop
  let draggedRow = null;
  let draggedKanbanTask = null;

  container.addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) {
      draggedRow = tr;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tr.dataset.id);
      setTimeout(() => tr.classList.add('opacity-50'), 0);
      return;
    }

    const taskCard = e.target.closest('.kanban-task-card');
    if (taskCard) {
      draggedKanbanTask = taskCard;
      e.dataTransfer.effectAllowed = 'move';
      const sourceProjectId = taskCard.closest('.kanban-dropzone').dataset.projectId;
      e.dataTransfer.setData('application/json', JSON.stringify({ taskId: taskCard.dataset.taskId, sourceProjectId }));
      setTimeout(() => taskCard.classList.add('opacity-30'), 0);
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
      return;
    }

    if (draggedKanbanTask) {
        const dropzone = e.target.closest('.kanban-dropzone');
        if (dropzone) {
            dropzone.classList.add('bg-white/5');
            // Basic insert visual feedback inside the column
            const taskCard = e.target.closest('.kanban-task-card');
            if (taskCard && taskCard !== draggedKanbanTask) {
                const rect = taskCard.getBoundingClientRect();
                const offset = e.clientY - rect.top;
                if (offset > rect.height / 2) {
                    taskCard.parentNode.insertBefore(draggedKanbanTask, taskCard.nextSibling);
                } else {
                    taskCard.parentNode.insertBefore(draggedKanbanTask, taskCard);
                }
            } else if (!taskCard && dropzone !== draggedKanbanTask.parentNode) {
                dropzone.appendChild(draggedKanbanTask);
            }
        }
    }
  });

  container.addEventListener('dragleave', (e) => {
      const dropzone = e.target.closest('.kanban-dropzone');
      // Remove visual feedback if leaving the dropzone boundary entirely
      if (dropzone && (!e.relatedTarget || !dropzone.contains(e.relatedTarget))) {
          dropzone.classList.remove('bg-white/5');
      }
  });

  container.addEventListener('drop', async (e) => {
      if (draggedKanbanTask) {
          const dropzone = e.target.closest('.kanban-dropzone');
          if (dropzone) {
              dropzone.classList.remove('bg-white/5');
              const targetProjectId = dropzone.dataset.projectId;
              try {
                  const data = JSON.parse(e.dataTransfer.getData('application/json'));
                  if (String(data.sourceProjectId) !== String(targetProjectId)) {
                      // Call planner.php to update project_id of the task
                      const payload = { id: data.taskId, project_id: targetProjectId };
                      await api.post('planner.php', payload);
                      store.update('tasks', await api.get('planner.php'));
                      refreshView();
                  }
              } catch (err) {
                  console.error('Failed to parse kanban drop data', err);
              }
          }
      }
  });

  container.addEventListener('dragend', async (e) => {
    if (draggedKanbanTask) {
        draggedKanbanTask.classList.remove('opacity-30');
        // Clear all dropzone highlights just in case
        container.querySelectorAll('.kanban-dropzone').forEach(d => d.classList.remove('bg-white/5'));
        draggedKanbanTask = null;
    }

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

        if (sortConfig.key !== 'list_order') {
          sortConfig.key = 'list_order';
          sortConfig.direction = 'asc';
        }
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
