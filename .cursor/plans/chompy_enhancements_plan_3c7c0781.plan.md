---
name: Chompy Enhancements Plan
overview: Upgrade the time tracking experience with a consolidated dashboard, advanced reporting with activity graphs, and enhanced data models for clients, customers, and task details.
todos:
  - id: logo-click
    content: Add logo click handler in index.php/app.js
    status: completed
  - id: dashboard-redesign
    content: Redesign dashboard.js to include history and active widget consolidation
    status: completed
  - id: resume-job
    content: Implement "Resume" functionality for previous jobs
    status: completed
  - id: add-notes
    content: Add "Note" field to time entries (API and UI)
    status: completed
  - id: data-models-update
    content: Update data models for Client/Customer hierarchy and Project custodian
    status: completed
  - id: reports-graphs
    content: Implement project activity graphs in reports.js using Chart.js
    status: completed
  - id: color-shifting
    content: Add color shifting for project tasks in UI components
    status: completed
  - id: update-readme
    content: Update README.md with new requirements
    status: completed
isProject: false
---

### 1. Navigation & UI Refinement

- Update `index.php` to add a click handler to the Chompy logo that resets the hash to `#dashboard` (or empty).
- Redesign `dashboard.js` to merge the active timer widget with the time tracking history (previously only in reports).
- Implement a "Resume" button on history entries in `dashboard.js` to quickly start a new timer with the same project/description/resource.
- Add a "Note" field to time entries in both the dashboard and reports views.

### 2. Enhanced Data Models

- **Clients vs. Customers**:
  - Update `api/customers.php` and `assets/components/customers.js` to support a "Client" (Company) and "Customer" (Person) hierarchy.
  - A Client can have multiple Customers.
  - Projects can be assigned to either a Client or a specific Customer as a "custodian".
- **Task Coloring**:
  - Implement a color shift logic in `reports.js` and `dashboard.js` where tasks within a project use a slightly lighter or darker version of the project's base color to differentiate them while maintaining visual relation.

### 3. Advanced Reports

- **Activity Graphs**:
  - Integrate a lightweight charting library (like Chart.js via CDN) in `reports.js`.
  - Add per-project activity graphs showing hours logged per day or per hour.
- **Filters & Pagination**:
  - Enhance existing filters in `reports.js` with more granular options.
  - Ensure pagination is robust across all views where lists can grow long (Projects, Customers, History).

### 4. Documentation

- Update `README.md` to reflect the new features and architectural changes.

### Essential Code Snippets

**Color Shifting Logic:**

```javascript
function shiftColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
}
```

**Logo Click Handler (index.php):**

```javascript
document.querySelector('.logo-container').onclick = () => window.location.hash = '';
```

