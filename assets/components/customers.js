import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

export async function renderCustomers() {
    const state = store.get();
    const customers = state.customers || [];

    const container = document.createElement('div');
    container.className = "max-w-5xl mx-auto space-y-6";

    // Header with Add Button
    container.innerHTML = `
        <div class="flex items-center justify-between mb-8">
            <h2 class="text-3xl font-bold text-slate-800">Customers</h2>
            <button id="add-customer-btn" class="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-md transition-all flex items-center font-medium">
                <span class="mr-2 text-xl">+</span> New Customer
            </button>
        </div>
        
        <div id="customers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${customers.map(c => renderCustomerCard(c)).join('')}
        </div>

        ${customers.length === 0 ? `
            <div class="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <p class="text-slate-400 text-lg">No customers found. Create one to get started!</p>
            </div>
        ` : ''}

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

    // Event Delegation for Delete
    container.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            const btn = e.target.closest('.delete-btn');
            const id = btn.dataset.id;
            if (confirm('Delete this customer?')) {
                try {
                    await api.delete(`customers.php?id=${id}`);
                    const newCustomers = await api.get('customers.php'); // Re-fetch to be safe
                    store.update('customers', newCustomers);
                    renderCustomers().then(newContent => {
                        // Simple re-render helper (in a real app we'd diff)
                        const app = document.getElementById('app');
                        app.innerHTML = '';
                        app.appendChild(newContent);
                    });
                } catch (err) {
                    alert(err.message);
                }
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
        // Animation
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

    addBtn.onclick = openModal;
    closeBtn.onclick = closeModal;

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            await api.post('customers.php', data);

            // Refresh store
            const newCustomers = await api.get('customers.php');
            store.update('customers', newCustomers);

            closeModal();

            // Re-render
            const newContent = await renderCustomers();
            const app = document.getElementById('app');
            app.innerHTML = '';
            app.appendChild(newContent);

        } catch (err) {
            alert('Failed to save customer: ' + err.message);
        }
    };

    return container;
}

function renderCustomerCard(c) {
    return `
        <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 relative border border-slate-100 group">
            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="delete-btn text-slate-300 hover:text-red-500 transition-colors" data-id="${c.id}" title="Delete">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            
            <div class="flex items-center space-x-4 mb-4">
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md" style="background-color: ${c.color}">
                    ${c.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <h3 class="font-bold text-slate-800 text-lg leading-tight">${c.name}</h3>
                    <p class="text-sm text-slate-400">${c.email || 'No email provided'}</p>
                </div>
            </div>
            
            <div class="border-t border-slate-50 pt-4 mt-2 flex justify-between items-center">
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projects</span>
                <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">0</span> <!-- Placeholder count -->
            </div>
        </div>
    `;
}
