import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderCustomers() {
    const state = store.get();
    const customers = state.customers || [];

    const container = document.createElement('div');
    container.className = "max-w-5xl mx-auto space-y-6";

    // Header with Add Button
    container.innerHTML = `
        <div class="flex items-center justify-between mb-12 animate-slide-up">
            <div>
                 <h2 class="text-4xl font-black text-slate-900 tracking-tight">Customers</h2>
                 <p class="text-slate-400 font-medium">Your client roster and contacts.</p>
            </div>
            <button id="add-customer-btn" class="bg-slate-900 hover:bg-primary text-white px-8 py-4 rounded-2xl shadow-xl transition-all flex items-center font-bold uppercase tracking-widest text-xs group">
                <span class="mr-3 text-xl group-hover:rotate-90 transition-transform duration-300">+</span> New Client
            </button>
        </div>
        
        <div id="customers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${customers.map(c => renderCustomerCard(c)).join('')}
        </div>

        <!-- Modal (Hidden by default) -->
        <div id="customer-modal" class="fixed inset-0 bg-slate-900/50 hidden items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all scale-95 opacity-0" id="customer-modal-content">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800" id="modal-title">New Customer</h3>
                    <button id="close-modal-btn" class="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                <form id="customer-form" class="space-y-5">
                    <input type="hidden" name="id" id="customer-id">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                        <input type="text" name="name" id="customer-name" required 
                            class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none transition-all">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Email (Optional)</label>
                        <input type="email" name="email" id="customer-email" 
                            class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none transition-all">
                    </div>
                    <div class="pt-4">
                        <button type="submit" class="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                            Save Customer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Event Delegation for Delete and Edit
    container.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        const editBtn = e.target.closest('.edit-btn');

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Delete this customer?')) {
                try {
                    await api.delete(`customers.php?id=${id}`);
                    store.update('customers', await api.get('customers.php'));
                    refreshView();
                } catch (err) {
                    alert(err.message);
                }
            }
        }

        if (editBtn) {
            const id = editBtn.dataset.id;
            const customer = customers.find(c => c.id == id);
            if (customer) {
                document.getElementById('modal-title').textContent = 'Edit Customer';
                document.getElementById('customer-id').value = customer.id;
                document.getElementById('customer-name').value = customer.name;
                document.getElementById('customer-email').value = customer.email || '';
                openModal();
            }
        }
    });

    // Modal Logic
    const modal = container.querySelector('#customer-modal');
    const modalContent = container.querySelector('#customer-modal-content');
    const form = container.querySelector('#customer-form');
    const addBtn = container.querySelector('#add-customer-btn');
    const closeBtn = container.querySelector('#close-modal-btn');

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
            document.getElementById('customer-id').value = '';
            document.getElementById('modal-title').textContent = 'New Customer';
        }, 200);
    };

    addBtn.onclick = () => {
        document.getElementById('modal-title').textContent = 'New Customer';
        form.reset();
        document.getElementById('customer-id').value = '';
        openModal();
    };
    closeBtn.onclick = closeModal;

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());

        try {
            await api.post('customers.php', data);
            store.update('customers', await api.get('customers.php'));
            closeModal();
            refreshView();
        } catch (err) {
            alert('Failed to save customer: ' + err.message);
        }
    };

    async function refreshView() {
        const app = document.getElementById('app');
        app.innerHTML = '';
        app.appendChild(await renderCustomers());
    }

    return container;
}

function renderCustomerCard(c) {
    return `
        <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-500/5 group relative hover:-translate-y-2 transition-all duration-300">
            <div class="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 translate-y-2 group-hover:translate-y-0">
                <button class="delete-btn text-slate-300 hover:text-red-500 transition-colors p-2 bg-white rounded-xl shadow-lg border border-slate-100" data-id="${c.id}" title="Delete Customer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            
            <div class="flex flex-col items-center text-center">
                <div class="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center text-white font-black text-2xl shadow-xl transform rotate-3 group-hover:rotate-0 transition-transform" 
                     style="background: linear-gradient(135deg, ${c.color || '#primary'}, ${c.color || '#primary'}88)">
                    ${c.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <h3 class="text-xl font-black text-slate-900 mb-1 leading-tight">${c.name}</h3>
                    <p class="text-xs font-black text-slate-400 uppercase tracking-widest">${c.email || 'No Email'}</p>
                </div>
            </div>
            
            <div class="w-full pt-8 mt-8 border-t border-slate-50 flex justify-between items-center opacity-60">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Projects</span>
                <span class="bg-slate-100 text-slate-900 px-3 py-1 rounded-full text-xs font-black">0</span>
            </div>
        </div>
    `;
}
