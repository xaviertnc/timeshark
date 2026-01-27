import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderCustomers() {
    const state = store.get();
    const customers = state.customers || [];

    const container = document.createElement('div');
    container.className = "max-w-6xl mx-auto animate-slide-up";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-20">
            <div>
                 <h2 class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">CRM</h2>
                 <h1 class="text-4xl font-light text-slate-800 tracking-tight">Your <span class="font-bold italic text-primary">Clients.</span></h1>
            </div>
            <button id="add-customer-btn" class="bg-slate-900 hover:bg-primary text-white px-10 py-5 rounded-2xl shadow-sm transition-all flex items-center font-black uppercase tracking-[0.2em] text-[10px] active:scale-95">
                New Client
            </button>
        </div>
        
        <div id="customers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            ${customers.map(c => `
                <div class="bg-white rounded-[2.5rem] p-10 border border-slate-100/60 shadow-sm group hover:-translate-y-1 transition-all duration-500 relative">
                    <div class="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button class="delete-btn text-slate-200 hover:text-red-500 transition-colors p-2" data-id="${c.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>

                    <div class="flex flex-col">
                        <div class="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 opacity-40">Client Profile</div>
                        <h3 class="text-2xl font-bold text-slate-800 mb-1 leading-tight">${c.name}</h3>
                        <p class="text-slate-400 font-medium text-sm truncate opacity-60">${c.email || 'No contact email'}</p>
                    </div>
                </div>
            `).join('')}
        </div>

        ${customers.length === 0 ? `
            <div class="col-span-full py-32 opacity-20 text-center">
                <p class="text-sm font-black uppercase tracking-[0.4em]">The Rolodex is empty</p>
            </div>
        ` : ''}

        <!-- Zen Modal -->
        <div id="customer-modal" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-50 backdrop-blur-xl">
            <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-14 transform transition-all scale-95 opacity-0" id="customer-modal-content">
                <div class="flex justify-between items-center mb-12">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight" id="modal-title">New Client</h3>
                    <button id="close-modal-btn" class="text-slate-300 hover:text-slate-900 text-3xl transition-colors">&times;</button>
                </div>
                <form id="customer-form" class="space-y-10">
                    <input type="hidden" name="id" id="customer-id">
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Full Identity</label>
                        <input type="text" name="name" id="customer-name" required placeholder="Acme International"
                            class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                    </div>
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Secure Email</label>
                        <input type="email" name="email" id="customer-email" placeholder="contact@acme.com"
                            class="w-full px-7 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary focus:bg-white outline-none font-bold text-slate-700 transition-all">
                    </div>
                    <div class="pt-6">
                        <button type="submit" class="w-full h-24 bg-slate-900 hover:bg-primary text-white font-black text-xs uppercase tracking-[0.4em] rounded-[2.5rem] shadow-sm transition-all active:scale-95">
                            Provision
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
        }, 300);
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
            alert('Provision failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            const id = e.target.closest('.delete-btn').dataset.id;
            if (confirm('De-provision client?')) {
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
