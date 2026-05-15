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
            const projectTasks = allTasks.filter(t => (t.project_id || 'personal') == projectId && t.task_type !== 'project_span');
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
            }).forEach(task => { // Treating project_spans normally
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

            rawProjectArr.sort((a, b) => getEarliest(a.id) - getEarliest(b.id));

            // Group by Epic
            const epicsMap = new Map(); // epicId -> list of projects
            const standaloneProjects = [];

            rawProjectArr.forEach(proj => {
                if (proj.parent_id) {
                    const epic = data.projects.find(p => p.id == proj.parent_id && p.type === 'epic');
                    if (epic) {
                        if (!epicsMap.has(epic.id)) epicsMap.set(epic.id, { epic: epic, projList: [] });
                        epicsMap.get(epic.id).projList.push(proj);
                    } else standaloneProjects.push(proj);
                } else standaloneProjects.push(proj);
            });

            // 1. Add Resource
            flattenedRows.push({ type: 'resource', resource: row.resource });

            // Helper to push project with Epic context
            const pushProjectGroup = (proj, isEpicChild = false, epicId = null) => {
                let tasks = tasksByProject.get(proj.id) || [];
                const entries = entriesByProject.get(proj.id) || [];
                if (tasks.length === 0 && entries.length === 0) return;

                tasks.sort((a,b) => new Date(a.start_date) - new Date(b.start_date));

                flattenedRows.push({
                    type: 'project',
                    project: proj,
                    entries: entries,
                    tasks: tasks,
                    resource: row.resource,
                    isEpicChild: isEpicChild,
                    epicId: epicId
                });

                tasks.forEach(task => {
                    if (config.type === 'year') {
                        const taskDays = task.end_date ? (new Date(task.end_date) - new Date(task.start_date)) / (24 * 60 * 60 * 1000) : 0;
                        if (taskDays < 3) return;
                    }
                    flattenedRows.push({
                        type: 'task',
                        task: task,
                        project: proj,
                        resource: row.resource,
                        isEpicChild: isEpicChild,
                        epicId: epicId
                    });
                });
            };

            // 2. Add Epics and their projects
            Array.from(epicsMap.values()).forEach(group => {
                flattenedRows.push({ type: 'epic', epic: group.epic, resource: row.resource });
                group.projList.forEach(p => pushProjectGroup(p, true, group.epic.id));
            });

            // 3. Add standalone projects
            standaloneProjects.forEach(p => pushProjectGroup(p, false, null));
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
                    <div class="absolute top-0 bottom-0 border-r border-white/2 flex items-center justify-center transition-colors px-0.5"
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
            <div class="flex-shrink-0 px-4 flex items-center font-black text-dim text-[10px] uppercase tracking-[0.2em] border-r border-white/5 bg-app/80 backdrop-blur sticky left-0 z-50" style="width: ${leftWidth}px">
                PLANNING TREE
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
                <div class="absolute top-0 bottom-0 border-r border-[#222]" style="left: ${h * hourWidth}px; width: ${hourWidth}px; background-color: ${h >= 8 && h <= 18 ? 'transparent' : 'rgba(0,0,0,0.01)'}"></div>
            `).join('');
        } else if (config.type === 'year') {
            let monthOffset = 0;
            const thisMonth = today.getMonth();
            const isCurrentYear = config.startDate.getFullYear() === today.getFullYear();
            gridLines.innerHTML = config.groups.map(g => {
                const monthWidth = g.count * pxPerDay;
                const isCurrent = isCurrentYear && g.month === thisMonth;
                const col = `<div class="absolute top-0 bottom-0 border-r border-[#222]" style="left: ${monthOffset}px; width: ${monthWidth}px; background-color: ${isCurrent ? 'rgba(var(--color-primary), 0.02)' : 'transparent'}"></div>`;
                monthOffset += monthWidth;
                return col;
            }).join('');
        } else {
            gridLines.innerHTML = config.dates.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                return `<div class="absolute top-0 bottom-0 border-r border-[#222]" style="left: ${i * pxPerDay}px; width: ${pxPerDay}px; background-color: ${isToday ? 'rgba(var(--color-primary), 0.01)' : 'transparent'}"></div>`;
            }).join('');
        }
        body.appendChild(gridLines);

        // Today Indicator Line
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
                const todayLine = document.createElement('div');
                todayLine.className = 'absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]';
                todayLine.style.left = `${leftWidth + todayLeft}px`;
                todayLine.innerHTML = `<div class="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>`;
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
            rowEl.className = 'flex border-b border-white/5 hover:bg-white/[0.02] transition-colors group relative z-10 w-full';
            rowEl.style.height = `${zp.rowH}px`;

            // Tree View Column (Left)
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
                    <div class="absolute inset-0 bg-black/20 pointer-events-none" style="width: ${taskProgress}%"></div>
                ` : '';
                const doneOverlay = isDone ? `
                    <div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 5px); z-index: 0;"></div>
                ` : '';

                const taskBg = isDone ? proj.color : `linear-gradient(to right, ${proj.color}22, ${proj.color}44)`;
                const borderStyle = isDone ? 'border border-white/10' : '';

                const tagBadges = tags.slice(0, 2).map(t => `<span class="px-1 py-0.5 rounded bg-black/40 border border-white/10 text-[7px] text-white/80 uppercase tracking-widest pointer-events-none ml-1">${t}</span>`).join('');

                return `
                    <div class="task-bar absolute rounded shadow-sm ${borderStyle} hover:shadow-lg hover:-translate-y-0.5 hover:z-20 transition-all cursor-pointer overflow-hidden ${isDone ? 'opacity-90' : 'opacity-100 shadow-inner'}"
                         style="left: ${renderX}px; width: ${renderW}px; height: ${zp.barH}px; top: ${barTop}px; background: ${taskBg}; ${!isDone ? `border: 1px solid ${proj.color};` : ''}"
                         data-task-id="${task.id}"
                         title="${tooltipText}">
                         ${progressHtml}
                         ${doneOverlay}
                         <span class="flex items-center relative text-[${zp.fontSize}px] font-bold ${isDone ? 'text-white' : 'text-white/90'} truncate px-1.5 leading-[${zp.barH}px] pointer-events-none whitespace-nowrap overflow-hidden" style="z-index: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${showText && renderW > 30 ? task.title : ''}${showText && renderW > 60 ? tagBadges : ''}</span>
                    </div>
                `;
            };

            if (row.type === 'resource') {
                rowEl.classList.add('bg-card'); // solid block background
                const isCollapsed = window.TimesharkResourceCollapsed.has(row.resource);
                const chevron = `<button class="collapse-toggle-res p-0.5 hover:bg-white/10 rounded text-dim/60 hover:text-white transition-colors" data-toggle-res="${row.resource}">
                    <svg class="w-2.5 h-2.5 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </button>`;
                leftHtml = `
                    <div class="w-full h-full flex items-center px-4 gap-2 border-t border-white/5">
                        ${chevron}
                        <div class="w-5 h-5 rounded-md bg-gradient-to-br from-card to-app border border-soft shadow-inner flex items-center justify-center font-black text-[10px] text-primary shrink-0 opacity-80">
                            ${row.resource.substring(0, 1).toUpperCase()}
                        </div>
                        <span class="text-[12px] font-black text-white/90 tracking-tight opacity-100">${row.resource}</span>
                    </div>
                `;
            }
            else if (row.type === 'epic') {
                rowEl.classList.add('bg-card/40');
                const isCollapsed = window.TimesharkEpicCollapsed.has(String(row.epic.id));
                const chevron = `<button class="collapse-toggle-epic ml-3 p-0.5 hover:bg-white/10 rounded text-dim/60 hover:text-white transition-colors" data-toggle-epic="${row.epic.id}">
                    <svg class="w-2.5 h-2.5 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </button>`;
                
                leftHtml = `
                    <div class="w-full h-full flex items-center pr-2 gap-1.5 cursor-pointer hover:bg-white/5 transition-colors border-t border-white/5 relative">
                        <div class="absolute left-6 top-0 bottom-0 w-px bg-white/5"></div>
                        <div class="absolute left-6 top-1/2 w-2 h-px bg-white/5"></div>
                        ${chevron}
                        <span class="px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[8px] uppercase tracking-widest font-black shrink-0 shadow-inner">EPIC</span>
                        <span class="text-[11px] font-bold text-white opacity-100 truncate flex-grow">${row.epic.name}</span>
                    </div>
                `;
            }
            else if (row.type === 'project') {
                rowEl.classList.add('bg-card/20');
                const isCollapsed = window.TimesharkProjectCollapsed.has(String(row.project.id));
                const chevron = `<button class="collapse-toggle p-0.5 hover:bg-white/10 rounded text-dim/60 hover:text-white transition-colors" data-toggle-proj="${row.project.id}">
                    <svg class="w-2.5 h-2.5 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </button>`;
                
                const pl = row.isEpicChild ? 'pl-10' : 'pl-6';
                const treeLines = row.isEpicChild ? `
                    <div class="absolute left-6 top-0 bottom-0 w-px bg-white/5"></div>
                    <div class="absolute left-10 top-0 bottom-0 w-px bg-white/5"></div>
                    <div class="absolute left-10 top-1/2 w-1.5 h-px bg-white/5"></div>
                ` : `<div class="absolute left-6 top-0 bottom-0 w-px bg-white/5"></div><div class="absolute left-6 top-1/2 w-1.5 h-px bg-white/5"></div>`;
                
                const tags = row.project.tags ? (Array.isArray(row.project.tags) ? row.project.tags : row.project.tags.split(',').filter(Boolean)) : [];
                const tagBadges = tags.slice(0, 2).map(t => `<span class="px-1 py-px rounded bg-white/5 border border-white/5 text-[7px] text-white/50 uppercase tracking-widest ml-1 shadow-inner">${t}</span>`).join('');

                leftHtml = `
                    <div class="proj-row w-full h-full flex items-center pr-2 gap-1.5 cursor-pointer hover:bg-white/5 transition-colors border-t border-white/5 relative ${pl}" data-project-id="${row.project.id}">
                        ${treeLines}
                        ${chevron}
                        <div class="w-1.5 h-1.5 rounded-sm shrink-0 shadow-sm" style="background-color: ${row.project.color}"></div>
                        <span class="text-[11px] font-bold text-white/90 opacity-100 truncate">${row.project.name}</span>${tagBadges}
                    </div>
                `;

                // Calculate and Render Dynamic Project Envelope
                let boundaryStartX = null;
                let boundaryEndX = null;
                row.tasks.forEach(t => {
                    const sX = getX(t.start_date);
                    const eX = sX + getWidth(t.start_date, t.end_date);
                    if (boundaryStartX === null || sX < boundaryStartX) boundaryStartX = sX;
                    if (boundaryEndX === null || eX > boundaryEndX) boundaryEndX = eX;
                });
                
                if (boundaryStartX !== null && boundaryEndX !== null) {
                    const bw = Math.max(10, boundaryEndX - boundaryStartX);
                    const projProgress = getProjectProgress(row.project.id);
                    rightHtml += `<div class="absolute rounded-sm pointer-events-none transition-all shadow-sm flex items-center px-1.5 overflow-hidden border"
                            style="left: ${Math.max(0, boundaryStartX)}px; width: ${Math.min(totalWidth - boundaryStartX, bw)}px; top: 4px; bottom: 8px; background: linear-gradient(90deg, ${row.project.color}33 ${projProgress}%, ${row.project.color}11 ${projProgress}%); border-color: ${row.project.color}44;">
                            ${showText && bw > 60 && projProgress > 0 ? `<span class="text-[8px] font-black text-white/40 leading-none">${projProgress}%</span>` : ''}
                    </div>`;
                }

                // Render time entries natively on the project row bottom edge (similar to original look)
                if (config.type !== 'year') {
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
                            <div class="time-entry absolute ${isActive ? 'h-1.5 animate-pulse opacity-80' : 'h-1 opacity-40 hover:opacity-100'} rounded-full cursor-pointer hover:z-30 transition-all"
                                 style="left: ${renderX}px; width: ${renderW}px; bottom: 2px; background-color: ${entryColor};"
                                 data-entry-id="${entry.id}"
                                 title="${entryTitle}">
                            </div>
                        `;
                    });
                }
            } 
            else if (row.type === 'task') {
                const isDone = row.task.status === 'done';
                const pl = row.isEpicChild ? 'pl-[60px]' : 'pl-16';
                const leftLine = row.isEpicChild ? `
                    <div class="absolute left-6 top-0 bottom-0 w-px bg-white/5"></div>
                    <div class="absolute left-10 top-0 bottom-1/2 w-4 border-l border-b border-white/10 rounded-bl" style="border-bottom-left-radius: 4px;"></div>
                ` : `
                    <div class="absolute left-9 top-0 bottom-1/2 w-4 border-l border-b border-white/10 rounded-bl" style="border-bottom-left-radius: 4px;"></div>
                `;

                const tags = row.task.tags ? (Array.isArray(row.task.tags) ? row.task.tags : row.task.tags.split(',').filter(Boolean)) : [];
                const tagBadges = tags.slice(0, 2).map(t => `<span class="px-1 py-px rounded bg-white/5 border border-white/5 text-[7px] text-white/50 uppercase tracking-widest pointer-events-none ml-1 shadow-inner shrink-0">${t}</span>`).join('');

                leftHtml = `
                    <div class="task-item relative w-full h-full flex items-center pr-2 gap-2 cursor-pointer hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-l-primary/30 ${pl}" data-task-id="${row.task.id}">
                        ${leftLine}
                        <div class="w-1 h-1 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-primary/50' : 'bg-dim/30'}"></div>
                        <span class="text-[10px] text-white/80 ${isDone ? 'line-through opacity-50' : 'opacity-100'} truncate">${row.task.title}</span>${tagBadges}
                    </div>
                `;
                rightHtml += renderBar(row.task, row.project);
            }

            // Assemble row
            rowEl.innerHTML = `
                <div class="flex-shrink-0 bg-[#0f1115] sticky left-0 z-30 border-r border-white/5" style="width: ${leftWidth}px">
                    ${leftHtml}
                </div>
                <div class="relative flex-grow pointer-events-auto" style="width: ${totalWidth}px">
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
                const toggleEpicBtn = e.target.closest('.collapse-toggle-epic');
                if (toggleEpicBtn) {
                    e.stopPropagation();
                    const eid = toggleEpicBtn.dataset.toggleEpic;
                    if (window.TimesharkEpicCollapsed.has(eid)) window.TimesharkEpicCollapsed.delete(eid);
                    else window.TimesharkEpicCollapsed.add(eid);
                    PlannerTimeline.render(container, data, config, today, currentZoom, onReorder, options);
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
