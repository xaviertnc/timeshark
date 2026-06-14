/**
 * components/planner/planner-state.js
 * 
 * Manages the data state for the unified planner.
 * Merges Tasks and Time Entries.
 */

import { api } from '../../utils/api.js';
import { store } from '../../utils/store.js';

export const PlannerState = {
    async init() {
        try {
            // Fetch latest data
            const [tasks, timeEntries, projects] = await Promise.all([
                api.get('planner.php'),
                api.get('time-entries.php'),
                api.get('projects.php')
            ]);
            
            // Sort projects: OPS last, Unassigned very last
            projects.sort((a, b) => {
                const aUnassigned = a.name === 'Unassigned';
                const bUnassigned = b.name === 'Unassigned';
                if (aUnassigned && !bUnassigned) return 1;
                if (!aUnassigned && bUnassigned) return -1;

                const aOps = a.type === 'OPS' || a.category === 'OPS';
                const bOps = b.type === 'OPS' || b.category === 'OPS';
                if (aOps && !bOps) return 1;
                if (!aOps && bOps) return -1;

                return 0; // preserve original API ordering for others
            });

            store.update('tasks', tasks);
            store.update('timeEntries', timeEntries);
            store.update('projects', projects);
        } catch (err) {
            console.error("PlannerState: Failed to fetch data", err);
        }
    },

    getCombinedData(filterProjectIds = []) {
        const state = store.get();
        let tasks = state.tasks || [];
        let timeEntries = state.timeEntries || [];
        let projects = state.projects || [];
        const team = state.team || [];

        const noFilter = !filterProjectIds || filterProjectIds.length === 0 || filterProjectIds === 'all';

        // Hide projects marked as 'hide_from_gantt' UNLESS explicitly targeted
        const hiddenProjectIds = new Set(
            projects.filter(p => p.hide_from_gantt == 1 && (noFilter || !filterProjectIds.includes(String(p.id))))
                .map(p => String(p.id))
        );
        
        projects = projects.filter(p => !hiddenProjectIds.has(String(p.id)));
        tasks = tasks.filter(t => !t.project_id || !hiddenProjectIds.has(String(t.project_id)));
        timeEntries = timeEntries.filter(te => !te.project_id || !hiddenProjectIds.has(String(te.project_id)));

        // Filter by project if needed
        let filteredTasks = noFilter
            ? tasks
            : tasks.filter(t => filterProjectIds.includes(String(t.project_id)));

        // 1. Separate Scheduled vs Unscheduled (Backlog)
        const scheduledTasks = [];
        const backlogTasks = [];

        filteredTasks.forEach(task => {
            if (task.status === 'backlog' || (!task.start_date && task.status !== 'done')) {
                backlogTasks.push(task);
            } else {
                // Default duration: 30 minutes if no end date
                if (!task.end_date) {
                    if (task.start_date) {
                        const s = new Date(task.start_date);
                        task.end_date = new Date(s.getTime() + 30 * 60 * 1000).toISOString();
                    } else if (task.completed_at) {
                        task.end_date = task.completed_at;
                    }
                }
                // Ensure date strings are valid
                scheduledTasks.push(task);
            }
        });

        // 2. Prepare Resources Map
        // We only want to show resources that are active in the visible range OR have tasks
        // For now, simpler: show all team members + "General"
        const resources = team.map(m => m.name);
        if (!resources.includes('General')) resources.push('General');
        // Check for any tasks assigned to resources not in team list (legacy/deleted users)
        scheduledTasks.forEach(t => {
            if (t.resource_id && !resources.includes(t.resource_id)) {
                resources.push(t.resource_id);
            }
        });

        // 3. Map Time Entries to Resources
        // We attach time entries to the simplified data structure for rendering
        const resourceRows = resources.map(resourceName => {
            // Tasks for this resource
            const assignedTasks = scheduledTasks.filter(t => 
                (t.resource_id === resourceName) || (!t.resource_id && resourceName === 'General')
            );

            // Time entries for this resource
            const assignedEntries = timeEntries.filter(te =>
                (te.resource_id === resourceName || (!te.resource_id && resourceName === 'General'))
            );

            // Filter out empty rows if filter is applied? 
            // User requirement: "don't want to see team members with no tasks completed or planned"
            if (assignedTasks.length === 0 && assignedEntries.length === 0) {
                return null;
            }

            return {
                resource: resourceName,
                tasks: assignedTasks,
                entries: assignedEntries
            };
        }).filter(row => row !== null);

        return {
            rows: resourceRows,
            backlog: backlogTasks,
            projects
        };
    }
};

