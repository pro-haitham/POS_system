<?php
require 'api/db.php';

$tables = [
    'categories', 'customers', 'products', 'sellers',
    'bills', 'bill_items', 'payments', 'debt_payments',
    'product_purchases', 'seller_payments'
];

try {
    foreach ($tables as $table) {
        // 1. Add columns
        $sql = "ALTER TABLE `$table` 
                ADD COLUMN IF NOT EXISTS `uuid` VARCHAR(36) UNIQUE,
                ADD COLUMN IF NOT EXISTS `is_synced` TINYINT(1) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS `last_synced_at` DATETIME NULL";
        $pdo->exec($sql);

        // 2. Populate UUIDs for existing rows
        $pdo->exec("UPDATE `$table` SET `uuid` = UUID() WHERE `uuid` IS NULL");

        // 3. Drop existing trigger if it exists
        $pdo->exec("DROP TRIGGER IF EXISTS `{$table}_before_insert`");
        $pdo->exec("DROP TRIGGER IF EXISTS `{$table}_before_update`");

        // 4. Create BEFORE INSERT trigger to auto-generate UUID if not provided
        $pdo->exec("
            CREATE TRIGGER `{$table}_before_insert`
            BEFORE INSERT ON `$table`
            FOR EACH ROW
            BEGIN
                IF NEW.uuid IS NULL THEN
                    SET NEW.uuid = UUID();
                END IF;
            END;
        ");

        // 5. Create BEFORE UPDATE trigger to mark as unsynced on modifications
        $pdo->exec("
            CREATE TRIGGER `{$table}_before_update`
            BEFORE UPDATE ON `$table`
            FOR EACH ROW
            BEGIN
                IF NEW.is_synced = OLD.is_synced THEN
                    SET NEW.is_synced = 0;
                END IF;
            END;
        ");
    }

    echo "Migration completed successfully!\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
