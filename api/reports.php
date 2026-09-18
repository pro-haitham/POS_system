<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$date = $_GET['date'] ?? date('Y-m-d');
$cashier = trim($_GET['cashier'] ?? '');
$customer = trim($_GET['customer_id'] ?? '');
$payment_method = trim($_GET['payment_method'] ?? '');
$sort = $_GET['sort'] ?? 'time_desc';

// Build Query
$conditions = [];
$params = [];

if (!empty($date) && $date !== 'all') {
    $conditions[] = "DATE(b.created_at) = ?";
    $params[] = $date;
}

if (!empty($cashier)) {
    $conditions[] = "b.cashier_name LIKE ?";
    $params[] = "%$cashier%";
}

if (!empty($customer)) {
    $conditions[] = "b.customer_id = ?";
    $params[] = $customer;
}

if (!empty($payment_method) && $payment_method !== 'all') {
    $conditions[] = "(b.payment_method = ? OR (b.payment_method2 = ? AND b.paid_amount2 > 0))";
    $params[] = $payment_method;
    $params[] = $payment_method;
}

$whereClause = "";
if (count($conditions) > 0) {
    $whereClause = " WHERE " . implode(" AND ", $conditions);
}

$orderBy = " ORDER BY b.created_at DESC, b.id DESC";
switch ($sort) {
    case 'time_asc':
        $orderBy = " ORDER BY b.created_at ASC, b.id ASC";
        break;
    case 'amount_desc':
        $orderBy = " ORDER BY b.total_amount DESC, b.id DESC";
        break;
    case 'amount_asc':
        $orderBy = " ORDER BY b.total_amount ASC, b.id ASC";
        break;
    case 'id_asc':
        $orderBy = " ORDER BY b.id ASC";
        break;
    case 'id_desc':
        $orderBy = " ORDER BY b.id DESC";
        break;
    case 'time_desc':
    default:
        $orderBy = " ORDER BY b.created_at DESC, b.id DESC";
        break;
}

$query = "SELECT b.*, c.name as customer_name, c.phone as customer_phone 
          FROM bills b 
          LEFT JOIN customers c ON b.customer_id = c.id 
          $whereClause 
          $orderBy";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$bills = $stmt->fetchAll();

// Calculate totals
$totals = [
    'cash' => 0,
    'card' => 0,
    'deposit' => 0,
    'total_sales' => 0,
    'count' => count($bills)
];

foreach ($bills as $bill) {
    if ($bill['type'] === 'sale') {
        $totalAmt = (float)$bill['total_amount'];
        $paid1 = ($bill['payment_method'] !== 'deposit') ? (float)$bill['paid_amount'] : 0;
        $paid2 = (!empty($bill['payment_method2']) && $bill['payment_method2'] !== 'deposit') ? (float)$bill['paid_amount2'] : 0;
        $totalPaid = $paid1 + $paid2;
        $debt = max(0, $totalAmt - $totalPaid);

        $totals['total_sales'] += $totalAmt;

        // Method 1
        if ($bill['payment_method'] === 'cash') $totals['cash'] += $paid1;
        if ($bill['payment_method'] === 'card') $totals['card'] += $paid1;

        // Method 2 if split
        if (!empty($bill['payment_method2']) && $paid2 > 0) {
            if ($bill['payment_method2'] === 'cash') $totals['cash'] += $paid2;
            if ($bill['payment_method2'] === 'card') $totals['card'] += $paid2;
        }

        // Remaining uncollected amount is debt
        $totals['deposit'] += $debt;
    }
}

echo json_encode([
    'success' => true,
    'bills' => $bills,
    'totals' => $totals,
    'filter_date' => $date
]);
?>
