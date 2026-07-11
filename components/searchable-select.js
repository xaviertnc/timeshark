/**
 * components/searchable-select.js
 * 
 * Premium, searchable dropdown component using Portal for z-index safety.
 */
import { escapeHTML } from '../utils/dom.js';

export const SearchableSelect = {
    render(container, items, options = {}) {
        if (!container) return;

        const {
            value = '',
            placeholder = 'Select an item...',
            onChange = () => { },
            recentIds = [],
            nameField = 'name',
            allLabel = 'All Items',
            variant = 'full', // 'full' or 'minimal'
            multiple = false,
            alignTarget = null,
            clearable = false
        } = options;

        if (typeof container.__ssDispose === 'function') {
            container.__ssDispose();
        }

        let currentValue = multiple ? (Array.isArray(value) ? [...value] : []) : String(value);

        const getName = (item) => item[nameField] || item.name || item.title || 'Unnamed';

        // Initial setup
        container.classList.add('relative', 'w-full');

        const getLabel = (val) => {
            if (multiple) {
                if (!val || val.length === 0) return placeholder;
                if (val.length === 1) {
                    const it = items.find(i => String(i.id) === String(val[0]));
                    return it ? getName(it) : '1 Selected';
                }
                return `${val.length} Selected`;
            } else {
                if (!val) return placeholder;
                const it = items.find(i => String(i.id) === String(val));
                return it ? getName(it) : placeholder;
            }
        };

        const initialLabel = getLabel(currentValue);

        const isMinimal = variant === 'minimal';
        const heightClass = options.size === 'small' ? 'h-9 rounded-lg' : 'zen-input';
        
        const triggerClasses = isMinimal
            ? `ss-trigger ${heightClass} w-full flex items-center justify-between gap-2 text-main/60 hover:text-main outline-none transition-all tracking-widest bg-transparent border-none pl-2`
            : `ss-trigger ${heightClass} w-full flex items-center justify-between gap-2 bg-highlight border border-soft text-main outline-none hover:border-primary/30 transition-all focus:ring-1 focus:ring-primary/20 tracking-widest px-3`;

        const renderTriggerContent = (labelStr, val) => {
            const hasValue = multiple ? val.length > 0 : !!val;
            const clearHtml = (clearable && hasValue) ? `
                <div class="ss-clear shrink-0 text-dim/30 hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors mr-1" title="Clear">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
            ` : '';
            return `
                <span class="ss-label truncate text-left flex-grow text-[11px] font-bold tracking-widest leading-none">${escapeHTML(labelStr)}</span>
                <div class="flex items-center">
                    ${clearHtml}
                    <svg class="ss-caret w-3.5 h-3.5 text-dim opacity-30 transition-transform duration-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            `;
        };

        container.innerHTML = `
            <!-- Trigger Button -->
            <button type="button" class="${triggerClasses}">
                ${renderTriggerContent(initialLabel, currentValue)}
            </button>
        `;

        const trigger = container.querySelector('.ss-trigger');
        let caret = container.querySelector('.ss-caret');
        let labelText = container.querySelector('.ss-label');

        const updateTrigger = () => {
            trigger.innerHTML = renderTriggerContent(getLabel(currentValue), currentValue);
            caret = container.querySelector('.ss-caret');
            labelText = container.querySelector('.ss-label');
            if (isOpen && caret) caret.classList.add('rotate-180');
        };

        // Use central portal for the dropdown to avoid z-index clipping
        const portal = document.getElementById('modal-portal');
        if (!portal) return;

        if (container.__ssDropdown) {
            container.__ssDropdown.remove();
            container.__ssDropdown = null;
        }

        const dropdown = document.createElement('div');
        container.__ssDropdown = dropdown;
        dropdown.className = "ss-dropdown hidden fixed mt-1 bg-card border border-soft rounded-lg shadow-soft z-[1000] overflow-hidden transform origin-top scale-95 opacity-0 transition-all duration-200 min-w-[260px] pointer-events-auto";
        dropdown.innerHTML = `
            <div class="p-2 border-b border-subtle">
                <div class="relative flex items-center bg-highlight border border-subtle rounded-md zen-focus-within transition-all">
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg class="w-3.5 h-3.5 text-dim/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input type="text" class="ss-search w-full bg-transparent border-none pl-10 pr-3 h-10 text-[13px] font-bold text-main outline-none ring-0 placeholder:text-dim/15" placeholder="Search...">
                </div>
            </div>
            <div class="ss-list max-h-[250px] overflow-y-auto custom-scrollbar p-1 space-y-px"></div>
        `;
        portal.appendChild(dropdown);

        const searchInput = dropdown.querySelector('.ss-search');
        const listContainer = dropdown.querySelector('.ss-list');

        let isOpen = false;
        let highlightedIndex = -1;
        let filteredItems = [];

        const updateList = (filter = '') => {
            const lowFilter = filter.toLowerCase();
            const searchFiltered = items.filter(i => getName(i).toLowerCase().includes(lowFilter));
            const recentItems = recentIds
                .map(id => items.find(item => String(item.id) === String(id)))
                .filter(Boolean)
                .filter(i => getName(i).toLowerCase().includes(lowFilter));

            const recentSet = new Set(recentItems.map(i => String(i.id)));
            const otherItems = searchFiltered.filter(i => !recentSet.has(String(i.id)));

            filteredItems = [];
            let html = '';

            const renderItem = (item) => {
                const id = String(item.id);
                filteredItems.push(item);
                const isSelected = multiple ? currentValue.includes(id) : id === String(currentValue);
                return `
                    <div class="ss-item px-4 py-2 rounded-md text-[12px] font-bold text-main/70 hover:bg-highlight hover:text-primary cursor-pointer transition-all flex items-center justify-between group active:scale-[0.98]" data-id="${id}">
                        <span class="truncate pr-2">${escapeHTML(getName(item))}</span>
                        ${isSelected ? '<svg class="w-3.5 h-3.5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
                    </div>
                `;
            };

            if (recentItems.length > 0) {
                html += `<div class="px-4 py-2 text-[9px] font-black text-dim/40 uppercase tracking-[0.2em] select-none">Recently Used</div>`;
                recentItems.forEach(item => html += renderItem(item));
            }

            if (otherItems.length > 0) {
                if (recentItems.length > 0) html += `<div class="h-px bg-subtle mx-2 my-1.5"></div>`;
                html += `<div class="px-4 py-2 text-[9px] font-black text-dim/40 uppercase tracking-[0.2em] select-none">${allLabel}</div>`;
                otherItems.forEach(item => html += renderItem(item));
            }

            if (filteredItems.length === 0) {
                html = `<div class="py-10 text-center text-dim/20 text-[10px] font-bold uppercase tracking-widest italic select-none">No matches found</div>`;
            }

            listContainer.innerHTML = html;
            highlightedIndex = -1;
        };

        const toggleDropdown = (show) => {
            isOpen = show !== undefined ? show : !isOpen;
            if (isOpen) {
                // Calculate position relative to viewport
                const targetEl = (alignTarget ? document.querySelector(alignTarget) : null) || trigger;
                const rect = targetEl.getBoundingClientRect();
                
                // Prevent horizontal overflow
                const padding = 16; // Edge margin
                let left = rect.left;
                const dropdownWidth = Math.max(rect.width, 260); // min-w-[260px]
                
                if (left + dropdownWidth > window.innerWidth - padding) {
                    left = window.innerWidth - dropdownWidth - padding;
                }
                
                dropdown.style.left = `${left}px`;
                dropdown.style.width = `${dropdownWidth}px`;

                const spaceBelow = window.innerHeight - rect.bottom;
                if (spaceBelow < 300) {
                    dropdown.style.top = 'auto';
                    dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
                    dropdown.classList.replace('origin-top', 'origin-bottom');
                } else {
                    dropdown.style.top = `${rect.bottom + 4}px`;
                    dropdown.style.bottom = 'auto';
                    dropdown.classList.replace('origin-bottom', 'origin-top');
                }

                dropdown.classList.remove('hidden');
                setTimeout(() => {
                    dropdown.classList.remove('scale-95', 'opacity-0');
                    dropdown.classList.add('scale-100', 'opacity-100');
                    caret.classList.add('rotate-180');
                    searchInput.focus();
                }, 10);
                updateList();
            } else {
                dropdown.classList.remove('scale-100', 'opacity-100');
                dropdown.classList.add('scale-95', 'opacity-0');
                caret.classList.remove('rotate-180');
                setTimeout(() => dropdown.classList.add('hidden'), 200);
                searchInput.value = '';
            }
        };

        trigger.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target.closest('.ss-clear')) {
                currentValue = multiple ? [] : '';
                trigger.innerHTML = renderTriggerContent(getLabel(currentValue), currentValue);
                onChange(multiple ? [] : '');
                if (isOpen) updateList(searchInput.value);
                return;
            }
            toggleDropdown();
        };

        searchInput.onclick = (e) => e.stopPropagation();
        searchInput.oninput = (e) => updateList(e.target.value);

        listContainer.onclick = (e) => {
            e.stopPropagation();
            const itemEl = e.target.closest('.ss-item');
            if (itemEl) {
                const id = itemEl.dataset.id;
                const item = items.find(i => String(i.id) === id);
                if (item) {
                    if (multiple) {
                        const idx = currentValue.indexOf(id);
                        if (idx > -1) {
                            currentValue.splice(idx, 1);
                        } else {
                            currentValue.push(id);
                        }
                        updateTrigger();
                        onChange([...currentValue]);
                        updateList(searchInput.value);
                    } else {
                        currentValue = id;
                        updateTrigger();
                        onChange(id);
                        toggleDropdown(false);
                    }
                }
            }
        };

        // Keyboard Nav
        searchInput.onkeydown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightedIndex = (highlightedIndex + 1) % filteredItems.length;
                renderHighlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightedIndex = (highlightedIndex - 1 + filteredItems.length) % filteredItems.length;
                renderHighlight();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    const item = filteredItems[highlightedIndex];
                    const id = String(item.id);
                    if (multiple) {
                        const idx = currentValue.indexOf(id);
                        if (idx > -1) currentValue.splice(idx, 1);
                        else currentValue.push(id);
                        updateTrigger();
                        onChange([...currentValue]);
                        updateList(searchInput.value);
                    } else {
                        currentValue = id;
                        updateTrigger();
                        onChange(id);
                        toggleDropdown(false);
                    }
                }
            } else if (e.key === 'Escape') {
                toggleDropdown(false);
            }
        };

        const renderHighlight = () => {
            const itemsEl = listContainer.querySelectorAll('.ss-item');
            itemsEl.forEach((item, idx) => {
                if (idx === highlightedIndex) {
                    item.classList.add('bg-highlight', 'text-primary');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('bg-highlight', 'text-primary');
                }
            });
        };

        // Close on click outside
        const outsideClick = (e) => {
            if (!container.contains(e.target) && !dropdown.contains(e.target)) {
                toggleDropdown(false);
            }
        };
        document.addEventListener('click', outsideClick);

        container.__ssDispose = () => {
            document.removeEventListener('click', outsideClick);
            if (container.__ssDropdown) {
                container.__ssDropdown.remove();
                container.__ssDropdown = null;
            }
            container.__ssDispose = null;
        };
    }
};

