<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'store.php';

$type = $_GET['type'] ?? 'time_entries';
$format = strtolower($_GET['format'] ?? 'csv');
$period = strtolower($_GET['period'] ?? 'today');

$excludeProjects = [];
if (!empty($_GET['exclude_projects'])) {
    $excludeProjects = explode(',', $_GET['exclude_projects']);
}

if ($format !== 'csv' && $format !== 'json') {
    http_response_code(400);
    die(json_encode(["error" => "Invalid format. Use csv or json."]));
}

$store = new JsonStore();
if ($type === 'time_entries' || $type === 'time_entry_tasks' || $type === 'time_entry_projects') {
    $entries = $store->get('time-entries') ?? [];
} else if ($type === 'tasks' || $type === 'projects') {
    $entries = $store->get('tasks') ?? [];
} else {
    http_response_code(400);
    die(json_encode(["error" => "Invalid export type."]));
}

$now = new DateTime('now', new DateTimeZone('UTC')); // TimeShark might use UTC internally, or server time. Let's use server time but clear time portion.
$now->setTime(0, 0, 0);
$startDate = null;
$endDate = null;

switch ($period) {
    case 'today':
        $startDate = (clone $now);
        $endDate = (clone $now)->modify('+1 day');
        break;
    case 'yesterday':
        $startDate = (clone $now)->modify('-1 day');
        $endDate = (clone $now);
        break;
    case 'this_week':
        $startDate = clone $now;
        if ($startDate->format('N') != 1) $startDate->modify('last monday');
        $endDate = (clone $startDate)->modify('+7 days');
        break;
    case 'last_week':
        $startDate = clone $now;
        if ($startDate->format('N') != 1) $startDate->modify('last monday');
        $startDate->modify('-7 days');
        $endDate = clone $startDate;
        $endDate->modify('+7 days');
        break;
    case 'last_2_weeks':
        $startDate = clone $now;
        if ($startDate->format('N') != 1) $startDate->modify('last monday');
        $startDate->modify('-14 days');
        $endDate = clone $startDate;
        $endDate->modify('+14 days');
        break;
    case 'last_3_weeks':
        $startDate = clone $now;
        if ($startDate->format('N') != 1) $startDate->modify('last monday');
        $startDate->modify('-21 days');
        $endDate = clone $startDate;
        $endDate->modify('+21 days');
        break;
    case 'this_month':
        $startDate = clone $now;
        $startDate->modify('first day of this month');
        $endDate = clone $startDate;
        $endDate->modify('first day of next month');
        break;
    case 'last_month':
        $startDate = clone $now;
        $startDate->modify('first day of last month');
        $endDate = clone $startDate;
        $endDate->modify('first day of this month');
        break;
    case '7_days':
        $startDate = clone $now;
        $startDate->modify('-7 days');
        $endDate = clone $now;
        $endDate->modify('+1 day');
        break;
    case '15_days':
        $startDate = clone $now;
        $startDate->modify('-15 days');
        $endDate = clone $now;
        $endDate->modify('+1 day');
        break;
    case '30_days':
        $startDate = clone $now;
        $startDate->modify('-30 days');
        $endDate = clone $now;
        $endDate->modify('+1 day');
        break;
    case '60_days':
        $startDate = clone $now;
        $startDate->modify('-60 days');
        $endDate = clone $now;
        $endDate->modify('+1 day');
        break;
    case '90_days':
        $startDate = clone $now;
        $startDate->modify('-90 days');
        $endDate = clone $now;
        $endDate->modify('+1 day');
        break;
    default:
        // 'all' or anything else
        break;
}

$filtered = [];
foreach ($entries as $entry) {
    if ($type === 'time_entries' && !isset($entry['start_time'])) continue;
    if ($type === 'tasks' && !isset($entry['start_date'])) continue;
    
    if (!empty($entry['project_id']) && in_array((string)$entry['project_id'], $excludeProjects)) {
        continue;
    }

    try {
        $dateStr = $type === 'time_entries' ? $entry['start_time'] : $entry['start_date'];
        $entryDate = new DateTime($dateStr);
        if ($startDate && $entryDate < $startDate) continue;
        if ($endDate && $entryDate >= $endDate) continue;
        $filtered[] = $entry;
    } catch (\Exception $e) {
        continue;
    }
}

usort($filtered, function($a, $b) use ($type) {
    $timeA = $type === 'time_entries' ? ($a['start_time'] ?? '') : ($a['start_date'] ?? '');
    $timeB = $type === 'time_entries' ? ($b['start_time'] ?? '') : ($b['start_date'] ?? '');
    return strcmp($timeA, $timeB);
});

if ($type === 'projects' || $type === 'time_entry_projects') {
    $linkedProjectIds = array_unique(array_column($filtered, 'project_id'));
    $allProjects = $store->get('projects') ?? [];
    $filtered = array_values(array_filter($allProjects, function($p) use ($linkedProjectIds) {
        return in_array($p['id'], $linkedProjectIds);
    }));
    
    // Sort projects by name
    usort($filtered, function($a, $b) {
        return strcmp($a['name'] ?? '', $b['name'] ?? '');
    });
} else if ($type === 'time_entry_tasks') {
    $linkedTaskIds = array_unique(array_column($filtered, 'task_id'));
    $allTasks = $store->get('tasks') ?? [];
    $filtered = array_values(array_filter($allTasks, function($t) use ($linkedTaskIds) {
        return in_array($t['id'], $linkedTaskIds);
    }));
    
    // Sort tasks by start date
    usort($filtered, function($a, $b) {
        return strcmp($a['start_date'] ?? '', $b['start_date'] ?? '');
    });
}

// Enhance data with Project details
$projects = $store->get('projects') ?? [];
$projMap = [];
foreach ($projects as $p) {
    $projMap[$p['id']] = $p;
}

$tasks = $store->get('tasks') ?? [];
$taskMap = [];
foreach ($tasks as $t) {
    $taskMap[$t['id']] = $t;
}

$customers = $store->get('organizations') ?? [];
$customerMap = [];
foreach ($customers as $c) {
    $customerMap[$c['id']] = $c;
}

foreach ($filtered as &$e) {
    if ($type === 'projects' || $type === 'time_entry_projects') {
        $custName = '';
        if (isset($e['customer_id'])) {
            $c = $customerMap[$e['customer_id']] ?? null;
            if ($c) $custName = $c['name'];
        }
        $e['organization_name'] = $custName;
        continue;
    }
    
    if ($type === 'time_entry_tasks') {
        $proj = $projMap[$e['project_id']] ?? null;
        $e['project_name'] = $proj ? ($proj['name'] ?? 'Unknown Project') : ($e['project_name'] ?? 'Unknown');
        $custName = '';
        if ($proj && isset($proj['customer_id'])) {
            $c = $customerMap[$proj['customer_id']] ?? null;
            if ($c) $custName = $c['name'];
        }
        $e['organization_name'] = $custName;
        continue;
    }
    
    $proj = $projMap[$e['project_id']] ?? null;
    $e['project_name'] = $proj ? ($proj['name'] ?? 'Unknown Project') : ($e['project_name'] ?? 'Unknown');
    
    $custName = '';
    if ($proj && isset($proj['customer_id'])) {
        $c = $customerMap[$proj['customer_id']] ?? null;
        if ($c) $custName = $c['name'];
    }
    $e['organization_name'] = $custName;

    $taskName = '';
    if (!empty($e['task_id'])) {
        $t = $taskMap[$e['task_id']] ?? null;
        if ($t) $taskName = $t['title'] ?? '';
    }
    
    if ($type === 'time_entries') {
        $e['task_title'] = $taskName;

        // Calculate Duration in seconds
        if (!empty($e['end_time']) && !empty($e['start_time'])) {
            $s = strtotime($e['start_time']);
            $end = strtotime($e['end_time']);
            $e['duration_seconds'] = max(0, $end - $s);
        } else {
            $e['duration_seconds'] = 0;
        }
    }
    
    if (isset($e['tags']) && is_array($e['tags'])) {
        $e['tags'] = implode(", ", $e['tags']);
    } else if (!isset($e['tags'])) {
        $e['tags'] = "";
    }
}

$filenamePrefix = 'timeshark_time_entries';
if ($type === 'tasks') $filenamePrefix = 'timeshark_tasks';
else if ($type === 'projects') $filenamePrefix = 'timeshark_tasks_projects';
else if ($type === 'time_entry_tasks') $filenamePrefix = 'timeshark_time_entries_tasks';
else if ($type === 'time_entry_projects') $filenamePrefix = 'timeshark_time_entries_projects';

$timestamp = date('Ymd_His');
$filename = "{$filenamePrefix}_{$period}_{$timestamp}." . $format;
header("Content-Disposition: attachment; filename=\"$filename\"");

if ($format === 'json') {
    header('Content-Type: application/json');
    
    $result = $filtered;
    
    if ($type === 'time_entries') {
        $linkedTaskIds = array_unique(array_column($filtered, 'task_id'));
        $allTasks = $store->get('tasks') ?? [];
        $companionTasks = array_values(array_filter($allTasks, function($t) use ($linkedTaskIds) {
            return in_array($t['id'], $linkedTaskIds);
        }));
        foreach ($companionTasks as &$ct) {
            $p = $projMap[$ct['project_id']] ?? null;
            $ct['project_name'] = $p ? ($p['name'] ?? 'Unknown Project') : 'Unknown';
            $custName = '';
            if ($p && isset($p['customer_id'])) {
                $c = $customerMap[$p['customer_id']] ?? null;
                if ($c) $custName = $c['name'];
            }
            $ct['organization_name'] = $custName;
        }

        $linkedProjectIds = array_unique(array_column($filtered, 'project_id'));
        $allProjects = $store->get('projects') ?? [];
        $companionProjects = array_values(array_filter($allProjects, function($p) use ($linkedProjectIds) {
            return in_array($p['id'], $linkedProjectIds);
        }));
        foreach ($companionProjects as &$cp) {
            $custName = '';
            if (isset($cp['customer_id'])) {
                $c = $customerMap[$cp['customer_id']] ?? null;
                if ($c) $custName = $c['name'];
            }
            $cp['organization_name'] = $custName;
        }

        $result = [
            "time_entries" => $filtered,
            "tasks" => $companionTasks,
            "projects" => $companionProjects
        ];
    } else if ($type === 'tasks') {
        $linkedProjectIds = array_unique(array_column($filtered, 'project_id'));
        $allProjects = $store->get('projects') ?? [];
        $companionProjects = array_values(array_filter($allProjects, function($p) use ($linkedProjectIds) {
            return in_array($p['id'], $linkedProjectIds);
        }));
        foreach ($companionProjects as &$cp) {
            $custName = '';
            if (isset($cp['customer_id'])) {
                $c = $customerMap[$cp['customer_id']] ?? null;
                if ($c) $custName = $c['name'];
            }
            $cp['organization_name'] = $custName;
        }

        $result = [
            "tasks" => $filtered,
            "projects" => $companionProjects
        ];
    }

    echo json_encode($result, JSON_PRETTY_PRINT);
    exit;
}

if ($format === 'csv') {
    // Helper to generate CSV content as a string
    $toCsv = function($fields, $data, $typeStr, $projMap, $taskMap, $customerMap) {
        $fp = fopen('php://temp', 'r+');
        fputcsv($fp, $fields);
        foreach ($data as $row) {
            if ($typeStr === 'time_entries') {
                fputcsv($fp, [
                    $row['id'] ?? '',
                    $row['resource_id'] ?? 'Main',
                    $row['organization_name'] ?? '',
                    $row['project_name'] ?? '',
                    $row['task_title'] ?? '',
                    $row['description'] ?? '',
                    $row['notes'] ?? '',
                    $row['tags'] ?? '',
                    $row['start_time'] ?? '',
                    $row['end_time'] ?? '',
                    $row['duration_seconds'] ?? 0
                ]);
            } else if ($typeStr === 'tasks') {
                fputcsv($fp, [
                    $row['id'] ?? '',
                    $row['resource_id'] ?? 'Main',
                    $row['organization_name'] ?? '',
                    $row['project_name'] ?? '',
                    $row['title'] ?? '',
                    $row['status'] ?? '',
                    $row['progress'] ?? '0',
                    $row['priority'] ?? '',
                    $row['notes'] ?? '',
                    $row['tags'] ?? '',
                    $row['start_date'] ?? '',
                    $row['end_date'] ?? '',
                    $row['completed_at'] ?? ''
                ]);
            } else if ($typeStr === 'projects') {
                fputcsv($fp, [
                    $row['id'] ?? '',
                    $row['organization_name'] ?? '',
                    $row['name'] ?? '',
                    $row['code'] ?? '',
                    $row['color'] ?? '',
                    $row['status'] ?? '',
                    ($row['archived'] ?? false) ? 'Yes' : 'No'
                ]);
            }
        }
        rewind($fp);
        $csv = stream_get_contents($fp);
        fclose($fp);
        return $csv;
    };

    if ($type === 'time_entries' || $type === 'tasks') {
        // Multi-file export via ZIP
        $zip = new ZipArchive();
        $zipFile = tempnam(sys_get_temp_dir(), 'ts_export');
        
        if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            $timestamp = date('Ymd_His');
            
            if ($type === 'time_entries') {
                // 1. Time Entries
                $fields = ['ID', 'Resource', 'Organization', 'Project', 'Task Title', 'Description', 'Notes', 'Tags', 'Start Time', 'End Time', 'Duration (seconds)'];
                $zip->addFromString("timeshark_time_entries_{$period}_{$timestamp}.csv", $toCsv($fields, $filtered, 'time_entries', $projMap, $taskMap, $customerMap));
                
                // 2. Linked Tasks
                $linkedTaskIds = array_unique(array_column($filtered, 'task_id'));
                $allTasks = $store->get('tasks') ?? [];
                $companionTasks = array_values(array_filter($allTasks, function($t) use ($linkedTaskIds) { return in_array($t['id'], $linkedTaskIds); }));
                foreach ($companionTasks as &$ct) {
                    $p = $projMap[$ct['project_id']] ?? null;
                    $ct['project_name'] = $p ? ($p['name'] ?? 'Unknown Project') : 'Unknown';
                    $custName = ''; if ($p && isset($p['customer_id'])) { $c = $customerMap[$p['customer_id']] ?? null; if ($c) $custName = $c['name']; }
                    $ct['organization_name'] = $custName;
                }
                $fieldsTasks = ['ID', 'Resource', 'Organization', 'Project', 'Title', 'Status', 'Progress', 'Priority', 'Notes', 'Tags', 'Start Date', 'End Date', 'Completed At'];
                $zip->addFromString("timeshark_time_entries_tasks_{$period}_{$timestamp}.csv", $toCsv($fieldsTasks, $companionTasks, 'tasks', $projMap, $taskMap, $customerMap));
                
                // 3. Linked Projects
                $linkedProjectIds = array_unique(array_column($filtered, 'project_id'));
                $allProjects = $store->get('projects') ?? [];
                $companionProjects = array_values(array_filter($allProjects, function($p) use ($linkedProjectIds) { return in_array($p['id'], $linkedProjectIds); }));
                foreach ($companionProjects as &$cp) {
                    $custName = ''; if (isset($cp['customer_id'])) { $c = $customerMap[$cp['customer_id']] ?? null; if ($c) $custName = $c['name']; }
                    $cp['organization_name'] = $custName;
                }
                $fieldsProj = ['ID', 'Organization', 'Name', 'Code', 'Color', 'Status', 'Archived'];
                $zip->addFromString("timeshark_time_entries_projects_{$period}_{$timestamp}.csv", $toCsv($fieldsProj, $companionProjects, 'projects', $projMap, $taskMap, $customerMap));
                
            } else if ($type === 'tasks') {
                // 1. Tasks
                $fieldsTasks = ['ID', 'Resource', 'Organization', 'Project', 'Title', 'Status', 'Progress', 'Priority', 'Notes', 'Tags', 'Start Date', 'End Date', 'Completed At'];
                $zip->addFromString("timeshark_tasks_{$period}_{$timestamp}.csv", $toCsv($fieldsTasks, $filtered, 'tasks', $projMap, $taskMap, $customerMap));
                
                // 2. Linked Projects
                $linkedProjectIds = array_unique(array_column($filtered, 'project_id'));
                $allProjects = $store->get('projects') ?? [];
                $companionProjects = array_values(array_filter($allProjects, function($p) use ($linkedProjectIds) { return in_array($p['id'], $linkedProjectIds); }));
                foreach ($companionProjects as &$cp) {
                    $custName = ''; if (isset($cp['customer_id'])) { $c = $customerMap[$cp['customer_id']] ?? null; if ($c) $custName = $c['name']; }
                    $cp['organization_name'] = $custName;
                }
                $fieldsProj = ['ID', 'Organization', 'Name', 'Code', 'Color', 'Status', 'Archived'];
                $zip->addFromString("timeshark_tasks_projects_{$period}_{$timestamp}.csv", $toCsv($fieldsProj, $companionProjects, 'projects', $projMap, $taskMap, $customerMap));
            }
            
            $zip->close();
            
            $zipFilename = ($type === 'tasks' ? 'timeshark_tasks_bundle_' : 'timeshark_entries_bundle_') . "{$period}_{$timestamp}.zip";
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="'.$zipFilename.'"');
            header('Content-Length: ' . filesize($zipFile));
            readfile($zipFile);
            unlink($zipFile);
            exit;
        }
    } else {
        // Single file export (projects specifically requested)
        header('Content-Type: text/csv');
        $output = fopen("php://output", "w");
        if ($type === 'projects' || $type === 'time_entry_projects') {
             fputcsv($output, ['ID', 'Organization', 'Name', 'Code', 'Color', 'Status', 'Archived']);
             foreach ($filtered as $row) {
                 fputcsv($output, [
                    $row['id'] ?? '', $row['organization_name'] ?? '', $row['name'] ?? '', $row['code'] ?? '', 
                    $row['color'] ?? '', $row['status'] ?? '', ($row['archived'] ?? false) ? 'Yes' : 'No'
                 ]);
             }
        }
        fclose($output);
        exit;
    }
}
