<?php
require 'db.php';

$zipname = "backup_" . date("Y-m-d_H-i-s") . ".zip";
$zip = new ZipArchive;
if ($zip->open($zipname, ZipArchive::CREATE) !== TRUE) {
    die("Could not open archive");
}

$tables = [];
$stmt = $pdo->query("SHOW TABLES");
while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
    $tables[] = $row[0];
}

foreach ($tables as $table) {
    // Add BOM for UTF-8 Excel compatibility (important for Arabic)
    $csvContent = "\xEF\xBB\xBF"; 
    
    $stmt = $pdo->query("SELECT * FROM $table");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($data) > 0) {
        $fp = fopen('php://temp', 'r+');
        // Write Headers
        fputcsv($fp, array_keys($data[0]));
        // Write Rows
        foreach ($data as $row) {
            fputcsv($fp, array_values($row));
        }
        rewind($fp);
        $csvContent .= stream_get_contents($fp);
        fclose($fp);
    } else {
        // If table is empty, just put headers if possible
        $stmt2 = $pdo->query("DESCRIBE $table");
        $cols = $stmt2->fetchAll(PDO::FETCH_COLUMN);
        $fp = fopen('php://temp', 'r+');
        fputcsv($fp, $cols);
        rewind($fp);
        $csvContent .= stream_get_contents($fp);
        fclose($fp);
    }
    
    $zip->addFromString($table . ".csv", $csvContent);
}

$zip->close();

header('Content-Type: application/zip');
header('Content-disposition: attachment; filename='.$zipname);
header('Content-Length: ' . filesize($zipname));
readfile($zipname);

// Delete the zip file after downloading
unlink($zipname);
exit;
?>
