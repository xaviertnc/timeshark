export function renderSidebar() {
    const nav = document.querySelector('#sidebar nav');
    const items = [
        { hash: '', icon: '⏱️', label: 'Dashboard' },
        { hash: '#customers', icon: '👥', label: 'Customers' },
        { hash: '#projects', icon: '📁', label: 'Projects' },
        { hash: '#planner', icon: '📅', label: 'Planner' },
        { hash: '#reports', icon: '📊', label: 'Reports' },
    ];

    nav.innerHTML = items.map(item => `
        <a href="${item.hash}" class="flex items-center px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all rounded-r-full mr-2 border-l-4 border-transparent group">
            <span class="mr-3 text-xl group-hover:scale-110 transition-transform">${item.icon}</span>
            <span class="font-medium hidden lg:block">${item.label}</span>
        </a>
    `).join('');
}
