# PROJECT_CONTEXT.md — POS System: Complete Architectural Context

> **Purpose of this file:** Hand-off document for AI assistants continuing development on this system.
> Every section is written to be maximally useful inside an AI context window.
> Last updated: 2026-10-19 | Environment: XAMPP on Windows, PHP 8.2, MariaDB 10.x

---

## 1. Project Overview

A **fully offline-first, single-page PHP/MySQL Point of Sale (POS) system** designed for a small retail shop. The system runs entirely on a local XAMPP server (no internet required for daily operations) and serves as the authoritative data source.

**Key characteristics:**
- Single-file SPA frontend: all UI lives in `index.php`, driven by a monolithic vanilla JS object (`app` in `js/app.js`)
- REST-style PHP API endpoints in `api/` directory — each file handles one resource
- Arabic RTL interface (`dir="rtl"`) using Bootstrap RTL
- **Offline-first guarantee:** all JS/CSS dependencies are vendored locally — zero CDN calls
- Optional cloud sync: unsent rows are pushed to a configurable cloud endpoint when the browser detects connectivity
- Automated SQL backups to local disk + optional Telegram delivery

---

## 2. Tech Stack & Asset Management

### Backend
| Layer | Technology |
|---|---|
| Runtime | PHP 8.2 (XAMPP) |
| Database | MariaDB 10.x — database name: `pos_system` |
| DB Access | PDO with `PDO::ERRMODE_EXCEPTION`, `FETCH_ASSOC`, emulated prepares OFF |
| Server | Apache 2.4 (XAMPP) on Windows |
| DB Tools | `mysqldump.exe` (XAMPP bundled) for backup |
| HTTP Client | PHP `curl` — used for cloud sync and Telegram API |

### Frontend
| Library | Version | Local Path |
|---|---|---|
| Bootstrap 5 RTL | 5.x | `vendor/bootstrap.rtl.min.css` + `vendor/bootstrap.bundle.min.js` |
| jQuery | 3.x | `vendor/jquery.min.js` |
| Select2 | 4.x | `vendor/select2.min.js` + `vendor/select2.min.css` |
| Font Awesome | 6.x | `vendor/fontawesome/` (local webfont + CSS) |
| Cairo Font | — | `vendor/cairo/` (Arabic Google Font, self-hosted) |

> **CRITICAL — Offline Guarantee:** Every single frontend dependency is served from the local `vendor/` directory.
> There are **zero external CDN references** in `index.php`. Adding any `https://cdn.jsdelivr.net/` or similar URL will break offline operation.
> When adding new UI libraries, they MUST be downloaded and placed in `vendor/` first.

### Application JS files
| File | Role |
|---|---|
| `js/app.js` | Monolithic application object (~1,800 lines). All UI logic, API calls, state. |
| `js/auto_sync.js` | Background cloud sync poller + backup trigger. Loaded after `app.js`. |

---

## 3. Database Schema & Sync Architecture

### 3.1 The Sync Column Pattern (Applies to ALL tables)

Every syncable table carries **three extra columns** added via `migrate_sync.php`:

```sql
uuid          VARCHAR(36) UNIQUE  -- globally unique ID, set by BEFORE INSERT trigger
is_synced     TINYINT(1) DEFAULT 0 -- 0 = dirty/unsynced, 1 = confirmed synced to cloud
last_synced_at DATETIME DEFAULT NULL -- timestamp of last successful cloud sync
```

**MySQL Triggers (per table — two triggers each):**

```sql
-- BEFORE INSERT: auto-assign UUID if not provided
CREATE TRIGGER `{table}_before_insert` BEFORE INSERT ON `{table}` FOR EACH ROW
BEGIN
    IF NEW.uuid IS NULL THEN
        SET NEW.uuid = UUID();
    END IF;
END;

-- BEFORE UPDATE: mark row dirty whenever any business column changes
CREATE TRIGGER `{table}_before_update` BEFORE UPDATE ON `{table}` FOR EACH ROW
BEGIN
    IF NEW.is_synced = OLD.is_synced THEN
        SET NEW.is_synced = 0;
    END IF;
END;
```

Tables with these triggers (20 triggers total — BEFORE INSERT + BEFORE UPDATE per table):
`categories`, `customers`, `products`, `sellers`, `bills`, `bill_items`, `payments`, `debt_payments`, `product_purchases`, `seller_payments`

> **Rule for future developers:** Never manually set `uuid` in INSERT statements — the trigger handles it.
> Never manually set `is_synced = 1` — only `api/sync_to_cloud.php` does that after confirmed cloud receipt.

---

### 3.2 Core Table Schemas

#### `products`
```
id                 INT AUTO_INCREMENT PK
category_id        INT nullable (FK → categories.id)
serial_number      VARCHAR(100) UNIQUE nullable
name               VARCHAR(255) NOT NULL
unit               VARCHAR(50)  DEFAULT 'قطعة'
price              DECIMAL(10,2)   -- sell price per base unit (per ML if liquid)
stock_quantity     DECIMAL(10,2)   -- base unit count (ML for liquids)
storage_location   VARCHAR(255)
bulk_unit_name     VARCHAR(50)     -- custom bulk name e.g. "كرتون"
bulk_qty           INT DEFAULT 0   -- units per bulk pack
bulk_barcode       VARCHAR(100)
bulk_price         DECIMAL(10,2)
is_liquid          TINYINT(1) DEFAULT 0
ml_per_bottle      INT DEFAULT 0   -- ML capacity of one bottle
bottle_price       DECIMAL(10,2)
bottle_barcode     VARCHAR(100)
bottles_per_box    INT DEFAULT 0
box_price_liquid   DECIMAL(10,2)
box_barcode_liquid VARCHAR(100)
[legacy fields: carton_qty/price/barcode, box_qty/price/barcode, dozen_price/barcode]
uuid, is_synced, last_synced_at
```

**Liquid product rule:** When `is_liquid = 1`, `stock_quantity` stores total ML. `price` = price-per-ML. The POS layer expands one liquid product into up to 3 sell cards (per-ML, per-bottle, per-box).

#### `bills`
```
id               INT AUTO_INCREMENT PK
type             ENUM('sale','purchase') DEFAULT 'sale'
payment_method   VARCHAR(50) DEFAULT 'cash'
                 -- values: cash|card|jeeb|onecash|haseb|kuraimi|floosak|deposit
payment_method2  VARCHAR(50) nullable (split payment second method)
customer_id      INT (→ customers.id) DEFAULT 1
cashier_name     VARCHAR(100) DEFAULT 'Main User'
total_amount     DECIMAL(10,2)
paid_amount      DECIMAL(10,2)
paid_amount2     DECIMAL(10,2) DEFAULT 0.00
debt_amount      DECIMAL(10,2) DEFAULT 0.00
created_at       TIMESTAMP DEFAULT current_timestamp()
uuid, is_synced, last_synced_at
```

#### `bill_items`
```
id          INT AUTO_INCREMENT PK
bill_id     INT (→ bills.id)
product_id  INT nullable (SET NULL if product deleted)
quantity    DECIMAL(10,2)
unit_price  DECIMAL(10,2)
total_price DECIMAL(10,2)
uuid, is_synced, last_synced_at
```

#### `customers`
```
id          INT AUTO_INCREMENT PK
name        VARCHAR(150) NOT NULL
phone       VARCHAR(50)
total_debt  DECIMAL(10,2) DEFAULT 0.00  -- denormalized running balance
uuid, is_synced, last_synced_at
```
> Special: id=1 is "عميل عابر (نقدي)" (walk-in cash customer). Auto-created by db.php. NEVER DELETE.

#### `sellers` (Suppliers)
```
id          INT AUTO_INCREMENT PK
name        VARCHAR(100) NOT NULL
phone       VARCHAR(50)
total_debt  DECIMAL(10,2) DEFAULT 0.00  -- running unpaid balance owed TO supplier
created_at  TIMESTAMP DEFAULT current_timestamp()
uuid, is_synced, last_synced_at
```

#### `product_purchases` (Supplier Purchase Log)
```
id            INT AUTO_INCREMENT PK
product_id    INT NOT NULL (no live FK constraint)
seller_id     INT nullable
quantity      DECIMAL(10,2) NOT NULL
cost_price    DECIMAL(10,2) NOT NULL
paid_amount   DECIMAL(10,2) NOT NULL   -- paid at purchase time
note          TEXT nullable
purchase_date DATETIME nullable
uuid, is_synced, last_synced_at
```
> Debt per row = (quantity x cost_price) - paid_amount. Computed at query time, NOT stored.

#### `seller_payments` (Supplier Debt Repayments)
```
id           INT AUTO_INCREMENT PK
seller_id    INT NOT NULL
amount       DECIMAL(10,2) NOT NULL
payment_date DATETIME nullable
note         TEXT nullable
created_at   TIMESTAMP DEFAULT current_timestamp()
uuid, is_synced, last_synced_at
```

#### `payments` (Customer Debt Ledger)
```
id           INT AUTO_INCREMENT PK
customer_id  INT NOT NULL
amount       DECIMAL(10,2) NOT NULL
type         ENUM('payment','debt') DEFAULT 'payment'
note         TEXT nullable
bill_id      INT nullable (links debt entry to originating bill)
items_details TEXT nullable (comma-separated product list for debt entries)
created_at   DATETIME DEFAULT current_timestamp()
uuid, is_synced, last_synced_at
```

#### `debt_payments` (Explicit Customer Debt Repayments)
```
id           INT AUTO_INCREMENT PK
customer_id  INT nullable
amount_paid  DECIMAL(10,2) NOT NULL
payment_date TIMESTAMP DEFAULT current_timestamp()
uuid, is_synced, last_synced_at
```

#### `categories`
```
id   INT AUTO_INCREMENT PK
name VARCHAR(100) NOT NULL
uuid, is_synced, last_synced_at
```

---

## 4. Core Financial Workflows

### 4.1 Invoice Generation (api/bills.php POST) — Atomic Transaction
```
BEGIN TRANSACTION
  1. INSERT INTO bills → billId
  2. For each item:
       INSERT INTO bill_items (billId, productId, qty, unitPrice, totalPrice)
       UPDATE products SET stock_quantity = stock_quantity +/- (qty x unit_multiplier)
       -- unit_multiplier: 1 for unit, ml_per_bottle for bottle, ml_per_bottle x bottles_per_box for box
  3. IF type='sale' AND totalAmount > paidAmount + paidAmount2:
       debtDiff = totalAmount - (collectedPaid1 + collectedPaid2)
       UPDATE customers SET total_debt = total_debt + debtDiff
       INSERT INTO payments (type='debt', bill_id, items_details, ...)
COMMIT / ROLLBACK on Exception
```
Split payment: bill can have two methods. `deposit` method = charge to customer debt tab.

### 4.2 Supplier Purchase (api/purchases.php POST) — Atomic Transaction
```
BEGIN TRANSACTION
  1. INSERT INTO product_purchases
  2. IF sellerId: debt=(qty x costPrice)-paidAmount; IF debt>0: UPDATE sellers.total_debt += debt
  3. UPDATE products SET stock_quantity = stock_quantity + qty
COMMIT / ROLLBACK
```
PUT (edit): fetch old row, revert old stock+debt, update record, apply new stock+debt — all in one tx.
DELETE: revert stock+debt, then delete — all in one tx.

### 4.3 Opening-Stock Purchase on Product Creation (api/products.php POST)
```
BEGIN TRANSACTION
  1. INSERT INTO products → newProductId
  2. IF cost_price provided AND stock_quantity > 0:
       INSERT INTO product_purchases (newProductId, ...)
       IF sellerId:
         IF debt > 0: UPDATE sellers.total_debt += debt
         IF paidAmount > 0: INSERT INTO seller_payments (sellerId, paidAmount, ...)
COMMIT / ROLLBACK (with inTransaction() guard)
```

### 4.4 Supplier Payment (api/seller_payments.php POST)
```
BEGIN TRANSACTION
  1. INSERT INTO seller_payments (seller_id, amount, note)
  2. UPDATE sellers SET total_debt = total_debt - amount
COMMIT / ROLLBACK
```

### 4.5 Error Handling Notes
- Prefer `catch (Throwable $e)` inside transactions (catches both Exception and Error).
- Always use `if ($pdo->inTransaction()) $pdo->rollBack();` before echoing error JSON.
- `bills.php` uses `catch (Exception $e)` without inTransaction guard — known issue.

---

## 5. Supplier Ledger System

Three tables, denormalized aggregate:
- `sellers.total_debt` — always-current (mutated atomically with every purchase/payment)
- `product_purchases` — itemized purchase history (debit side)
- `seller_payments` — payment history (credit side)

### API (api/seller_reports.php GET)
| Action | Returns |
|---|---|
| (none) | Global totals + full purchase log + full payment log |
| ?action=balances | All sellers: id, name, phone, total_debt |
| ?action=account_statement&seller_id=N | Seller meta + merged chronological purchase+payment rows |

### JS Functions (js/app.js)
- `loadSellerBalances()` — renders "حسابات الموردين" tab table with debt highlighted in red
- `openAccountStatement(sellerId, name)` — opens xl modal, renders running balance column
- `openPaySellerFromStatement()` — opens payment modal pre-filled from cached seller context
- `submitSellerPayment()` — after success: refreshes balances table + re-renders open statement + reloads global logs

---

## 6. Cloud Sync Engine

### js/auto_sync.js — class AutoSync
- Initial sync: 3 seconds after page load
- Recurring: every 30,000ms (30 seconds)
- Guard: skips if `!navigator.onLine` OR `this.isSyncing` (no concurrent syncs)
- If cloud returns `{configured:false}`: stops polling permanently via clearInterval

### api/sync_to_cloud.php
Configure at top: `$cloud_api_url` and `$secret_key`
- Currently mocked to `cloud_mock/receive_sync.php` (local loopback)
- Sends: POST JSON `{"data": {tableName: [...rows with is_synced=0...]}}` + `X-POS-SYNC-KEY` header
- On HTTP 200 + success: marks sent rows `is_synced=1, last_synced_at=NOW()` in transaction
- Production receiver template: `cloud_api/receive_sync.php`

Synced tables (10): categories, customers, products, sellers, bills, bill_items, payments, debt_payments, product_purchases, seller_payments

---

## 7. Automated Backup System

### api/auto_backup.php
- Interval: 43200s (12h) — checked via `backups/last_auto_backup.txt`
- Override: `?force=1` bypasses interval
- Command: `mysqldump -u root --routines --triggers --single-transaction pos_system`
- Output: `backups/pos_system_YYYY-MM-DD_HH-mm.sql`
- Retention: deletes files older than 14 days from backups/
- Telegram: if configured, sends .sql as document via Bot API; records timestamp only on HTTP 200
- Trigger (auto_sync.js): 10s after page load + every 30min, only when `navigator.onLine`

---

## 8. API Endpoint Reference

| File | Methods | Resource |
|---|---|---|
| api/db.php | — | PDO connection + inline schema migrations |
| api/products.php | GET, POST, DELETE | Products; GET ?action=liquid_summary; POST actions: (none)=create, update_price_stock, update_stock, update_price |
| api/bills.php | GET, POST | Bills; GET ?id=N returns bill+items |
| api/customers.php | GET, POST, DELETE | Customers |
| api/sellers.php | GET, POST | Suppliers |
| api/purchases.php | POST, PUT, DELETE | Supplier purchase log (all atomic) |
| api/seller_payments.php | POST, PUT, DELETE | Supplier payment log (all atomic) |
| api/seller_reports.php | GET | Supplier reports (?action=balances / account_statement) |
| api/payments.php | GET, POST, DELETE | Customer debt payment log |
| api/reports.php | GET | Sales analytics (date + method filters) |
| api/categories.php | GET, POST, DELETE | Product categories |
| api/sync_to_cloud.php | GET | Cloud sync push |
| api/auto_backup.php | GET | Timed backup (?force=1) |
| api/backup.php | GET | Manual backup management |

---

## 9. Directory Structure

```
POS_system-main/
├── index.php                  # Complete SPA frontend (HTML + all sections)
├── setup.php                  # One-time DB creation
├── migrate_sync.php           # Adds uuid/is_synced/triggers to all tables
├── database.sql               # Legacy schema (OUTDATED — do not use for fresh install)
├── PROJECT_CONTEXT.md         # This file
│
├── api/                       # PHP REST endpoints (one file per resource, 14 files)
│   ├── db.php                 # PDO + schema migrations on every connection
│   ├── products.php           # Products CRUD + liquid_summary
│   ├── bills.php              # Invoice creation (atomic)
│   ├── customers.php
│   ├── sellers.php
│   ├── purchases.php          # Supplier purchases (atomic POST/PUT/DELETE)
│   ├── seller_payments.php    # Supplier payments (atomic POST/PUT/DELETE)
│   ├── seller_reports.php     # Balances + account statement + global log
│   ├── payments.php           # Customer debt payments
│   ├── reports.php            # Sales analytics
│   ├── categories.php
│   ├── sync_to_cloud.php      # Cloud sync push (is_synced=0 → cloud → mark synced)
│   ├── auto_backup.php        # Timed mysqldump + Telegram
│   └── backup.php             # Manual backup manager
│
├── js/
│   ├── app.js                 # Monolithic app (~1,800 lines): UI + state + all API calls
│   └── auto_sync.js           # AutoSync class (30s poll) + backup trigger
│
├── css/                       # Minimal custom overrides
│
├── vendor/                    # ALL frontend deps — strictly local, zero CDN
│   ├── bootstrap.rtl.min.css
│   ├── bootstrap.bundle.min.js
│   ├── jquery.min.js
│   ├── select2.min.js + select2.min.css
│   ├── cairo/                 # Cairo Arabic font (self-hosted .woff2)
│   └── fontawesome/           # FontAwesome 6 (local webfonts + CSS)
│
├── backups/                   # Auto-generated SQL dumps (14-day retention)
│   └── last_auto_backup.txt   # Unix timestamp of last auto-backup
│
├── cloud_mock/                # Local loopback sync receiver (development/testing)
│   └── receive_sync.php
│
└── cloud_api/                 # Production cloud receiver template
    └── receive_sync.php
```

---

## 10. Known Issues & Gotchas

1. **`database.sql` is outdated.** Missing: carton/box/bulk/liquid columns, debt_amount, sync columns, serial_number UNIQUE, payment_method2, paid_amount2. Use `mysqldump --no-data --routines --triggers pos_system` for a fresh schema.

2. **Catch type inconsistency.** `bills.php` uses `catch (Exception $e)` — misses PHP `Error` subclasses. Use `catch (Throwable $e)` inside transactions going forward.

3. **`bills.php` rollback missing guard.** Calls `$pdo->rollBack()` without `if ($pdo->inTransaction())` check.

4. **No live FK constraints on `product_purchases` / `seller_payments`.** Deleting a product or seller orphans these rows — no cascade. UI already blocks product deletion if sales exist, but not for purchase/payment orphans.

5. **`sellers.total_debt` and `customers.total_debt` are denormalized.** Mutated atomically on each operation. Trust the stored value. If drift occurs, recalculate manually:
   ```sql
   -- Recalculate seller debt:
   UPDATE sellers s SET total_debt = (
     SELECT COALESCE(SUM(pp.quantity * pp.cost_price - pp.paid_amount), 0)
     FROM product_purchases pp WHERE pp.seller_id = s.id
   ) - (SELECT COALESCE(SUM(sp.amount), 0) FROM seller_payments sp WHERE sp.seller_id = s.id);
   ```

6. **`database.sql` FK declarations will fail on fresh install via setup.php** (live DB has no such FKs). Do not add FK constraints to product_purchases/seller_payments without updating the migration.

7. **Auto-backup requires `navigator.onLine`** even for local-only backups. Remove that guard in auto_sync.js lines 82-88 if always-local backup is needed.

---

## 11. Extension Points

### Accounting Dashboard
- Gross profit = `SUM(bill_items.total_price) - SUM(pp.quantity * pp.cost_price)` joined on product_id
- Daily revenue: `SELECT DATE(created_at), SUM(total_amount) FROM bills WHERE type='sale' GROUP BY DATE(created_at)`
- No new tables needed for basic P&L

### Mobile App / External API
- Use `uuid` as stable cross-device primary key
- Sync protocol: POST to cloud_api/receive_sync.php with `X-POS-SYNC-KEY` header
- Response: `{"success":true,"synced_uuids":{"tableName":["uuid1","uuid2"]}}`

### Multi-cashier / Auth
- `bills.cashier_name` already stores cashier string — usable for audit without a users table
- Add `users` table + session check in db.php include

### Barcode Scanner
- Already supported: POS search matches serial_number, bulk_barcode, bottle_barcode, box_barcode_liquid
- USB HID scanners (type barcode + Enter) work with existing keydown handler in app.js
