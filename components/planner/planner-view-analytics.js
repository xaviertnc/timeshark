/**
 * components/planner/planner-view-analytics.js
 * 
 * Renders an Analytics view including a Burnup chart and basic stats.
 *
 * @version 1.1 - FT - 31 Jul 2026 - Add Burn Rate badge ( added / done ratio for timeframe )
 * @version 1.5 - UPD - 31 Jul 2026 - Burn Rate as signed diff percent ( + green / - red )
 * @version 1.6 - UPD - 31 Jul 2026 - Orange Burn Rate tone when less than 10% negative
 * @version 1.7 - UPD - 31 Jul 2026 - Blue Burn Rate tone when diff within 1% of parity
 */

export const PlannerAnalytics = {
    render(container, data, config, today, projectFilter) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        container.innerHTML = '';
        container.classList.add('flex', 'flex-col', 'w-full', 'h-full');

        const allTasks = [];
        if (data.rows) {
            data.rows.forEach(row => {
                if (row.tasks) allTasks.push(...row.tasks);
            });
        }
        
        const dates = config.dates || [];
        

        // Burnup Data Calculation
        // Iterate through config.dates (or generate past 14 days if not available)
        const burnupData = [];
        let cumTotal = 0;
        let cumDone = 0;

        if (dates.length > 0) {
            const startDFrame = dates[0].getTime();
            
            const baseDoneOffset = allTasks.filter(t => {
                if (t.status !== 'done') return false;
                const comp = t.completed_at ? new Date(t.completed_at).getTime() : (t.start_date ? new Date(t.start_date).getTime() : 0);
                return comp > 0 && comp < startDFrame;
            }).length;

            const getEffectiveStart = (t) => {
                let start = t.start_date ? new Date(t.start_date).getTime() : 0;
                if (t.status === 'done') {
                    const comp = t.completed_at ? new Date(t.completed_at).getTime() : start;
                    if (comp > 0 && (start === 0 || comp < start)) {
                        start = comp;
                    }
                }
                return start;
            };

            // Derive task creation time from its uniqid-based hex ID (first 8 hex chars = unix seconds)
            const getCreatedAt = (t) => {
                if (!t.id || typeof t.id !== 'string') return 0;
                const hexSec = t.id.substring(0, 8);
                const sec = parseInt(hexSec, 16);
                return isNaN(sec) ? 0 : sec * 1000;
            };

            const processingDates = [...dates];

            processingDates.forEach(d => {
                // Find tasks created up to this date
                const dTime = d.getTime();
                
                // Scope = tasks created up to this date (using immutable creation timestamp)
                // Use baseDoneOffset (not baseScopeOffset) so the gap = outstanding work is preserved
                let tasksUntilNow = allTasks.filter(t => {
                    const created = getCreatedAt(t);
                    return created > 0 && created <= dTime + 86400000; 
                }).length - baseDoneOffset;
                if (tasksUntilNow < 0) tasksUntilNow = 0;

                let doneUntilNow = allTasks.filter(t => {
                    if (t.status !== 'done') return false;
                    const comp = t.completed_at ? new Date(t.completed_at).getTime() : (t.start_date ? new Date(t.start_date).getTime() : 0);
                    return comp > 0 && comp <= dTime + 86400000;
                }).length - baseDoneOffset;
                if (doneUntilNow < 0) doneUntilNow = 0;

                const addedToday = allTasks.filter(t => {
                    const created = getCreatedAt(t);
                    return created > dTime && created <= dTime + 86400000;
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

        // Summary Calculations for Timeframe (ADDED, DONE, REMAINING)
        const totalAdded = burnupData.reduce((sum, d) => sum + (d.addedToday || 0), 0);
        const totalDone = burnupData.reduce((sum, d) => sum + (d.doneToday || 0), 0);
        const lastEntry = burnupData.length > 0 ? burnupData[burnupData.length - 1] : null;
        const totalRemaining = lastEntry ? Math.max(0, lastEntry.total - lastEntry.done) : 0;

        const overallSum = totalAdded + totalDone + totalRemaining;
        const addedPct = overallSum > 0 ? Math.round((totalAdded / overallSum) * 100) : 0;
        const donePct = overallSum > 0 ? Math.round((totalDone / overallSum) * 100) : 0;
        const remainingPct = overallSum > 0 ? Math.round((totalRemaining / overallSum) * 100) : 0;

        // Burn Rate: ( completed - added ) / added — positive means tasks are completed faster than they arrive
        const burnRate = totalAdded > 0 ? (totalDone - totalAdded) / totalAdded : null;
        const burnRateLabel = burnRate !== null ? (burnRate > 0 ? '+' : '') + Math.round(burnRate * 100) + '%' : (totalDone > 0 ? '+∞' : '—');
        const burnRateGood = totalDone >= totalAdded;
        const burnRateTone = burnRate !== null && Math.abs(burnRate) < 0.01 ? { box: 'bg-sky-500/10 border-sky-500/20', text: 'text-sky-400' }
            : burnRateGood ? { box: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' }
            : burnRate > -0.1 ? { box: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400' }
            : { box: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' };
        const burnRateIcon = totalDone === totalAdded
            ? '<line x1="5" y1="12" x2="19" y2="12"/>'
            : totalDone > totalAdded
                ? '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'
                : '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>';

        // Draw Burnup Chart HTML/CSS
        let chartHtml = '';
        if (burnupData.length > 0) {
            const maxVal = Math.max(...burnupData.map(d => d.total), 10);
            
            const bars = burnupData.map((d, idx) => {
                const totalHp = Math.max((d.total / maxVal) * 100, 0);
                const doneHp = d.total > 0 ? Math.max((d.done / maxVal) * 100, 0) : 0;
                
                const addedHp = Math.max((d.addedToday / maxVal) * 100, 0);
                const doneTodayHp = Math.max((d.doneToday / maxVal) * 100, 0);

                // Position tooltip to avoid clipping at edges
                const isNearEnd = idx >= burnupData.length - 2;
                const isNearStart = idx <= 1;
                const tooltipAlign = isNearEnd ? 'right-0' : isNearStart ? 'left-0' : 'left-1/2 -translate-x-1/2';

                return `
                    <div class="flex-1 flex flex-col justify-end items-center group relative h-[200px]">
                        <!-- Total Background Bar (Cumulative) -->
                        <div class="absolute w-3/4 max-w-[40px] bg-white/5 rounded-t-sm transition-all duration-300" style="bottom: 0; height: ${totalHp}%;"></div>
                        <!-- Tasks Added Today (Indicator 'Candle' Top) -->
                        ${addedHp > 0 ? `<div class="absolute w-1/3 max-w-[12px] bg-amber-500/80 rounded-t-sm transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]" style="bottom: ${totalHp - addedHp}%; height: ${addedHp}%;"></div>` : ''}
                        
                        <!-- Done Background Bar (Cumulative) -->
                        <div class="absolute w-3/4 max-w-[40px] bg-primary rounded-t-sm z-10 transition-all duration-300" style="bottom: 0; height: ${doneHp}%;"></div>
                        <!-- Tasks Done Today (Bright 'Candle' Top) -->
                        ${doneTodayHp > 0 ? `<div class="absolute w-1/3 max-w-[12px] bg-green-500/90 rounded-t-sm z-20 transition-all duration-300 shadow-[0_0_8px_rgba(34,197,94,0.4)]" style="bottom: ${doneHp - doneTodayHp}%; height: ${doneTodayHp}%;"></div>` : ''}
                        
                        <!-- Tooltip -->
                        <div class="absolute bottom-full mb-3 ${tooltipAlign} bg-card border border-white/10 px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap">
                            <div class="text-[9px] text-dim font-black uppercase tracking-widest mb-1.5 border-b border-white/5 pb-1 flex justify-between">
                                <span>${d.date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                            </div>
                            <div class="flex justify-between items-center gap-4 text-[10px] mb-1">
                                <span class="text-white/60 font-bold uppercase">Scope:</span>
                                <span class="text-main font-black">${d.total} <span class="text-[8px] text-amber-500/80 ml-1 font-bold">${d.addedToday > 0 ? `(+${d.addedToday} added)` : ''}</span></span>
                            </div>
                            <div class="flex justify-between items-center gap-4 text-[10px] mb-1">
                                <span class="text-primary/70 font-bold uppercase">Done:</span>
                                <span class="text-primary font-black">${d.done} <span class="text-[8px] text-green-500/90 ml-1 font-bold">${d.doneToday > 0 ? `(+${d.doneToday} completed)` : ''}</span></span>
                            </div>
                            <div class="flex justify-between items-center gap-4 text-[10px] border-t border-white/5 pt-1">
                                <span class="text-white/30 font-bold uppercase">Remaining:</span>
                                <span class="text-white/40 font-black">${Math.max(d.total - d.done, 0)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            chartHtml = `
                <div class="w-full h-full p-6 lg:p-8 flex flex-col justify-between">
                    <!-- Top Section Header: Title, Mini Pie Chart + Total, Stats Badges, Legend -->
                    <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5 mb-6">
                        <!-- Left Group: Title, Mini Pie Chart, Total, and Single Row Stats -->
                        <div class="flex items-center gap-5 flex-wrap min-w-0">
                            <div>
                                <h3 class="text-xs font-black uppercase tracking-widest text-dim">Delivery Burnup</h3>
                                <p class="text-[10px] text-dim/50 font-medium mt-0.5">Scope & Ratios</p>
                            </div>

                            <div class="h-8 w-px bg-white/10 hidden sm:block"></div>

                            <!-- Small Pie Chart + Total Tasks to the right -->
                            <div class="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl shrink-0">
                                <div class="w-10 h-10 relative flex-shrink-0 flex items-center justify-center">
                                    <canvas id="burnup-pie-canvas"></canvas>
                                </div>
                                <div class="flex flex-col justify-center">
                                    <span class="text-base font-black text-white leading-none tabular-nums">${overallSum}</span>
                                    <span class="text-[8px] font-black uppercase tracking-wider text-dim/60 mt-0.5">Total Tasks</span>
                                </div>
                            </div>

                            <!-- Single Row Stats Badges: ADDED, DONE, REMAINING -->
                            <div class="flex items-center gap-2 flex-wrap">
                                <!-- Added Badge -->
                                <div class="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                                    <div class="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]"></div>
                                    <span class="text-[9px] font-black uppercase tracking-wider text-amber-500/90">Added</span>
                                    <span class="text-xs font-black text-white tabular-nums">${totalAdded}</span>
                                    <span class="text-[9px] font-bold text-amber-500/80">(${addedPct}%)</span>
                                </div>

                                <!-- Completed Badge (tasks completed within timeframe) -->
                                <div class="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl" title="Tasks completed within the timeframe">
                                    <div class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]"></div>
                                    <span class="text-[9px] font-black uppercase tracking-wider text-green-400">Completed</span>
                                    <span class="text-xs font-black text-white tabular-nums">${totalDone}</span>
                                    <span class="text-[9px] font-bold text-green-400/80">(${donePct}%)</span>
                                </div>

                                <!-- Remaining Badge -->
                                <div class="flex items-center gap-2 bg-slate-500/10 border border-slate-500/20 px-3 py-1.5 rounded-xl">
                                    <div class="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_6px_rgba(100,116,139,0.4)]"></div>
                                    <span class="text-[9px] font-black uppercase tracking-wider text-slate-400">Remaining</span>
                                    <span class="text-xs font-black text-white tabular-nums">${totalRemaining}</span>
                                    <span class="text-[9px] font-bold text-slate-400/80">(${remainingPct}%)</span>
                                </div>

                                <!-- Burn Rate Badge -->
                                <div class="flex items-center gap-2 ${burnRateTone.box} border px-3 py-1.5 rounded-xl" title="( Completed − Added ) ÷ Added — positive means tasks are completed faster than they arrive">
                                    <svg class="w-3.5 h-3.5 ${burnRateTone.text}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${burnRateIcon}</svg>
                                    <span class="text-[9px] font-black uppercase tracking-wider ${burnRateTone.text}">Burn Rate</span>
                                    <span class="text-xs font-black text-white tabular-nums">${burnRateLabel}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <!-- Full Width Burnup Timeline Bar Chart -->
                    <div class="flex items-end h-[230px] border-b border-light/5 w-full relative pl-10 pr-2 overflow-visible">
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

        container.innerHTML = `
            ${chartHtml}
        `;

        if (burnupData.length > 0) {
            setTimeout(() => {
                const pieCanvas = container.querySelector('#burnup-pie-canvas');
                if (pieCanvas && typeof Chart !== 'undefined') {
                    const pieData = [totalAdded, totalDone, totalRemaining];
                    const pieColors = ['#f59e0b', '#10b981', '#64748b'];

                    container._burnupPieChart = new Chart(pieCanvas, {
                        type: 'doughnut',
                        data: {
                            labels: ['Added', 'Completed', 'Remaining'],
                            datasets: [{
                                data: overallSum > 0 ? pieData : [0, 0, 1],
                                backgroundColor: overallSum > 0 ? pieColors : ['rgba(255,255,255,0.05)'],
                                borderWidth: 0,
                                cutout: '70%'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const val = context.raw || 0;
                                            const pct = overallSum > 0 ? Math.round((val / overallSum) * 100) : 0;
                                            return ` ${context.label}: ${val} (${pct}%)`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }, 0);
        }
    }
};
