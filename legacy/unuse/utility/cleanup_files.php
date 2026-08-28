<?php
/**
 * Cleanup Script
 * 
 * This script helps identify and optionally move debug/test files
 * to a separate directory to keep the main codebase clean.
 * 
 * Run this script to see which files can be cleaned up.
 */

$base_dir = __DIR__;
$dev_dir = $base_dir . '/dev';

// Files to move (debug, test, check files)
$patterns_to_move = [
    'check_*.php',
    'debug_*.php',
    'test_*.php',
    'verify_*.php',
    'fix_*.php'
];

// Files to keep (even if they match patterns)
$files_to_keep = [
    'check_permissions.php', // Used in production
    'check_session.php'      // Used in production
];

echo "<h1>Cleanup Script - File Analysis</h1>\n";
echo "<pre>\n";

// Scan for files
$files_to_move = [];

foreach ($patterns_to_move as $pattern) {
    $matches = glob($base_dir . '/' . $pattern);
    foreach ($matches as $file) {
        $filename = basename($file);
        if (!in_array($filename, $files_to_keep)) {
            $files_to_move[] = $filename;
        }
    }
}

// Display results
echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
echo "║                         FILES RECOMMENDED FOR CLEANUP                        ║\n";
echo "╚══════════════════════════════════════════════════════════════════════════════╝\n\n";

if (empty($files_to_move)) {
    echo "✅ No files found that need cleanup!\n";
} else {
    echo "Found " . count($files_to_move) . " files that can be moved to dev/ directory:\n\n";

    foreach ($files_to_move as $file) {
        $size = filesize($base_dir . '/' . $file);
        $size_kb = round($size / 1024, 2);
        echo "  📄 $file (" . $size_kb . " KB)\n";
    }

    echo "\n";
    echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
    echo "║                              CLEANUP OPTIONS                                 ║\n";
    echo "╚══════════════════════════════════════════════════════════════════════════════╝\n\n";

    echo "To move these files to dev/ directory, add ?action=move to the URL\n";
    echo "Example: http://localhost/wdbpi/cleanup_files.php?action=move\n\n";

    echo "⚠️  WARNING: Make sure you have a backup before moving files!\n";
}

// Execute cleanup if requested
if (isset($_GET['action']) && $_GET['action'] === 'move') {
    echo "\n\n";
    echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
    echo "║                           EXECUTING CLEANUP                                  ║\n";
    echo "╚══════════════════════════════════════════════════════════════════════════════╝\n\n";

    // Create dev directory if it doesn't exist
    if (!is_dir($dev_dir)) {
        if (mkdir($dev_dir, 0755, true)) {
            echo "✅ Created dev/ directory\n\n";
        } else {
            echo "❌ Failed to create dev/ directory\n";
            exit;
        }
    }

    // Move files
    $moved = 0;
    $failed = 0;

    foreach ($files_to_move as $file) {
        $source = $base_dir . '/' . $file;
        $dest = $dev_dir . '/' . $file;

        if (rename($source, $dest)) {
            echo "✅ Moved: $file\n";
            $moved++;
        } else {
            echo "❌ Failed to move: $file\n";
            $failed++;
        }
    }

    echo "\n";
    echo "╔══════════════════════════════════════════════════════════════════════════════╗\n";
    echo "║                              CLEANUP SUMMARY                                 ║\n";
    echo "╚══════════════════════════════════════════════════════════════════════════════╝\n\n";

    echo "✅ Successfully moved: $moved files\n";
    if ($failed > 0) {
        echo "❌ Failed to move: $failed files\n";
    }

    echo "\nAll debug/test files have been moved to the dev/ directory.\n";
    echo "You can safely delete the dev/ directory in production.\n";
}

echo "\n</pre>\n";
?>