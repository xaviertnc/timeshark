<?php
header('Content-Type: application/json');
require_once 'store.php';

$store = new JsonStore();
$file = 'customers';
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
                // Update
                $result = $store->update($file, $data['id'], $data);
            } else {
                // Create
                if (!isset($data['color'])) {
                    $colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
                    $data['color'] = $colors[array_rand($colors)];
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
            
            // Sever links from projects
            $projects = $store->get('projects');
            $updatedProjects = false;
            foreach ($projects as &$project) {
                if (($project['customer_id'] ?? '') == $id) {
                    $project['customer_id'] = '';
                    $updatedProjects = true;
                }
            }
            if ($updatedProjects) {
                $store->save('projects', $projects);
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
