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
        compact: { colWidth: 30, rowH: 36, barH: 14, barTop: 9, hoursToShow: 24, fontSize: 7, spanFontSize: 8 },
        regular: { colWidth: 60, rowH: 95, barH: 27, barTop: 10, hoursToShow: 12, fontSize: 8, spanFontSize: 10 },
        relaxed: { colWidth: 120, rowH: 64, barH: 28, barTop: 14, hoursToShow: 10, fontSize: 10, spanFontSize: 11 },
    },
    week: {
        compact: { colWidth: 40, rowH: 36, barH: 14, barTop: 9, fontSize: 7, spanFontSize: 8 },
        regular: { colWidth: 80, rowH: 95, barH: 27, barTop: 10, fontSize: 8, spanFontSize: 10 },
        relaxed: { colWidth: 160, rowH: 64, barH: 28, barTop: 14, fontSize: 10, spanFontSize: 11 },
    },
    month: {
        compact: { colWidth: 20, rowH: 36, barH: 14, barTop: 9, fontSize: 7, spanFontSize: 8 },
        regular: { colWidth: 40, rowH: 95, barH: 27, barTop: 10, fontSize: 8, spanFontSize: 10 },
        relaxed: { colWidth: 80, rowH: 64, barH: 28, barTop: 14, fontSize: 10, spanFontSize: 11 },
    },
    year: {
        compact: { colWidth: 6, rowH: 36, barH: 14, barTop: 9, fontSize: 7, spanFontSize: 8 },
        regular: { colWidth: 8, rowH: 95, barH: 27, barTop: 10, fontSize: 8, spanFontSize: 10 },
        relaxed: { colWidth: 5, rowH: 96, barH: 42, barTop: 20, fontSize: 15, spanFontSize: 14 },
    }
};

export const PlannerTimeline = {
    render(container, data, config, today, zoom = 'regular', onLaneReorder = null) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = '';

        const scaleKey = config.isDayView ? 'day' : (config.type === 'year' ? 'year' : config.type || 'week');
        const zp = ZOOM[scaleKey]?.[zoom] || ZOOM[scaleKey]?.regular || ZOOM.week.regular;
        const showText = zoom !== 'compact';

        // Responsive resource column
        const isWide = container.offsetWidth > 900;
        const resourceWidth = isWide ? 140 : 90;
        const isYearRelaxed = config.type === 'year' && zoom === 'relaxed';
        const legendWidth = isWide ? (isYearRelaxed ? 210 : 140) : 0; // legend only on wide screens
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
            if (config.type === 'year') {
                // Year view: compact/regular fit to viewport, relaxed stretches wider
                if (zoom === 'relaxed') {
                    pxPerDay = Math.max(availableWidth / totalDays, 5);
                } else {
                    pxPerDay = availableWidth / totalDays;
                }
            } else {
                const minPxPerDay = zp.colWidth || 100;
                pxPerDay = Math.max(minPxPerDay, Math.floor(availableWidth / totalDays));
            }
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
        const nowDate = new Date();
        const todayMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
        const tomorrowMidnight = new Date(todayMidnight); tomorrowMidnight.setDate(todayMidnight.getDate() + 1);

        const isCompletedToday = (t) => {
            if (t.status !== 'done') return false;
            const completedDate = t.completed_at || t.start_date;
            if (!completedDate) return false;
            const cd = new Date(completedDate);
            return cd >= todayMidnight && cd < tomorrowMidnight;
        };

        const getProjectLanes = (tasks) => {
            const lanesByProject = new Map(); // project_id -> { project, tasks[] }

            tasks.filter(t => {
                if (!t.start_date) return false;
                if (t.status !== 'done') return true;
                return isCompletedToday(t);
            }).forEach(task => {
                const projId = task.project_id || 'personal';
                if (!lanesByProject.has(projId)) {
                    const proj = data.projects.find(p => p.id == projId) || { id: projId, name: 'Personal', color: '#64748b' };
                    lanesByProject.set(projId, { project: proj, tasks: [] });
                }
                lanesByProject.get(projId).tasks.push(task);
            });

            // Sort lanes by project lane_order (lower = higher in timeline)
            return Array.from(lanesByProject.values()).sort((a, b) => {
                const orderA = a.project.lane_order ?? 999;
                const orderB = b.project.lane_order ?? 999;
                return orderA - orderB;
            });
        };

        // ───── Compute project-level progress for span tasks ─────
        const getProjectProgress = (projectId) => {
            // First: use the project's own progress field (authoritative source)
            const proj = data.projects.find(p => p.id == projectId);
            if (proj && proj.progress !== undefined && proj.progress !== null) {
                return parseInt(proj.progress) || 0;
            }
            // Fallback: compute average from non-span tasks
            const allTasks = data.rows.flatMap(r => r.tasks);
            const projectTasks = allTasks.filter(t =>
                (t.project_id || 'personal') == projectId &&
                t.task_type !== 'project_span'
            );
            if (projectTasks.length === 0) return 0;
            const total = projectTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
            return Math.round(total / projectTasks.length);
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
        } else if (config.type === 'year') {
            // Year view: one column per month
            let monthOffset = 0;
            const thisMonth = today.getMonth();
            const thisYear = config.startDate.getFullYear();
            const isCurrentYear = thisYear === today.getFullYear();
            headerCols = config.groups.map(g => {
                const monthWidth = g.count * pxPerDay;
                const isCurrent = isCurrentYear && g.month === thisMonth;
                const col = `
                    <div class="absolute top-0 bottom-0 border-r border-white/3 flex flex-col items-center justify-center transition-colors"
                         style="left: ${monthOffset}px; width: ${monthWidth}px; background-color: ${isCurrent ? 'rgba(var(--color-primary), 0.1)' : 'transparent'}">
                         <span class="text-[10px] font-black ${isCurrent ? 'text-primary' : 'text-main'} tracking-wider">${g.label}</span>
                    </div>
                `;
                monthOffset += monthWidth;
                return col;
            }).join('');
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
                <span class="text-[9px] font-black text-dim uppercase tracking-[0.2em]">Project</span>
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
                <div class="absolute top-0 bottom-0"
                     style="left: ${h * hourWidth}px; width: ${hourWidth}px; border-right: 1px solid #222; background-color: ${h >= 8 && h <= 18 ? 'transparent' : 'rgba(0,0,0,0.01)'}">
                </div>
            `).join('');
        } else if (config.type === 'year') {
            // Year view: grid lines per month boundary only
            let monthOffset = 0;
            const thisMonth = today.getMonth();
            const isCurrentYear = config.startDate.getFullYear() === today.getFullYear();
            gridLines.innerHTML = config.groups.map(g => {
                const monthWidth = g.count * pxPerDay;
                const isCurrent = isCurrentYear && g.month === thisMonth;
                const col = `
                    <div class="absolute top-0 bottom-0"
                         style="left: ${monthOffset}px; width: ${monthWidth}px; border-right: 1px solid #222; background-color: ${isCurrent ? 'rgba(var(--color-primary), 0.02)' : 'transparent'}">
                    </div>
                `;
                monthOffset += monthWidth;
                return col;
            }).join('');
        } else {
            gridLines.innerHTML = config.dates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                return `
                    <div class="absolute top-0 bottom-0"
                         style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; border-right: 1px solid #222; background-color: ${isToday ? 'rgba(var(--color-primary), 0.01)' : 'transparent'}">
                    </div>
                `;
            }).join('');
        }
        body.appendChild(gridLines);

        // ───── Today Indicator Line (vertical line marking today) ─────
        if (today >= config.startDate && today <= config.endDate) {
            const todayX = getX(today);
            const todayLine = document.createElement('div');
            todayLine.className = 'absolute top-0 bottom-0 z-30 pointer-events-none';
            todayLine.style.left = `${leftWidth + todayX}px`;
            todayLine.style.width = '2px';
            todayLine.style.background = 'rgba(var(--color-primary), 0.6)';
            todayLine.style.boxShadow = '0 0 8px rgba(var(--color-primary), 0.3)';
            body.appendChild(todayLine);
        }

        // ───── Rows ─────
        data.rows.forEach(row => {
            // Get project lanes for this resource
            const projectLanes = getProjectLanes(row.tasks);
            const laneCount = Math.max(1, projectLanes.length);
            const laneGap = zoom === 'regular' ? 10 : zoom === 'relaxed' ? 12 : 3;
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
                    const topPos = rowPaddingTop + i * (zp.barH + laneGap);
                    return `
                        <div class="lane-legend-item absolute flex items-center gap-0.5 overflow-hidden cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors group/lane" data-project-id="${lane.project.id}" data-lane-index="${i}" style="top: ${topPos}px; height: ${zp.barH}px; left: 2px; right: 2px; padding: 0 2px;">
                            <span class="text-[8px] text-dim opacity-20 group-hover/lane:opacity-60 transition-opacity shrink-0 leading-none select-none pointer-events-none" style="letter-spacing: -1px;">⠿</span>
                            <span class="${isYearRelaxed ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'} rounded-sm shrink-0 pointer-events-none" style="background-color: ${lane.project.color}"></span>
                            <span class="${isYearRelaxed ? 'text-[16px]' : 'text-[11px]'} font-bold text-dim opacity-50 truncate leading-none whitespace-nowrap pointer-events-none">${lane.project.name}</span>
                        </div>
                    `;
                }).join('');
                legendHtml = `
                    <div class="lane-legend-col flex-shrink-0 border-r border-white/2 bg-app sticky z-20 relative" style="width: ${legendWidth}px; left: ${resourceWidth}px; min-height: ${dynamicRowH}px">
                        ${legendItems}
                    </div>
                `;
            }

            rowEl.innerHTML = `
                <div class="flex-shrink-0 ${resCompact ? 'px-2 py-1.5' : 'px-3 py-3'} border-r border-white/2 bg-app sticky left-0 z-30 flex flex-col items-center justify-center gap-1 text-center" style="width: ${resourceWidth}px">
                    <div class="${resCompact ? 'w-6 h-6 text-[11px]' : 'w-9 h-9 text-[14px]'} rounded-lg bg-gradient-to-br from-card to-app border border-soft shadow-inner-white flex items-center justify-center font-black text-primary shrink-0">
                        ${row.resource.substring(0, 1).toUpperCase()}${row.resource.split(' ')[1]?.substring(0, 1).toUpperCase() || row.resource.substring(1, 2).toUpperCase()}
                    </div>
                    <span class="block ${resCompact ? 'text-[11px]' : 'text-[13px]'} font-black text-main truncate max-w-full">${row.resource}</span>
                    ${resCompact ? '' : '<span class="text-[9px] font-black text-dim uppercase tracking-wider opacity-40">Member</span>'}
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
                            <div class="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]" style="left: ${left}px">
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

                            // Year view: skip short tasks (< 3 days), only show spans and long tasks
                            const isSpanEarly = task.task_type === 'project_span';
                            if (config.type === 'year' && !isSpanEarly) {
                                const taskDays = task.end_date
                                    ? (new Date(task.end_date) - new Date(task.start_date)) / (24 * 60 * 60 * 1000)
                                    : 0;
                                if (taskDays < 3) return; // too small to render at year scale
                            }

                            const x = getX(task.start_date);
                            const w = Math.max(10, getWidth(task.start_date, task.end_date));

                            if (x + w < 0 || x > totalWidth) return;

                            // Clamp bar to visible timeline area
                            const renderX = Math.max(0, x);
                            const renderW = Math.max(10, Math.min(totalWidth - renderX, w - (renderX - x)));

                            const proj = lane.project;
                            const status = task.status || 'todo';
                            const isSpan = task.task_type === 'project_span';

                            const tooltipText = `${task.title} • ${proj.name} • ${status.toUpperCase()} • ${PlannerUtils.formatTime(new Date(task.start_date))} - ${PlannerUtils.formatTime(new Date(task.end_date))}`;

                            if (isSpan) {
                                // Project Span: flat bar 30% taller, centered in lane
                                const spanH = Math.max(zp.barH * 0.67, zp.spanFontSize + 6);
                                const spanTop = barTop + (zp.barH - spanH) / 2;
                                // Compute progress from project's tasks
                                const projProgress = getProjectProgress(task.project_id || 'personal');
                                const spanTitle = showText && renderW > 50
                                    ? `<span class="flex items-center justify-center gap-2 px-2 pointer-events-none whitespace-nowrap overflow-hidden" style="height:100%;line-height:${spanH}px"><span class="text-[${zp.spanFontSize}px] font-black text-white/90 truncate" style="line-height:${spanH}px">${task.title}</span><span class="text-[${Math.max(7, zp.spanFontSize - 1)}px] font-black bg-white/20 text-white/80 rounded px-1 py-px leading-none shrink-0">${projProgress}%</span></span>`
                                    : '';
                                html += `
                                    <div class="task-bar absolute rounded-sm hover:shadow-lg hover:z-20 transition-all cursor-pointer overflow-hidden"
                                         style="left: ${renderX}px; width: ${renderW}px; height: ${spanH}px; top: ${spanTop}px; background: linear-gradient(90deg, ${proj.color} ${projProgress}%, ${proj.color}44 ${projProgress}%); border: 2px solid ${proj.color};"
                                         data-task-id="${task.id}"
                                         title="${tooltipText} • ${projProgress}% complete">
                                         ${spanTitle}
                                    </div>
                                `;
                            } else {
                                // Normal task bar
                                const titleHtml = showText && renderW > 30
                                    ? `<span class="block text-[${zp.fontSize}px] font-bold text-white truncate px-1.5 leading-[${zp.barH}px] pointer-events-none whitespace-nowrap overflow-hidden">${task.title}</span>`
                                    : '';

                                // Progress overlay (skip for continuous projects)
                                const progressHtml = (!proj.continuous && task.progress) ? `
                                    <div class="absolute inset-0 bg-black/15 pointer-events-none" style="width: ${task.progress}%"></div>
                                ` : '';

                                const isDone = status === 'done';

                                // Hatched overlay for done tasks
                                const doneOverlay = isDone ? `
                                    <div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(0,0,0,0.25) 3px, rgba(0,0,0,0.25) 5px);"></div>
                                ` : '';

                                html += `
                                    <div class="task-bar absolute rounded shadow-sm border border-white/5 hover:shadow-lg hover:-translate-y-0.5 hover:z-20 transition-all group/task cursor-pointer overflow-hidden"
                                         style="left: ${renderX}px; width: ${renderW}px; height: ${zp.barH}px; top: ${barTop}px; background: ${proj.color}; ${isDone ? 'opacity: 0.45;' : ''}"
                                         data-task-id="${task.id}"
                                         title="${tooltipText}">
                                         ${progressHtml}
                                         ${doneOverlay}
                                         ${titleHtml}
                                    </div>
                                `;
                            }
                        });
                    });
                    return html;
                })()}

                     <!-- Time Entries (Actuals) — skip in year view -->
                     ${(() => {
                    if (config.type === 'year') return ''; // Too many tiny rects at year scale
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

        // ───── Custom mouse-based lane reordering (HTML5 DnD broken with sticky positioning) ─────
        if (onLaneReorder && legendWidth > 0) {
            // Clean up previous document-level listeners if any
            if (window._laneDragAbort) window._laneDragAbort.abort();
            const ac = new AbortController();
            window._laneDragAbort = ac;

            // Inject styles
            if (!document.getElementById('lane-drag-styles')) {
                const style = document.createElement('style');
                style.id = 'lane-drag-styles';
                style.textContent = `
                    .lane-legend-item.drag-over-top { box-shadow: 0 -2px 0 0 var(--primary), 0 -4px 8px -2px var(--primary); }
                    .lane-legend-item.drag-over-bottom { box-shadow: 0 2px 0 0 var(--primary), 0 4px 8px -2px var(--primary); }
                    .lane-legend-item.lane-dragging { opacity: 0.3; }
                `;
                document.head.appendChild(style);
            }

            let dragState = null;

            // Attach mousedown directly to each legend item (avoids any delegation issues)
            container.querySelectorAll('.lane-legend-item').forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    e.stopPropagation(); // Don't let the container scroll
                    console.log('[LaneDrag] mousedown on', item.dataset.projectId);
                    dragState = {
                        projectId: item.dataset.projectId,
                        el: item,
                        startX: e.clientX,
                        startY: e.clientY,
                        started: false
                    };
                });
            });

            document.addEventListener('mousemove', (e) => {
                if (!dragState) return;

                // Start drag after 3px movement threshold
                if (!dragState.started) {
                    const dx = e.clientX - dragState.startX;
                    const dy = e.clientY - dragState.startY;
                    if (Math.abs(dx) + Math.abs(dy) < 3) return;
                    dragState.started = true;
                    dragState.el.classList.add('lane-dragging');
                    document.body.style.cursor = 'grabbing';
                    console.log('[LaneDrag] drag started for', dragState.projectId);
                }

                // Find which legend item is under the cursor using visual hit-testing
                const els = document.elementsFromPoint(e.clientX, e.clientY);
                const target = els.find(el => el.classList?.contains('lane-legend-item') && el !== dragState.el) || null;

                // Clear old highlights
                container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
                    if (el !== target) el.classList.remove('drag-over-top', 'drag-over-bottom');
                });

                if (!target) return;

                console.log('[LaneDrag] hovering over', target.dataset.projectId);
                const rect = target.getBoundingClientRect();
                const isTop = e.clientY < rect.top + rect.height / 2;
                if (isTop) {
                    target.classList.remove('drag-over-bottom');
                    target.classList.add('drag-over-top');
                } else {
                    target.classList.remove('drag-over-top');
                    target.classList.add('drag-over-bottom');
                }
            }, { signal: ac.signal });

            document.addEventListener('mouseup', (e) => {
                if (!dragState) return;
                const { projectId, started } = dragState;
                dragState = null;
                document.body.style.cursor = '';

                if (!started) {
                    console.log('[LaneDrag] mouseup without drag start (click)');
                    return;
                }

                console.log('[LaneDrag] mouseup - looking for drop target');
                // Find drop target
                const els = document.elementsFromPoint(e.clientX, e.clientY);
                console.log('[LaneDrag] elements at point:', els.map(el => el.className?.substring(0, 40)));
                const target = els.find(el => el.classList?.contains('lane-legend-item')) || null;

                // Cleanup
                container.querySelectorAll('.lane-dragging, .drag-over-top, .drag-over-bottom').forEach(el => {
                    el.classList.remove('lane-dragging', 'drag-over-top', 'drag-over-bottom');
                });

                if (!target || target.dataset.projectId === projectId) {
                    console.log('[LaneDrag] no valid target, cancelled');
                    return;
                }

                console.log('[LaneDrag] dropping on', target.dataset.projectId);
                // Get canonical order from first legend column
                const firstCol = container.querySelector('.lane-legend-col');
                if (!firstCol) return;
                const items = [...firstCol.querySelectorAll('.lane-legend-item')];
                const projectIds = items.map(el => el.dataset.projectId);

                const rect = target.getBoundingClientRect();
                const isBottom = e.clientY > rect.top + rect.height / 2;

                const dragIdx = projectIds.indexOf(projectId);
                let dropIdx = projectIds.indexOf(target.dataset.projectId);
                if (dragIdx === -1 || dropIdx === -1) return;

                if (isBottom) dropIdx++;
                if (dragIdx < dropIdx) dropIdx--;
                if (dragIdx === dropIdx) return;

                // Just tell the backend which project moved and where
                console.log('[LaneDrag] moving', projectId, 'to position', dropIdx + 1);
                onLaneReorder({ id: projectId, lane_order: dropIdx + 1 });
            }, { signal: ac.signal });
        }

        // Initial Scroll for Day View
        if (config.isDayView) {
            if (container.scrollLeft < 10) {
                const hourWidth = pxPerDay / 24;
                container.scrollLeft = 6 * hourWidth;
            }
        }
    }
};
