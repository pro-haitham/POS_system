<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$cloud_api_url = 'http://localhost/POS_system-main/cloud_mock/receive_sync.php'; // MOCK: replace with https://your-domain.com/api/receive_sync.php for production
$secret_key = 'mock_secret_123'; // MOCK: replace with a strong random string for production

// Don't try to reach the cloud until a real endpoint has been configured
if (strpos($cloud_api_url, 'your-domain.com') !== false || $secret_key === 'YOUR_SECRET_SYNC_KEY') {
    echo json_encode(['success' => false, 'configured' => false, 'error' => 'Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠØ© ØºÙŠØ± Ù…ÙØ¹Ù‘Ù„Ø©: Ø¹Ø¯Ù‘Ù„ $cloud_api_url Ùˆ $secret_key ÙÙŠ api/sync_to_cloud.php']);
    exit;
}

$tables = [
    'categories', 'customers', 'products', 'sellers',
    'bills', 'bill_items', 'payments', 'debt_payments',
    'product_purchases', 'seller_payments'
];

$payload = [];
$recordsToUpdate = [];

try {
    foreach ($tables as $table) {
        $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE `is_synced` = 0");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($rows) > 0) {
            $payload[$table] = $rows;
            $recordsToUpdate[$table] = array_column($rows, 'uuid');
        }
    }

    if (empty($payload)) {
        echo json_encode(['success' => true, 'message' => 'No new data to sync']);
        exit;
    }

    // Send payload to Cloud API
    $ch = curl_init($cloud_api_url);
    $jsonData = json_encode(['data' => $payload]);
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-POS-SYNC-KEY: ' . $secret_key
    ]);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    
    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErrNo = curl_errno($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlErrNo !== 0) {
        // Hard connection failure â€” return full diagnostic details
        echo json_encode([
            'success'   => false,
            'error'     => "cURL Error {$curlErrNo}: {$curlError}",
            'errno'     => $curlErrNo,
            'curl_msg'  => $curlError,
            'http_code' => $httpCode,
            'endpoint'  => $cloud_api_url
        ]);
        exit;
    }

    if ($httpCode === 200) {
        $result = json_decode($response, true);
        if (isset($result['success']) && $result['success']) {
            
            $pdo->beginTransaction();
            foreach ($recordsToUpdate as $table => $uuids) {
                // Determine synced uuids from the cloud if provided, otherwise assume all sent were synced
                $syncedUuids = isset($result['synced_uuids'][$table]) ? $result['synced_uuids'][$table] : $uuids;
                
                if (empty($syncedUuids)) continue;

                $placeholders = implode(',', array_fill(0, count($syncedUuids), '?'));
                $updateStmt = $pdo->prepare("UPDATE `$table` SET `is_synced` = 1, `last_synced_at` = NOW() WHERE `uuid` IN ($placeholders)");
                $updateStmt->execute($syncedUuids);
            }
            $pdo->commit();
            
            echo json_encode(['success' => true, 'message' => 'Synced successfully']);
        } else {
            echo json_encode([
                'success'   => false,
                'error'     => 'Cloud rejected sync: ' . ($result['error'] ?? 'Unknown error'),
                'endpoint'  => $cloud_api_url
            ]);
        }
    } else {
        // HTTP error (e.g. 404, 500, empty response)
        echo json_encode([
            'success'   => false,
            'error'     => "HTTP Error {$httpCode}" . ($curlError ? " â€” {$curlError}" : ''),
            'http_code' => $httpCode,
            'endpoint'  => $cloud_api_url,
            'response'  => $response
        ]);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>


