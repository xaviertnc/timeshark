# Implementation Plan - Timeline & UX Refinement

This plan outlines the steps to introduce a high-detail **Day View**, fix aesthetic issues on the timeline (border radius, contrast), and address the "dark dribble trail" (time entry visualization) to make it more intuitive and accurate.

## 1. Timeline Logic Improvements (`planner-utils.js`)

- [ ] Implement `scale === 'day'` in `getTimelineConfig`.
  - This view should show hours (e.g., 08:00 to 18:00 or full 24h).
  - `colWidth` should be much larger (e.g., 100px per hour).
- [ ] Adjust `colWidth` for 'week' and 'month' to be more consistent with the "fill width" logic.

## 2. Timeline Rendering Refinement (`planner-view-timeline.js`)

- [ ] **Scale-Aware Border Radius**: Use smaller `rounded` classes (or dynamic styles) based on the current scale.
- [ ] **Day View Rendering**: Add logic to render hour columns and labels when `scale === 'day'`.
- [ ] **Entry Visualization**:
  - Improve the "activity trail." Instead of separate pills, maybe use a thin, translucent background line or integrate it into the task bar visual if they overlap.
  - Ensure entries are correctly mapped to time on the Day View.
- [ ] **Contrast**: Improve contrast between the background grid and the task bars.

## 3. UI Global States (`planner.js`)

- [ ] Add 'DAY' to the Scale Toggle.
- [ ] Ensure navigation (Prev/Next/Today) works correctly with Day scale.
- [ ] Add "Clear Done" or "Archive Done" logic if requested (implied by TODO management).

## 4. State & Data (`planner-state.js`)

- [ ] Double-check `timeEntries` filtering. Ensure we aren't displaying irrelevant entries.

## 5. List View "Intelligence" (`planner-view-list.js`)

- [ ] Implement the `limit` logic to only show the top N items per group.
- [ ] Implement the `showDone` logic to filter out completed tasks.
