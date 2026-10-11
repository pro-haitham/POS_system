<?php
header('Content-Type: application/json; charset=utf-8');

$secret_key = 'YOUR_SECRET_SYNC_KEY';
$headers = getallheaders();

// Validate API Key
if (!isset($headers['X-POS-SYNC-KEY']) || $headers['X-POS-SYNC-KEY'] !== $secret_key) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized or invalid API key']);
    exit;
}

// Database Connection for Cloud Server
$host = 'localhost';
$db   = 'cloud_pos_system'; // Change to your cloud database name
$user = 'root'; // Change to your cloud db user
$pass = ''; // Change to your cloud db password
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Cloud DB connection failed: ' . $e->getMessage()]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (empty($input['data'])) {
    echo json_encode(['success' => false, 'error' => 'No data payload found']);
    exit;
}

$data = $input['data'];
$synced_uuids = [];

try {
    $pdo->beginTransaction();

    // Tables must be synced in order to satisfy foreign key constraints
    $ordered_tables = [
        'categories', 'customers', 'sellers', 'products',
        'bills', 'bill_items', 'payments', 'debt_payments',
        'product_purchases', 'seller_payments'
    ];

    foreach ($ordered_tables as $table) {
        if (!isset($data[$table]) || empty($data[$table])) continue;
        
        $rows = $data[$table];
        $synced_uuids[$table] = [];

        foreach ($rows as $row) {
            // Unset local-only sync columns if necessary, but it's safe to sync them or override
            $row['is_synced'] = 1;
            
            $columns = array_keys($row);
            $colNames = implode('`, `', $columns);
            $placeholders = implode(', ', array_fill(0, count($columns), '?'));
            
            $updates = [];
            foreach ($columns as $col) {
                if ($col !== 'uuid') {
                    $updates[] = "`$col` = VALUES(`$col`)";
                }
            }
            $updateString = implode(', ', $updates);

            $sql = "INSERT INTO `$table` (`$colNames`) VALUES ($placeholders) 
                    ON DUPLICATE KEY UPDATE $updateString";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_values($row));
            
            $synced_uuids[$table][] = $row['uuid'];
        }
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'synced_uuids' => $synced_uuids]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Sync transaction failed: ' . $e->getMessage()]);
}
?>
