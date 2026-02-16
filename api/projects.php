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
                // Batch Reorder (sort_order)
                debug_log('projects', 'Batch sort_order reorder', ['count' => count($data['reorder'])]);
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
            } elseif (!empty($data['lane_reorder']) && is_array($data['lane_reorder'])) {
                // Single lane move: { id, lane_order } — backend shifts the rest
                $moveId = $data['lane_reorder']['id'] ?? null;
                $newPos = (int)($data['lane_reorder']['lane_order'] ?? 0);
                debug_log('projects', 'Lane move', ['id' => $moveId, 'to' => $newPos]);

                if (!$moveId || $newPos < 1) {
                    http_response_code(400);
                    echo json_encode(['error' => 'lane_reorder requires id and lane_order']);
                    exit;
                }

                $projects = $store->get($file);

                // 1. Collect indices of projects with lane_order, sorted by current lane_order
                $laneIndices = [];
                $moveIdx = null;
                foreach ($projects as $i => $p) {
                    if (isset($p['lane_order']) && $p['lane_order'] !== null) {
                        $laneIndices[] = $i;
                    }
                    if ($p['id'] == $moveId) {
                        $moveIdx = $i;
                    }
                }

                if ($moveIdx === null) {
                    debug_log('projects', 'Lane move: project not found', $moveId);
                    http_response_code(404);
                    echo json_encode(['error' => 'Project not found: ' . $moveId]);
                    exit;
                }

                // Sort indices by current lane_order
                usort($laneIndices, function($a, $b) use ($projects) {
                    return ($projects[$a]['lane_order'] ?? 0) - ($projects[$b]['lane_order'] ?? 0);
                });

                // 2. Remove the moved project from the sorted list (if it's in it)
                $laneIndices = array_values(array_filter($laneIndices, function($i) use ($moveIdx) {
                    return $i !== $moveIdx;
                }));

                // 3. Insert it at the new position (1-based → 0-based)
                $insertAt = min($newPos - 1, count($laneIndices));
                array_splice($laneIndices, $insertAt, 0, [$moveIdx]);

                // 4. Re-assign sequential lane_order 1, 2, 3, ...
                foreach ($laneIndices as $pos => $idx) {
                    $projects[$idx]['lane_order'] = $pos + 1;
                }

                $store->save($file, $projects);
                debug_log('projects', 'Lane move complete', [
                    'id' => $moveId,
                    'finalPos' => $projects[$moveIdx]['lane_order'],
                    'totalLanes' => count($laneIndices)
                ]);
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
                
                // If name changed, sync with other stores
                if (isset($data['name']) && $data['name'] !== $original['name']) {
                    $pid = $data['id'];
                    $newName = $data['name'];
                    debug_log('projects', 'Name changed, syncing stores', ['id' => $pid, 'old' => $original['name'], 'new' => $newName]);

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
                    $entry['project_name'] = '[Deleted Project]';
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
