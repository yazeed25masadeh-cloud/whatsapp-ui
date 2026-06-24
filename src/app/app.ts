import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  // 🔒 نظام الحماية والصلاحيات
  isLoggedIn: boolean = false;
  userRole: string | null = null; 
  loginUser: string = '';
  loginPass: string = '';
  
  readonly ADMIN_USER = 'Spark2017';
  readonly ADMIN_PASS = 'WebSite';
  readonly CASHIER_USER = 'cash';
  readonly CASHIER_PASS = '1122';

  // 📝 متغيرات النظام (العملاء)
  customerName: string = '';
  customerPhone: string = '';
  isVIP: boolean = false; 
  customers: any[] = []; 
  editingCustomerId: any = null; 
  
  // 🚀 متغيرات حملة الإرسال
  campName: string = '';
  campPrice: string = '';
  campDesc: string = '';
  campImageLink: string = ''; 
  currentCustomerIndex: number = 0;

  // 🔍 البحث والتقسيم
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 50;
  activeTab: string = 'home'; 

  // 🕒 متغيرات الوقت والتاريخ
  currentTime: string = '';
  currentDate: string = '';
  clockInterval: any;

  // 🔔 النوافذ المنبثقة والتأكيد الموحد
  showAlert: boolean = false;
  alertMessage: string = '';
  showConfirm: boolean = false;
  confirmMessage: string = '';
  confirmActionType: string = ''; // 'deleteCustomer' | 'clearSales'
  customerToDelete: any = null; 

  // =========================================
  // 💰 متغيرات صندوق المبيعات المحدث (الكاشير)
  // =========================================
  dailySales: any[] = []; 
  salesMode: string = 'sale'; // 'sale' | 'exchange' | 'return'
  saleMethod: string = 'cash'; // 'cash' | 'visa' | 'cliq'

  // 📦 متغيرات الكمية
  tempItemQty: number = 1; 
  exRetQty: number = 1;
  exNewQty: number = 1;
  retItemQty: number = 1;

  // 1. مبيع عادي
  currentBillItems: any[] = []; 
  tempItemName: string = ''; 
  tempItemPrice: any = null; 

  // 2. التبديل
  exReturnedItems: any[] = [];
  exNewItems: any[] = [];
  exRetName: string = ''; exRetPrice: any = null;
  exNewName: string = ''; exNewPrice: any = null;

  // 3. الإرجاع
  retItemName: string = '';
  retItemPrice: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get('https://whatsappsenderapi.onrender.com/api/customers').subscribe({
      next: () => console.log('السيرفر صاحي وجاهز!'),
      error: () => console.log('جاري إيقاظ السيرفر...')
    });

    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    this.loadDailySales();
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  updateClock() {
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate = now.toLocaleDateString('ar-JO', dateOptions);
    this.currentTime = now.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.cdr.detectChanges();
  }

  get totalCustomersCount() { return this.customers.length; }
  get vipPercentage() {
    if (this.customers.length === 0) return 0;
    const vips = this.customers.filter(c => c.isVIP).length;
    return Math.round((vips / this.customers.length) * 100);
  }
  get recentCustomers() { return [...this.customers].sort((a, b) => b.id - a.id).slice(0, 5); }

  openFacebook() { window.open('https://web.facebook.com/SparkSportsShop/', '_blank'); }
  openInstagram() { window.open('https://www.instagram.com/sparksport_jo?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', '_blank'); }
  openWhatsAppContact() { window.open('https://wa.me/962787540539', '_blank'); }

  doLogin() {
    if (this.loginUser === this.ADMIN_USER && this.loginPass === this.ADMIN_PASS) {
      this.isLoggedIn = true; this.userRole = 'admin'; this.activeTab = 'home'; this.loadCustomers();   
    } else if (this.loginUser === this.CASHIER_USER && this.loginPass === this.CASHIER_PASS) {
      this.isLoggedIn = true; this.userRole = 'cashier'; this.activeTab = 'sales'; 
    } else {
      this.triggerAlert('اسم المستخدم أو كلمة المرور غير صحيحة!');
    }
    this.cdr.detectChanges();
  }

  doLogout() {
    this.isLoggedIn = false; this.userRole = null; this.loginUser = ''; this.loginPass = ''; this.activeTab = 'home'; this.customers = [];
    this.cdr.detectChanges();
  }

  switchTab(tab: string) {
    this.activeTab = tab; this.currentPage = 1; this.currentCustomerIndex = 0;
    this.cdr.detectChanges();
  }

  // =========================================
  // نظام التأكيد الموحد (للحذف والتصفير)
  // =========================================
  executeConfirmAction() {
    if (this.confirmActionType === 'deleteCustomer' && this.customerToDelete) {
      this.http.delete(`https://whatsappsenderapi.onrender.com/api/customers/${this.customerToDelete}`).subscribe({
        next: () => { this.loadCustomers(); this.showConfirm = false; this.cdr.detectChanges(); },
        error: () => { this.showConfirm = false; this.triggerAlert('خطأ بالحذف!'); }
      });
    } else if (this.confirmActionType === 'clearSales') {
      this.dailySales = [];
      this.saveDailySales();
      this.showConfirm = false;
      this.triggerAlert('تم تصفير الصندوق وبدء يوم جديد! 🚀');
    }
  }

  cancelConfirm() { this.showConfirm = false; }
  triggerAlert(msg: string) { this.alertMessage = msg; this.showAlert = true; }
  closeAlert() { this.showAlert = false; }

  // =========================================
  // 💳 نظام الكاشير والفواتير (مبيع، تبديل، إرجاع)
  // =========================================
  setSalesMode(mode: string) { this.salesMode = mode; this.cdr.detectChanges(); }

// 1. المبيع العادي
  addItemToBill() {
    if (!this.tempItemName || !this.tempItemPrice) { this.triggerAlert('دخل الصنف وسعره!'); return; }
    let totalItemPrice = Number(this.tempItemPrice) * this.tempItemQty; // ضرب السعر بالكمية
    this.currentBillItems.push({ name: this.tempItemName, price: totalItemPrice, qty: this.tempItemQty, isReturn: false });
    this.tempItemName = ''; this.tempItemPrice = null; this.tempItemQty = 1; // تصفير مع إرجاع الكمية لـ 1
  }
  removeBillItem(i: number) { this.currentBillItems.splice(i, 1); }
  get currentBillTotal() { return this.currentBillItems.reduce((s, i) => s + i.price, 0); }
  
  checkoutSale() {
    if (this.currentBillItems.length === 0) return;
    this.saveInvoice('مبيع', [...this.currentBillItems], this.currentBillTotal);
    this.currentBillItems = [];
  }

// 2. نظام التبديل
  addExReturnItem() {
    if (!this.exRetName || !this.exRetPrice) { this.triggerAlert('دخل الصنف المسترجع وسعره!'); return; }
    let total = Number(this.exRetPrice) * this.exRetQty;
    this.exReturnedItems.push({ name: this.exRetName, price: total, qty: this.exRetQty, isReturn: true });
    this.exRetName = ''; this.exRetPrice = null; this.exRetQty = 1;
  }
addExNewItem() {
    if (!this.exNewName || !this.exNewPrice) { this.triggerAlert('دخل الصنف الجديد وسعره!'); return; }
    let total = Number(this.exNewPrice) * this.exNewQty;
    this.exNewItems.push({ name: this.exNewName, price: total, qty: this.exNewQty, isReturn: false });
    this.exNewName = ''; this.exNewPrice = null; this.exNewQty = 1;
  }
  removeExRet(i: number) { this.exReturnedItems.splice(i, 1); }
  removeExNew(i: number) { this.exNewItems.splice(i, 1); }
  get exchangeNetTotal() {
    let retSum = this.exReturnedItems.reduce((s, i) => s + i.price, 0);
    let newSum = this.exNewItems.reduce((s, i) => s + i.price, 0);
    return newSum - retSum; // إذا موجب الزبون بيدفع، إذا سالب إحنا بندفعله
  }

  checkoutExchange() {
    if (this.exReturnedItems.length === 0 && this.exNewItems.length === 0) return;
    let allItems = [...this.exReturnedItems, ...this.exNewItems];
    this.saveInvoice('تبديل', allItems, this.exchangeNetTotal);
    this.exReturnedItems = []; this.exNewItems = [];
  }

// 3. نظام الإرجاع
  checkoutReturn() {
    if (!this.retItemName || !this.retItemPrice) { this.triggerAlert('دخل الصنف والسعر!'); return; }
    let total = Number(this.retItemPrice) * this.retItemQty;
    let item = { name: this.retItemName, price: total, qty: this.retItemQty, isReturn: true };
    this.saveInvoice('إرجاع', [item], -total);
    this.retItemName = ''; this.retItemPrice = null; this.retItemQty = 1;
  }

  // الحفظ العام للفاتورة
  private saveInvoice(typeDesc: string, items: any[], total: number) {
    const newInvoice = {
      id: Date.now(),
      typeDesc: typeDesc,
      items: items,
      total: total,
      method: this.saleMethod,
      time: new Date().toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })
    };
    this.dailySales.unshift(newInvoice);
    this.saveDailySales();
    this.triggerAlert(`تم إصدار فاتورة (${typeDesc}) بنجاح! ✅`);
    this.cdr.detectChanges();
  }

  deleteInvoice(id: number) {
    this.dailySales = this.dailySales.filter(s => s.id !== id);
    this.saveDailySales();
  }

  // دوال الذاكرة والتصفير
  loadDailySales() {
    const saved = localStorage.getItem('sparkDailySales');
    if (saved) this.dailySales = JSON.parse(saved);
  }
  saveDailySales() { localStorage.setItem('sparkDailySales', JSON.stringify(this.dailySales)); }

  askClearSales() {
    if (this.dailySales.length === 0) { this.triggerAlert('الصندوق فاضي أصلاً!'); return; }
    this.confirmActionType = 'clearSales';
    this.confirmMessage = 'متأكد بدك تصفر صندوق اليوم؟ (هاي الحركة ما بتتراجع)';
    this.showConfirm = true;
  }

  // العدادات والتقرير (تم إضافة كليك)
  get totalCash() { return this.dailySales.filter(s => s.method === 'cash').reduce((sum, s) => sum + s.total, 0); }
  get totalVisa() { return this.dailySales.filter(s => s.method === 'visa').reduce((sum, s) => sum + s.total, 0); }
  get totalCliq() { return this.dailySales.filter(s => s.method === 'cliq').reduce((sum, s) => sum + s.total, 0); }
  get totalSales() { return this.totalCash + this.totalVisa + this.totalCliq; }

  sendDailyReport() {
    if (this.dailySales.length === 0) { this.triggerAlert('ما في مبيعات لليوم!'); return; }
    let report = `*📊 تقرير مبيعات Spark Sport*\nالتاريخ: ${this.currentDate}\n\n`;
    report += `💵 كاش: ${this.totalCash} د.أ\n💳 فيزا: ${this.totalVisa} د.أ\n📱 كليك: ${this.totalCliq} د.أ\n💰 إجمالي الصندوق: ${this.totalSales} د.أ\n\n--------------------------\n`;
    
[...this.dailySales].reverse().forEach((inv, idx) => {
      report += `*فاتورة #${idx + 1}* [${inv.typeDesc}] - ${inv.time}\n`;
      inv.items.forEach((item: any) => { 
        let mark = item.isReturn ? '🔄 [مسترجع]' : '🛒';
        let qtyText = item.qty ? `(${item.qty}x) ` : ''; // إضافة الكمية للرسالة
        report += `${mark} ${qtyText}${item.name}: ${item.price} د.أ\n`; 
      });
      let payMethod = inv.method === 'cash' ? 'كاش' : (inv.method === 'visa' ? 'فيزا' : 'كليك');
      report += `🔹 الصافي: ${inv.total} د.أ (${payMethod})\n\n`;
    });
    window.open(`https://wa.me/962787540539?text=${encodeURIComponent(report)}`, '_blank');
  }

  // =========================================
  // 👥 بقية دوال العملاء والواتساب
  // =========================================
  loadCustomers() {
    this.http.get<any[]>('https://whatsappsenderapi.onrender.com/api/customers').subscribe({
      next: (data) => { this.customers = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });
  }

  editCustomer(customer: any) {
    this.editingCustomerId = customer.id; this.customerName = customer.name; this.customerPhone = customer.phoneNumber; this.isVIP = customer.isVIP || false; 
    if (this.activeTab !== 'all' && this.activeTab !== 'vip') this.switchTab('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveCustomer() {
    if (!this.customerName || !this.customerPhone) { this.triggerAlert('دخل البيانات!'); return; }
    const customerData = { name: this.customerName, phoneNumber: this.customerPhone, isVIP: this.isVIP };
    if (this.editingCustomerId) {
      this.http.put<any>(`https://whatsappsenderapi.onrender.com/api/customers/${this.editingCustomerId}`, customerData).subscribe({
        next: () => { this.loadCustomers(); this.cancelEdit(); this.triggerAlert('تم التعديل!'); }
      });
    } else {
      this.http.post<any>('https://whatsappsenderapi.onrender.com/api/customers', customerData).subscribe({
        next: () => { this.loadCustomers(); this.cancelEdit(); this.triggerAlert('تمت الإضافة!'); }
      });
    }
  }

  cancelEdit() { this.editingCustomerId = null; this.customerName = ''; this.customerPhone = ''; this.isVIP = false; }
  
  askDelete(id: number) {
    this.customerToDelete = id;
    this.confirmActionType = 'deleteCustomer';
    this.confirmMessage = 'متأكد بدك تمسح الزبون؟';
    this.showConfirm = true;
  }

  get targetCustomersCount() { return this.activeTab === 'vip' ? this.customers.filter(c => c.isVIP).length : this.customers.length; }
  get processedCustomers() {
    let filtered = this.activeTab === 'vip' ? this.customers.filter(c => c.isVIP) : this.customers;
    if (this.searchTerm.trim() !== '') filtered = filtered.filter(c => c.phoneNumber.includes(this.searchTerm.trim()));
    return filtered.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
  }
  get totalPages() {
    let filtered = this.activeTab === 'vip' ? this.customers.filter(c => c.isVIP) : this.customers;
    if (this.searchTerm.trim() !== '') filtered = filtered.filter(c => c.phoneNumber.includes(this.searchTerm.trim()));
    return Math.ceil(filtered.length / this.itemsPerPage) || 1;
  }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  onSearchChange() { this.currentPage = 1; }

  sendSingleWhatsApp(customer: any) {
    let msg = `مرحبا ${customer.name}\nمتجر SPARK SPORT ⚡`;
    let phone = customer.phoneNumber.startsWith('0') ? '962' + customer.phoneNumber.substring(1) : customer.phoneNumber;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  sendBulkWhatsApp() {
    if (!this.campName || !this.campPrice) { this.triggerAlert('عبي المنتج!'); return; }
    let target = this.activeTab === 'vip' ? this.customers.filter(c => c.isVIP) : this.customers;
    if (this.currentCustomerIndex >= target.length) { this.triggerAlert('🎉 خلصنا الإرسال!'); this.currentCustomerIndex = 0; return; }
    let msg = `مرحبا ${target[this.currentCustomerIndex].name}\nمتجر SPARK SPORT ⚡\n\n*منتج:* ${this.campName}\n*سعر:* ${this.campPrice}\n${this.campDesc}`;
    let phone = target[this.currentCustomerIndex].phoneNumber.startsWith('0') ? '962' + target[this.currentCustomerIndex].phoneNumber.substring(1) : target[this.currentCustomerIndex].phoneNumber;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    this.currentCustomerIndex++;
  }
}