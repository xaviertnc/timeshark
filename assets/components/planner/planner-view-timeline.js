/**
 * assets/components/planner/planner-view-timeline.js
 * 
 * Renders the Gantt-style timeline view with 3 zoom levels.
 * Tasks are grouped into per-project lanes within each resource row.
 * A lane legend (project color + name) shows on wider screens.
 * Time entries use project colors.
 */

import { PlannerUtils } from './planner-utils.js';

const ZOOM = {
    day: {
        compact: { colWidth: 30, rowH: 36, barH: 14, barTop: 9, hoursToShow: 24 },
        regular: { colWidth: 60, rowH: 48, barH: 22, barTop: 10, hoursToShow: 12 },
        relaxed: { colWidth: 120, rowH: 64, barH: 28, barTop: 14, hoursToShow: 10 },
    },
    week: {
        compact: { colWidth: 40, rowH: 36, barH: 14, barTop: 9 },
        regular: { colWidth: 80, rowH: 48, barH: 22, barTop: 10 },
        relaxed: { colWidth: 160, rowH: 64, barH: 28, barTop: 14 },
    },
    month: {
        compact: { colWidth: 20, rowH: 36, barH: 14, barTop: 9 },
        regular: { colWidth: 40, rowH: 48, barH: 22, barTop: 10 },
        relaxed: { colWidth: 80, rowH: 64, barH: 28, barTop: 14 },
    }
};

export const PlannerTimeline = {
    render(container, data, config, today, zoom = 'regular') {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = '';

        const scaleKey = config.isDayView ? 'day' : (config.type || 'week');
        const zp = ZOOM[scaleKey]?.[zoom] || ZOOM[scaleKey]?.regular || ZOOM.week.regular;
        const showText = zoom !== 'compact';

        // Responsive resource column
        const isWide = container.offsetWidth > 900;
        const resourceWidth = isWide ? 180 : 120;
        const legendWidth = isWide ? 100 : 0; // legend only on wide screens
        const leftWidth = resourceWidth + legendWidth;

        // Calculate dimensions
        const startTime = config.startDate.getTime();
        const availableWidth = container.offsetWidth - leftWidth;

        let pxPerDay, totalWidth, totalDays;

        if (config.isDayView) {
            const hoursToShow = zp.hoursToShow;
            const pxPerHour = Math.max(40, Math.floor(availableWidth / hoursToShow));
            pxPerDay = pxPerHour * 24;
            totalWidth = pxPerDay;
            totalDays = 1;
        } else {
            totalDays = config.dates.length;
            const minPxPerDay = zp.colWidth || 100;
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

        // ───── Group tasks by project for lane allocation ─────
        const getProjectLanes = (tasks) => {
            const lanesByProject = new Map(); // project_id -> { project, tasks[] }

            tasks.filter(t => t.start_date && t.status !== 'done').forEach(task => {
                const projId = task.project_id || 'personal';
                if (!lanesByProject.has(projId)) {
                    const proj = data.projects.find(p => p.id == projId) || { id: projId, name: 'Personal', color: '#64748b' };
                    lanesByProject.set(projId, { project: proj, tasks: [] });
                }
                lanesByProject.get(projId).tasks.push(task);
            });

            return Array.from(lanesByProject.values());
        };

        // ───── Header ─────
        const header = document.createElement('div');
        header.className = 'flex sticky top-0 z-40 bg-app border-b border-white/2';
        header.style.width = `${leftWidth + totalWidth}px`;
        header.style.minWidth = `${leftWidth + totalWidth}px`;

        let headerCols = '';
        if (config.isDayView) {
            const now = new Date();
            const hourWidth = pxPerDay / 24;
            for (let h = 0; h < 24; h++) {
                const label = `${h.toString().padStart(2, '0')}`;
                const isWorkHour = h >= 8 && h <= 18;
                const isCurrentHour = now.getHours() === h && config.startDate.toDateString() === now.toDateString();

                headerCols += `
                    <div class="absolute top-0 bottom-0 border-r border-white/2 flex items-center justify-center transition-colors px-0.5"
                         style="left: ${h * hourWidth}px; width: ${hourWidth}px; background-color: ${isCurrentHour ? 'rgba(var(--color-primary), 0.1)' : isWorkHour ? 'transparent' : 'rgba(0,0,0,0.05)'}">
                         <span class="text-[9px] font-black ${isCurrentHour ? 'text-primary' : 'text-main/60'} tracking-tighter">${label}</span>
                    </div>
                `;
            }
        } else {
            headerCols = config.dates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return `
                    <div class="absolute top-0 bottom-0 border-r border-white/2 flex flex-col items-center justify-center transition-colors"
                         style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${isToday ? 'rgba(var(--color-primary), 0.1)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent'}">
                         <span class="text-[11px] font-black ${isToday ? 'text-primary' : 'text-main'} tracking-tight">${d.getDate()}</span>
                         <span class="text-[8px] font-black uppercase ${isToday ? 'text-primary' : 'text-dim/60'}">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                    </div>
                `;
            }).join('');
        }

        const headerHeight = zoom === 'compact' ? 'h-10' : 'h-14';
        header.innerHTML = `
            <div class="flex-shrink-0 p-3 font-black text-dim text-[9px] uppercase tracking-[0.2em] border-r border-white/2 bg-app sticky left-0 z-50 flex items-center" style="width: ${resourceWidth}px">
                Resource
            </div>
            ${legendWidth > 0 ? `<div class="flex-shrink-0 border-r border-white/2 bg-app sticky z-50 flex items-center px-2" style="width: ${legendWidth}px; left: ${resourceWidth}px">
                <span class="text-[8px] font-black text-dim uppercase tracking-widest opacity-40">Project</span>
            </div>` : ''}
            <div class="relative ${headerHeight}" style="width: ${totalWidth}px; min-width: ${totalWidth}px">
                ${headerCols}
            </div>
        `;
        container.appendChild(header);

        // ───── Body ─────
        const body = document.createElement('div');
        body.className = 'relative';
        body.style.width = `${leftWidth + totalWidth}px`;
        body.style.minWidth = `${leftWidth + totalWidth}px`;

        // Grid Lines
        const gridLines = document.createElement('div');
        gridLines.className = 'absolute inset-0 pointer-events-none';
        gridLines.style.left = `${leftWidth}px`;
        gridLines.style.width = `${totalWidth}px`;

        if (config.isDayView) {
            const hourWidth = pxPerDay / 24;
            gridLines.innerHTML = Array.from({ length: 24 }).map((_, h) => `
                <div class="absolute top-0 bottom-0 border-r border-white/1"
                     style="left: ${h * hourWidth}px; width: ${hourWidth}px; background-color: ${h >= 8 && h <= 18 ? 'transparent' : 'rgba(0,0,0,0.01)'}">
                </div>
            `).join('');
        } else {
            gridLines.innerHTML = config.dates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                return `
                    <div class="absolute top-0 bottom-0 border-r border-white/1"
                         style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${isToday ? 'rgba(var(--color-primary), 0.01)' : 'transparent'}">
                    </div>
                `;
            }).join('');
        }
        body.appendChild(gridLines);

        // ───── Rows ─────
        data.rows.forEach(row => {
            // Get project lanes for this resource
            const projectLanes = getProjectLanes(row.tasks);
            const laneCount = Math.max(1, projectLanes.length);
            const laneGap = 3;
            const totalBarArea = laneCount * zp.barH + (laneCount - 1) * laneGap;
            const timeEntryRowH = 14;
            const rowPaddingTop = 6;
            const rowPaddingBottom = 4;
            const dynamicRowH = Math.max(zp.rowH, rowPaddingTop + totalBarArea + timeEntryRowH + rowPaddingBottom);

            const rowEl = document.createElement('div');
            rowEl.className = `flex border-b border-white/1 hover:bg-white/[0.02] transition-all group/row relative`;
            rowEl.style.minHeight = `${dynamicRowH}px`;

            // Resource Column
            const resCompact = zoom === 'compact';

            // Lane Legend HTML (only on wide screens)
            let legendHtml = '';
            if (legendWidth > 0) {
                const legendItems = projectLanes.map((lane, i) => {
                    const topPos = rowPaddingTop + i * (zp.barH + laneGap) + (zp.barH / 2) - 5;
                    return `
                        <div class="absolute flex items-center gap-1 overflow-hidden" style="top: ${topPos}px; height: ${zp.barH}px; left: 4px; right: 4px;">
                            <span class="w-1.5 h-1.5 rounded-sm shrink-0" style="background-color: ${lane.project.color}"></span>
                            <span class="text-[7px] font-bold text-dim/50 truncate leading-none whitespace-nowrap">${lane.project.name}</span>
                        </div>
                    `;
                }).join('');
                legendHtml = `
                    <div class="flex-shrink-0 border-r border-white/2 bg-app/50 sticky z-20 relative" style="width: ${legendWidth}px; left: ${resourceWidth}px; min-height: ${dynamicRowH}px">
                        ${legendItems}
                    </div>
                `;
            }

            rowEl.innerHTML = `
                <div class="flex-shrink-0 ${resCompact ? 'px-2 py-1.5' : 'px-3 py-3'} border-r border-white/2 bg-app sticky left-0 z-30 flex items-center gap-2" style="width: ${resourceWidth}px">
                    <div class="${resCompact ? 'w-6 h-6 text-[7px]' : 'w-8 h-8 text-[9px]'} rounded-lg bg-gradient-to-br from-card to-app border border-soft shadow-inner-white flex items-center justify-center font-black text-primary shrink-0">
                        ${row.resource.substring(0, 1).toUpperCase()}${row.resource.split(' ')[1]?.substring(0, 1).toUpperCase() || row.resource.substring(1, 2).toUpperCase()}
                    </div>
                    <div class="min-w-0">
                        <span class="block ${resCompact ? 'text-[10px]' : 'text-[11px]'} font-black text-main truncate">${row.resource}</span>
                        ${resCompact ? '' : '<span class="text-[7px] font-black text-dim uppercase tracking-wider opacity-40">Member</span>'}
                    </div>
                </div>
                ${legendHtml}
                <div class="relative flex-grow" style="width: ${totalWidth}px; min-height: ${dynamicRowH}px">
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

                     <!-- Tasks grouped by project lanes -->
                     ${(() => {
                    let html = '';
                    projectLanes.forEach((lane, laneIdx) => {
                        const barTop = rowPaddingTop + laneIdx * (zp.barH + laneGap);

                        lane.tasks.forEach(task => {
                            if (!task.start_date) return;
                            const x = getX(task.start_date);
                            const w = Math.max(10, getWidth(task.start_date, task.end_date));

                            if (x + w < 0 || x > totalWidth) return;

                            const proj = lane.project;
                            const status = task.status || 'todo';

                            const tooltipText = `${task.title} • ${proj.name} • ${status.toUpperCase()} • ${PlannerUtils.formatTime(new Date(task.start_date))} - ${PlannerUtils.formatTime(new Date(task.end_date))}`;

                            const titleHtml = showText && w > 30
                                ? `<span class="block text-[8px] font-bold text-white truncate px-1.5 leading-[${zp.barH}px] pointer-events-none whitespace-nowrap overflow-hidden">${task.title}</span>`
                                : '';

                            html += `
                                <div class="task-bar absolute rounded shadow-sm border border-white/5 hover:shadow-lg hover:-translate-y-0.5 hover:z-20 transition-all group/task cursor-pointer overflow-hidden"
                                     style="left: ${x}px; width: ${w}px; height: ${zp.barH}px; top: ${barTop}px; background: ${proj.color};"
                                     data-task-id="${task.id}"
                                     title="${tooltipText}">
                                     
                                     ${task.progress ? `
                                        <div class="absolute inset-0 bg-black/15 pointer-events-none" style="width: ${task.progress}%"></div>
                                     ` : ''}

                                     ${titleHtml}
                                </div>
                            `;
                        });
                    });
                    return html;
                })()}

                     <!-- Time Entries (Actuals) — project-colored -->
                     ${(() => {
                    let html = '';
                    row.entries.forEach(entry => {
                        if (!entry.start_time) return;
                        const s = new Date(entry.start_time);
                        const isActive = !entry.end_time;
                        const e = isActive ? new Date() : new Date(entry.end_time);

                        if (e < config.startDate || s > config.endDate) return;

                        const dayX = getX(s);
                        const dayW = getWidth(s, e);
                        const renderX = Math.max(0, dayX);
                        const renderW = Math.max(4, dayW - (renderX - dayX));

                        const proj = data.projects.find(p => p.id == entry.project_id);
                        const entryColor = proj ? proj.color : null;

                        if (isActive) {
                            html += `
                                <div class="absolute h-2.5 rounded-full animate-pulse border border-white/10 backdrop-blur-sm pointer-events-none"
                                     style="left: ${renderX}px; width: ${renderW}px; bottom: ${rowPaddingBottom}px; background-color: ${entryColor || 'rgba(var(--color-primary), 0.8)'}; opacity: 0.8;">
                                </div>
                            `;
                        } else {
                            html += `
                                <div class="absolute h-2 rounded-full border border-white/5 backdrop-blur-sm pointer-events-none"
                                     style="left: ${renderX}px; width: ${renderW}px; bottom: ${rowPaddingBottom}px; ${entryColor ? `background-color: ${entryColor}; opacity: 0.45;` : 'background-color: rgba(255,255,255,0.12);'}">
                                </div>
                            `;
                        }
                    });
                    return html;
                })()}
                </div>
            `;
            body.appendChild(rowEl);
        });

        container.appendChild(body);

        // Initial Scroll for Day View
        if (config.isDayView) {
            if (container.scrollLeft < 10) {
                const hourWidth = pxPerDay / 24;
                container.scrollLeft = 6 * hourWidth;
            }
        }
    }
};
