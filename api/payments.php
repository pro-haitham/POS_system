<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $customer_id = $_GET['customer_id'] ?? null;
    if ($customer_id) {
        $stmt = $pdo->prepare("SELECT p.*, c.name as customer_name, c.phone as customer_phone, c.total_debt 
                               FROM payments p 
                               LEFT JOIN customers c ON p.customer_id = c.id 
                               WHERE p.customer_id = ? 
                               ORDER BY p.id DESC");
        $stmt->execute([$customer_id]);
        echo json_encode($stmt->fetchAll());
    } else {
        $stmt = $pdo->query("SELECT p.*, c.name as customer_name, c.phone as customer_phone, c.total_debt 
                             FROM payments p 
                             LEFT JOIN customers c ON p.customer_id = c.id 
                             ORDER BY p.id DESC LIMIT 100");
        echo json_encode($stmt->fetchAll());
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!empty($data['customer_id']) && isset($data['amount'])) {
        $customerId = (int)$data['customer_id'];
        $amount = (float)$data['amount'];
        $action = $data['action'] ?? ($data['type'] === 'debt' ? 'add_debt' : 'pay_debt');
        $note = trim($data['note'] ?? '');

        if ($amount <= 0) {
            echo json_encode(['success' => false, 'error' => 'المبلغ يجب أن يكون رقماً أكبر من الصفر']);
            exit;
        }

        if ($customerId == 1 && $action === 'add_debt') {
            echo json_encode(['success' => false, 'error' => 'لا يمكن قيد دين على العميل العابر، يرجى اختيار عميل مسجل ولديه رقم هاتف']);
            exit;
        }

        try {
            $pdo->beginTransaction();

            if ($action === 'add_debt') {
                $itemsDetails = trim($data['items_details'] ?? '');
                $finalNote = empty($note) ? 'قيد دين جديد' : $note;
                if (empty($itemsDetails)) {
                    $itemsDetails = $finalNote;
                }

                // 1. Add Debt Transaction with items details
                $stmt = $pdo->prepare("INSERT INTO payments (customer_id, amount, type, note, items_details) VALUES (?, ?, 'debt', ?, ?)");
                $stmt->execute([$customerId, $amount, $finalNote, $itemsDetails]);

                // 2. Increase Customer Debt
                $stmtDebt = $pdo->prepare("UPDATE customers SET total_debt = total_debt + ? WHERE id = ?");
                $stmtDebt->execute([$amount, $customerId]);

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'تمت إضافة الدين بنجاح']);
            } else {
                // 1. Pay Debt Transaction
                $stmt = $pdo->prepare("INSERT INTO payments (customer_id, amount, type, note) VALUES (?, ?, 'payment', ?)");
                $stmt->execute([$customerId, $amount, empty($note) ? 'سداد دفعة' : $note]);

                // 2. Decrease Customer Debt
                $stmtDebt = $pdo->prepare("UPDATE customers SET total_debt = total_debt - ? WHERE id = ?");
                $stmtDebt->execute([$amount, $customerId]);

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'تم تسجيل السداد بنجاح']);
            }
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => 'خطأ في العملية: ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'الرجاء تحديد العميل وإدخال المبلغ']);
    }
}
?>
