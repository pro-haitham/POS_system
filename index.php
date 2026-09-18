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
    <link href="css/style.css" rel="stylesheet">
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
            <li data-target="reports-section"><i class="fas fa-chart-line"></i> التقارير والمبيعات</li>
            <li><a href="api/backup.php" target="_blank" style="color: inherit; text-decoration: none;"><i class="fas fa-database"></i> نسخ احتياطي</a></li>
        </ul>
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
                                <div class="row g-2 mb-2">
                                    <div class="col-6">
                                        <label>نوع الدفع:</label>
                                        <select id="pos-payment-method" class="form-select">
                                            <option value="cash">كاش</option>
                                            <option value="card">بطاقة (شبكة)</option>
                                            <option value="deposit">آجل (دين)</option>
                                        </select>
                                    </div>
                                    <div class="col-6">
                                        <label>المبلغ المدفوع:</label>
                                        <input type="number" id="pos-paid-amount" class="form-control" value="0">
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
                                    <input type="number" id="prod-price" class="form-control" placeholder="السعر" min="0" step="0.01">
                                </div>
                                <div class="col-md-3">
                                    <input type="text" id="prod-location" class="form-control" placeholder="مكان التخزين (الرف/المستودع)">
                                </div>
                                <div class="col-md-2">
                                    <input type="number" id="prod-stock" class="form-control" placeholder="الكمية" min="0" step="any">
                                </div>
                                <div class="col-12 mt-3">
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
            <h2 class="mb-4">العملاء والديون</h2>
            <div class="row">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">إضافة عميل</div>
                        <div class="card-body">
                            <input type="text" id="cust-name" class="form-control mb-2" placeholder="اسم العميل">
                            <input type="text" id="cust-phone" class="form-control mb-2" placeholder="رقم الهاتف">
                            <button class="btn btn-primary w-100" onclick="app.addCustomer()">حفظ</button>
                        </div>
                    </div>
                    
                    <div class="card mt-4">
                        <div class="card-header">سداد دين (دفعة)</div>
                        <div class="card-body">
                            <select id="payment-customer" class="form-select mb-2"></select>
                            <input type="number" id="payment-amount" class="form-control mb-2" placeholder="المبلغ المدفوع">
                            <button class="btn btn-success w-100" onclick="app.makePayment()">سداد</button>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">قائمة العملاء وديونهم</div>
                        <div class="card-body">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>الاسم</th>
                                        <th>الهاتف</th>
                                        <th>إجمالي الدين</th>
                                    </tr>
                                </thead>
                                <tbody id="customers-table"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Reports Section -->
        <section id="reports-section" class="section d-none">
            <h2 class="mb-4">تقارير المبيعات</h2>
            <div class="card mb-3">
                <div class="card-body row g-2">
                    <div class="col-md-4">
                        <input type="date" id="report-date" class="form-control">
                    </div>
                    <div class="col-md-4">
                        <input type="text" id="report-cashier" class="form-control" placeholder="تصفية بالكاشير">
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-primary w-100" onclick="app.loadReports()">عرض</button>
                    </div>
                </div>
            </div>

            <div class="row mb-4 text-center">
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <h5>إجمالي المبيعات</h5>
                            <h3 id="rep-total">0</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <h5>مبيعات الكاش</h5>
                            <h3 id="rep-cash">0</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-dark">
                        <div class="card-body">
                            <h5>مبيعات البطاقة</h5>
                            <h3 id="rep-card">0</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-danger text-white">
                        <div class="card-body">
                            <h5>الديون (آجل)</h5>
                            <h3 id="rep-deposit">0</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>رقم الفاتورة</th>
                                <th>الوقت</th>
                                <th>الكاشير</th>
                                <th>العميل</th>
                                <th>طريقة الدفع</th>
                                <th>الإجمالي</th>
                                <th>المدفوع</th>
                            </tr>
                        </thead>
                        <tbody id="reports-table"></tbody>
                    </table>
                </div>
            </div>
        </section>

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

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
