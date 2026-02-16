# Timeline Lane Sorting Logic

## Key Rule

Timeline lanes use a **two-tier sort** in `getProjectLanes()`:

1. **Span lanes first** — sorted by `lane_order` (drag-and-drop system)
2. **Regular lanes after** — sorted by earliest task `start_date`

## Why

- Drag-and-drop `lane_order` exists specifically for project spans — don't override it.
- Regular lanes auto-sort chronologically to avoid scattered layout.
- Project spans must **never** count toward earliest-date sorting.

## File

- `assets/components/planner/planner-view-timeline.js` → `getProjectLanes()` (~line 124)
