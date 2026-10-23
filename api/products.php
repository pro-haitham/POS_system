<?php
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Per-product liquid summary for the Inventory page cards.
    // NOTE: for liquid products, stock_quantity is stored in ML (sales deduct
    // quantity * unit_multiplier, where a bottle's multiplier = ml_per_bottle),
    // so total ML = stock_quantity; ml_per_bottle is used to derive bottle counts.
    if (($_GET['action'] ?? '') === 'liquid_summary') {
        $stmt = $pdo->query("SELECT id, name, stock_quantity, ml_per_bottle FROM products WHERE is_liquid = 1 ORDER BY name ASC");
        $summary = [];
        foreach ($stmt->fetchAll() as $row) {
            $totalMl  = max(0, (float)$row['stock_quantity']);
            $capacity = (float)$row['ml_per_bottle'];
            $bottles  = $capacity > 0 ? (int)floor($totalMl / $capacity) : null;
            $looseMl  = $capacity > 0 ? round($totalMl - ($bottles * $capacity), 2) : null;
            $summary[] = [
                'id'            => (int)$row['id'],
                'name'          => $row['name'],
                'total_ml'      => round($totalMl, 2),
                'ml_per_bottle' => $capacity,
                'bottles'       => $bottles,
                'loose_ml'      => $looseMl,
            ];
        }
        echo json_encode($summary);
        exit;
    }

    $search = $_GET['search'] ?? '';
    if ($search) {
        $stmt = $pdo->prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.name LIKE ? OR p.serial_number LIKE ? ORDER BY p.id DESC");
        $stmt->execute(["%$search%", "%$search%"]);
    } else {
        $stmt = $pdo->query("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC");
    }
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['action']) && $data['action'] === 'update_price') {
        // Just updating price
        $stmt = $pdo->prepare("UPDATE products SET price = ? WHERE id = ?");
        $stmt->execute([$data['price'], $data['id']]);
        echo json_encode(['success' => true]);
    } elseif (isset($data['action']) && $data['action'] === 'update_price_stock') {
        // Atomic: update price and stock together in a single transaction
        if (empty($data['id']) || !isset($data['price'], $data['stock'])
            || !is_numeric($data['price']) || !is_numeric($data['stock'])
            || (float)$data['price'] < 0 || (float)$data['stock'] < 0) {
            echo json_encode(['success' => false, 'error' => 'قيم السعر أو المخزون غير صالحة']);
            exit;
        }
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE products SET price = ?, stock_quantity = ? WHERE id = ?");
            $stmt->execute([$data['price'], $data['stock'], $data['id']]);
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['success' => false, 'error' => 'خطأ أثناء التحديث: ' . $e->getMessage()]);
        }
    } elseif (isset($data['action']) && $data['action'] === 'update_stock') {
        // Updating stock and location
        if (isset($data['location'])) {
            $stmt = $pdo->prepare("UPDATE products SET stock_quantity = ?, storage_location = ? WHERE id = ?");
            $stmt->execute([$data['stock'], $data['location'], $data['id']]);
        } else {
            $stmt = $pdo->prepare("UPDATE products SET stock_quantity = ? WHERE id = ?");
            $stmt->execute([$data['stock'], $data['id']]);
        }
        echo json_encode(['success' => true]);
    } else {
        if (!empty($data['name']) && is_numeric($data['price'])) {
            try {
                $pdo->beginTransaction();

                // 1. Insert the new product
                $stmt = $pdo->prepare("INSERT INTO products (category_id, serial_number, name, unit, price, stock_quantity, storage_location, bulk_unit_name, bulk_qty, bulk_barcode, bulk_price, is_liquid, ml_per_bottle, bottle_price, bottle_barcode, bottles_per_box, box_price_liquid, box_barcode_liquid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    empty($data['category_id']) ? null : $data['category_id'],
                    (isset($data['serial_number']) && trim((string)$data['serial_number']) !== '') ? trim((string)$data['serial_number']) : null,
                    $data['name'],
                    empty($data['unit']) ? 'قطعة' : $data['unit'],
                    $data['price'],
                    empty($data['stock_quantity']) ? 0 : $data['stock_quantity'],
                    empty($data['location']) ? '' : $data['location'],
                    empty($data['bulk_unit_name']) ? null : $data['bulk_unit_name'],
                    empty($data['bulk_qty']) ? 0 : $data['bulk_qty'],
                    empty($data['bulk_barcode']) ? null : $data['bulk_barcode'],
                    empty($data['bulk_price']) ? null : $data['bulk_price'],
                    empty($data['is_liquid']) ? 0 : $data['is_liquid'],
                    empty($data['ml_per_bottle']) ? 0 : $data['ml_per_bottle'],
                    empty($data['bottle_price']) ? null : $data['bottle_price'],
                    empty($data['bottle_barcode']) ? null : $data['bottle_barcode'],
                    empty($data['bottles_per_box']) ? 0 : $data['bottles_per_box'],
                    empty($data['box_price_liquid']) ? null : $data['box_price_liquid'],
                    empty($data['box_barcode_liquid']) ? null : $data['box_barcode_liquid']
                ]);

                $newProductId = $pdo->lastInsertId();

                // 2. Optional: log the opening purchase and apply financials atomically
                //    Triggered when cost_price is provided (user filled the purchase section).
                if (isset($data['cost_price']) && is_numeric($data['cost_price']) && (float)$data['cost_price'] >= 0) {
                    $seller_id    = empty($data['seller_id'])     ? null            : (int)$data['seller_id'];
                    $purchase_date = empty($data['purchase_date']) ? date('Y-m-d H:i:s') : $data['purchase_date'];
                    $quantity     = (float)(empty($data['stock_quantity']) ? 0 : $data['stock_quantity']);
                    $cost_price   = (float)$data['cost_price'];
                    $paid_amount  = (float)(isset($data['paid_amount']) ? $data['paid_amount'] : 0);
                    $note         = empty($data['note']) ? null : $data['note'];

                    if ($quantity > 0) {
                        // 2a. Log in product_purchases (same fields as purchases.php POST)
                        $purchaseStmt = $pdo->prepare(
                            "INSERT INTO product_purchases (product_id, seller_id, quantity, cost_price, paid_amount, note, purchase_date)
                             VALUES (?, ?, ?, ?, ?, ?, ?)"
                        );
                        $purchaseStmt->execute([
                            $newProductId, $seller_id, $quantity,
                            $cost_price, $paid_amount, $note, $purchase_date
                        ]);

                        if ($seller_id) {
                            $total_cost = $quantity * $cost_price;
                            $debt       = $total_cost - $paid_amount;

                            // 2b. Update supplier debt for the unpaid portion (matches purchases.php)
                            if ($debt > 0) {
                                $debtStmt = $pdo->prepare("UPDATE sellers SET total_debt = total_debt + ? WHERE id = ?");
                                $debtStmt->execute([$debt, $seller_id]);
                            }

                            // 2c. Log the paid portion as a seller_payment (matches seller_payments.php POST)
                            //     This keeps the supplier's payment ledger consistent with standalone purchases.
                            if ($paid_amount > 0) {
                                $payNote    = $note ?? ('دفعة افتتاحية لمنتج: ' . $data['name']);
                                $payStmt    = $pdo->prepare(
                                    "INSERT INTO seller_payments (seller_id, amount, note, payment_date) VALUES (?, ?, ?, ?)"
                                );
                                $payStmt->execute([$seller_id, $paid_amount, $payNote, $purchase_date]);
                            }
                        }
                    }
                }

                $pdo->commit();
                echo json_encode(['success' => true, 'id' => $newProductId]);
            } catch (PDOException $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                echo json_encode(['success' => false, 'error' => 'خطأ في قاعدة البيانات: ' . $e->getMessage()]);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'الاسم والسعر (رقم صحيح) مطلوبان']);
        }
    }
} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['id'])) {
        try {
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$data['id']]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                echo json_encode(['success' => false, 'error' => 'لا يمكن حذف هذا المنتج لوجود عمليات بيع أو فواتير مرتبطة به. يرجى تصفير المخزون بدلاً من حذفه!']);
            } else {
                echo json_encode(['success' => false, 'error' => 'خطأ أثناء الحذف: ' . $e->getMessage()]);
            }
        }
    }
}
?>
