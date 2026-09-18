<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM customers ORDER BY name ASC");
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['name'])) {
        $check = $pdo->prepare("SELECT id FROM customers WHERE name = ?");
        $check->execute([$data['name']]);
        if ($check->fetch()) {
            echo json_encode(['success' => false, 'error' => 'اسم العميل مسجل مسبقاً، يرجى البحث عنه في القائمة أو اختيار اسم مختلف!']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO customers (name, phone) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['phone'] ?? '']);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } else {
        echo json_encode(['success' => false, 'error' => 'اسم العميل مطلوب']);
    }
} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['id']) && $data['id'] != 1) { // Prevent deleting default customer
        $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
        $stmt->execute([$data['id']]);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'لا يمكن حذف هذا العميل']);
    }
}
?>
