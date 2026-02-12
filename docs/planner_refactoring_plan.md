# Planner Refactoring Implementation Plan

## Goal Description

Refactor the `planner.js` component to use a **Unified Task Model**. "Todos" and "Planned Tasks" are the same entity, simply visualized differently based on their state (scheduled vs. unscheduled). The Planner will feature a **Gantt-style Timeline** for scheduled work and a **Task List Sidebar** for backlog/unscheduled items.

## User Review Required
>
> [!IMPORTANT]
> **Unified Task Entity**: A "Todo" is just a Task. If it has dates, it appears on the Timeline. If not, it appears in the Task List.
> **Continuous Timeline**: The grid-based daily cells are replaced by a continuous Gantt chart.

## Proposed Changes

### Directory Structure

Create a new directory `assets/components/planner/`.

### Modules

#### 1. `assets/components/planner/planner-utils.js` (NEW)

- Time/Date helpers (`getWeekNum`, `formatDuration`).
- Color contrast helpers.
- Timeline coordinate calculations (e.g., pixel offset for a given date).

#### 2. `assets/components/planner/planner-state.js` (NEW)

- Fetches `tasks` and `time_entries`.
- Merges them into a unified view model.
- Filters out empty rows (resources with no tasks/logs).
- Manages the "Active Project" filter.

#### 3. `assets/components/planner/planner-view-timeline.js` (NEW)

- **Gantt Visualization**:
  - Draws a time axis (Days/Weeks/Months).
  - Renders **Planned Tasks** as continuous colored bars.
  - Renders **Actual Work** (Time Entries) as distinct bars (e.g., hatched/darker) overlaid or below the planned bar to show "Actual vs Planned".
  - **Progress**: Visualizes manual `progress` % on the task bar.

#### 4. `assets/components/planner/planner-view-list.js` (NEW)

- **Task List / Backlog Sidebar**:
  - Display tasks that lack `start_date`/`end_date`.
  - Group by **Customer** or **Project** (toggleable).
  - **Quick Add**: Input at the top to create a new task instantly (Default: Unscheduled).
  - **Drag & Drop**: (Phase 2) Drag from List to Timeline to schedule. For now, click to "Plan" (open modal).

#### 5. `assets/components/planner/planner-modal.js` (NEW)

- Unified Modal for creating/editing Tasks.
- Fields: Title, Project, Resource, Dates (Start/End - optional), **Manual Progress %**, Description.

#### 6. `assets/components/planner.js` (MODIFY)

- Main Controller.
- Initializes the sub-modules.
- Layouts the screen: `[Task List (25%)] [Timeline (75%)]`.

## Verification Plan

### Manual Verification

1. **Unified Flow**:
    - Create a task in the "Task List" (Unscheduled). verify it appears in the sidebar.
    - Open the task, set a start/end date.
    - **Verify**: It disappears from the list and appears on the Timeline as a bar.
2. **Continuous Rendering**:
    - Create a multi-day task.
    - **Verify**: It renders as one long bar, not broken segments.
3. **Actual vs Planned**:
    - Log time against a task.
    - **Verify**: The "Actual Work" bar appears on the timeline relative to when the work happened.
4. **Manual Progress**:
    - Set progress to 50%.
    - **Verify**: A progress indicator (e.g., darker fill) appears on the task bar.
