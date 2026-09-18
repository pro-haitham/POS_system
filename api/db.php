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
    // Ensure storage_location column exists in products table for backward compatibility
    try {
        $pdo->exec("ALTER TABLE `products` ADD COLUMN `storage_location` VARCHAR(255) DEFAULT ''");
    } catch (\PDOException $ignored) {
        // Column already exists or table not created yet
    }
    // Ensure bills table supports split payment methods
    try {
        $pdo->exec("ALTER TABLE `bills` MODIFY COLUMN `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash'");
    } catch (\PDOException $ignored) {}
    try {
        $pdo->exec("ALTER TABLE `bills` ADD COLUMN `payment_method2` VARCHAR(50) DEFAULT NULL");
    } catch (\PDOException $ignored) {}
    try {
        $pdo->exec("ALTER TABLE `bills` ADD COLUMN `paid_amount2` DECIMAL(10,2) NOT NULL DEFAULT 0.00");
    } catch (\PDOException $ignored) {}

    // Ensure type, bill_id, and items_details columns exist in payments table
    try {
        $pdo->exec("ALTER TABLE `payments` ADD COLUMN `type` ENUM('payment', 'debt') NOT NULL DEFAULT 'payment'");
    } catch (\PDOException $ignored) {}
    try {
        $pdo->exec("ALTER TABLE `payments` ADD COLUMN `bill_id` INT(11) DEFAULT NULL");
    } catch (\PDOException $ignored) {}
    try {
        $pdo->exec("ALTER TABLE `payments` ADD COLUMN `items_details` TEXT DEFAULT NULL");
    } catch (\PDOException $ignored) {}
    // Ensure default walk-in customer exists
    try {
        $pdo->exec("INSERT INTO `customers` (`id`, `name`, `phone`, `total_debt`) VALUES (1, 'عميل عابر (نقدي)', '', 0.00) ON DUPLICATE KEY UPDATE `name` = IF(`name`='عميل عام', 'عميل عابر (نقدي)', `name`)");
    } catch (\PDOException $ignored) {
    }
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
