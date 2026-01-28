import { store } from './utils/store.js';
import { api } from './utils/api.js';

// Components
import { renderSidebar } from './components/sidebar.js';
import { renderDashboard } from './components/dashboard.js';
import { renderOrganizations } from './components/organizations.js';

/**
 * assets/app.js
 *
 * Main Application Entry - 28 Jun 2025
 *
 * Purpose: Application initialization and routing.
 *
 * @package Chompy
 *
 * @author Senpai
 *
 * Last 3 version commits:
 * @version 1.0 - INIT - 28 Jun 2025 - Initial commit
 * @version 1.1 - UPD - 28 Jan 2026 - Rename Customers to Organizations and Clients
 */
import { renderProjects } from './components/projects.js';
import { renderPlanner } from './components/planner.js';
import { renderReports } from './components/reports.js';
import { renderTeam } from './components/team.js';

const app = document.getElementById('app');
const headerContainer = document.getElementById('page-header-container');
const pageTitle = document.getElementById('page-title');

// Router
const routes = {
    '': { title: 'Dashboard', render: renderDashboard },
    '#planner': { title: 'Planner', render: renderPlanner },
    '#projects': { title: 'Projects', render: renderProjects },
    '#organizations': { title: 'Organizations', render: renderOrganizations },
    '#team': { title: 'Team', render: renderTeam },
    '#reports': { title: 'Reports', render: renderReports },
};

async function handleRoute() {
    const hash = window.location.hash;
    const route = routes[hash] || routes[''];

    // Smooth header transition
    headerContainer.style.opacity = '0';

    app.innerHTML = '<div class="flex items-center justify-center h-full"><div class="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>';

    try {
        const content = await route.render();
        app.innerHTML = '';
        app.appendChild(content);

    pageTitle.textContent = route.title;
    
    // Hide header timer on dashboard
    const headerTimer = document.getElementById('active-timer-display');
    if (headerTimer) {
      const isDashboard = hash === '' || hash === '#' || hash === '#dashboard';
      if (isDashboard) {
        headerTimer.style.display = 'none';
      } else if (store.get().activeTimer) {
        headerTimer.style.display = 'flex';
      }
    }

    setTimeout(() => headerContainer.style.opacity = '1', 100);

        updateActiveLink(hash);
    } catch (e) {
        console.error(e);
        app.innerHTML = `<div class="p-10 text-center"><div class="text-slate-300 font-black uppercase tracking-widest text-xs">Error: ${e.message}</div></div>`;
    }
}

function updateActiveLink(hash) {
    document.querySelectorAll('#sidebar nav a').forEach(link => {
        const isActive = link.getAttribute('href') === hash || (hash === '' && link.getAttribute('href') === '#');
        if (isActive) {
            link.classList.add('active');
            link.classList.remove('text-slate-300', 'text-slate-200');
            link.classList.add('text-primary');
        } else {
            link.classList.remove('active', 'text-primary');
            link.classList.add('text-slate-200');
        }
    });
}

// Initial Load
async function init() {
    // Theme Init
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
    }

    renderSidebar();

    try {
        const [customers, projects, timeEntries, team, tasks] = await Promise.all([
            api.get('organizations.php'),
            api.get('projects.php'),
            api.get('time-entries.php'),
            api.get('team.php'),
            api.get('planner.php')
        ]);

        const activeTimer = timeEntries.find(e => !e.end_time);

        store.set({
            customers,
            projects,
            timeEntries,
            team,
            tasks,
            activeTimer
        });

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
    const stopBtn = document.getElementById('stop-timer-btn-header');

    const hash = window.location.hash;
    if (hash === '' || hash === '#') {
        display.style.display = 'none';
    } else {
        display.style.display = 'flex';
        display.classList.remove('hidden');
    }
    
    projectName.textContent = timerEntry.project_name;

    if (window.timerInterval) clearInterval(window.timerInterval);

    const startTime = new Date(timerEntry.start_time).getTime();

    window.timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const diff = now - startTime;

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        counter.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);

    stopBtn.onclick = async () => {
        try {
            await api.post('time-entries.php?action=stop', { id: timerEntry.id });
            store.update('activeTimer', null);
            const newEntries = await api.get('time-entries.php');
            store.update('timeEntries', newEntries);
        } catch (e) {
            alert('Error');
        }
    };
}

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
