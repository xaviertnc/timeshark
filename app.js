import { api } from './utils/api.js';
import { store } from './utils/store.js';

/**
 * app.js
 *
 * Main Application Entry - 28 Jun 2025
 *
 * Purpose: Application initialization and routing.
 *
 * @package Time Shark
 *
 * @author Senpai
 *
 * Last 3 version commits:
 * @version 2.2 - FIX - 23 Jul 2026 - Refresh updated dashboard modules
 * @version 3.2 - CHORE - 31 Jul 2026 - Removed the Planner page; tasks API renamed to tasks.php
 * @version 3.5 - CHORE - 12 Sep 2026 - Cache-bust Dashboard import
 */

// Components
import { renderSidebar } from './components/sidebar.js?v=3.2';
import { renderDashboard } from './components/dashboard.js?v=3.5';
import { renderOrganizations } from './components/organizations.js';
import { renderProjects } from './components/projects.js?v=3.2.1';
import { renderReports } from './components/reports.js?v=3.2.1';
import { renderTeam } from './components/team.js?v=3.2.1';

const app = document.getElementById('app');
const headerContainer = document.getElementById('page-header-container');
const pageTitle = document.getElementById('page-title');
let currentRouteCleanup = null;

function disposeCurrentRoute() {
    if (typeof currentRouteCleanup !== 'function') return;
    try {
        currentRouteCleanup();
    } catch (error) {
        console.warn('Route cleanup failed', error);
    } finally {
        currentRouteCleanup = null;
    }
}

window.__timesharkDisposeCurrentView = disposeCurrentRoute;

// Router
const routes = {
    '': { title: 'Dashboard', render: renderDashboard },
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
    disposeCurrentRoute();

    app.innerHTML = '<div class="flex items-center justify-center h-full"><div class="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>';

    try {
        const content = await route.render();
        app.innerHTML = '';
        app.appendChild(content);
        currentRouteCleanup = typeof content.__dispose === 'function' ? content.__dispose : null;

        pageTitle.textContent = route.title;

        syncHeaderTicker();


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
            link.classList.remove('text-slate-400', 'text-slate-500');
            link.classList.add('text-primary');
        } else {
            link.classList.remove('active', 'text-primary');
            link.classList.add('text-slate-400');
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
            api.get('tasks.php')
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

    } catch (e) {
        console.error("Failed to load initial data", e);
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

function isDashboardRoute() {
    const hash = window.location.hash;
    return hash === '' || hash === '#' || hash === '#dashboard';
}

function stopHeaderTicker() {
    if (window.timerInterval) clearInterval(window.timerInterval);
    window.timerInterval = null;
    window.timerEntryId = null;

    const display = document.getElementById('active-timer-display');
    if (display) {
        display.style.display = 'none';
        display.classList.add('hidden');
    }
}

function syncHeaderTicker() {
    const activeTimer = store.get().activeTimer;
    if (!activeTimer || isDashboardRoute()) {
        stopHeaderTicker();
        return;
    }

    startHeaderTicker(activeTimer);
}

function startHeaderTicker(timerEntry) {
    const display = document.getElementById('active-timer-display');
    const projectName = document.getElementById('timer-project-name');
    const counter = document.getElementById('timer-counter');
    const stopBtn = document.getElementById('stop-timer-btn-header');
    if (!display || !projectName || !counter || !stopBtn) return;

    display.style.display = 'flex';
    display.classList.remove('hidden');
    projectName.textContent = timerEntry.project_name || 'Project';

    if (window.timerInterval && window.timerEntryId === timerEntry.id) return;
    if (window.timerInterval) clearInterval(window.timerInterval);
    window.timerEntryId = timerEntry.id;

    const startTime = new Date(timerEntry.start_time).getTime();

    const updateCounter = () => {
        const now = new Date().getTime();
        const diff = now - startTime;

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        counter.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    updateCounter();
    window.timerInterval = setInterval(updateCounter, 1000);

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

store.subscribe(() => {
    syncHeaderTicker();
});
init();

