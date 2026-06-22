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
if ($type === 'time_entries') {
    $entries = $store->get('time-entries') ?? [];
} else if ($type === 'tasks') {
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

$filenamePrefix = $type === 'tasks' ? 'timeshark_tasks' : 'timeshark_time_entries';
$filename = "{$filenamePrefix}_{$period}." . $format;
header("Content-Disposition: attachment; filename=\"$filename\"");

if ($format === 'json') {
    header('Content-Type: application/json');
    echo json_encode($filtered, JSON_PRETTY_PRINT);
    exit;
}

if ($format === 'csv') {
    header('Content-Type: text/csv');
    $output = fopen("php://output", "w");
    if (count($filtered) > 0) {
        if ($type === 'time_entries') {
            $fields = [
                'ID', 'Resource', 'Organization', 'Project', 'Task Title', 'Description', 'Notes', 'Tags', 'Start Time', 'End Time', 'Duration (seconds)'
            ];
            fputcsv($output, $fields);
            
            foreach ($filtered as $row) {
                fputcsv($output, [
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
            }
        } else if ($type === 'tasks') {
            $fields = [
                'ID', 'Resource', 'Organization', 'Project', 'Title', 'Status', 'Progress', 'Priority', 'Notes', 'Tags', 'Start Date', 'End Date', 'Completed At'
            ];
            fputcsv($output, $fields);
            
            foreach ($filtered as $row) {
                fputcsv($output, [
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
            }
        }
    } else {
        fputcsv($output, ['No entries found for the selected period.']);
    }
    fclose($output);
    exit;
}
