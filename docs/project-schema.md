# Project Data Object Schema

This document defines the structure and data types for the **Project** entity in Time Shark. This structure is typically stored in `data/projects.json` (for active projects) and `data/archive_projects_[YEAR].json` (for archived projects).

## JSON Structure Overview

Here is a clean, raw representation of the JSON structure, showing an example Epic and one of its child projects:

```json
[
  {
    "id": "epic_6978...",
    "name": "Q3 Launch Campaign",
    "customer_id": "cust_123",
    "client_id": "client_abc",
    "type": "epic",
    "parent_id": null,
    "tags": ["marketing", "high-priority"],
    "status": "Active",
    "progress": 35,
    "color": "#e8902c",
    "list_order": 1,
    "started_at": "2026-07-01",
    "completed_at": "2026-09-30",
    "created_at": "2026-02-08T14:47:21+00:00"
  },
  {
    "id": "proj_1122...",
    "name": "Landing Page Design",
    "customer_id": "cust_123",
    "client_id": "client_abc",
    "type": "project",
    "parent_id": "epic_6978...",
    "tags": ["design", "web"],
    "status": "Active",
    "progress": 100,
    "color": "#477cbd",
    "list_order": 2,
    "started_at": "2026-07-05",
    "completed_at": "2026-07-20",
    "created_at": "2026-02-09T09:12:00+00:00"
  }
]
```

## Field Dictionary

| Field | Type | Description |
| --- | --- | --- |
| **`id`** | `String` | Unique identifier (e.g., via PHP `uniqid`). |
| **`name`** | `String` | Project Title / Name. |
| **`customer_id`** | `String` | ID of the parent Organization/Customer. Empty for global/internal projects. |
| **`client_id`** | `String` | ID of the assigned Lead Contact/Client under the parent organization. |
| **`type`** | `String` | `'epic'` or `'project'`. Defines if it's a top-level container or standard unit. |
| **`parent_id`** | `String/null` | If `type` is `'project'`, holds the ID of its parent Epic. `null` for standalone. |
| **`tags`** | `Array<String>` | An array of strings used for arbitrary categorization, searches, and filtering. |
| **`status`** | `String` | Usually `'Active'`, `'On Hold'`, `'Completed'`, `'Cancelled'`, or `'Archived'`. |
| **`progress`** | `Int/String` | Manual completion percentage between 0 and 100. |
| **`color`** | `String` | Hex code or HSL (e.g., `'#fbc02d'`), used for UI badges and timeline bars. |
| **`list_order`** | `Int` | Integer defining sequence and rendering order in prioritized list views. |
| **`started_at`** | `String` | ISO Date (`YYYY-MM-DD`), marks the official start boundary. |
| **`completed_at`**| `String` | ISO Date (`YYYY-MM-DD`), marks the targeted deadline or completion boundary. |
| **`created_at`** | `String` | Auto-generated ISO 8601 Date Time stamp. |

## Special Notes

- **`list_order`** replaced `sort_order` in the schema.
- **Removed fields:** `todos`, `lane_order`, and `continuous` were historically used but dropped to simplify the data model in favor of `tags` and explicit `progress` properties.
- **Hierarchy Mapping:** In the UI, standard projects are mapped as children to their corresponding Epic when `project.parent_id === epic.id`. Epics themselves always have `type: "epic"` and `parent_id: null`.
