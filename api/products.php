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
                
                $newProductId = $pdo->lastInsertId();

                // If purchase details are provided, record the initial purchase
                if (isset($data['cost_price']) && is_numeric($data['cost_price'])) {
                    $seller_id = empty($data['seller_id']) ? null : $data['seller_id'];
                    $purchase_date = empty($data['purchase_date']) ? date('Y-m-d H:i:s') : $data['purchase_date'];
                    $quantity = empty($data['stock_quantity']) ? 0 : $data['stock_quantity'];
                    $paid_amount = empty($data['paid_amount']) ? 0 : (float)$data['paid_amount'];
                    $note = empty($data['note']) ? null : $data['note'];
                    
                    if ($quantity > 0) {
                        $purchaseStmt = $pdo->prepare("INSERT INTO product_purchases (product_id, seller_id, quantity, cost_price, paid_amount, note, purchase_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
                        $purchaseStmt->execute([
                            $newProductId,
                            $seller_id,
                            $quantity,
                            $data['cost_price'],
                            $paid_amount,
                            $note,
                            $purchase_date
                        ]);

                        if ($seller_id) {
                            $total_cost = (float)$quantity * (float)$data['cost_price'];
                            $debt = $total_cost - $paid_amount;
                            if ($debt > 0) {
                                $debtStmt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt + ? WHERE id = ?");
                                $debtStmt->execute([$debt, $seller_id]);
                            }
                        }
                    }
                }

                echo json_encode(['success' => true, 'id' => $newProductId]);
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
