<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $customer_id = $_GET['customer_id'] ?? null;
    if ($customer_id) {
        $stmt = $pdo->prepare("SELECT * FROM payments WHERE customer_id = ? ORDER BY id DESC");
        $stmt->execute([$customer_id]);
        echo json_encode($stmt->fetchAll());
    } else {
        echo json_encode([]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['customer_id']) && !empty($data['amount'])) {
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO payments (customer_id, amount, note) VALUES (?, ?, ?)");
            $stmt->execute([$data['customer_id'], $data['amount'], $data['note'] ?? 'سداد دفعة']);

            $stmtDebt = $pdo->prepare("UPDATE customers SET total_debt = total_debt - ? WHERE id = ?");
            $stmtDebt->execute([$data['amount'], $data['customer_id']]);

            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'بيانات الدفع غير مكتملة']);
    }
}
?>
