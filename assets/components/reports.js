import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

let currentPage = 1;
const DAYS_PER_PAGE = 5;
let selectedProject = '';
let selectedMember = '';

export async function renderReports() {
    const state = store.get();
    const entries = state.timeEntries || [];
    const projects = state.projects || [];

    const tasks = state.tasks || [];

    const projectStats = {};
    let totalSecondsLogged = 0;

    // Calculate Logged Time
    entries.forEach(e => {
        if (!e.end_time) return;
        const diff = (new Date(e.end_time) - new Date(e.start_time)) / 1000;
        if (!projectStats[e.project_id]) projectStats[e.project_id] = { logged: 0, planned: 0 };
        projectStats[e.project_id].logged += diff;
        totalSecondsLogged += diff;
    });

    // Calculate Planned Time from Tasks
    tasks.forEach(t => {
        if (!projectStats[t.project_id]) projectStats[t.project_id] = { logged: 0, planned: 0 };
        let plannedSeconds = 3600;
        if (t.slots && typeof t.slots === 'string') {
            plannedSeconds = t.slots.split(',').filter(s => s.trim() !== '').length * 3600;
        } else {
            plannedSeconds = (new Date(t.end_date || t.start_date) - new Date(t.start_date)) / 1000 || 3600;
        }
        projectStats[t.project_id].planned += plannedSeconds;
    });

    const formatDuration = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // Filter logic
    const filteredEntries = entries.filter(e => {
        if (!e.end_time) return false;
        if (selectedProject && e.project_id !== selectedProject) return false;
        if (selectedMember && (e.resource_id || 'Main') !== selectedMember) return false;
        return true;
    });

    // Grouping logic
    const grouped = {};
    filteredEntries.forEach(e => {
        const d = new Date(e.start_time);
        const dayKey = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        if (!grouped[dayKey]) grouped[dayKey] = {
            entries: [],
            total: 0,
            date: d
        };
        const duration = (new Date(e.end_time) - new Date(e.start_time)) / 1000;
        grouped[dayKey].entries.push(e);
        grouped[dayKey].total += duration;
    });

    const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const totalPages = Math.ceil(sortedDays.length / DAYS_PER_PAGE);
    const paginatedDays = sortedDays.slice((currentPage - 1) * DAYS_PER_PAGE, currentPage * DAYS_PER_PAGE);

    const formatTime = (dateStr) => {
        if (!dateStr) return '--:--';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const container = document.createElement('div');
    container.className = "max-w-5xl mx-auto pb-20";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-16 px-2">
            <div>
                 <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-3">Analytics</h2>
                 <h1 class="text-3xl font-light text-main tracking-tight">Time <span class="font-bold italic text-primary">Reports.</span></h1>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mb-1">Total Time</div>
                <div class="text-2xl font-light text-muted tracking-tighter">${formatDuration(totalSecondsLogged)}</div>
            </div>
        </div>

        <div class="bg-card rounded-[2rem] p-12 shadow-soft border border-soft mb-16">
            <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-8">Performance & Fulfillment</h3>
            <div class="space-y-8">
                ${Object.entries(projectStats).map(([pid, stats]) => {
        const proj = projects.find(p => p.id == pid) || { name: 'Unknown', color: '#eceff1' };
        const fulfillment = stats.planned > 0 ? Math.min(100, Math.round((stats.logged / stats.planned) * 100)) : 0;
        const allocation = totalSecondsLogged > 0 ? Math.round((stats.logged / totalSecondsLogged) * 100) : 0;

        return `
                        <div>
                            <div class="flex justify-between items-end mb-3">
                                <div>
                                    <span class="text-sm font-bold text-main/80">${proj.name}</span>
                                    <span class="ml-2 text-[9px] font-black text-primary uppercase tracking-widest">${fulfillment}% Fulfilled</span>
                                    <span class="ml-2 text-[8px] font-black text-dim uppercase opacity-50">(${allocation}% of total volume)</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[11px] font-bold text-main block">${formatDuration(stats.logged)}</span>
                                    <span class="text-[8px] font-black text-dim uppercase tracking-widest">of ${formatDuration(stats.planned)} target</span>
                                </div>
                            </div>
                            <div class="w-full bg-app rounded-full h-1 overflow-hidden">
                                <div class="h-full transition-all duration-1000" style="width: ${fulfillment}%; background-color: ${proj.color}"></div>
                            </div>
                        </div>
                    `;
    }).join('')}
                ${Object.keys(projectStats).length === 0 ? '<p class="text-center py-6 text-dim font-bold uppercase tracking-widest text-[9px]">No logs or assignments found</p>' : ''}
            </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-4 mb-8 px-2">
            <div class="flex-1 min-w-[200px]">
                <label class="text-[9px] font-black text-dim uppercase tracking-widest mb-1.5 block ml-1">Filter Project</label>
                <select id="filter-project" class="w-full bg-card border border-soft rounded-xl py-2.5 px-4 text-xs font-bold text-main appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20">
                    <option value="">All Projects</option>
                    ${projects.map(p => `<option value="${p.id}" ${selectedProject === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="flex-1 min-w-[200px]">
                <label class="text-[9px] font-black text-dim uppercase tracking-widest mb-1.5 block ml-1">Filter Member</label>
                <select id="filter-member" class="w-full bg-card border border-soft rounded-xl py-2.5 px-4 text-xs font-bold text-main appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20">
                    <option value="">All Members</option>
                    ${(state.team || []).map(m => `<option value="${m.name}" ${selectedMember === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}
                </select>
            </div>
            <div class="pt-5">
                <button id="clear-filters" class="text-[9px] font-black text-dim hover:text-primary uppercase tracking-widest transition-colors">Clear</button>
            </div>
        </div>

        <!-- History -->
        <div class="space-y-10">
            <div class="flex items-center justify-between px-2">
                <h3 class="text-[10px] font-black text-dim uppercase tracking-[0.4em]">Time History</h3>
                ${totalPages > 1 ? `
                    <div class="flex items-center gap-1">
                        <button id="prev-page" ${currentPage === 1 ? 'disabled' : ''} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-app transition-colors disabled:opacity-20">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <span class="text-[10px] font-black text-dim px-2">PAGE ${currentPage} / ${totalPages}</span>
                        <button id="next-page" ${currentPage === totalPages ? 'disabled' : ''} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-app transition-colors disabled:opacity-20">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                ` : ''}
            </div>

            ${paginatedDays.map(dayKey => {
        const group = grouped[dayKey];
        const displayDate = group.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

        return `
                    <div class="space-y-3">
                        <div class="flex items-center justify-between px-2 opacity-50">
                            <div class="text-[9px] font-black text-dim uppercase tracking-[0.2em]">${displayDate}</div>
                            <div class="text-[9px] font-black text-dim uppercase tracking-[0.2em]">${formatDuration(group.total)}</div>
                        </div>
                        <div class="space-y-3">
                            ${group.entries.map(e => {
            const proj = projects.find(p => p.id == e.project_id) || { name: 'Unassigned', color: '#eceff1' };
            const duration = formatDuration((new Date(e.end_time) - new Date(e.start_time)) / 1000);
            const member = state.team?.find(m => m.name === e.resource_id) || { color: '#94a3b8' };

            return `
                                    <div class="bg-card rounded-[1.25rem] p-4 border border-soft shadow-sm group/row hover:border-primary/20 transition-all duration-300 flex items-center justify-between">
                                        <div class="flex items-center gap-4 flex-1">
                                            <div class="w-1 h-8 rounded-full" style="background-color: ${proj.color}"></div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <h4 class="text-xs font-bold text-main tracking-tight truncate">${proj.name}</h4>
                                                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-app text-dim uppercase tracking-widest">${e.resource_id || 'Main'}</span>
                                                </div>
                                                <p class="text-[10px] font-medium text-muted truncate">${e.description || 'No description provided'}</p>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-8">
                                            <div class="text-right whitespace-nowrap">
                                                <div class="text-[10px] font-black text-dim uppercase tracking-widest mb-1 opacity-40">${formatTime(e.start_time)} – ${formatTime(e.end_time)}</div>
                                                <div class="text-sm font-bold text-main tracking-tighter tabular-nums">${duration}</div>
                                            </div>
                                            <div class="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                <button class="edit-btn text-dim hover:text-primary transition-colors p-1.5" data-id="${e.id}">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                </button>
                                                <button class="delete-btn text-dim hover:text-red-300 transition-colors p-1.5" data-id="${e.id}">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                `;
    }).join('')}

            ${sortedDays.length === 0 ? `
                <div class="text-center py-20 opacity-20">
                    <p class="text-[10px] font-black uppercase tracking-[0.4em]">No matching records</p>
                </div>
            ` : ''}
        </div>
    `;

    const modalPortal = document.getElementById('modal-portal');
    modalPortal.innerHTML = `
        <div id="edit-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
            <div class="min-h-screen w-full flex items-center justify-center p-4">
                <div class="bg-card rounded-[2rem] shadow-soft w-full max-w-md p-10 transform transition-all scale-95 opacity-0 text-center relative" id="edit-modal-content">
                    <button id="close-edit-modal" class="absolute top-6 right-8 text-dim hover:text-main text-2xl transition-colors">&times;</button>
                    
                    <div class="mb-10">
                        <h3 class="text-2xl font-bold text-main tracking-tight">Edit Entry</h3>
                        <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Log Adjustment</p>
                    </div>

                    <form id="edit-form" class="space-y-8">
                        <input type="hidden" name="id">
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Project</label>
                            <select name="project_id" required class="w-full bg-app border-none rounded-2xl py-4 px-6 text-center text-main font-medium cursor-pointer appearance-none">
                                ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Description</label>
                            <input type="text" name="description" placeholder="Enter description" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Start Time</label>
                                <input type="datetime-local" name="start_time" required class="w-full text-center py-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-xs text-main">
                            </div>
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block">End Time</label>
                                <input type="datetime-local" name="end_time" required class="w-full text-center py-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-xs text-main">
                            </div>
                        </div>
                        <div class="pt-8">
                            <button type="submit" class="w-full h-18 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 py-5">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = modalPortal.querySelector('#edit-modal');
    const modalContent = modalPortal.querySelector('#edit-modal-content');
    const editForm = modalPortal.querySelector('#edit-form');

    const openModal = (entry) => {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            const z = (n) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
        };

        editForm.id.value = entry.id;
        editForm.project_id.value = entry.project_id || '';
        editForm.description.value = entry.description || '';
        editForm.start_time.value = formatDate(entry.start_time);
        editForm.end_time.value = formatDate(entry.end_time);

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
        }, 200);
    };

    modalPortal.querySelector('#close-edit-modal').onclick = closeModal;

    editForm.onsubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(editForm);
        const data = Object.fromEntries(formData.entries());
        data.start_time = new Date(data.start_time).toISOString();
        data.end_time = new Date(data.end_time).toISOString();

        try {
            await api.post('time-entries.php', data);
            store.update('timeEntries', await api.get('time-entries.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Update failed');
        }
    };

    container.addEventListener('change', (event) => {
        if (event.target.id === 'filter-project') {
            selectedProject = event.target.value;
            currentPage = 1;
            refreshView();
        }
        if (event.target.id === 'filter-member') {
            selectedMember = event.target.value;
            currentPage = 1;
            refreshView();
        }
    });

    container.addEventListener('click', async (event) => {
        if (event.target.id === 'clear-filters') {
            selectedProject = '';
            selectedMember = '';
            currentPage = 1;
            refreshView();
        }
        if (event.target.closest('#prev-page')) {
            if (currentPage > 1) {
                currentPage--;
                refreshView();
            }
        }
        if (event.target.closest('#next-page')) {
            if (currentPage < totalPages) {
                currentPage++;
                refreshView();
            }
        }

        const deleteBtn = event.target.closest('.delete-btn');
        if (deleteBtn) {
            if (confirm('Delete this entry?')) {
                const id = deleteBtn.dataset.id;
                await api.delete(`time-entries.php?id=${id}`);
                store.update('timeEntries', await api.get('time-entries.php'));
                refreshView();
            }
            return;
        }

        const editBtn = event.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const entry = entries.find(e => e.id == id);
            if (entry) openModal(entry);
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderReports());
    }

    return container;
}
