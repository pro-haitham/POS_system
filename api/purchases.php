<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['product_id']) || empty($data['quantity']) || !isset($data['cost_price']) || !isset($data['paid_amount'])) {
        echo json_encode(['success' => false, 'error' => 'البيانات الأساسية مطلوبة (المنتج، الكمية، التكلفة، المبلغ المدفوع)']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Insert into product_purchases
        $stmt = $pdo->prepare("INSERT INTO product_purchases (product_id, seller_id, quantity, cost_price, paid_amount, note, purchase_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $seller_id = empty($data['seller_id']) ? null : $data['seller_id'];
        $purchase_date = empty($data['purchase_date']) ? date('Y-m-d H:i:s') : $data['purchase_date'];
        $note = empty($data['note']) ? null : $data['note'];
        
        $stmt->execute([
            $data['product_id'],
            $seller_id,
            $data['quantity'],
            $data['cost_price'],
            $data['paid_amount'],
            $note,
            $purchase_date
        ]);

        // 2. Calculate and update debt if seller is provided
        if ($seller_id) {
            $total_cost = (float)$data['quantity'] * (float)$data['cost_price'];
            $debt = $total_cost - (float)$data['paid_amount'];
            if ($debt > 0) {
                $debtStmt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt + ? WHERE id = ?");
                $debtStmt->execute([$debt, $seller_id]);
            }
        }

        // 3. Update product stock
        $updateStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
        $updateStmt->execute([$data['quantity'], $data['product_id']]);

        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['id']) || empty($data['product_id']) || empty($data['quantity']) || !isset($data['cost_price']) || !isset($data['paid_amount'])) {
        echo json_encode(['success' => false, 'error' => 'البيانات الأساسية مطلوبة (المعرف، المنتج، الكمية، التكلفة، المدفوع)']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        
        // 1. Fetch old purchase
        $stmtOld = $pdo->prepare("SELECT * FROM product_purchases WHERE id = ?");
        $stmtOld->execute([$data['id']]);
        $old = $stmtOld->fetch();
        
        if (!$old) {
            throw new Exception("عملية الشراء غير موجودة");
        }
        
        // 2. Revert old effects
        // Revert Stock
        $revertStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
        $revertStock->execute([$old['quantity'], $old['product_id']]);
        
        // Revert Debt
        if ($old['seller_id']) {
            $old_debt = ((float)$old['quantity'] * (float)$old['cost_price']) - (float)$old['paid_amount'];
            if ($old_debt > 0) {
                $revertDebt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt - ? WHERE id = ?");
                $revertDebt->execute([$old_debt, $old['seller_id']]);
            }
        }
        
        // 3. Update Purchase Record
        $seller_id = empty($data['seller_id']) ? null : $data['seller_id'];
        $purchase_date = empty($data['purchase_date']) ? date('Y-m-d H:i:s') : $data['purchase_date'];
        $note = empty($data['note']) ? null : $data['note'];
        
        $updateStmt = $pdo->prepare("UPDATE product_purchases SET product_id=?, seller_id=?, quantity=?, cost_price=?, paid_amount=?, note=?, purchase_date=? WHERE id=?");
        $updateStmt->execute([
            $data['product_id'],
            $seller_id,
            $data['quantity'],
            $data['cost_price'],
            $data['paid_amount'],
            $note,
            $purchase_date,
            $data['id']
        ]);
        
        // 4. Apply new effects
        // Apply Stock
        $applyStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
        $applyStock->execute([$data['quantity'], $data['product_id']]);
        
        // Apply Debt
        if ($seller_id) {
            $new_debt = ((float)$data['quantity'] * (float)$data['cost_price']) - (float)$data['paid_amount'];
            if ($new_debt > 0) {
                $applyDebt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt + ? WHERE id = ?");
                $applyDebt->execute([$new_debt, $seller_id]);
            }
        }

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
        
        // 1. Fetch old purchase
        $stmtOld = $pdo->prepare("SELECT * FROM product_purchases WHERE id = ?");
        $stmtOld->execute([$data['id']]);
        $old = $stmtOld->fetch();
        
        if ($old) {
            // 2. Revert Stock
            $revertStock = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
            $revertStock->execute([$old['quantity'], $old['product_id']]);
            
            // 3. Revert Debt
            if ($old['seller_id']) {
                $old_debt = ((float)$old['quantity'] * (float)$old['cost_price']) - (float)$old['paid_amount'];
                if ($old_debt > 0) {
                    $revertDebt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt - ? WHERE id = ?");
                    $revertDebt->execute([$old_debt, $old['seller_id']]);
                }
            }
            
            // 4. Delete Record
            $delStmt = $pdo->prepare("DELETE FROM product_purchases WHERE id = ?");
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
