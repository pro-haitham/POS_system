<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

// ── Supplier Balances: all sellers with their live total_debt ─────────────
if ($action === 'balances') {
    try {
        $stmt = $pdo->query("SELECT id, name, phone, total_debt FROM sellers ORDER BY name ASC");
        echo json_encode(['success' => true, 'sellers' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ── Account Statement: merged purchase + payment ledger for one seller ────
if ($action === 'account_statement') {
    $sellerId = isset($_GET['seller_id']) ? (int)$_GET['seller_id'] : 0;
    if ($sellerId <= 0) {
        echo json_encode(['success' => false, 'error' => 'معرف المورد مطلوب']);
        exit;
    }
    try {
        // purchase rows
        $stmtP = $pdo->prepare("
            SELECT
                pp.id,
                COALESCE(pp.purchase_date, pp.id) AS sort_date,
                pp.purchase_date                  AS tx_date,
                'purchase'                        AS tx_type,
                pr.name                           AS product_name,
                pp.quantity,
                pp.cost_price,
                ROUND(pp.quantity * pp.cost_price, 2)                       AS total_cost,
                pp.paid_amount,
                ROUND(GREATEST(0, pp.quantity * pp.cost_price - pp.paid_amount), 2) AS debt_amount,
                pp.note
            FROM product_purchases pp
            LEFT JOIN products pr ON pr.id = pp.product_id
            WHERE pp.seller_id = ?
        ");
        $stmtP->execute([$sellerId]);
        $purchases = $stmtP->fetchAll();

        // payment rows
        $stmtPay = $pdo->prepare("
            SELECT
                sp.id,
                COALESCE(sp.payment_date, sp.created_at) AS sort_date,
                COALESCE(sp.payment_date, sp.created_at) AS tx_date,
                'payment'  AS tx_type,
                NULL       AS product_name,
                NULL       AS quantity,
                NULL       AS cost_price,
                NULL       AS total_cost,
                sp.amount  AS paid_amount,
                NULL       AS debt_amount,
                sp.note
            FROM seller_payments sp
            WHERE sp.seller_id = ?
        ");
        $stmtPay->execute([$sellerId]);
        $payments = $stmtPay->fetchAll();

        // merge and sort chronologically
        $rows = array_merge($purchases, $payments);
        usort($rows, fn($a, $b) => strcmp((string)$a['sort_date'], (string)$b['sort_date']));

        // seller meta
        $stmtS = $pdo->prepare("SELECT name, phone, total_debt FROM sellers WHERE id = ?");
        $stmtS->execute([$sellerId]);
        $seller = $stmtS->fetch();

        echo json_encode(['success' => true, 'seller' => $seller, 'rows' => $rows]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ── Default: full global report (purchases log + payments log + totals) ────
try {
    $totals = [];

    $stmtDebt = $pdo->query("SELECT SUM(total_debt) as total_debt FROM sellers");
    $totals['total_debt'] = $stmtDebt->fetch()['total_debt'] ?: 0;

    $stmtPurchasesTotal = $pdo->query("SELECT SUM(quantity * cost_price) as total_purchases FROM product_purchases");
    $totals['total_purchases'] = $stmtPurchasesTotal->fetch()['total_purchases'] ?: 0;

    $stmtPaymentsTotal = $pdo->query("SELECT SUM(amount) as total_payments FROM seller_payments");
    $totals['total_payments'] = $stmtPaymentsTotal->fetch()['total_payments'] ?: 0;

    $stmtPurchases = $pdo->query("
        SELECT pp.*, p.name as product_name, s.name as seller_name
        FROM product_purchases pp
        LEFT JOIN products p ON pp.product_id = p.id
        LEFT JOIN sellers s ON pp.seller_id = s.id
        ORDER BY pp.purchase_date DESC, pp.id DESC
    ");
    $purchases = $stmtPurchases->fetchAll();

    // LEFT JOIN so orphaned payments (deleted/missing supplier) still appear and match the totals card
    $stmtPayments = $pdo->query("
        SELECT sp.*, COALESCE(s.name, 'مورد غير موجود') as seller_name
        FROM seller_payments sp
        LEFT JOIN sellers s ON sp.seller_id = s.id
        ORDER BY sp.created_at DESC, sp.id DESC
    ");
    $payments = $stmtPayments->fetchAll();

    echo json_encode([
        'success'   => true,
        'totals'    => $totals,
        'purchases' => $purchases,
        'payments'  => $payments
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success'   => true,
        'totals'    => ['total_debt' => 0, 'total_purchases' => 0, 'total_payments' => 0],
        'purchases' => [],
        'payments'  => [],
        'error_msg' => 'تم استرجاع السجلات الافتراضية: ' . $e->getMessage()
    ]);
}
?>
