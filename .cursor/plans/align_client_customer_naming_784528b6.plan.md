---
name: Align Organizations and Clients Naming
overview: Standardize the naming and relationship between Organizations (Companies), Clients (Contacts), and Projects to reduce confusion and improve data hierarchy.
todos:
  - id: rename-data-files
    content: Rename customers.php to organizations.php and update all references.
    status: completed
  - id: update-sidebar-labels
    content: Update sidebar labels and icons for Organizations/Clients.
    status: completed
  - id: refactor-customers-component
    content: Refactor customers.js to organizations.js using Organization/Client terminology.
    status: completed
  - id: update-projects-hierarchy
    content: Update projects.js to link primarily to Organizations with a secondary Client contact.
    status: completed
  - id: update-api-endpoints
    content: Update frontend API calls to use /api/organizations.php instead of /api/customers.php.
    status: pending
isProject: false
---

1. **UI Label Update:** Rename all instances of "Customers" to "Contacts" and "Clients" to "Companies" in the frontend components (`assets/components/sidebar.js`, `assets/components/customers.js`, `assets/components/projects.js`).
2. **Refactor `customers.js`:**
  - Update the component to use "Companies" as the primary grouping.
  - Clarify the "Add" forms to distinguish between adding a new Company vs. a new Contact within a Company.
3. **Refactor `projects.js`:**
  - Update the project list and form to display the "Company" as the primary owner.
  - Add/Update a field to select a "Primary Contact" from the selected Company's contacts.
4. **Documentation Update:** Update the doc headers in the affected files to reflect this conceptual shift.

