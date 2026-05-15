/**
 * components/planner/planner-view-heatmap.js
 * 
 * Renders a Workload Heatmap showing resource utilization over time.
 * Calculates total time logged + estimated task time per day.
 * Highlights: <6h (Safe, Green), 6-8h (Near Capacity, Amber), >8h (Overloaded, Red)
 */

export const PlannerHeatmap = {
    render(container, data, config, today, currentScale) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = '';
        container.className = 'w-full h-full flex flex-col bg-app relative';

        // 1. Calculate time per resource per column
        const isYearView = config.type === 'year';
        const cols = isYearView ? config.groups : config.dates;

        // Collect all resources
        const rows = data.rows || [];
        
        // Prepare heat grid: grid[resourceIndex][colIndex] = { hours: 0 }
        const grid = rows.map(() => cols.map(() => ({ hours: 0 })));

        rows.forEach((row, rIdx) => {
            // Add time entries
            row.entries.forEach(e => {
                if (!e.start_time) return;
                const start = new Date(e.start_time);
                const end = e.end_time ? new Date(e.end_time) : new Date();
                const hrs = (end - start) / (1000 * 60 * 60);
                
                cols.forEach((col, cIdx) => {
                    if (isYearView) {
                        if (start.getFullYear() === config.startDate.getFullYear() && start.getMonth() === col.month) {
                            grid[rIdx][cIdx].hours += hrs;
                        }
                    } else {
                        if (start.toDateString() === col.toDateString()) {
                            grid[rIdx][cIdx].hours += hrs;
                        }
                    }
                });
            });

            // Add estimated task time (distributed evenly across task duration)
            row.tasks.forEach(t => {
                if (!t.start_date || t.status === 'done') return; // Skip done or unscheduled
                const start = new Date(t.start_date);
                const end = t.end_date ? new Date(t.end_date) : new Date(start.getTime() + 30 * 60000);
                
                let totalDaysSpan = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
                let totalHrs = Math.min((end - start) / (1000 * 60 * 60), 8 * totalDaysSpan); // Cap at 8h per day for estimation max
                if (totalHrs <= 0) totalHrs = 0.5; // minimum 30 min mapping

                const hrsPerDay = totalHrs / totalDaysSpan;

                cols.forEach((col, cIdx) => {
                    if (isYearView) {
                        // Rough overlap check for year view
                        if (start.getFullYear() <= config.startDate.getFullYear() && end.getFullYear() >= config.startDate.getFullYear()) {
                            if (start.getMonth() <= col.month && end.getMonth() >= col.month) {
                                // Add rough monthly hours constraint (assume 20 working days)
                                grid[rIdx][cIdx].hours += hrsPerDay * 20; 
                            }
                        }
                    } else {
                        // For day/week/month check if 'col' date falls within task date range
                        const cDay = new Date(col.getFullYear(), col.getMonth(), col.getDate());
                        const sDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                        const eDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                        
                        if (cDay >= sDay && cDay <= eDay) {
                            if (cDay.getDay() !== 0 && cDay.getDay() !== 6) { // skip weekends
                                grid[rIdx][cIdx].hours += hrsPerDay;
                            }
                        }
                    }
                });
            });
        });

        // 2. Render Header (Dates)
        const leftWidth = 180;
        const totalWidth = isYearView ? cols.length * 80 : cols.length * 60; // Fixed col widths for heatmap

        const header = document.createElement('div');
        header.className = 'flex sticky top-0 z-20 bg-app border-b border-white/5';
        header.style.minWidth = `${leftWidth + totalWidth}px`;

        let headerHtml = `
            <div class="flex-shrink-0 px-4 flex items-center font-black text-dim text-[10px] uppercase tracking-[0.2em] border-r border-white/5 sticky left-0 bg-app/90 backdrop-blur z-30" style="width: ${leftWidth}px">
                RESOURCE
            </div>
            <div class="flex relative h-10">
        `;

        cols.forEach(c => {
            const label = isYearView ? c.label : c.getDate();
            const subLabel = isYearView ? '' : c.toLocaleDateString('en-US', { weekday: 'narrow' });
            const isToday = !isYearView && c.toDateString() === today.toDateString();
            
            headerHtml += `
                <div class="flex-shrink-0 border-r border-white/5 flex flex-col items-center justify-center ${isToday ? 'bg-primary/10' : ''}" style="width: ${isYearView ? 80 : 60}px">
                    <span class="text-[11px] font-black ${isToday ? 'text-primary' : 'text-main'}">${label}</span>
                    <span class="text-[8px] font-black uppercase text-dim/60">${subLabel}</span>
                </div>
            `;
        });
        headerHtml += `</div>`;
        header.innerHTML = headerHtml;
        container.appendChild(header);

        // 3. Render Body
        const body = document.createElement('div');
        body.className = 'flex-grow overflow-auto relative';
        body.style.minWidth = `${leftWidth + totalWidth}px`;
        
        let bodyHtml = '';
        rows.forEach((row, idx) => {
            bodyHtml += `<div class="flex border-b border-white/5 hover:bg-white/[0.02]">
                <div class="flex-shrink-0 flex items-center px-4 sticky left-0 bg-app/90 backdrop-blur z-10 border-r border-white/5" style="width: ${leftWidth}px; height: 48px;">
                    <div class="w-6 h-6 rounded-md bg-card border border-white/5 flex items-center justify-center font-black text-[10px] text-primary mr-3">${row.resource.substring(0,1).toUpperCase()}</div>
                    <span class="text-xs font-bold text-main/90 truncate">${row.resource}</span>
                </div>
                <div class="flex">
            `;

            cols.forEach((col, cIdx) => {
                const hours = grid[idx][cIdx].hours;
                
                // Determine capacity threshold
                let colorClass = 'bg-transparent';
                let textClass = 'text-dim/20';
                let thresholdHours = isYearView ? 160 : 8; // monthly vs daily

                if (hours > 0) {
                    if (hours <= thresholdHours * 0.75) {
                        colorClass = 'bg-green-500/20 hover:bg-green-500/30';
                        textClass = 'text-green-400 font-bold';
                    } else if (hours <= thresholdHours) {
                        colorClass = 'bg-amber-500/20 hover:bg-amber-500/30';
                        textClass = 'text-amber-400 font-bold';
                    } else {
                        colorClass = 'bg-red-500/30 hover:bg-red-500/40 relative overflow-hidden';
                        textClass = 'text-red-400 font-black';
                    }
                }

                bodyHtml += `
                    <div class="flex-shrink-0 border-r border-white/5 flex items-center justify-center group transition-colors cursor-pointer ${colorClass}" style="width: ${isYearView ? 80 : 60}px;" title="${hours.toFixed(1)}h assigned">
                        ${hours > thresholdHours ? '<div class="absolute inset-0 pattern-diagonal-lines opacity-20 pointer-events-none"></div>' : ''}
                        <span class="text-[10px] ${textClass} relative z-10">${hours > 0 ? hours.toFixed(1) + 'h' : '-'}</span>
                    </div>
                `;
            });

            bodyHtml += `</div></div>`;
        });

        body.innerHTML = bodyHtml;
        container.appendChild(body);
        
        // Add Legend
        const legend = document.createElement('div');
        legend.className = 'absolute bottom-4 right-4 bg-card/90 backdrop-blur border border-white/10 rounded-lg p-2 px-3 flex gap-4 shadow-xl z-40';
        legend.innerHTML = `
            <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-green-500/30"></div><span class="text-[9px] font-bold text-main/60 uppercase">Healthy (<75%)</span></div>
            <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-amber-500/30"></div><span class="text-[9px] font-bold text-main/60 uppercase">Near Cap</span></div>
            <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-red-500/40 pattern-diagonal-lines relative overflow-hidden"><div class="absolute inset-0 bg-red-500/20"></div></div><span class="text-[9px] font-bold text-main/60 uppercase">Overloaded</span></div>
        `;
        container.appendChild(legend);
    }
};
