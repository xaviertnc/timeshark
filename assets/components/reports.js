import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

let currentPage = 1;
const ITEMS_PER_PAGE = 8;

export async function renderReports() {
    const state = store.get();
    const entries = state.timeEntries || [];
    const projects = state.projects || [];

    const projectTimes = {};
    let totalSeconds = 0;

    entries.forEach(e => {
        if (!e.end_time) return;
        const diff = (new Date(e.end_time) - new Date(e.start_time)) / 1000;
        projectTimes[e.project_id] = (projectTimes[e.project_id] || 0) + diff;
        totalSeconds += diff;
    });

    const formatDuration = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // Pagination logic
    const completedEntries = entries.filter(e => e.end_time).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    const totalPages = Math.ceil(completedEntries.length / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedEntries = completedEntries.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    const container = document.createElement('div');
    container.className = "max-w-5xl mx-auto animate-slide-up pb-20";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-16 px-2">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3">Analytics</h2>
                 <h1 class="text-3xl font-light text-slate-800 tracking-tight">Time <span class="font-bold italic text-primary">Reports.</span></h1>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Total Time</div>
                <div class="text-2xl font-light text-slate-700 tracking-tighter">${formatDuration(totalSeconds)}</div>
            </div>
        </div>

        <!-- Project Stats -->
        <div class="bg-white rounded-[2rem] p-12 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-slate-50 mb-16">
            <h3 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-8">Allocation Summary</h3>
            <div class="space-y-8">
                ${Object.entries(projectTimes).map(([pid, secs]) => {
        const proj = projects.find(p => p.id == pid) || { name: 'Unknown', color: '#eceff1' };
        const percent = totalSeconds > 0 ? (secs / totalSeconds) * 100 : 0;
        return `
                        <div>
                            <div class="flex justify-between items-end mb-3">
                                <div>
                                    <span class="text-sm font-bold text-slate-600">${proj.name}</span>
                                    <span class="ml-2 text-[9px] font-black text-slate-200 uppercase">${Math.round(percent)}%</span>
                                </div>
                                <span class="text-[11px] font-bold text-slate-400">${formatDuration(secs)}</span>
                            </div>
                            <div class="w-full bg-slate-50 rounded-full h-1 overflow-hidden">
                                <div class="h-full transition-all duration-700" style="width: ${percent}%; background-color: ${proj.color}"></div>
                            </div>
                        </div>
                    `;
    }).join('')}
                ${Object.keys(projectTimes).length === 0 ? '<p class="text-center py-6 text-slate-200 font-bold uppercase tracking-widest text-[9px]">No data logged yet</p>' : ''}
            </div>
        </div>

        <!-- History -->
        <div class="space-y-4">
            <div class="flex items-center justify-between mb-8 px-2">
                <h3 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Time History</h3>
                ${totalPages > 1 ? `
                    <div class="flex items-center gap-1">
                        <button id="prev-page" ${currentPage === 1 ? 'disabled' : ''} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-20">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <span class="text-[10px] font-black text-slate-300 px-2">PAGE ${currentPage} / ${totalPages}</span>
                        <button id="next-page" ${currentPage === totalPages ? 'disabled' : ''} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-20">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                ` : ''}
            </div>

            ${paginatedEntries.map(e => {
        const proj = projects.find(p => p.id == e.project_id) || { name: 'Unassigned', color: '#eceff1' };
        const duration = formatDuration((new Date(e.end_time) - new Date(e.start_time)) / 1000);

        return `
                    <div class="bg-white rounded-[1.25rem] p-3.5 border border-slate-50 shadow-sm group hover:border-primary/20 transition-all duration-300 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-1 h-7 rounded-full" style="background-color: ${proj.color}"></div>
                            <div>
                                <h4 class="text-sm font-bold text-slate-700 tracking-tight leading-none mb-1">${proj.name}</h4>
                                <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">${e.description || 'No description provided'}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-6">
                            <div class="text-right">
                                <div class="text-base font-light text-slate-800 tracking-tighter leading-none">${duration}</div>
                                <div class="text-[8px] font-black text-slate-200 uppercase mt-0.5">${new Date(e.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            </div>
                            <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="edit-btn text-slate-200 hover:text-primary transition-colors p-1.5" data-id="${e.id}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button class="delete-btn text-slate-200 hover:text-red-300 transition-colors p-1.5" data-id="${e.id}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}

            ${completedEntries.length === 0 ? `
                <div class="text-center py-20 opacity-20">
                    <p class="text-[10px] font-black uppercase tracking-[0.4em]">Historical record empty</p>
                </div>
            ` : ''}
        </div>
    `;

    const modalPortal = document.getElementById('modal-portal');
    modalPortal.innerHTML = `
        <div id="edit-modal" class="fixed inset-0 bg-secondary/20 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
            <div class="min-h-screen w-full flex items-center justify-center p-4">
                <div class="bg-white rounded-[2rem] shadow-2xl w-full max-md p-10 transform transition-all scale-95 opacity-0 text-center relative" id="edit-modal-content">
                    <button id="close-edit-modal" class="absolute top-6 right-8 text-slate-300 hover:text-slate-600 text-2xl transition-colors">&times;</button>
                    
                    <div class="mb-10">
                        <h3 class="text-2xl font-bold text-slate-800 tracking-tight">Edit Entry</h3>
                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-2">Log Adjustment</p>
                    </div>

                    <form id="edit-form" class="space-y-8">
                        <input type="hidden" name="id">
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Project</label>
                            <select name="project_id" required class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-center text-slate-600 font-medium cursor-pointer appearance-none">
                                ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Description</label>
                            <input type="text" name="description" placeholder="Enter description" class="w-full text-center py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Start Time</label>
                                <input type="datetime-local" name="start_time" required class="w-full text-center py-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-xs">
                            </div>
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest block">End Time</label>
                                <input type="datetime-local" name="end_time" required class="w-full text-center py-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-xs">
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

    container.addEventListener('click', async (event) => {
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
