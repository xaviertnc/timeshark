/**
 * utils/project-span-sync.js
 * 
 * Bidirectional sync between project span tasks and their parent projects.
 * Ensures dates and progress stay synchronized at all times.
 * 
 * @package Time Shark
 * @author Senpai
 * @version 1.0 - INIT - 14 Feb 2026
 */

import { api } from './api.js';
import { store } from './store.js';

/**
 * Sync span task → project
 * Called after a span task is saved
 * 
 * @param {Object} spanTask - The span task that was just saved
 */
export async function syncSpanToProject(spanTask) {
    if (!spanTask.project_id) return;

    const projects = store.get().projects || [];
    const project = projects.find(p => String(p.id) === String(spanTask.project_id));
    if (!project) {
        console.warn(`Project ${spanTask.project_id} not found for span task ${spanTask.id}`);
        return;
    }

    // Convert task dates to project dates (ISO datetime → date-only)
    const started_at = spanTask.start_date ? spanTask.start_date.split('T')[0] : null;
    const completed_at = spanTask.end_date ? spanTask.end_date.split('T')[0] : null;

    // Update project with span data
    await api.post('projects.php', {
        id: project.id,
        started_at,
        completed_at,
        progress: spanTask.progress || 0
    });

    // Refresh projects in store
    store.update('projects', await api.get('projects.php'));
}

/**
 * Sync project → span task
 * Called after a project is saved
 * 
 * @param {Object} project - The project that was just saved
 */
export async function syncProjectToSpan(project) {
    if (!project.started_at || !project.completed_at) {
        // No dates set - nothing to sync
        return;
    }

    const tasks = store.get().tasks || [];
    let span = tasks.find(t =>
        t.task_type === 'project_span' &&
        String(t.project_id) === String(project.id)
    );

    // Create span if it doesn't exist
    if (!span) {
        span = await createSpanTask(project);
        return; // createSpanTask handles the full creation
    }

    // Preserve existing task times, only replace date part
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 8); // HH:MM:SS
    const endTime = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().substring(0, 8); // +1 hour

    let start_date = `${project.started_at}T${currentTime}`; // Default to current time
    let end_date = `${project.completed_at}T${endTime}`; // Default to current time + 1 hour

    if (span.start_date) {
        // Extract time from existing span task
        const existingStartTime = span.start_date.split('T')[1] || currentTime;
        start_date = `${project.started_at}T${existingStartTime}`;
    }

    if (span.end_date) {
        // Extract time from existing span task
        const existingEndTime = span.end_date.split('T')[1] || endTime;
        end_date = `${project.completed_at}T${existingEndTime}`;
    }

    // Update span with project data
    await api.post('planner.php', {
        id: span.id,
        start_date,
        end_date,
        progress: project.progress || 0,
        status: project.progress >= 100 ? 'done' : (project.progress > 0 ? 'in-progress' : 'todo')
    });

    // Refresh tasks in store
    store.update('tasks', await api.get('planner.php'));
}

/**
 * Create a new span task for a project
 * 
 * @param {Object} project - The project to create a span for
 * @returns {Object} The created span task
 */
async function createSpanTask(project) {
    const state = store.get();
    const resource = (state.team && state.team[0]?.name) || 'General';

    // Use current time instead of hardcoded defaults
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 8); // HH:MM:SS
    const endTime = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().substring(0, 8); // +1 hour

    const spanData = {
        title: `[PROJECT] ${project.name}`,
        project_id: project.id,
        resource_id: resource,
        task_type: 'project_span',
        priority: 'low',
        status: project.progress >= 100 ? 'done' : (project.progress > 0 ? 'in-progress' : 'todo'),
        start_date: `${project.started_at}T${currentTime}`,
        end_date: `${project.completed_at}T${endTime}`,
        progress: project.progress || 0
    };

    const created = await api.post('planner.php', spanData);

    // Refresh tasks to ensure we have the created task
    const tasks = await api.get('planner.php');
    store.update('tasks', tasks);

    return tasks.find(t => t.id === created.id) || created;
}

