# PROJECT_CONTEXT.md — Offline-First PHP/MySQL POS System

> **Purpose of this file:** Handoff context for an AI coding assistant.
> **Generated:** 2026-10-15, from direct inspection of the codebase and the live `pos_system` database. Where this file and older docs (`SESSION_REPORT.md`, `walkthrough.md`) disagree, **this file reflects the actual code**.
> **Project root:** `c:\xampp\htdocs\POS_system-main` (served at `http://localhost/POS_system-main/`)

---

## 0. TL;DR for the AI

- Single-page Arabic (RTL) POS. `index.php` is the shell, `js/app.js` is the app logic (one `app` object), and `api/*.php` are JSON endpoints using PDO.
- Runtime: **XAMPP on Windows**: PHP **8.2.12**, MariaDB **10.4.32**. DB `pos_system`, user `root`, empty password (`api/db.php`).
- All frontend assets are served from `vendor/`. **There are no CDN references** in `index.php`.
- Sync: every synced table has `uuid` / `is_synced` / `last_synced_at` columns and 2 triggers (20 triggers total). `js/auto_sync.js` calls `api/sync_to_cloud.php` every 30 s, which POSTs dirty rows to a receiver. The receiver is currently the **local mock** (`cloud_mock/receive_sync.php` → DB `pos_cloud_mock`).
- **`database.sql` is stale**: it is missing ~20 columns that the live DB and the code depend on. Use the live schema in §3, not `database.sql`.
- **Read §7 (Known Gaps) before you change anything.**
- **DB state:** factory-reset on 2026-10-11. Every table is empty except `customers` id=1 (walk-in customer).

---

## 1. Project Overview

This is an offline-first point-of-sale system for a small retail shop (Yemeni market: currency/payment wallets such as Jeeb, OneCash, Kuraimi, Floosak). It covers:

- **POS checkout** with barcode/serial lookup and split payments (two payment methods per bill). Unpaid remainders are recorded as customer debt (`deposit` = آجل).
- **Multi-unit products**: piece, carton, box, dozen, custom bulk unit, and **liquid products** sold by bottle, box, or ml.
- **Inventory / Storage & CRM**: stock and location edits, purchase history per product, and a total-liquid-ml widget.
- **Customers & debts**: a running `total_debt` per customer plus a ledger in `payments` (`type` = `debt` | `payment`).
- **Sellers (suppliers)**: stock purchases (`product_purchases`), seller debt, and seller payments.
- **Reports** and an **Excel export** of receipts/sales/debts/inventory.
- **Cloud sync** of all tables to a remote DB for mobile viewing, built so local operation never depends on it.

All business logic runs locally. If the internet drops, the shop keeps selling and sync resumes later.

---

## 2. Tech Stack & Asset Management

### Backend
| Item | Detail |
|---|---|
| Language | PHP 8.2.12 (XAMPP), procedural, no framework, no Composer |
| DB | MariaDB 10.4.32, InnoDB, `utf8mb4_unicode_ci` |
| DB access | PDO, `ERRMODE_EXCEPTION`, `FETCH_ASSOC`, `EMULATE_PREPARES=false` (in `api/db.php`) |
| API style | One file per resource; branches on `$_SERVER['REQUEST_METHOD']`; JSON body via `php://input`; responds `{"success":bool,...}` |
| Auth | **None.** No login or sessions, so the app trusts the LAN (see §7) |

### Frontend
| Library | Version (from file headers) | Local path |
|---|---|---|
| Bootstrap (RTL CSS + bundle JS) | 5.3.0 | `vendor/bootstrap.rtl.min.css`, `vendor/bootstrap.bundle.min.js` |
| jQuery | 3.6.0 | `vendor/jquery.min.js` |
| Select2 | 4.1.0 | `vendor/select2.min.css`, `vendor/select2.min.js` |
| Font Awesome | 6.0.0 | `vendor/fontawesome/css/all.min.css` + `vendor/fontawesome/webfonts/*.woff2|ttf` (solid, regular, brands, v4compat) |
| Cairo font | Google Fonts, self-hosted | `vendor/cairo/cairo.css` + 3 `.woff2` subsets (Arabic, Latin, Latin-ext) |
| App code | vanilla JS (an `app` object) | `js/app.js` (~80 KB), `js/auto_sync.js`, `css/style.css` |

### Offline asset rule (STRICT)
**Every frontend dependency is hosted locally in `vendor/`, so the app works 100% offline.** Verified: `index.php` has no `http(s)://` asset URLs. Load order (index.php L7–11, L1191–1195):
```html
<link href="vendor/bootstrap.rtl.min.css"> <link href="vendor/fontawesome/css/all.min.css">
<link href="vendor/cairo/cairo.css"> <link href="vendor/select2.min.css"> <link href="css/style.css?v=<?= time() ?>">
...
<script src="vendor/bootstrap.bundle.min.js"></script> <script src="vendor/jquery.min.js"></script>
<script src="vendor/select2.min.js"></script> <script src="js/app.js?v=..."></script> <script src="js/auto_sync.js?v=..."></script>
```
- **Never add CDN links.** Download any new library into `vendor/` and reference it relatively.
- `?v=<?= time() ?>` disables caching for app files on every load. This is intentional during development.

---

## 3. Database Schema & Sync Architecture

### 3.1 Live schema (`pos_system`)
Every table below also has the three sync columns described in §3.2.

**categories**: `id` PK, `name` varchar(100)

**products**
- `id` PK, `category_id` FK→categories, `serial_number` varchar(100) **UNIQUE NULL** (empty strings are normalized to NULL on insert), `name`, `unit` (default 'قطعة'), `price` dec(10,2), `stock_quantity` dec(10,2), `storage_location`
- Carton / box / dozen units: `carton_qty`, `carton_price`, `carton_barcode`, `box_qty`, `box_price`, `box_barcode`, `dozen_price`, `dozen_barcode`
- Custom bulk unit: `bulk_unit_name`, `bulk_qty`, `bulk_barcode`, `bulk_price`
- Liquids: `is_liquid` tinyint, `ml_per_bottle`, `bottle_price`, `bottle_barcode`, `bottles_per_box`, `box_price_liquid`, `box_barcode_liquid`
- For liquids, `stock_quantity` is stored in the base unit. The UI shows `N علبة (X مل)`. Total ml = bottles × `ml_per_bottle` + loose ml.

**customers**: `id` PK, `name` varchar(150), `phone`, `total_debt` dec. **Row id=1 = 'عميل عابر (نقدي)' (walk-in) MUST exist.** Bills default to `customer_id=1`. `api/db.php` inserts this row if it is missing, but only via SELECT-then-INSERT so it never fires an UPDATE trigger.

**bills**: `id` PK, `type` enum('sale','purchase'), `payment_method` varchar(50) default 'cash', `payment_method2` NULL, `customer_id` FK→customers, `cashier_name`, `total_amount`, `paid_amount`, `paid_amount2`, `debt_amount` (legacy, not written by bills.php), `created_at` timestamp.
Payment method keys: `cash, card, jeeb, onecash, haseb, kuraimi, floosak, deposit` (deposit = on credit).

**bill_items**: `id` PK, `bill_id` FK→bills, `product_id` FK→products, `quantity`, `unit_price`, `total_price`

**payments** (customer ledger): `id`, `customer_id` FK, `amount`, `type` enum('payment','debt'), `note`, `bill_id`, `items_details` text, `created_at`

**debt_payments** (legacy): `id`, `customer_id` FK, `amount_paid`, `payment_date`

**sellers**: `id`, `name`, `phone`, `total_debt`, `created_at`

**product_purchases**: `id`, `product_id`, `seller_id`, `quantity`, `cost_price`, `paid_amount`, `note`, `purchase_date`. **No FK constraints in the live DB.**

**seller_payments**: `id`, `seller_id`, `amount`, `payment_date`, `note`, `created_at`. **No FK constraints in the live DB.**

**Live FKs (only these 6):** bills.customer_id→customers, bill_items.bill_id→bills, bill_items.product_id→products, debt_payments.customer_id→customers, payments.customer_id→customers, products.category_id→categories.

**Runtime self-migrations:** `api/db.php` runs `ALTER TABLE ... ADD COLUMN` statements wrapped in try/catch on **every request**. They add `storage_location`, `payment_method2`, `paid_amount2`, and the payments `type`/`bill_id`/`items_details` columns. These are idempotent but add overhead.

### 3.2 Sync columns (on all 10 tables)
| Column | Type | Role |
|---|---|---|
| `uuid` | VARCHAR(36) UNIQUE | Global identity; the cloud upserts are keyed on it |
| `is_synced` | TINYINT(1) DEFAULT 0 | 0 = dirty (needs push), 1 = pushed |
| `last_synced_at` | DATETIME NULL | Time of the last successful push |

These were added by `migrate_sync.php`, which is idempotent. Run it again after recreating the DB from `database.sql`.

### 3.3 Triggers (20 = 10 tables × 2)
```sql
-- {table}_before_insert
BEFORE INSERT FOR EACH ROW BEGIN IF NEW.uuid IS NULL THEN SET NEW.uuid = UUID(); END IF; END
-- {table}_before_update
BEFORE UPDATE FOR EACH ROW BEGIN IF NEW.is_synced = OLD.is_synced THEN SET NEW.is_synced = 0; END IF; END
```
- New rows start dirty (column default 0) and get a UUID (MariaDB `UUID()` = v1).
- **Any** UPDATE that leaves `is_synced` unchanged marks the row dirty, including no-op updates such as `SET price = price`.
- The sync worker escapes this rule by explicitly changing `is_synced` (`SET is_synced = 1`). That is why `ON DUPLICATE KEY UPDATE` on existing rows (for example, the old default-customer seed in db.php) caused an endless dirty loop. Avoid writes that touch rows unnecessarily.

### 3.4 Cloud mock DB
`pos_cloud_mock` is a schema clone of `pos_system`. It is the sync target during development and was factory-reset alongside `pos_system`. Customer id=1 has the same UUID in both DBs: `ed5020ec-5ab2-4e3c-ab05-a5d4e1929f97`.

---

## 4. Core Workflows & Security

### 4.1 Cloud Sync Engine
```
[any write] → trigger sets is_synced=0
      │
js/auto_sync.js (class AutoSync)
  - setInterval 30 000 ms + one call 3 s after page load
  - skips if !navigator.onLine or a sync is in flight (isSyncing flag)
  - listens to window 'online'/'offline' → badge #sync-status-badge
  - GET api/sync_to_cloud.php
      │
api/sync_to_cloud.php
  1. If URL contains 'your-domain.com' or key == 'YOUR_SECRET_SYNC_KEY' → {"success":false,"configured":false}
     → JS stops polling and shows a grey "المزامنة السحابية غير مفعّلة" badge
  2. SELECT * FROM each of 10 tables WHERE is_synced=0
  3. Empty → {"success":true,"message":"No new data to sync"}
  4. cURL POST {"data":{table:[rows]}} with header X-POS-SYNC-KEY; 5 s connect / 20 s total timeout
  5. HTTP 200 + success → in one transaction:
       UPDATE table SET is_synced=1, last_synced_at=NOW() WHERE uuid IN (synced_uuids[table] ?? sent uuids)
      │
Receiver (currently cloud_mock/receive_sync.php)
  - POST only (405 otherwise); hash_equals key check against 'mock_secret_123' (401 on failure)
  - Tables processed in a whitelist, in FK order: categories, customers, sellers, products, bills, bill_items,
    payments, debt_payments, product_purchases, seller_payments
  - Column names filtered against information_schema (SQL-identifier whitelist)
  - Rejects rows with no uuid. Rejects an `id` that already belongs to a different uuid (ID-conflict guard)
  - INSERT ... ON DUPLICATE KEY UPDATE (id and uuid excluded from the update list), all inside one transaction
  - Returns {"success":true,"synced_uuids":{...},"counts":{table:{inserted,updated}}}
```
Badge states: `online` (green, متصل - مزامن), `offline` (red, غير متصل - حفظ محلي), `syncing` (yellow, spinner), `error` (red, stays until the next success), `disabled` (grey).

**Current config** (`api/sync_to_cloud.php` L5–6):
`$cloud_api_url = 'http://localhost/POS_system-main/cloud_mock/receive_sync.php'`, `$secret_key = 'mock_secret_123'`.

**Production:** deploy a receiver to the host, then change those two lines. **Use `cloud_mock/receive_sync.php` as the base, not `cloud_api/receive_sync.php`** (reason in §7).

### 4.2 Atomic Transactions
| Operation | File | Transaction | Catch type |
|---|---|---|---|
| `action=update_price_stock` (price + stock in one statement) | `api/products.php` L23–42 | yes | **`Throwable`**, with `inTransaction()` guard before `rollBack()` |
| Invoice creation (bill → items → stock ± qty×unit_multiplier → customer debt + `payments` debt row) | `api/bills.php` L74–127 | yes | `Exception`, unconditional `rollBack()` |
| Customer payment/debt entry | `api/payments.php` | yes | `Exception` |
| Purchases (3 transactional blocks) | `api/purchases.php` | yes | `PDOException` / `Exception` |
| Seller payments (3 blocks) | `api/seller_payments.php` | yes | `PDOException` / `Exception` |
| Mark-synced batch | `api/sync_to_cloud.php` | yes | `Exception`, guarded |
| Mock receiver upsert batch | `cloud_mock/receive_sync.php` | yes | `Throwable`, guarded |
| **New product + initial purchase + seller debt** | `api/products.php` POST default branch | **NO** | `PDOException` |
| `update_price`, `update_stock` | `api/products.php` | no (single statement) | none |

- **Rollback verified:** a failure injected mid-transaction into `update_price_stock` (2026-10-11) left price and stock unchanged. The pre-test copy is kept at `backups/products.php.pre_rollback_test`.
- **Validation in bills.php:** rejects an empty `items` array and any line with qty ≤ 0, `unit_price` < 0, or `total_price` < 0 **before** the transaction starts. `update_price_stock` rejects non-numeric or negative price/stock.
- **Known weaknesses:** `bills.php` trusts the client-sent `total_amount` and line totals (it does not recompute them server-side) and does not block stock from going negative.

**House rule for new write paths:** use `beginTransaction()` → work → `commit()`, with `catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); ... }`.

### 4.3 Backup System, as actually implemented
1. **UI export, manual:** `api/backup.php` streams an **Excel 2003 XML Spreadsheet** (`.xls`, RTL) named `تصدير_الإيصالات_والمبيعات_<date>.xls`. It has 4 sheets: customers & debts, sales/invoices, debt & payment ledger, products & inventory. It is a **report export, not a restorable DB backup.** It is linked from the "تصدير الإيصالات" control in `index.php`; the duplicate link was removed on 2026-10-11.
2. **SQL dumps, manual via CLI:** these live in `backups/`, made with
   `& 'c:\xampp\mysql\bin\mysqldump.exe' -u root --databases pos_system pos_cloud_mock > backups\<name>.sql`
   - `pre_handover.sql` (~130 KB): full test dataset of both DBs before the factory reset
   - `pre_rollback_invoice20.sql`: snapshot taken before the invoice #20 stock rollback
3. **Automated `.bat` backup script: DOES NOT EXIST in the repo.** There is no `.bat` file, no Task Scheduler entry, and no cron logic anywhere in the codebase. If it is needed, it must be built (suggested: `backup.bat` that calls mysqldump with a timestamped filename, plus a Windows Task Scheduler entry and retention cleanup).

Restore a dump with: `& 'c:\xampp\mysql\bin\mysql.exe' -u root < backups\pre_handover.sql`. This **overwrites** both DBs.

---

## 5. Directory Structure

```
POS_system-main/
├── index.php              # SPA shell (~78 KB): all pages/modals as hidden sections, RTL Arabic UI, sync badge
├── setup.php              # First-run: creates DB from database.sql
├── database.sql           # ⚠ STALE base schema (no sync cols, no multi-unit/liquid cols)
├── migrate_sync.php       # Idempotent: adds uuid/is_synced/last_synced_at + 20 triggers to 10 tables
├── SESSION_REPORT.md      # Narrative report of the 2026-10-11 session (some claims are imprecise; trust this file)
├── PROJECT_CONTEXT.md     # ← this file
├── api/                   # JSON endpoints (all `require 'db.php'`)
│   ├── db.php             # PDO connection + per-request self-migrations + walk-in customer guarantee
│   ├── products.php       # GET list/search; POST create | update_price | update_price_stock (atomic) | update_stock; DELETE
│   ├── bills.php          # GET list (last 50) / by id with items; POST create invoice (atomic)
│   ├── customers.php      # GET; POST create (unique name); DELETE (id 1 protected)
│   ├── payments.php       # customer payments/debts ledger (atomic)
│   ├── categories.php     # CRUD categories
│   ├── sellers.php        # CRUD suppliers
│   ├── purchases.php      # supplier stock purchases + purchase history (atomic)
│   ├── seller_payments.php# supplier payments (atomic)
│   ├── reports.php        # sales/profit reports
│   ├── seller_reports.php # supplier reports
│   ├── backup.php         # Excel XML export (download)
│   └── sync_to_cloud.php  # local sync worker (pushes dirty rows)
├── js/
│   ├── app.js             # all UI logic: `app` object (cart, POS, inventory, customers, statements, modals, fetchAPI)
│   └── auto_sync.js       # AutoSync class: 30 s polling, online/offline badge
├── css/style.css          # theme / custom styles
├── vendor/                # ALL third-party assets (offline) — see §2
│   ├── bootstrap.rtl.min.css, bootstrap.bundle.min.js, jquery.min.js, select2.min.(css|js)
│   ├── fontawesome/{css/all.min.css, webfonts/*}
│   └── cairo/{cairo.css, *.woff2}
├── backups/               # manual mysqldump snapshots + pre-test file copies (NOT auto-generated)
├── cloud_mock/
│   └── receive_sync.php   # hardened local mock receiver → DB pos_cloud_mock (secret 'mock_secret_123')
└── cloud_api/
    └── receive_sync.php   # original production receiver template (⚠ weaker — see §7)
```

---

## 6. Conventions

- **Language:** UI strings and error messages are Arabic. Keep that style, e.g. `{'success':false,'error':'...'}`.
- **Responses:** always `header('Content-Type: application/json; charset=utf-8')`, and always include the `success` key.
- **Frontend calls:** go through `app.fetchAPI(url, options)` in `app.js`, which sends a JSON body.
- **SQL:** always use prepared statements for values. Table/column identifiers must come from hard-coded whitelists.
- **Never** run TRUNCATE/DROP or a broad DELETE without explicit user consent and a fresh mysqldump in `backups/`.
- **Don't** add UPDATE statements that touch rows unnecessarily (the trigger marks them dirty and causes re-sync churn).
- **Testing:** use `& 'c:\xampp\php\php.exe' script.php` (php is NOT on PATH) and `curl.exe -s http://localhost/POS_system-main/api/...`. PowerShell mangles `$` in `php -r`, so prefer temp script files.

---

## 7. Known Gaps, Risks & Doc Discrepancies (read before editing)

1. **No `.bat` / scheduled backup exists.** Only the manual Excel export and manual mysqldumps exist (§4.3).
2. **`database.sql` is out of date** compared with the live DB (missing the carton/box/dozen/bulk/liquid columns, `debt_amount`, the sync columns, and the UNIQUE on `serial_number`; it also declares FKs on `product_purchases`/`seller_payments` that the live DB lacks). A fresh install from `setup.php` + `database.sql` would break `products.php` inserts. **Fix:** regenerate it with `mysqldump --no-data pos_system` (triggers included) or extend the migrations.
3. **Catch types are inconsistent.** Only `update_price_stock` and the mock receiver use `catch (Throwable)`. `bills.php`, `payments.php`, `purchases.php`, `seller_payments.php` and `sync_to_cloud.php` use `Exception`/`PDOException`. A PHP `Error` (e.g. a `TypeError`) inside those transactions would skip the rollback; PDO then rolls back implicitly when the connection closes, but the client gets a fatal error instead of JSON. `bills.php` also calls `rollBack()` without an `inTransaction()` guard.
4. **Product creation is not atomic.** The product INSERT, the `product_purchases` INSERT and the seller debt UPDATE are separate statements with no transaction.
5. **`cloud_api/receive_sync.php` (production template) is weaker than the mock:** it interpolates incoming JSON keys directly as column names (**SQL-injection vector** for anyone who holds the key), compares the key with `!==` instead of `hash_equals`, has no table/column whitelist and no id-conflict guard, uses a placeholder key `YOUR_SECRET_SYNC_KEY` and DB `cloud_pos_system`, and returns no `counts`. **Deploy the `cloud_mock` version instead** (change its DB credentials and secret).
6. **UUIDs do not yet make multi-terminal sync safe.** The payload still includes the local integer `id`, and the cloud tables use `id` as PK. Two terminals creating bill id=1 would collide; the mock receiver detects this and fails the whole batch. True multi-store support needs cloud-side surrogate ids, or FK references remapped by uuid.
7. **Sync race window:** a row edited between the worker's SELECT and its mark-synced UPDATE is marked synced without its newer version being sent. Fix: mark synced only `WHERE uuid IN (...) AND <row unchanged>`, e.g. by comparing an `updated_at`/version column.
8. **No authentication or CSRF protection** on any endpoint. Anyone on the LAN can call `api/*`, including the sync trigger and the Excel export containing customer data.
9. **Server trusts client totals** in `bills.php` (no server-side price recomputation) and allows negative stock.
10. **`db.php` runs `ALTER TABLE` statements on every request** (wrapped in try/catch). This works, but it is wasteful; move them into a one-time migration.
11. `SESSION_REPORT.md` overstates a few items (e.g. jQuery "3.7.x" — the actual version is 3.6.0 — and "UUIDs eliminate PK collisions"). **This file is authoritative.**

---

## 8. Current State Snapshot (2026-10-15)

| Table | pos_system | pos_cloud_mock |
|---|---|---|
| customers | 1 (walk-in, id=1) | 1 (same uuid) |
| all other 9 tables | 0 (AUTO_INCREMENT reset → next id 1) | 0 |

The sync endpoint returns `{"success":true,"message":"No new data to sync"}`. The system is ready for client data entry.
