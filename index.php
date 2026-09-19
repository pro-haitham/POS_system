<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام إدارة المبيعات (POS)</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link href="css/style.css?v=<?= time() ?>" rel="stylesheet">
    <script>
        function applyInitialTheme() {
            const savedTheme = localStorage.getItem('pos_theme') || 'light';
            if (savedTheme === 'dark') {
                document.documentElement.setAttribute('data-bs-theme', 'dark');
                document.documentElement.classList.add('dark-mode');
            } else {
                document.documentElement.removeAttribute('data-bs-theme');
                document.documentElement.classList.remove('dark-mode');
            }
        }
        applyInitialTheme();

        function toggleThemeMode() {
            if (window.app && typeof window.app.toggleTheme === 'function') {
                window.app.toggleTheme();
            } else {
                const currentTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
                const newTheme = (currentTheme === 'dark') ? 'light' : 'dark';
                localStorage.setItem('pos_theme', newTheme);
                const icon = document.getElementById('theme-toggle-icon');
                const text = document.getElementById('theme-toggle-text');
                if (newTheme === 'dark') {
                    document.documentElement.setAttribute('data-bs-theme', 'dark');
                    document.documentElement.classList.add('dark-mode');
                    if (document.body) document.body.classList.add('dark-mode');
                    if (icon) icon.className = 'fas fa-sun text-warning';
                    if (text) text.innerText = 'الوضع النهاري';
                } else {
                    document.documentElement.removeAttribute('data-bs-theme');
                    document.documentElement.classList.remove('dark-mode');
                    if (document.body) document.body.classList.remove('dark-mode');
                    if (icon) icon.className = 'fas fa-moon';
                    if (text) text.innerText = 'الوضع الليلي';
                }
            }
        }
    </script>
</head>
<body>

    <!-- Sidebar -->
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h3><i class="fas fa-store"></i> المتجر الذكي</h3>
        </div>
        <ul class="nav-links">
            <li class="active" data-target="pos-section"><i class="fas fa-cash-register"></i> نقطة البيع</li>
            <li data-target="products-section"><i class="fas fa-box-open"></i> المنتجات والأقسام</li>
            <li data-target="inventory-section"><i class="fas fa-warehouse"></i> إدارة المخزون</li>
            <li data-target="customers-section"><i class="fas fa-users"></i> العملاء والديون</li>
            <li data-target="seller-reports-section"><i class="fas fa-truck-loading"></i> الموردين والمشتريات</li>
            <li data-target="reports-section"><i class="fas fa-chart-bar"></i> التقارير والمبيعات</li>
            <li><a href="api/backup.php" target="_blank" style="color: inherit; text-decoration: none;"><i class="fas fa-file-invoice text-success"></i> تصدير الإيصالات</a></li>
        </ul>
        <div class="sidebar-footer p-3 mt-auto">
            <button type="button" class="btn btn-dark-mode w-100 d-flex align-items-center justify-content-center gap-2 py-2" id="theme-toggle-btn" onclick="toggleThemeMode()">
                <i class="fas fa-moon" id="theme-toggle-icon"></i>
                <span id="theme-toggle-text">الوضع الليلي</span>
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <div class="main-content" id="main-content">
        <!-- Toast Notification -->
        <div class="position-fixed top-0 end-0 p-3" style="z-index: 1050">
            <div id="liveToast" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body" id="toast-body-text">
                        تمت العملية بنجاح!
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        </div>

        <!-- POS Section -->
        <section id="pos-section" class="section active">
            <div class="row h-100">
                <!-- Products List -->
                <div class="col-md-8 h-100 d-flex flex-column">
                    <div class="search-bar mb-3">
                        <input type="text" id="pos-search" class="form-control" placeholder="ابحث عن منتج (بالاسم أو الباركود)..." autofocus>
                    </div>
                    <div class="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-3 flex-grow-1 overflow-auto" id="pos-products-grid">
                        <!-- Products will be loaded here -->
                    </div>
                </div>
                <!-- Cart -->
                <div class="col-md-4 h-100">
                    <div class="card cart-card h-100">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">الفاتورة الحالية</h5>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <div class="mb-2">
                                <label>اسم الكاشير:</label>
                                <input type="text" id="pos-cashier" class="form-control form-control-sm" value="كاشير 1">
                            </div>
                            <div class="mb-2">
                                <label>العميل:</label>
                                <div class="d-flex gap-1 w-100">
                                    <div class="flex-grow-1">
                                        <select id="pos-customer" class="form-select form-select-sm"></select>
                                    </div>
                                    <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="offcanvas" data-bs-target="#addCustomerOffcanvas">
                                        <i class="fas fa-user-plus"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="flex-grow-1 overflow-auto">
                                <table class="table table-sm text-center">
                                    <thead>
                                        <tr>
                                            <th>المنتج</th>
                                            <th>الكمية</th>
                                            <th>السعر</th>
                                            <th>إلغاء</th>
                                        </tr>
                                    </thead>
                                    <tbody id="cart-items">
                                        <!-- Cart items -->
                                    </tbody>
                                </table>
                            </div>
                            <div class="cart-summary mt-3">
                                <h4>الإجمالي: <span id="cart-total">0.00</span></h4>
                                
                                <!-- Split Payment Switch -->
                                <div class="form-check form-switch mb-2">
                                    <input class="form-check-input" type="checkbox" id="pos-split-toggle" onchange="app.toggleSplitPayment(this.checked)">
                                    <label class="form-check-label small fw-bold" for="pos-split-toggle">دفع مجزأ (طريقتين دفع)</label>
                                </div>

                                <!-- Single Payment Container -->
                                <div id="pos-single-payment-container">
                                    <div class="row g-2 mb-2">
                                        <div class="col-6">
                                            <label class="small">نوع الدفع:</label>
                                            <select id="pos-payment-method" class="form-select" onchange="app.renderCart()">
                                                <option value="cash">كاش (نقدي)</option>
                                                <option value="card">بطاقة (شبكة)</option>
                                                <option value="jeeb">جيب</option>
                                                <option value="onecash">ون كاش</option>
                                                <option value="haseb">حاسب</option>
                                                <option value="kuraimi">كريمي</option>
                                                <option value="floosak">فلوسك</option>
                                                <option value="deposit">آجل (دين)</option>
                                            </select>
                                        </div>
                                        <div class="col-6">
                                            <label class="small">المبلغ المدفوع:</label>
                                            <input type="number" id="pos-paid-amount" class="form-control" value="0" step="any">
                                        </div>
                                    </div>
                                </div>

                                <!-- Split Payment Container -->
                                <div id="pos-split-payment-container" class="d-none border rounded p-2 mb-2 bg-white">
                                    <div class="row g-2 mb-2">
                                        <div class="col-6">
                                            <label class="small fw-bold text-success">طريقة الدفع 1:</label>
                                            <select id="pos-split-method-1" class="form-select form-select-sm" onchange="app.updateSplitTotalIndicator()">
                                                <option value="cash">كاش (نقدي)</option>
                                                <option value="card">بطاقة (شبكة)</option>
                                                <option value="jeeb">جيب</option>
                                                <option value="onecash">ون كاش</option>
                                                <option value="haseb">حاسب</option>
                                                <option value="kuraimi">كريمي</option>
                                                <option value="floosak">فلوسك</option>
                                                <option value="deposit">آجل (دين)</option>
                                            </select>
                                        </div>
                                        <div class="col-6">
                                            <label class="small fw-bold text-success">المبلغ 1:</label>
                                            <input type="number" id="pos-split-amount-1" class="form-control form-control-sm" value="0" step="any" oninput="app.calculateSplitRemainder()">
                                        </div>
                                    </div>
                                    <div class="row g-2 mb-1">
                                        <div class="col-6">
                                            <label class="small fw-bold text-primary">طريقة الدفع 2:</label>
                                            <select id="pos-split-method-2" class="form-select form-select-sm" onchange="app.updateSplitTotalIndicator()">
                                                <option value="deposit">آجل (دين)</option>
                                                <option value="kuraimi">كريمي</option>
                                                <option value="card">بطاقة (شبكة)</option>
                                                <option value="cash">كاش (نقدي)</option>
                                                <option value="jeeb">جيب</option>
                                                <option value="onecash">ون كاش</option>
                                                <option value="haseb">حاسب</option>
                                                <option value="floosak">فلوسك</option>
                                            </select>
                                        </div>
                                        <div class="col-6">
                                            <label class="small fw-bold text-primary">المبلغ 2:</label>
                                            <input type="number" id="pos-split-amount-2" class="form-control form-control-sm" value="0" step="any" oninput="app.updateSplitTotalIndicator()">
                                        </div>
                                    </div>
                                    <div class="small text-muted text-center mt-1">
                                        مجموع المدفوع: <span id="pos-split-total-paid" class="fw-bold">0.00</span> | المتبقي (دين): <span id="pos-split-remainder" class="fw-bold text-danger">0.00</span>
                                    </div>
                                </div>

                                <button class="btn btn-success w-100 btn-lg" onclick="app.submitBill()">إصدار الفاتورة</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Products Section -->
        <section id="products-section" class="section d-none">
            <h2 class="mb-4">إدارة المنتجات والأقسام</h2>
            <div class="row">
                <!-- Add Category -->
                <div class="col-md-4">
                    <div class="card mb-4">
                        <div class="card-header">إضافة قسم جديد</div>
                        <div class="card-body">
                            <input type="text" id="cat-name" class="form-control mb-2" placeholder="اسم القسم">
                            <button class="btn btn-primary w-100" onclick="app.addCategory()">إضافة</button>
                            <hr>
                            <ul class="list-group" id="categories-list"></ul>
                        </div>
                    </div>
                </div>
                <!-- Add/Edit Product -->
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">إضافة منتج جديد</div>
                        <div class="card-body">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <input type="text" id="prod-name" class="form-control" placeholder="اسم المنتج">
                                </div>
                                <div class="col-md-6">
                                    <input type="text" id="prod-serial" class="form-control" placeholder="رقم الباركود / السيريال">
                                </div>
                                <div class="col-md-4">
                                    <select id="prod-category" class="form-select"></select>
                                </div>
                                <div class="col-md-4 d-flex gap-2">
                                    <select id="prod-unit-select" class="form-select" onchange="if(this.value==='other'){document.getElementById('prod-unit-other').classList.remove('d-none');}else{document.getElementById('prod-unit-other').classList.add('d-none');}">
                                        <option value="قطعة">قطعة</option>
                                        <option value="مل">مل</option>
                                        <option value="كرتونة">كرتونة</option>
                                        <option value="other">أخرى...</option>
                                    </select>
                                    <input type="text" id="prod-unit-other" class="form-control d-none" placeholder="اكتب الوحدة">
                                </div>
                                <div class="col-md-2">
                                    <label class="small text-muted">سعر البيع:</label>
                                    <input type="number" id="prod-price" class="form-control" placeholder="سعر البيع" min="0" step="0.01">
                                </div>
                                <div class="col-md-3">
                                    <label class="small text-muted">مكان التخزين:</label>
                                    <input type="text" id="prod-location" class="form-control" placeholder="الرف/المستودع">
                                </div>
                                <div class="col-md-2">
                                    <label class="small text-muted">الكمية الافتتاحية:</label>
                                    <input type="number" id="prod-stock" class="form-control" placeholder="الكمية" min="0" step="any" oninput="app.calcAddProductDebt()">
                                </div>
                                
                                <!-- Purchase Details -->
                                <div class="col-12 mt-3">
                                    <h6 class="border-bottom pb-2 mb-2 text-primary"><i class="fas fa-truck-loading"></i> بيانات الشراء (اختياري)</h6>
                                </div>
                                <div class="col-md-3">
                                    <label class="small text-muted">المورد / البائع:</label>
                                    <div class="d-flex gap-1">
                                        <select id="prod-seller" class="form-select" onchange="app.calcAddProductDebt()"></select>
                                        <button class="btn btn-outline-secondary" type="button" data-bs-toggle="offcanvas" data-bs-target="#sellersOffcanvas">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <label class="small text-muted">سعر التكلفة (الوحدة):</label>
                                    <input type="number" id="prod-cost-price" class="form-control" placeholder="تكلفة الوحدة" min="0" step="0.01" oninput="app.calcAddProductDebt()">
                                </div>
                                <div class="col-md-3">
                                    <label class="small text-muted">المبلغ المدفوع:</label>
                                    <input type="number" id="prod-paid-amount" class="form-control" placeholder="المدفوع للمورد" min="0" step="0.01" oninput="app.calcAddProductDebt()">
                                </div>
                                <div class="col-md-3">
                                    <label class="small text-muted">تاريخ الشراء:</label>
                                    <input type="date" id="prod-purchase-date" class="form-control">
                                </div>
                                <div class="col-md-12 mt-2">
                                    <label class="small text-muted">ملاحظة / بيان الشراء (اختياري):</label>
                                    <input type="text" id="prod-purchase-note" class="form-control" placeholder="مثال: فاتورة رقم 1234، أو ملاحظات أخرى...">
                                </div>
                                <div class="col-12 mt-1 small">
                                    <span class="text-muted">الإجمالي: <span id="prod-total-cost" class="fw-bold">0.00</span></span> | 
                                    <span class="text-danger">الدين المتبقي: <span id="prod-remaining-debt" class="fw-bold">0.00</span></span>
                                </div>

                                <div class="col-12 mt-4">
                                    <button class="btn btn-success w-100" onclick="app.addProduct()">حفظ المنتج</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card mt-4">
                        <div class="card-header">قائمة المنتجات (وتعديل السعر)</div>
                        <div class="card-body">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>السيريال</th>
                                        <th>الاسم</th>
                                        <th>القسم</th>
                                        <th>الوحدة</th>
                                        <th>التخزين</th>
                                        <th>المخزون</th>
                                        <th>السعر</th>
                                        <th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody id="products-table"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Inventory Section -->
        <section id="inventory-section" class="section d-none">
            <h2 class="mb-4">إدارة المخزون (Storage & CRM)</h2>
            <div class="card">
                <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">قائمة المخزون الحالي</h5>
                    <input type="text" id="inventory-search" class="form-control form-control-sm w-25" placeholder="بحث...">
                </div>
                <div class="card-body">
                    <table class="table table-hover table-bordered text-center align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>السيريال</th>
                                <th>اسم المنتج</th>
                                <th>القسم</th>
                                <th>الوحدة</th>
                                        <th>مكان التخزين</th>
                                <th>المخزون المتوفر</th>
                                <th>تحديث المخزون</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-table"></tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- Customers Section -->
        <section id="customers-section" class="section d-none">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h2 class="mb-0">العملاء وإدارة الديون</h2>
                <a href="api/backup.php" target="_blank" class="btn btn-outline-success">
                    <i class="fas fa-file-invoice"></i> تصدير الإيصالات
                </a>
            </div>

            <!-- Customer Debt Summary Cards -->
            <div class="row mb-4 g-3 text-center">
                <div class="col-md-4 col-12">
                    <div class="card bg-danger text-white shadow-sm border-0">
                        <div class="card-body">
                            <div class="small opacity-75">إجمالي الديون القائمة على العملاء</div>
                            <h3 class="mb-0 fw-bold mt-2"><span id="cust-sum-total-debt">0.00</span> ريال</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 col-6">
                    <div class="card bg-warning text-dark shadow-sm border-0">
                        <div class="card-body">
                            <div class="small opacity-75">عدد العملاء المدينين</div>
                            <h3 class="mb-0 fw-bold mt-2" id="cust-sum-indebted-count">0</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 col-6">
                    <div class="card bg-primary text-white shadow-sm border-0">
                        <div class="card-body">
                            <div class="small opacity-75">إجمالي عدد العملاء المسجلين</div>
                            <h3 class="mb-0 fw-bold mt-2" id="cust-sum-total-count">0</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <!-- Left Column: Actions Forms -->
                <div class="col-md-4">
                    <!-- Debt & Payment Operation Card -->
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white py-3">
                            <h5 class="mb-0 fw-bold"><i class="fas fa-coins text-warning"></i> سداد أو إضافة دين</h5>
                        </div>
                        <div class="card-body">
                            <!-- Toggle Tabs: Pay Debt vs Add Debt -->
                            <div class="btn-group w-100 mb-3" role="group">
                                <input type="radio" class="btn-check" name="debt_action_type" id="act_pay" value="pay_debt" checked onchange="app.switchDebtAction('pay_debt')">
                                <label class="btn btn-outline-success" for="act_pay"><i class="fas fa-check-circle"></i> سداد دين (دفعة)</label>

                                <input type="radio" class="btn-check" name="debt_action_type" id="act_add" value="add_debt" onchange="app.switchDebtAction('add_debt')">
                                <label class="btn btn-outline-danger" for="act_add"><i class="fas fa-plus-circle"></i> إضافة دين جديد</label>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">اختر العميل:</label>
                                <select id="payment-customer" class="form-select"></select>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted" id="pay-amount-label">المبلغ المدفوع (ريال):</label>
                                <input type="number" id="payment-amount" class="form-control" placeholder="0.00" min="0.01" step="any">
                            </div>

                            <div class="mb-3" id="payment-items-container" style="display: none;">
                                <label class="form-label small fw-bold text-muted">الأصناف / المشتريات المأخوذة في هذا الدين:</label>
                                <textarea id="payment-items-details" class="form-control form-control-sm" rows="2" placeholder="اكتب تفاصيل الأصناف المشتراة (مثال: 2 كرتونة ماء، 3 باكت بسكويت...)"></textarea>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">البيان / ملاحظة (اختياري):</label>
                                <input type="text" id="payment-note" class="form-control" placeholder="مثال: سداد نقدي، دفعة حساب...">
                            </div>

                            <button class="btn btn-success w-100 py-2 fw-bold" id="btn-debt-submit" onclick="app.executeDebtAction()">
                                <i class="fas fa-save"></i> تسجيل سداد الدفعة
                            </button>
                        </div>
                    </div>

                    <!-- Add New Customer Card -->
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3">
                            <h5 class="mb-0 fw-bold"><i class="fas fa-user-plus text-primary"></i> إضافة عميل جديد</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">اسم العميل:</label>
                                <input type="text" id="cust-name" class="form-control" placeholder="الاسم الكامل">
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">رقم الهاتف:</label>
                                <input type="text" id="cust-phone" class="form-control" dir="ltr" placeholder="05XXXXXXXX">
                            </div>
                            <button class="btn btn-primary w-100 py-2" onclick="app.addCustomer()">
                                <i class="fas fa-user-check"></i> حفظ العميل
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Customers List Table -->
                <div class="col-md-8">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h5 class="mb-0 fw-bold"><i class="fas fa-users text-primary"></i> قائمة العملاء والديون</h5>
                            <input type="text" id="cust-search" class="form-control form-control-sm w-auto" placeholder="بحث باسم العميل أو الهاتف..." oninput="app.filterCustomersTable(this.value)">
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0 text-center">
                                    <thead class="table-light">
                                        <tr>
                                            <th>الاسم</th>
                                            <th>الهاتف</th>
                                            <th>إجمالي الدين</th>
                                            <th>الحالة</th>
                                            <th>إجراءات الحساب</th>
                                        </tr>
                                    </thead>
                                    <tbody id="customers-table"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Customer Statement & Debt Receipts Modal -->
        <div class="modal fade" id="customerStatementModal" tabindex="-1" aria-labelledby="statementModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-xl">
                <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold" id="statementModalLabel"><i class="fas fa-file-invoice-dollar text-primary"></i> كشف حساب العميل وسجل الديون والمشتريات</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="statement-print-area" class="p-3 bg-white border rounded mb-3">
                            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom pb-3 mb-3">
                                <div>
                                    <h4 class="fw-bold mb-1" id="stmt-cust-name">-</h4>
                                    <div class="text-muted small" id="stmt-cust-phone">-</div>
                                </div>
                                <div class="text-end">
                                    <div class="small text-muted">إجمالي الدين القائم:</div>
                                    <h3 class="mb-0 fw-bold text-danger" id="stmt-cust-debt">0.00 ريال</h3>
                                </div>
                            </div>

                            <div class="table-responsive">
                                <table class="table table-bordered text-center align-middle mb-0">
                                    <thead class="table-light small">
                                        <tr>
                                            <th>#</th>
                                            <th>التاريخ والوقت</th>
                                            <th>نوع الحركة</th>
                                            <th>المبلغ</th>
                                            <th>تفاصيل الأصناف المشتراة / البيان</th>
                                            <th>إيصال الفاتورة</th>
                                        </tr>
                                    </thead>
                                    <tbody id="stmt-items-body" class="small"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        <button type="button" class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> طباعة كشف الحساب</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- SELLER REPORTS SECTION -->
        <section id="seller-reports-section" class="section d-none">
            <h2 class="mb-4 fw-bold"><i class="fas fa-truck-loading text-primary"></i> الموردين والمشتريات</h2>
            
            <div class="row g-3 mb-4">
                <div class="col-md-4">
                    <div class="card bg-primary text-white h-100 shadow-sm border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">إجمالي المشتريات</h5>
                            <h2 class="fw-bold mb-0" id="sr-total-purchases">0.00</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-success text-white h-100 shadow-sm border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">إجمالي السداد</h5>
                            <h2 class="fw-bold mb-0" id="sr-total-payments">0.00</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-danger text-white h-100 shadow-sm border-0">
                        <div class="card-body text-center">
                            <h5 class="card-title">إجمالي الديون المتبقية</h5>
                            <h2 class="fw-bold mb-0" id="sr-total-debt">0.00</h2>
                        </div>
                    </div>
                </div>
            </div>

            <ul class="nav nav-pills mb-3" id="sellerReportsTab" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="purchases-log-tab" data-bs-toggle="pill" data-bs-target="#purchases-log" type="button" role="tab"><i class="fas fa-shopping-cart"></i> سجل المشتريات</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="payments-log-tab" data-bs-toggle="pill" data-bs-target="#payments-log" type="button" role="tab"><i class="fas fa-money-bill-wave"></i> سجل السداد</button>
                </li>
            </ul>
            <div class="tab-content" id="sellerReportsTabContent">
                <!-- Purchases Log -->
                <div class="tab-pane fade show active" id="purchases-log" role="tabpanel">
                    <div class="card shadow-sm border-0">
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0 text-center">
                                    <thead class="table-light">
                                        <tr>
                                            <th>التاريخ</th>
                                            <th>المنتج</th>
                                            <th>المورد</th>
                                            <th>الكمية</th>
                                            <th>التكلفة (للوحدة)</th>
                                            <th>الإجمالي</th>
                                            <th>المدفوع</th>
                                            <th>المديونية</th>
                                            <th>ملاحظات</th>
                                            <th>إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody id="sr-purchases-table">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Payments Log -->
                <div class="tab-pane fade" id="payments-log" role="tabpanel">
                    <div class="card shadow-sm border-0">
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0 text-center">
                                    <thead class="table-light">
                                        <tr>
                                            <th>التاريخ</th>
                                            <th>المورد</th>
                                            <th>المبلغ المسدد</th>
                                            <th>ملاحظات / بيان</th>
                                            <th>إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody id="sr-payments-table">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Reports Section -->
        <section id="reports-section" class="section d-none">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h2 class="mb-0">التقارير والمبيعات</h2>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-primary btn-sm" onclick="app.setReportDateToday()"><i class="fas fa-calendar-day"></i> مبيعات اليوم</button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="app.setReportDateAll()"><i class="fas fa-calendar-alt"></i> جميع التواريخ</button>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="card mb-4 border-0 shadow-sm">
                <div class="card-body">
                    <div class="row g-3 align-items-end">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted">تحديد التاريخ:</label>
                            <input type="date" id="report-date" class="form-control" onchange="app.loadReports()">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small fw-bold text-muted">طريقة الدفع:</label>
                            <select id="report-payment-method" class="form-select" onchange="app.loadReports()">
                                <option value="all">جميع الطرق</option>
                                <option value="cash">كاش (نقدي)</option>
                                <option value="card">بطاقة (شبكة)</option>
                                <option value="jeeb">جيب</option>
                                <option value="onecash">ون كاش</option>
                                <option value="haseb">حاسب</option>
                                <option value="kuraimi">كريمي</option>
                                <option value="floosak">فلوسك</option>
                                <option value="deposit">آجل (دين)</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted">ترتيب النتائج:</label>
                            <select id="report-sort" class="form-select" onchange="app.loadReports()">
                                <option value="time_desc">الأحدث أولاً (الوقت)</option>
                                <option value="time_asc">الأقدم أولاً (الوقت)</option>
                                <option value="amount_desc">الأعلى قيمة</option>
                                <option value="amount_asc">الأقل قيمة</option>
                                <option value="id_desc">رقم الفاتورة (تنازلي)</option>
                                <option value="id_asc">رقم الفاتورة (تصاعدي)</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small fw-bold text-muted">اسم الكاشير:</label>
                            <input type="text" id="report-cashier" class="form-control" placeholder="بحث بالكاشير..." onkeyup="if(event.key==='Enter') app.loadReports()">
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-primary w-100" onclick="app.loadReports()"><i class="fas fa-search"></i> بحث وتصفية</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-4 text-center g-3">
                <div class="col-md-3 col-6">
                    <div class="card bg-info text-white shadow-sm border-0 h-100">
                        <div class="card-body">
                            <div class="small opacity-75">إجمالي المبيعات (<span id="rep-count">0</span> فاتورة)</div>
                            <h3 class="mb-0 fw-bold mt-2" id="rep-total">0.00</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="card bg-success text-white shadow-sm border-0 h-100">
                        <div class="card-body">
                            <div class="small opacity-75">مبيعات الكاش (النقدي)</div>
                            <h3 class="mb-0 fw-bold mt-2" id="rep-cash">0.00</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="card bg-warning text-dark shadow-sm border-0 h-100">
                        <div class="card-body">
                            <div class="small opacity-75">مبيعات البطاقة (الشبكة)</div>
                            <h3 class="mb-0 fw-bold mt-2" id="rep-card">0.00</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 col-6">
                    <div class="card bg-danger text-white shadow-sm border-0 h-100">
                        <div class="card-body">
                            <div class="small opacity-75">الديون (الآجل غير المدفوع)</div>
                            <h3 class="mb-0 fw-bold mt-2" id="rep-deposit">0.00</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 class="mb-0 fw-bold"><i class="fas fa-file-invoice text-primary"></i> سجل فواتير المبيعات</h5>
                    <span class="badge bg-light text-dark border" id="report-filter-label"></span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 text-center">
                            <thead class="table-light">
                                <tr>
                                    <th># الفاتورة</th>
                                    <th>التاريخ والوقت</th>
                                    <th>الكاشير</th>
                                    <th>العميل</th>
                                    <th>طريقة الدفع</th>
                                    <th>الإجمالي</th>
                                    <th>المدفوع</th>
                                    <th>المتبقي</th>
                                    <th>الإيصال</th>
                                </tr>
                            </thead>
                            <tbody id="reports-table"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

    </div>

    <!-- Receipt Details Modal -->
    <div class="modal fade" id="receiptModal" tabindex="-1" aria-labelledby="receiptModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-md">
            <div class="modal-content">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fw-bold" id="receiptModalLabel"><i class="fas fa-receipt text-primary"></i> إيصال الفاتورة</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Printable Receipt Content Area -->
                    <div id="receipt-print-area" class="receipt-box p-3 bg-white border rounded">
                        <div class="text-center mb-3">
                            <h4 class="fw-bold mb-1"><i class="fas fa-store"></i> المتجر الذكي</h4>
                            <div class="text-muted small">فاتورة مبيعات</div>
                            <div class="border-bottom my-2"></div>
                        </div>
                        <div class="receipt-meta small mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted">رقم الفاتورة:</span>
                                <span class="fw-bold" id="rec-id">#0</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted">التاريخ والوقت:</span>
                                <span class="fw-bold" id="rec-datetime">-</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted">الكاشير:</span>
                                <span class="fw-bold" id="rec-cashier">-</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted">العميل:</span>
                                <span class="fw-bold" id="rec-customer">-</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted">طريقة الدفع:</span>
                                <span class="badge" id="rec-payment-badge">-</span>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-sm table-bordered text-center align-middle mb-2">
                                <thead class="table-light small">
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الكمية</th>
                                        <th>السعر</th>
                                        <th>المجموع</th>
                                    </tr>
                                </thead>
                                <tbody id="rec-items-body" class="small">
                                    <!-- Items loaded dynamically -->
                                </tbody>
                            </table>
                        </div>

                        <div class="receipt-totals border-top pt-2 small">
                            <div class="d-flex justify-content-between py-1">
                                <span>الإجمالي الكلي:</span>
                                <span class="fw-bold fs-6" id="rec-total">0.00</span>
                            </div>
                            <div class="d-flex justify-content-between py-1">
                                <span>المبلغ المدفوع:</span>
                                <span class="text-success fw-bold" id="rec-paid">0.00</span>
                            </div>
                            <div class="d-flex justify-content-between py-1" id="rec-debt-row">
                                <span>المتبقي (آجل/دين):</span>
                                <span class="text-danger fw-bold" id="rec-debt">0.00</span>
                            </div>
                        </div>

                        <div class="text-center mt-3 pt-2 border-top text-muted small">
                            شكراً لزيارتكم! نتمنى رؤيتكم مجدداً
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-0 pt-0">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                    <button type="button" class="btn btn-primary" onclick="app.printReceipt()"><i class="fas fa-print"></i> طباعة الإيصال</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Quick Add Customer Offcanvas -->
    <div class="offcanvas offcanvas-start" tabindex="-1" id="addCustomerOffcanvas">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title">إضافة عميل سريع</h5>
            <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
            <div class="mb-3">
                <label class="form-label">اسم العميل</label>
                <input type="text" id="quick-cust-name" class="form-control" placeholder="الاسم الكامل">
            </div>
            <div class="mb-3">
                <label class="form-label">رقم الهاتف</label>
                <input type="text" id="quick-cust-phone" class="form-control" dir="ltr" placeholder="05XXXXXXXX">
            </div>
            <button class="btn btn-primary w-100" onclick="app.quickAddCustomer()">إضافة العميل وتحديده</button>
        </div>
    </div>

    <!-- Restock Modal -->
    <div class="modal fade" id="restockModal" tabindex="-1" aria-labelledby="restockModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="restockModalLabel"><i class="fas fa-box"></i> توريد بضاعة (إضافة مخزون)</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="restock-product-id">
                    <div class="mb-3">
                        <label class="form-label">المنتج:</label>
                        <input type="text" id="restock-product-name" class="form-control" readonly disabled>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">المورد / البائع:</label>
                        <select id="restock-seller" class="form-select"></select>
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label">الكمية المشتراة:</label>
                            <input type="number" id="restock-quantity" class="form-control" min="0.01" step="any" required oninput="app.calcRestockDebt()">
                        </div>
                        <div class="col-6">
                            <label class="form-label">سعر التكلفة للوحدة:</label>
                            <input type="number" id="restock-cost" class="form-control" min="0" step="0.01" required oninput="app.calcRestockDebt()">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">المبلغ المدفوع للمورد:</label>
                        <input type="number" id="restock-paid-amount" class="form-control" min="0" step="0.01" oninput="app.calcRestockDebt()">
                    </div>
                    <div class="mb-3 small bg-light p-2 rounded">
                        <span class="text-muted">الإجمالي: <span id="restock-total-cost" class="fw-bold">0.00</span></span> | 
                        <span class="text-danger">الدين المتبقي: <span id="restock-remaining-debt" class="fw-bold">0.00</span></span>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">تاريخ الشراء:</label>
                        <input type="date" id="restock-date" class="form-control">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">ملاحظة / بيان الفاتورة (اختياري):</label>
                        <input type="text" id="restock-purchase-note" class="form-control" placeholder="مثال: فاتورة رقم 1234...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                    <button type="button" class="btn btn-success" onclick="app.submitRestock()"><i class="fas fa-save"></i> حفظ التوريد</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Sellers Management Offcanvas -->
    <div class="offcanvas offcanvas-end" tabindex="-1" id="sellersOffcanvas" aria-labelledby="sellersOffcanvasLabel">
        <div class="offcanvas-header bg-light">
            <h5 class="offcanvas-title" id="sellersOffcanvasLabel"><i class="fas fa-truck text-primary"></i> إدارة الموردين / البائعين</h5>
            <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
            <div class="card mb-4 border-0 shadow-sm">
                <div class="card-header bg-white"><h6 class="mb-0">إضافة مورد جديد</h6></div>
                <div class="card-body">
                    <div class="mb-2">
                        <label class="form-label small">اسم المورد:</label>
                        <input type="text" id="new-seller-name" class="form-control form-control-sm" placeholder="الاسم أو الشركة">
                    </div>
                    <div class="mb-2">
                        <label class="form-label small">رقم الهاتف:</label>
                        <input type="text" id="new-seller-phone" class="form-control form-control-sm" placeholder="اختياري">
                    </div>
                    <button class="btn btn-primary btn-sm w-100 mt-2" onclick="app.addSeller()"><i class="fas fa-plus"></i> إضافة</button>
                </div>
            </div>
            
            <h6 class="border-bottom pb-2 mb-3">قائمة الموردين</h6>
            <div class="list-group list-group-flush" id="sellers-list">
                <!-- Sellers will be listed here -->
            </div>
        </div>
    </div>

    <!-- Pay Seller Debt Modal -->
    <div class="modal fade" id="paySellerModal" tabindex="-1" aria-labelledby="paySellerModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title" id="paySellerModalLabel"><i class="fas fa-hand-holding-usd"></i> سداد دين مورد</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="pay-seller-id">
                    <div class="mb-3">
                        <label class="form-label">المورد / البائع:</label>
                        <input type="text" id="pay-seller-name" class="form-control" readonly disabled>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">إجمالي الدين الحالي:</label>
                        <input type="text" id="pay-seller-debt" class="form-control fw-bold text-danger" readonly disabled>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">المبلغ المراد سداده:</label>
                        <input type="number" id="pay-seller-amount" class="form-control" min="0.01" step="any" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">ملاحظة / بيان (اختياري):</label>
                        <input type="text" id="pay-seller-note" class="form-control" placeholder="مثال: دفعة من الحساب...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                    <button type="button" class="btn btn-danger" onclick="app.submitSellerPayment()"><i class="fas fa-check"></i> تسجيل السداد</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Purchase Modal -->
    <div class="modal fade" id="editPurchaseModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title"><i class="fas fa-edit"></i> تعديل عملية شراء / توريد</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="edit-purchase-id">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">المنتج:</label>
                            <select id="edit-purchase-product" class="form-select"></select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">المورد:</label>
                            <select id="edit-purchase-seller" class="form-select"></select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">الكمية:</label>
                            <input type="number" id="edit-purchase-qty" class="form-control" min="0.01" step="any">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">سعر التكلفة:</label>
                            <input type="number" id="edit-purchase-cost" class="form-control" min="0" step="0.01">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">المبلغ المدفوع:</label>
                            <input type="number" id="edit-purchase-paid" class="form-control" min="0" step="0.01">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">التاريخ:</label>
                            <input type="datetime-local" id="edit-purchase-date" class="form-control" step="1">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">ملاحظات:</label>
                            <input type="text" id="edit-purchase-note" class="form-control">
                        </div>
                    </div>
                </div>
                <div class="modal-footer d-flex justify-content-between">
                    <button type="button" class="btn btn-danger" onclick="app.deletePurchase(document.getElementById('edit-purchase-id').value); bootstrap.Modal.getInstance(document.getElementById('editPurchaseModal')).hide();"><i class="fas fa-trash"></i> حذف العملية</button>
                    <div>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="app.submitEditPurchase()"><i class="fas fa-save"></i> حفظ التعديلات</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Payment Modal -->
    <div class="modal fade" id="editPaymentModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title"><i class="fas fa-edit"></i> تعديل عملية سداد</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="edit-payment-id">
                    <div class="mb-3">
                        <label class="form-label">المورد:</label>
                        <select id="edit-payment-seller" class="form-select"></select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">المبلغ:</label>
                        <input type="number" id="edit-payment-amount" class="form-control" min="0.01" step="any">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">ملاحظات:</label>
                        <input type="text" id="edit-payment-note" class="form-control">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                    <button type="button" class="btn btn-success" onclick="app.submitEditPayment()">حفظ التعديلات</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Product Purchases Modal -->
    <div class="modal fade" id="productPurchasesModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-info text-white">
                    <h5 class="modal-title"><i class="fas fa-history"></i> سجل مشتريات المنتج: <span id="pp-modal-title"></span></h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 text-center">
                            <thead class="table-light">
                                <tr>
                                    <th>التاريخ</th>
                                    <th>المورد</th>
                                    <th>الكمية</th>
                                    <th>التكلفة (للوحدة)</th>
                                    <th>الإجمالي</th>
                                    <th>المدفوع</th>
                                    <th>المديونية</th>
                                    <th>ملاحظات</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody id="pp-table-body">
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="js/app.js?v=<?= time() ?>"></script>
</body>
</html>
