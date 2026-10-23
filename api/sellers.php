<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM sellers ORDER BY name ASC");
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        echo json_encode(['success' => false, 'error' => 'بيانات غير صالحة']);
        exit;
    }

    $name  = isset($data['name'])  ? trim((string)$data['name'])  : '';
    $phone = isset($data['phone']) ? trim((string)$data['phone']) : '';

    if ($name === '') {
        echo json_encode(['success' => false, 'error' => 'اسم البائع/المورد مطلوب']);
        exit;
    }
    if (mb_strlen($name) > 100 || mb_strlen($phone) > 50) {
        echo json_encode(['success' => false, 'error' => 'الاسم أو رقم الهاتف أطول من المسموح']);
        exit;
    }

    try {
        // Only core business data; uuid / is_synced are populated by DB triggers.
        $stmt = $pdo->prepare("INSERT INTO sellers (name, phone) VALUES (?, ?)");
        $stmt->execute([$name, $phone === '' ? null : $phone]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()]);
    }
}
?>
