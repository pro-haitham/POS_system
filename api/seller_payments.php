<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['seller_id']) || empty($data['amount'])) {
        echo json_encode(['success' => false, 'error' => 'معرف المورد والمبلغ مطلوب']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO seller_payments (seller_id, amount, note) VALUES (?, ?, ?)");
        $stmt->execute([
            $data['seller_id'],
            $data['amount'],
            empty($data['note']) ? 'سداد دفعة' : $data['note']
        ]);

        $updateStmt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt - ? WHERE id = ?");
        $updateStmt->execute([$data['amount'], $data['seller_id']]);

        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['id']) || empty($data['seller_id']) || empty($data['amount'])) {
        echo json_encode(['success' => false, 'error' => 'البيانات الأساسية مطلوبة']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        
        // 1. Fetch old payment
        $stmtOld = $pdo->prepare("SELECT * FROM seller_payments WHERE id = ?");
        $stmtOld->execute([$data['id']]);
        $old = $stmtOld->fetch();
        
        if (!$old) {
            throw new Exception("الدفعة غير موجودة");
        }
        
        // 2. Revert old effect
        $revertDebt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt + ? WHERE id = ?");
        $revertDebt->execute([$old['amount'], $old['seller_id']]);
        
        // 3. Update Record
        $updateStmt = $pdo->prepare("UPDATE seller_payments SET seller_id=?, amount=?, note=? WHERE id=?");
        $updateStmt->execute([
            $data['seller_id'],
            $data['amount'],
            $data['note'],
            $data['id']
        ]);
        
        // 4. Apply new effect
        $applyDebt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt - ? WHERE id = ?");
        $applyDebt->execute([$data['amount'], $data['seller_id']]);

        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['id'])) {
        echo json_encode(['success' => false, 'error' => 'معرف العملية مطلوب']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        
        // 1. Fetch old payment
        $stmtOld = $pdo->prepare("SELECT * FROM seller_payments WHERE id = ?");
        $stmtOld->execute([$data['id']]);
        $old = $stmtOld->fetch();
        
        if ($old) {
            // 2. Revert effect
            $revertDebt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt + ? WHERE id = ?");
            $revertDebt->execute([$old['amount'], $old['seller_id']]);
            
            // 3. Delete Record
            $delStmt = $pdo->prepare("DELETE FROM seller_payments WHERE id = ?");
            $delStmt->execute([$data['id']]);
        }

        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
