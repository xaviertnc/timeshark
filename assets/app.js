import { store } from './utils/store.js';
import { api } from './utils/api.js';

// Components
import { renderSidebar } from './components/sidebar.js';
import { renderDashboard } from './components/dashboard.js';
import { renderCustomers } from './components/customers.js';
import { renderProjects } from './components/projects.js';
import { renderPlanner } from './components/planner.js';
import { renderReports } from './components/reports.js';

const app = document.getElementById('app');
const pageTitle = document.getElementById('page-title');

// Router
const routes = {
    '': { title: 'Dashboard', render: renderDashboard },
    '#customers': { title: 'Customers', render: renderCustomers },
    '#projects': { title: 'Projects', render: renderProjects },
    '#planner': { title: 'Planner', render: renderPlanner },
    '#reports': { title: 'Reports', render: renderReports },
};

async function handleRoute() {
    const hash = window.location.hash;
    const route = routes[hash] || routes[''];

    pageTitle.textContent = route.title;
    app.innerHTML = '<div class="flex items-center justify-center h-full"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>'; // Loading

    // Slight delay for smoother feel or data fetching
    // In a real app we might fetch specific data here

    try {
        const content = await route.render();
        app.innerHTML = '';
        app.appendChild(content);
        updateActiveLink(hash);
    } catch (e) {
        console.error(e);
        app.innerHTML = `<div class="p-4 text-red-500">Error loading view: ${e.message}</div>`;
    }
}

function updateActiveLink(hash) {
    document.querySelectorAll('#sidebar nav a').forEach(link => {
        if (link.getAttribute('href') === hash || (hash === '' && link.getAttribute('href') === '#')) {
            link.classList.add('bg-primary/10', 'text-primary', 'border-l-4', 'border-primary', 'font-semibold');
            link.classList.remove('text-slate-500', 'hover:bg-slate-50');
        } else {
            link.classList.remove('bg-primary/10', 'text-primary', 'border-l-4', 'border-primary', 'font-semibold');
            link.classList.add('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-700');
        }
    });
}

// Initial Load
async function init() {
    renderSidebar(); // Static sidebar

    // Fetch initial global data
    try {
        const [customers, projects, timeEntries] = await Promise.all([
            api.get('customers.php'),
            api.get('projects.php'),
            api.get('time-entries.php')
        ]);

        let activeTimer = null;
        // Check for active timer
        // We know logical check: end_time is null
        // API returns all, we find it.
        const active = timeEntries.find(e => !e.end_time);
        if (active) activeTimer = active;

        store.set({
            customers,
            projects,
            timeEntries,
            activeTimer
        });

        // Start header timer ticker if active
        if (activeTimer) startHeaderTicker(activeTimer);

    } catch (e) {
        console.error("Failed to load initial data", e);
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

function startHeaderTicker(timerEntry) {
    const display = document.getElementById('active-timer-display');
    const projectName = document.getElementById('timer-project-name');
    const counter = document.getElementById('timer-counter');
    const stopBtn = document.getElementById('stop-timer-btn-header'); // Needs event listener

    display.classList.remove('hidden');
    display.classList.add('flex');
    projectName.textContent = timerEntry.project_name;

    // Ticker interval
    if (window.timerInterval) clearInterval(window.timerInterval);

    const startTime = new Date(timerEntry.start_time).getTime();

    window.timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const diff = now - startTime;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        counter.textContent =
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);

    stopBtn.onclick = async () => {
        try {
            await api.post('time-entries.php?action=stop', { id: timerEntry.id });
            clearInterval(window.timerInterval);
            display.classList.add('hidden');
            store.update('activeTimer', null);
            // Refresh entries if on dashboard/reports?
            // Ideally store notifies components.
            // For now, simple re-fetch if we are on a relevant page could work, or just let the view handle it.
            const newEntries = await api.get('time-entries.php');
            store.update('timeEntries', newEntries);
        } catch (e) {
            alert('Failed to stop timer');
        }
    };
}

// Subscribe to store to update header if timer changes from elsewhere
store.subscribe(state => {
    if (state.activeTimer && !window.timerInterval) {
        startHeaderTicker(state.activeTimer);
    } else if (!state.activeTimer && window.timerInterval) {
        clearInterval(window.timerInterval);
        document.getElementById('active-timer-display').classList.add('hidden');
        window.timerInterval = null;
    }
});

init();
