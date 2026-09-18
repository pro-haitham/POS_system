<?php
// api/db.php

$host = 'localhost';
$db   = 'pos_system';
$user = 'root';
$pass = ''; // Default XAMPP password is empty
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // If DB doesn't exist, we connect to MySQL without DB selected to create it (used in setup.php)
    try {
        $dsn_no_db = "mysql:host=$host;charset=$charset";
        $pdo = new PDO($dsn_no_db, $user, $pass, $options);
        // Do not throw error here, setup.php will handle it
    } catch (\PDOException $e2) {
        die(json_encode(["error" => "Database connection failed: " . $e2->getMessage()]));
    }
}
?>
