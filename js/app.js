const app = {
    cart: [],
    products: [],
    categories: [],
    customers: [],

    init() {
        this.setupNavigation();
        this.loadCategories();
        this.loadProducts();
        this.loadCustomers();
        this.setupPOSSearch();
        this.setupInventorySearch();
        
        // Default dates for reports
        document.getElementById('report-date').valueAsDate = new Date();
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
            });
        });
    },

    showToast(message) {
        document.getElementById('toast-body-text').innerText = message;
        const toast = new bootstrap.Toast(document.getElementById('liveToast'));
        toast.show();
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
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="app.updateProductQuick(${p.id})">حفظ</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
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
    async loadCustomers() {
        this.customers = await this.fetchAPI('api/customers.php');
        this.renderCustomers();
    },

    renderCustomers() {
        const tbody = document.getElementById('customers-table');
        const posSelect = document.getElementById('pos-customer');
        const paySelect = document.getElementById('payment-customer');
        
        tbody.innerHTML = '';
        posSelect.innerHTML = '';
        paySelect.innerHTML = '<option value="">اختر العميل</option>';
        
        this.customers.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.phone || '-'}</td>
                    <td class="${c.total_debt > 0 ? 'text-danger font-weight-bold' : ''}">${c.total_debt}</td>
                </tr>
            `;
            posSelect.innerHTML += `<option value="${c.id}">${c.name} ${c.phone ? ' - '+c.phone : ''} ${c.total_debt > 0 ? '(مدين)' : ''}</option>`;
            if (c.id != 1) paySelect.innerHTML += `<option value="${c.id}">${c.name} (الدين: ${c.total_debt})</option>`;
        });

        // Initialize Select2 if available
        if (window.jQuery && $.fn.select2) {
            $('#pos-customer').select2({
                dir: "rtl",
                width: '100%'
            });
        }
    },

    async quickAddCustomer() {
        const name = document.getElementById('quick-cust-name').value;
        const phone = document.getElementById('quick-cust-phone').value;
        if(!name || !phone) return alert('الاسم ورقم الهاتف مطلوبان');
        
        const res = await this.fetchAPI('api/customers.php', { method: 'POST', body: JSON.stringify({ name, phone }) });
        if(res.success) {
            this.showToast('تمت الإضافة');
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
            this.showToast('تمت الإضافة');
            document.getElementById('cust-name').value = '';
            document.getElementById('cust-phone').value = '';
            this.loadCustomers();
        } else alert(res.error);
    },

    async makePayment() {
        const customer_id = document.getElementById('payment-customer').value;
        const amount = document.getElementById('payment-amount').value;
        
        if(!customer_id || !amount) return alert('الرجاء تعبئة البيانات');
        
        const res = await this.fetchAPI('api/payments.php', { method: 'POST', body: JSON.stringify({ customer_id, amount }) });
        if(res.success) {
            this.showToast('تم السداد بنجاح');
            document.getElementById('payment-amount').value = '';
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
        
        // Auto set paid amount if cash or card
        const pm = document.getElementById('pos-payment-method').value;
        if(pm !== 'deposit') {
            document.getElementById('pos-paid-amount').value = total.toFixed(2);
        } else {
            document.getElementById('pos-paid-amount').value = 0;
        }
    },

    async submitBill() {
        if(this.cart.length === 0) return alert('الفاتورة فارغة');
        
        const paymentMethod = document.getElementById('pos-payment-method').value;
        const customerId = document.getElementById('pos-customer').value;

        // Customer Validation: Must have a valid customer with a phone number
        const cust = this.customers.find(c => c.id == customerId);
        if (!cust || !cust.phone || customerId == 1 || cust.name.includes('عام')) {
            return alert('لا يمكن تسجيل الفاتورة. يرجى اختيار عميل مسجل برقم هاتف، أو إضافة عميل جديد باستخدام الزر الجانبي.');
        }

        let total = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        let paid = parseFloat(document.getElementById('pos-paid-amount').value) || 0;
        
        const data = {
            type: 'sale',
            payment_method: paymentMethod,
            customer_id: customerId,
            cashier_name: document.getElementById('pos-cashier').value,
            total_amount: total,
            paid_amount: paid,
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
        } else {
            alert(res.error);
        }
    },

    // --- REPORTS ---
    async loadReports() {
        const date = document.getElementById('report-date').value;
        const cashier = document.getElementById('report-cashier').value;
        
        const res = await this.fetchAPI(`api/reports.php?date=${date}&cashier=${cashier}`);
        
        if(res.bills) {
            document.getElementById('rep-total').innerText = res.totals.total_sales;
            document.getElementById('rep-cash').innerText = res.totals.cash;
            document.getElementById('rep-card').innerText = res.totals.card;
            document.getElementById('rep-deposit').innerText = res.totals.deposit;
            
            const tbody = document.getElementById('reports-table');
            tbody.innerHTML = '';
            res.bills.forEach(b => {
                const isSale = b.type === 'sale';
                tbody.innerHTML += `
                    <tr class="${isSale ? '' : 'table-warning'}">
                        <td>${b.id}</td>
                        <td>${b.created_at.split(' ')[1]}</td>
                        <td>${b.cashier_name}</td>
                        <td>${b.customer_name || 'عام'}</td>
                        <td>
                            ${b.payment_method == 'cash' ? 'كاش' : ''}
                            ${b.payment_method == 'card' ? 'بطاقة' : ''}
                            ${b.payment_method == 'deposit' ? 'آجل' : ''}
                        </td>
                        <td>${b.total_amount}</td>
                        <td>${b.paid_amount}</td>
                    </tr>
                `;
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
    
    // Auto update paid amount when payment method changes
    document.getElementById('pos-payment-method').addEventListener('change', (e) => {
        app.renderCart(); 
    });
});
