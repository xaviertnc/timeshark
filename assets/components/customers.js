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
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-3">CRM</h2>
                 <h1 class="text-3xl font-light text-slate-800 tracking-tight">Active <span class="font-bold italic text-primary">Registry.</span></h1>
            </div>
            <button id="add-customer-btn" class="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px]">
                New Client
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${customers.map(c => `
                <div class="bg-white rounded-3xl p-10 border border-slate-50 shadow-sm group hover:-translate-y-1 transition-all duration-300 relative">
                    <div class="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button class="delete-btn text-slate-100 hover:text-red-300 transition-colors p-2" data-id="${c.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>

                    <div class="flex flex-col">
                        <div class="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-4 opacity-30">Client ID</div>
                        <h3 class="text-xl font-bold text-slate-700 mb-1 leading-tight">${c.name}</h3>
                        <p class="text-slate-400 font-medium text-xs truncate opacity-70">${c.email || 'No contact email'}</p>
                    </div>
                </div>
            `).join('')}
        </div>

        ${customers.length === 0 ? `
            <div class="col-span-full py-20 opacity-20 text-center">
                <p class="text-[10px] font-black uppercase tracking-[0.4em]">Empty Registry</p>
            </div>
        ` : ''}

        <!-- Refined Modal -->
        <div id="customer-modal" class="fixed inset-0 bg-secondary/20 hidden items-center justify-center z-50 backdrop-blur-md">
            <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm p-10 transform transition-all scale-95 opacity-0" id="customer-modal-content">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-2xl font-bold text-slate-800 tracking-tight">New Client</h3>
                    <button id="close-modal-btn" class="text-slate-300 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <form id="customer-form" class="space-y-8">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Identity</label>
                        <input type="text" name="name" required placeholder="Organization Name" class="w-full">
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Email</label>
                        <input type="email" name="email" placeholder="contact@org.com" class="w-full">
                    </div>
                    <div class="pt-4">
                        <button type="submit" class="w-full h-16 bg-primary hover:bg-primary-dark text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all">
                            Register
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modal = container.querySelector('#customer-modal');
    const modalContent = container.querySelector('#customer-modal-content');
    const form = container.querySelector('#customer-form');

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

    container.querySelector('#add-customer-btn').onclick = openModal;
    container.querySelector('#close-modal-btn').onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            await api.post('customers.php', data);
            store.update('customers', await api.get('customers.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Registration failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            const id = e.target.closest('.delete-btn').dataset.id;
            if (confirm('De-register client?')) {
                await api.delete(`customers.php?id=${id}`);
                store.update('customers', await api.get('customers.php'));
                refreshView();
            }
        }
    });

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderCustomers());
    }

    return container;
}
