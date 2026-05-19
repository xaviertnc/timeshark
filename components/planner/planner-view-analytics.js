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

        const totalTasks = allTasks.length;
        const doneTasks = allTasks.filter(t => t.status === 'done').length;
        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
        
        const dates = config.dates || [];
        
        // Deltas Calculation
        let newDeltasHtml = '';
        let completedDeltasHtml = '';
        
        let currNew = 0;
        let currComp = 0;
        let activeTasks = 0;
        
        if (dates.length > 0) {
            const startD = dates[0].getTime();
            const endD = dates[dates.length - 1].getTime() + 86400000 - 1; 
            const duration = endD - startD;
            
            const prevStartD = startD - duration - 1;
            const prevEndD = startD - 1;

            currNew = allTasks.filter(t => {
                const s = t.start_date ? new Date(t.start_date).getTime() : 0;
                return s >= startD && s <= endD;
            }).length;
            const prevNew = allTasks.filter(t => {
                const s = t.start_date ? new Date(t.start_date).getTime() : 0;
                return s >= prevStartD && s <= prevEndD;
            }).length;
            const newDelta = currNew - prevNew;
            
            currComp = allTasks.filter(t => {
                const c = t.completed_at ? new Date(t.completed_at).getTime() : (t.start_date ? new Date(t.start_date).getTime() : 0);
                return t.status === 'done' && c >= startD && c <= endD;
            }).length;
            const prevComp = allTasks.filter(t => {
                const c = t.completed_at ? new Date(t.completed_at).getTime() : (t.start_date ? new Date(t.start_date).getTime() : 0);
                return t.status === 'done' && c >= prevStartD && c <= prevEndD;
            }).length;
            const compDelta = currComp - prevComp;
            
            activeTasks = allTasks.filter(t => {
                const s = t.start_date ? new Date(t.start_date).getTime() : 0;
                const c = t.completed_at ? new Date(t.completed_at).getTime() : 0;
                if (s > endD) return false;
                if (c > 0 && c < startD) return false;
                return t.status === 'doing' || (t.status === 'todo' && t.progress > 0 && t.progress < 100);
            }).length;
            
            newDeltasHtml = `
                    <div class="mt-auto pt-3 border-t border-white/5 flex flex-col gap-1.5">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim/50">Compared to prior period</span>
                        <span class="text-[10px] font-bold uppercase tracking-widest ${newDelta > 0 ? 'text-amber-500' : (newDelta < 0 ? 'text-green-500' : 'text-main')} flex items-center gap-2">
                            ${newDelta > 0 ? `▲ ${Math.abs(newDelta)} more` : (newDelta < 0 ? `▼ ${Math.abs(newDelta)} fewer` : `― Same`)}
                        </span>
                    </div>
            `;
            
            completedDeltasHtml = `
                    <div class="mt-auto pt-3 border-t border-white/5 flex flex-col gap-1.5">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim/50">Compared to prior period</span>
                        <span class="text-[10px] font-bold uppercase tracking-widest ${compDelta > 0 ? 'text-green-500' : (compDelta < 0 ? 'text-amber-500' : 'text-main')} flex items-center gap-2">
                            ${compDelta > 0 ? `▲ ${Math.abs(compDelta)} more` : (compDelta < 0 ? `▼ ${Math.abs(compDelta)} fewer` : `― Same`)}
                        </span>
                    </div>
            `;
        }

        // Burnup Data Calculation
        // Iterate through config.dates (or generate past 14 days if not available)
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

                const addedToday = allTasks.filter(t => {
                    const start = t.start_date ? new Date(t.start_date).getTime() : 0;
                    return start > dTime && start <= dTime + 86400000; 
                }).length;

                const doneToday = allTasks.filter(t => {
                    if (t.status !== 'done') return false;
                    const comp = t.completed_at ? new Date(t.completed_at).getTime() : (t.start_date ? new Date(t.start_date).getTime() : 0);
                    return comp > dTime && comp <= dTime + 86400000;
                }).length;

                burnupData.push({
                    date: d,
                    total: tasksUntilNow,
                    done: doneUntilNow,
                    addedToday: addedToday,
                    doneToday: doneToday
                });
            });
        }

        // Draw Burnup Chart HTML/CSS
        let chartHtml = '';
        if (burnupData.length > 0) {
            const maxVal = Math.max(...burnupData.map(d => d.total), 10);
            
            const bars = burnupData.map(d => {
                const totalHp = Math.max((d.total / maxVal) * 100, 0);
                const doneHp = d.total > 0 ? Math.max((d.done / maxVal) * 100, 0) : 0;
                
                const addedHp = Math.max((d.addedToday / maxVal) * 100, 0);
                const doneTodayHp = Math.max((d.doneToday / maxVal) * 100, 0);

                return `
                    <div class="flex-1 flex flex-col justify-end items-center group relative h-[200px]">
                        <!-- Total Background Bar (Cumulative) -->
                        <div class="absolute w-3/4 max-w-[20px] bg-white/5 rounded-t-sm transition-all duration-300" style="bottom: 0; height: ${totalHp}%;"></div>
                        <!-- Tasks Added Today (Indicator 'Candle' Top) -->
                        ${addedHp > 0 ? `<div class="absolute w-1/3 max-w-[6px] bg-amber-500/80 rounded-t-sm transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]" style="bottom: ${totalHp - addedHp}%; height: ${addedHp}%;"></div>` : ''}
                        
                        <!-- Done Background Bar (Cumulative) -->
                        <div class="absolute w-3/4 max-w-[20px] bg-primary rounded-t-sm z-10 transition-all duration-300" style="bottom: 0; height: ${doneHp}%;"></div>
                        <!-- Tasks Done Today (Bright 'Candle' Top) -->
                        ${doneTodayHp > 0 ? `<div class="absolute w-1/3 max-w-[6px] bg-green-500/90 rounded-t-sm z-20 transition-all duration-300 shadow-[0_0_8px_rgba(34,197,94,0.4)]" style="bottom: ${doneHp - doneTodayHp}%; height: ${doneTodayHp}%;"></div>` : ''}
                        
                        <!-- Tooltip -->
                        <div class="absolute bottom-full mb-3 bg-card border border-white/10 px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 min-w-[150px]">
                            <div class="text-[9px] text-dim font-black uppercase tracking-widest mb-1.5 border-b border-white/5 pb-1 flex justify-between">
                                <span>${d.date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                            </div>
                            <div class="flex justify-between items-center gap-4 text-[10px] mb-1">
                                <span class="text-white/60 font-bold uppercase">Total Scope:</span>
                                <span class="text-main font-black">${d.total} <span class="text-[8px] text-amber-500/80 ml-1 font-bold">${d.addedToday > 0 ? `(+${d.addedToday})` : ''}</span></span>
                            </div>
                            <div class="flex justify-between items-center gap-4 text-[10px]">
                                <span class="text-primary/70 font-bold uppercase">Completed:</span>
                                <span class="text-primary font-black">${d.done} <span class="text-[8px] text-green-500/90 ml-1 font-bold">${d.doneToday > 0 ? `(+${d.doneToday})` : ''}</span></span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            chartHtml = `
                <div class="w-full bg-card/50 border border-white/5 rounded-xl p-6 relative">
                    <div class="flex items-center justify-between mb-8">
                        <h3 class="text-xs font-black uppercase tracking-widest text-dim">Delivery Burnup</h3>
                        
                        <!-- Chart Legend -->
                        <div class="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-dim/60 flex-wrap justify-end">
                            <div class="flex items-center gap-1.5 opacity-80">
                                <div class="w-2.5 h-2.5 rounded-[2px] bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div> 
                                NEW
                            </div>
                            <div class="flex items-center gap-1.5">
                                <div class="w-2.5 h-2.5 rounded-[2px] bg-white/10 border border-white/5"></div> 
                                TODO
                            </div>
                            <div class="flex items-center gap-1.5 opacity-80 ml-2">
                                <div class="w-2.5 h-2.5 rounded-[2px] bg-green-500/90 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div> 
                                COMPLETED
                            </div>
                            <div class="flex items-center gap-1.5">
                                <div class="w-2.5 h-2.5 rounded-[2px] bg-primary shadow-[0_0_8px_rgba(51,138,129,0.3)]"></div> 
                                DONE
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-end h-[200px] border-b border-light/5 w-full relative pl-10 pr-2">
                        <!-- Y-Axis Labels -->
                        <div class="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[9px] font-bold text-dim/30 py-0 border-r border-white/5 pr-2 items-end">
                            <span class="-mt-2.5">${maxVal}</span>
                            <span class="absolute top-1/2 -translate-y-1/2 right-2">${Math.round(maxVal/2)}</span>
                            <span class="-mb-2.5">0</span>
                        </div>
                        
                        <!-- Grid Lines -->
                        <div class="absolute left-10 right-0 top-0 h-px bg-white/5"></div>
                        <div class="absolute left-10 right-0 top-1/2 h-px bg-white/5"></div>
                        
                        ${bars}
                    </div>
                    <div class="flex justify-between mt-3 px-2 pl-12 text-[9px] font-bold text-dim/40 uppercase tracking-widest">
                        <span>${burnupData[0].date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                        <span>${burnupData[burnupData.length-1].date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                    </div>
                </div>
            `;
        } else {
            chartHtml = `<div class="p-8 text-center text-dim/40 font-bold text-xs">No dates configured for analytics in this scale.</div>`;
        }


        const periodCompletionRatio = currNew > 0 ? Math.round((currComp / currNew) * 100) : (currComp > 0 ? 100 : 0);
        const netScopeChange = currNew - currComp;
        
        container.innerHTML = `
            <div class="grid grid-cols-4 gap-4 mb-4 shrink-0">
                <div class="bg-card/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden shadow-soft">
                    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div>
                        <div class="text-[9px] font-black uppercase tracking-widest text-dim/40 mb-1">Period Activity</div>
                        <div class="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-4 block">Tasks Added</div>
                        <div class="text-5xl font-light text-main mb-6 tracking-tighter">${currNew}</div>
                    </div>
                    ${newDeltasHtml}
                </div>

                <div class="bg-card/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden shadow-soft">
                    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div>
                        <div class="text-[9px] font-black uppercase tracking-widest text-dim/40 mb-1">Period Activity</div>
                        <div class="text-[11px] font-bold uppercase tracking-widest text-primary/80 mb-4 block">Completed</div>
                        <div class="text-5xl font-light text-primary mb-6 tracking-tighter">${currComp}</div>
                    </div>
                    ${completedDeltasHtml}
                </div>

                <div class="bg-card/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden shadow-soft">
                    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div>
                        <div class="text-[9px] font-black uppercase tracking-widest text-dim/40 mb-1">Trajectory</div>
                        <div class="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-4 block">Net Scope Change</div>
                        <div class="text-5xl font-light ${netScopeChange > 0 ? 'text-amber-500' : (netScopeChange < 0 ? 'text-green-500' : 'text-main')} mb-6 tracking-tighter">${netScopeChange > 0 ? '+' : ''}${netScopeChange}</div>
                    </div>
                    <div class="mt-auto pt-3 border-t border-white/5">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim/50 leading-relaxed block">Difference between work added vs work done.</span>
                    </div>
                </div>

                <div class="bg-card/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden shadow-soft">
                    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div>
                        <div class="text-[9px] font-black uppercase tracking-widest text-dim/40 mb-1">State</div>
                        <div class="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-4 block">Total Completion</div>
                        <div class="text-5xl font-light ${completionRate >= 80 ? 'text-green-500' : 'text-main'} mb-6 tracking-tighter">${completionRate}%</div>
                    </div>
                    <div class="mt-auto pt-3 border-t border-white/5">
                        <span class="text-[9px] font-black uppercase tracking-widest text-dim/50 leading-relaxed block">Percentage of total backlog marked as done.</span>
                    </div>
                </div>
            </div>
            
            ${chartHtml}
        `;
    }
};
