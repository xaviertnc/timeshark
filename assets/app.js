import { store } from './utils/store.js';
import { api } from './utils/api.js';

// Components
import { renderSidebar } from './components/sidebar.js';
import { renderDashboard } from './components/dashboard.js';
import { renderCustomers } from './components/customers.js';
import { renderProjects } from './components/projects.js';
import { renderPlanner } from './components/planner.js';
import { renderReports } from './components/reports.js';
import { renderTeam } from './components/team.js';

const app = document.getElementById('app');
const pageTitle = document.getElementById('page-title');
const breadcrumb = document.getElementById('breadcrumb');

// Router
const routes = {
    '': { title: 'Dashboard', sub: 'Home', render: renderDashboard },
    '#customers': { title: 'Customers', sub: 'CRM', render: renderCustomers },
    '#projects': { title: 'Projects', sub: 'Planning', render: renderProjects },
    '#planner': { title: 'Resource Planner', sub: 'Timeline', render: renderPlanner },
    '#reports': { title: 'Time Reports', sub: 'Analytics', render: renderReports },
    '#team': { title: 'Team Management', sub: 'Resources', render: renderTeam },
};

async function handleRoute() {
    const hash = window.location.hash;
    const route = routes[hash] || routes[''];

    pageTitle.textContent = route.title;
    breadcrumb.textContent = route.sub;

    app.innerHTML = '<div class="flex items-center justify-center h-full"><span class="loader"></span></div>';

    // Slight delay for smoother feel or data fetching
    // In a real app we might fetch specific data here

    try {
        const content = await route.render();
        app.innerHTML = '';
        app.appendChild(content);
        updateActiveLink(hash);
    } catch (e) {
        console.error(e);
        app.innerHTML = `<div class="p-10 text-center"><div class="bg-red-50 text-red-600 p-6 rounded-2xl inline-block border border-red-100 font-bold">Error loading view: ${e.message}</div></div>`;
    }
}

function updateActiveLink(hash) {
    document.querySelectorAll('#sidebar nav a').forEach(link => {
        const isActive = link.getAttribute('href') === hash || (hash === '' && link.getAttribute('href') === '#');
        if (isActive) {
            link.classList.add('active', 'text-white');
            link.classList.remove('text-slate-400', 'hover:bg-slate-800/50');
        } else {
            link.classList.remove('active', 'text-white');
            link.classList.add('text-slate-400', 'hover:bg-slate-800/50');
        }
    });
}

// Initial Load
async function init() {
    renderSidebar(); // Static sidebar

    // Fetch initial global data
    try {
        const [customers, projects, timeEntries, team] = await Promise.all([
            api.get('customers.php'),
            api.get('projects.php'),
            api.get('time-entries.php'),
            api.get('team.php')
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
            team,
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
