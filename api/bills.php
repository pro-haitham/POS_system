<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    if ($id) {
        $stmt = $pdo->prepare("SELECT b.*, c.name as customer_name, c.phone as customer_phone 
                               FROM bills b 
                               LEFT JOIN customers c ON b.customer_id = c.id 
                               WHERE b.id = ?");
        $stmt->execute([$id]);
        $bill = $stmt->fetch();

        if (!$bill) {
            echo json_encode(['success' => false, 'error' => 'الفاتورة غير موجودة']);
            exit;
        }

        $stmtItems = $pdo->prepare("SELECT bi.*, p.name as product_name, p.unit as product_unit, p.serial_number 
                                    FROM bill_items bi 
                                    LEFT JOIN products p ON bi.product_id = p.id 
                                    WHERE bi.bill_id = ?");
        $stmtItems->execute([$id]);
        $items = $stmtItems->fetchAll();

        echo json_encode([
            'success' => true,
            'bill' => $bill,
            'items' => $items
        ]);
        exit;
    } else {
        $stmt = $pdo->query("SELECT b.*, c.name as customer_name FROM bills b LEFT JOIN customers c ON b.customer_id = c.id ORDER BY b.id DESC LIMIT 50");
        echo json_encode($stmt->fetchAll());
        exit;
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['items'])) {
        echo json_encode(['success' => false, 'error' => 'الفاتورة فارغة']);
        exit;
    }

    $type = $data['type'] ?? 'sale';
    $paymentMethod = $data['payment_method'] ?? 'cash';
    $paymentMethod2 = !empty($data['payment_method2']) ? $data['payment_method2'] : null;
    $customerId = $data['customer_id'] ?? 1;
    $cashierName = $data['cashier_name'] ?? 'كاشير عام';
    $totalAmount = (float)$data['total_amount'];
    $paidAmount = (float)$data['paid_amount'];
    $paidAmount2 = (float)($data['paid_amount2'] ?? 0);
    $items = $data['items'];

    // Compute actual collected cash/electronic payment (excluding deposit/debt)
    $collectedPaid1 = ($paymentMethod !== 'deposit') ? $paidAmount : 0;
    $collectedPaid2 = ($paymentMethod2 && $paymentMethod2 !== 'deposit') ? $paidAmount2 : 0;
    $totalCollectedPaid = $collectedPaid1 + $collectedPaid2;
    $debtDifference = max(0, $totalAmount - $totalCollectedPaid);

    try {
        $pdo->beginTransaction();

        // 1. Create Bill
        $stmt = $pdo->prepare("INSERT INTO bills (type, payment_method, payment_method2, total_amount, paid_amount, paid_amount2, customer_id, cashier_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$type, $paymentMethod, $paymentMethod2, $totalAmount, $paidAmount, $paidAmount2, $customerId, $cashierName]);
        $billId = $pdo->lastInsertId();

        // 2. Add Items & Update Stock & Build Items Summary
        $stmtItem = $pdo->prepare("INSERT INTO bill_items (bill_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)");
        $stmtStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
        
        $itemSummaries = [];
        $stmtP = $pdo->prepare("SELECT name, unit FROM products WHERE id = ?");

        foreach ($items as $item) {
            $stmtItem->execute([$billId, $item['product_id'], $item['quantity'], $item['unit_price'], $item['total_price']]);
            
            // Adjust stock: decrease if sale, increase if purchase
            $stockChange = ($type === 'sale') ? -$item['quantity'] : $item['quantity'];
            $stmtStock->execute([$stockChange, $item['product_id']]);

            // Get product name for debt details
            $stmtP->execute([$item['product_id']]);
            $pData = $stmtP->fetch();
            $pName = $pData ? $pData['name'] : 'صنف';
            $pUnit = $pData ? $pData['unit'] : '';
            $itemSummaries[] = "{$pName} ({$item['quantity']} {$pUnit})";
        }

        // 3. Update Customer Debt if any
        if ($debtDifference > 0 && $type === 'sale') {
            $stmtDebt = $pdo->prepare("UPDATE customers SET total_debt = total_debt + ? WHERE id = ?");
            $stmtDebt->execute([$debtDifference, $customerId]);

            // Record in payments table as a Debt with full itemized details
            $itemsDetailText = implode('، ', $itemSummaries);
            $stmtPay = $pdo->prepare("INSERT INTO payments (customer_id, amount, type, note, bill_id, items_details) VALUES (?, ?, 'debt', ?, ?, ?)");
            $stmtPay->execute([
                $customerId,
                $debtDifference,
                "متبقي فاتورة مبيعات #{$billId}",
                $billId,
                $itemsDetailText
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'bill_id' => $billId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
