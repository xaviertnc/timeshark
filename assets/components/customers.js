import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderCustomers() {
    const state = store.get();
    const customers = state.customers || [];

    const container = document.createElement('div');
    container.className = "max-w-6xl mx-auto animate-slide-up";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-16 px-2">
            <div>
                 <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-3">CRM</h2>
                 <h1 class="text-3xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Customers.</span></h1>
            </div>
            <button id="add-customer-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
                New Customer
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${customers.map(c => `
                <div class="bg-card rounded-3xl p-10 border border-soft shadow-sm group hover:-translate-y-1 transition-all duration-300 relative text-center">
                    <div class="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1">
                        <button class="edit-btn text-dim/50 hover:text-primary transition-colors p-2" data-id="${c.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button class="delete-btn text-dim/50 hover:text-red-300 transition-colors p-2" data-id="${c.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>

                    <div class="flex flex-col items-center pointer-events-none">
                        <div class="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-4 opacity-30">Customer ID</div>
                        <h3 class="text-xl font-bold text-main mb-1 leading-tight">${c.name}</h3>
                        <p class="text-muted font-medium text-xs truncate opacity-70">${c.email || 'No email'}</p>
                    </div>
                </div>
            `).join('')}
        </div>

        ${customers.length === 0 ? `
            <div class="col-span-full py-20 opacity-20 text-center">
                <p class="text-[10px] font-black uppercase tracking-[0.4em]">Empty Registry</p>
            </div>
        ` : ''}
    `;

    const modalPortal = document.getElementById('modal-portal');
    modalPortal.innerHTML = `
        <div id="customer-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
            <div class="min-h-screen w-full flex items-center justify-center p-4">
                <div class="bg-card rounded-3xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0 text-center relative" id="customer-modal-content">
                    <button id="close-modal-btn" class="absolute top-6 right-8 text-dim hover:text-main text-2xl transition-colors">&times;</button>

                    <div class="mb-10">
                        <h3 class="text-2xl font-bold text-main tracking-tight" id="modal-title">New Customer</h3>
                        <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-2">Customer Details</p>
                    </div>

                    <form id="customer-form" class="space-y-8">
                        <input type="hidden" name="id">
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Name</label>
                            <input type="text" name="name" required placeholder="Enter name" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                        </div>
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block">Email</label>
                            <input type="email" name="email" placeholder="Enter email" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-main font-bold">
                        </div>
                        <div class="pt-6">
                            <button type="submit" id="submit-btn" class="w-full h-18 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 py-5">
                                Save Customer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = modalPortal.querySelector('#customer-modal');
    const modalContent = modalPortal.querySelector('#customer-modal-content');
    const form = modalPortal.querySelector('#customer-form');
    const modalTitle = modalPortal.querySelector('#modal-title');
    const submitBtn = modalPortal.querySelector('#submit-btn');

    const openModal = (customer = null) => {
        if (customer) {
            modalTitle.textContent = 'Edit Customer';
            submitBtn.textContent = 'Update';
            form.id.value = customer.id;
            form.name.value = customer.name;
            form.email.value = customer.email || '';
        } else {
            modalTitle.textContent = 'New Customer';
            submitBtn.textContent = 'Create';
            form.reset();
            form.id.value = '';
        }

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

    container.querySelector('#add-customer-btn').onclick = () => openModal();
    modalPortal.querySelector('#close-modal-btn').onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('customers.php', data);
            store.update('customers', await api.get('customers.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Operation failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            const id = e.target.closest('.delete-btn').dataset.id;
            if (confirm('Delete customer?')) {
                await api.delete(`customers.php?id=${id}`);
                const [newCustomers, newProjects] = await Promise.all([
                    api.get('customers.php'),
                    api.get('projects.php')
                ]);
                store.update('customers', newCustomers);
                store.update('projects', newProjects);
                refreshView();
            }
        }

        if (e.target.closest('.edit-btn')) {
            const id = e.target.closest('.edit-btn').dataset.id;
            const customer = customers.find(c => c.id == id);
            if (customer) openModal(customer);
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderCustomers());
    }

    return container;
}
