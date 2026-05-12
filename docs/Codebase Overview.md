# 🦈 Time Shark — Codebase Overview

> **Last updated:** 14 Feb 2026

**Time Shark** is a **single-page application (SPA)** for time tracking, built with a deliberately simple, no-build-step tech stack. It runs on **Laragon** locally at `http://timeshark.localhost`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules) |
| **Backend** | Vanilla PHP |
| **Styling** | Tailwind CSS (via CDN) + custom [style.css](file:///c:/laragon/www/timeshark/style.css) |
| **Charts** | Chart.js (vendored) |
| **Fonts** | Google Fonts (Outfit, Inter) |
| **Data Storage** | JSON files on disk (via `JsonStore` PHP class) |
| **Server** | Laragon (Apache/PHP) |
| **Linting** | ESLint ([eslint.config.js](file:///c:/laragon/www/timeshark/eslint.config.js)) |

No frameworks, no npm, no build process. Refreshingly simple.

---

## Architecture

```
timeshark/
├── index.php              # SPA shell (sidebar, header, #app container)
├── app.js                 # Entry point: router, init, state bootstrap (~6KB)
├── style.css              # Custom CSS (dark mode vars, animations ~6KB)
├── eslint.config.js       # ESLint configuration
├── favicon.png            # App favicon
├── components/            # All view modules (ES Modules)
│   ├── dashboard.js       # Timer widget, recent entries, task toggles, mini-Gantt (~51KB)
│   ├── projects.js        # Project CRUD, activity graphs, color palettes (~34KB)
│   ├── planner.js         # Task/todo planner entry point (~29KB)
│   ├── planner/           # Planner sub-modules
│   │   ├── planner-modal.js       # Task create/edit modal (~30KB)
│   │   ├── planner-state.js       # Data state manager (~4KB)
│   │   ├── planner-utils.js       # Shared utilities (~7KB)
│   │   ├── planner-view-list.js   # List view with categories & grouping (~36KB)
│   │   └── planner-view-timeline.js # Gantt timeline with 4 zoom levels (~36KB)
│   ├── organizations.js      # Client/organization management (~20KB)
│   ├── reports.js         # Reporting & analytics (~22KB)
│   ├── sidebar.js         # Navigation sidebar (~4KB)
│   └── team.js            # Team members/resources (~9KB)
├── utils/
│   ├── api.js             # Fetch wrapper for API calls (~1KB)
│   ├── store.js           # Simple reactive state store (pub/sub ~1KB)
│   └── select-helpers.js     # Smart <select> builder with Recent/All optgroups (~4KB)
├── images/                # Branding assets (logos, favicons, reference images)
├── vendor/                # Chart.js
├── api/                   # PHP REST-ish API endpoints
│   ├── store.php          # JsonStore class (CRUD on JSON files ~3KB)
│   ├── time-entries.php   # Start/stop/edit time entries (~5KB)
│   ├── projects.php       # Project CRUD (~10KB)
│   ├── organizations.php  # Organization/client CRUD (~5KB)
│   ├── planner.php        # Task/todo CRUD (~3KB)
│   ├── team.php           # Team member CRUD (~4KB)
│   └── debug.php          # Debug utility (~1KB)
├── data/                  # JSON data files (the "database")
│   ├── organizations.json
│   ├── projects.json
│   ├── tasks.json
│   ├── team.json
│   ├── time-entries.json
│   └── time-entries.zip   # Backup archive
├── docs/                  # Design/planning docs
└── logs/                  # App logs
```

---

## Key Concepts

1. **Hash-based Router** — [app.js](file:///c:/laragon/www/timeshark/app.js) maps URL hashes (`#projects`, `#planner`, etc.) to render functions. The default route (`''`) renders the **Dashboard**.

2. **Reactive State Store** — [store.js](file:///c:/laragon/www/timeshark/utils/store.js) is a simple pub/sub store. On init, all data (organizations, projects, time entries, team, tasks) is fetched in parallel and set into the store. Components subscribe to state changes.

3. **JsonStore (Backend)** — [store.php](file:///c:/laragon/www/timeshark/api/store.php) provides a `JsonStore` class with `get`, `save`, `find`, `insert`, `update`, `delete` methods. Data is persisted as JSON files in `data/` with file-locking for atomic writes.

4. **Timer System** — The dashboard has a start/stop timer widget. An active timer is a time entry with no `end_time`. A persistent header ticker shows the running timer on non-dashboard pages.

5. **Client/Organization Hierarchy** — "Organizations" are companies; "Clients" are people within organizations. Projects can be assigned custodians from either. Supports multi-org and selectable colors.

6. **Planner** — A project planning/todo system with both a **list view** and a **timeline view** (Gantt-style). Tasks have a unified model supporting scheduling, priorities, progress tracking, and resource assignment. The planner is split across 5 sub-modules totalling ~143KB.

7. **Select Helpers** — [select-helpers.js](file:///c:/laragon/www/timeshark/utils/select-helpers.js) provides a shared utility for building `<select>` dropdowns with "Recent" and "All" optgroups, computed from time entry history. Used across dashboard, reports, and planner modals.

---

## Main Views

| Route | Component | Purpose |
|---|---|---|
| `#` (default) | [dashboard.js](file:///c:/laragon/www/timeshark/components/dashboard.js) | Start/stop timer, recent entries, quick logging, task toggles, mini-Gantt spans chart, todo linking |
| `#planner` | [planner.js](file:///c:/laragon/www/timeshark/components/planner.js) | Task/todo management, timeline planning, sidebar filters, quick-add, lane reordering |
| `#projects` | [projects.js](file:///c:/laragon/www/timeshark/components/projects.js) | Project CRUD, activity graphs, color-coded entries, grid/list view toggle, progress tracking |
| `#organizations` | [organizations.js](file:///c:/laragon/www/timeshark/components/organizations.js) | Organization & client management, multi-org support |
| `#team` | [team.js](file:///c:/laragon/www/timeshark/components/team.js) | Team/resource management |
| `#reports` | [reports.js](file:///c:/laragon/www/timeshark/components/reports.js) | Analytics, daily reports, filtering by project/member, paginated day view |

---

## Planner Sub-Modules

| Module | Purpose |
|---|---|
| [planner-state.js](file:///c:/laragon/www/timeshark/components/planner/planner-state.js) | Fetches and merges tasks + time entries + projects. Separates scheduled vs backlog tasks. Maps items to resource rows. |
| [planner-utils.js](file:///c:/laragon/www/timeshark/components/planner/planner-utils.js) | Shared helpers: contrast colors, duration formatting, color shifting, ISO dates, week numbers, timeline config generation. |
| [planner-modal.js](file:///c:/laragon/www/timeshark/components/planner/planner-modal.js) | Full-featured task modal with date pickers, progress quick-buttons, priority, notes, project select with Recent optgroups. |
| [planner-view-list.js](file:///c:/laragon/www/timeshark/components/planner/planner-view-list.js) | List view with category filtering (today/completed/planned), compact & full card modes, grouping by week/month/year, pagination. |
| [planner-view-timeline.js](file:///c:/laragon/www/timeshark/components/planner/planner-view-timeline.js) | Gantt chart with 4 zoom levels (day/week/month/year), per-project lanes, lane reordering, compact/regular/relaxed density modes. |

---

## Notable Patterns

- **All DOM rendering is imperative** — each component's `render()` function builds DOM elements with `document.createElement`, wires up event listeners, and returns a container node.
- **No templating engine** — everything is hand-built DOM or innerHTML strings.
- **Component structure** — each component exports a single `render*` function (e.g., `renderDashboard`, `renderProjects`). The planner sub-modules export objects (`PlannerList`, `PlannerTimeline`, `PlannerModal`, etc.) with `render()` methods.
- **Dark mode** — supported via Tailwind's `dark` class toggling, persisted in `localStorage`.
- **Smart selects** — project/org dropdowns across the app use the shared `select-helpers.js` to show recently-used items first.
- **Inline modals** — each major component manages its own modal(s) for CRUD operations, with backdrop click/escape to close.
- **No pagination on most views** — completed tasks in the planner use grouping (week/month/year) with pagination; other views show all data.

---

## Data Model

| JSON File | Key Fields | Notes |
|---|---|---|
| `organizations.json` | `id`, `name`, `color`, `clients[]` | Companies with nested client contacts |
| `projects.json` | `id`, `name`, `color`, `org_id`, `client_id`, `status` | Linked to organizations/clients |
| `tasks.json` | `id`, `title`, `project_id`, `resource_id`, `start_date`, `end_date`, `status`, `progress`, `priority`, `notes` | Unified task model for planner |
| `team.json` | `id`, `name`, `role`, `email` | Team members / resources |
| `time-entries.json` | `id`, `description`, `project_id`, `task_id`, `start_time`, `end_time`, `resource_id` | Timer-based entries, linkable to tasks |

---

This is a mature, feature-rich vanilla JS/PHP app with a clean separation between frontend components and backend JSON-file persistence.

