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
        const startTime = config.startDate.getTime();
        const resourceWidth = 224; // w-56 = 14rem = 224px
        const availableWidth = container.offsetWidth - resourceWidth;

        let pxPerDay, totalWidth, totalDays;

        if (config.isDayView) {
            totalDays = 1;
            const hoursToShow = 10; // Fewer hours visible at once = wider slots
            const pxPerHour = Math.max(160, Math.floor(availableWidth / hoursToShow));
            pxPerDay = pxPerHour * 24;
            totalWidth = pxPerDay;
        } else {
            totalDays = config.dates.length;
            const minPxPerDay = config.colWidth || 150; // Widen from 60 to 150
            pxPerDay = Math.max(minPxPerDay, Math.floor(availableWidth / totalDays));
            totalWidth = totalDays * pxPerDay;
        }

        const getX = (date) => {
            const d = new Date(date);
            const diff = d.getTime() - startTime;
            const daysDiff = diff / (24 * 60 * 60 * 1000);
            return daysDiff * pxPerDay;
        };

        const getWidth = (start, end) => {
            const s = new Date(start);
            const e = new Date(end || new Date(s).setHours(s.getHours() + 1));
            const diff = e.getTime() - s.getTime();
            return (diff / (24 * 60 * 60 * 1000)) * pxPerDay;
        };

        // Header
        const header = document.createElement('div');
        header.className = 'flex sticky top-0 z-40 bg-app/80 backdrop-blur-xl border-b border-soft/50';

        let headerCols = '';
        if (config.isDayView) {
            const now = new Date();
            for (let h = 0; h < 24; h++) {
                const label = `${h.toString().padStart(2, '0')}:00`;
                const isWorkHour = h >= 8 && h <= 18;
                const isCurrentHour = now.getHours() === h && config.startDate.toDateString() === now.toDateString();

                headerCols += `
                    <div class="absolute top-0 bottom-0 border-r border-soft/30 flex items-center justify-center transition-colors"
                         style="left: ${h * (pxPerDay / 24)}px; width: ${pxPerDay / 24}px; background-color: ${isCurrentHour ? 'rgba(var(--color-primary), 0.05)' : isWorkHour ? 'transparent' : 'rgba(0,0,0,0.1)'}">
                         <span class="text-[10px] font-black ${isCurrentHour ? 'text-primary' : 'text-main'} opacity-60">${label}</span>
                    </div>
                `;
            }
        } else {
            headerCols = config.dates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return `
                    <div class="absolute top-0 bottom-0 border-r border-soft/30 flex flex-col items-center justify-center transition-colors"
                         style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${isToday ? 'rgba(var(--color-primary), 0.1)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent'}">
                         <span class="text-[11px] font-black ${isToday ? 'text-primary' : 'text-main'} tracking-tight">${d.getDate()}</span>
                         <span class="text-[8px] font-black uppercase ${isToday ? 'text-primary' : 'text-dim'} opacity-40">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                    </div>
                `;
            }).join('');
        }

        header.innerHTML = `
            <div class="w-56 flex-shrink-0 p-5 font-black text-dim text-[10px] uppercase tracking-[0.3em] border-r border-soft/30 bg-app/50 sticky left-0 z-50">
                Resource
            </div>
            <div class="relative flex-grow h-14 overflow-hidden" style="width: ${totalWidth}px">
                ${headerCols}
            </div>
        `;
        container.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'relative';

        data.rows.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'flex border-b border-soft/30 hover:bg-white/40 transition-all group/row relative';

            // Resource Column
            rowEl.innerHTML = `
                <div class="w-56 flex-shrink-0 p-4 border-r border-soft/30 bg-app/80 backdrop-blur-md sticky left-0 z-30 flex items-center gap-4">
                    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-card to-app border border-soft shadow-inner-white flex items-center justify-center text-[10px] font-black text-primary">
                        ${row.resource.substring(0, 1).toUpperCase()}${row.resource.split(' ')[1]?.substring(0, 1).toUpperCase() || row.resource.substring(1, 2).toUpperCase()}
                    </div>
                    <div class="min-w-0">
                        <span class="block text-xs font-black text-main truncate">${row.resource}</span>
                        <span class="text-[8px] font-black text-dim uppercase tracking-wider opacity-40">Member</span>
                    </div>
                </div>
                <div class="relative flex-grow h-16" style="width: ${totalWidth}px">
                     <!-- Grid Lines -->
                     ${config.isDayView ? Array.from({ length: 24 }).map((_, h) => `
                        <div class="absolute top-0 bottom-0 border-r border-dashed border-white/5 pointer-events-none"
                             style="left: ${h * (pxPerDay / 24)}px; width: ${pxPerDay / 24}px; background-color: ${h >= 8 && h <= 18 ? 'transparent' : 'rgba(0,0,0,0.01)'}">
                        </div>
                     `).join('') : config.dates.map((d, i) => `
                        <div class="absolute top-0 bottom-0 border-r border-dashed border-white/5 pointer-events-none"
                             style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${d.toDateString() === today.toDateString() ? 'rgba(var(--color-primary), 0.03)' : 'transparent'}">
                        </div>
                    `).join('')}

                     <!-- Today Indicator Line -->
                     ${(() => {
                    const dateToCheck = config.isDayView ? config.startDate : today;
                    if (dateToCheck.toDateString() !== today.toDateString()) return '';

                    const now = new Date();
                    const dailyPercent = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;

                    let left;
                    if (config.isDayView) {
                        left = dailyPercent * pxPerDay;
                    } else {
                        const todayIndex = config.dates.findIndex(d => d.toDateString() === today.toDateString());
                        if (todayIndex === -1) return '';
                        left = (todayIndex + dailyPercent) * pxPerDay;
                    }

                    return `
                            <div class="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]" style="left: ${left}px">
                                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                            </div>
                        `;
                })()}

                     <!-- Tasks (TODOs) -->
                     ${(() => {
                    let html = '';
                    row.tasks.forEach(task => {
                        if (!task.start_date) return;
                        const x = getX(task.start_date);
                        const w = Math.max(10, getWidth(task.start_date, task.end_date));

                        if (x + w < 0 || x > totalWidth) return;

                        const proj = data.projects.find(p => p.id == task.project_id) || { color: '#94a3b8', name: '?' };
                        const status = task.status || 'todo';

                        // Tooltip Text
                        const tooltipText = `${task.title} • ${status.toUpperCase()} • ${PlannerUtils.formatTime(new Date(task.start_date))} - ${PlannerUtils.formatTime(new Date(task.end_date))}`;

                        html += `
                                <div class="task-bar absolute top-2.5 h-6 rounded shadow-sm border border-white/5 hover:shadow-lg hover:-translate-y-0.5 hover:z-20 transition-all group/task cursor-pointer"
                                     style="left: ${x}px; width: ${w}px; background: ${proj.color};"
                                     data-task-id="${task.id}"
                                     title="${tooltipText}">
                                     
                                     ${task.progress ? `
                                        <div class="absolute inset-0 bg-black/10 pointer-events-none" style="width: ${task.progress}%"></div>
                                     ` : ''}

                                     <!-- Text removed for cleaner look, tooltip used instead -->
                                </div>
                            `;
                    });
                    return html;
                })()}

                     <!-- Time Entries (Actuals) -->
                     ${(() => {
                    let html = '';
                    row.entries.forEach(entry => {
                        if (!entry.start_time) return;
                        const s = new Date(entry.start_time);
                        const isActive = !entry.end_time;
                        const e = isActive ? new Date() : new Date(entry.end_time);

                        // Only show if it overlaps with our visible range
                        if (e < config.startDate || s > config.endDate) return;

                        const dayX = getX(s);
                        const dayW = getWidth(s, e);

                        // Fix: Ensure we don't render off-screen/broken widths if start time is before view
                        const renderX = Math.max(0, dayX);
                        const renderW = Math.max(4, dayW - (renderX - dayX));

                        html += `
                                <div class="absolute bottom-1.5 h-2 rounded-full ${isActive ? 'bg-primary/80 animate-pulse' : 'bg-white/20'} border border-white/5 backdrop-blur-sm pointer-events-none"
                                     style="left: ${renderX}px; width: ${renderW}px;">
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

        // Initial Scroll for Day View (Start at 05:00)
        if (config.isDayView) {
            // Check if we already scrolled? For now, force it on render if scrollLeft is roughly 0
            if (container.scrollLeft < 10) {
                const hourWidth = pxPerDay / 24;
                container.scrollLeft = 5 * hourWidth;
            }
        }
    }
};
