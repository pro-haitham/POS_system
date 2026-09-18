<?php
require 'db.php';

// Set headers for Excel download
$filename = "تصدير_الإيصالات_والمبيعات_" . date("Y-m-d_H-i") . ".xls";
header("Content-Type: application/vnd.ms-excel; charset=UTF-8");
header("Content-Disposition: attachment; filename=\"$filename\"");
header("Pragma: no-cache");
header("Expires: 0");

// Helper function to escape XML strings
function xmlEscape($str) {
    return htmlspecialchars((string)($str ?? ''), ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

// 1. Fetch Customers & Debts
$stmtCust = $pdo->query("SELECT * FROM customers ORDER BY total_debt DESC, name ASC");
$customers = $stmtCust->fetchAll(PDO::FETCH_ASSOC);

// 2. Fetch Sales & Invoices
$stmtBills = $pdo->query("SELECT b.*, c.name as customer_name, c.phone as customer_phone 
                         FROM bills b 
                         LEFT JOIN customers c ON b.customer_id = c.id 
                         ORDER BY b.created_at DESC, b.id DESC");
$bills = $stmtBills->fetchAll(PDO::FETCH_ASSOC);

// 3. Fetch Debt & Payment Ledger
$stmtPayments = $pdo->query("SELECT p.*, c.name as customer_name, c.phone as customer_phone 
                            FROM payments p 
                            LEFT JOIN customers c ON p.customer_id = c.id 
                            ORDER BY p.created_at DESC, p.id DESC");
$payments = $stmtPayments->fetchAll(PDO::FETCH_ASSOC);

// 4. Fetch Products & Inventory
$stmtProds = $pdo->query("SELECT p.*, c.name as category_name 
                         FROM products p 
                         LEFT JOIN categories c ON p.category_id = c.id 
                         ORDER BY p.id DESC");
$products = $stmtProds->fetchAll(PDO::FETCH_ASSOC);

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<?mso-application progid="Excel.Sheet"?>' . "\n";
?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#1E1E24"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4361EE"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4361EE"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4361EE"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#4361EE"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#FFFFFF" ss:Size="12"/>
   <Interior ss:Color="#2B2D42" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Cell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="11"/>
  </Style>
  <Style ss:ID="CellDebt">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#D90429" ss:Size="11"/>
  </Style>
  <Style ss:ID="CellSuccess">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#2B9348" ss:Size="11"/>
  </Style>
 </Styles>

 <!-- Worksheet 1: Customers and Debts -->
 <Worksheet ss:Name="العملاء والديون الحالية" ss:RightToLeft="1">
  <Table ss:DefaultRowHeight="24">
   <Column ss:Width="60"/>
   <Column ss:Width="180"/>
   <Column ss:Width="130"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Row ss:Height="28">
    <Cell ss:StyleID="Header"><Data ss:Type="String">المعرف (#)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">اسم العميل</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">رقم الهاتف</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">إجمالي الدين الحالي</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">حالة الحساب</Data></Cell>
   </Row>
   <?php foreach ($customers as $c): 
      $debt = (float)$c['total_debt'];
      $isDebt = $debt > 0;
   ?>
   <Row>
    <Cell ss:StyleID="Cell"><Data ss:Type="Number"><?= $c['id'] ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($c['name']) ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($c['phone'] ?: '-') ?></Data></Cell>
    <Cell ss:StyleID="<?= $isDebt ? 'CellDebt' : 'CellSuccess' ?>"><Data ss:Type="Number"><?= number_format($debt, 2, '.', '') ?></Data></Cell>
    <Cell ss:StyleID="<?= $isDebt ? 'CellDebt' : 'CellSuccess' ?>"><Data ss:Type="String"><?= $isDebt ? 'مدين بمبلغ' : 'خالص (لا يوجد دين)' ?></Data></Cell>
   </Row>
   <?php endforeach; ?>
  </Table>
 </Worksheet>

 <!-- Worksheet 2: Sales and Invoices -->
 <Worksheet ss:Name="سجل المبيعات والفواتير" ss:RightToLeft="1">
  <Table ss:DefaultRowHeight="24">
   <Column ss:Width="80"/>
   <Column ss:Width="150"/>
   <Column ss:Width="120"/>
   <Column ss:Width="160"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Row ss:Height="28">
    <Cell ss:StyleID="Header"><Data ss:Type="String">رقم الفاتورة</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">التاريخ والوقت</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">اسم الكاشير</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">اسم العميل</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">طريقة الدفع</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">إجمالي الفاتورة</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">المبلغ المدفوع</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">المتبقي (الدين)</Data></Cell>
   </Row>
   <?php 
   $methodMap = [
      'cash' => 'كاش (نقدي)',
      'card' => 'بطاقة (شبكة)',
      'jeeb' => 'جيب',
      'onecash' => 'ون كاش',
      'haseb' => 'حاسب',
      'kuraimi' => 'كريمي',
      'floosak' => 'فلوسك',
      'deposit' => 'آجل (دين)'
   ];
   foreach ($bills as $b): 
      $total = (float)$b['total_amount'];
      $paid1 = ($b['payment_method'] !== 'deposit') ? (float)$b['paid_amount'] : 0;
      $paid2 = (!empty($b['payment_method2']) && $b['payment_method2'] !== 'deposit') ? (float)($b['paid_amount2'] ?? 0) : 0;
      $totalPaid = $paid1 + $paid2;
      $rem = max(0, $total - $totalPaid);
      
      $pm1 = $methodMap[$b['payment_method']] ?? ($b['payment_method'] ?: 'كاش');
      $pmStr = $pm1;
      if (!empty($b['payment_method2']) && (float)($b['paid_amount2'] ?? 0) > 0) {
          $pm2 = $methodMap[$b['payment_method2']] ?? $b['payment_method2'];
          $pmStr = "{$pm1} ({$b['paid_amount']}) + {$pm2} ({$b['paid_amount2']})";
      }
   ?>
   <Row>
    <Cell ss:StyleID="Cell"><Data ss:Type="Number"><?= $b['id'] ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($b['created_at']) ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($b['cashier_name'] ?: 'كاشير عام') ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($b['customer_name'] ?: 'عميل عابر') ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($pmStr) ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="Number"><?= number_format($total, 2, '.', '') ?></Data></Cell>
    <Cell ss:StyleID="CellSuccess"><Data ss:Type="Number"><?= number_format($totalPaid, 2, '.', '') ?></Data></Cell>
    <Cell ss:StyleID="<?= $rem > 0 ? 'CellDebt' : 'Cell' ?>"><Data ss:Type="Number"><?= number_format($rem, 2, '.', '') ?></Data></Cell>
   </Row>
   <?php endforeach; ?>
  </Table>
 </Worksheet>

 <!-- Worksheet 3: Debts and Payments Transactions -->
 <Worksheet ss:Name="حركات الديون وتفاصيل المشتريات" ss:RightToLeft="1">
  <Table ss:DefaultRowHeight="24">
   <Column ss:Width="70"/>
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="250"/>
   <Column ss:Width="100"/>
   <Column ss:Width="150"/>
   <Row ss:Height="28">
    <Cell ss:StyleID="Header"><Data ss:Type="String">رقم الحركة</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">اسم العميل</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">رقم الهاتف</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">نوع الحركة</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">المبلغ</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">الأصناف المشتراة / البيان</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">رقم الفاتورة/الإيصال</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">التاريخ والوقت</Data></Cell>
   </Row>
   <?php foreach ($payments as $p): 
      $isDebt = ($p['type'] ?? 'payment') === 'debt';
      $details = !empty($p['items_details']) ? $p['items_details'] : ($p['note'] ?: '-');
      $billRef = !empty($p['bill_id']) ? "فاتورة #" . $p['bill_id'] : 'قيد يدوي';
   ?>
   <Row>
    <Cell ss:StyleID="Cell"><Data ss:Type="Number"><?= $p['id'] ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($p['customer_name'] ?: 'عميل') ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($p['customer_phone'] ?: '-') ?></Data></Cell>
    <Cell ss:StyleID="<?= $isDebt ? 'CellDebt' : 'CellSuccess' ?>"><Data ss:Type="String"><?= $isDebt ? 'قيد دين (+)' : 'سداد دفعة (-)' ?></Data></Cell>
    <Cell ss:StyleID="<?= $isDebt ? 'CellDebt' : 'CellSuccess' ?>"><Data ss:Type="Number"><?= number_format((float)$p['amount'], 2, '.', '') ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($details) ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($billRef) ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($p['created_at']) ?></Data></Cell>
   </Row>
   <?php endforeach; ?>
  </Table>
 </Worksheet>

 <!-- Worksheet 4: Products and Inventory -->
 <Worksheet ss:Name="المنتجات والمخزون" ss:RightToLeft="1">
  <Table ss:DefaultRowHeight="24">
   <Column ss:Width="70"/>
   <Column ss:Width="130"/>
   <Column ss:Width="180"/>
   <Column ss:Width="120"/>
   <Column ss:Width="80"/>
   <Column ss:Width="130"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Row ss:Height="28">
    <Cell ss:StyleID="Header"><Data ss:Type="String">المعرف</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">الباركود / السيريال</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">اسم المنتج</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">القسم</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">الوحدة</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">مكان التخزين</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">سعر البيع</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">الكمية بالمخزون</Data></Cell>
   </Row>
   <?php foreach ($products as $pr): ?>
   <Row>
    <Cell ss:StyleID="Cell"><Data ss:Type="Number"><?= $pr['id'] ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($pr['serial_number'] ?: '-') ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($pr['name']) ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($pr['category_name'] ?: 'بدون قسم') ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($pr['unit']) ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String"><?= xmlEscape($pr['storage_location'] ?: '-') ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="Number"><?= number_format((float)$pr['price'], 2, '.', '') ?></Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="Number"><?= number_format((float)$pr['stock_quantity'], 2, '.', '') ?></Data></Cell>
   </Row>
   <?php endforeach; ?>
  </Table>
 </Worksheet>

</Workbook>

