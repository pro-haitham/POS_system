<?php
/**
 * LOCAL MOCK of the cloud receiver (cloud_api/receive_sync.php).
 * Stores incoming sync payloads in the `pos_cloud_mock` database.
 *
 * Expects:  POST  Content-Type: application/json
 *           Header  X-POS-SYNC-KEY: <secret>
 *           Body    {"data": {"<table>": [ {row}, ... ], ...}}
 * Returns:  {"success": true, "synced_uuids": {"<table>": ["uuid", ...]}, "counts": {...}}
 */
header('Content-Type: application/json; charset=utf-8');

const MOCK_SECRET_KEY = 'mock_secret_123';

// Tables in dependency order. Anything else in the payload is ignored (whitelist).
const ALLOWED_TABLES = [
    'categories', 'customers', 'sellers', 'products',
    'bills', 'bill_items', 'payments', 'debt_payments',
    'product_purchases', 'seller_payments',
];

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// --- 1. Method + auth -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'error' => 'POST required']);
}

$providedKey = $_SERVER['HTTP_X_POS_SYNC_KEY'] ?? '';
if ($providedKey === '' && function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (strcasecmp($name, 'X-POS-SYNC-KEY') === 0) {
            $providedKey = $value;
            break;
        }
    }
}
if (!hash_equals(MOCK_SECRET_KEY, (string)$providedKey)) {
    respond(401, ['success' => false, 'error' => 'Unauthorized or invalid API key']);
}

// --- 2. Parse payload -------------------------------------------------------
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    respond(400, ['success' => false, 'error' => 'Invalid JSON body']);
}
if (empty($input['data']) || !is_array($input['data'])) {
    respond(400, ['success' => false, 'error' => 'No data payload found']);
}
$data = $input['data'];

// --- 3. Mock cloud DB -------------------------------------------------------
try {
    $pdo = new PDO('mysql:host=localhost;dbname=pos_cloud_mock;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    respond(500, ['success' => false, 'error' => 'Cloud DB connection failed: ' . $e->getMessage()]);
}

// Real column list per table, used to whitelist incoming column names
// (identifiers can't be bound as parameters, so they must be validated).
function tableColumns(PDO $pdo, string $table): array
{
    $stmt = $pdo->prepare(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $stmt->execute([$table]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

// --- 4. Upsert (keyed on uuid) inside one transaction ----------------------
$syncedUuids = [];
$counts = [];

try {
    $pdo->beginTransaction();

    foreach (ALLOWED_TABLES as $table) {
        if (empty($data[$table]) || !is_array($data[$table])) {
            continue;
        }

        $validCols = tableColumns($pdo, $table);
        if (!$validCols) {
            throw new RuntimeException("Table `$table` does not exist in the cloud database");
        }

        $syncedUuids[$table] = [];
        $counts[$table] = ['inserted' => 0, 'updated' => 0];

        $checkUuid = $pdo->prepare("SELECT uuid FROM `$table` WHERE uuid = ?");
        $checkId   = $pdo->prepare("SELECT uuid FROM `$table` WHERE id = ?");

        foreach ($data[$table] as $row) {
            if (!is_array($row) || empty($row['uuid'])) {
                throw new RuntimeException("Row without uuid in `$table`");
            }

            // Keep only known columns; mark as synced on the cloud side.
            $row = array_intersect_key($row, array_flip($validCols));
            $row['is_synced'] = 1;
            if (in_array('last_synced_at', $validCols, true)) {
                $row['last_synced_at'] = date('Y-m-d H:i:s');
            }

            // Guard against a primary-key clash with a *different* record
            // (the upsert is keyed on uuid, so it would silently overwrite it).
            if (isset($row['id'])) {
                $checkId->execute([$row['id']]);
                $existingUuid = $checkId->fetchColumn();
                if ($existingUuid !== false && $existingUuid !== $row['uuid']) {
                    throw new RuntimeException("ID conflict in `$table`: id {$row['id']} belongs to another uuid");
                }
            }

            $checkUuid->execute([$row['uuid']]);
            $existed = $checkUuid->fetchColumn() !== false;

            $columns      = array_keys($row);
            $colList      = '`' . implode('`, `', $columns) . '`';
            $placeholders = implode(', ', array_fill(0, count($columns), '?'));
            $updates      = [];
            foreach ($columns as $col) {
                if ($col !== 'uuid' && $col !== 'id') {
                    $updates[] = "`$col` = VALUES(`$col`)";
                }
            }
            $sql = "INSERT INTO `$table` ($colList) VALUES ($placeholders)"
                 . ($updates ? ' ON DUPLICATE KEY UPDATE ' . implode(', ', $updates) : '');

            $pdo->prepare($sql)->execute(array_values($row));

            $syncedUuids[$table][] = $row['uuid'];
            $counts[$table][$existed ? 'updated' : 'inserted']++;
        }
    }

    $pdo->commit();
    respond(200, ['success' => true, 'synced_uuids' => $syncedUuids, 'counts' => $counts]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(500, ['success' => false, 'error' => 'Sync transaction failed: ' . $e->getMessage()]);
}
