<?php
// setup.php
// This file initializes the database automatically for the user
error_reporting(E_ALL);
ini_set('display_errors', 1);

$host = 'localhost';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = file_get_contents(__DIR__ . '/database.sql');
    
    // Execute the SQL to create DB and tables
    $pdo->exec($sql);

    echo "<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='UTF-8'><title>إعداد قاعدة البيانات</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8f9fa;}a{display:inline-block;margin-top:15px;padding:10px 20px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:5px;}</style></head><body>";
    echo "<h1>تم إعداد قاعدة البيانات بنجاح!</h1>";
    echo "<p><a href='index.php'>الذهاب إلى النظام</a></p></body></html>";
} catch (PDOException $e) {
    echo "<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='UTF-8'><title>خطأ في الإعداد</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#fff5f5;color:#c00;}</style></head><body>";
    echo "<h1>خطأ أثناء إعداد قاعدة البيانات:</h1>";
    echo "<p>" . $e->getMessage() . "</p></body></html>";
}
?>
