<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['items'])) {
        echo json_encode(['success' => false, 'error' => 'الفاتورة فارغة']);
        exit;
    }

    $type = $data['type'] ?? 'sale';
    $paymentMethod = $data['payment_method'] ?? 'cash';
    $customerId = $data['customer_id'] ?? 1;
    $cashierName = $data['cashier_name'] ?? 'كاشير عام';
    $totalAmount = $data['total_amount'];
    $paidAmount = $data['paid_amount'];
    $items = $data['items'];

    try {
        $pdo->beginTransaction();

        // 1. Create Bill
        $stmt = $pdo->prepare("INSERT INTO bills (type, payment_method, total_amount, paid_amount, customer_id, cashier_name) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$type, $paymentMethod, $totalAmount, $paidAmount, $customerId, $cashierName]);
        $billId = $pdo->lastInsertId();

        // 2. Add Items & Update Stock
        $stmtItem = $pdo->prepare("INSERT INTO bill_items (bill_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)");
        $stmtStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");

        foreach ($items as $item) {
            $stmtItem->execute([$billId, $item['product_id'], $item['quantity'], $item['unit_price'], $item['total_price']]);
            
            // Adjust stock: decrease if sale, increase if purchase
            $stockChange = ($type === 'sale') ? -$item['quantity'] : $item['quantity'];
            $stmtStock->execute([$stockChange, $item['product_id']]);
        }

        // 3. Update Customer Debt if any
        $debtDifference = $totalAmount - $paidAmount;
        if ($debtDifference > 0) {
            // If sale, customer owes us (debt increases)
            // If purchase, we owe supplier (not fully handled in simple model, let's assume we focus on selling to customers)
            // For simplicity, we add debt to customer
            if ($type === 'sale') {
                $stmtDebt = $pdo->prepare("UPDATE customers SET total_debt = total_debt + ? WHERE id = ?");
                $stmtDebt->execute([$debtDifference, $customerId]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'bill_id' => $billId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
