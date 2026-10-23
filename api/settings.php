<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ── GET: return all settings as a flat object ────────────────────────────────
if ($method === 'GET') {
    try {
        $rows = $pdo->query("SELECT setting_key, setting_value FROM settings")->fetchAll();
        $out  = [];
        foreach ($rows as $r) {
            $out[$r['setting_key']] = $r['setting_value'];
        }
        echo json_encode(['success' => true, 'settings' => $out]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ── POST: update multiple settings in one transaction ────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || empty($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'لا توجد بيانات للحفظ']);
        exit;
    }

    // Whitelist of allowed keys
    $allowed = ['backup_interval', 'keep_local_days', 'telegram_token', 'telegram_chat_id'];

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            "INSERT INTO settings (setting_key, setting_value) VALUES (:k, :v)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
        );
        foreach ($body as $key => $value) {
            if (!in_array($key, $allowed, true)) {
                continue; // skip unknown keys
            }
            $stmt->execute([':k' => $key, ':v' => (string) $value]);
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'تم حفظ الإعدادات بنجاح']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
