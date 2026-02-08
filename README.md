# Time Shark

I need a simple but beautiful time tracking SPA. It needs to have four main components: Organizations, Projects, Time Tracker (Shark), and Reports.

I want to start and stop tasks easily while keeping track of state between instances and reloads of the app.

## Core Features

- **Consolidated Dashboard**: The time tracker view includes the active timer widget and recent history on the same page for maximum efficiency.
- **Resume Capability**: Previous jobs can be resumed with a single click, carrying over the project, description, and notes.
- **Detailed Logs**: Every time entry supports a description and an additional "Notes" field for deep context.
- **Client & Customer Hierarchy**: Support for "Clients" (Companies) and "Customers" (People working at those companies). Projects can be assigned to either as a custodian.
- **Visual Relation**: Tasks within a project use color-shifted variants of the project's base color to look related but distinct.
- **Advanced Reports**: Each project features an activity graph (hours per day) using Chart.js, along with granular filters and pagination.

## Project Planning

The projects section needs a project plan / todos section that will also be super simple and visually good looking.
I want to plan projects as blocks of time assigned to a particular resource, including myself in the avail resources.
Resources time tracks are stacked in rows.
Horizontally we have a day, week, month and year view.

## Tech Stack

- **Vanilla JS and PHP**: No frameworks, no build process.
- **Persistence**: JSON-based storage via `JsonStore`.
- **Styling**: Tailwind CSS (via CDN).
- **Visualization**: Chart.js (via CDN).
