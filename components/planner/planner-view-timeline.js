/**
 * components/planner/planner-view-timeline.js
 * 
 * Renders the Gantt-style timeline view with 3 zoom levels.
 * Rebuilt using a flattened Tree Row structure.
 */

import { PlannerUtils } from './planner-utils.js';

const ZOOM = {
    day: {
        compact: { colWidth: 20, rowH: 26, barH: 14, hoursToShow: 24, fontSize: 8, spanFontSize: 10 },
        regular: { colWidth: 20, rowH: 28, barH: 18, hoursToShow: 24, fontSize: 9, spanFontSize: 11 },
        relaxed: { colWidth: 120, rowH: 36, barH: 24, hoursToShow: 12, fontSize: 10, spanFontSize: 12 },
    },
    week: {
        compact: { colWidth: 30, rowH: 26, barH: 14, colsInView: 9, fontSize: 8, spanFontSize: 10 },
        regular: { colWidth: 80, rowH: 28, barH: 18, colsInView: 7, fontSize: 9, spanFontSize: 11 },
        relaxed: { colWidth: 120, rowH: 36, barH: 24, colsInView: 5, fontSize: 10, spanFontSize: 12 },
    },
    month: {
        compact: { colWidth: 20, rowH: 26, barH: 14, colsInView: 31, fontSize: 8, spanFontSize: 10 },
        regular: { colWidth: 40, rowH: 28, barH: 18, colsInView: 0, fontSize: 9, spanFontSize: 11 },
        relaxed: { colWidth: 80, rowH: 36, barH: 24, colsInView: 0, fontSize: 10, spanFontSize: 12 },
    },
    year: {
        compact: { colWidth: 6, rowH: 26, barH: 14, fontSize: 8, spanFontSize: 10 },
        regular: { colWidth: 12, rowH: 28, barH: 18, fontSize: 9, spanFontSize: 11 },
        relaxed: { colWidth: 24, rowH: 36, barH: 24, fontSize: 10, spanFontSize: 12 },
    }
};

export const PlannerTimeline = {
    render(container, data, config, today, zoom = 'regular', onLaneReorder = null, options = {}) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;
        
        window.TimesharkProjectCollapsed = window.TimesharkProjectCollapsed || new Set();
        window.TimesharkEpicCollapsed = window.TimesharkEpicCollapsed || new Set();
        window.TimesharkResourceCollapsed = window.TimesharkResourceCollapsed || new Set();
        window.TimesharkGanttHidden = window.TimesharkGanttHidden || new Set();

        container.innerHTML = '';

        const scaleKey = config.isDayView ? 'day' : (config.type === 'year' ? 'year' : config.type || 'week');
        const zp = ZOOM[scaleKey]?.[zoom] || ZOOM[scaleKey]?.regular || ZOOM.week.regular;
        const showText = zoom !== 'compact';

        // Static Tree View left width
        const leftWidth = 320;

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
                if (zoom === 'relaxed') {
                    pxPerDay = Math.max(availableWidth / totalDays, 5);
                } else {
                    pxPerDay = availableWidth / totalDays;
                }
            } else {
                const minPxPerDay = zp.colWidth || 100;
                if (zp.colsInView && zp.colsInView > 0) {
                    pxPerDay = Math.max(minPxPerDay, Math.floor(availableWidth / zp.colsInView));
                } else {
                    pxPerDay = Math.max(minPxPerDay, Math.floor(availableWidth / totalDays));
                }
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

        // ───── Group tasks & build flattened rows ─────
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

        const getProjectProgress = (projectId) => {
            const proj = data.projects.find(p => p.id == projectId);
            if (proj && proj.progress !== undefined && proj.progress !== null) {
                return parseInt(proj.progress) || 0;
            }
            const allTasks = data.rows.flatMap(r => r.tasks);
            const projectTasks = allTasks.filter(t => (t.project_id || 'personal') == projectId);
            if (projectTasks.length === 0) return 0;
            const total = projectTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
            return Math.round(total / projectTasks.length);
        };

        const flattenedRows = [];

        data.rows.forEach(row => {
            // Collect projects for this resource
            const tasksByProject = new Map();
            
            // Helper to prevent invalid projects spawning multiple "Personal" rows
            const getValidProjId = (pid) => {
                if (!pid) return 'unassigned';
                const exists = data.projects.some(p => p.id == pid);
                return exists ? pid : 'unassigned';
            };

            row.tasks.filter(t => {
                if (!t.start_date) return false;
                if (t.status !== 'done') return true;
                return isCompletedToday(t);
            }).forEach(task => { 
                const projId = getValidProjId(task.project_id);
                if (!tasksByProject.has(projId)) tasksByProject.set(projId, []);
                tasksByProject.get(projId).push(task);
            });

            const entriesByProject = new Map();
            row.entries.forEach(e => {
                const pid = getValidProjId(e.project_id);
                if (!entriesByProject.has(pid)) entriesByProject.set(pid, []);
                entriesByProject.get(pid).push(e);
            });

            const allProjectIds = new Set([...tasksByProject.keys(), ...entriesByProject.keys()]);
            if (allProjectIds.size === 0) return; // Completely empty resource row

            // Sort projects: chronologically by earliest activity
            const rawProjectArr = Array.from(allProjectIds).map(pid => {
                return data.projects.find(p => p.id == pid) || { id: pid, name: 'Unassigned', color: '#475569', parent_id: null };
            });

            const getEarliest = (pid) => {
                const pTasks = tasksByProject.get(pid) || [];
                const pEntries = entriesByProject.get(pid) || [];
                let e = Infinity;
                pTasks.forEach(t => { if(t.start_date) { const d = new Date(t.start_date).getTime(); if(d < e) e = d; }});
                pEntries.forEach(en => { if(en.start_time) { const d = new Date(en.start_time).getTime(); if(d < e) e = d; }});
                return e;
            };
            rawProjectArr.sort((a, b) => {
                const aUnassigned = a.name === 'Unassigned';
                const bUnassigned = b.name === 'Unassigned';
                if (aUnassigned && !bUnassigned) return 1;
                if (!aUnassigned && bUnassigned) return -1;

                const aOps = a.type === 'OPS' || a.category === 'OPS' || (a.name && typeof a.name === 'string' && a.name.toUpperCase().includes('OPS'));
                const bOps = b.type === 'OPS' || b.category === 'OPS' || (b.name && typeof b.name === 'string' && b.name.toUpperCase().includes('OPS'));
                if (aOps && !bOps) return 1;
                if (!aOps && bOps) return -1;

                return getEarliest(a.id) - getEarliest(b.id);
            });

            // Group by Epic
            const epicsMap = new Map(); // epicId -> list of projects
            const standaloneProjects = [];

            rawProjectArr.forEach(proj => {
                if (proj.type === 'epic') {
                    if (!epicsMap.has(proj.id)) epicsMap.set(proj.id, { epic: proj, projList: [] });
                    // Provide the epic itself a standard project row strictly under its own header to hold direct tasks
                    epicsMap.get(proj.id).projList.unshift(proj);
                } else if (proj.parent_id) {
                    const epic = data.projects.find(p => p.id == proj.parent_id && p.type === 'epic');
                    if (epic) {
                        if (!epicsMap.has(epic.id)) epicsMap.set(epic.id, { epic: epic, projList: [] });
                        epicsMap.get(epic.id).projList.push(proj);
                    } else standaloneProjects.push(proj);
                } else standaloneProjects.push(proj);
            });

            // Build rows for this resource temporarily
            const resourceRows = [];

            const checkIsOps = (p) => (p.type && p.type.toLowerCase() === 'ops') || (p.category && p.category.toLowerCase() === 'ops') || (typeof p.name === 'string' && p.name.toUpperCase().includes('OPS'));

            // Helper to push project with Epic context
            const pushProjectGroup = (proj, isEpicChild = false, epicId = null, targetArray) => {
                if (options.showOps === false && checkIsOps(proj)) return 0;

                let tasks = tasksByProject.get(proj.id) || [];
                let entries = entriesByProject.get(proj.id) || [];

                // Hide tasks and entries that don't overlap with the current visible time frame
                const cStart = config.startDate.getTime();
                const cEnd = config.endDate.getTime();
                tasks = tasks.filter(t => {
                    const tStart = new Date(t.start_date).getTime();
                    const tEnd = t.end_date ? new Date(t.end_date).getTime() : tStart + (30 * 60 * 1000);
                    return (tStart < cEnd && tEnd > cStart);
                });
                
                const validEntries = entries.filter(e => {
                    const eStart = new Date(e.start_time).getTime();
                    const eEnd = e.end_time ? new Date(e.end_time).getTime() : eStart + (30 * 60 * 1000);
                    return (eStart < cEnd && eEnd > cStart);
                });
                if (tasks.length === 0 && validEntries.length === 0) return 0;

                tasks.sort((a,b) => new Date(a.start_date) - new Date(b.start_date));

                targetArray.push({
                    type: 'project',
                    project: proj,
                    entries: entries,
                    tasks: tasks,
                    resource: row.resource,
                    isEpicChild: isEpicChild,
                    epicId: epicId
                });
                
                let count = 1;

                tasks.forEach(task => {
                    if (config.type === 'year') {
                        const taskDays = task.end_date ? (new Date(task.end_date) - new Date(task.start_date)) / (24 * 60 * 60 * 1000) : 0;
                        if (taskDays < 3) return;
                    }
                    if (options.showTasks !== false) {
                        targetArray.push({
                            type: 'task',
                            task: task,
                            project: proj,
                            resource: row.resource,
                            isEpicChild: isEpicChild,
                            epicId: epicId
                        });
                        count++;
                    }
                });
                
                return count;
            };

            // 2. Add Epics and their projects
            Array.from(epicsMap.values()).forEach(group => {
                if (options.showOps === false && checkIsOps(group.epic)) return;
                
                const epicProjectRows = [];
                let hasChildren = false;
                const isEpicChildFlag = options.showEpics !== false;
                group.projList.forEach(p => {
                    if (pushProjectGroup(p, isEpicChildFlag, group.epic.id, epicProjectRows) > 0) hasChildren = true;
                });
                
                if (hasChildren) {
                    const epicTasks = group.projList.flatMap(p => tasksByProject.get(p.id) || []);
                    const epicEntries = group.projList.flatMap(p => entriesByProject.get(p.id) || []);
                    if (options.showEpics !== false) {
                        resourceRows.push({ type: 'epic', epic: group.epic, resource: row.resource, tasks: epicTasks, entries: epicEntries });
                    }
                    resourceRows.push(...epicProjectRows);
                }
            });

            // 3. Add standalone projects
            standaloneProjects.forEach(p => pushProjectGroup(p, false, null, resourceRows));
            
            // 4. If resource actually generated any child rows, include it
            if (resourceRows.length > 0) {
                flattenedRows.push({ type: 'resource', resource: row.resource });
                flattenedRows.push(...resourceRows);
            }
        });

        // ───── Header ─────
        const header = document.createElement('div');
        header.className = 'flex sticky top-0 z-40 bg-app border-b border-white/5';
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
                    <div class="absolute top-0 bottom-0 border-r border-black/5 dark:border-white/5 flex items-center justify-center transition-colors px-0.5"
                         style="left: ${h * hourWidth}px; width: ${hourWidth}px; background-color: ${isCurrentHour ? 'rgba(var(--color-primary), 0.1)' : isWorkHour ? 'transparent' : 'rgba(0,0,0,0.05)'}">
                         <span class="text-[9px] font-black ${isCurrentHour ? 'text-primary' : 'text-main/60'} tracking-tighter">${label}</span>
                    </div>
                `;
            }
        } else if (config.type === 'year') {
            let monthOffset = 0;
            const thisMonth = today.getMonth();
            const thisYear = config.startDate.getFullYear();
            const isCurrentYear = thisYear === today.getFullYear();
            headerCols = config.groups.map(g => {
                const monthWidth = g.count * pxPerDay;
                const isCurrent = isCurrentYear && g.month === thisMonth;
                const col = `
                    <div class="absolute top-0 bottom-0 border-r border-black/5 dark:border-white/5 flex flex-col items-center justify-center transition-colors"
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
                    <div class="absolute top-0 bottom-0 border-r border-black/5 dark:border-white/5 flex flex-col items-center justify-center transition-colors"
                         style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${isToday ? 'rgba(var(--color-primary), 0.1)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'transparent'}">
                         <span class="text-[11px] font-black ${isToday ? 'text-primary' : 'text-main'} tracking-tight">${d.getDate()}</span>
                         <span class="text-[8px] font-black uppercase ${isToday ? 'text-primary' : 'text-dim/60'}">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                    </div>
                `;
            }).join('');
        }

        const headerHeight = zoom === 'compact' ? 'h-10' : 'h-14';
        header.innerHTML = `
            <div class="flex-shrink-0 px-4 flex items-center justify-between font-black text-dim text-[10px] uppercase tracking-[0.2em] border-r border-white/5 bg-app sticky left-0 z-[60]" style="width: ${leftWidth}px">
                <span>PLANNING TREE</span>
                <div class="flex items-center gap-1">
                    <button class="collapse-all-btn p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-dim/60 hover:text-black dark:hover:text-white transition-colors" title="Collapse All">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 15l-7-7-7 7"></path></svg>
                    </button>
                    <button class="expand-all-btn p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-dim/60 hover:text-black dark:hover:text-white transition-colors" title="Expand All">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
            <div class="relative ${headerHeight}" style="width: ${totalWidth}px; min-width: ${totalWidth}px">
                ${headerCols}
            </div>
        `;
        container.appendChild(header);

        // ───── Body ─────
        const body = document.createElement('div');
        body.className = 'relative flex flex-col min-h-0';
        body.style.width = `${leftWidth + totalWidth}px`;
        body.style.minWidth = `${leftWidth + totalWidth}px`;

        // Background Grid (Behind all rows)
        const gridLines = document.createElement('div');
        gridLines.className = 'absolute inset-0 pointer-events-none z-0';
        gridLines.style.left = `${leftWidth}px`;
        gridLines.style.width = `${totalWidth}px`;

        if (config.isDayView) {
            const hourWidth = pxPerDay / 24;
            gridLines.innerHTML = Array.from({ length: 24 }).map((_, h) => `
                <div class="absolute top-0 bottom-0 border-r border-black/5 dark:border-white/5" style="left: ${h * hourWidth}px; width: ${hourWidth}px; background-color: ${h >= 8 && h <= 18 ? 'transparent' : 'rgba(0,0,0,0.01)'}"></div>
            `).join('');
        } else if (config.type === 'year') {
            let monthOffset = 0;
            const thisMonth = today.getMonth();
            const isCurrentYear = config.startDate.getFullYear() === today.getFullYear();
            gridLines.innerHTML = config.groups.map(g => {
                const monthWidth = g.count * pxPerDay;
                const isCurrent = isCurrentYear && g.month === thisMonth;
                const col = `<div class="absolute top-0 bottom-0 border-r border-black/5 dark:border-white/5" style="left: ${monthOffset}px; width: ${monthWidth}px; background-color: ${isCurrent ? 'rgba(var(--color-primary), 0.02)' : 'transparent'}"></div>`;
                monthOffset += monthWidth;
                return col;
            }).join('');
        } else {
            gridLines.innerHTML = config.dates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                return `<div class="absolute top-0 bottom-0 border-r border-black/5 dark:border-white/5" style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${isToday ? 'rgba(var(--color-primary), 0.01)' : 'transparent'}"></div>`;
            }).join('');
        }
        body.appendChild(gridLines);

        // Add today line to a container that overlays both header and body.
        // Wait, body and header are separate elements. It's easiest to add the line to body, and the dot to header.
        if (today >= config.startDate && today <= config.endDate) {
            const todayX = getX(today);
            let todayLeft = 0;
            if (config.isDayView) {
                const now = new Date();
                const dailyPercent = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
                todayLeft = dailyPercent * pxPerDay;
            } else {
                const now = new Date();
                const dailyPercent = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
                const todayIndex = config.dates.findIndex(d => d.toDateString() === today.toDateString());
                if(todayIndex !== -1) todayLeft = (todayIndex + dailyPercent) * pxPerDay;
            }

            if(todayLeft > 0) {
                // Add the red dot to the header
                const headerDot = document.createElement('div');
                headerDot.className = 'absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] z-50 pointer-events-none';
                headerDot.style.left = `${leftWidth + todayLeft}px`;
                header.appendChild(headerDot);

                // Add the line to the body
                const todayLine = document.createElement('div');
                todayLine.className = 'absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]';
                todayLine.style.left = `${leftWidth + todayLeft}px`;
                body.appendChild(todayLine);
            }
        }

        // ───── Render the Flattened Rows ─────
        flattenedRows.forEach(row => {
            const isResourceCollapsed = window.TimesharkResourceCollapsed.has(row.resource);
            if (row.type !== 'resource' && isResourceCollapsed) return;

            if (row.epicId && window.TimesharkEpicCollapsed.has(String(row.epicId))) return;
            if (row.type === 'task' && window.TimesharkProjectCollapsed.has(String(row.project.id))) return;


            const rowEl = document.createElement('div');
            // Base class for all rows
            rowEl.className = 'flex hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group relative w-full';
            rowEl.style.height = `${zp.rowH}px`;
            
            // ... (rest uses the existing logic until Assemble row)
            let typePrefix = '';
            let rowIdStr = '';
            if (row.type === 'resource') { typePrefix = 'res_'; rowIdStr = row.resource; }
            else if (row.type === 'epic') { typePrefix = 'epic_'; rowIdStr = row.epic.id; }
            else if (row.type === 'project') { typePrefix = 'proj_'; rowIdStr = row.project.id; }
            else if (row.type === 'task') { typePrefix = 'task_'; rowIdStr = row.task.id; }
            
            const fullRowId = typePrefix + rowIdStr;
            const isSelfHidden = window.TimesharkGanttHidden.has(fullRowId);
            const isGanttHidden = window.TimesharkGanttHidden.has('res_' + row.resource) ||
                (row.epicId && window.TimesharkGanttHidden.has('epic_' + row.epicId)) ||
                (row.type === 'epic' && window.TimesharkGanttHidden.has('epic_' + row.epic.id)) ||
                (row.project && window.TimesharkGanttHidden.has('proj_' + row.project.id)) ||
                isSelfHidden;

            let leftHtml = '';
            // Gantt View Column (Right)
            let rightHtml = '';

            const renderBar = (task, proj) => {
                const x = getX(task.start_date);
                const w = Math.max(10, getWidth(task.start_date, task.end_date));
                if (x + w < 0 || x > totalWidth) return '';

                const renderX = Math.max(0, x);
                const renderW = Math.max(10, Math.min(totalWidth - renderX, w - (renderX - x)));
                const status = task.status || 'todo';
                const isDone = status === 'done';

                const tags = task.tags ? (Array.isArray(task.tags) ? task.tags : task.tags.split(',').filter(Boolean)) : [];
                const tagLabels = tags.length > 0 ? ` [${tags.join(', ')}] ` : '';
                const tooltipText = `${task.title}${tagLabels} • ${proj.name} • ${status.toUpperCase()} • ${PlannerUtils.formatTime(new Date(task.start_date))} - ${PlannerUtils.formatTime(new Date(task.end_date))}`;

                const barTop = (zp.rowH - zp.barH) / 2;
                const taskProgress = task.progress || 0;
                const progressHtml = (!proj.continuous && taskProgress) ? `
                    <div class="absolute inset-y-0 left-0 pointer-events-none transition-all rounded-l" style="width: ${taskProgress}%; background-color: var(--item-color); opacity: 0.45;"></div>
                ` : '';
                const doneOverlay = isDone ? `
                    <div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 5px); z-index: 0;"></div>
                ` : '';

                const tagBadges = tags.slice(0, 2).map(t => `<span class="px-1.5 py-px rounded-sm bg-black/10 dark:bg-black/40 border border-black/10 dark:border-white/10 text-[7px] text-main/80 dark:text-white/80 uppercase tracking-widest pointer-events-none shrink-0">${t}</span>`).join('');
                const isDark = document.body.classList.contains('dark');
                // tBorder and text color handled by CSS
                const titleClasses = isDone ? 'font-medium text-white' : 'task-title-dynamic';

                return `
                    <div class="task-bar absolute rounded shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:z-20 transition-all cursor-pointer overflow-hidden ${isDone ? 'opacity-90' : 'opacity-100 shadow-inner'} ${!isDone ? 'dynamic-border-item border' : ''}"
                         style="left: ${renderX}px; width: ${renderW}px; height: ${zp.barH}px; top: ${barTop}px; --item-color: ${proj.color};"
                         data-task-id="${task.id}"
                         title="${tooltipText}">
                         <div class="absolute inset-0 transition-opacity ${!isDone ? 'dynamic-bg-item' : 'opacity-100'}" style="${isDone ? `background-color: ${proj.color};` : ''}"></div>
                         ${progressHtml}
                         ${doneOverlay}
                         <div class="flex items-center h-full relative text-[${zp.fontSize}px] px-1.5 pointer-events-none w-full gap-1.5" style="z-index: 1;">
                             ${showText && renderW > 30 ? `<div class="truncate flex-1 min-w-0 ${titleClasses}">${task.title}</div>` : ''}
                         </div>
                    </div>
                `;
            };

            if (row.type === 'resource') {
                rowEl.classList.add('bg-card'); // solid block background
                rowEl.style.height = `${zp.rowH + 10}px`; // Increase row height 
                
                // Push a slight highlight onto the right track background
                rightHtml += `<div class="absolute inset-0 bg-black/[0.03] dark:bg-white/5 pointer-events-none z-0"></div>`;

                const isCollapsed = window.TimesharkResourceCollapsed.has(row.resource);
                const chevron = `<button class="collapse-toggle-res p-0.5 hover:bg-white/10 rounded text-dim/60 hover:text-white transition-colors" data-toggle-res="${row.resource}">
                    <svg class="w-2.5 h-2.5 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </button>`;
                let rName = row.resource;
                if (rName.toLowerCase() === 'me') rName = 'Me';
                
                leftHtml = `
                    <div class="w-full h-full flex items-center px-4 gap-2 border-t border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-white/5">
                        ${chevron}
                        <div class="w-6 h-6 rounded-md bg-gradient-to-br from-card to-app border border-soft shadow-inner flex items-center justify-center font-black text-[16px] leading-none text-primary shrink-0 opacity-80">
                            ${rName.substring(0, 1).toUpperCase()}
                        </div>
                        <span class="text-[14px] font-black opacity-90 tracking-tight">${rName}</span>
                    </div>
                `;
            }
            else if (row.type === 'epic') {
                rowEl.classList.add('bg-card/40');
                const isCollapsed = window.TimesharkEpicCollapsed.has(String(row.epic.id));
                const epicProgress = getProjectProgress(row.epic.id);
                const chevron = `<button class="collapse-toggle-epic p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-dim/60 hover:text-white transition-colors" data-toggle-epic="${row.epic.id}">
                    <svg class="w-2.5 h-2.5 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </button>`;
                
                leftHtml = `
                    <div class="proj-row w-full h-full flex items-center pr-2 pl-4 gap-1.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t border-black/5 dark:border-white/5 relative" data-project-id="${row.epic.id}">
                        ${chevron}
                        <span class="px-1.5 py-0.5 rounded-sm bg-black/10 dark:bg-white/10 opacity-50 text-[7px] uppercase tracking-widest font-black shrink-0">EPIC</span>
                        <span class="text-[11px] font-bold opacity-100 truncate flex-grow">${row.epic.name}</span>
                        <span class="text-[9px] font-black opacity-40 shrink-0 tabular-nums">${epicProgress}%</span>
                    </div>
                `;

                // Calculate and Render Dynamic Epic Envelope
                let epicStartX = row.epic.started_at ? getX(row.epic.started_at) : null;
                let epicEndX = row.epic.completed_at ? getX(row.epic.completed_at) + pxPerDay : null;
                let dynStartX = null;
                let dynEndX = null;

                const checkEpicBounds = (sX, eX) => {
                     if (dynStartX === null || sX < dynStartX) dynStartX = sX;
                     if (dynEndX === null || eX > dynEndX) dynEndX = eX;
                };

                (row.tasks || []).forEach(t => {
                    if (!t.start_date) return;
                    checkEpicBounds(getX(t.start_date), getX(t.start_date) + getWidth(t.start_date, t.end_date));
                });

                (row.entries || []).forEach(e => {
                    if (!e.start_time) return;
                    checkEpicBounds(getX(e.start_time), getX(e.start_time) + getWidth(e.start_time, e.end_time || new Date()));
                });

                let boundaryStartX = epicStartX !== null ? epicStartX : dynStartX;
                let boundaryEndX = epicEndX !== null ? epicEndX : dynEndX;

                const PADDING = 6;
                if (boundaryStartX !== null) boundaryStartX -= PADDING;
                if (boundaryEndX !== null) boundaryEndX += PADDING;

                if (boundaryStartX !== null && boundaryEndX !== null) {
                    const bw = Math.max(10, boundaryEndX - boundaryStartX);
                    const eColor = row.epic.color || '#475569';
                    const isSubtle = options.subtleEpics;
                    const envelopeTop = (zp.rowH - (zp.barH * (isSubtle ? 0.1 : 0.4))) / 2;
                    let finalStartX = Math.max(0, boundaryStartX);
                    let finalW = Math.min(totalWidth - finalStartX, Math.max(2, boundaryEndX - boundaryStartX));
                    
                    if (isSubtle) {
                        rightHtml += `<div class="absolute rounded-full transition-all shadow-sm overflow-hidden cursor-pointer hover:shadow-lg project-envelope"
                                data-project-id="${row.epic.id}"
                                style="left: ${finalStartX}px; width: ${finalW}px; top: ${envelopeTop}px; height: 2px; background-color: ${eColor}; opacity: 0.3;">
                        </div>`;
                    } else {
                        rightHtml += `<div class="absolute rounded-full transition-all shadow-sm border border-black/10 dark:border-transparent dynamic-border-item overflow-hidden cursor-pointer hover:shadow-lg project-envelope"
                                data-project-id="${row.epic.id}"
                                style="left: ${finalStartX}px; width: ${finalW}px; top: ${envelopeTop}px; height: ${zp.barH * 0.4}px; --item-color: ${eColor};">
                                <div class="absolute opacity-40 dark:opacity-50 pointer-events-none" style="left: ${boundaryStartX - finalStartX}px; width: ${bw}px; top: 0; bottom: 0; background: linear-gradient(90deg, ${eColor} ${epicProgress}%, transparent ${epicProgress}%);"></div>
                        </div>`;
                    }
                }
            }
            else if (row.type === 'project') {
                rowEl.classList.add('bg-card/10');
                const isCollapsed = window.TimesharkProjectCollapsed.has(String(row.project.id));
                const chevron = `<button class="collapse-toggle p-0.5 hover:bg-white/10 rounded text-dim/60 hover:text-white transition-colors" data-toggle-proj="${row.project.id}">
                    <svg class="w-2.5 h-2.5 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </button>`;
                
                const pl = row.isEpicChild ? 'pl-8' : 'pl-4';
                const ml = '';
                
                const tags = row.project.tags ? (Array.isArray(row.project.tags) ? row.project.tags : row.project.tags.split(',').filter(Boolean)) : [];
                const tagBadges = tags.slice(0, 2).map(t => `<span class="px-1.5 py-px rounded-sm bg-black/5 dark:bg-white/5 text-[7px] opacity-40 uppercase tracking-widest ml-1">${t}</span>`).join('');

                leftHtml = `
                    <div class="proj-row w-full h-full flex items-center pr-2 gap-1.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t border-black/5 dark:border-white/5 ${pl} ${ml}" data-project-id="${row.project.id}">
                        ${chevron}
                        <div class="w-1.5 h-1.5 rounded-sm shrink-0 shadow-sm" style="background-color: ${row.project.color}"></div>
                        <span class="text-[11px] font-bold opacity-90 truncate">${row.project.name}</span>${tagBadges}
                    </div>
                `;

                // Calculate and Render Dynamic Project Envelope
                let plannedStartX = row.project.started_at ? getX(row.project.started_at) : null;
                let plannedEndX = row.project.completed_at ? getX(row.project.completed_at) + pxPerDay : null;
                let actualStartX = null;
                let actualEndX = null;

                row.tasks.forEach(t => {
                    if (!t.start_date) return;
                    const sX = getX(t.start_date);
                    const eX = sX + getWidth(t.start_date, t.end_date);
                    if (row.project.type === 'ops' && (eX < 0 || sX > totalWidth)) return;
                    if (plannedStartX === null || sX < plannedStartX) plannedStartX = sX;
                    if (plannedEndX === null || eX > plannedEndX) plannedEndX = eX;
                });

                row.entries.forEach(e => {
                    if (!e.start_time) return;
                    const sX = getX(e.start_time);
                    const endT = e.end_time || new Date();
                    const eX = sX + getWidth(e.start_time, endT);
                    if (row.project.type === 'ops' && (eX < 0 || sX > totalWidth)) return;
                    if (actualStartX === null || sX < actualStartX) actualStartX = sX;
                    if (actualEndX === null || eX > actualEndX) actualEndX = eX;
                });

                let boundaryStartX = plannedStartX;
                let boundaryEndX = plannedEndX;

                if (actualStartX !== null && (boundaryStartX === null || actualStartX < boundaryStartX)) boundaryStartX = actualStartX;
                if (actualEndX !== null && (boundaryEndX === null || actualEndX > boundaryEndX)) boundaryEndX = actualEndX;
                
                // Fallback missing bounds
                if (plannedStartX === null) plannedStartX = boundaryStartX;
                if (plannedEndX === null) plannedEndX = boundaryEndX;

                // Apply visual padding so curved boundaries don't clip time entries
                const PADDING = 6;
                if (boundaryStartX !== null) boundaryStartX -= PADDING;
                if (boundaryEndX !== null) boundaryEndX += PADDING;
                
                if (plannedStartX !== null) plannedStartX -= PADDING;
                if (plannedEndX !== null) plannedEndX += PADDING;

                if (boundaryStartX !== null && boundaryEndX !== null) {
                    const bw = Math.max(10, boundaryEndX - boundaryStartX);
                    const projProgress = getProjectProgress(row.project.id);
                    const envelopeTop = (zp.rowH - (zp.barH * 0.8)) / 2;
                    const pColor = row.project.color;
                    const isDark = document.body.classList.contains('dark');
                    // pBorder handled by CSS (.dynamic-border-item)
                    
                if ((row.project.name || '').toLowerCase() !== 'unassigned') {
                    // SOLID box representing the PLANNED explicit bounds
                    let finalPlannedStartX = Math.max(0, plannedStartX);
                    let finalPlannedW = Math.min(totalWidth - finalPlannedStartX, Math.max(2, plannedEndX - plannedStartX));
                    let plannedBW = Math.max(2, plannedEndX - plannedStartX);

                    if (row.project.type !== 'ops') {
                        rightHtml += `<div class="absolute rounded-full transition-all shadow-sm flex items-center px-2 border dynamic-border-item overflow-hidden cursor-pointer hover:shadow-lg project-envelope"
                                data-project-id="${row.project.id}"
                                style="left: ${finalPlannedStartX}px; width: ${finalPlannedW}px; top: ${envelopeTop}px; height: ${zp.barH * 0.8}px; --item-color: ${pColor};">
                                <div class="absolute opacity-40 dark:opacity-50 pointer-events-none" style="left: ${plannedStartX - finalPlannedStartX}px; width: ${plannedBW}px; top: 0; bottom: 0; background: linear-gradient(90deg, ${pColor} ${projProgress}%, transparent ${projProgress}%);"></div>
                        </div>`;
                    }

                    // DASHED box representing the DYNAMIC bounding overflow (actuals)
                    const dynamicDiffers = Math.abs(plannedStartX - boundaryStartX) > 1 || Math.abs(plannedEndX - boundaryEndX) > 1;
                    if (row.project.type === 'ops' || dynamicDiffers) {
                         let finalBoundaryStartX = Math.max(0, boundaryStartX);
                         let finalBoundaryW = Math.min(totalWidth - finalBoundaryStartX, Math.max(2, boundaryEndX - boundaryStartX));
                         
                         rightHtml += `<div class="absolute rounded-full pointer-events-none border border-dashed opacity-50 dark:opacity-70 dynamic-border-item" 
                                style="left: ${finalBoundaryStartX}px; width: ${finalBoundaryW}px; top: ${envelopeTop}px; height: ${zp.barH * 0.8}px; --item-color: ${pColor}; background-color: transparent;"></div>`;
                    }
                }
                }

                // Render time entries natively on the project row bottom edge (similar to original look)
                if (config.type !== 'year' && options.showTimeEntries !== false) {
                    const envelopeTop = (zp.rowH - (zp.barH * 0.8)) / 2;
                    const entryH = Math.max(4, (zp.barH * 0.8) - 4);
                    const entryTop = envelopeTop + ((zp.barH * 0.8) - entryH) / 2;
                    
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
                        const entryColor = row.project.color;

                        const duration = Math.round((e - s) / 1000);
                        const durationStr = PlannerUtils.formatDuration(duration);
                        const timeStr = `${PlannerUtils.formatTime(s)} - ${isActive ? 'Present' : PlannerUtils.formatTime(e)}`;
                        const entryTitle = `${entry.description || 'No description'} • ${row.project.name} • ${timeStr} (${durationStr})`;

                        rightHtml += `
                            <div class="time-entry absolute ${isActive ? 'animate-pulse opacity-100 z-10 box-shadow' : 'opacity-80 hover:opacity-100 hover:-translate-y-px z-10'} rounded-sm cursor-pointer hover:z-30 transition-all border border-black/10"
                                 style="left: ${renderX}px; width: ${renderW}px; top: ${entryTop}px; height: ${entryH}px; background-color: ${entryColor}; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"
                                 data-entry-id="${entry.id}"
                                 title="${entryTitle}">
                            </div>
                        `;
                    });
                }

                if (boundaryStartX !== null && boundaryEndX !== null) {
                    const bw = Math.max(10, boundaryEndX - boundaryStartX);
                    const projProgress = getProjectProgress(row.project.id);
                    const envelopeTop = (zp.rowH - (zp.barH * 0.8)) / 2;
                    if (showText && bw > 60 && projProgress > 0) {
                        rightHtml += `<div class="absolute pointer-events-none transition-all flex items-center px-2 z-20" style="left: ${Math.max(0, boundaryStartX)}px; width: ${Math.min(totalWidth - boundaryStartX, bw)}px; top: ${envelopeTop}px; height: ${zp.barH * 0.8}px;">
                            <span class="text-[7.5px] font-black leading-none drop-shadow-md text-main dark:text-white/80 opacity-90 backdrop-blur-sm bg-app/30 px-1 py-0.5 rounded">${projProgress}%</span>
                        </div>`;
                    }
                }
            } 
            else if (row.type === 'task') {
                const isDone = row.task.status === 'done';
                const pl = row.isEpicChild ? 'pl-[52px]' : 'pl-10';
                const ml = 'border-l-[2px] border-transparent hover:border-l-primary/30';

                const tags = row.task.tags ? (Array.isArray(row.task.tags) ? row.task.tags : row.task.tags.split(',').filter(Boolean)) : [];
                const tagBadges = tags.slice(0, 2).map(t => `<span class="px-1.5 py-px rounded-sm bg-black/5 dark:bg-white/5 text-[7px] opacity-40 uppercase tracking-widest pointer-events-none ml-1 shrink-0">${t}</span>`).join('');

                leftHtml = `
                    <div class="task-item relative w-full h-full flex items-center pr-2 gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${pl} ${ml}" data-task-id="${row.task.id}">
                        <div class="w-1 h-1 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-primary/50' : 'bg-dim/30'}"></div>
                        <span class="text-[10px] ${isDone ? 'line-through opacity-40' : 'opacity-80'} font-medium truncate">${row.task.title}</span>${tagBadges}
                    </div>
                `;
                rightHtml += renderBar(row.task, row.project);
            }

            if (isGanttHidden) rightHtml = '';

            // Assemble row
            rowEl.innerHTML = `
                <div class="flex-shrink-0 bg-card sticky left-0 z-40 border-r border-b border-[#ffffff11] border-b-black/5 dark:border-white/5 overflow-hidden flex items-center justify-between group/row" style="width: ${leftWidth}px">
                    <div class="flex-1 overflow-hidden h-full">${leftHtml}</div>
                    <button class="gantt-eye-toggle p-1 mr-1.5 rounded-md text-dim/40 hover:text-white transition-colors absolute right-0 bg-card ${isSelfHidden ? 'opacity-100 text-dim' : 'group-hover/row:opacity-100 opacity-0'} z-10" data-hide-id="${fullRowId}" title="Toggle Gantt Layer Visibility">
                        ${isSelfHidden ? 
                        `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>` 
                        : 
                        `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`}
                    </button>
                </div>
                <div class="relative pointer-events-auto border-b border-black/5 dark:border-white/5 overflow-hidden shrink-0" style="width: ${totalWidth}px">
                    ${rightHtml}
                </div>
            `;
            body.appendChild(rowEl);
        });

        container.appendChild(body);

        // Center scroll on today/current time on initial render
        const scrollParent = container.closest('.overflow-x-auto') || container;
        if (scrollParent.scrollLeft < 10) {
            if (config.isDayView) {
                const hourWidth = pxPerDay / 24;
                const now = new Date();
                const nowX = leftWidth + (now.getHours() + now.getMinutes() / 60) * hourWidth;
                scrollParent.scrollLeft = Math.max(0, nowX - scrollParent.clientWidth / 2);
            } else {
                const todayX = getX(today);
                if (todayX >= 0 && todayX <= totalWidth) {
                    scrollParent.scrollLeft = Math.max(0, leftWidth + todayX - scrollParent.clientWidth / 2);
                }
            }
        }

        if (!container.dataset.timelineEventsBound) {
            container.dataset.timelineEventsBound = "true";
            container.addEventListener('click', (e) => {
                const collapseAllBtn = e.target.closest('.collapse-all-btn');
                const expandAllBtn = e.target.closest('.expand-all-btn');

                if (collapseAllBtn) {
                    e.stopPropagation();
                    data.rows.forEach(r => window.TimesharkResourceCollapsed.add(r.resource));
                    data.projects.forEach(p => {
                       if (p.type === 'epic') window.TimesharkEpicCollapsed.add(String(p.id));
                       window.TimesharkProjectCollapsed.add(String(p.id));
                    });
                    PlannerTimeline.render(container, data, config, today, zoom, onLaneReorder, options);
                    return;
                }

                if (expandAllBtn) {
                    e.stopPropagation();
                    window.TimesharkResourceCollapsed.clear();
                    window.TimesharkEpicCollapsed.clear();
                    window.TimesharkProjectCollapsed.clear();
                    PlannerTimeline.render(container, data, config, today, zoom, onLaneReorder, options);
                    return;
                }

                const ganttEyeToggleBtn = e.target.closest('.gantt-eye-toggle');
                if (ganttEyeToggleBtn) {
                    e.stopPropagation();
                    const hid = ganttEyeToggleBtn.dataset.hideId;
                    if (window.TimesharkGanttHidden.has(hid)) window.TimesharkGanttHidden.delete(hid);
                    else window.TimesharkGanttHidden.add(hid);
                    PlannerTimeline.render(container, data, config, today, zoom, onLaneReorder, options);
                    return;
                }

                const toggleEpicBtn = e.target.closest('.collapse-toggle-epic');
                if (toggleEpicBtn) {
                    e.stopPropagation();
                    const eid = toggleEpicBtn.dataset.toggleEpic;
                    if (window.TimesharkEpicCollapsed.has(eid)) window.TimesharkEpicCollapsed.delete(eid);
                    else window.TimesharkEpicCollapsed.add(eid);
                    PlannerTimeline.render(container, data, config, today, zoom, onLaneReorder, options);
                }

                const toggleBtn = e.target.closest('.collapse-toggle');
                const toggleResBtn = e.target.closest('.collapse-toggle-res');
                if (toggleBtn) {
                    e.stopPropagation();
                    const pid = toggleBtn.dataset.toggleProj;
                    if (window.TimesharkProjectCollapsed.has(pid)) window.TimesharkProjectCollapsed.delete(pid);
                    else window.TimesharkProjectCollapsed.add(pid);
                    PlannerTimeline.render(container, data, config, today, zoom, onLaneReorder, options);
                }
                if (toggleResBtn) {
                    e.stopPropagation();
                    const rid = toggleResBtn.dataset.toggleRes;
                    if (window.TimesharkResourceCollapsed.has(rid)) window.TimesharkResourceCollapsed.delete(rid);
                    else window.TimesharkResourceCollapsed.add(rid);
                    PlannerTimeline.render(container, data, config, today, zoom, onLaneReorder, options);
                }
            });
        }
    }
};
