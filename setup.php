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

    echo "<h1>تم إعداد قاعدة البيانات بنجاح!</h1>";
    echo "<p><a href='index.php'>الذهاب إلى النظام (Go to POS)</a></p>";
} catch (PDOException $e) {
    echo "<h1>Error setting up database:</h1>";
    echo "<p>" . $e->getMessage() . "</p>";
}
?>
