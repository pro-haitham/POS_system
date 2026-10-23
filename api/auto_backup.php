<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// ── Load configuration from the settings table ──────────────────────────────
try {
    $rows = $pdo->query("SELECT setting_key, setting_value FROM settings")->fetchAll();
    $cfg  = [];
    foreach ($rows as $r) {
        $cfg[$r['setting_key']] = $r['setting_value'];
    }
} catch (PDOException $e) {
    // If the table doesn't exist yet (first ever request before db.php ran fully),
    // fall back to safe defaults so the backup still works.
    $cfg = [];
}

$telegram_bot_token       = $cfg['telegram_token']   ?? '';
$telegram_chat_id         = $cfg['telegram_chat_id'] ?? '';
$backup_interval_seconds  = (int) ($cfg['backup_interval']  ?? 43200);
$keep_local_days          = (int) ($cfg['keep_local_days']  ?? 14);

// ── Allow user to disable auto-backup by setting interval to 0 ──────────────
if ($backup_interval_seconds === 0) {
    echo json_encode([
        'success' => true,
        'skipped' => true,
        'message' => 'النسخ الاحتياطي التلقائي معطل من الإعدادات'
    ]);
    exit;
}

$backup_dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'backups';
if (!is_dir($backup_dir)) {
    mkdir($backup_dir, 0777, true);
}
$state_file = $backup_dir . DIRECTORY_SEPARATOR . 'last_auto_backup.txt';
$force = isset($_GET['force']) && $_GET['force'] === '1';

// 1. Check if it is time to back up yet
if (!$force && file_exists($state_file)) {
    $last_run = (int) trim(file_get_contents($state_file));
    if ((time() - $last_run) < $backup_interval_seconds) {
        echo json_encode([
            'success' => true,
            'skipped' => true,
            'message' => 'النسخة الاحتياطية محدثة بالفعل'
        ]);
        exit;
    }
}

// 2. Dump pos_system (with triggers) using XAMPP mysqldump
$timestamp = date('Y-m-d_H-i');
$sql_file  = $backup_dir . DIRECTORY_SEPARATOR . "pos_system_{$timestamp}.sql";
$mysqldump = 'c:\\xampp\\mysql\\bin\\mysqldump.exe';

$cmd = sprintf(
    '"%s" -u root --routines --triggers --single-transaction pos_system > "%s" 2>&1',
    $mysqldump,
    $sql_file
);
exec($cmd, $output, $return_var);

if ($return_var !== 0 || !file_exists($sql_file) || filesize($sql_file) === 0) {
    echo json_encode([
        'success' => false,
        'error'   => 'فشل إنشاء النسخة الاحتياطية المحلية'
    ]);
    exit;
}

// 3. Clean up local automatic dumps older than $keep_local_days
foreach (glob($backup_dir . DIRECTORY_SEPARATOR . 'pos_system_*.sql') as $old_file) {
    if (filemtime($old_file) < (time() - ($keep_local_days * 86400))) {
        @unlink($old_file);
    }
}

// 4. Send the SQL file to Telegram (if configured)
if ($telegram_bot_token !== '' && $telegram_chat_id !== '') {
    $telegram_url = "https://api.telegram.org/bot{$telegram_bot_token}/sendDocument";
    $caption = "📦 نسخة احتياطية تلقائية لقاعدة البيانات\n📅 التاريخ: " . date('Y-m-d h:i A');

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $telegram_url,
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_POSTFIELDS     => [
            'chat_id'  => $telegram_chat_id,
            'caption'  => $caption,
            'document' => new CURLFile($sql_file, 'application/sql', basename($sql_file))
        ]
    ]);

    $response  = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_err  = curl_error($ch);
    curl_close($ch);

    if ($http_code === 200) {
        file_put_contents($state_file, (string) time());
        echo json_encode([
            'success' => true,
            'message' => 'تم حفظ النسخة الاحتياطية وإرسالها إلى تيليجرام بنجاح'
        ]);
        exit;
    } else {
        $detail = $curl_err ?: "HTTP {$http_code}";
        echo json_encode([
            'success' => false,
            'error'   => "تم الحفظ محلياً في backups/ ولكن تعذر الإرسال لتيليجرام ({$detail})"
        ]);
        exit;
    }
}

// Telegram not configured — just record the local backup timestamp
file_put_contents($state_file, (string) time());
echo json_encode([
    'success' => true,
    'message' => 'تم حفظ النسخة الاحتياطية محلياً في مجلد backups'
]);
