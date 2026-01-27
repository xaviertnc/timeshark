import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderProjects() {
    const state = store.get();
    const projects = state.projects || [];
    const customers = state.customers || [];

    const container = document.createElement('div');
    container.className = "max-w-6xl mx-auto space-y-6";

    // Header
    container.innerHTML = `
        <div class="flex items-center justify-between mb-8">
            <h2 class="text-3xl font-bold text-slate-800">Projects</h2>
            <button id="add-project-btn" class="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md transition-all flex items-center font-medium">
                <span class="mr-2 text-xl">+</span> New Project
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${projects.map(p => {
        const customer = customers.find(c => c.id == p.customer_id);
        return renderProjectCard(p, customer);
    }).join('')}
        </div>

        ${projects.length === 0 ? `
            <div class="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <p class="text-slate-400 text-lg">No projects yet. Start something new!</p>
            </div>
        ` : ''}

        <!-- Add Project Modal -->
        <div id="project-modal" class="fixed inset-0 bg-slate-900/50 hidden items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all scale-95 opacity-0" id="project-modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800" id="modal-title">New Project</h3>
                    <button id="close-project-modal" class="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <form id="project-form" class="space-y-5">
                    <input type="hidden" name="id" id="project-id">
                    
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Project Name</label>
                        <input type="text" name="name" required 
                            class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none transition-all">
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Customer</label>
                        <select name="customer_id" required class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white">
                            <option value="">Select a Customer...</option>
                            ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Color Code</label>
                        <div class="flex gap-2 flex-wrap">
                            ${['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => `
                                <label class="cursor-pointer">
                                    <input type="radio" name="color" value="${color}" class="peer sr-only" ${color === '#3b82f6' ? 'checked' : ''}>
                                    <div class="w-8 h-8 rounded-full bg-[${color}] peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-slate-400 transition-all border border-slate-200" style="background-color: ${color}"></div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="pt-4">
                        <button type="submit" class="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                            Create Project
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Project Details / Todos Modal -->
        <div id="details-modal" class="fixed inset-0 bg-slate-900/50 hidden items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 transform transition-all scale-95 opacity-0 flex flex-col max-h-[90vh]" id="details-modal-content">
                <div class="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 class="text-3xl font-bold text-slate-800" id="details-title">Project Name</h3>
                        <p class="text-slate-500" id="details-customer">Customer Name</p>
                    </div>
                    <button id="close-details-modal" class="text-slate-400 hover:text-slate-600 text-3xl leading-none">&times;</button>
                </div>
                
                <div class="flex-1 overflow-y-auto pr-2">
                    <h4 class="font-bold text-slate-700 mb-4 text-lg">Todos / Plan</h4>
                    
                    <form id="add-todo-form" class="flex gap-3 mb-6">
                        <input type="text" name="todo_title" placeholder="Add a new task..." required
                            class="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-primary outline-none bg-slate-50">
                        <button type="submit" class="bg-slate-800 hover:bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95">
                            Add
                        </button>
                    </form>

                    <div id="todos-list" class="space-y-3">
                        <!-- Todos injected here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- Create Modal Logic ---
    const modal = container.querySelector('#project-modal');
    const modalContent = container.querySelector('#project-modal-content');
    const form = container.querySelector('#project-form');

    const openModal = () => {
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

    container.querySelector('#add-project-btn').onclick = openModal;
    container.querySelector('#close-project-modal').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('projects.php', data);
            store.update('projects', await api.get('projects.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // --- Details / Todos Modal Logic ---
    const detailsModal = container.querySelector('#details-modal');
    const detailsContent = container.querySelector('#details-modal-content');
    const closeDetailsBtn = container.querySelector('#close-details-modal');
    const todoForm = container.querySelector('#add-todo-form');
    const todosList = container.querySelector('#todos-list');

    let currentProjectId = null;

    const openDetails = (project) => {
        currentProjectId = project.id;
        const customer = customers.find(c => c.id == project.customer_id);

        container.querySelector('#details-title').textContent = project.name;
        container.querySelector('#details-customer').textContent = customer ? customer.name : 'Unknown Customer';
        container.querySelector('#details-title').style.color = project.color;

        renderTodos(project.todos || []);

        detailsModal.classList.remove('hidden');
        detailsModal.classList.add('flex');
        setTimeout(() => {
            detailsContent.classList.remove('scale-95', 'opacity-0');
            detailsContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    };

    const closeDetails = () => {
        detailsContent.classList.remove('scale-100', 'opacity-100');
        detailsContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            detailsModal.classList.add('hidden');
            detailsModal.classList.remove('flex');
            currentProjectId = null;
        }, 200);
    };

    closeDetailsBtn.onclick = closeDetails;
    detailsModal.onclick = (e) => { if (e.target === detailsModal) closeDetails(); };

    function renderTodos(todos) {
        todosList.innerHTML = todos.length ? todos.map((t, idx) => `
            <div class="flex items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm group hover:border-slate-300 transition-colors">
                <input type="checkbox" ${t.done ? 'checked' : ''} class="w-5 h-5 text-primary rounded mr-3 cursor-pointer toggle-todo" data-idx="${idx}">
                <span class="flex-1 ${t.done ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}">${t.title}</span>
                <button class="text-slate-300 hover:text-red-500 delete-todo" data-idx="${idx}">&times;</button>
            </div>
        `).join('') : '<p class="text-slate-400 italic text-center py-4">No tasks yet.</p>';
    }

    todoForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentProjectId) return;
        const title = todoForm.querySelector('input[name="todo_title"]').value;

        // Optimistic UI update? No, let's sync.
        const projects = store.get().projects;
        const project = projects.find(p => p.id == currentProjectId);
        if (!project.todos) project.todos = [];

        project.todos.push({ title, done: false });

        await api.post('projects.php', project);
        store.update('projects', await api.get('projects.php')); // Full refresh

        // Re-find to get updated reference
        const updatedProject = store.get().projects.find(p => p.id == currentProjectId);
        renderTodos(updatedProject.todos || []);
        todoForm.reset();
    };

    todosList.addEventListener('click', async (e) => {
        if (!currentProjectId) return;
        const projects = store.get().projects;
        const project = projects.find(p => p.id == currentProjectId);
        let changed = false;

        if (e.target.classList.contains('delete-todo')) {
            const idx = parseInt(e.target.dataset.idx);
            project.todos.splice(idx, 1);
            changed = true;
        } else if (e.target.classList.contains('toggle-todo')) {
            const idx = parseInt(e.target.dataset.idx);
            project.todos[idx].done = e.target.checked;
            changed = true;
        }

        if (changed) {
            await api.post('projects.php', project);
            store.update('projects', await api.get('projects.php'));
            // Re-find to get updated reference
            const updatedProject = store.get().projects.find(p => p.id == currentProjectId);
            renderTodos(updatedProject.todos || []);
        }
    });

    // --- Main Grid Interactions ---
    container.addEventListener('click', async (e) => {
        // Delete Project
        if (e.target.closest('.delete-btn')) {
            const btn = e.target.closest('.delete-btn');
            e.stopPropagation(); // Prevent opening modal
            if (confirm('Delete project?')) {
                await api.delete(`projects.php?id=${btn.dataset.id}`);
                store.update('projects', await api.get('projects.php'));
                refreshView();
            }
            return;
        }

        // Open Details
        const card = e.target.closest('.project-card');
        if (card) {
            const id = card.dataset.id;
            const project = projects.find(p => p.id == id);
            if (project) openDetails(project);
        }
    });

    async function refreshView() {
        const newContent = await renderProjects();
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(newContent);
    }

    return container;
}

function renderProjectCard(p, customer) {
    const color = p.color || '#3b82f6';
    const totalTodos = p.todos ? p.todos.length : 0;
    const completedTodos = p.todos ? p.todos.filter(t => t.done).length : 0;
    const percent = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

    return `
        <div class="project-card bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-5 border-t-4 group relative cursor-pointer active:scale-[0.99]" 
             style="border-color: ${color}" data-id="${p.id}">
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button class="delete-btn text-slate-300 hover:text-red-500 p-1" data-id="${p.id}">&times;</button>
            </div>
            
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                    ${p.status || 'Active'}
                </span>
            </div>
            
            <h3 class="text-xl font-bold text-slate-800 mb-1">${p.name}</h3>
            <p class="text-sm text-slate-500 mb-4 flex items-center">
                <span class="w-2 h-2 rounded-full mr-2" style="background-color: ${customer ? customer.color : '#ccc'}"></span>
                ${customer ? customer.name : 'Unknown Customer'}
            </p>

            <div class="h-1 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                <div class="h-full transition-all duration-500" style="width: ${percent}%; background-color: ${color}"></div>
            </div>

            <div class="flex items-center justify-between text-sm text-slate-400">
                <span>${completedTodos}/${totalTodos} Tasks</span>
            </div>
        </div>
    `;
}
