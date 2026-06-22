import { store } from '../utils/store.js';
import { escapeHTML } from '../utils/dom.js';

export const ExportModal = {
    open(options = {}) {
        const portal = document.getElementById('modal-portal');
        if (!portal) return;
        
        const exportType = options.type || 'time_entries';
        const titleText = exportType === 'tasks' ? 'Export Tasks' : 'Export Time Entries';

        const defaultPeriods = [
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'last_week', label: 'Last Week' },
            { id: 'last_2_weeks', label: 'Last 2 Weeks' },
            { id: 'last_3_weeks', label: 'Last 3 Weeks' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: '7_days', label: 'Last 7 Days' },
            { id: '15_days', label: 'Last 15 Days' },
            { id: '30_days', label: 'Last 30 Days' },
            { id: '60_days', label: 'Last 60 Days' },
            { id: '90_days', label: 'Last 90 Days' },
            { id: 'all', label: 'All Time' }
        ];

        const state = store.get();
        const projects = state.projects || [];

        const modalHtml = `
            <div id="export-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center opacity-0 transition-opacity duration-300 pointer-events-auto">
                <div id="export-modal-content" class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-soft transform scale-95 opacity-0 transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden">
                    <div class="px-6 py-4 border-b border-soft flex items-center justify-between bg-card z-10 shrink-0">
                        <h2 class="text-sm font-black text-main uppercase tracking-widest">${titleText}</h2>
                        <button type="button" id="export-modal-close" class="text-dim hover:text-main transition-colors p-1 rounded-md hover:bg-white/5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto space-y-6">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-dim uppercase tracking-widest">Export Format</label>
                            <div class="flex gap-4">
                                <label class="flex-1 flex items-center gap-3 p-3 rounded-xl border border-soft cursor-pointer hover:border-primary/50 transition-all bg-highlight group">
                                    <input type="radio" name="export-format" value="csv" class="text-primary focus:ring-primary/20 focus:ring-offset-0 bg-app border-soft" checked>
                                    <div class="flex flex-col">
                                        <span class="text-sm font-bold text-main">CSV</span>
                                        <span class="text-[10px] text-dim">Spreadsheet format</span>
                                    </div>
                                </label>
                                <label class="flex-1 flex items-center gap-3 p-3 rounded-xl border border-soft cursor-pointer hover:border-primary/50 transition-all bg-highlight group">
                                    <input type="radio" name="export-format" value="json" class="text-primary focus:ring-primary/20 focus:ring-offset-0 bg-app border-soft">
                                    <div class="flex flex-col">
                                        <span class="text-sm font-bold text-main">JSON</span>
                                        <span class="text-[10px] text-dim">Developer friendly</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-dim uppercase tracking-widest">Time Period</label>
                            <select id="export-period" class="w-full bg-highlight border border-soft rounded-lg px-3 py-2.5 text-sm font-bold text-main focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all">
                                ${defaultPeriods.map(p => `<option value="${p.id}" ${p.id === 'this_month' ? 'selected' : ''}>${p.label}</option>`).join('')}
                            </select>
                        </div>
                        
                        ${projects.length > 0 ? `
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-dim uppercase tracking-widest">Don't Include</label>
                            <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                ${projects.map(p => {
                                    const isDefaultChecked = p.name.toLowerCase().includes('personal') || p.name.toLowerCase().includes('time shark');
                                    return `
                                    <label class="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 cursor-pointer transition-all group" title="Exclude ${escapeHTML(p.name)}">
                                        <input type="checkbox" name="exclude-project" value="${p.id}" class="rounded-sm bg-app border-soft w-3.5 h-3.5" style="color: ${p.color || '#ef4444'};" ${isDefaultChecked ? 'checked' : ''}>
                                        <span class="text-[10px] font-bold transition-colors select-none" style="color: ${p.color || '#ef4444'}">${escapeHTML(p.name)}</span>
                                    </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="px-6 py-4 border-t border-soft flex justify-end gap-3 bg-card shrink-0">
                        <button type="button" id="export-modal-cancel" class="px-5 py-2 rounded-lg text-xs font-black text-main hover:bg-white/5 transition-colors uppercase tracking-widest">Cancel</button>
                        <button type="button" id="export-modal-download" class="px-5 py-2 rounded-lg text-xs font-black bg-primary hover:bg-primary-dark text-white transition-all shadow-sm flex items-center gap-2 uppercase tracking-widest">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download
                        </button>
                    </div>
                </div>
            </div>
        `;

        portal.innerHTML = modalHtml;

        const backdrop = document.getElementById('export-modal-backdrop');
        const content = document.getElementById('export-modal-content');
        
        requestAnimationFrame(() => {
            backdrop.classList.remove('opacity-0');
            content.classList.remove('opacity-0', 'scale-95');
            content.classList.add('opacity-100', 'scale-100');
        });

        const close = () => {
            backdrop.classList.add('opacity-0');
            content.classList.remove('opacity-100', 'scale-100');
            content.classList.add('opacity-0', 'scale-95');
            setTimeout(() => { portal.innerHTML = ''; }, 300);
        };

        document.getElementById('export-modal-close').onclick = close;
        document.getElementById('export-modal-cancel').onclick = close;
        backdrop.onclick = (e) => {
            if (e.target === backdrop) close();
        };

        document.getElementById('export-modal-download').onclick = () => {
            const format = document.querySelector('input[name="export-format"]:checked').value;
            const period = document.getElementById('export-period').value;
            const excludedStr = Array.from(document.querySelectorAll('input[name="exclude-project"]:checked')).map(el => el.value).join(',');
            
            window.location.href = `api/export.php?type=${exportType}&format=${format}&period=${period}&exclude_projects=${encodeURIComponent(excludedStr)}`;
            close();
        };
    }
};
