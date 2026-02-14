# Chat Conversation

Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

Please tell me about this codde base.

### Planner Response

Let me explore the codebase to give you a solid overview.

*Listed directory [timeshark](file:///c:/laragon/www/timeshark)*

_Searched filesystem_

*Viewed [README.md](file:///c:/laragon/www/timeshark/README.md)*

*Listed directory [api](file:///c:/laragon/www/timeshark/api)*

*Listed directory [assets](file:///c:/laragon/www/timeshark/assets)*

*Analyzed [index.php](file:///c:/laragon/www/timeshark/index.php)*

*Listed directory [docs](file:///c:/laragon/www/timeshark/docs)*

*Listed directory [components](file:///c:/laragon/www/timeshark/assets/components)*

*Listed directory [utils](file:///c:/laragon/www/timeshark/assets/utils)*

*Analyzed [app.js](file:///c:/laragon/www/timeshark/assets/app.js)*

*Analyzed [store.php](file:///c:/laragon/www/timeshark/api/store.php)*

*Listed directory [planner](file:///c:/laragon/www/timeshark/assets/components/planner)*

### Planner Response

Here's a comprehensive overview of your **Time Shark** codebase:

---

## 🦈 Time Shark — Overview

**Time Shark** is a **single-page application (SPA)** for time tracking, built with a deliberately simple, no-build-step tech stack. It runs on **Laragon** locally at `http://timeshark.localhost`.

---

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules) |
| **Backend** | Vanilla PHP |
| **Styling** | Tailwind CSS (via CDN) + custom [style.css](cci:7://file:///c:/laragon/www/timeshark/assets/style.css:0:0-0:0) |
| **Charts** | Chart.js (vendored) |
| **Fonts** | Google Fonts (Outfit, Inter) |
| **Data Storage** | JSON files on disk (via [JsonStore](cci:2://file:///c:/laragon/www/timeshark/api/store.php:2:0-90:1) PHP class) |
| **Server** | Laragon (Apache/PHP) |

No frameworks, no npm, no build process. Refreshingly simple.

---

### Architecture

```
timeshark/
├── index.php              # SPA shell (sidebar, header, #app container)
├── assets/
│   ├── app.js             # Entry point: router, init, state bootstrap
│   ├── style.css          # Custom CSS (dark mode vars, animations)
│   ├── components/        # All view modules (ES Modules)
│   │   ├── dashboard.js   # Timer widget + recent time entries (33KB)
│   │   ├── projects.js    # Project CRUD + activity graphs (34KB)
│   │   ├── planner.js     # Task/todo planner entry point (33KB)
│   │   ├── planner/       # Planner sub-modules
│   │   │   ├── planner-modal.js
│   │   │   ├── planner-state.js
│   │   │   ├── planner-utils.js
│   │   │   ├── planner-view-list.js
│   │   │   └── planner-view-timeline.js
│   │   ├── organizations.js  # Client/customer management
│   │   ├── reports.js     # Reporting & analytics
│   │   ├── sidebar.js     # Navigation sidebar
│   │   └── team.js        # Team members/resources
│   ├── utils/
│   │   ├── api.js         # Fetch wrapper for API calls
│   │   └── store.js       # Simple reactive state store (pub/sub)
│   └── vendor/            # Chart.js
├── api/                   # PHP REST-ish API endpoints
│   ├── store.php          # JsonStore class (CRUD on JSON files)
│   ├── time-entries.php   # Start/stop/edit time entries
│   ├── projects.php       # Project CRUD
│   ├── organizations.php  # Client/customer CRUD
│   ├── planner.php        # Task/todo CRUD
│   ├── team.php           # Team member CRUD
│   └── debug.php          # Debug utility
├── data/                  # JSON data files (the "database")
├── docs/                  # Design/planning docs
└── logs/                  # App logs
```

---

### Key Concepts

1. **Hash-based Router** — [app.js](cci:7://file:///c:/laragon/www/timeshark/assets/app.js:0:0-0:0) maps URL hashes (`#projects`, `#planner`, etc.) to render functions. The default route (`''`) renders the **Dashboard**.

2. **Reactive State Store** — [utils/store.js](cci:7://file:///c:/laragon/www/timeshark/assets/utils/store.js:0:0-0:0) is a simple pub/sub store. On init, all data (organizations, projects, time entries, team, tasks) is fetched in parallel and set into the store. Components subscribe to state changes.

3. **JsonStore (Backend)** — [api/store.php](cci:7://file:///c:/laragon/www/timeshark/api/store.php:0:0-0:0) provides a [JsonStore](cci:2://file:///c:/laragon/www/timeshark/api/store.php:2:0-90:1) class with [get](cci:1://file:///c:/laragon/www/timeshark/api/store.php:16:4-24:5), [save](cci:1://file:///c:/laragon/www/timeshark/api/store.php:26:4-40:5), [find](cci:1://file:///c:/laragon/www/timeshark/api/store.php:42:4-50:5), [insert](cci:1://file:///c:/laragon/www/timeshark/api/store.php:52:4-60:5), [update](cci:1://file:///c:/laragon/www/timeshark/api/store.php:62:4-76:5), [delete](cci:1://file:///c:/laragon/www/timeshark/api/store.php:78:4-89:5) methods. Data is persisted as JSON files in `data/` with file-locking for atomic writes.

4. **Timer System** — The dashboard has a start/stop timer widget. An active timer is a time entry with no `end_time`. A persistent header ticker shows the running timer on non-dashboard pages.

5. **Client/Customer Hierarchy** — "Organizations" are companies; "Clients" are people. Projects can be assigned custodians from either.

6. **Planner** — A project planning/todo system with both a **list view** and a **timeline view** (Gantt-style). Tasks can be linked to time entries.

---

### Main Views

| Route | Component | Purpose |
|---|---|---|
| `#` (default) | [dashboard.js](cci:7://file:///c:/laragon/www/timeshark/assets/components/dashboard.js:0:0-0:0) | Start/stop timer, recent entries, quick logging |
| `#planner` | [planner.js](cci:7://file:///c:/laragon/www/timeshark/assets/components/planner.js:0:0-0:0) | Task/todo management, timeline planning |
| `#projects` | [projects.js](cci:7://file:///c:/laragon/www/timeshark/assets/components/projects.js:0:0-0:0) | Project CRUD, activity graphs, color-coded entries |
| `#organizations` | [organizations.js](cci:7://file:///c:/laragon/www/timeshark/assets/components/organizations.js:0:0-0:0) | Client & customer management |
| `#team` | [team.js](cci:7://file:///c:/laragon/www/timeshark/assets/components/team.js:0:0-0:0) | Team/resource management |
| `#reports` | [reports.js](cci:7://file:///c:/laragon/www/timeshark/assets/components/reports.js:0:0-0:0) | Analytics, filtering, reporting |

---

### Notable Patterns

- **All DOM rendering is imperative** — each component's `render()` function builds DOM elements with `document.createElement`, wires up event listeners, and returns a container node.
- **No templating engine** — everything is hand-built DOM or innerHTML strings.
- **Components are large** — [dashboard.js](cci:7://file:///c:/laragon/www/timeshark/assets/components/dashboard.js:0:0-0:0) is ~33KB, [projects.js](cci:7://file:///c:/laragon/www/timeshark/assets/components/projects.js:0:0-0:0) ~34KB. The planner is the biggest feature, split across 5 files totalling ~147KB.
- **Dark mode** — supported via Tailwind's `dark` class toggling.

This is a mature, feature-rich vanilla JS/PHP app with a clean separation between frontend components and backend JSON-file persistence.
