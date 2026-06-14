/**
 * components/planner/planner-view-kanban.js
 * 
 * Renders a Kanban board view for tasks, grouped by status.
 */

import { api } from '../../utils/api.js';

export const PlannerKanban = {
    render(container, data, config, today, projectFilter, callbacks) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        const refresh = callbacks?.refresh || (() => {});

        container.innerHTML = '';
        container.className = 'flex flex-col w-full h-full';

        // Load config
        let kanbanConfig = JSON.parse(localStorage.getItem('timeshark_kanban_config') || 'null');
        if (!kanbanConfig) {
            kanbanConfig = {
                compactMode: false,
                columns: [
                    { id: 'todo', title: 'To Do', status: 'todo', borderColor: 'border-white/10', visible: true, order: 0 },
                    { id: 'doing', title: 'In Progress', status: 'doing', borderColor: 'border-primary/50', visible: true, order: 1 },
                    { id: 'backlog', title: 'Backlog', status: 'backlog', borderColor: 'border-white/10', visible: true, order: 2 },
                    { id: 'done', title: 'Done', status: 'done', borderColor: 'border-green-500/50', visible: true, order: 3 }
                ]
            };
        }
        
        const saveConfig = () => localStorage.setItem('timeshark_kanban_config', JSON.stringify(kanbanConfig));

        // Header for Kanban controls
        const headerEl = document.createElement('div');
        headerEl.className = 'shrink-0 p-3 border-b border-white/5 flex items-center justify-between bg-card/20';
        headerEl.innerHTML = `
            <div class="flex items-center gap-4 hidden-columns-toggles">
                <span class="text-[9px] uppercase tracking-widest font-black text-dim opacity-50">Columns:</span>
                ${kanbanConfig.columns.map(col => `
                    <label class="flex items-center gap-1.5 cursor-pointer max-w-fit">
                        <input type="checkbox" class="kanban-col-toggle rounded-sm bg-black/20 border-white/10 text-primary w-3 h-3 appearance-none checked:bg-primary" data-id="${col.id}" ${col.visible ? 'checked' : ''}>
                        <span class="text-[10px] font-bold text-main ${col.visible ? '' : 'opacity-40'}">${col.title}</span>
                    </label>
                `).join('')}
            </div>
            <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 cursor-pointer group mb-0">
                    <span class="text-[9px] font-black uppercase tracking-widest text-dim group-hover:text-main transition-colors mt-0.5">Compact List</span>
                    <div class="relative w-7 h-4 bg-black/20 rounded-full border border-white/10 transition-colors">
                        <input type="checkbox" id="kanban-compact-toggle" class="sr-only" ${kanbanConfig.compactMode ? 'checked' : ''}>
                        <div class="absolute left-1 top-[1px] w-3 h-3 rounded-full transition-all ${kanbanConfig.compactMode ? 'translate-x-3 bg-primary shadow-[0_0_8px_rgba(51,138,129,0.5)]' : 'bg-dim'}"></div>
                    </div>
                </label>
            </div>
        `;

        headerEl.querySelectorAll('.kanban-col-toggle').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const colId = e.target.dataset.id;
                const col = kanbanConfig.columns.find(c => c.id === colId);
                if (col) {
                    col.visible = e.target.checked;
                    saveConfig();
                    PlannerKanban.render(container, data, config, today, projectFilter, callbacks);
                }
            });
        });

        const compactToggle = headerEl.querySelector('#kanban-compact-toggle');
        compactToggle.addEventListener('change', (e) => {
            kanbanConfig.compactMode = e.target.checked;
            saveConfig();
            PlannerKanban.render(container, data, config, today, projectFilter, callbacks);
        });

        container.appendChild(headerEl);

        const boardEl = document.createElement('div');
        boardEl.className = 'flex flex-grow p-4 gap-4 overflow-x-auto overflow-y-hidden custom-scrollbar bg-app/20 items-stretch';
        container.appendChild(boardEl);

        // Extract all tasks, filtered by selected time range
        const allTasks = [];
        const viewStart = config.startDate ? config.startDate.getTime() : 0;
        const viewEnd = config.endDate ? config.endDate.getTime() : Infinity;

        const isTaskInView = (task) => {
            const tStart = task.start_date ? new Date(task.start_date).getTime() : null;
            const tEnd = task.due_date ? new Date(task.due_date).getTime() : tStart;
            
            if (!tStart && !tEnd) return true; // Show unscheduled tasks
            
            const start = tStart || tEnd;
            const end = tEnd || tStart;
            
            return start <= viewEnd && end >= viewStart;
        };

        if (data.backlog) allTasks.push(...data.backlog.filter(isTaskInView));
        if (data.rows) {
            data.rows.forEach(row => {
                if (row.tasks) allTasks.push(...row.tasks.filter(isTaskInView));
            });
        }

        allTasks.forEach(t => {
            if (t.status === 'todo' && t.progress > 0 && t.progress < 100) {
                t._renderStatus = 'doing';
            } else if (!t.status) {
                t._renderStatus = 'todo';
            } else {
                t._renderStatus = t.status;
            }
        });

        const getProject = (pid) => data.projects.find(p => String(p.id) === String(pid)) || { name: 'Unassigned', color: '#475569' };

        // Sort columns by order
        const visibleCols = [...kanbanConfig.columns].filter(c => c.visible).sort((a, b) => a.order - b.order);

        visibleCols.forEach(col => {
            const colTasks = allTasks.filter(t => t._renderStatus === col.status);
            
            // For now, sort by start_date
            colTasks.sort((a, b) => {
                const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
                const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
                return dateA - dateB;
            });

            const colEl = document.createElement('div');
            colEl.className = `flex flex-col w-[300px] flex-shrink-0 bg-card rounded-xl border-t-2 border-x border-b border-x-white/5 border-b-white/5 ${col.borderColor} shadow-sm overflow-hidden kanban-col group/col transition-opacity duration-200`;
            colEl.dataset.colId = col.id;
            colEl.dataset.status = col.status;

            // Column Header (Draggable)
            colEl.innerHTML = `
                <div class="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02] cursor-grab active:cursor-grabbing kanban-col-header" draggable="true" data-col-id="${col.id}">
                    <div class="flex items-center gap-2 pointer-events-none">
                        <svg class="w-3 h-3 text-dim opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 8h16M4 16h16"></path></svg>
                        <h3 class="text-xs font-black uppercase tracking-widest text-main opacity-80">${col.title}</h3>
                    </div>
                    <span class="text-[10px] font-bold text-dim bg-white/5 px-1.5 py-0.5 rounded-md pointer-events-none">${colTasks.length}</span>
                </div>
                <div class="flex-grow p-2 overflow-y-auto custom-scrollbar flex flex-col gap-[2px] relative kanban-dropzone h-full" data-status="${col.status}">
                    ${colTasks.map(task => {
                        const proj = getProject(task.project_id);
                        const isDone = task.status === 'done';
                        
                        // We use a small dot and just the title for compact mode to emulate a text file list
                        if (kanbanConfig.compactMode) {
                            return `
                                <div class="task-item flex items-center gap-2 bg-transparent hover:bg-white/5 p-1 rounded cursor-pointer transition-colors border border-transparent hover:border-white/5" draggable="true" data-task-id="${task.id}">
                                    <div class="rounded-sm shrink-0" style="background-color: ${proj.color}; width: 8px; height: 8px;"></div>
                                    <span class="text-[11px] font-medium text-main truncate ${isDone ? 'line-through opacity-50' : ''}">${task.title}</span>
                                </div>
                            `;
                        } else {
                            const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : task.tags.split(',').filter(Boolean)) : [];
                            const tagBadges = tags.slice(0, 3).map(t => `<span class="px-1.5 py-px rounded bg-black/20 text-[8px] opacity-60 uppercase tracking-widest">${t}</span>`).join('');
                            const progressHtml = task.progress ? `<div class="w-full bg-black/20 h-1 mt-2 rounded-full overflow-hidden inline-progress-bar" data-task-id="${task.id}" data-progress="${task.progress}"><div class="bg-primary h-full transition-all duration-300" style="width: ${task.progress}%"></div></div>` : '';

                            return `
                            <div class="task-item bg-app/50 border border-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/5 hover:border-white/10 transition-colors group relative ${kanbanConfig.compactMode ? '' : 'mb-2'}" draggable="true" data-task-id="${task.id}">
                                <div class="flex items-start justify-between gap-2 mb-1.5">
                                    <span class="text-xs font-medium text-main leading-tight ${isDone ? 'line-through opacity-50' : ''}">${task.title}</span>
                                    <div class="w-2 h-2 rounded-sm shrink-0 mt-0.5" style="background-color: ${proj.color}"></div>
                                </div>
                                <div class="text-[9px] font-bold text-dim/60 mb-2 truncate">${proj.name}</div>
                                ${tagBadges ? `<div class="flex flex-wrap gap-1 mb-2">${tagBadges}</div>` : ''}
                                ${progressHtml}
                            </div>
                            `;
                        }
                    }).join('')}
                    ${colTasks.length === 0 ? `<div class="absolute inset-0 flex items-center justify-center pointer-events-none text-dim opacity-20 text-[10px] uppercase font-black tracking-widest h-full w-full">Empty</div>` : ''}
                </div>
                ${(col.status === 'todo' || col.status === 'backlog') ? `
                <div class="p-2 border-t border-white/5 bg-white/[0.01]">
                    <button type="button" class="add-kanban-task-btn w-full py-1.5 flex items-center justify-center gap-1.5 rounded bg-white/5 hover:bg-primary/20 text-dim hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest" data-status="${col.status}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg>
                        Add Task
                    </button>
                </div>
                ` : ''}
            `;
            boardEl.appendChild(colEl);
        });

        // ------------------
        // DnD for Columns
        // ------------------
        const colHeaders = container.querySelectorAll('.kanban-col-header');
        let dragColId = null;

        colHeaders.forEach(header => {
            header.addEventListener('dragstart', (e) => {
                dragColId = e.target.dataset.colId;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', 'column');
                e.target.closest('.kanban-col').classList.add('opacity-30');
            });
            header.addEventListener('dragend', (e) => {
                e.target.closest('.kanban-col').classList.remove('opacity-30');
                dragColId = null;
                
                container.querySelectorAll('.kanban-col').forEach(c => {
                    c.classList.remove('border-l-primary', 'border-l-2');
                });
            });
        });

        container.querySelectorAll('.kanban-col').forEach(colEl => {
            colEl.addEventListener('dragover', (e) => {
                if (dragColId && dragColId !== colEl.dataset.colId) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    colEl.classList.add('border-l-primary', 'border-l-2');
                }
            });
            colEl.addEventListener('dragleave', () => {
                colEl.classList.remove('border-l-primary', 'border-l-2');
            });
            colEl.addEventListener('drop', (e) => {
                colEl.classList.remove('border-l-primary', 'border-l-2');
                if (dragColId && dragColId !== colEl.dataset.colId) {
                    e.preventDefault();
                    // Reorder columns
                    const draggedIndex = kanbanConfig.columns.findIndex(c => c.id === dragColId);
                    const dropIndex = kanbanConfig.columns.findIndex(c => c.id === colEl.dataset.colId);
                    
                    if (draggedIndex !== -1 && dropIndex !== -1) {
                        const movedCol = kanbanConfig.columns.splice(draggedIndex, 1)[0];
                        kanbanConfig.columns.splice(dropIndex, 0, movedCol);
                        
                        // Update order ints
                        kanbanConfig.columns.forEach((c, idx) => c.order = idx);
                        saveConfig();
                        PlannerKanban.render(container, data, config, today, projectFilter, callbacks);
                    }
                }
            });
        });

        // ------------------
        // DnD for Tasks
        // ------------------
        const taskItems = container.querySelectorAll('.task-item');
        let dragTaskId = null;

        taskItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                // Ignore if it's a column drag
                if (e.target.closest('.kanban-col-header')) return;
                
                dragTaskId = e.target.dataset.taskId;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('task-id', dragTaskId);
                setTimeout(() => e.target.classList.add('opacity-30'), 0);
            });
            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('opacity-30');
                dragTaskId = null;
                container.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('bg-white/[0.04]', 'ring-1', 'ring-white/10'));
            });
        });

        container.querySelectorAll('.kanban-dropzone').forEach(dropzone => {
            dropzone.addEventListener('dragover', (e) => {
                // Allow only task drops
                if (!dragColId) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    dropzone.closest('.kanban-col').classList.add('bg-white/[0.04]', 'ring-1', 'ring-white/10');
                }
            });
            dropzone.addEventListener('dragleave', (e) => {
                dropzone.closest('.kanban-col').classList.remove('bg-white/[0.04]', 'ring-1', 'ring-white/10');
            });
            dropzone.addEventListener('drop', async (e) => {
                dropzone.closest('.kanban-col').classList.remove('bg-white/[0.04]', 'ring-1', 'ring-white/10');
                const taskId = e.dataTransfer.getData('task-id');
                if (taskId && !dragColId) {
                    e.preventDefault();
                    const newStatus = dropzone.dataset.status;
                    
                    // Find the task
                    const task = allTasks.find(t => String(t.id) === String(taskId));
                    if (task && task._renderStatus !== newStatus) {
                        try {
                            task.status = newStatus;
                            if (newStatus === 'done') task.progress = 100;
                            else if (newStatus === 'todo') task.progress = 0;
                            
                            // Optimistically update rendering
                            task._renderStatus = newStatus;
                            PlannerKanban.render(container, data, config, today, projectFilter, callbacks);
                            
                            const updatePayload = {
                                id: task.id,
                                status: task.status,
                                progress: task.progress
                            };
                            // Backdate future dates when dropping into Done
                            if (newStatus === 'done') {
                                const now = new Date();
                                updatePayload.completed_at = now.toISOString();
                                if (task.start_date) {
                                    const todayStr = now.toISOString().split('T')[0];
                                    const startTime = new Date(task.start_date).getTime();
                                    const endTime = task.end_date ? new Date(task.end_date).getTime() : startTime;
                                    const nowTime = now.getTime();
                                    if (startTime > nowTime && endTime > nowTime) {
                                        updatePayload.start_date = `${todayStr}T${now.toTimeString().substring(0, 5)}:00`;
                                        const endDt = new Date(nowTime + 3600000);
                                        updatePayload.end_date = `${todayStr}T${endDt.toTimeString().substring(0, 5)}:00`;
                                    } else if (endTime > nowTime) {
                                        updatePayload.end_date = `${todayStr}T${now.toTimeString().substring(0, 5)}:00`;
                                    }
                                }
                            }
                            await api.post('planner.php?action=update_task', updatePayload);
                            refresh();
                        } catch (err) {
                            console.error("Failed to update status", err);
                        }
                    } else if (task && task._renderStatus === newStatus) {
                         // Dragged within same column
                         // Could potentially rearrange ordering inside the column.
                         // But if they are just sorting by start_date natively, it won't persist unless we update start_dates.
                         // We will leave the dropping effect alone for now if in the same column.
                    }
                }
            });
        });
    }
};
