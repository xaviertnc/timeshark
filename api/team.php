<?php
header('Content-Type: application/json');
require_once 'store.php';
require_once 'debug.php';

$store = new JsonStore();
$file = 'team';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $data = $store->get($file);
            debug_log('team', 'GET', ['count' => count($data)]);
            echo json_encode($data);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }

            debug_log('team', 'POST received', $data);

            // Handle is_default: ensure only one member is default
            if (!empty($data['is_default']) && filter_var($data['is_default'], FILTER_VALIDATE_BOOLEAN)) {
                $allTeam = $store->get($file);
                $updatedAny = false;
                foreach ($allTeam as &$m) {
                    if (!empty($m['is_default']) && $m['id'] !== ($data['id'] ?? null)) {
                        $m['is_default'] = false;
                        $updatedAny = true;
                    }
                }
                if ($updatedAny) {
                    $store->save($file, $allTeam);
                }
                $data['is_default'] = true;
            } else {
                if (isset($data['is_default'])) {
                    $data['is_default'] = false;
                }
            }

            if (!empty($data['id'])) {
                // Update — must find existing record
                if (!$store->find($file, $data['id'])) {
                    debug_log('team', 'NOT FOUND for update', $data['id']);
                    http_response_code(404);
                    echo json_encode(['error' => 'Team member not found: ' . $data['id']]);
                    exit;
                }
                if (isset($data['name']) && trim($data['name']) === '') {
                    debug_log('team', 'REJECTED update: blank name', $data['id']);
                    http_response_code(400);
                    echo json_encode(['error' => 'Team member name cannot be empty']);
                    exit;
                }
                debug_log('team', 'Updating', ['id' => $data['id'], 'fields' => array_keys($data)]);
                $result = $store->update($file, $data['id'], $data);
            } else {
                // Create — name required
                if (!isset($data['name']) || trim($data['name']) === '') {
                    debug_log('team', 'REJECTED create: no name', $data);
                    http_response_code(400);
                    echo json_encode(['error' => 'Team member name is required']);
                    exit;
                }
                if (!isset($data['role'])) $data['role'] = 'Member';
                if (!isset($data['color'])) {
                    $colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
                    $data['color'] = $colors[array_rand($colors)];
                }
                $result = $store->insert($file, $data);
                debug_log('team', 'Created', ['id' => $result['id'], 'name' => $result['name']]);
            }
            echo json_encode($result);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) throw new Exception('ID required');
            debug_log('team', 'DELETE', $id);

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
    debug_log('team', 'EXCEPTION', $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
