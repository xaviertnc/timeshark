# Planner UI Refinement Plan

The goal is to fix visual hierarchy issues, improve legibility, and optimize space utilization in the Planner component.

## Header Refinements

### 1. Element Scaling

- **Problem**: `Show [X]` and `Project Filter` are too bulky.
- **Fix**: Reduce scale (font size, padding, height) to match the "D/W/M" and "Timeline/List" controls.

### 2. Logical Grouping

- **Problem**: View Mode and Time Scale are forced into the same group.
- **Fix**: Split them into two distinct button groups with a clear gap.

### 3. "DONE" Visibility

- **Problem**: The "Done" toggle is hard to see or identify.
- **Fix**: Redesign as a clearer toggle/pill with a high-contrast active state and a subtle inactive state.

## Sidebar Refinements

### 1. "Add TODO" Optimization

- **Problem**: Huge input compared to task items.
- **Fix**: Integrate the "Add TODO" input directly into the header or make it a much more compact, sleek line.

### 2. Legibility

- **Problem**: Sidebar task font is too small.
- **Fix**: Increase font to `text-[12px]` (standard xs) and ensure bold/medium weights are used for clarity.

### 3. Space Management

- **Problem**: "TODO LIST" title wastes space.
- **Fix**: Combine title and "Add" functionality into a single header row.

## Implementation Steps

1. [ ] Update `planner.js` header template for better grouping and scaling.
2. [ ] Update `planner-view-list.js` to refine Sidebar item fonts and "Add TODO" layout.
3. [ ] Verify alignment and visual hierarchy across all viewports.
