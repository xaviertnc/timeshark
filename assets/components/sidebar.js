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
        <a href="${item.hash || '#'}" class="nav-link flex items-center px-4 py-3.5 text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-300 rounded-xl group mb-1">
            <span class="mr-4 text-xl transition-transform duration-300 group-hover:scale-110">${item.icon}</span>
            <span class="font-bold text-sm tracking-tight hidden lg:block uppercase opacity-80 group-hover:opacity-100 transition-opacity">${item.label}</span>
        </a>
    `).join('');
}
