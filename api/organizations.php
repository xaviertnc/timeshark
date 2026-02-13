<?php
header('Content-Type: application/json');
require_once 'store.php';
require_once 'debug.php';

$store = new JsonStore();
$file = 'organizations';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $data = $store->get($file);
            debug_log('organizations', 'GET', ['count' => count($data)]);
            echo json_encode($data);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }

            debug_log('organizations', 'POST received', $data);

            if (!empty($data['id'])) {
                // Update — must find existing record
                if (!$store->find($file, $data['id'])) {
                    debug_log('organizations', 'NOT FOUND for update', $data['id']);
                    http_response_code(404);
                    echo json_encode(['error' => 'Organization not found: ' . $data['id']]);
                    exit;
                }
                if (isset($data['name']) && trim($data['name']) === '') {
                    debug_log('organizations', 'REJECTED update: blank name', $data['id']);
                    http_response_code(400);
                    echo json_encode(['error' => 'Organization name cannot be empty']);
                    exit;
                }
                debug_log('organizations', 'Updating', ['id' => $data['id'], 'fields' => array_keys($data)]);
                $result = $store->update($file, $data['id'], $data);
            } else {
                // Create — name required
                if (!isset($data['name']) || trim($data['name']) === '') {
                    debug_log('organizations', 'REJECTED create: no name', $data);
                    http_response_code(400);
                    echo json_encode(['error' => 'Organization name is required']);
                    exit;
                }
                if (!isset($data['color'])) {
                    $colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
                    $data['color'] = $colors[array_rand($colors)];
                }
                $result = $store->insert($file, $data);
                debug_log('organizations', 'Created', ['id' => $result['id'], 'name' => $result['name']]);
            }
            echo json_encode($result);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('ID required for deletion');
            }
            debug_log('organizations', 'DELETE', $id);

            // Sever links from projects
            $projects = $store->get('projects');
            $updatedProjects = false;
            foreach ($projects as &$project) {
                if (($project['customer_id'] ?? '') == $id) {
                    $project['customer_id'] = '';
                    $updatedProjects = true;
                }
                if (($project['client_id'] ?? '') == $id) {
                    $project['client_id'] = '';
                    $updatedProjects = true;
                }
            }
            if ($updatedProjects) {
                $store->save('projects', $projects);
            }

            // Sever links from clients (if deleting an organization)
            $allEntries = $store->get($file);
            $updatedEntries = false;
            foreach ($allEntries as &$entry) {
                // Handle legacy single client_id
                if (($entry['client_id'] ?? '') == $id) {
                    $entry['client_id'] = '';
                    $updatedEntries = true;
                }
                // Handle new multi-org organization_ids
                if (isset($entry['organization_ids']) && is_array($entry['organization_ids'])) {
                    if (($key = array_search($id, $entry['organization_ids'])) !== false) {
                        unset($entry['organization_ids'][$key]);
                        $entry['organization_ids'] = array_values($entry['organization_ids']);
                        $updatedEntries = true;
                    }
                }
            }
            if ($updatedEntries) {
                $store->save($file, $allEntries);
            }

            $success = $store->delete($file, $id);
            echo json_encode(['success' => $success]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    debug_log('organizations', 'EXCEPTION', $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
