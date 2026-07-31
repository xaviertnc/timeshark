<?php
/**
 * Debug Logger — writes to logs/debug_{YYMMDD}_{HH}.log (hourly rotation).
 * 
 * Usage:
 *   require_once 'debug.php';
 *   debug_log('projects', 'Update request', ['id' => $id, 'data' => $data]);
 *   debug_log('tasks', 'Task not found', $taskId);
 */

// Timezone & error log
date_default_timezone_set('Africa/Johannesburg');
ini_set('error_log', __DIR__ . '/../php_errors.log');

function debug_log(string $context, string $message, $data = null): void {
    $logsDir = __DIR__ . '/../logs';
    if (!is_dir($logsDir)) {
        mkdir($logsDir, 0777, true);
    }

    $now = new DateTime();
    $filename = 'debug_' . $now->format('ymd_H') . '.log';
    $filepath = $logsDir . DIRECTORY_SEPARATOR . $filename;

    $timestamp = $now->format('H:i:s.v');
    $line = "[{$timestamp}] [{$context}] {$message}";

    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $line .= ' ' . json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            $line .= ' ' . $data;
        }
    }

    file_put_contents($filepath, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}
