<?php
header('Content-Type: application/json');
require_once 'store.php';
require_once 'debug.php';

$store = new JsonStore();
$file = 'projects';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? null;
            $id = $_GET['id'] ?? null;

            if ($action === 'archive' && $id) {
                // ARCHIVE PROJECT
                $activeProjects = $store->get($file);
                $project = null;
                $activeProjects = array_filter($activeProjects, function($p) use ($id, &$project) {
                    if ($p['id'] == $id) {
                        $project = $p;
                        return false;
                    }
                    return true;
                });

                if (!$project) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Project not found in active list']);
                    exit;
                }

                $project['archived_at'] = date('c');
                $project['status'] = 'Archived';
                $year = date('Y');
                $shardFile = 'archive_projects_' . $year;

                $store->insert($shardFile, $project);
                $store->save($file, array_values($activeProjects));

                debug_log('projects', 'Archived project', ['id' => $id, 'shard' => $shardFile]);
                echo json_encode(['success' => true]);
            } elseif ($action === 'restore' && $id) {
                // RESTORE PROJECT
                $dataDir = __DIR__ . '/../data/';
                $shards = glob($dataDir . 'archive_projects_*.json');
                $project = null;
                $sourceShard = null;

                foreach ($shards as $shardPath) {
                    $shardName = basename($shardPath, '.json');
                    $archive = $store->get($shardName);
                    $found = false;
                    $archive = array_filter($archive, function($p) use ($id, &$project, &$found) {
                        if ($p['id'] == $id) {
                            $project = $p;
                            $found = true;
                            return false;
                        }
                        return true;
                    });

                    if ($found) {
                        $store->save($shardName, array_values($archive));
                        $sourceShard = $shardName;
                        break;
                    }
                }

                if (!$project) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Project not found in any archive shard']);
                    exit;
                }

                $project['status'] = 'Active';
                $project['restored_at'] = date('c');
                $store->insert($file, $project);

                debug_log('projects', 'Restored project', ['id' => $id, 'from' => $sourceShard]);
                echo json_encode(['success' => true]);
            } elseif ($action === 'archives') {
                // GET ALL ARCHIVED PROJECTS
                $dataDir = __DIR__ . '/../data/';
                $shards = glob($dataDir . 'archive_projects_*.json');
                $allArchives = [];
                foreach ($shards as $shardPath) {
                    $shardName = basename($shardPath, '.json');
                    $shardData = $store->get($shardName);
                    $allArchives = array_merge($allArchives, $shardData);
                }
                echo json_encode($allArchives);
            } else {
                // DEFAULT: GET ACTIVE PROJECTS
                $projects = $store->get($file);
                debug_log('projects', 'GET', ['count' => count($projects)]);
                echo json_encode($projects);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                throw new Exception('Invalid JSON input');
            }

            // Normalize Tags across entire payload
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
            } else {
                $data['tags'] = [];
            }

            debug_log('projects', 'POST received', $data);

            // Validate: name is required for create, cannot be blank on update
            if (empty($data['reorder']) && empty($data['lane_reorder'])) {
                if (!empty($data['id'])) {
                    // Update intent — reject explicitly blank name
                    if (isset($data['name']) && trim($data['name']) === '') {
                        debug_log('projects', 'REJECTED update: blank name', $data['id']);
                        http_response_code(400);
                        echo json_encode(['error' => 'Project name cannot be empty']);
                        exit;
                    }
                } else {
                    // Create intent — name is required
                    if (!isset($data['name']) || trim($data['name']) === '') {
                        debug_log('projects', 'REJECTED create: no name', $data);
                        http_response_code(400);
                        echo json_encode(['error' => 'Project name is required']);
                        exit;
                    }
                }
            }

            if (!empty($data['reorder']) && is_array($data['reorder'])) {
                // Batch Reorder (list_order)
                debug_log('projects', 'Batch list_order reorder', ['count' => count($data['reorder'])]);
                $projects = $store->get($file);
                foreach ($data['reorder'] as $item) {
                    foreach ($projects as &$p) {
                        if ($p['id'] == $item['id']) {
                            $p['list_order'] = $item['list_order'] ?? ($item['sort_order'] ?? 0);
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
                    debug_log('projects', 'NOT FOUND for update', $data['id']);
                    http_response_code(404);
                    echo json_encode(['error' => 'Project not found: ' . $data['id']]);
                    exit;
                }
                debug_log('projects', 'Updating', ['id' => $data['id'], 'fields' => array_keys($data)]);
                $result = $store->update($file, $data['id'], $data);
                

            } else {
                // Create — no id provided
                if (!isset($data['status'])) {
                    $data['status'] = 'Active';
                }
                if (!isset($data['type'])) {
                    $data['type'] = 'project';
                }
                if (!isset($data['tags']) || !is_array($data['tags'])) {
                    $data['tags'] = [];
                }
                if (!isset($data['parent_id'])) {
                    $data['parent_id'] = null;
                }
                if (!isset($data['created_at'])) {
                    $data['created_at'] = date('c');
                }
                // Set default list order to end of list
                if (!isset($data['list_order'])) {
                    $projects = $store->get($file);
                    $maxOrder = 0;
                    foreach ($projects as $p) {
                        $ord = $p['list_order'] ?? ($p['sort_order'] ?? 0);
                        if ($ord > $maxOrder) {
                            $maxOrder = $ord;
                        }
                    }
                    $data['list_order'] = $maxOrder + 1;
                }
                $result = $store->insert($file, $data);
                debug_log('projects', 'Created', ['id' => $result['id'], 'name' => $result['name']]);
            }
            echo json_encode($result);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('ID required for deletion');
            }
            debug_log('projects', 'DELETE', $id);

            // Sever links from time entries
            $timeEntries = $store->get('time-entries');
            $updatedEntries = false;
            foreach ($timeEntries as &$entry) {
                if (($entry['project_id'] ?? '') == $id) {
                    $entry['project_id'] = '';
                    unset($entry['project_name']);
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
    debug_log('projects', 'EXCEPTION', $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
