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

            // Validate: name is required for create, cannot be blank on update
            if (empty($data['reorder'])) {
                if (!empty($data['id'])) {
                    // Update intent — reject explicitly blank name
                    if (isset($data['name']) && trim($data['name']) === '') {
                        http_response_code(400);
                        echo json_encode(['error' => 'Project name cannot be empty']);
                        exit;
                    }
                } else {
                    // Create intent — name is required
                    if (!isset($data['name']) || trim($data['name']) === '') {
                        http_response_code(400);
                        echo json_encode(['error' => 'Project name is required']);
                        exit;
                    }
                }
            }

            if (!empty($data['reorder']) && is_array($data['reorder'])) {
                // Batch Reorder
                $projects = $store->get($file);
                foreach ($data['reorder'] as $item) {
                    foreach ($projects as &$p) {
                        if ($p['id'] == $item['id']) {
                            $p['sort_order'] = $item['sort_order'];
                            break;
                        }
                    }
                }
                $store->save($file, $projects);
                $result = ['success' => true];
            } elseif (!empty($data['id'])) {
                // Update — id provided, must find existing record
                $original = $store->find($file, $data['id']);
                if (!$original) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Project not found: ' . $data['id']]);
                    exit;
                }
                $result = $store->update($file, $data['id'], $data);
                
                // If name changed, sync with other stores
                if (isset($data['name']) && $data['name'] !== $original['name']) {
                    $pid = $data['id'];
                    $newName = $data['name'];

                    // Update time entries
                    $timeEntries = $store->get('time-entries');
                    $updatedEntries = false;
                    foreach ($timeEntries as &$entry) {
                        if (($entry['project_id'] ?? '') == $pid) {
                            $entry['project_name'] = $newName;
                            $updatedEntries = true;
                        }
                    }
                    if ($updatedEntries) {
                        $store->save('time-entries', $timeEntries);
                    }

                    // Update tasks (planner)
                    $tasks = $store->get('tasks');
                    $updatedTasks = false;
                    foreach ($tasks as &$task) {
                        if (($task['project_id'] ?? '') == $pid) {
                            $task['project_name'] = $newName;
                            $updatedTasks = true;
                        }
                    }
                    if ($updatedTasks) {
                        $store->save('tasks', $tasks);
                    }
                }
            } else {
                // Create — no id provided
                if (!isset($data['status'])) {
                    $data['status'] = 'Active';
                }
                if (!isset($data['todos'])) {
                    $data['todos'] = [];
                }
                if (!isset($data['created_at'])) {
                    $data['created_at'] = date('c');
                }
                // Set default sort order to end of list
                if (!isset($data['sort_order'])) {
                    $projects = $store->get($file);
                    $maxOrder = 0;
                    foreach ($projects as $p) {
                        if (isset($p['sort_order']) && $p['sort_order'] > $maxOrder) {
                            $maxOrder = $p['sort_order'];
                        }
                    }
                    $data['sort_order'] = $maxOrder + 1;
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
