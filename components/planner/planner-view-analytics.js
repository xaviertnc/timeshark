/**
 * components/planner/planner-view-analytics.js
 * 
 * Renders an Analytics view including a Burnup chart and basic stats.
 */

export const PlannerAnalytics = {
    render(container, data, config, today, projectFilter) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = '';
        container.className = 'w-full h-full p-6 bg-app overflow-y-auto custom-scrollbar flex flex-col gap-6';

        const allTasks = [];
        if (data.backlog) allTasks.push(...data.backlog);
        if (data.rows) {
            data.rows.forEach(row => {
                if (row.tasks) allTasks.push(...row.tasks);
            });
        }

        // Basic Stats
        const totalTasks = allTasks.length;
        const doneTasks = allTasks.filter(t => t.status === 'done').length;
        const inProgressTasks = allTasks.filter(t => t.status !== 'done' && t.progress > 0).length;
        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        // Burnup Data Calculation
        // Iterate through config.dates (or generate past 14 days if not available)
        const dates = config.dates || [];
        const burnupData = [];
        let cumTotal = 0;
        let cumDone = 0;

        if (dates.length > 0) {
            dates.forEach(d => {
                // Find tasks created up to this date
                const dTime = d.getTime();
                const tasksUntilNow = allTasks.filter(t => {
                    const start = t.start_date ? new Date(t.start_date).getTime() : 0;
                    return start > 0 && start <= dTime + 86400000; 
                }).length;

                const doneUntilNow = allTasks.filter(t => {
                    if (t.status !== 'done') return false;
                    const comp = t.completed_at ? new Date(t.completed_at).getTime() : (t.start_date ? new Date(t.start_date).getTime() : 0);
                    return comp > 0 && comp <= dTime + 86400000;
                }).length;

                burnupData.push({
                    date: d,
                    total: tasksUntilNow,
                    done: doneUntilNow
                });
            });
        }

        // Draw Burnup Chart HTML/CSS
        let chartHtml = '';
        if (burnupData.length > 0) {
            const maxVal = Math.max(...burnupData.map(d => d.total), 10);
            
            const bars = burnupData.map(d => {
                const totalHp = (d.total / maxVal) * 100;
                const doneHp = d.total > 0 ? (d.done / maxVal) * 100 : 0;
                return `
                    <div class="flex-1 flex flex-col justify-end items-center group relative h-[200px]">
                        <div class="absolute bottom-0 w-3/4 max-w-[20px] bg-white/10 rounded-t-sm" style="height: ${totalHp}%;"></div>
                        <div class="absolute bottom-0 w-3/4 max-w-[20px] bg-primary rounded-t-sm z-10" style="height: ${doneHp}%;"></div>
                        
                        <!-- Tooltip -->
                        <div class="absolute bottom-full mb-2 bg-card border border-white/10 px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap">
                            <div class="text-[9px] text-dim/60 font-black uppercase mb-1">${d.date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                            <div class="text-[10px] text-main"><span class="text-primary font-bold">${d.done}</span> / ${d.total} Tasks</div>
                        </div>
                    </div>
                `;
            }).join('');

            chartHtml = `
                <div class="w-full bg-card/50 border border-white/5 rounded-xl p-6">
                    <h3 class="text-xs font-black uppercase tracking-widest text-dim mb-6">Delivery Burnup</h3>
                    <div class="flex items-end h-[200px] border-b border-white/10 w-full relative">
                        ${bars}
                    </div>
                    <div class="flex justify-between mt-3 px-2 text-[9px] font-bold text-dim/40 uppercase tracking-widest">
                        <span>${burnupData[0].date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                        <span>${burnupData[burnupData.length-1].date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                    </div>
                </div>
            `;
        } else {
            chartHtml = `<div class="p-8 text-center text-dim/40 font-bold text-xs">No dates configured for analytics in this scale.</div>`;
        }


        container.innerHTML = `
            <div class="grid grid-cols-4 gap-4 mb-2 shrink-0">
                <div class="bg-card/50 border border-white/5 rounded-xl p-5 flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 mb-2">Total Tasks</span>
                    <span class="text-3xl font-light text-main">${totalTasks}</span>
                </div>
                <div class="bg-card/50 border border-white/5 rounded-xl p-5 flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 mb-2">Completed</span>
                    <span class="text-3xl font-light text-primary">${doneTasks}</span>
                </div>
                <div class="bg-card/50 border border-white/5 rounded-xl p-5 flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 mb-2">In Progress</span>
                    <span class="text-3xl font-light text-amber-500">${inProgressTasks}</span>
                </div>
                <div class="bg-card/50 border border-white/5 rounded-xl p-5 flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 mb-2">Completion Rate</span>
                    <div class="flex items-end gap-2">
                        <span class="text-3xl font-light ${completionRate >= 80 ? 'text-green-500' : 'text-main'}">${completionRate}%</span>
                    </div>
                </div>
            </div>
            
            ${chartHtml}
        `;
    }
};
