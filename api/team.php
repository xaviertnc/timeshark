<?php
header('Content-Type: application/json');
require_once 'store.php';

$store = new JsonStore();
$file = 'team';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            echo json_encode($store->get($file));
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }

            if (!empty($data['id']) && $store->find($file, $data['id'])) {
                $result = $store->update($file, $data['id'], $data);
            } else {
                if (!isset($data['role'])) $data['role'] = 'Member';
                if (!isset($data['color'])) {
                    $colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
                    $data['color'] = $colors[array_rand($colors)];
                }
                $result = $store->insert($file, $data);
            }
            echo json_encode($result);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) throw new Exception('ID required');
            
            // Get team member to find their name
            $member = $store->find($file, $id);
            if ($member) {
                $name = $member['name'] ?? '';
                if ($name) {
                    // Sever links in tasks (assignments)
                    $tasks = $store->get('tasks');
                    $updatedTasks = false;
                    foreach ($tasks as &$task) {
                        if (($task['resource_id'] ?? '') === $name) {
                            $task['resource_id'] = 'Main'; // Default to Main or empty
                            $updatedTasks = true;
                         }
                    }
                    if ($updatedTasks) {
                        $store->save('tasks', $tasks);
                    }
                }
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
