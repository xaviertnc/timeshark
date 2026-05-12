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
            variant = 'full' // 'full' or 'minimal'
        } = options;

        const getName = (item) => item[nameField] || item.name || item.title || 'Unnamed';

        // Initial setup
        container.classList.add('relative', 'w-full');

        const selectedItem = items.find(i => String(i.id) === String(value));
        const initialLabel = selectedItem ? getName(selectedItem) : placeholder;

        const isMinimal = variant === 'minimal';
        const triggerClasses = isMinimal
            ? "ss-trigger w-full flex items-center justify-between gap-2 text-[11px] font-bold text-main/60 hover:text-main outline-none transition-all uppercase tracking-widest min-h-[38px] px-3 bg-white/[0.03] border border-white/10 rounded-md hover:border-white/20"
            : "ss-trigger w-full flex items-center justify-between gap-2 bg-app/40 border border-white/5 rounded-lg px-4 py-2 sm:py-2 text-[11px] font-bold text-main outline-none hover:border-white/10 transition-all focus:ring-1 focus:ring-primary/20 uppercase tracking-widest min-h-[38px]";

        container.innerHTML = `
            <!-- Trigger Button -->
            <button type="button" class="${triggerClasses}">
                <span class="ss-label truncate text-left flex-grow text-[10px] font-black">${escapeHTML(initialLabel)}</span>
                <svg class="ss-caret w-3.5 h-3.5 text-dim opacity-30 transition-transform duration-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
            </button>
        `;

        const trigger = container.querySelector('.ss-trigger');
        const caret = container.querySelector('.ss-caret');
        const labelText = container.querySelector('.ss-label');

        // Use central portal for the dropdown to avoid z-index clipping
        const portal = document.getElementById('modal-portal');
        if (!portal) return;

        const dropdown = document.createElement('div');
        dropdown.className = "ss-dropdown hidden fixed mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-[1000] overflow-hidden transform origin-top scale-95 opacity-0 transition-all duration-200 min-w-[260px] pointer-events-auto";
        dropdown.innerHTML = `
            <div class="p-2 border-b border-white/5">
                <div class="relative flex items-center bg-white/[0.03] border border-white/10 rounded-md focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg class="w-3.5 h-3.5 text-dim/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input type="text" class="ss-search w-full bg-transparent border-none pl-10 pr-3 py-2 text-[12px] font-bold text-main outline-none ring-0 placeholder:text-dim/15" placeholder="Search...">
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
                const isSelected = id === String(value);
                return `
                    <div class="ss-item px-3 py-1 rounded-sm text-[11px] font-bold text-main/70 hover:bg-white/5 hover:text-white cursor-pointer transition-all flex items-center justify-between group active:scale-[0.98]" data-id="${id}">
                        <span class="truncate pr-2 text-[11px]">${escapeHTML(getName(item))}</span>
                        ${isSelected ? '<svg class="w-3 h-3 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
                    </div>
                `;
            };

            if (recentItems.length > 0) {
                html += `<div class="px-3 py-2 text-[9px] font-black text-dim/40 uppercase tracking-[0.2em] select-none">Recently Used</div>`;
                recentItems.forEach(item => html += renderItem(item));
            }

            if (otherItems.length > 0) {
                if (recentItems.length > 0) html += `<div class="h-px bg-white/5 mx-2 my-1.5"></div>`;
                html += `<div class="px-3 py-2 text-[9px] font-black text-dim/40 uppercase tracking-[0.2em] select-none">${allLabel}</div>`;
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
                const rect = trigger.getBoundingClientRect();
                dropdown.style.left = `${rect.left}px`;
                dropdown.style.width = `${rect.width}px`;

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
                    labelText.textContent = getName(item);
                    onChange(id);
                    toggleDropdown(false);
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
                    labelText.textContent = getName(item);
                    onChange(String(item.id));
                    toggleDropdown(false);
                }
            } else if (e.key === 'Escape') {
                toggleDropdown(false);
            }
        };

        const renderHighlight = () => {
            const itemsEl = listContainer.querySelectorAll('.ss-item');
            itemsEl.forEach((item, idx) => {
                if (idx === highlightedIndex) {
                    item.classList.add('bg-white/10', 'text-white');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('bg-white/10', 'text-white');
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
    }
};

