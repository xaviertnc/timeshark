import { store } from '../utils/store.js';
import { api } from '../utils/api.js';

let currentScale = 'week';
let projectFilter = 'all';
let timeOffset = 0;

// Helper to determine if text should be dark or light based on background hex
function getContrastColor(hex) {
    if (!hex || hex === 'transparent') return 'text-slate-800';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? 'text-slate-900' : 'text-white';
}

export async function renderPlanner() {
    try {
        const freshTasks = await api.get('planner.php');
        store.update('tasks', freshTasks);
    } catch (err) {
        console.error("Planner failed to fetch tasks", err);
    }

    const state = store.get();
    const tasks = state.tasks || [];
    const projects = state.projects || [];
    const team = state.team || [];

    const resources = team.length > 0 ? team.map(m => m.name) : ['General'];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getTimelineConfig = (scale, offset) => {
        const dates = [];
        let groups = [];

        const baseDate = new Date(today);
        if (scale === 'day') baseDate.setDate(today.getDate() + offset);
        if (scale === 'week') baseDate.setDate(today.getDate() + (offset * 14));
        if (scale === 'month') baseDate.setDate(today.getDate() + (offset * 28));
        if (scale === 'year') baseDate.setFullYear(today.getFullYear() + offset);

        const getWeekNum = (d) => {
            const date = new Date(d.getTime());
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        };

        if (scale === 'day') {
            for (let i = 0; i < 24; i++) {
                const d = new Date(baseDate);
                d.setHours(i, 0, 0, 0);
                dates.push(d);
            }
            groups = [{ label: baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), count: 24 }];
            return {
                dates, groups,
                label: (d) => `${d.getHours()}h`,
                sublabel: () => 'Time',
                colWidth: 'min-w-[45px]',
                filter: (t, d) => {
                    const targetHour = d.getHours();
                    const targetDateStr = d.toDateString();

                    // If task has specific hourly slots
                    const slots = (t.slots && typeof t.slots === 'string') ? t.slots.split(',').map(s => s.trim()).filter(s => s !== '').map(s => parseInt(s)) : [];
                    if (slots.length > 0) {
                        const targetDay = new Date(d); targetDay.setHours(0, 0, 0, 0);
                        const sdDay = new Date(t.start_date); sdDay.setHours(0, 0, 0, 0);
                        const edDay = t.end_date ? new Date(t.end_date) : sdDay;
                        edDay.setHours(23, 59, 59, 999);
                        return targetDay >= sdDay && targetDay <= edDay && slots.includes(targetHour);
                    }

                    // Fallback to range for tasks without explicit slots
                    if (!t.start_date) return false;
                    const sd = new Date(t.start_date);
                    const ed = t.end_date ? new Date(t.end_date) : sd;
                    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return false;

                    const targetDate = new Date(d); targetDate.setHours(0, 0, 0, 0);
                    const startDate = new Date(sd); startDate.setHours(0, 0, 0, 0);
                    const endDate = new Date(ed); endDate.setHours(0, 0, 0, 0);

                    // Date must be within the range [startDate, endDate]
                    if (targetDate < startDate || targetDate > endDate) return false;

                    // Hour must be within the task's daily office-hour window [startHour, endHour]
                    const sHour = sd.getHours();
                    const eHour = ed.getHours() || 16;

                    return targetHour >= sHour && targetHour < eHour;
                }
            };
        } else if (scale === 'month') {
            const start = new Date(baseDate);
            start.setDate(baseDate.getDate() - baseDate.getDay());
            for (let i = 0; i < 28; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push(d);
            }
            for (let i = 0; i < 4; i++) {
                const weekStart = new Date(start);
                weekStart.setDate(start.getDate() + (i * 7));
                groups.push({ label: `WEEK ${getWeekNum(weekStart)}: ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`, count: 7 });
            }
            return {
                dates, groups,
                label: (d) => d.getDate(),
                sublabel: (d) => d.toLocaleDateString('en-US', { weekday: 'narrow' }),
                colWidth: 'min-w-[40px]',
                filter: (t, d) => {
                    if (!t.start_date) return false;
                    const target = new Date(d); target.setHours(0, 0, 0, 0);
                    const sd = new Date(t.start_date); sd.setHours(0, 0, 0, 0);
                    const ed = t.end_date ? new Date(t.end_date) : new Date(t.start_date);
                    ed.setHours(23, 59, 59, 999);

                    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return false;
                    return target >= sd && target <= ed;
                }
            };
        } else if (scale === 'year') {
            const start = new Date(baseDate.getFullYear(), 0, 1);
            for (let i = 0; i < 12; i++) {
                const d = new Date(start.getFullYear(), i, 1);
                dates.push(d);
            }
            groups = [{ label: baseDate.getFullYear(), count: 12 }];
            return {
                dates, groups,
                label: (d) => d.toLocaleDateString('en-US', { month: 'short' }),
                sublabel: () => 'Month',
                colWidth: 'min-w-[100px]',
                filter: (t, d) => {
                    if (!t.start_date) return false;
                    const sd = new Date(t.start_date);
                    const ed = t.end_date ? new Date(t.end_date) : sd;
                    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);

                    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return false;
                    return sd <= monthEnd && ed >= monthStart;
                }
            };
        } else {
            const start = new Date(baseDate);
            start.setDate(baseDate.getDate() - baseDate.getDay());
            for (let i = 0; i < 14; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push(d);
            }

            const nextWeek = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

            groups = [
                { label: `WEEK ${getWeekNum(start)}: ${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`, count: 7 },
                { label: `WEEK ${getWeekNum(nextWeek)}: ${new Date(nextWeek).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`, count: 7 }
            ];

            return {
                dates, groups,
                label: (d) => d.getDate(),
                sublabel: (d) => d.toLocaleDateString('en-US', { weekday: 'short' }),
                colWidth: 'min-w-[80px]',
                filter: (t, d) => {
                    if (!t.start_date) return false;
                    const target = new Date(d); target.setHours(0, 0, 0, 0);
                    const sd = new Date(t.start_date); sd.setHours(0, 0, 0, 0);
                    const ed = t.end_date ? new Date(t.end_date) : new Date(t.start_date);
                    ed.setHours(23, 59, 59, 999);

                    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return false;
                    return target >= sd && target <= ed;
                }
            };
        }
    };

    const config = getTimelineConfig(currentScale, timeOffset);
    const filteredTasks = projectFilter === 'all' ? tasks : tasks.filter(t => t.project_id === projectFilter);

    const container = document.createElement('div');
    container.className = "max-w-[1600px] mx-auto pb-16 px-4";

    container.innerHTML = `
        <div class="flex items-end justify-between mb-8 px-2">
            <div>
                 <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2">Resource Flow</h2>
                 <h1 class="text-2xl font-light text-main tracking-tight">Active <span class="font-bold italic text-primary">Planner.</span></h1>
            </div>

            <div class="flex items-center gap-6">
                <div class="flex items-center bg-app p-1 rounded-xl gap-1">
                    <button id="prev-time" class="p-2 hover:bg-card rounded-lg transition-all text-dim hover:text-primary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button id="today-time" class="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-dim hover:text-primary transition-all">Today</button>
                    <button id="next-time" class="p-2 hover:bg-card rounded-lg transition-all text-dim hover:text-primary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>

                <div class="relative group">
                    <select id="project-filter" class="appearance-none bg-app border-none rounded-xl px-4 py-2.5 pr-9 text-[10px] font-black uppercase tracking-widest text-dim focus:text-primary transition-all cursor-pointer outline-none">
                        <option value="all">Global View</option>
                        ${projects.map(p => `<option value="${p.id}" ${projectFilter === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-dim/50">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                <div class="bg-app p-1 rounded-xl flex items-center">
                    ${['day', 'week', 'month', 'year'].map(s => `
                        <button class="scale-toggle px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${currentScale === s ? 'bg-card text-primary shadow-sm' : 'text-dim hover:text-muted'}" data-scale="${s}">
                            ${s}
                        </button>
                    `).join('')}
                </div>

                <button id="add-task-btn" class="bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center font-black uppercase tracking-[0.1em] text-[10px]">
                    Assign Task
                </button>
            </div>
        </div>

        <div class="bg-card rounded-[2rem] border border-soft shadow-soft overflow-hidden">
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-app border-b border-soft">
                            <th class="p-2 border-r border-soft sticky left-0 bg-sidebar z-40"></th>
                            ${config.groups.map(g => `
                                <th colspan="${g.count}" class="p-2 text-[8px] font-black text-dim uppercase tracking-[0.4em] text-center border-r border-soft last:border-r-0">
                                    ${g.label}
                                </th>
                            `).join('')}
                        </tr>
                        <tr class="bg-app border-b border-soft">
                            <th class="p-4 py-3 text-left text-[9px] font-black text-dim uppercase tracking-widest min-w-[180px] sticky left-0 bg-sidebar backdrop-blur-md z-30 border-r border-soft">Resource</th>
                            ${config.dates.map(date => `
                                <th class="p-3 text-center border-r border-soft/30 last:border-r-0 ${config.colWidth} ${date.toDateString() === today.toDateString() ? 'bg-primary/10' : ''}">
                                    <div class="text-[7px] font-black text-dim uppercase mb-0.5 tracking-tighter">${config.sublabel(date)}</div>
                                    <div class="text-sm font-bold text-muted tracking-tight leading-tight transition-colors ${date.toDateString() === today.toDateString() ? 'text-primary' : ''}">${config.label(date)}</div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${resources.map(resource => `
                            <tr class="border-b border-soft/50 last:border-b-0 hover:bg-primary/[0.02] transition-colors">
                                <td class="p-4 py-2 bg-sidebar backdrop-blur-md sticky left-0 z-20 border-r border-soft">
                                    ${(() => {
            const formatDur = (sec) => {
                const h = Math.floor(sec / 3600);
                const m = Math.round((sec % 3600) / 60);
                return h > 0 ? `${h}h ${m}m` : `${m}m`;
            };

            const statsDate = currentScale === 'day' ? (config.dates[0] || today) : today;

            const rTasks = tasks.filter(t => {
                if (t.resource_id !== resource || !t.start_date) return false;
                const target = new Date(statsDate); target.setHours(0, 0, 0, 0);
                const sd = new Date(t.start_date); sd.setHours(0, 0, 0, 0);
                const ed = t.end_date ? new Date(t.end_date) : new Date(t.start_date);
                ed.setHours(23, 59, 59, 999);
                return target >= sd && target <= ed;
            });

            const pTime = rTasks.reduce((acc, t) => {
                const slotsCount = (t.slots && typeof t.slots === 'string') ? t.slots.split(',').filter(s => s.trim() !== '').length : 0;
                if (slotsCount > 0) return acc + (slotsCount * 3600);
                return acc + ((new Date(t.end_date || t.start_date) - new Date(t.start_date)) / 1000 || 3600);
            }, 0);

            const lTime = (state.timeEntries || [])
                .filter(te => te.end_time && (te.resource_id === resource || (!te.resource_id && resources[0] === resource)))
                .filter(te => new Date(te.start_time).toDateString() === statsDate.toDateString())
                .reduce((acc, te) => acc + (new Date(te.end_time) - new Date(te.start_time)) / 1000, 0);
            const rCap = pTime > 0 ? Math.min(100, Math.round((lTime / pTime) * 100)) : 0;

            const capTooltip = `<b>Capacity: ${rCap}%</b><br/>${formatDur(lTime)} logged / ${formatDur(pTime)} planned for ${statsDate.toDateString() === today.toDateString() ? 'today' : statsDate.toLocaleDateString()}`;



            return `
                                     <div class="flex items-center justify-between gap-3">
                                          <div class="flex items-center gap-3">
                                             <div class="w-8 h-8 rounded-lg bg-app flex items-center justify-center text-[10px] font-black text-dim border border-soft">
                                                ${resource.substring(0, 2).toUpperCase()}
                                             </div>
                                             <div class="flex flex-col">
                                                 <span class="text-[13px] font-bold tracking-tight text-main leading-none">${resource}</span>
                                                 <span class="text-[9px] font-black text-dim uppercase tracking-widest mt-1">${rCap}% Cap</span>
                                             </div>
                                          </div>
                                          ${pTime > 0 ? `
                                            <div class="w-1.5 h-8 bg-app rounded-full overflow-hidden border border-soft flex flex-col-reverse cursor-help" data-tooltip="${capTooltip}">
                                                <div class="w-full bg-primary transition-all duration-1000" style="height: ${rCap}%"></div>
                                            </div>
                                          ` : ''}
                                     </div>
                `;
        })()}
                                </td>
                                ${config.dates.map(date => {
            const activeTasks = filteredTasks.filter(t => t.resource_id === resource && config.filter(t, date));
            return `
                                        <td class="p-1 border-r border-slate-50/10 last:border-r-0 align-top ${date.toDateString() === today.toDateString() ? 'bg-primary/[0.01]' : ''}">
                                            <div class="min-h-[75px] space-y-3 flex flex-col items-center justify-start py-2 px-1">
                                                ${activeTasks.map(t => {
                const proj = projects.find(p => p.id == t.project_id) || { color: '#eceff1', name: '?' };
                const textColorClass = getContrastColor(proj.color);

                // Calculate Progress: Time Entries matching this project and resource on this day
                const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

                const loggedSeconds = (state.timeEntries || [])
                    .filter(te => te.project_id == t.project_id && te.end_time)
                    .filter(te => {
                        const teDate = new Date(te.start_time);
                        return teDate >= dayStart && teDate <= dayEnd;
                    })
                    .reduce((acc, te) => acc + (new Date(te.end_time) - new Date(te.start_time)) / 1000, 0);

                let plannedSeconds = 3600;
                if (t.slots && typeof t.slots === 'string') {
                    plannedSeconds = t.slots.split(',').map(s => s.trim()).filter(s => s !== '').length * 3600;
                } else {
                    plannedSeconds = (new Date(t.end_date || t.start_date) - new Date(t.start_date)) / 1000 || 3600;
                }

                const formatDur = (sec) => {
                    const h = Math.floor(sec / 3600);
                    const m = Math.round((sec % 3600) / 60);
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                };

                const progress = Math.min(100, Math.round((loggedSeconds / plannedSeconds) * 100));
                const taskStatsTitle = `<b>Progress: ${progress}%</b><br/>${formatDur(loggedSeconds)} logged / ${formatDur(plannedSeconds)} planned today`;

                // Hide past blocks if no time was booked
                if (new Date(t.end_date || t.start_date) < new Date() && loggedSeconds <= 0) {
                    return '';
                }

                return `
                                                        <div class="task-card group/item relative w-full" data-id="${t.id}">
                                                            <div class="text-[10px] rounded-xl px-3 py-3 shadow-md border border-black/5 transition-all overflow-hidden relative"
                                                                 style="background-color: ${proj.color}">
                                                                 <div class="relative z-10">
                                                                    <div class="font-bold mb-1 line-clamp-2 leading-tight ${textColorClass}">${t.title}</div>
                                                                    <div class="opacity-60 font-black uppercase tracking-widest text-[8px] line-clamp-1 ${textColorClass}">${proj.name}</div>

                                                                    ${(() => {
                        // Show progress bar only on the FIRST hourly slot in Day View, or always in other views
                        if (currentScale !== 'day') return true;
                        if (!t.slots) return true;
                        const slots = t.slots.split(',').map(s => parseInt(s.trim()));
                        const minSlot = Math.min(...slots);
                        return date.getHours() === minSlot;
                    })() && progress > 0 ? `
                                                                        <div class="mt-2 w-full bg-black/10 rounded-full h-1 overflow-hidden cursor-help" data-tooltip="${taskStatsTitle}">
                                                                            <div class="h-full bg-white/40 transition-all duration-1000" style="width: ${progress}%"></div>
                                                                        </div>
                                                                    ` : ''}
                                                                 </div>

                                                                 <!-- Background highlight for completed tasks -->
                                                                 ${progress >= 100 ? `<div class="absolute inset-0 bg-primary/20 animate-pulse"></div>` : ''}

                                                                 <div class="absolute inset-0 cursor-pointer opacity-0 group-hover/item:opacity-10 transition-opacity bg-black"></div>
                                                             </div>
                                                             <button class="${currentScale === 'day' ? 'remove-slot-btn' : 'delete-task-btn'} absolute -top-2 -right-2 bg-card text-red-500 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover/item:opacity-100 shadow-xl border border-soft transition-all z-30 transform hover:scale-110 active:scale-90"
                                                                     data-id="${t.id}" data-slot="${date.getHours()}">
                                                                 <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                             </button>
                                                        </div>
                                                    `;
            }).join('')}
                                            </div>
                                        </td>
                                    `;
        }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Modal portal setup
    const modalPortal = document.getElementById('modal-portal');
    modalPortal.innerHTML = `
        <div id="planner-modal" class="fixed inset-0 bg-secondary/40 hidden z-50 backdrop-blur-md pointer-events-auto items-center justify-center overflow-y-auto">
            <div class="min-h-screen w-full flex items-center justify-center p-4">
                <div class="bg-card rounded-[2rem] shadow-soft w-full max-w-md p-10 transform transition-all scale-95 opacity-0 text-center relative" id="planner-modal-content">
                    <button id="close-planner-modal" class="absolute top-8 right-10 text-dim hover:text-main text-2xl transition-colors">&times;</button>

                    <div class="mb-10">
                        <h3 id="planner-modal-title" class="text-2xl font-bold text-main tracking-tight">Assign Task</h3>
                        <p class="text-[10px] font-black text-dim uppercase tracking-[0.3em] mt-3">Planning Registry</p>
                    </div>

                    <form id="planner-form" class="space-y-6">
                        <input type="hidden" name="id">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Team Member</label>
                            <select name="resource_id" required class="w-full bg-app border-none rounded-2xl py-4 px-6 text-center text-main font-bold cursor-pointer appearance-none">
                                ${resources.map(r => `<option value="${r}">${r}</option>`).join('')}
                            </select>
                        </div>

                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Project</label>
                            <select name="project_id" required class="w-full bg-app border-none rounded-2xl py-4 px-6 text-center text-main font-bold cursor-pointer appearance-none">
                                <option value="">Select Target...</option>
                                ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                            </select>
                        </div>

                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Description</label>
                            <input type="text" name="title" required placeholder="What are we achieving?" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold text-main">
                        </div>

                        <div id="date-range-fields" class="${currentScale === 'day' ? 'hidden' : 'grid'} grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Start Date</label>
                                <input type="date" name="start_date" class="w-full text-center py-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main">
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">End Date</label>
                                <input type="date" name="end_date" class="w-full text-center py-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main">
                            </div>
                        </div>

                        <div id="day-time-fields" class="${currentScale === 'day' ? 'space-y-6' : 'hidden'}">
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Activity Date</label>
                                <input type="date" name="day_date" class="w-full text-center py-4 bg-app border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-[11px] font-bold text-main">
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-dim uppercase tracking-widest block text-left ml-2">Hourly Slots (e.g. 8,9,10,13,14)</label>
                                <input type="text" name="slots" placeholder="8, 9, 10, 13, 14" class="w-full text-center py-4 bg-app border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold text-main">
                            </div>
                        </div>

                        <div class="pt-6">
                            <button type="submit" id="commit-btn" class="w-full h-16 bg-primary hover:bg-primary-dark text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 py-5 leading-none">
                                Commit Assignment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = modalPortal.querySelector('#planner-modal');
    const modalContent = modalPortal.querySelector('#planner-modal-content');
    const form = modalPortal.querySelector('#planner-form');
    const modalTitle = modalPortal.querySelector('#planner-modal-title');
    const commitBtn = modalPortal.querySelector('#commit-btn');

    const openModal = (task = null) => {
        if (task) {
            modalTitle.innerText = 'Edit Assignment';
            commitBtn.innerText = 'Update Assignment';
            form.id.value = task.id;
            form.resource_id.value = task.resource_id;
            form.project_id.value = task.project_id;
            form.title.value = task.title;

            // Split ISO strings for modal fields
            // Helper for local YYYY-MM-DD
            const toDateStr = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const sd = new Date(task.start_date);
            const ed = new Date(task.end_date || task.start_date);

            if (currentScale === 'day') {
                form.day_date.value = toDateStr(sd);
                form.slots.value = task.slots || '';
            } else {
                form.start_date.value = toDateStr(sd);
                form.end_date.value = toDateStr(ed);
            }
        } else {
            modalTitle.innerText = 'Assign Task';
            commitBtn.innerText = 'Commit Assignment';
            form.reset();
            form.id.value = '';

            // Default to today using local date
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            if (currentScale === 'day') {
                form.day_date.value = todayStr;
                form.slots.value = "8,9,10,11,13,14,15";
            } else {
                form.start_date.value = todayStr;
                form.end_date.value = todayStr;
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    };

    const closeModal = () => {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            form.reset();
        }, 200);
    };

    container.querySelector('#add-task-btn').onclick = () => openModal();
    modalPortal.querySelector('#close-planner-modal').onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());

        // Reconstruct ISO strings from split fields
        if (currentScale === 'day') {
            if (!data.slots || data.slots.trim() === '') {
                alert('Planning requires at least one hour slot.');
                return;
            }
            data.start_date = `${data.day_date}T00:00:00`;
            data.end_date = `${data.day_date}T23:59:59`;
            // slots already in data from the text input
        } else {
            // Non-day views default to workday block
            if (data.start_date && data.start_date.length === 10) {
                data.start_date = `${data.start_date}T08:00:00`;
                data.end_date = `${data.end_date}T16:00:00`;
            }
        }

        // Cleanup temporary fields so they don't bloat the DB
        delete data.day_date;
        delete data.start_time;
        delete data.end_time;

        try {
            await api.post('planner.php', data);
            const updated = await api.get('planner.php');
            store.update('tasks', updated);
            closeModal();
            refreshView();
        } catch (err) {
            alert('Save failed');
        }
    };

    container.addEventListener('click', async (e) => {
        if (e.target.closest('#prev-time')) {
            timeOffset--;
            refreshView();
            return;
        }
        if (e.target.closest('#next-time')) {
            timeOffset++;
            refreshView();
            return;
        }
        if (e.target.closest('#today-time')) {
            timeOffset = 0;
            refreshView();
            return;
        }

        const taskCard = e.target.closest('.task-card');
        if (taskCard && !e.target.closest('.delete-task-btn') && !e.target.closest('.remove-slot-btn')) {
            const id = taskCard.dataset.id;
            const task = tasks.find(t => t.id == id);
            if (task) openModal(task);
            return;
        }

        const toggle = e.target.closest('.scale-toggle');
        if (toggle) {
            currentScale = toggle.dataset.scale;
            timeOffset = 0;
            refreshView();
            return;
        }

        if (e.target.closest('.delete-task-btn')) {
            const id = e.target.closest('.delete-task-btn').dataset.id;
            if (confirm('Erase assignment?')) {
                await api.delete(`planner.php?id=${id}`);
                const updated = await api.get('planner.php');
                store.update('tasks', updated);
                refreshView();
            }
            return;
        }

        if (e.target.closest('.remove-slot-btn')) {
            const id = e.target.closest('.remove-slot-btn').dataset.id;
            const slotToRemove = parseInt(e.target.closest('.remove-slot-btn').dataset.slot);
            const task = tasks.find(t => t.id == id);

            if (task && task.slots) {
                let slots = task.slots.split(',').map(s => parseInt(s.trim()));
                if (slots.length <= 1) {
                    alert("Cannot remove the last remaining block. Delete the whole task if finished.");
                    return;
                }

                const newSlots = slots.filter(s => s !== slotToRemove).join(',');
                await api.post('planner.php', { ...task, slots: newSlots });
                const updated = await api.get('planner.php');
                store.update('tasks', updated);
                refreshView();
            }
            return;
        }
    });

    // Custom Tooltip Logic
    let tooltipEl = document.getElementById('chomper-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'chomper-tooltip';
        tooltipEl.className = 'chomper-tooltip';
        document.body.appendChild(tooltipEl);
    }

    container.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            tooltipEl.innerHTML = target.dataset.tooltip;
            tooltipEl.classList.add('visible');
        }
    });

    container.addEventListener('mousemove', (e) => {
        if (tooltipEl.classList.contains('visible')) {
            const padding = 15;
            let x = e.clientX - (tooltipEl.offsetWidth / 2);
            let y = e.clientY - tooltipEl.offsetHeight - padding;

            // Constrain to window
            if (x < 10) x = 10;
            if (x + tooltipEl.offsetWidth > window.innerWidth - 10) x = window.innerWidth - tooltipEl.offsetWidth - 10;

            tooltipEl.style.left = `${x}px`;
            tooltipEl.style.top = `${y}px`;
        }
    });

    container.addEventListener('mouseout', (e) => {
        if (e.target.closest('[data-tooltip]')) {
            tooltipEl.classList.remove('visible');
        }
    });

    const filterDropdown = container.querySelector('#project-filter');
    if (filterDropdown) {
        filterDropdown.onchange = (e) => {
            projectFilter = e.target.value;
            refreshView();
        };
    }

    async function refreshView() {
        const app = document.getElementById('app');
        const content = await renderPlanner();
        app.innerHTML = '';
        app.appendChild(content);
    }

    return container;
}
