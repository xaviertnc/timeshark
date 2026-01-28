---
name: Advanced Reporting Dashboard Plan
overview: Redesign the reporting section to provide actionable insights through daily hourly stacked bar charts, time distribution pie charts, and planned vs. actual comparisons over selectable periods.
todos:
  - id: report-filters-logic
    content: Implement date and period filtering logic in reports.js
    status: completed
  - id: daily-insights-charts
    content: Create Daily Insights section with stacked bar and pie charts
    status: completed
  - id: planned-vs-actual-charts
    content: Create Planned vs. Actual comparison section with grouped bar chart
    status: completed
  - id: comparison-project-limit
    content: Add "Show More" functionality for projects in comparison view
    status: completed
  - id: reports-layout-refactor
    content: Refactor layout to accommodate new sections while maintaining theme
    status: completed
isProject: false
---

### 1. Data Processing Enhancements

- Implement functions to filter and group `timeEntries` and `tasks` by:
  - Specific day (Today, Yesterday, Custom).
  - Period (Current Week, Month, Year).
- Logic to identify the "last 3 projects worked on" based on the most recent `timeEntries`.

### 2. Daily Activity Report (New Section)

- **Stacked Bar Chart**:
  - X-axis: 24 hours (00:00 to 23:00).
  - Y-axis: Minutes logged per hour.
  - Segments: Stacked by project, using project colors.
- **Pie Chart**:
  - Distribution of total time logged for the selected day across all active projects.
- **Controls**:
  - Date selector (Today, Yesterday, or Date Picker).

### 3. Planned vs. Actual Comparison (New Section)

- **Grouped Bar Chart**:
  - X-axis: Projects.
  - Y-axis: Total hours.
  - Bars: "Planned" (from planner tasks) vs. "Actual" (from time entries).
- **Controls**:
  - Period selector: Week, Month, Year.
  - Project filter: Default to top 3 active projects, with a "Show All" toggle.

### 4. UI/UX Refinement

- Reorganize `reports.js` into three distinct sections:
  1. **Daily Insights**: The stacked bar and pie chart side-by-side.
  2. **Performance Comparison**: The planned vs. actual grouped bar chart.
  3. **Detailed History**: The existing paginated list of entries.
- Ensure all charts use the established project color palette and maintain the "Steady & Calm" aesthetic.

### 5. Essential Logic Snippets

**Hourly Grouping for Stacked Bar:**

```javascript
const hourlyData = Array.from({ length: 24 }, () => ({}));
dayEntries.forEach(e => {
  const hour = new Date(e.start_time).getHours();
  const durationMins = calculateMinsInHour(e, hour);
  hourlyData[hour][e.project_id] = (hourlyData[hour][e.project_id] || 0) + durationMins;
});
```

**Planned vs Actual Period Filtering:**

```javascript
const periodStart = getStartDate(selectedPeriod); // Week, Month, Year
const periodEntries = entries.filter(e => new Date(e.start_time) >= periodStart);
const periodTasks = tasks.filter(t => new Date(t.start_date) >= periodStart);
```

