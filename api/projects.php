<?php
header('Content-Type: application/json');
require_once 'store.php';

$store = new JsonStore();
$file = 'projects';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $projects = $store->get($file);
            // Optional: enrich with customer name if needed, but doing it on frontend is efficient too.
            // Let's return as is.
            echo json_encode($projects);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }

            if (!empty($data['id']) && $store->find($file, $data['id'])) {
                // Update
                $result = $store->update($file, $data['id'], $data);
            } else {
                // Create
                if (!isset($data['status'])) {
                    $data['status'] = 'active';
                }
                // Ensure todos array exists if not provided
                if (!isset($data['todos'])) {
                    $data['todos'] = [];
                }
                $result = $store->insert($file, $data);
            }
            echo json_encode($result);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('ID required for deletion');
            }

            // Sever links from time entries
            $timeEntries = $store->get('time-entries');
            $updatedEntries = false;
            foreach ($timeEntries as &$entry) {
                if (($entry['project_id'] ?? '') == $id) {
                    $entry['project_id'] = '';
                    $entry['project_name'] = '[Deleted Project]'; // Keep the name for historical reference
                    $updatedEntries = true;
                }
            }
            if ($updatedEntries) {
                $store->save('time-entries', $timeEntries);
            }

            // Delete associated tasks (assignments in planner)
            $tasks = $store->get('tasks');
            $newTasks = array_filter($tasks, function($task) use ($id) {
                return ($task['project_id'] ?? '') != $id;
            });
            if (count($tasks) !== count($newTasks)) {
                $store->save('tasks', array_values($newTasks));
            }

            $success = $store->delete($file, $id);
            echo json_encode(['success' => $success]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
