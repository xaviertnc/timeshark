<?php
header('Content-Type: application/json');
require_once 'store.php';
require_once 'debug.php';

$store = new JsonStore();
$file = 'time-entries';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $entries = $store->get($file);
            $migrated = false;
            foreach ($entries as &$entry) {
                if (!isset($entry['tags'])) {
                    $entry['tags'] = [];
                    $migrated = true;
                }
            }
            if ($migrated) {
                $store->save($file, $entries);
            }
            // Sort by start_time desc
            usort($entries, function($a, $b) {
                return strcmp($b['start_time'], $a['start_time']);
            });
            debug_log('time-entries', 'GET', ['count' => count($entries)]);
            echo json_encode($entries);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }

            $action = $_GET['action'] ?? 'create';
            debug_log('time-entries', "POST action={$action}", $data);

            if (isset($data['tags'])) {
                if (is_array($data['tags'])) {
                    $tags = array_map(function($t) { return strtolower(trim((string)$t)); }, $data['tags']);
                    $data['tags'] = array_values(array_unique(array_filter($tags, 'strlen')));
                } elseif (is_string($data['tags'])) {
                    $tagsArr = array_map('trim', explode(',', strtolower($data['tags'])));
                    $data['tags'] = array_values(array_unique(array_filter($tagsArr, 'strlen')));
                } else {
                    $data['tags'] = [];
                }
            }

            if ($action === 'start') {
                // Check for running timer
                $entries = $store->get($file);
                foreach ($entries as $entry) {
                    if (!isset($entry['end_time']) || $entry['end_time'] === null) {
                        debug_log('time-entries', 'Auto-stopping timer', $entry['id']);
                        $store->update($file, $entry['id'], ['end_time' => gmdate('c')]);
                    }
                }

                $newEntry = [
                    'task_id' => $data['task_id'] ?? null,
                    'project_id' => $data['project_id'],
                    'project_name' => $data['project_name'] ?? 'Unknown Project',
                    'description' => $data['description'] ?? '',
                    'resource_id' => $data['resource_id'] ?? 'Main',
                    'tags' => $data['tags'] ?? [],
                    'start_time' => gmdate('c'),
                    'end_time' => null
                ];
                $result = $store->insert($file, $newEntry);
                debug_log('time-entries', 'Timer started', ['id' => $result['id'], 'project' => $result['project_name']]);
                echo json_encode($result);

            } elseif ($action === 'stop') {
                $id = $data['id'] ?? null;
                $entries = $store->get($file);

                // If ID not provided, stop the latest running one
                if (!$id) {
                    foreach ($entries as $entry) {
                        if (!isset($entry['end_time']) || $entry['end_time'] === null) {
                            $id = $entry['id'];
                            break;
                        }
                    }
                }

                if ($id) {
                     $result = $store->update($file, $id, ['end_time' => gmdate('c')]);
                     debug_log('time-entries', 'Timer stopped', $id);
                     echo json_encode($result);
                } else {
                    debug_log('time-entries', 'No active timer to stop');
                    echo json_encode(['error' => 'No active timer found to stop']);
                }

            } else {
                // Generic update or create
                if (isset($data['id'])) {
                    // Update — must find existing record
                    if (!$store->find($file, $data['id'])) {
                        debug_log('time-entries', 'NOT FOUND for update', $data['id']);
                        http_response_code(404);
                        echo json_encode(['error' => 'Time entry not found: ' . $data['id']]);
                        exit;
                    }
                    debug_log('time-entries', 'Updating', ['id' => $data['id'], 'fields' => array_keys($data)]);
                    $result = $store->update($file, $data['id'], $data);
                } else {
                    if (!isset($data['tags'])) $data['tags'] = [];
                    $result = $store->insert($file, $data);
                    debug_log('time-entries', 'Created', ['id' => $result['id']]);
                }
                echo json_encode($result);
            }
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('ID required for deletion');
            }
            debug_log('time-entries', 'DELETE', $id);
            $success = $store->delete($file, $id);
            echo json_encode(['success' => $success]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    debug_log('time-entries', 'EXCEPTION', $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
