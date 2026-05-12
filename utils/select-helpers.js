/**
 * select-helpers.js
 *
 * Shared utility for building <select> options with a "Recent" optgroup,
 * computed from time entry history. Works generically with any item list.
 */

/**
 * Build HTML for a <select> with Recent / All optgroups.
 *
 * @param {Array}  items     – full list of selectable items (must have `id` and a name field)
 * @param {Array}  entries   – time entries array (will be sorted internally by start_time desc)
 * @param {string} idField   – field on entries to extract IDs from, e.g. 'project_id' or 'task_id'
 * @param {Object} [opts]
 * @param {string} [opts.selectedId]   – currently selected value (compared as string)
 * @param {string} [opts.placeholder]  – placeholder option text, e.g. "Unassigned" (value="")
 * @param {number} [opts.recentCount]  – max recent items to show (default 5)
 * @param {string} [opts.nameField]    – field on items for display name (default 'name', falls back to 'title')
 * @param {string} [opts.allLabel]     – label for the "All" optgroup (default "All")
 * @returns {string} HTML string of <option>/<optgroup> elements
 */
export function buildRecentOptions(items, entries, idField, opts = {}) {
    const {
        selectedId = '',
        placeholder = null,
        recentCount = 5,
        nameField = null,
        allLabel = 'All'
    } = opts;

    const sel = String(selectedId || '');

    // Resolve display name for an item
    const getName = (item) => {
        if (nameField && item[nameField]) return item[nameField];
        return item.name || item.title || 'Unnamed';
    };

    // Compute recent IDs from entries (unique, ordered by most recent)
    const recentIds = [];
    const sorted = [...entries].sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));
    sorted.forEach(e => {
        const val = e[idField];
        if (val && !recentIds.includes(String(val))) recentIds.push(String(val));
    });

    // Map to actual items, limited to recentCount
    const recentItems = recentIds
        .slice(0, recentCount)
        .map(id => items.find(item => String(item.id) === id))
        .filter(Boolean);

    const recentIdSet = new Set(recentItems.map(item => String(item.id)));
    const otherItems = items.filter(item => !recentIdSet.has(String(item.id)));

    // Build HTML
    let html = '';

    // Placeholder option
    if (placeholder !== null) {
        const isSelected = !sel || !items.some(item => String(item.id) === sel);
        html += `<option value="" ${isSelected ? 'selected' : ''}>${placeholder}</option>`;
    }

    // Recent optgroup
    if (recentItems.length > 0) {
        html += `<optgroup label="Recent">`;
        html += recentItems.map(item => {
            const id = String(item.id);
            return `<option value="${id}" ${id === sel ? 'selected' : ''}>${getName(item)}</option>`;
        }).join('');
        html += `</optgroup>`;
    }

    // All / remaining optgroup
    if (otherItems.length > 0) {
        html += `<optgroup label="${allLabel}">`;
        html += otherItems.map(item => {
            const id = String(item.id);
            return `<option value="${id}" ${id === sel ? 'selected' : ''}>${getName(item)}</option>`;
        }).join('');
        html += `</optgroup>`;
    }

    return html;
}

/**
 * Populate a <select> element with recent-aware options.
 * Convenience wrapper around buildRecentOptions.
 *
 * @param {HTMLSelectElement} selectEl
 * @param {Array}  items
 * @param {Array}  entries
 * @param {string} idField
 * @param {Object} [opts] – same opts as buildRecentOptions
 */
export function populateSelectWithRecent(selectEl, items, entries, idField, opts = {}) {
    if (!selectEl) return;
    selectEl.innerHTML = buildRecentOptions(items, entries, idField, opts);
}
