/**
 * components/task-filter-bar.js
 *
 * Reusable filter toggle bar for task lists.
 * Renders a row of filter buttons (Today, Completed, Planned, Projects, Backlog)
 * plus an optional compact-mode toggle. Used in both the TODO sidebar and
 * the dashboard todo section.
 */

const FILTER_DEFS = [
    { key: 'today', label: 'Today', icon: '☀' },
    { key: 'overdue', label: 'Overdue', icon: '⏰' },
    { key: 'planned', label: 'Planned', icon: '📅' },
    { key: 'backlog', label: 'Backlog', icon: '📋' },
    { key: 'completed', label: 'Completed', icon: '✓' },
    { key: 'projects', label: 'Projects', icon: '📊' }
];

/**
 * @param {HTMLElement} container   — Element to render into (contents replaced)
 * @param {Object}      filters    — Current filter state, e.g. { today: true, completed: false, ... }
 * @param {Object}      options
 * @param {Function}    options.onFilterChange(key)    — Called when a filter button is toggled
 * @param {boolean}     [options.showCompact=true]     — Whether to show the compact toggle
 * @param {boolean}     [options.isCompact=false]      — Current compact mode state
 * @param {Function}    [options.onToggleCompact(val)] — Called when compact is toggled
 * @param {boolean}     [options.showSearchToggle=false] — Whether to show search row toggle
 * @param {boolean}     [options.isSearchVisible=true]   — Current search row visibility
 * @param {Function}    [options.onToggleSearch(val)]  — Called when search visibility is toggled
 */
export const TaskFilterBar = {
    render(container, filters, options = {}) {
        if (!container) return;

        const {
            onFilterChange,
            showCompact = true,
            isCompact = false,
            onToggleCompact,
            showSearchToggle = false,
            isSearchVisible = true,
            onToggleSearch
        } = options;

        // ── Toggle All ──
        let html = `
            <button class="filter-bar-toggle-all-btn p-1.5 rounded-lg text-dim/40 hover:text-dim hover:bg-highlight mr-1 transition-all" title="Toggle All Filters">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            </button>
            <div class="w-px h-3 bg-white/5 mr-1"></div>
        `;

        // ── Build filter buttons ──
        html += FILTER_DEFS.map(f => `
            <button class="task-filter-btn inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest leading-none transition-all ${filters[f.key] ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-dim/40 hover:text-dim hover:bg-highlight'}" data-filter="${f.key}">
                <span class="text-[11px] leading-none">${f.icon}</span><span class="leading-none">${f.label}</span>
            </button>
        `).join('');

        // ── Optional Search Toggle & Compact toggle ──
        if (showSearchToggle || showCompact || options.showProjectGroupToggle) {
            html += `<div class="w-px h-3 bg-white/5 mx-1"></div>`;
            
            if (showSearchToggle) {
                html += `
                    <button class="filter-bar-search-toggle p-1 rounded-md transition-all mr-1 ${isSearchVisible ? 'bg-primary/20 text-primary' : 'text-dim/50 hover:text-dim hover:bg-highlight'}" title="Toggle Search Bar">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </button>
                `;
            }
            
            if (showCompact) {
                html += `
                    <button class="filter-bar-compact-toggle p-1 rounded-md transition-all ${isCompact ? 'bg-primary/20 text-primary' : 'text-dim/50 hover:text-dim hover:bg-highlight'}" title="Toggle Compact Mode">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                `;
            }

            if (options.showProjectGroupToggle) {
                html += `
                    <button class="filter-bar-project-group-toggle p-1 rounded-md transition-all ${options.isProjectGrouped ? 'bg-primary/20 text-primary' : 'text-dim/50 hover:text-dim hover:bg-highlight'}" title="Group by Project">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    </button>
                `;
            }
        }

        if (options.extraControls) {
            html += `<div class="flex items-center gap-2 ml-2">${options.extraControls}</div>`;
        }

        container.innerHTML = html;

        // ── Wire Toggle All ──
        const toggleAllBtn = container.querySelector('.filter-bar-toggle-all-btn');
        if (toggleAllBtn && options.onToggleAll) {
            toggleAllBtn.onclick = () => options.onToggleAll();
        }

        // ── Wire filter clicks ──
        container.querySelectorAll('.task-filter-btn').forEach(btn => {
            btn.onclick = () => {
                const key = btn.dataset.filter;
                if (onFilterChange) onFilterChange(key);
            };
        });

        // ── Wire compact toggle ──
        if (showCompact) {
            const compactBtn = container.querySelector('.filter-bar-compact-toggle');
            if (compactBtn && onToggleCompact) {
                compactBtn.onclick = () => onToggleCompact(!isCompact);
            }
        }

        // ── Wire search toggle ──
        if (showSearchToggle) {
            const searchBtn = container.querySelector('.filter-bar-search-toggle');
            if (searchBtn && onToggleSearch) {
                searchBtn.onclick = () => onToggleSearch(!isSearchVisible);
            }
        }

        // ── Wire project group toggle ──
        if (options.showProjectGroupToggle) {
            const groupBtn = container.querySelector('.filter-bar-project-group-toggle');
            if (groupBtn && options.onToggleProjectGroup) {
                groupBtn.onclick = () => options.onToggleProjectGroup(!options.isProjectGrouped);
            }
        }
    }
};

