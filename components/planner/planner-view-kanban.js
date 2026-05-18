/**
 * components/planner/planner-view-kanban.js
 * 
 * Renders a Kanban board view for tasks, grouped by status.
 */

export const PlannerKanban = {
    render(container, data, config, today, projectFilter) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = '';
        container.className = 'flex flex-grow bg-app/20 p-4 gap-4 overflow-x-auto overflow-y-hidden custom-scrollbar';

        // Extract all tasks
        const allTasks = [];
        if (data.backlog) allTasks.push(...data.backlog);
        if (data.rows) {
            data.rows.forEach(row => {
                if (row.tasks) allTasks.push(...row.tasks);
            });
        }

        // Define columns
        const columns = [
            { id: 'todo', title: 'To Do', status: 'todo', borderColor: 'border-white/10' },
            { id: 'doing', title: 'In Progress', status: 'doing', borderColor: 'border-primary/50' },
            { id: 'backlog', title: 'Backlog', status: 'backlog', borderColor: 'border-white/10' },
            { id: 'done', title: 'Done', status: 'done', borderColor: 'border-green-500/50' }
        ];

        // Ensure tasks that have progress > 0 but < 100 and status 'todo' are grouped in "doing" if 'doing' is a status used, 
        // however timeshark relies on 'todo'/'done'. If status is 'todo' but has progress, map to 'doing'.
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

        columns.forEach(col => {
            const colTasks = allTasks.filter(t => t._renderStatus === col.status);
            
            // Sort by start_date or priority
            colTasks.sort((a, b) => {
                const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
                const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
                return dateA - dateB;
            });

            const colEl = document.createElement('div');
            colEl.className = `flex flex-col w-[300px] flex-shrink-0 bg-card rounded-xl border-t-2 border-x border-b border-x-white/5 border-b-white/5 ${col.borderColor} shadow-sm overflow-hidden`;

            // Column Header
            colEl.innerHTML = `
                <div class="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h3 class="text-xs font-black uppercase tracking-widest text-main opacity-80">${col.title}</h3>
                    <span class="text-[10px] font-bold text-dim bg-white/5 px-1.5 py-0.5 rounded-md">${colTasks.length}</span>
                </div>
                <div class="flex-grow p-2 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative">
                    ${colTasks.map(task => {
                        const proj = getProject(task.project_id);
                        const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : task.tags.split(',').filter(Boolean)) : [];
                        const tagBadges = tags.slice(0, 3).map(t => `<span class="px-1.5 py-px rounded bg-black/20 text-[8px] opacity-60 uppercase tracking-widest">${t}</span>`).join('');
                        
                        const isDone = task.status === 'done';
                        const progressHtml = task.progress ? `<div class="w-full bg-black/20 h-1 mt-2 rounded-full overflow-hidden"><div class="bg-primary h-full" style="width: ${task.progress}%"></div></div>` : '';

                        return `
                        <div class="task-item bg-app/50 border border-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/5 hover:border-white/10 transition-colors group relative" data-task-id="${task.id}">
                            <div class="flex items-start justify-between gap-2 mb-1.5">
                                <span class="text-xs font-medium text-main leading-tight ${isDone ? 'line-through opacity-50' : ''}">${task.title}</span>
                                <div class="w-2 h-2 rounded-sm shrink-0 mt-0.5" style="background-color: ${proj.color}"></div>
                            </div>
                            <div class="text-[9px] font-bold text-dim/60 mb-2 truncate">${proj.name}</div>
                            ${tagBadges ? `<div class="flex flex-wrap gap-1 mb-2">${tagBadges}</div>` : ''}
                            ${progressHtml}
                        </div>
                        `;
                    }).join('')}
                    ${colTasks.length === 0 ? `<div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-[10px] uppercase font-black tracking-widest">Empty</div>` : ''}
                </div>
            `;
            container.appendChild(colEl);
        });
    }
};
