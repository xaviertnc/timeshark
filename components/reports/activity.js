import { SearchableSelect } from '../searchable-select.js';

/**
 * components/reports/activity.js
 * 
 * Renders a GitHub-style Activity Grid displaying hours logged over the past year or a specific year.
 *
 * Last 3 version commits:
 * @version 3.2 - CHORE - 31 Jul 2026 - Relocated from planner/planner-view-activity.js, renamed to ReportsActivity
 */

let activityProjectFilter = JSON.parse(localStorage.getItem('timeshark_reports_activity_filter') || '[]');
let activityYear = localStorage.getItem('timeshark_reports_activity_year') || 'rolling';

export const ReportsActivity = {
    render(container, data) {
        if (typeof container === 'string') container = document.getElementById(container);
        container.innerHTML = '';
        
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        let startDate, endDate;
        if (activityYear === 'rolling') {
            endDate = new Date(today);
            startDate = new Date(endDate);
            startDate.setFullYear(startDate.getFullYear() - 1);
            // Go back to Sunday
            startDate.setDate(startDate.getDate() - startDate.getDay());
            startDate.setHours(0, 0, 0, 0);
        } else {
            const y = parseInt(activityYear);
            startDate = new Date(y, 0, 1, 0, 0, 0);
            startDate.setDate(startDate.getDate() - startDate.getDay()); // Go back to Sunday of the first week
            endDate = new Date(y, 11, 31, 23, 59, 59);
        }
        
        // Build map of dates
        const dateMap = {}; // 'YYYY-MM-DD' => { totalHours: 0, projects: {} }
        const days = [];
        
        let curr = new Date(startDate);
        while (curr <= endDate) {
            const dateStr = curr.toISOString().split('T')[0];
            dateMap[dateStr] = { totalHours: 0, projects: {} };
            days.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }
        
        const isFiltered = Array.isArray(activityProjectFilter) ? activityProjectFilter.length > 0 : (activityProjectFilter && activityProjectFilter !== 'all');

        // Aggregate hours applying its own local filter and extract available years
        let totalHoursAll = 0;
        const availableYears = new Set();
        availableYears.add(today.getFullYear());

        data.rows.forEach(row => {
            if (row.entries) {
                row.entries.forEach(entry => {
                    const entryStart = new Date(entry.start_time);
                    availableYears.add(entryStart.getFullYear());

                    const pid = entry.project_id;
                    if (isFiltered && !activityProjectFilter.includes(String(pid))) return;
                    
                    const start = new Date(entry.start_time);
                    if (start >= startDate && start <= endDate) {
                        const end = entry.end_time ? new Date(entry.end_time) : new Date();
                        const hours = (end - start) / (1000 * 60 * 60);
                        const dateStr = start.toISOString().split('T')[0];
                        
                        if (dateMap[dateStr] !== undefined) {
                            dateMap[dateStr].totalHours += hours;
                            totalHoursAll += hours;
                            
                            if (pid) {
                                if (!dateMap[dateStr].projects[pid]) dateMap[dateStr].projects[pid] = 0;
                                dateMap[dateStr].projects[pid] += hours;
                            }
                        }
                    }
                });
            }
        });

        const sortedYears = Array.from(availableYears).sort((a,b) => b - a);

        // Group into weeks
        const weeks = [];
        let currentWeek = [];
        days.forEach(d => {
            currentWeek.push(d);
            if (d.getDay() === 6) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });
        if (currentWeek.length > 0) {
             weeks.push(currentWeek);
        }
        
        // Render Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'w-full animate-fade-in mb-8';
        
        const header = document.createElement('div');
        header.className = 'flex flex-col md:flex-row md:items-end justify-between mb-6 px-2 gap-4 w-full';
        
        let yearOptions = '<option value="rolling" ' + (activityYear === 'rolling' ? 'selected' : '') + '>Rolling Year</option>';
        sortedYears.forEach(y => {
            yearOptions += '<option value="' + y + '" ' + (activityYear === String(y) ? 'selected' : '') + '>' + y + '</option>';
        });

        header.innerHTML = '<div>' +
                           '<h2 class="text-[10px] font-black text-dim uppercase tracking-[0.4em] mb-2 opacity-50">Activity</h2>' +
                           '<h1 class="text-3xl font-light text-main tracking-tight flex flex-wrap items-center gap-4">' +
                           '<span>Activity <span class="font-bold italic text-primary">Matrix.</span></span>' +
                           '<span class="text-sm text-dim font-bold tabular-nums bg-white/5 px-2 py-1 rounded-md">' + totalHoursAll.toFixed(1) + ' hrs</span>' +
                           '</h1></div>' +
                           '<div class="flex items-center gap-2 w-full md:w-auto">' +
                           '<select id="activity-year-select" class="h-9 rounded-lg bg-highlight border border-soft hover:border-primary/30 text-main outline-none focus:ring-1 focus:ring-primary/20 pl-3 pr-8 transition-all text-[11px] font-bold tracking-widest cursor-pointer w-[140px] appearance-none shrink-0" style="background-image: url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E\'); background-repeat: no-repeat; background-position: right .75rem top 50%; background-size: .65rem auto;">' + yearOptions + '</select>' +
                           '<div id="activity-project-filter-container" class="w-[200px] h-9 relative z-10 shrink-0"></div>' +
                           '</div>';
        
        // Match the bounding box of analytics strictly
        const scrollBounds = document.createElement('div');
        scrollBounds.className = 'w-full overflow-x-auto overflow-y-hidden';
        
        const gridContainer = document.createElement('div');
        gridContainer.className = 'w-full py-6 pr-6 pl-10 border border-white/5 rounded-xl bg-card/10 overflow-hidden flex flex-col relative';
        
        // Months Label Row
        const monthAxisRow = document.createElement('div');
        monthAxisRow.className = 'flex text-[10px] text-dim font-medium relative h-5 pr-3 ml-[26px]';
        
        const labelsToRender = [];
        let curMonth = -1;
        weeks.forEach((week, i) => {
            const firstDay = week.find(d => d);
            if (!firstDay) return;
            if (firstDay.getMonth() !== curMonth) {
                curMonth = firstDay.getMonth();
                labelsToRender.push({ i, monthName: firstDay.toLocaleString('default', { month: 'short' }) });
            }
        });

        // Resolve overlap (skip first label if it's too close to the second)
        const finalLabels = [];
        for (let idx = 0; idx < labelsToRender.length; idx++) {
            const curr = labelsToRender[idx];
            if (idx === 0 && labelsToRender.length > 1 && (labelsToRender[1].i - curr.i) < 3) {
                continue; // Skip the first month label if it's bunched up
            }
            finalLabels.push(curr);
        }

        finalLabels.forEach(({ i, monthName }) => {
            const label = document.createElement('div');
            label.className = 'absolute whitespace-nowrap';
            label.style.left = (i * 15) + 'px';
            label.textContent = monthName;
            monthAxisRow.appendChild(label);
        });

        const flexWrapper = document.createElement('div');
        flexWrapper.className = 'flex gap-2 shrink-0';
        // Explicitly size inner grid so footer aligns perfectly
        flexWrapper.style.width = (weeks.length * 15 + 40) + 'px';

        // Y Axis Labels
        const yAxisHtml = '<div class="flex flex-col gap-1 pr-1 text-[9px] text-dim font-medium mt-[1px] w-[22px] shrink-0">' +
                          '<div class="h-[11px]"></div>' +
                          '<div class="h-[11px] leading-none">Mon</div>' +
                          '<div class="h-[11px]"></div>' +
                          '<div class="h-[11px] leading-none">Wed</div>' +
                          '<div class="h-[11px]"></div>' +
                          '<div class="h-[11px] leading-none">Fri</div>' +
                          '<div class="h-[11px]"></div></div>';

        // Grid HTML
        let html = '<div class="flex gap-1">';
        weeks.forEach((week, i) => {
            let colHtml = '<div class="flex flex-col gap-1">';
            // Fill missing days at the start of the first week or end of the last week
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const day = week[dayIndex];
                if (!day) {
                    colHtml += '<div class="w-[11px] h-[11px] rounded-[2px] bg-transparent"></div>';
                    continue;
                }
                const dateStr = day.toISOString().split('T')[0];
                const dayData = dateMap[dateStr] || { totalHours: 0, projects: {} };
                const hrs = dayData.totalHours;
                
                let colorClass = 'bg-[#1b1f23] border border-white/5'; 
                let inlineStyle = '';
                
                if (hrs > 0) {
                    if (isFiltered) {
                        // Find peak project
                        let maxProject = null;
                        let maxProjectHrs = 0;
                        for (const pid in dayData.projects) {
                            if (dayData.projects[pid] > maxProjectHrs) {
                                maxProjectHrs = dayData.projects[pid];
                                maxProject = pid;
                            }
                        }
                        
                        if (maxProject) {
                            const pData = data.projects.find(p => String(p.id) === String(maxProject));
                            if (pData && pData.color) {
                                colorClass = '';
                                let alpha = 0.4;
                                if (hrs >= 6) alpha = 1.0;
                                else if (hrs >= 4) alpha = 0.8;
                                else if (hrs >= 2) alpha = 0.6;
                                
                                let hex = pData.color;
                                if (hex.startsWith('#')) {
                                    if(hex.length === 4) hex = '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
                                    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
                                    inlineStyle = 'background-color: ' + hex + a + '; border: none;';
                                } else {
                                    inlineStyle = 'background-color: ' + pData.color + '; opacity: ' + alpha + '; border: none;';
                                }
                            } else {
                                if (hrs < 2) colorClass = 'bg-[#0e4429]';
                                else if (hrs < 4) colorClass = 'bg-[#006d32]';
                                else if (hrs < 6) colorClass = 'bg-[#26a641]';
                                else colorClass = 'bg-[#39d353]';
                            }
                        }
                    } else {
                        if (hrs < 2) colorClass = 'bg-[#0e4429]';
                        else if (hrs < 4) colorClass = 'bg-[#006d32]';
                        else if (hrs < 6) colorClass = 'bg-[#26a641]';
                        else colorClass = 'bg-[#39d353]';
                    }
                }
                
                colHtml += '<div class="w-[11px] h-[11px] rounded-[2px] cursor-pointer transition-transform hover:scale-125 hover:z-10 relative ' + colorClass + '" style="' + inlineStyle + '" title="' + hrs.toFixed(1) + ' hrs on ' + dateStr + '"></div>';
            }
            colHtml += '</div>';
            html += colHtml;
        });
        html += '</div>';
        
        flexWrapper.innerHTML = yAxisHtml + html;
        
        // Legends
        const footer = document.createElement('div');
        footer.className = 'flex items-center justify-between mt-4';
        // Bound the legend width exactly to the grid width for perfect alignment
        footer.style.width = (weeks.length * 15 + 30) + 'px';
        
        footer.innerHTML = '<div class="text-[10px] text-dim ml-[24px]">' + (isFiltered ? 'Color mapping: Dominant project color' : 'Learn how we count contributions') + '</div>' +
                           '<div class="flex items-center gap-1 text-[10px] text-dim">' +
                           '<span class="mr-1">Less</span>' +
                           '<div class="w-[11px] h-[11px] rounded-[2px] bg-[#1b1f23] border border-white/5"></div>' +
                           (isFiltered ? '<div class="w-[11px] h-[11px] rounded-[2px] bg-white/20"></div><div class="w-[11px] h-[11px] rounded-[2px] bg-white/40"></div><div class="w-[11px] h-[11px] rounded-[2px] bg-white/60"></div><div class="w-[11px] h-[11px] rounded-[2px] bg-white"></div>' : 
                                         '<div class="w-[11px] h-[11px] rounded-[2px] bg-[#0e4429]"></div><div class="w-[11px] h-[11px] rounded-[2px] bg-[#006d32]"></div><div class="w-[11px] h-[11px] rounded-[2px] bg-[#26a641]"></div><div class="w-[11px] h-[11px] rounded-[2px] bg-[#39d353]"></div>'
                           ) +
                           '<span class="ml-1">More</span></div>';
        
        gridContainer.appendChild(monthAxisRow);
        gridContainer.appendChild(flexWrapper);
        gridContainer.appendChild(footer);

        scrollBounds.appendChild(gridContainer);
        wrapper.appendChild(header);
        wrapper.appendChild(scrollBounds);
        container.appendChild(wrapper);

        // Year Selector listener
        const yearSelect = container.querySelector('#activity-year-select');
        yearSelect.addEventListener('change', (e) => {
            activityYear = e.target.value;
            localStorage.setItem('timeshark_reports_activity_year', activityYear);
            ReportsActivity.render(container, data);
        });

        // Render its own SearchableSelect filtering
        setTimeout(() => {
            const filterContainer = container.querySelector('#activity-project-filter-container');
            if (filterContainer && data.projects) {
                SearchableSelect.render(filterContainer, data.projects.filter(p => !p.hide_from_gantt), {
                    value: activityProjectFilter,
                    multiple: true,
                    placeholder: 'Global View',
                    allLabel: 'All Activity',
                    size: 'small',
                    clearable: true,
                    alignTarget: '#activity-project-filter-container',
                    onChange: (newVal) => {
                        activityProjectFilter = newVal;
                        localStorage.setItem('timeshark_reports_activity_filter', JSON.stringify(activityProjectFilter));
                        ReportsActivity.render(container, data);
                    }
                });
            }
        }, 50);
    }
};
