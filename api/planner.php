<?php
header('Content-Type: application/json');
require_once 'store.php';
require_once 'debug.php';

$store = new JsonStore();
$file = 'tasks';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $tasks = $store->get($file);
            debug_log('planner', 'GET', ['count' => count($tasks)]);
            echo json_encode($tasks);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }

            debug_log('planner', 'POST received', $data);

            if (isset($data['id'])) {
                // Update — must find existing record
                if (!$store->find($file, $data['id'])) {
                    debug_log('planner', 'NOT FOUND for update', $data['id']);
                    http_response_code(404);
                    echo json_encode(['error' => 'Task not found: ' . $data['id']]);
                    exit;
                }
                // Reject explicitly blank title on update
                if (isset($data['title']) && trim($data['title']) === '') {
                    debug_log('planner', 'REJECTED update: blank title', $data['id']);
                    http_response_code(400);
                    echo json_encode(['error' => 'Task title cannot be empty']);
                    exit;
                }
                debug_log('planner', 'Updating', ['id' => $data['id'], 'fields' => array_keys($data)]);
                $result = $store->update($file, $data['id'], $data);
            } else {
                // Create — title required
                if (!isset($data['title']) || trim($data['title']) === '') {
                    debug_log('planner', 'REJECTED create: no title', $data);
                    http_response_code(400);
                    echo json_encode(['error' => 'Task title is required']);
                    exit;
                }
                if (!isset($data['resource_id'])) $data['resource_id'] = 'me';
                if (!isset($data['start_date'])) $data['start_date'] = date('Y-m-d');
                if (!isset($data['end_date'])) $data['end_date'] = date('Y-m-d');

                $result = $store->insert($file, $data);
                debug_log('planner', 'Created', ['id' => $result['id'], 'title' => $result['title']]);
            }
            echo json_encode($result);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('ID required for deletion');
            }
            debug_log('planner', 'DELETE', $id);
            $success = $store->delete($file, $id);
            echo json_encode(['success' => $success]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    debug_log('planner', 'EXCEPTION', $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
