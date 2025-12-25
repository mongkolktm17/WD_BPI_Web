<?php
$log_file = __DIR__ . '/debug_cctv.log';
$message = date('Y-m-d H:i:s') . " - Test write from verify_log_write.php\n";
if (file_put_contents($log_file, $message, FILE_APPEND)) {
    echo "Successfully wrote to $log_file";
    echo "<br>Content:<br>";
    echo nl2br(file_get_contents($log_file));
} else {
    echo "Failed to write to $log_file. Check permissions.";
}
?>