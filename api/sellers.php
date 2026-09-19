<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM sellers ORDER BY name ASC");
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['name'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO sellers (name, phone) VALUES (?, ?)");
            $stmt->execute([
                $data['name'],
                empty($data['phone']) ? null : $data['phone']
            ]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'اسم البائع/المورد مطلوب']);
    }
}
?>
