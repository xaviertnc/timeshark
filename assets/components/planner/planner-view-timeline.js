/**
 * assets/components/planner/planner-view-timeline.js
 * 
 * Renders the Gantt-style timeline view.
 */

import { PlannerUtils } from './planner-utils.js';

export const PlannerTimeline = {
    render(container, data, config, today) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = '';

        // Calculate dimensions
        const dayWidth = config.colWidth || 40; // px per day in some views, or just a base unit
        // For timeline logic, we need to map Date -> Pixel X

        const startTime = config.startDate.getTime();
        const endTime = config.endDate.getTime();
        const totalDuration = endTime - startTime + (24 * 60 * 60 * 1000); // Include last day
        const totalDays = totalDuration / (24 * 60 * 60 * 1000);

        // We can use a fixed width per day
        const pxPerDay = config.colWidth || 60;
        const totalWidth = config.totalWidth || (totalDays * pxPerDay);

        const getX = (date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const diff = d.getTime() - startTime;
            const daysDiff = diff / (24 * 60 * 60 * 1000);
            return daysDiff * pxPerDay;
        };

        const getWidth = (start, end) => {
            const s = new Date(start); s.setHours(0, 0, 0, 0);
            const e = new Date(end); e.setHours(23, 59, 59, 999);
            // If end is missing, assume 1 day
            const diff = Math.max(0, e.getTime() - s.getTime());
            // Add 1 day worth of px for inclusive end date? 
            // Actually diff includes hours. 
            // Let's just say (End Day Index - Start Day Index + 1) * pxPerDay
            const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
            return Math.max(1, days) * pxPerDay;
        };


        // Header
        const header = document.createElement('div');
        header.className = 'flex sticky top-0 z-30 bg-app border-b border-soft';
        header.innerHTML = `
            <div class="w-48 flex-shrink-0 p-4 font-black text-dim text-[10px] uppercase tracking-widest border-r border-soft bg-app sticky left-0 z-40">
                Resource
            </div>
            <div class="relative flex-grow h-12 overflow-hidden" style="width: ${totalWidth}px">
                ${config.dates.map((d, i) => `
                    <div class="absolute top-0 bottom-0 border-r border-soft flex flex-col items-center justify-center text-[10px] font-bold text-dim uppercase"
                         style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${d.toDateString() === today.toDateString() ? 'rgba(var(--color-primary), 0.1)' : 'transparent'}">
                         <span class="${d.toDateString() === today.toDateString() ? 'text-primary' : ''}">${d.getDate()}</span>
                         <span class="opacity-50 text-[8px]">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'relative';

        data.rows.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'flex border-b border-soft hover:bg-card/30 transition-colors group/row';

            // Resource Column
            rowEl.innerHTML = `
                <div class="w-48 flex-shrink-0 p-4 border-r border-soft bg-app sticky left-0 z-20 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-card border border-soft flex items-center justify-center text-[10px] font-black text-dim">
                        ${row.resource.substring(0, 2).toUpperCase()}
                    </div>
                    <span class="text-base font-bold text-main truncate">${row.resource}</span>
                </div>
                <div class="relative flex-grow h-16" style="width: ${totalWidth}px">
                     <!-- Grid Lines -->
                     ${config.dates.map((d, i) => `
                        <div class="absolute top-0 bottom-0 border-r border-dashed border-soft/50 pointer-events-none"
                             style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${d.toDateString() === today.toDateString() ? 'rgba(var(--color-primary), 0.02)' : 'transparent'}">
                        </div>
                    `).join('')}

                     <!-- Tasks -->
                     ${(() => {
                    let html = '';
                    // Render Planned Tasks
                    row.tasks.forEach(task => {
                        if (!task.start_date) return;
                        const x = getX(task.start_date);
                        const w = getWidth(task.start_date, task.end_date);

                        // Check if visible in current view range
                        if (x + w < 0 || x > totalWidth) return;

                        const proj = data.projects.find(p => p.id == task.project_id) || { color: '#ccc', name: '?' };
                        const contrast = PlannerUtils.getContrastColor(proj.color);

                        html += `
                                <div class="absolute top-2 h-8 rounded-lg shadow-sm border border-black/5 cursor-pointer hover:brightness-110 hover:z-10 transition-all group/task overflow-hidden"
                                     style="left: ${x}px; width: ${w - 4}px; background-color: ${proj.color};"
                                     data-task-id="${task.id}"
                                     title="${task.title}">
                                     
                                     <!-- Progress Bar (Manual) -->
                                     ${task.progress ? `
                                        <div class="absolute top-0 left-0 bottom-0 bg-black/10 pointer-events-none" style="width: ${task.progress}%"></div>
                                     ` : ''}

                                     <div class="px-2 py-1.5 flex flex-col justify-center h-full relative z-10">
                                         <span class="text-[10px] font-bold leading-none truncate ${contrast}">${task.title}</span>
                                         <span class="text-[8px] font-black uppercase opacity-60 leading-none mt-0.5 truncate ${contrast}">${proj.name}</span>
                                     </div>
                                </div>
                            `;
                    });
                    return html;
                })()}

                     <!-- Time Entries (Actuals) - Rendered as small pills below tasks or overlaid? Let's do small pills at bottom of row -->
                     ${(() => {
                    let html = '';
                    row.entries.forEach(entry => {
                        if (!entry.start_time) return;
                        const s = new Date(entry.start_time);
                        const isActive = !entry.end_time;
                        const e = isActive ? new Date() : new Date(entry.end_time);

                        // Map time to X
                        // X needs to be mapped to hours too for actuals?
                        // For now, simplify: map to day, maybe offset by hour

                        const dayStart = new Date(s); dayStart.setHours(0, 0, 0, 0);
                        const dayDiff = dayStart.getTime() - startTime;
                        const dayX = (dayDiff / (24 * 60 * 60 * 1000)) * pxPerDay;

                        // Hour offset
                        const hOffset = (s.getHours() + s.getMinutes() / 60) / 24 * pxPerDay;

                        // Width based on duration
                        const durationHours = (e - s) / (1000 * 60 * 60);
                        const w = (durationHours / 24) * pxPerDay;

                        // If this entry is outside the view
                        if (dayX + hOffset + w < 0 || dayX > totalWidth) return;

                        // Visual: a thin darker line or pill
                        html += `
                                <div class="absolute bottom-1 h-2 rounded-full shadow-sm pointer-events-none z-20 ${isActive ? 'bg-primary animate-pulse' : 'bg-slate-800/80'}"
                                     style="left: ${dayX + hOffset}px; width: ${Math.max(4, w)}px;"
                                     title="${isActive ? 'Tracking Now' : 'Actual Work'}: ${PlannerUtils.formatDuration((e - s) / 1000)}">
                                </div>
                            `;
                    });
                    return html;
                })()}
                </div>
            `;
            body.appendChild(rowEl);
        });

        container.appendChild(body);
    }
};
