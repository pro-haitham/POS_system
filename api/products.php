<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $search = $_GET['search'] ?? '';
    if ($search) {
        $stmt = $pdo->prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.name LIKE ? OR p.serial_number LIKE ? ORDER BY p.id DESC");
        $stmt->execute(["%$search%", "%$search%"]);
    } else {
        $stmt = $pdo->query("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC");
    }
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['action']) && $data['action'] === 'update_price') {
        // Just updating price
        $stmt = $pdo->prepare("UPDATE products SET price = ? WHERE id = ?");
        $stmt->execute([$data['price'], $data['id']]);
        echo json_encode(['success' => true]);
    } elseif (isset($data['action']) && $data['action'] === 'update_stock') {
        // Updating stock and location
        if (isset($data['location'])) {
            $stmt = $pdo->prepare("UPDATE products SET stock_quantity = ?, storage_location = ? WHERE id = ?");
            $stmt->execute([$data['stock'], $data['location'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("UPDATE products SET stock_quantity = ? WHERE id = ?");
            $stmt->execute([$data['stock'], $data['id']]);
        }
        echo json_encode(['success' => true]);
    } else {
        if (!empty($data['name']) && is_numeric($data['price'])) {
            try {
                $stmt = $pdo->prepare("INSERT INTO products (category_id, serial_number, name, unit, price, stock_quantity, storage_location) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    empty($data['category_id']) ? null : $data['category_id'],
                    empty($data['serial_number']) ? '' : $data['serial_number'],
                    $data['name'],
                    empty($data['unit']) ? 'قطعة' : $data['unit'],
                    $data['price'],
                    empty($data['stock_quantity']) ? 0 : $data['stock_quantity'],
                    empty($data['location']) ? '' : $data['location']
                ]);
                echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()]);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'الاسم والسعر (رقم صحيح) مطلوبان']);
        }
    }
} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['id'])) {
        try {
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                echo json_encode(['success' => false, 'error' => 'لا يمكن حذف هذا المنتج لوجود عمليات بيع أو فواتير مرتبطة به. يرجى تصفير المخزون بدلاً من حذفه!']);
            } else {
                echo json_encode(['success' => false, 'error' => 'خطأ أثناء الحذف: ' . $e->getMessage()]);
            }
        }
    }
}
?>
