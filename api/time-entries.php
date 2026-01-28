<?php
header('Content-Type: application/json');
require_once 'store.php';

$store = new JsonStore();
$file = 'time-entries';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $entries = $store->get($file);
            // Sort by start_time desc
            usort($entries, function($a, $b) {
                return strcmp($b['start_time'], $a['start_time']);
            });
            echo json_encode($entries);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }

            $action = $_GET['action'] ?? 'create';

            if ($action === 'start') {
                // Check for running timer
                $entries = $store->get($file);
                foreach ($entries as $entry) {
                    if (!isset($entry['end_time']) || $entry['end_time'] === null) {
                        // Stop this one automatically or throw error?
                        // Let's stop it automatically to be user friendly
                        $store->update($file, $entry['id'], ['end_time' => gmdate('c')]);
                    }
                }

                $newEntry = [
                    'project_id' => $data['project_id'],
                    'project_name' => $data['project_name'] ?? 'Unknown Project', // Cache for display
                    'description' => $data['description'] ?? '',
                    'resource_id' => $data['resource_id'] ?? 'Main',
                    'start_time' => gmdate('c'),
                    'end_time' => null
                ];
                $result = $store->insert($file, $newEntry);
                echo json_encode($result);

            } elseif ($action === 'stop') {
                $id = $data['id'] ?? null;
                $entries = $store->get($file);
                $found = false;

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
                     echo json_encode($result);
                } else {
                    echo json_encode(['error' => 'No active timer found to stop']);
                }

            } else {
                // Generic update or create
                if (isset($data['id'])) {
                    $result = $store->update($file, $data['id'], $data);
                } else {
                    $result = $store->insert($file, $data);
                }
                echo json_encode($result);
            }
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('ID required for deletion');
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
