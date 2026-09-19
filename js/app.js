const app = {
    cart: [],
    products: [],
    categories: [],
    customers: [],
    sellers: [],

    init() {
        this.initTheme();
        this.setupNavigation();
        this.loadCategories();
        this.loadProducts();
        this.loadCustomers();
        this.loadSellers();
        this.setupPOSSearch();
        this.setupInventorySearch();
        
        // Default dates for reports to today's local date
        this.setReportDateToday(false);
    },

    // --- THEME / DARK MODE ---
    initTheme() {
        const savedTheme = localStorage.getItem('pos_theme') || 'light';
        this.applyTheme(savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
        const newTheme = (currentTheme === 'dark') ? 'light' : 'dark';
        this.applyTheme(newTheme);
        localStorage.setItem('pos_theme', newTheme);
        this.showToast(newTheme === 'dark' ? 'تم تفعيل الوضع الليلي 🌙' : 'تم تفعيل الوضع النهاري ☀️');
    },

    applyTheme(theme) {
        const icon = document.getElementById('theme-toggle-icon');
        const text = document.getElementById('theme-toggle-text');
        
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
            if (icon) {
                icon.className = 'fas fa-sun text-warning';
            }
            if (text) {
                text.innerText = 'الوضع النهاري';
            }
        } else {
            document.documentElement.removeAttribute('data-bs-theme');
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
            if (icon) {
                icon.className = 'fas fa-moon';
            }
            if (text) {
                text.innerText = 'الوضع الليلي';
            }
        }
    },

    setReportDateToday(autoLoad = true) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('report-date').value = `${year}-${month}-${day}`;
        if (autoLoad) this.loadReports();
    },

    setReportDateAll() {
        document.getElementById('report-date').value = '';
        this.loadReports();
    },

    setupNavigation() {
        document.querySelectorAll('.nav-links li[data-target]').forEach(link => {
            link.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                document.querySelectorAll('.section').forEach(sec => sec.classList.add('d-none'));
                document.getElementById(e.currentTarget.dataset.target).classList.remove('d-none');
                
                // Trigger refresh if needed
                if(e.currentTarget.dataset.target === 'pos-section') this.renderPOSProducts();
                if(e.currentTarget.dataset.target === 'reports-section') this.loadReports();
                if(e.currentTarget.dataset.target === 'inventory-section') this.renderInventoryTable();
                if(e.currentTarget.dataset.target === 'seller-reports-section') this.loadSellerReports();
            });
        });
    },

    showToast(message) {
        const textEl = document.getElementById('toast-body-text');
        const toastEl = document.getElementById('liveToast');
        if (textEl) textEl.innerText = message;
        if (toastEl && window.bootstrap && typeof bootstrap.Toast === 'function') {
            try {
                const toast = bootstrap.Toast.getInstance(toastEl) || new bootstrap.Toast(toastEl);
                toast.show();
            } catch(e) {
                console.warn('Toast display note:', e);
            }
        }
    },

    async fetchAPI(url, options = {}) {
        try {
            const res = await fetch(url, options);
            return await res.json();
        } catch (e) {
            console.error('API Error:', e);
            return { success: false, error: 'حدث خطأ في الاتصال' };
        }
    },

    // --- CATEGORIES ---
    async loadCategories() {
        this.categories = await this.fetchAPI('api/categories.php');
        this.renderCategories();
    },

    renderCategories() {
        const list = document.getElementById('categories-list');
        const select = document.getElementById('prod-category');
        list.innerHTML = '';
        select.innerHTML = '<option value="">بدون قسم</option>';
        
        this.categories.forEach(cat => {
            list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
                ${cat.name}
                <button class="btn btn-sm btn-danger" onclick="app.deleteCategory(${cat.id})"><i class="fas fa-trash"></i></button>
            </li>`;
            select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    },

    async addCategory() {
        const name = document.getElementById('cat-name').value;
        if (!name) return alert('أدخل اسم القسم');
        
        const res = await this.fetchAPI('api/categories.php', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        
        if (res.success) {
            this.showToast('تمت إضافة القسم');
            document.getElementById('cat-name').value = '';
            this.loadCategories();
        } else alert(res.error);
    },

    async deleteCategory(id) {
        if(!confirm('هل أنت متأكد من حذف القسم؟')) return;
        await this.fetchAPI('api/categories.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        this.loadCategories();
        this.loadProducts(); // Category might have been unlinked
    },

    // --- PRODUCTS ---
    async loadProducts() {
        this.products = await this.fetchAPI('api/products.php');
        this.renderProductsTable();
        this.renderPOSProducts();
        this.renderInventoryTable();
    },

    renderProductsTable() {
        const tbody = document.getElementById('products-table');
        tbody.innerHTML = '';
        this.products.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.serial_number || '-'}</td>
                    <td>${p.name}</td>
                    <td>${p.category_name || '-'}</td>
                    <td>${p.unit}</td>
                    <td>${p.storage_location || '-'}</td>
                    <td><input type="number" step="any" class="form-control form-control-sm w-75" id="list_stock_${p.id}" value="${p.stock_quantity}" min="0"></td>
                    <td><input type="number" step="0.01" class="form-control form-control-sm w-75" id="list_price_${p.id}" value="${p.price}" min="0"></td>
                    <td style="min-width: 140px;">
                        <button class="btn btn-sm btn-success mb-1" title="توريد (إضافة مخزون)" onclick="app.openRestockModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')"><i class="fas fa-truck-loading"></i> توريد</button>
                        <button class="btn btn-sm btn-primary mb-1" onclick="app.updateProductQuick(${p.id})">حفظ</button>
                        <button class="btn btn-sm btn-danger mb-1" onclick="app.deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    },

    async addProduct() {
        let unitVal = document.getElementById('prod-unit-select').value;
        if (unitVal === 'other') {
            unitVal = document.getElementById('prod-unit-other').value || 'قطعة';
        }

        const data = {
            name: document.getElementById('prod-name').value,
            serial_number: document.getElementById('prod-serial').value,
            category_id: document.getElementById('prod-category').value,
            unit: unitVal,
            price: document.getElementById('prod-price').value,
            stock_quantity: document.getElementById('prod-stock').value,
            location: document.getElementById('prod-location').value,
            seller_id: document.getElementById('prod-seller') ? document.getElementById('prod-seller').value : '',
            cost_price: document.getElementById('prod-cost-price') ? document.getElementById('prod-cost-price').value : '',
            paid_amount: document.getElementById('prod-paid-amount') ? document.getElementById('prod-paid-amount').value : '',
            note: document.getElementById('prod-purchase-note') ? document.getElementById('prod-purchase-note').value : '',
            purchase_date: document.getElementById('prod-purchase-date') ? document.getElementById('prod-purchase-date').value : ''
        };
        
        if (!data.name || !data.price) return alert('الاسم والسعر مطلوبان');
        if (parseFloat(data.price) < 0) return alert('لا يمكن أن يكون السعر بالسالب');
        if (data.stock_quantity && parseFloat(data.stock_quantity) < 0) return alert('لا يمكن أن تكون الكمية بالسالب');
        
        const res = await this.fetchAPI('api/products.php', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (res.success) {
            this.showToast('تمت إضافة المنتج');
            document.querySelectorAll('#products-section input').forEach(i => i.value = '');
            document.getElementById('prod-unit-select').value = 'قطعة';
            document.getElementById('prod-unit-other').classList.add('d-none');
            this.loadProducts();
        } else alert(res.error);
    },

    async updateProductQuick(id) {
        const price = document.getElementById(`list_price_${id}`).value;
        const stock = document.getElementById(`list_stock_${id}`).value;
        
        if (parseFloat(price) < 0 || parseFloat(stock) < 0) return alert('القيم لا يمكن أن تكون بالسالب');

        const res1 = await this.fetchAPI('api/products.php', { method: 'POST', body: JSON.stringify({ action: 'update_price', id, price }) });
        const res2 = await this.fetchAPI('api/products.php', { method: 'POST', body: JSON.stringify({ action: 'update_stock', id, stock }) });
        
        if(res1.success && res2.success) {
            this.showToast('تم تحديث البيانات بنجاح');
            this.loadProducts();
            
            this.cart.forEach(item => {
                if(item.id == id) item.price = parseFloat(price);
            });
            this.renderCart();
        } else {
            alert(res1.error || res2.error || 'حدث خطأ أثناء التحديث');
        }
    },

    async updatePrice(id) {
        const price = document.getElementById(`price_${id}`).value;
        if (parseFloat(price) < 0) return alert('لا يمكن أن يكون السعر بالسالب');

        const res = await this.fetchAPI('api/products.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'update_price', id, price })
        });
        if(res.success) {
            this.showToast('تم تحديث السعر');
            this.loadProducts(); // Reload to update POS grid as well
            
            // Also update price in cart if item is there
            this.cart.forEach(item => {
                if(item.id == id) {
                    item.price = parseFloat(price);
                }
            });
            this.renderCart();
        }
    },

    async deleteProduct(id) {
        if(!confirm('هل أنت متأكد من حذف المنتج؟')) return;
        const res = await this.fetchAPI('api/products.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        if(res && res.success) {
            this.showToast('تم حذف المنتج');
            this.loadProducts();
        } else {
            alert(res.error || 'حدث خطأ غير متوقع');
        }
    },

    // --- SELLERS & RESTOCK ---
    async loadSellers() {
        this.sellers = await this.fetchAPI('api/sellers.php');
        this.renderSellers();
    },

    renderSellers() {
        const prodSelect = document.getElementById('prod-seller');
        const restockSelect = document.getElementById('restock-seller');
        const list = document.getElementById('sellers-list');
        
        let optionsHtml = '<option value="">بدون مورد</option>';
        let listHtml = '';
        
        this.sellers.forEach(s => {
            const debt = parseFloat(s.total_debt || 0);
            const hasDebt = debt > 0;
            
            optionsHtml += `<option value="${s.id}">${s.name} ${s.phone ? '('+s.phone+')' : ''}</option>`;
            
            listHtml += `<div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold">${s.name}</div>
                    <div class="small text-muted">${s.phone || 'بدون رقم'}</div>
                    ${hasDebt ? `<div class="small text-danger fw-bold">الدين: ${debt.toFixed(2)} ريال</div>` : '<div class="small text-success">لا يوجد دين</div>'}
                </div>
                ${hasDebt ? `<button class="btn btn-sm btn-outline-danger" onclick="app.openPaySellerModal(${s.id}, '${s.name.replace(/'/g, "\\'")}', ${debt})"><i class="fas fa-money-bill-wave"></i> سداد</button>` : ''}
            </div>`;
        });
        
        if (prodSelect) prodSelect.innerHTML = optionsHtml;
        if (restockSelect) restockSelect.innerHTML = optionsHtml;
        if (list) list.innerHTML = listHtml;
    },

    async addSeller() {
        const name = document.getElementById('new-seller-name').value;
        const phone = document.getElementById('new-seller-phone').value;
        if (!name) return alert('اسم المورد مطلوب');
        
        const res = await this.fetchAPI('api/sellers.php', {
            method: 'POST',
            body: JSON.stringify({ name, phone })
        });
        
        if (res.success) {
            this.showToast('تم إضافة المورد بنجاح');
            document.getElementById('new-seller-name').value = '';
            document.getElementById('new-seller-phone').value = '';
            this.loadSellers();
        } else {
            alert(res.error);
        }
    },

    openRestockModal(id, name) {
        document.getElementById('restock-product-id').value = id;
        document.getElementById('restock-product-name').value = name;
        document.getElementById('restock-quantity').value = '';
        document.getElementById('restock-cost').value = '';
        document.getElementById('restock-paid-amount').value = '';
        document.getElementById('restock-purchase-note').value = '';
        document.getElementById('restock-total-cost').innerText = '0.00';
        document.getElementById('restock-remaining-debt').innerText = '0.00';
        
        // Default to today's date
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('restock-date').value = `${year}-${month}-${day}`;
        
        const modal = new bootstrap.Modal(document.getElementById('restockModal'));
        modal.show();
    },

    async submitRestock() {
        const productId = document.getElementById('restock-product-id').value;
        const sellerId = document.getElementById('restock-seller').value;
        const quantity = document.getElementById('restock-quantity').value;
        const costPrice = document.getElementById('restock-cost').value;
        const paidAmount = document.getElementById('restock-paid-amount').value;
        const purchaseDate = document.getElementById('restock-date').value;
        const note = document.getElementById('restock-purchase-note').value;
        
        if (!quantity || !costPrice) return alert('الكمية وسعر التكلفة مطلوبان');
        
        const res = await this.fetchAPI('api/purchases.php', {
            method: 'POST',
            body: JSON.stringify({
                product_id: productId,
                seller_id: sellerId,
                quantity: parseFloat(quantity),
                cost_price: parseFloat(costPrice),
                paid_amount: parseFloat(paidAmount || 0),
                note: note,
                purchase_date: purchaseDate
            })
        });
        
        if (res.success) {
            this.showToast('تم إضافة البضاعة وتحديث المخزون بنجاح');
            const modalEl = document.getElementById('restockModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            this.loadProducts(); // Update stock everywhere
        } else {
            alert(res.error);
        }
    },

    calcAddProductDebt() {
        const qty = parseFloat(document.getElementById('prod-stock').value) || 0;
        const cost = parseFloat(document.getElementById('prod-cost-price').value) || 0;
        const paid = parseFloat(document.getElementById('prod-paid-amount').value) || 0;
        
        const total = qty * cost;
        const debt = Math.max(0, total - paid);
        
        const totalEl = document.getElementById('prod-total-cost');
        const debtEl = document.getElementById('prod-remaining-debt');
        
        if (totalEl) totalEl.innerText = total.toFixed(2);
        if (debtEl) debtEl.innerText = debt.toFixed(2);
    },

    calcRestockDebt() {
        const qty = parseFloat(document.getElementById('restock-quantity').value) || 0;
        const cost = parseFloat(document.getElementById('restock-cost').value) || 0;
        const paid = parseFloat(document.getElementById('restock-paid-amount').value) || 0;
        
        const total = qty * cost;
        const debt = Math.max(0, total - paid);
        
        const totalEl = document.getElementById('restock-total-cost');
        const debtEl = document.getElementById('restock-remaining-debt');
        
        if (totalEl) totalEl.innerText = total.toFixed(2);
        if (debtEl) debtEl.innerText = debt.toFixed(2);
    },

    openPaySellerModal(id, name, debt) {
        document.getElementById('pay-seller-id').value = id;
        document.getElementById('pay-seller-name').value = name;
        document.getElementById('pay-seller-debt').value = parseFloat(debt).toFixed(2);
        document.getElementById('pay-seller-amount').value = '';
        document.getElementById('pay-seller-note').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('paySellerModal'));
        modal.show();
    },

    async submitSellerPayment() {
        const id = document.getElementById('pay-seller-id').value;
        const amount = document.getElementById('pay-seller-amount').value;
        const note = document.getElementById('pay-seller-note').value;
        
        if (!amount || parseFloat(amount) <= 0) return alert('أدخل مبلغاً صحيحاً');
        
        const res = await this.fetchAPI('api/seller_payments.php', {
            method: 'POST',
            body: JSON.stringify({ seller_id: id, amount: parseFloat(amount), note })
        });
        
        if (res.success) {
            this.showToast('تم تسجيل سداد المورد بنجاح');
            bootstrap.Modal.getInstance(document.getElementById('paySellerModal')).hide();
            this.loadSellers(); // Refresh sellers list and debt
        } else {
            alert(res.error);
        }
    },

    // --- INVENTORY / STORAGE ---
    setupInventorySearch() {
        document.getElementById('inventory-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            this.renderInventoryTable(term);
        });
    },

    renderInventoryTable(searchTerm = '') {
        const tbody = document.getElementById('inventory-table');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const filtered = this.products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.serial_number && p.serial_number.includes(searchTerm))
        );

        filtered.forEach(p => {
            const isLowStock = p.stock_quantity <= 5;
            tbody.innerHTML += `
                <tr class="${isLowStock ? 'table-danger' : ''}">
                    <td>${p.serial_number || '-'}</td>
                    <td class="fw-bold">${p.name}</td>
                    <td>${p.category_name || '-'}</td>
                    <td>${p.unit}</td>
                    <td><input type="text" class="form-control form-control-sm text-center" id="inv_loc_${p.id}" value="${p.storage_location || ''}" placeholder="مكان التخزين"></td>
                    <td>
                        <span class="badge ${isLowStock ? 'bg-danger' : 'bg-success'} fs-6">
                            ${p.stock_quantity}
                        </span>
                    </td>
                    <td>
                        <div class="input-group input-group-sm w-75 mx-auto">
                            <input type="number" class="form-control text-center" id="stock_${p.id}" value="${p.stock_quantity}" min="0" step="any">
                            <button class="btn btn-primary" onclick="app.updateStock(${p.id})">حفظ</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    },

    async updateStock(id) {
        const stock = document.getElementById(`stock_${id}`).value;
        const loc = document.getElementById(`inv_loc_${id}`).value;
        if (parseFloat(stock) < 0) return alert('لا يمكن أن تكون الكمية بالسالب');

        const res = await this.fetchAPI('api/products.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'update_stock', id, stock, location: loc })
        });
        if(res.success) {
            this.showToast('تم تحديث المخزون');
            this.loadProducts(); // Reload everything
        } else {
            alert(res.error);
        }
    },

    // --- CUSTOMERS & PAYMENTS ---
    currentDebtAction: 'pay_debt',
    isSplitPayment: false,

    async loadCustomers() {
        this.customers = await this.fetchAPI('api/customers.php');
        this.renderCustomers();
    },

    switchDebtAction(action) {
        this.currentDebtAction = action;
        const amountLabel = document.getElementById('pay-amount-label');
        const submitBtn = document.getElementById('btn-debt-submit');
        const itemsContainer = document.getElementById('payment-items-container');
        
        if (action === 'add_debt') {
            if (amountLabel) amountLabel.innerText = 'المبلغ المطلوب إضافته كدين (ريال):';
            if (itemsContainer) itemsContainer.style.display = 'block';
            if (submitBtn) {
                submitBtn.className = 'btn btn-danger w-100 py-2 fw-bold';
                submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> قيد الدين على العميل';
            }
        } else {
            if (amountLabel) amountLabel.innerText = 'المبلغ المدفوع (ريال):';
            if (itemsContainer) itemsContainer.style.display = 'none';
            if (submitBtn) {
                submitBtn.className = 'btn btn-success w-100 py-2 fw-bold';
                submitBtn.innerHTML = '<i class="fas fa-save"></i> تسجيل سداد الدفعة';
            }
        }
    },

    async executeDebtAction() {
        const customerId = document.getElementById('payment-customer').value;
        const amount = document.getElementById('payment-amount').value;
        const note = document.getElementById('payment-note').value;
        const itemsDetails = document.getElementById('payment-items-details') ? document.getElementById('payment-items-details').value : '';

        if (!customerId) return alert('الرجاء اختيار العميل أولاً');
        if (!amount || parseFloat(amount) <= 0) return alert('الرجاء إدخال مبلغ صحيح أكبر من الصفر');

        const res = await this.fetchAPI('api/payments.php', {
            method: 'POST',
            body: JSON.stringify({
                customer_id: customerId,
                amount: parseFloat(amount),
                action: this.currentDebtAction,
                note: note,
                items_details: itemsDetails
            })
        });

        if (res && res.success) {
            this.showToast(this.currentDebtAction === 'add_debt' ? 'تم قيد الدين وتفاصيل المشتريات بنجاح' : 'تم تسجيل السداد بنجاح');
            document.getElementById('payment-amount').value = '';
            document.getElementById('payment-note').value = '';
            if (document.getElementById('payment-items-details')) {
                document.getElementById('payment-items-details').value = '';
            }
            await this.loadCustomers();
        } else {
            alert(res.error || 'حدث خطأ أثناء تنفيذ العملية');
        }
    },

    quickOpenDebt(customerId, action) {
        const radio = action === 'add_debt' ? document.getElementById('act_add') : document.getElementById('act_pay');
        if (radio) {
            radio.checked = true;
            this.switchDebtAction(action);
        }
        const select = document.getElementById('payment-customer');
        if (select) {
            select.value = customerId;
        }
        const amtInput = document.getElementById('payment-amount');
        if (amtInput) {
            amtInput.focus();
        }
    },

    async showCustomerStatement(customerId) {
        const cust = this.customers.find(c => c.id == customerId);
        if (!cust) return;

        document.getElementById('stmt-cust-name').innerText = cust.name;
        document.getElementById('stmt-cust-phone').innerText = cust.phone ? `الهاتف: ${cust.phone}` : 'بدون هاتف';
        const debt = parseFloat(cust.total_debt || 0);
        document.getElementById('stmt-cust-debt').innerText = `${debt.toFixed(2)} ريال`;

        const tbody = document.getElementById('stmt-items-body');
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">جاري تحميل سجل الحركات والمشتريات...</td></tr>`;

        const modalEl = document.getElementById('customerStatementModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();

        const res = await this.fetchAPI(`api/payments.php?customer_id=${customerId}`);
        tbody.innerHTML = '';

        if (!res || res.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">لا توجد حركات ديون أو سداد مسجلة لهذا العميل حتى الآن</td></tr>`;
            return;
        }

        res.forEach(item => {
            const isDebt = (item.type === 'debt');
            let formattedDate = item.created_at;
            try {
                const dt = new Date(item.created_at.replace(' ', 'T'));
                if (!isNaN(dt.getTime())) {
                    const datePart = item.created_at.split(' ')[0];
                    const timePart = dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                    formattedDate = `${datePart} - ${timePart}`;
                }
            } catch(e) {}

            const details = item.items_details || item.note || '-';
            const receiptBtn = item.bill_id ? `
                <button class="btn btn-sm btn-outline-primary" title="عرض وطباعة إيصال الفاتورة" onclick="app.showReceipt(${item.bill_id})">
                    <i class="fas fa-file-invoice"></i> إيصال #${item.bill_id}
                </button>
            ` : '<span class="text-muted small">قيد يدوي</span>';

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">#${item.id}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <span class="badge ${isDebt ? 'bg-danger' : 'bg-success'}">
                            ${isDebt ? 'قيد دين (+)' : 'سداد دفعة (-)'}
                        </span>
                    </td>
                    <td class="fw-bold ${isDebt ? 'text-danger fs-6' : 'text-success'}">${parseFloat(item.amount).toFixed(2)}</td>
                    <td class="text-start">${details}</td>
                    <td>${receiptBtn}</td>
                </tr>
            `;
        });
    },

    renderCustomers(filteredList = null) {
        const tbody = document.getElementById('customers-table');
        const posSelect = document.getElementById('pos-customer');
        const paySelect = document.getElementById('payment-customer');
        
        const listToRender = filteredList !== null ? filteredList : this.customers;

        tbody.innerHTML = '';
        if (posSelect) posSelect.innerHTML = '';
        if (paySelect) paySelect.innerHTML = '<option value="">-- اختر العميل --</option>';
        
        let totalOutstandingDebt = 0;
        let indebtedCount = 0;
        let registeredCount = 0;
        let hasWalkIn = false;

        this.customers.forEach(c => {
            const isWalkIn = (c.id == 1 || c.name.includes('عابر') || c.name.includes('عام'));
            if (isWalkIn) hasWalkIn = true;
            else registeredCount++;

            const debt = parseFloat(c.total_debt || 0);
            if (debt > 0) {
                totalOutstandingDebt += debt;
                indebtedCount++;
            }

            if (posSelect) {
                const displayName = isWalkIn ? 'عميل عابر (نقدي - بدون تسجيل)' : `${c.name} ${c.phone ? ' ('+c.phone+')' : ''} ${debt > 0 ? ' [دين: '+debt.toFixed(2)+']' : ''}`;
                posSelect.innerHTML += `<option value="${c.id}" ${isWalkIn ? 'selected' : ''}>${displayName}</option>`;
            }
            
            if (!isWalkIn && paySelect) {
                paySelect.innerHTML += `<option value="${c.id}">${c.name} ${c.phone ? ' ('+c.phone+')' : ''} (الدين: ${debt.toFixed(2)})</option>`;
            }
        });

        if (!hasWalkIn && posSelect) {
            posSelect.insertAdjacentHTML('afterbegin', `<option value="1" selected>عميل عابر (نقدي - بدون تسجيل)</option>`);
        }

        // Summary cards
        const sumDebtEl = document.getElementById('cust-sum-total-debt');
        const sumIndebtedEl = document.getElementById('cust-sum-indebted-count');
        const sumTotalEl = document.getElementById('cust-sum-total-count');
        if (sumDebtEl) sumDebtEl.innerText = totalOutstandingDebt.toFixed(2);
        if (sumIndebtedEl) sumIndebtedEl.innerText = indebtedCount;
        if (sumTotalEl) sumTotalEl.innerText = registeredCount;

        // Table Rows
        if (listToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">لا يوجد عملاء مطابقين للبحث</td></tr>`;
        } else {
            listToRender.forEach(c => {
                const isWalkIn = (c.id == 1 || c.name.includes('عابر') || c.name.includes('عام'));
                const debt = parseFloat(c.total_debt || 0);
                const isDebt = debt > 0;

                tbody.innerHTML += `
                    <tr class="${isDebt ? 'table-light' : ''}">
                        <td class="fw-bold">${c.name} ${isWalkIn ? '<span class="badge bg-secondary ms-1">افتراضي</span>' : ''}</td>
                        <td dir="ltr">${c.phone || '-'}</td>
                        <td class="fw-bold ${isDebt ? 'text-danger fs-6' : 'text-success'}">${debt.toFixed(2)}</td>
                        <td>
                            <span class="badge ${isDebt ? 'bg-danger' : 'bg-success'}">
                                ${isDebt ? 'مدين' : 'خالص'}
                            </span>
                        </td>
                        <td>
                            ${!isWalkIn ? `
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-danger" title="قيد دين جديد على العميل" onclick="app.quickOpenDebt(${c.id}, 'add_debt')">
                                    <i class="fas fa-plus"></i> دين
                                </button>
                                <button class="btn btn-outline-success" title="تسجيل سداد دفعة" onclick="app.quickOpenDebt(${c.id}, 'pay_debt')">
                                    <i class="fas fa-check"></i> سداد
                                </button>
                                <button class="btn btn-outline-primary" title="عرض كشف حساب العميل" onclick="app.showCustomerStatement(${c.id})">
                                    <i class="fas fa-list-alt"></i> كشف حساب
                                </button>
                            </div>
                            ` : '<span class="text-muted small">-</span>'}
                        </td>
                    </tr>
                `;
            });
        }

        // Initialize Select2 if available
        if (window.jQuery && $.fn.select2) {
            $('#pos-customer').select2({
                dir: "rtl",
                width: '100%'
            });
        }
    },

    filterCustomersTable(term) {
        term = (term || '').toLowerCase().trim();
        if (!term) {
            this.renderCustomers();
            return;
        }
        const filtered = this.customers.filter(c => 
            c.name.toLowerCase().includes(term) || 
            (c.phone && c.phone.includes(term))
        );
        this.renderCustomers(filtered);
    },

    async quickAddCustomer() {
        const name = document.getElementById('quick-cust-name').value;
        const phone = document.getElementById('quick-cust-phone').value;
        if(!name || !phone) return alert('الاسم ورقم الهاتف مطلوبان');
        
        const res = await this.fetchAPI('api/customers.php', { method: 'POST', body: JSON.stringify({ name, phone }) });
        if(res.success) {
            this.showToast('تمت الإضافة بنجاح');
            document.getElementById('quick-cust-name').value = '';
            document.getElementById('quick-cust-phone').value = '';
            
            // Close offcanvas
            const offcanvasEl = document.getElementById('addCustomerOffcanvas');
            const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
            offcanvas.hide();

            await this.loadCustomers();
            
            // Auto select new customer
            if (res.id) {
                $('#pos-customer').val(res.id).trigger('change');
            }
        } else alert(res.error);
    },

    async addCustomer() {
        const name = document.getElementById('cust-name').value;
        const phone = document.getElementById('cust-phone').value;
        if(!name) return alert('الاسم مطلوب');
        
        const res = await this.fetchAPI('api/customers.php', { method: 'POST', body: JSON.stringify({ name, phone }) });
        if(res.success) {
            this.showToast('تمت إضافة العميل بنجاح');
            document.getElementById('cust-name').value = '';
            document.getElementById('cust-phone').value = '';
            this.loadCustomers();
        } else alert(res.error);
    },

    // --- POS ---
    setupPOSSearch() {
        document.getElementById('pos-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            this.renderPOSProducts(term);
        });
    },

    renderPOSProducts(searchTerm = '') {
        const grid = document.getElementById('pos-products-grid');
        grid.innerHTML = '';
        
        const filtered = this.products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.serial_number && p.serial_number.includes(searchTerm))
        );

        filtered.forEach(p => {
            grid.innerHTML += `
                <div class="col">
                    <div class="card product-card h-100" onclick="app.addToCart(${p.id})">
                        <div class="card-body d-flex flex-column justify-content-center">
                            <div class="product-title">${p.name}</div>
                            <div class="product-unit">${p.unit}</div>
                            <div class="product-price">${p.price}</div>
                        </div>
                    </div>
                </div>
            `;
        });
    },

    addToCart(productId) {
        const product = this.products.find(p => p.id == productId);
        if (!product) return;

        const stock = parseFloat(product.stock_quantity) || 0;
        const existing = this.cart.find(i => i.id == productId);
        const currentQty = existing ? existing.qty : 0;
        
        if (currentQty + 1 > stock) {
            return alert(`عذراً، الكمية المتوفرة في المخزون لا تكفي! المتاح: ${stock}`);
        }

        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                unit: product.unit,
                price: parseFloat(product.price),
                qty: 1
            });
        }
        this.renderCart();
    },

    updateCartItem(id, field, value) {
        const item = this.cart.find(i => i.id == id);
        if(item) {
            if (field === 'qty') {
                const product = this.products.find(p => p.id == id);
                const stock = parseFloat(product.stock_quantity) || 0;
                let newQty = parseFloat(value) || 0;
                if (newQty > stock) {
                    alert(`عذراً، الكمية المتوفرة في المخزون هي ${stock} فقط`);
                    newQty = stock;
                }
                item.qty = newQty;
            } else {
                item[field] = parseFloat(value) || 0;
            }
            this.renderCart();
        }
    },

    removeFromCart(id) {
        this.cart = this.cart.filter(i => i.id != id);
        this.renderCart();
    },

    toggleSplitPayment(isSplit) {
        this.isSplitPayment = isSplit;
        const singleContainer = document.getElementById('pos-single-payment-container');
        const splitContainer = document.getElementById('pos-split-payment-container');
        
        if (isSplit) {
            if (singleContainer) singleContainer.classList.add('d-none');
            if (splitContainer) splitContainer.classList.remove('d-none');
            
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const amt1El = document.getElementById('pos-split-amount-1');
            const amt2El = document.getElementById('pos-split-amount-2');
            
            if (amt1El && (!amt1El.value || parseFloat(amt1El.value) === 0)) {
                amt1El.value = total > 0 ? (total / 2).toFixed(2) : 0;
            }
            this.calculateSplitRemainder();
        } else {
            if (singleContainer) singleContainer.classList.remove('d-none');
            if (splitContainer) splitContainer.classList.add('d-none');
            this.renderCart();
        }
    },

    calculateSplitRemainder() {
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const amt1El = document.getElementById('pos-split-amount-1');
        const amt2El = document.getElementById('pos-split-amount-2');
        
        let amt1 = parseFloat(amt1El ? amt1El.value : 0) || 0;
        if (amt1 < 0) amt1 = 0;
        if (amt1 > total) amt1 = total;
        if (amt1El) amt1El.value = amt1;

        let rem = Math.max(0, total - amt1);
        if (amt2El) amt2El.value = rem.toFixed(2);

        this.updateSplitTotalIndicator();
    },

    updateSplitTotalIndicator() {
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const m1 = document.getElementById('pos-split-method-1')?.value || 'cash';
        const m2 = document.getElementById('pos-split-method-2')?.value || 'deposit';
        const amt1 = parseFloat(document.getElementById('pos-split-amount-1')?.value || 0) || 0;
        const amt2 = parseFloat(document.getElementById('pos-split-amount-2')?.value || 0) || 0;
        
        const collected1 = (m1 !== 'deposit') ? amt1 : 0;
        const collected2 = (m2 !== 'deposit') ? amt2 : 0;
        const totalPaid = collected1 + collected2;
        const debt = Math.max(0, total - totalPaid);

        const paidEl = document.getElementById('pos-split-total-paid');
        const remEl = document.getElementById('pos-split-remainder');
        
        if (paidEl) paidEl.innerText = totalPaid.toFixed(2);
        if (remEl) remEl.innerText = debt.toFixed(2);
    },

    renderCart() {
        const tbody = document.getElementById('cart-items');
        tbody.innerHTML = '';
        let total = 0;

        this.cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            tbody.innerHTML += `
                <tr>
                    <td class="text-start" style="font-size: 13px;">${item.name} (${item.unit})</td>
                    <td><input type="number" step="any" class="form-control qty-input d-inline-block" value="${item.qty}" onchange="app.updateCartItem(${item.id}, 'qty', this.value)"></td>
                    <td><input type="number" step="0.01" class="form-control price-input d-inline-block" value="${item.price}" onchange="app.updateCartItem(${item.id}, 'price', this.value)"></td>
                    <td><button class="btn btn-sm btn-danger" onclick="app.removeFromCart(${item.id})"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
        });

        document.getElementById('cart-total').innerText = total.toFixed(2);
        
        if (this.isSplitPayment) {
            this.calculateSplitRemainder();
        } else {
            // Auto set paid amount if cash or card
            const pm = document.getElementById('pos-payment-method').value;
            if(pm !== 'deposit') {
                document.getElementById('pos-paid-amount').value = total.toFixed(2);
            } else {
                document.getElementById('pos-paid-amount').value = 0;
            }
        }
    },

    async submitBill() {
        if(this.cart.length === 0) return alert('الفاتورة فارغة');
        
        let customerId = document.getElementById('pos-customer').value || 1;
        const cust = this.customers.find(c => c.id == customerId);
        const isWalkIn = (!cust || customerId == 1 || cust.name.includes('عابر') || cust.name.includes('عام'));

        let paymentMethod = 'cash';
        let paymentMethod2 = null;
        let paid = 0;
        let paid2 = 0;
        let total = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

        if (this.isSplitPayment) {
            paymentMethod = document.getElementById('pos-split-method-1').value;
            paid = parseFloat(document.getElementById('pos-split-amount-1').value) || 0;
            paymentMethod2 = document.getElementById('pos-split-method-2').value;
            paid2 = parseFloat(document.getElementById('pos-split-amount-2').value) || 0;

            const totalPaid = paid + paid2;
            const remainingDebt = total - totalPaid;

            // If there is an unpaid remainder or any method is deposit, customer cannot be walk-in
            if (remainingDebt > 0 || paymentMethod === 'deposit' || paymentMethod2 === 'deposit') {
                if (isWalkIn || !cust || !cust.phone) {
                    return alert('وجود متبقي آجل (دين) يتطلب تحديد عميل مسجل ولديه رقم هاتف! يرجى اختيار عميل أو إضافته عبر زر (+) الجانبي.');
                }
            }
        } else {
            paymentMethod = document.getElementById('pos-payment-method').value;
            paid = parseFloat(document.getElementById('pos-paid-amount').value) || 0;
            
            if (paymentMethod === 'deposit' || (total - paid) > 0) {
                if (isWalkIn || !cust || !cust.phone) {
                    return alert('البيع الآجل (دين) يتطلب تحديد عميل مسجل ولديه رقم هاتف! يرجى اختيار عميل أو إضافته عبر زر (+) الجانبي.');
                }
            }
        }

        const data = {
            type: 'sale',
            payment_method: paymentMethod,
            payment_method2: paymentMethod2,
            customer_id: customerId,
            cashier_name: document.getElementById('pos-cashier').value || 'كاشير 1',
            total_amount: total,
            paid_amount: paid,
            paid_amount2: paid2,
            items: this.cart.map(i => ({
                product_id: i.id,
                quantity: i.qty,
                unit_price: i.price,
                total_price: i.price * i.qty
            }))
        };

        const res = await this.fetchAPI('api/bills.php', { method: 'POST', body: JSON.stringify(data) });
        if(res.success) {
            this.showToast('تم إصدار الفاتورة بنجاح');
            this.cart = [];
            this.renderCart();
            this.loadProducts(); // Update stock
            this.loadCustomers(); // Update debt if any
            
            // Show the detailed receipt modal for viewing/printing
            if (res.bill_id) {
                this.showReceipt(res.bill_id);
            }
        } else {
            alert(res.error);
        }
    },

    getPaymentMethodInfo(method) {
        switch (method) {
            case 'cash':
                return { name: 'كاش (نقدي)', badge: '<span class="badge bg-success">كاش</span>', badgeClass: 'badge bg-success' };
            case 'card':
                return { name: 'بطاقة (شبكة)', badge: '<span class="badge bg-primary">بطاقة</span>', badgeClass: 'badge bg-primary' };
            case 'jeeb':
                return { name: 'جيب', badge: '<span class="badge text-white" style="background-color: #0284c7;">جيب</span>', badgeClass: 'badge text-white bg-info' };
            case 'onecash':
                return { name: 'ون كاش', badge: '<span class="badge text-white" style="background-color: #d97706;">ون كاش</span>', badgeClass: 'badge text-white bg-warning' };
            case 'haseb':
                return { name: 'حاسب', badge: '<span class="badge text-white" style="background-color: #4b5563;">حاسب</span>', badgeClass: 'badge bg-secondary' };
            case 'kuraimi':
                return { name: 'كريمي', badge: '<span class="badge text-white" style="background-color: #0369a1;">كريمي</span>', badgeClass: 'badge text-white bg-primary' };
            case 'floosak':
                return { name: 'فلوسك', badge: '<span class="badge text-white" style="background-color: #7c3aed;">فلوسك</span>', badgeClass: 'badge text-white bg-purple' };
            case 'deposit':
                return { name: 'آجل (دين)', badge: '<span class="badge bg-danger">آجل (دين)</span>', badgeClass: 'badge bg-danger' };
            default:
                return { name: method || 'كاش', badge: `<span class="badge bg-secondary">${method || 'كاش'}</span>`, badgeClass: 'badge bg-secondary' };
        }
    },

    // --- RECEIPT VIEW & PRINT ---
    async showReceipt(billId) {
        const res = await this.fetchAPI(`api/bills.php?id=${billId}`);
        if (!res || !res.success || !res.bill) {
            return alert(res.error || 'تعذر جلب تفاصيل الفاتورة');
        }

        const b = res.bill;
        const items = res.items || [];

        // Meta info
        document.getElementById('rec-id').innerText = `#${b.id}`;
        
        // Exact Date and Time formatting
        const rawDate = b.created_at || '';
        let formattedDate = rawDate;
        try {
            const dt = new Date(rawDate.replace(' ', 'T'));
            if (!isNaN(dt.getTime())) {
                const datePart = dt.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
                const timePart = dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                formattedDate = `${datePart} - ${timePart}`;
            }
        } catch (e) {
            formattedDate = rawDate;
        }

        document.getElementById('rec-datetime').innerText = formattedDate;
        document.getElementById('rec-cashier').innerText = b.cashier_name || 'كاشير عام';
        document.getElementById('rec-customer').innerText = b.customer_name ? `${b.customer_name} ${b.customer_phone ? ' ('+b.customer_phone+')' : ''}` : 'عميل عابر (نقدي)';

        // Payment Method Badge & Info
        const pmInfo1 = this.getPaymentMethodInfo(b.payment_method);
        const badgeEl = document.getElementById('rec-payment-badge');
        
        const paidAmount1 = parseFloat(b.paid_amount) || 0;
        const paidAmount2 = parseFloat(b.paid_amount2) || 0;
        const isSplit = Boolean(b.payment_method2 && (paidAmount2 > 0 || b.payment_method2 === 'deposit'));

        if (isSplit) {
            const pmInfo2 = this.getPaymentMethodInfo(b.payment_method2);
            badgeEl.className = 'd-inline-flex gap-1 align-items-center flex-wrap';
            badgeEl.innerHTML = `${pmInfo1.badge} <span class="small fw-semibold">(${paidAmount1.toFixed(2)})</span> + ${pmInfo2.badge} <span class="small fw-semibold">(${paidAmount2.toFixed(2)})</span>`;
        } else {
            badgeEl.className = pmInfo1.badgeClass;
            badgeEl.innerText = pmInfo1.name;
        }

        // Items table
        const tbody = document.getElementById('rec-items-body');
        tbody.innerHTML = '';
        items.forEach(item => {
            tbody.innerHTML += `
                <tr>
                    <td class="text-start">${item.product_name || 'صنف'} ${item.product_unit ? '('+item.product_unit+')' : ''}</td>
                    <td>${item.quantity}</td>
                    <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td class="fw-bold">${parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
            `;
        });

        // Totals: compute actual collected cash/electronic money vs debt (deposit)
        const totalAmount = parseFloat(b.total_amount) || 0;
        const collected1 = (b.payment_method !== 'deposit') ? paidAmount1 : 0;
        const collected2 = (b.payment_method2 && b.payment_method2 !== 'deposit') ? paidAmount2 : 0;
        const totalCollectedPaid = collected1 + collected2;
        const debtAmount = Math.max(0, totalAmount - totalCollectedPaid);

        document.getElementById('rec-total').innerText = totalAmount.toFixed(2) + ' ريال';
        
        if (isSplit) {
            const pmInfo2 = this.getPaymentMethodInfo(b.payment_method2);
            let paidBreakdown = [];
            if (collected1 > 0) paidBreakdown.push(`${pmInfo1.name}: ${collected1.toFixed(2)}`);
            if (collected2 > 0) paidBreakdown.push(`${pmInfo2.name}: ${collected2.toFixed(2)}`);
            let breakdownHtml = paidBreakdown.length > 0 ? `<div class="small text-muted fw-normal">${paidBreakdown.join(' | ')}</div>` : '';
            document.getElementById('rec-paid').innerHTML = `${totalCollectedPaid.toFixed(2)} ريال ${breakdownHtml}`;
        } else {
            document.getElementById('rec-paid').innerText = totalCollectedPaid.toFixed(2) + ' ريال';
        }

        const debtEl = document.getElementById('rec-debt');
        debtEl.innerText = (debtAmount > 0 ? debtAmount.toFixed(2) : '0.00') + ' ريال';
        if (debtAmount > 0) {
            debtEl.className = 'text-danger fw-bold fs-6';
        } else {
            debtEl.className = 'text-muted fw-bold';
        }

        const modalEl = document.getElementById('receiptModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    },

    printReceipt() {
        window.print();
    },

    // --- REPORTS ---
    async loadReports() {
        const dateInput = document.getElementById('report-date');
        const date = dateInput ? dateInput.value : '';
        const cashier = document.getElementById('report-cashier') ? encodeURIComponent(document.getElementById('report-cashier').value.trim()) : '';
        const paymentMethod = document.getElementById('report-payment-method') ? document.getElementById('report-payment-method').value : 'all';
        const sort = document.getElementById('report-sort') ? document.getElementById('report-sort').value : 'time_desc';

        const labelEl = document.getElementById('report-filter-label');
        if (labelEl) {
            labelEl.innerText = date ? `المعروض: مبيعات يوم ${date}` : 'المعروض: جميع التواريخ';
        }

        const res = await this.fetchAPI(`api/reports.php?date=${date}&cashier=${cashier}&payment_method=${paymentMethod}&sort=${sort}`);
        
        if(res && res.bills) {
            document.getElementById('rep-total').innerText = parseFloat(res.totals.total_sales || 0).toFixed(2);
            document.getElementById('rep-cash').innerText = parseFloat(res.totals.cash || 0).toFixed(2);
            document.getElementById('rep-card').innerText = parseFloat(res.totals.card || 0).toFixed(2);
            document.getElementById('rep-deposit').innerText = parseFloat(res.totals.deposit || 0).toFixed(2);
            const countEl = document.getElementById('rep-count');
            if (countEl) countEl.innerText = res.totals.count || res.bills.length;
            
            const tbody = document.getElementById('reports-table');
            tbody.innerHTML = '';

            if (res.bills.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">لا توجد مبيعات مسجلة في هذا التاريخ أو حسب شروط البحث</td></tr>`;
                return;
            }

            res.bills.forEach(b => {
                const isSale = b.type === 'sale';
                const totalAmt = parseFloat(b.total_amount) || 0;
                const paidAmt1 = (b.payment_method !== 'deposit') ? (parseFloat(b.paid_amount) || 0) : 0;
                const paidAmt2 = (b.payment_method2 && b.payment_method2 !== 'deposit') ? (parseFloat(b.paid_amount2) || 0) : 0;
                const totalPaid = paidAmt1 + paidAmt2;
                const remaining = Math.max(0, totalAmt - totalPaid);

                // Format exact date and time
                let dateDisplay = b.created_at;
                try {
                    const dt = new Date(b.created_at.replace(' ', 'T'));
                    if (!isNaN(dt.getTime())) {
                        const dateOnly = b.created_at.split(' ')[0];
                        const timeOnly = dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                        dateDisplay = `<div class="fw-bold">${dateOnly}</div><div class="small text-muted">${timeOnly}</div>`;
                    }
                } catch(e) {
                    dateDisplay = b.created_at;
                }

                const pmInfo1 = this.getPaymentMethodInfo(b.payment_method);
                let paymentDisplay = pmInfo1.badge;
                
                if (b.payment_method2 && (parseFloat(b.paid_amount2) > 0 || b.payment_method2 === 'deposit')) {
                    const pmInfo2 = this.getPaymentMethodInfo(b.payment_method2);
                    paymentDisplay = `<div class="d-flex flex-column gap-1 align-items-center">
                        <div>${pmInfo1.badge} <span class="small fw-bold">${parseFloat(b.paid_amount || 0).toFixed(0)}</span></div>
                        <div>${pmInfo2.badge} <span class="small fw-bold">${parseFloat(b.paid_amount2 || 0).toFixed(0)}</span></div>
                    </div>`;
                }

                tbody.innerHTML += `
                    <tr class="${isSale ? '' : 'table-warning'}">
                        <td class="fw-bold">#${b.id}</td>
                        <td>${dateDisplay}</td>
                        <td>${b.cashier_name || 'كاشير عام'}</td>
                        <td>${b.customer_name || 'عميل عابر'}</td>
                        <td>${paymentDisplay}</td>
                        <td class="fw-bold">${totalAmt.toFixed(2)}</td>
                        <td class="text-success fw-bold">${totalPaid.toFixed(2)}</td>
                        <td>${remaining > 0 ? '<span class="badge bg-danger">'+remaining.toFixed(2)+'</span>' : '<span class="text-muted">0.00</span>'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" title="عرض وطباعة الإيصال" onclick="app.showReceipt(${b.id})">
                                <i class="fas fa-file-invoice"></i> عرض الإيصال
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    },

    // --- SELLER REPORTS & EDITING ---
    async loadSellerReports() {
        const res = await this.fetchAPI('api/seller_reports.php');
        if (!res || !res.success) return alert('خطأ في جلب تقارير الموردين');

        // Render Totals
        document.getElementById('sr-total-purchases').innerText = parseFloat(res.totals.total_purchases).toFixed(2);
        document.getElementById('sr-total-payments').innerText = parseFloat(res.totals.total_payments).toFixed(2);
        document.getElementById('sr-total-debt').innerText = parseFloat(res.totals.total_debt).toFixed(2);

        // Render Purchases
        const purchasesTbody = document.getElementById('sr-purchases-table');
        purchasesTbody.innerHTML = '';
        res.purchases.forEach(p => {
            const total = parseFloat(p.quantity) * parseFloat(p.cost_price);
            const debt = Math.max(0, total - parseFloat(p.paid_amount));
            purchasesTbody.innerHTML += `
                <tr>
                    <td class="small" dir="ltr">${p.purchase_date}</td>
                    <td class="fw-bold">${p.product_name}</td>
                    <td>${p.seller_name || '-'}</td>
                    <td>${p.quantity}</td>
                    <td>${p.cost_price}</td>
                    <td class="fw-bold">${total.toFixed(2)}</td>
                    <td class="text-success">${p.paid_amount}</td>
                    <td class="text-danger">${debt > 0 ? debt.toFixed(2) : '-'}</td>
                    <td class="small text-muted">${p.note || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="app.openEditPurchase(${p.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="app.deletePurchase(${p.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        this._currentPurchases = res.purchases; // Cache for editing

        // Render Payments
        const paymentsTbody = document.getElementById('sr-payments-table');
        paymentsTbody.innerHTML = '';
        res.payments.forEach(p => {
            paymentsTbody.innerHTML += `
                <tr>
                    <td class="small" dir="ltr">${p.created_at}</td>
                    <td class="fw-bold">${p.seller_name}</td>
                    <td class="text-success fw-bold">${p.amount}</td>
                    <td class="small text-muted">${p.note || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="app.openEditPayment(${p.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="app.deletePayment(${p.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        this._currentPayments = res.payments;
    },

    openEditPurchase(id) {
        const p = this._currentPurchases.find(x => x.id == id);
        if(!p) return;
        
        document.getElementById('edit-purchase-id').value = p.id;
        document.getElementById('edit-purchase-qty').value = p.quantity;
        document.getElementById('edit-purchase-cost').value = p.cost_price;
        document.getElementById('edit-purchase-paid').value = p.paid_amount;
        document.getElementById('edit-purchase-date').value = p.purchase_date;
        document.getElementById('edit-purchase-note').value = p.note || '';

        // Populate Products dropdown
        const prodSel = document.getElementById('edit-purchase-product');
        prodSel.innerHTML = this.products.map(pr => `<option value="${pr.id}" ${pr.id == p.product_id ? 'selected' : ''}>${pr.name}</option>`).join('');

        // Populate Sellers dropdown
        const selSel = document.getElementById('edit-purchase-seller');
        selSel.innerHTML = '<option value="">بدون مورد</option>' + this.sellers.map(s => `<option value="${s.id}" ${s.id == p.seller_id ? 'selected' : ''}>${s.name}</option>`).join('');

        new bootstrap.Modal(document.getElementById('editPurchaseModal')).show();
    },

    async submitEditPurchase() {
        const data = {
            id: document.getElementById('edit-purchase-id').value,
            product_id: document.getElementById('edit-purchase-product').value,
            seller_id: document.getElementById('edit-purchase-seller').value,
            quantity: document.getElementById('edit-purchase-qty').value,
            cost_price: document.getElementById('edit-purchase-cost').value,
            paid_amount: document.getElementById('edit-purchase-paid').value,
            purchase_date: document.getElementById('edit-purchase-date').value.replace('T', ' '),
            note: document.getElementById('edit-purchase-note').value
        };

        const res = await this.fetchAPI('api/purchases.php', { method: 'PUT', body: JSON.stringify(data) });
        if (res.success) {
            this.showToast('تم تعديل عملية الشراء بنجاح');
            bootstrap.Modal.getInstance(document.getElementById('editPurchaseModal')).hide();
            this.loadSellerReports();
            this.loadProducts(); // refresh stock
            this.loadSellers(); // refresh debt
        } else {
            alert(res.error);
        }
    },

    async deletePurchase(id) {
        if(!confirm('تحذير: سيتم حذف العملية، وسيتم إرجاع كمية المخزون وديون المورد. هل أنت متأكد؟')) return;
        const res = await this.fetchAPI('api/purchases.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.success) {
            this.showToast('تم حذف عملية الشراء بنجاح');
            this.loadSellerReports();
            this.loadProducts();
            this.loadSellers();
        } else {
            alert(res.error);
        }
    },

    openEditPayment(id) {
        const p = this._currentPayments.find(x => x.id == id);
        if(!p) return;
        
        document.getElementById('edit-payment-id').value = p.id;
        document.getElementById('edit-payment-amount').value = p.amount;
        document.getElementById('edit-payment-note').value = p.note || '';

        const selSel = document.getElementById('edit-payment-seller');
        selSel.innerHTML = this.sellers.map(s => `<option value="${s.id}" ${s.id == p.seller_id ? 'selected' : ''}>${s.name}</option>`).join('');

        new bootstrap.Modal(document.getElementById('editPaymentModal')).show();
    },

    async submitEditPayment() {
        const data = {
            id: document.getElementById('edit-payment-id').value,
            seller_id: document.getElementById('edit-payment-seller').value,
            amount: document.getElementById('edit-payment-amount').value,
            note: document.getElementById('edit-payment-note').value
        };

        const res = await this.fetchAPI('api/seller_payments.php', { method: 'PUT', body: JSON.stringify(data) });
        if (res.success) {
            this.showToast('تم تعديل الدفعة بنجاح');
            bootstrap.Modal.getInstance(document.getElementById('editPaymentModal')).hide();
            this.loadSellerReports();
            this.loadSellers();
        } else {
            alert(res.error);
        }
    },

    async deletePayment(id) {
        if(!confirm('تحذير: سيتم حذف الدفعة وإرجاعها كدين على المورد. هل أنت متأكد؟')) return;
        const res = await this.fetchAPI('api/seller_payments.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.success) {
            this.showToast('تم حذف الدفعة بنجاح');
            this.loadSellerReports();
            this.loadSellers();
        } else {
            alert(res.error);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.app = app;
    window.toggleTheme = () => app.toggleTheme();
    app.init();
    
    // Auto update paid amount when payment method changes
    const singlePm = document.getElementById('pos-payment-method');
    if (singlePm) {
        singlePm.addEventListener('change', () => {
            app.renderCart(); 
        });
    }
});

// Also expose globally immediately
window.app = app;
window.toggleTheme = () => app.toggleTheme();
