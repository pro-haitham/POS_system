<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Fetch totals
    $totals = [];
    
    // Total Debt (from sellers table)
    $stmtDebt = $pdo->query("SELECT SUM(total_debt) as total_debt FROM sellers");
    $totals['total_debt'] = $stmtDebt->fetch()['total_debt'] ?: 0;
    
    // Total Purchases Value
    $stmtPurchasesTotal = $pdo->query("SELECT SUM(quantity * cost_price) as total_purchases FROM product_purchases");
    $totals['total_purchases'] = $stmtPurchasesTotal->fetch()['total_purchases'] ?: 0;
    
    // Total Payments Made (from seller_payments)
    $stmtPaymentsTotal = $pdo->query("SELECT SUM(amount) as total_payments FROM seller_payments");
    $totals['total_payments'] = $stmtPaymentsTotal->fetch()['total_payments'] ?: 0;
    
    // 2. Fetch Purchases Log
    $stmtPurchases = $pdo->query("
        SELECT pp.*, p.name as product_name, s.name as seller_name 
        FROM product_purchases pp
        LEFT JOIN products p ON pp.product_id = p.id
        LEFT JOIN sellers s ON pp.seller_id = s.id
        ORDER BY pp.purchase_date DESC, pp.id DESC
    ");
    $purchases = $stmtPurchases->fetchAll();
    
    // 3. Fetch Payments Log
    $stmtPayments = $pdo->query("
        SELECT sp.*, s.name as seller_name 
        FROM seller_payments sp
        JOIN sellers s ON sp.seller_id = s.id
        ORDER BY sp.created_at DESC, sp.id DESC
    ");
    $payments = $stmtPayments->fetchAll();

    echo json_encode([
        'success' => true,
        'totals' => $totals,
        'purchases' => $purchases,
        'payments' => $payments
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()]);
}
?>
