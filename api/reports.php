<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$date = $_GET['date'] ?? date('Y-m-d');
$cashier = $_GET['cashier'] ?? '';
$customer = $_GET['customer_id'] ?? '';

// Build Query
$query = "SELECT b.*, c.name as customer_name FROM bills b LEFT JOIN customers c ON b.customer_id = c.id WHERE DATE(b.created_at) = ?";
$params = [$date];

if ($cashier) {
    $query .= " AND b.cashier_name LIKE ?";
    $params[] = "%$cashier%";
}

if ($customer) {
    $query .= " AND b.customer_id = ?";
    $params[] = $customer;
}

$query .= " ORDER BY b.id DESC";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$bills = $stmt->fetchAll();

// Calculate totals
$totals = [
    'cash' => 0,
    'card' => 0,
    'deposit' => 0,
    'total_sales' => 0
];

foreach ($bills as $bill) {
    if ($bill['type'] === 'sale') {
        $totals['total_sales'] += $bill['total_amount'];
        if ($bill['payment_method'] === 'cash') $totals['cash'] += $bill['paid_amount'];
        if ($bill['payment_method'] === 'card') $totals['card'] += $bill['paid_amount'];
        if ($bill['payment_method'] === 'deposit') $totals['deposit'] += ($bill['total_amount'] - $bill['paid_amount']); // Debt
    }
}

echo json_encode([
    'bills' => $bills,
    'totals' => $totals
]);
?>
