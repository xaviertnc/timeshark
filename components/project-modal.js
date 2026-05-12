import { store } from '../utils/store.js';
import { api } from '../utils/api.js';
import { syncProjectToSpan } from '../utils/project-span-sync.js';

/**
 * components/project-modal.js
 * 
 * Centralized Project Editor
 */
export class ProjectModal {
    static open(project = null, options = {}) {
        const { onSave = () => { }, onCancel = () => { } } = options;
        const state = store.get();
        const customers = state.customers || [];
        const modalPortal = document.getElementById('modal-portal');
        if (!modalPortal) return;

        const defaultPalette = ['#338a81', '#800000', '#4a148c', '#1a237e', '#006064', '#1b5e20', '#827717', '#e65100', '#bf360c', '#3e2723', '#263238', '#c2185b', '#00c853', '#ffd600', '#2c3e50'];
        let currentPalette = JSON.parse(localStorage.getItem('project_palette')) || defaultPalette;

        const closeModal = () => {
            const overlay = modalPortal.querySelector('.project-modal-overlay');
            if (!overlay) return;
            const content = overlay.querySelector('#project-modal-content');
            if (content) content.classList.remove('scale-100', 'opacity-100');
            setTimeout(() => { overlay.remove(); }, 300);
            onCancel();
        };

        const modalHtml = `
            <div class="project-modal-overlay fixed inset-0 bg-secondary/60 z-[100] backdrop-blur-xl pointer-events-auto overflow-y-auto">
                <div class="w-full flex items-start justify-center py-4 px-4">
                    <div id="project-modal-content" class="bg-card rounded-2xl shadow-2xl w-full max-w-3xl p-6 transform scale-95 opacity-0 transition-all duration-300 relative border border-soft mx-3 sm:mx-auto text-main text-center">
                        <button id="close-project-modal" class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-dim hover:text-red-400 transition-all hover:rotate-90 hover:scale-110 border border-white/5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>

                        <div class="mb-6">
                            <h3 class="text-3xl font-black text-main tracking-tighter" id="modal-title">${project ? 'Edit Project' : 'New Project'}</h3>
                            <p class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mt-2 opacity-60">Manage Project Configuration</p>
                        </div>

                        <form id="project-form" class="space-y-4 text-left">
                            <input type="hidden" name="id" value="${project ? project.id : ''}">
                            
                            <!-- Row 1: Name + Organization -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Project Name</label>
                                    <input type="text" name="name" required value="${project ? project.name : ''}" placeholder="Launch Campaign" class="w-full py-3 px-5 bg-app border-none rounded-xl focus:ring-4 focus:ring-primary/10 text-main font-bold placeholder:opacity-30 text-sm outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Parent Organization</label>
                                    <div class="relative group">
                                        <select name="customer_id" id="modal-org-select" class="w-full bg-app border-none rounded-xl py-3 px-5 appearance-none cursor-pointer text-main font-bold focus:ring-4 focus:ring-primary/10 transition-all uppercase text-[11px] tracking-widest outline-none">
                                            <option value="">Global / Internal</option>
                                            ${customers.filter(c => c.is_client == 1).map(c => `<option value="${c.id}" ${project && project.customer_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                        </select>
                                        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Row 2: Status + Lead Contact -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Status</label>
                                    <div class="relative group">
                                        <select name="status" class="w-full bg-app border-none rounded-xl py-3 px-5 appearance-none cursor-pointer text-main font-bold focus:ring-4 focus:ring-primary/10 transition-all uppercase text-[11px] tracking-widest outline-none">
                                            <option value="Active" ${project && project.status === 'Active' ? 'selected' : ''}>Active</option>
                                            <option value="On Hold" ${project && project.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                                            <option value="Completed" ${project && project.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                            <option value="Cancelled" ${project && project.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                        </select>
                                        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Lead Contact</label>
                                    <div class="relative group">
                                        <select name="client_id" id="modal-client-select" class="w-full bg-app border-none rounded-xl py-3 px-5 appearance-none cursor-pointer text-main font-bold focus:ring-4 focus:ring-primary/10 transition-all uppercase text-[11px] tracking-widest outline-none">
                                            <option value="">Assign Later...</option>
                                        </select>
                                        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Row 3: Start Date + Deadline -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Start Date</label>
                                    <input type="date" name="started_at" value="${project && project.started_at ? project.started_at.split('T')[0] : ''}" class="w-full py-3 px-5 bg-app border-none rounded-xl focus:ring-4 focus:ring-primary/10 text-main font-bold text-sm outline-none">
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Deadline</label>
                                    <input type="date" name="completed_at" value="${project && project.completed_at ? project.completed_at.split('T')[0] : ''}" class="w-full py-3 px-5 bg-app border-none rounded-xl focus:ring-4 focus:ring-primary/10 text-main font-bold text-sm outline-none">
                                </div>
                            </div>

                            <!-- Row 4: Progress (full width) -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between ml-2 mr-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em]">Progress</label>
                                    <span id="project-progress-val" class="text-sm font-black text-primary tabular-nums">${project ? project.progress || 0 : 0}%</span>
                                </div>
                                <div class="bg-app p-4 rounded-xl space-y-2 shadow-inner">
                                    <input type="range" name="progress" min="0" max="100" value="${project ? project.progress || 0 : 0}" id="project-progress-slider" class="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer accent-primary shadow-sm border border-soft">
                                    <div class="flex justify-between text-[8px] font-black text-dim/30 uppercase tracking-widest px-1">
                                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Row 5: Project Type & Parent Epic -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Type</label>
                                    <div class="relative group">
                                        <select name="type" id="modal-type-select" class="w-full bg-app border-none rounded-xl py-3 px-5 appearance-none cursor-pointer text-main font-bold focus:ring-4 focus:ring-primary/10 transition-all uppercase text-[11px] tracking-widest outline-none">
                                            <option value="project" ${project && project.type !== 'epic' ? 'selected' : ''}>Project</option>
                                            <option value="epic" ${project && project.type === 'epic' ? 'selected' : ''}>Epic</option>
                                        </select>
                                        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                                <div class="space-y-2" id="parent-epic-container">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Parent Epic</label>
                                    <div class="relative group">
                                        <select name="parent_id" id="modal-parent-select" class="w-full bg-app border-none rounded-xl py-3 px-5 appearance-none cursor-pointer text-main font-bold focus:ring-4 focus:ring-primary/10 transition-all uppercase text-[11px] tracking-widest outline-none">
                                            <option value="">None (Standalone)</option>
                                            ${(state.projects || []).filter(p => p.type === 'epic' && (!project || p.id !== project.id)).map(p => `<option value="${p.id}" ${project && project.parent_id == p.id ? 'selected' : ''}>[EPIC] ${p.name}</option>`).join('')}
                                        </select>
                                        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim group-hover:text-primary transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Row 6: Tags -->
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-[0.2em] block ml-2">Tags</label>
                                <div class="bg-app border border-white/5 rounded-xl p-3 focus-within:ring-4 focus-within:ring-primary/10 transition-all flex flex-wrap gap-2 items-center min-h-[50px] shadow-inner" id="modal-tags-container">
                                    <!-- Badges injected here via JS -->
                                    <input type="text" id="modal-tag-input" placeholder="Type tag and press Enter..." class="bg-transparent border-none outline-none text-main font-bold text-sm flex-1 min-w-[150px] placeholder:opacity-30" style="border: none !important; box-shadow: none !important; background: transparent !important; outline: none !important; padding: 0;">
                                </div>
                                <input type="hidden" name="tags" id="hidden-tags-input" value="${project && project.tags ? project.tags.join(',') : ''}">
                                
                                <div class="mt-3 ml-2 flex flex-wrap gap-1.5" id="suggested-tags-container">
                                    <!-- Suggestions injected here via JS -->
                                </div>
                            </div>

                            <div class="space-y-4 pt-6 border-t-2 border-soft border-dashed">
                                <div class="flex items-center justify-between mb-4">
                                    <label class="text-[10px] font-black text-dim uppercase tracking-[0.5em] opacity-60">Visual ID Palette</label>
                                    <button type="button" id="randomize-colors" class="text-[9px] font-black text-primary uppercase tracking-widest hover:underline px-4 py-2 bg-app rounded-lg border border-soft shadow-inner">Generate New Palette</button>
                                </div>
                                <div id="modal-palette-container" class="flex gap-3 justify-center flex-wrap max-w-lg mx-auto">
                                    <!-- Palette items added by JS -->
                                </div>
                            </div>

                            <div class="pt-4">
                                <button type="submit" id="submit-btn" class="w-full bg-primary hover:bg-primary-dark text-white font-black text-[12px] uppercase tracking-[0.5em] rounded-3xl shadow-2xl shadow-primary/30 transition-all hover:-translate-y-2 active:scale-95 py-4 leading-none transform">
                                    Save Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        modalPortal.insertAdjacentHTML('beforeend', modalHtml);
        const overlay = modalPortal.querySelector('.project-modal-overlay:last-child');
        const content = overlay.querySelector('#project-modal-content');
        const projectForm = overlay.querySelector('#project-form');
        const orgSelect = projectForm.querySelector('#modal-org-select');
        const clientSelect = projectForm.querySelector('#modal-client-select');
        const paletteContainer = overlay.querySelector('#modal-palette-container');
        const progressSlider = overlay.querySelector('#project-progress-slider');
        const progressLabel = overlay.querySelector('#project-progress-val');

        setTimeout(() => {
            if (content) content.classList.add('scale-100', 'opacity-100');
        }, 10);

        overlay.querySelector('#close-project-modal').onclick = closeModal;
        overlay.onclick = (e) => { if (e.target === overlay || e.target === overlay.firstElementChild) closeModal(); };

        const updateClientOptions = (orgId, selectedClientId = null) => {
            let filteredClients = [];
            if (orgId) {
                filteredClients = customers.filter(c => {
                    if (c.is_client == 1) return false;
                    if (c.client_id === orgId) return true;
                    if (c.organization_ids && Array.isArray(c.organization_ids) && c.organization_ids.includes(orgId)) return true;
                    return false;
                });
            } else {
                filteredClients = customers.filter(c => c.is_client == 0 && (!c.client_id && (!c.organization_ids || c.organization_ids.length === 0)));
            }

            clientSelect.innerHTML = '<option value="">Assign Later...</option>' +
                filteredClients.map(c => `<option value="${c.id}" ${c.id == (selectedClientId || (project ? project.client_id : '')) ? 'selected' : ''}>${c.name}</option>`).join('');
        };

        const renderPalette = (selectedColor = null) => {
            let displayPalette = [...currentPalette];
            const activeColor = selectedColor || (project ? project.color : null);
            if (activeColor && !displayPalette.includes(activeColor)) {
                displayPalette.unshift(activeColor);
                if (displayPalette.length > 20) displayPalette.pop();
            }

            paletteContainer.innerHTML = displayPalette.map((color, idx) => `
                <label class="cursor-pointer group relative">
                    <input type="radio" name="color" value="${color}" class="peer sr-only" ${(activeColor ? color === activeColor : idx === 0) ? 'checked' : ''}>
                    <div class="w-11 h-11 rounded-full peer-checked:ring-offset-4 peer-checked:ring-4 peer-checked:ring-primary/20 transition-all border-4 border-white/5 hover:scale-125 shadow-lg active:scale-90" style="background-color: ${color}; box-shadow: 0 5px 15px ${color}30"></div>
                </label>
            `).join('');
        };

        orgSelect.onchange = (e) => updateClientOptions(e.target.value);
        updateClientOptions(project ? project.customer_id : '');
        renderPalette();

        overlay.querySelector('#randomize-colors').onclick = () => {
            const colors = [];
            for (let i = 0; i < 15; i++) {
                const h = Math.floor(Math.random() * 360);
                const s = 40 + Math.floor(Math.random() * 50);
                const l = 25 + Math.floor(Math.random() * 45);
                const l2 = l / 100;
                const a = (s * Math.min(l2, 1 - l2)) / 100;
                const f = n => {
                    const k = (n + h / 30) % 12;
                    const color = l2 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                    return Math.round(255 * color).toString(16).padStart(2, '0');
                };
                colors.push(`#${f(0)}${f(8)}${f(4)}`);
            }
            currentPalette = colors;
            localStorage.setItem('project_palette', JSON.stringify(colors));
            const currentColor = projectForm.querySelector('input[name="color"]:checked')?.value;
            renderPalette(currentColor);
        };

        progressSlider.oninput = () => { progressLabel.textContent = `${progressSlider.value}%`; };

        // TAG BUILDER LOGIC
        const tagsContainer = overlay.querySelector('#modal-tags-container');
        const tagInput = overlay.querySelector('#modal-tag-input');
        const hiddenTagsInput = overlay.querySelector('#hidden-tags-input');
        const suggestedContainer = overlay.querySelector('#suggested-tags-container');
        
        let currentTags = project && project.tags ? [...project.tags].map(t => t.toLowerCase()) : [];
        const existingTagsRaw = (state.projects || []).flatMap(p => p.tags || []);
        let uniqueGlobalTags = [...new Set(existingTagsRaw.map(t => t.toLowerCase()))];
        
        const renderTags = () => {
            const badges = currentTags.map(t => `<span class="bg-primary/20 text-primary border border-primary/20 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5">${t} <button type="button" class="remove-tag hover:text-white" data-tag="${t}">&times;</button></span>`).join('');
            
            const suggestions = uniqueGlobalTags.filter(t => !currentTags.includes(t)).slice(0, 15);
            suggestedContainer.innerHTML = suggestions.length > 0 
                ? `<span class="text-[9px] font-black text-dim/50 uppercase tracking-widest mr-2 py-1">Suggestions:</span>` + suggestions.map(t => `<button type="button" class="suggested-tag bg-white/5 hover:bg-primary/20 hover:text-primary text-dim text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded transition-colors border border-white/5" data-tag="${t}">+ ${t}</button>`).join('')
                : '';

            tagsContainer.querySelectorAll('span').forEach(el => el.remove());
            tagInput.insertAdjacentHTML('beforebegin', badges);
            hiddenTagsInput.value = currentTags.join(',');
            
            tagsContainer.querySelectorAll('.remove-tag').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    currentTags = currentTags.filter(t => t !== btn.dataset.tag);
                    renderTags();
                };
            });
            
            suggestedContainer.querySelectorAll('.suggested-tag').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    const newTag = btn.dataset.tag;
                    if (!currentTags.includes(newTag)) {
                        currentTags.push(newTag);
                        tagInput.value = '';
                        renderTags();
                    }
                };
            });
        };
        
        if (tagsContainer) renderTags();
        
        if (tagInput) {
            tagInput.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const rawTags = tagInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                    let added = false;
                    rawTags.forEach(t => {
                        if (!currentTags.includes(t)) {
                            currentTags.push(t);
                            if (!uniqueGlobalTags.includes(t)) uniqueGlobalTags.push(t);
                            added = true;
                        }
                    });
                    if (added) {
                        tagInput.value = '';
                        renderTags();
                    }
                }
            };
        }

        const typeSelect = projectForm.querySelector('#modal-type-select');
        const parentContainer = projectForm.querySelector('#parent-epic-container');
        if (typeSelect && parentContainer) {
            typeSelect.onchange = (e) => {
                parentContainer.style.display = e.target.value === 'epic' ? 'none' : 'block';
            };
            typeSelect.dispatchEvent(new Event('change'));
        }

        projectForm.onsubmit = async (e) => {
            e.preventDefault();

            // flush any floating text left in tag input into tags
            if (tagInput && tagInput.value.trim()) {
                const rawTags = tagInput.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                rawTags.forEach(t => {
                    if (!currentTags.includes(t)) {
                        currentTags.push(t);
                    }
                });
                hiddenTagsInput.value = currentTags.join(',');
                tagInput.value = '';
                renderTags();
            }

            const data = Object.fromEntries(new FormData(projectForm).entries());
            
            data.tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            if (data.type === 'epic') data.parent_id = null;
            if (!data.parent_id) data.parent_id = null;

            try {
                await api.post('projects.php', data);
                if (data.started_at && data.completed_at) {
                    await syncProjectToSpan(data);
                }
                store.update('projects', await api.get('projects.php'));
                closeModal();
                onSave(data);
            } catch (err) {
                console.error('Project update failed:', err);
                alert('Project update failed');
            }
        };
    }
}

