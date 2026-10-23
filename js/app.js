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
                if(e.currentTarget.dataset.target === 'inventory-section') {
                    this.renderInventoryTable();
                    this.loadLiquidSummary();
                }
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
            if (!res.ok) {
                const text = await res.text();
                console.error(`HTTP Error ${res.status} when fetching ${url}:`, text);
                return { success: false, error: `HTTP ${res.status} Error` };
            }
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
        this.buildPOSProducts();
        this.renderProductsTable();
        this.renderPOSProducts();
        this.renderInventoryTable();
        this.loadLiquidSummary();
    },

    buildPOSProducts() {
        this.posProducts = [];
        this.products.forEach(p => {
            // Base unit
            this.posProducts.push({
                ...p,
                pos_id: p.id + '_base',
                display_name: p.name,
                sell_price: parseFloat(p.price),
                sell_unit: p.unit,
                sell_barcode: p.serial_number,
                sell_qty_multiplier: 1
            });
            // Bulk unit
            if (p.bulk_unit_name && parseFloat(p.bulk_qty) > 0) {
                this.posProducts.push({
                    ...p,
                    pos_id: p.id + '_bulk',
                    display_name: p.name + ' (' + p.bulk_unit_name + ')',
                    sell_price: parseFloat(p.bulk_price) || (parseFloat(p.price) * parseFloat(p.bulk_qty)),
                    sell_unit: p.bulk_unit_name,
                    sell_barcode: p.bulk_barcode,
                    sell_qty_multiplier: parseFloat(p.bulk_qty)
                });
            }
            // Liquid units
            if (p.is_liquid == 1) {
                // Bottle
                if (parseFloat(p.ml_per_bottle) > 0) {
                    this.posProducts.push({
                        ...p,
                        pos_id: p.id + '_bottle',
                        display_name: p.name + ' (عبوة)',
                        sell_price: parseFloat(p.bottle_price) || (parseFloat(p.price) * parseFloat(p.ml_per_bottle)),
                        sell_unit: 'عبوة',
                        sell_barcode: p.bottle_barcode,
                        sell_qty_multiplier: parseFloat(p.ml_per_bottle)
                    });
                }
                // Box
                if (parseFloat(p.bottles_per_box) > 0 && parseFloat(p.ml_per_bottle) > 0) {
                    this.posProducts.push({
                        ...p,
                        pos_id: p.id + '_liquidbox',
                        display_name: p.name + ' (كرتون)',
                        sell_price: parseFloat(p.box_price_liquid) || ((parseFloat(p.bottle_price) || (parseFloat(p.price) * parseFloat(p.ml_per_bottle))) * parseFloat(p.bottles_per_box)),
                        sell_unit: 'كرتون',
                        sell_barcode: p.box_barcode_liquid,
                        sell_qty_multiplier: parseFloat(p.ml_per_bottle) * parseFloat(p.bottles_per_box)
                    });
                }
            }
        });
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
        let isLiquid = 0;
        let liquidSection = document.getElementById('liquid-tracking-section');
        if (liquidSection && liquidSection.classList.contains('show')) {
            isLiquid = 1;
        }

        let unitVal = document.getElementById('prod-unit-select').value;
        if (unitVal === 'other') {
            unitVal = document.getElementById('prod-unit-other').value || 'قطعة';
        }

        const data = {
            name: document.getElementById('prod-name').value,
            serial_number: document.getElementById('prod-serial').value,
            category_id: document.getElementById('prod-category').value,
            unit: isLiquid ? 'مل' : unitVal,
            price: isLiquid ? document.getElementById('prod-liquid-ml-price').value : document.getElementById('prod-price').value,
            stock_quantity: document.getElementById('prod-stock').value,
            location: document.getElementById('prod-location').value,
            seller_id: document.getElementById('prod-seller') ? document.getElementById('prod-seller').value : '',
            cost_price: document.getElementById('prod-cost-price') ? document.getElementById('prod-cost-price').value : '',
            paid_amount: document.getElementById('prod-paid-amount') ? document.getElementById('prod-paid-amount').value : '',
            note: document.getElementById('prod-purchase-note') ? document.getElementById('prod-purchase-note').value : '',
            purchase_date: document.getElementById('prod-purchase-date') ? document.getElementById('prod-purchase-date').value : '',
            bulk_unit_name: document.getElementById('prod-bulk-name') ? document.getElementById('prod-bulk-name').value : '',
            bulk_qty: document.getElementById('prod-bulk-qty') ? document.getElementById('prod-bulk-qty').value : '',
            bulk_barcode: document.getElementById('prod-bulk-barcode') ? document.getElementById('prod-bulk-barcode').value : '',
            bulk_price: document.getElementById('prod-bulk-price') ? document.getElementById('prod-bulk-price').value : '',
            is_liquid: isLiquid,
            ml_per_bottle: document.getElementById('prod-liquid-ml') ? document.getElementById('prod-liquid-ml').value : '',
            bottle_price: document.getElementById('prod-liquid-bottle-price') ? document.getElementById('prod-liquid-bottle-price').value : '',
            bottle_barcode: document.getElementById('prod-liquid-bottle-barcode') ? document.getElementById('prod-liquid-bottle-barcode').value : '',
            bottles_per_box: document.getElementById('prod-liquid-box-qty') ? document.getElementById('prod-liquid-box-qty').value : '',
            box_price_liquid: document.getElementById('prod-liquid-box-price') ? document.getElementById('prod-liquid-box-price').value : '',
            box_barcode_liquid: document.getElementById('prod-liquid-box-barcode') ? document.getElementById('prod-liquid-box-barcode').value : ''
        };
        
        if (isLiquid) {
            data.stock_quantity = (parseFloat(data.stock_quantity) || 0) * (parseFloat(data.ml_per_bottle) || 1);

            // Price per ML is optional: derive it from the bottle price and capacity when left blank
            if (!data.price) {
                const bottlePrice = parseFloat(data.bottle_price);
                const mlPerBottle = parseFloat(data.ml_per_bottle);
                if (bottlePrice > 0 && mlPerBottle > 0) {
                    data.price = (bottlePrice / mlPerBottle).toFixed(4);
                } else if (data.name) {
                    return alert('للمنتج السائل: أدخل سعر الزجاجة وسعتها (مل) أو سعر المل');
                }
            }
        }
        
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
            if (document.getElementById('prod-bulk-name')) document.getElementById('prod-bulk-name').value = '';
            if (document.getElementById('prod-bulk-qty')) document.getElementById('prod-bulk-qty').value = '';
            if (document.getElementById('prod-bulk-barcode')) document.getElementById('prod-bulk-barcode').value = '';
            if (document.getElementById('prod-bulk-price')) document.getElementById('prod-bulk-price').value = '';
            
            if (document.getElementById('prod-liquid-ml')) document.getElementById('prod-liquid-ml').value = '';
            if (document.getElementById('prod-liquid-bottle-price')) document.getElementById('prod-liquid-bottle-price').value = '';
            if (document.getElementById('prod-liquid-bottle-barcode')) document.getElementById('prod-liquid-bottle-barcode').value = '';
            if (document.getElementById('prod-liquid-ml-price')) document.getElementById('prod-liquid-ml-price').value = '';
            if (document.getElementById('prod-liquid-box-qty')) document.getElementById('prod-liquid-box-qty').value = '';
            if (document.getElementById('prod-liquid-box-price')) document.getElementById('prod-liquid-box-price').value = '';
            if (document.getElementById('prod-liquid-box-barcode')) document.getElementById('prod-liquid-box-barcode').value = '';

            this.loadProducts();
        } else alert(res.error);
    },

    async updateProductQuick(id) {
        const price = document.getElementById(`list_price_${id}`).value;
        const stock = document.getElementById(`list_stock_${id}`).value;
        
        if (parseFloat(price) < 0 || parseFloat(stock) < 0) return alert('القيم لا يمكن أن تكون بالسالب');

        const res = await this.fetchAPI('api/products.php', { method: 'POST', body: JSON.stringify({ action: 'update_price_stock', id, price, stock }) });
        
        if(res.success) {
            this.showToast('تم تحديث البيانات بنجاح');
            this.loadProducts();
            
            this.cart.forEach(item => {
                if(item.id == id) item.price = parseFloat(price);
            });
            this.renderCart();
        } else {
            alert(res.error || 'حدث خطأ أثناء التحديث');
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

    // Handles the "إضافة مورد جديد" modal form in the Suppliers section
    async submitNewSeller(event) {
        event.preventDefault();
        const form = document.getElementById('add-seller-form');
        const nameInput = document.getElementById('add-seller-name');
        const phoneInput = document.getElementById('add-seller-phone');
        const submitBtn = document.getElementById('add-seller-submit');

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!name) {
            nameInput.classList.add('is-invalid');
            nameInput.focus();
            return;
        }
        nameInput.classList.remove('is-invalid');

        submitBtn.disabled = true;
        try {
            const res = await this.fetchAPI('api/sellers.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone })
            });

            if (res && res.success) {
                const modalEl = document.getElementById('addSellerModal');
                (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).hide();
                form.reset();
                this.showToast(`تم إضافة المورد "${name}" بنجاح`);
                await this.loadSellers(); // refreshes all supplier dropdowns & the sellers list
            } else {
                alert((res && res.error) || 'تعذر إضافة المورد');
            }
        } finally {
            submitBtn.disabled = false;
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
        const id   = document.getElementById('pay-seller-id').value;
        const amount = document.getElementById('pay-seller-amount').value;
        const note = document.getElementById('pay-seller-note').value;

        if (!amount || parseFloat(amount) <= 0) return alert('\u0623\u062f\u062e\u0644 \u0645\u0628\u0644\u063a\u0627\u064b \u0635\u062d\u064a\u062d\u0627\u064b');

        const res = await this.fetchAPI('api/seller_payments.php', {
            method: 'POST',
            body: JSON.stringify({ seller_id: id, amount: parseFloat(amount), note })
        });

        if (res.success) {
            this.showToast('\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0633\u062f\u0627\u062f \u0627\u0644\u0645\u0648\u0631\u062f \u0628\u0646\u062c\u0627\u062d');
            bootstrap.Modal.getInstance(document.getElementById('paySellerModal')).hide();
            await this.loadSellers(); // refresh sidebar + dropdowns
            this.loadSellerReports(); // refresh global logs

            // If the statement modal is still open, re-render it with fresh data
            const stmtModal = document.getElementById('accountStatementModal');
            if (stmtModal && stmtModal.classList.contains('show') && this._stmtSellerId) {
                this.openAccountStatement(this._stmtSellerId, this._stmtSellerName);
            }
            // Refresh balances table if that tab is visible
            const balancesTbody = document.getElementById('supplier-balances-table');
            if (balancesTbody) this.loadSellerBalances();
        } else {
            alert(res.error);
        }
    },

    // ── SUPPLIER BALANCES TAB ─────────────────────────────────────────────────
    async loadSellerBalances() {
        const tbody = document.getElementById('supplier-balances-table');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin"></i></td></tr>';

        const res = await this.fetchAPI('api/seller_reports.php?action=balances');
        if (!res || !res.success) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">\u062e\u0637\u0623 \u0641\u064a \u062c\u0644\u0628 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646</td></tr>';
            return;
        }
        if (!res.sellers || res.sellers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0648\u0631\u062f\u0648\u0646 \u0645\u0633\u062c\u0644\u0648\u0646</td></tr>';
            return;
        }

        const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

        tbody.innerHTML = res.sellers.map((s, i) => {
            const debt = parseFloat(s.total_debt || 0);
            const hasDebt = debt > 0;
            return `
                <tr>
                    <td class="text-muted small">${i + 1}</td>
                    <td class="fw-bold text-start">${esc(s.name)}</td>
                    <td class="text-muted">${esc(s.phone || '-')}</td>
                    <td class="fw-bold ${hasDebt ? 'text-danger' : 'text-success'} fs-6">
                        ${hasDebt ? '<i class="fas fa-exclamation-circle me-1"></i>' : '<i class="fas fa-check-circle me-1"></i>'}
                        ${fmt(debt)}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-dark me-1"
                                onclick="app.openAccountStatement(${s.id}, '${esc(s.name).replace(/'/g, "\\'")}')"
                                title="\u0643\u0634\u0641 \u062d\u0633\u0627\u0628">
                            <i class="fas fa-file-invoice"></i> \u0643\u0634\u0641 \u062d\u0633\u0627\u0628
                        </button>
                        ${hasDebt ? `<button class="btn btn-sm btn-danger"
                                onclick="app.openPaySellerModal(${s.id}, '${esc(s.name).replace(/'/g, "\\'")}',${ debt })"
                                title="\u062a\u0633\u062f\u064a\u062f \u062f\u0641\u0639\u0629">
                            <i class="fas fa-hand-holding-usd"></i> \u062a\u0633\u062f\u064a\u062f
                        </button>` : ''}
                    </td>
                </tr>`;
        }).join('');
    },

    // ── ACCOUNT STATEMENT MODAL ────────────────────────────────────────────────
    async openAccountStatement(sellerId, sellerName) {
        // Cache for refresh-after-payment
        this._stmtSellerId   = sellerId;
        this._stmtSellerName = sellerName;

        document.getElementById('stmt-seller-name').textContent  = sellerName;
        document.getElementById('stmt-seller-phone').textContent = '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...';
        document.getElementById('stmt-seller-debt').textContent  = '';
        document.getElementById('stmt-rows').innerHTML           =
            '<tr><td colspan="9" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></td></tr>';

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('accountStatementModal'));
        modal.show();

        const res = await this.fetchAPI(`api/seller_reports.php?action=account_statement&seller_id=${sellerId}`);
        if (!res || !res.success) {
            document.getElementById('stmt-rows').innerHTML =
                `<tr><td colspan="9" class="text-center text-danger py-3">${res?.error || '\u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639'}</td></tr>`;
            return;
        }

        const fmt  = n => n != null ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
        const esc  = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const debt = parseFloat(res.seller?.total_debt || 0);

        document.getElementById('stmt-seller-phone').textContent = res.seller?.phone || '-';
        const debtEl = document.getElementById('stmt-seller-debt');
        debtEl.textContent  = fmt(debt);
        debtEl.className    = 'fs-5 fw-bold ' + (debt > 0 ? 'text-danger' : 'text-success');

        // Wire the pay button inside the modal
        document.getElementById('stmt-pay-btn').style.display = debt > 0 ? '' : 'none';

        if (!res.rows || res.rows.length === 0) {
            document.getElementById('stmt-rows').innerHTML =
                '<tr><td colspan="9" class="text-center text-muted py-4">\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0645\u0644\u064a\u0627\u062a \u0645\u0633\u062c\u0644\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0631\u062f</td></tr>';
            return;
        }

        // Compute running balance chronologically
        let runningDebt = 0;
        const rows = res.rows.map(r => {
            let rowHtml = '';
            if (r.tx_type === 'purchase') {
                const totalCost = parseFloat(r.total_cost || 0);
                const paidNow   = parseFloat(r.paid_amount || 0);
                const txDebt    = parseFloat(r.debt_amount || 0);
                runningDebt    += txDebt;
                rowHtml = `
                    <tr class="table-warning">
                        <td class="small" dir="ltr">${esc(r.tx_date || '-')}</td>
                        <td><span class="badge bg-warning text-dark"><i class="fas fa-shopping-bag"></i> \u0634\u0631\u0627\u0621</span></td>
                        <td class="fw-bold text-start">${esc(r.product_name || '-')}</td>
                        <td>${fmt(r.quantity)}</td>
                        <td>${fmt(r.cost_price)}</td>
                        <td class="fw-bold">${fmt(totalCost)}</td>
                        <td class="text-success">${fmt(paidNow)}</td>
                        <td class="${runningDebt > 0 ? 'text-danger fw-bold' : 'text-success'}">${fmt(runningDebt)}</td>
                        <td class="small text-muted">${esc(r.note || '')}</td>
                    </tr>`;
            } else {
                const paid = parseFloat(r.paid_amount || 0);
                runningDebt = Math.max(0, runningDebt - paid);
                rowHtml = `
                    <tr class="table-success">
                        <td class="small" dir="ltr">${esc(r.tx_date || '-')}</td>
                        <td><span class="badge bg-success"><i class="fas fa-money-bill-wave"></i> \u0633\u062f\u0627\u062f</span></td>
                        <td colspan="4" class="text-start text-muted">\u062f\u0641\u0639\u0629 \u0633\u062f\u0627\u062f \u0644\u0644\u0645\u0648\u0631\u062f</td>
                        <td class="text-success fw-bold">${fmt(paid)}</td>
                        <td class="${runningDebt > 0 ? 'text-danger fw-bold' : 'text-success'}">${fmt(runningDebt)}</td>
                        <td class="small text-muted">${esc(r.note || '')}</td>
                    </tr>`;
            }
            return rowHtml;
        });
        document.getElementById('stmt-rows').innerHTML = rows.join('');
    },

    // Called from inside the account statement modal footer
    openPaySellerFromStatement() {
        if (!this._stmtSellerId) return;
        const seller = this.sellers.find(s => s.id == this._stmtSellerId);
        const debt   = seller ? parseFloat(seller.total_debt || 0) : 0;
        this.openPaySellerModal(this._stmtSellerId, this._stmtSellerName, debt);
    },

    // --- INVENTORY / STORAGE ---
    // Renders one cyan counter card per liquid product (is_liquid = 1)
    async loadLiquidSummary() {
        const container = document.getElementById('liquid-summary-cards');
        if (!container) return;

        const data = await this.fetchAPI('api/products.php?action=liquid_summary');
        if (!Array.isArray(data)) {
            container.innerHTML = '';
            return;
        }

        if (data.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info mb-0"><i class="fas fa-tint me-2"></i>لا توجد منتجات سائلة مسجلة.</div>
                </div>`;
            return;
        }

        const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const fmt = (n) => Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2});

        container.innerHTML = data.map(item => {
            let bottleInfo = '';
            if (item.bottles !== null && item.ml_per_bottle > 0) {
                bottleInfo = `${item.bottles} علبة` + (item.loose_ml > 0 ? ` و ${fmt(item.loose_ml)} مل` : '');
            }
            return `
                <div class="col-xl-3 col-lg-4 col-md-6 col-12">
                    <div class="card text-white bg-info shadow-sm h-100" style="background-color: var(--bs-info) !important;">
                        <div class="card-body">
                            <h6 class="card-title fw-bold text-white text-truncate mb-2" title="${esc(item.name)}">${esc(item.name)}</h6>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-tint fa-2x me-3"></i>
                                <div>
                                    <h3 class="mb-0 fw-bold text-white">${fmt(item.total_ml)} <small class="fs-6">مل</small></h3>
                                    ${bottleInfo ? `<small class="text-white-50">${bottleInfo}</small>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    },

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
            
            let stockDisplay = p.stock_quantity;
            if (p.is_liquid == 1 && parseFloat(p.ml_per_bottle) > 0) {
                const totalMl = parseFloat(p.stock_quantity) || 0;
                const capacity = parseFloat(p.ml_per_bottle);
                const bottles = Math.floor(totalMl / capacity);
                const loose = totalMl % capacity;
                if (loose > 0) {
                    stockDisplay = `${bottles} علبة و ${loose.toFixed(1)} مل<br><small>(${totalMl} مل)</small>`;
                } else {
                    stockDisplay = `${bottles} علبة<br><small>(${totalMl} مل)</small>`;
                }
            } else if (p.is_liquid == 1) {
                stockDisplay = `${p.stock_quantity} مل`;
            }
            
            tbody.innerHTML += `
                <tr class="${isLowStock ? 'table-danger' : ''}">
                    <td>${p.serial_number || '-'}</td>
                    <td class="fw-bold">${p.name}</td>
                    <td>${p.category_name || '-'}</td>
                    <td>${p.unit}</td>
                    <td><input type="text" class="form-control form-control-sm text-center" id="inv_loc_${p.id}" value="${p.storage_location || ''}" placeholder="مكان التخزين"></td>
                    <td>
                        <span class="badge ${isLowStock ? 'bg-danger' : 'bg-success'} fs-6" style="line-height: 1.5;">
                            ${stockDisplay}
                        </span>
                    </td>
                    <td>
                        <div class="input-group input-group-sm w-75 mx-auto mb-1">
                            <input type="number" class="form-control text-center" id="stock_${p.id}" value="${p.stock_quantity}" min="0" step="any">
                            <button class="btn btn-primary" onclick="app.updateStock(${p.id})">حفظ</button>
                        </div>
                        <button class="btn btn-sm btn-outline-info w-75" onclick="app.showProductPurchases(${p.id})">
                            <i class="fas fa-history"></i> سجل المشتريات
                        </button>
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
                if (window.jQuery) {
                    $('#pos-customer').val(res.id).trigger('change');
                } else {
                    const sel = document.getElementById('pos-customer');
                    if (sel) { sel.value = res.id; sel.dispatchEvent(new Event('change', { bubbles: true })); }
                }
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
        
        const filtered = this.posProducts.filter(p => 
            p.display_name.toLowerCase().includes(searchTerm) || 
            (p.sell_barcode && p.sell_barcode.includes(searchTerm))
        );

        filtered.forEach(p => {
            grid.innerHTML += `
                <div class="col">
                    <div class="card product-card h-100" onclick="app.addToCart('${p.pos_id}')">
                        <div class="card-body d-flex flex-column justify-content-center">
                            <div class="product-title">${p.display_name}</div>
                            <div class="product-unit">${p.sell_unit}</div>
                            <div class="product-price">${p.sell_price.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            `;
        });
    },

    addToCart(posId) {
        const product = this.posProducts.find(p => p.pos_id == posId);
        if (!product) return;

        const stock = parseFloat(product.stock_quantity) || 0;
        const existing = this.cart.find(i => i.pos_id == posId);
        const currentQty = existing ? existing.qty : 0;
        const multiplier = product.sell_qty_multiplier;
        
        if ((currentQty + 1) * multiplier > stock) {
            return alert(`عذراً، الكمية المتوفرة في المخزون لا تكفي! المتاح: ${stock}`);
        }

        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({
                id: product.id,
                pos_id: product.pos_id,
                name: product.display_name,
                unit: product.sell_unit,
                price: parseFloat(product.sell_price),
                qty: 1,
                unit_multiplier: multiplier
            });
        }
        this.renderCart();
    },

    updateCartItem(posId, field, value) {
        const item = this.cart.find(i => i.pos_id == posId);
        if(item) {
            if (field === 'qty') {
                const product = this.posProducts.find(p => p.pos_id == posId);
                const stock = parseFloat(product.stock_quantity) || 0;
                let newQty = parseFloat(value);
                if (!isFinite(newQty) || newQty <= 0) {
                    // Zero, negative or non-numeric quantity: drop the line instead of keeping an invalid one
                    if (isFinite(newQty) && newQty < 0) alert('لا يمكن أن تكون الكمية بالسالب');
                    this.removeFromCart(posId);
                    return;
                }
                if (newQty * item.unit_multiplier > stock) {
                    const maxAllowed = Math.floor(stock / item.unit_multiplier);
                    alert(`عذراً، الكمية المتوفرة في المخزون تكفي لـ ${maxAllowed} ${item.unit} فقط`);
                    newQty = maxAllowed;
                    if (newQty <= 0) {
                        this.removeFromCart(posId);
                        return;
                    }
                }
                item.qty = newQty;
            } else {
                const newPrice = parseFloat(value);
                if (!isFinite(newPrice) || newPrice < 0) {
                    alert('لا يمكن أن يكون السعر بالسالب');
                } else {
                    item[field] = newPrice;
                }
            }
            this.renderCart();
        }
    },

    removeFromCart(posId) {
        this.cart = this.cart.filter(i => i.pos_id != posId);
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
                    <td class="text-start" style="font-size: 13px;">${item.name}</td>
                    <td><input type="number" step="any" class="form-control qty-input d-inline-block" value="${item.qty}" onchange="app.updateCartItem('${item.pos_id}', 'qty', this.value)"></td>
                    <td><input type="number" step="0.01" class="form-control price-input d-inline-block" value="${item.price}" onchange="app.updateCartItem('${item.pos_id}', 'price', this.value)"></td>
                    <td><button class="btn btn-sm btn-danger" onclick="app.removeFromCart('${item.pos_id}')"><i class="fas fa-times"></i></button></td>
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
                total_price: i.price * i.qty,
                unit_multiplier: i.unit_multiplier
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
        const purchasesTbody = document.getElementById('sr-purchases-table');
        const paymentsTbody  = document.getElementById('sr-payments-table');
        const emptyRow = (cols, msg, cls = 'text-muted') =>
            `<tr><td colspan="${cols}" class="text-center ${cls} py-4"><i class="fas fa-inbox me-1"></i>${msg}</td></tr>`;

        if (!res || !res.success) {
            const msg = 'تعذر جلب تقارير الموردين' + (res?.error ? ': ' + res.error : '');
            if (purchasesTbody) purchasesTbody.innerHTML = emptyRow(10, msg, 'text-danger');
            if (paymentsTbody)  paymentsTbody.innerHTML  = emptyRow(5, msg, 'text-danger');
            return;
        }
        if (res.error_msg) console.warn('[SellerReports]', res.error_msg);

        const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
        const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const totals    = res.totals || {};
        const purchases = Array.isArray(res.purchases) ? res.purchases : [];
        const payments  = Array.isArray(res.payments)  ? res.payments  : [];

        // Render Totals
        document.getElementById('sr-total-purchases').innerText = num(totals.total_purchases).toFixed(2);
        document.getElementById('sr-total-payments').innerText  = num(totals.total_payments).toFixed(2);
        document.getElementById('sr-total-debt').innerText      = num(totals.total_debt).toFixed(2);

        // Render Purchases
        if (purchasesTbody) {
            purchasesTbody.innerHTML = purchases.length === 0
                ? emptyRow(10, 'لا توجد عمليات شراء مسجلة')
                : purchases.map(p => {
                    const total = num(p.quantity) * num(p.cost_price);
                    const debt  = Math.max(0, total - num(p.paid_amount));
                    return `
                <tr>
                    <td class="small" dir="ltr">${esc(p.purchase_date || '-')}</td>
                    <td class="fw-bold">${esc(p.product_name || 'منتج محذوف')}</td>
                    <td>${esc(p.seller_name || '-')}</td>
                    <td>${num(p.quantity)}</td>
                    <td>${num(p.cost_price).toFixed(2)}</td>
                    <td class="fw-bold">${total.toFixed(2)}</td>
                    <td class="text-success">${num(p.paid_amount).toFixed(2)}</td>
                    <td class="text-danger">${debt > 0 ? debt.toFixed(2) : '-'}</td>
                    <td class="small text-muted">${esc(p.note)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="app.openEditPurchase(${p.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="app.deletePurchase(${p.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
                }).join('');
        }
        this._currentPurchases = purchases; // Cache for editing

        // Render Payments
        if (paymentsTbody) {
            paymentsTbody.innerHTML = payments.length === 0
                ? emptyRow(5, 'لا توجد دفعات سداد مسجلة')
                : payments.map(p => `
                <tr>
                    <td class="small" dir="ltr">${esc(p.payment_date || p.created_at || '-')}</td>
                    <td class="fw-bold">${esc(p.seller_name || '-')}</td>
                    <td class="text-success fw-bold">${num(p.amount).toFixed(2)}</td>
                    <td class="small text-muted">${esc(p.note)}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="app.openEditPayment(${p.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="app.deletePayment(${p.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`).join('');
        }
        this._currentPayments = payments;
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
            this.renderInventoryTable();
            
            // If viewing specific product history, refresh it
            const modalEl = document.getElementById('productPurchasesModal');
            if (modalEl && modalEl.classList.contains('show')) {
                this.showProductPurchases(data.product_id);
            }
        } else {
            alert(res.error);
        }
    },

    async deletePurchase(id) {
        if(!confirm('تحذير: سيتم حذف العملية، وسيتم إرجاع كمية المخزون وديون المورد. هل أنت متأكد؟')) return;
        const p = this._currentPurchases.find(x => x.id == id);
        const res = await this.fetchAPI('api/purchases.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.success) {
            this.showToast('تم حذف عملية الشراء بنجاح');
            this.loadSellerReports();
            this.loadProducts();
            this.loadSellers();
            this.renderInventoryTable();

            // If viewing specific product history, refresh it
            const modalEl = document.getElementById('productPurchasesModal');
            if (modalEl && modalEl.classList.contains('show') && p) {
                this.showProductPurchases(p.product_id);
            }
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
    },

    async showProductPurchases(productId) {
        const product = this.products.find(p => p.id == productId);
        if(!product) return;
        
        document.getElementById('pp-modal-title').innerText = product.name;
        const tbody = document.getElementById('pp-table-body');
        tbody.innerHTML = '<tr><td colspan="9">جاري التحميل...</td></tr>';
        
        new bootstrap.Modal(document.getElementById('productPurchasesModal')).show();

        // Fetch reports if not loaded
        let res = { success: true, purchases: this._currentPurchases };
        if (!this._currentPurchases) {
            res = await this.fetchAPI('api/seller_reports.php');
            if (res && res.success) {
                this._currentPurchases = res.purchases;
            }
        }
        
        if (!res || !res.success) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-danger">فشل تحميل السجل</td></tr>';
            return;
        }

        const productPurchases = res.purchases.filter(p => p.product_id == productId);
        tbody.innerHTML = '';
        
        if (productPurchases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-muted">لا يوجد سجل مشتريات لهذا المنتج.</td></tr>';
            return;
        }

        productPurchases.forEach(p => {
            const total = parseFloat(p.quantity) * parseFloat(p.cost_price);
            const debt = Math.max(0, total - parseFloat(p.paid_amount));
            tbody.innerHTML += `
                <tr>
                    <td class="small" dir="ltr">${p.purchase_date}</td>
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
    },

    // ── Settings ─────────────────────────────────────────────────────────────
    async loadSettings() {
        try {
            const res = await this.fetchAPI('api/settings.php');
            if (!res.success) return;
            const s = res.settings || {};
            const bi = document.getElementById('setting-backup-interval');
            const kl = document.getElementById('setting-keep-local-days');
            const tt = document.getElementById('setting-telegram-token');
            const tc = document.getElementById('setting-telegram-chat-id');
            if (bi) bi.value = s.backup_interval ?? '43200';
            if (kl) kl.value = s.keep_local_days ?? '14';
            if (tt) tt.value = s.telegram_token ?? '';
            if (tc) tc.value = s.telegram_chat_id ?? '';
        } catch (e) {
            console.error('[Settings] loadSettings error:', e);
        }
    },

    async saveSettings() {
        const btn = document.getElementById('settings-save-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>جاري الحفظ...'; }
        try {
            const payload = {
                backup_interval:  document.getElementById('setting-backup-interval')?.value  ?? '43200',
                keep_local_days:  document.getElementById('setting-keep-local-days')?.value  ?? '14',
                telegram_token:   document.getElementById('setting-telegram-token')?.value   ?? '',
                telegram_chat_id: document.getElementById('setting-telegram-chat-id')?.value ?? '',
            };
            const res = await this.fetchAPI('api/settings.php', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.success) {
                this.showToast('✅ تم حفظ الإعدادات بنجاح');
                const modalEl = document.getElementById('settingsModal');
                if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
            } else {
                alert('خطأ في الحفظ: ' + (res.error || 'غير معروف'));
            }
        } catch (e) {
            alert('خطأ في الاتصال: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i>حفظ الإعدادات'; }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.app = app;
    window.toggleTheme = () => app.toggleTheme();
    app.init();

    // Pre-populate settings form every time the modal opens
    const settingsModalEl = document.getElementById('settingsModal');
    if (settingsModalEl) {
        settingsModalEl.addEventListener('show.bs.modal', () => app.loadSettings());
    }

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
