/**
 * components/task-filter-bar.js
 *
 * Reusable filter toggle bar for task lists.
 * Renders a row of filter buttons (Today, Completed, Planned, Projects, Backlog)
 * plus an optional compact-mode toggle. Used in both the planner sidebar and
 * the dashboard todo section.
 */

const FILTER_DEFS = [
    { key: 'today', label: 'Today', icon: '☀' },
    { key: 'completed', label: 'Completed', icon: '✓' },
    { key: 'planned', label: 'Planned', icon: '📅' },
    { key: 'projects', label: 'Projects', icon: '▓' },
    { key: 'backlog', label: 'Backlog', icon: '📋' }
];

/**
 * @param {HTMLElement} container   — Element to render into (contents replaced)
 * @param {Object}      filters    — Current filter state, e.g. { today: true, completed: false, ... }
 * @param {Object}      options
 * @param {Function}    options.onFilterChange(key)    — Called when a filter button is toggled
 * @param {boolean}     [options.showCompact=true]     — Whether to show the compact toggle
 * @param {boolean}     [options.isCompact=false]      — Current compact mode state
 * @param {Function}    [options.onToggleCompact(val)] — Called when compact is toggled
 */
export const TaskFilterBar = {
    render(container, filters, options = {}) {
        if (!container) return;

        const {
            onFilterChange,
            showCompact = true,
            isCompact = false,
            onToggleCompact
        } = options;

        // ── Build filter buttons ──
        let html = FILTER_DEFS.map(f => `
            <button class="task-filter-btn inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide leading-none transition-all ${filters[f.key] ? 'bg-primary/20 text-primary' : 'text-dim/50 hover:text-dim hover:bg-highlight'}" data-filter="${f.key}">
                <span class="text-[10px] leading-none">${f.icon}</span><span class="leading-none">${f.label}</span>
            </button>
        `).join('');

        // ── Compact toggle ──
        if (showCompact) {
            html += `
                <div class="w-px h-3 bg-subtle mx-0.5"></div>
                <button class="filter-bar-compact-toggle p-1 rounded-md transition-all ${isCompact ? 'bg-primary/20 text-primary' : 'text-dim/50 hover:text-dim hover:bg-highlight'}" title="Toggle Compact Mode">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            `;
        }

        container.innerHTML = html;

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
    }
};

