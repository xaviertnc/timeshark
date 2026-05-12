# Project Architecture

Projects are the backbone of **Time Shark**. All tasks and time entries trace back to a Project.

## Hierarchy

The app enforces a strict, fast, two-tier topology:

- **Epics** (`type: epic`): High-level containers for massive initiatives, quarters, or client retainers. They have no parents.
- **Projects** (`type: project`): Actionable deliverables. Can be completely standalone, or nested directly under a parent Epic.

## Core Mechanisms

- **Color Coding**: Mandatory. Colors act as visual anchors, seamlessly connecting timeline blocks and planner tasks to their origin project without requiring text labels on small interfaces.
- **Manual Progress**: Locked to a manual `0-100%` slider. This intentionally decouples progress from pure task-completion math, allowing flexible tracking for abstract or non-linear work.
- **Tagging**: Arrays of strings (`["urgent", "backend"]`) power global search filtering, acting as a lightweight, flexible alternative to rigid folders.

## Lifecycle Management

> **Deletion is destructive.** Hard-deleting a project instantly severs its lineage. It permanently relabels associated time records as `[Deleted Project]` and wipes its active planner tasks. 
>
> [!TIP]  
> **Always Archive.** Archiving smoothly ejects the project from active memory and writes it to a year-stamped cold shard (e.g., `archive_projects_2026.json`). This keeps the UI blazing fast while preserving 100% of your historical data integrity.
