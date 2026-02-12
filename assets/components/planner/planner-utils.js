/**
 * assets/components/planner/planner-utils.js
 * 
 * Utility functions for the Planner component.
 */

export const PlannerUtils = {
    // Determine text color based on background hex
    getContrastColor(hex) {
        if (!hex || hex === 'transparent') return 'text-slate-800';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 155 ? 'text-slate-900' : 'text-white';
    },

    // Format duration from seconds to human readable string
    formatDuration(sec) {
        if (!sec) return '0m';
        const h = Math.floor(sec / 3600);
        const m = Math.round((sec % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    },

    // Darken or lighten a hex color
    shiftColor(color, percent) {
        if (!color || typeof color !== 'string' || !color.startsWith('#')) return color;
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
    },

    // Get ISO date string (YYYY-MM-DD)
    toISODate(date) {
        return date.toISOString().split('T')[0];
    },

    // Get week number
    getWeekNum(d) {
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year.
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        // January 4 is always in week 1.
        const week1 = new Date(date.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count number of weeks from date to week1.
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    },

    // Generate timeline configuration based on scale
    getTimelineConfig(scale, offset, today) {
        const dates = [];
        let groups = [];

        const baseDate = new Date(today);
        // Reset to start of day
        baseDate.setHours(0, 0, 0, 0);

        if (scale === 'day') baseDate.setDate(today.getDate() + offset);
        if (scale === 'week') baseDate.setDate(today.getDate() + (offset * 14)); // Show 2 weeks
        if (scale === 'month') baseDate.setDate(today.getDate() + (offset * 28));
        if (scale === 'year') baseDate.setFullYear(today.getFullYear() + offset);

        if (scale === 'day') {
            const start = new Date(baseDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);

            // We generate "virtual" dates for each hour to reuse the grid logic
            // Actually, let's keep it as 1 day and handle hours in the View
            return {
                type: 'day',
                startDate: start,
                endDate: end,
                dates: [start], // Just one day
                colWidth: 120, // per hour? 
                totalWidth: 24 * 120, // 24 hours * 120px
                isDayView: true
            };
        }

        if (scale === 'month') {
            const start = new Date(baseDate);
            start.setDate(1);
            const nextMonth = new Date(start);
            nextMonth.setMonth(start.getMonth() + 1);

            // Calculate days to avoid infinite loops or wrong sizes
            const daysInMonth = Math.round((nextMonth - start) / (1000 * 60 * 60 * 24));

            for (let i = 0; i < daysInMonth; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push(d);
            }

            groups = [{ label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(), count: dates.length }];

            return {
                type: 'month',
                startDate: dates[0],
                endDate: dates[dates.length - 1],
                dates,
                groups,
                colWidth: 30,
                totalWidth: dates.length * 30
            };
        }

        if (scale === 'week') {
            const start = new Date(baseDate);
            // Adjust to Monday
            const day = start.getDay() || 7;
            if (day !== 1) start.setDate(start.getDate() - day + 1);

            // Generate 14 days (2 weeks)
            for (let i = 0; i < 14; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push(d);
            }

            const week2Start = new Date(start);
            week2Start.setDate(start.getDate() + 7);

            groups = [
                { label: `WEEK ${this.getWeekNum(start)}: ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`, count: 7 },
                { label: `WEEK ${this.getWeekNum(week2Start)}: ${week2Start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`, count: 7 }
            ];

            return {
                type: 'week',
                startDate: dates[0],
                endDate: dates[dates.length - 1],
                dates,
                groups,
                colWidth: 80, // px
                totalWidth: 14 * 80
            };
        }

        // Default to week if others not implemented yet or fallthrough
        return this.getTimelineConfig('week', offset, today);
    }
};
