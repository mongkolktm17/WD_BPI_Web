<?php
/**
 * Get Server Time API
 * Returns current server time in GMT+7 (Thailand timezone)
 */

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

// Set timezone to GMT+7 (Asia/Bangkok)
date_default_timezone_set('Asia/Bangkok');

// Get current server time
$current_time = new DateTime();

// Format time for display
$response = [
    'status' => 'success',
    'timestamp' => $current_time->getTimestamp(),
    'datetime' => $current_time->format('Y-m-d H:i:s'),
    'formatted' => $current_time->format('F j, Y \a\t h:i:s A'),
    'timezone' => 'Asia/Bangkok',
    'offset' => '+07:00'
];

echo json_encode($response);
