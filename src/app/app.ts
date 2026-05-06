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
  // 🔒 نظام الحماية
  isLoggedIn: boolean = false;
  loginUser: string = '';
  loginPass: string = '';
  readonly ADMIN_USER = 'Spark2017';
  readonly ADMIN_PASS = 'WebSite';

  // 📝 متغيرات النظام (العملاء)
  customerName: string = '';
  customerPhone: string = '';
  isVIP: boolean = false; 
  customers: any[] = []; 
  editingCustomerId: number | null = null;
  
  // 🚀 متغيرات حملة الإرسال
  campName: string = '';
  campPrice: string = '';
  campDesc: string = '';
  campImageLink: string = ''; 
  currentCustomerIndex: number = 0;

  // 🔍 البحث والتقسيم والـ Sidebar
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 50;
  activeTab: 'home' | 'all' | 'vip' | 'stats' | 'sales' = 'home';

  // 🕒 متغيرات الوقت والتاريخ
  currentTime: string = '';
  currentDate: string = '';
  clockInterval: any;

  // 💰 متغيرات نظام الفواتير (صندوق المبيعات)
  dailySales: any[] = []; // سجل الفواتير اليومي
  currentBillItems: any[] = []; // الأصناف داخل الفاتورة الحالية
  tempItemName: string = ''; // اسم الصنف المؤقت
  tempItemPrice: number | null = null; // سعر الصنف المؤقت
  saleMethod: 'cash' | 'visa' = 'cash'; // طريقة دفع الفاتورة

  // 🔔 النوافذ المنبثقة
  showAlert: boolean = false;
  alertMessage: string = '';
  showConfirm: boolean = false;
  confirmMessage: string = '';
  customerToDelete: number | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // إيقاظ السيرفر
    this.http.get('https://whatsappsenderapi.onrender.com/api/customers')
      .subscribe({
        next: () => console.log('السيرفر صاحي وجاهز!'),
        error: () => console.log('جاري إيقاظ السيرفر...')
      });

    // تشغيل الساعة
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    
    // تحميل المبيعات المحفوظة
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

  // 📊 دوال الإحصائيات
  get totalCustomersCount() { return this.customers.length; }
  get vipPercentage() {
    if (this.customers.length === 0) return 0;
    const vips = this.customers.filter(c => c.isVIP).length;
    return Math.round((vips / this.customers.length) * 100);
  }
  get recentCustomers() { return [...this.customers].sort((a, b) => b.id - a.id).slice(0, 5); }

  // 🌐 السوشيال ميديا
  openFacebook() { window.open('https://web.facebook.com/SparkSportsShop/', '_blank'); }
  openInstagram() { window.open('https://www.instagram.com/sparksport_jo?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', '_blank'); }
  openWhatsAppContact() { window.open('https://wa.me/962787540539', '_blank'); }

  // 🔐 نظام الدخول
  doLogin() {
    if (this.loginUser === this.ADMIN_USER && this.loginPass === this.ADMIN_PASS) {
      this.isLoggedIn = true; 
      this.cdr.detectChanges(); 
      this.loadCustomers();   
    } else {
      this.triggerAlert('اسم المستخدم أو كلمة المرور غير صحيحة يا وحش!');
    }
  }

  doLogout() {
    this.isLoggedIn = false;
    this.activeTab = 'home';
    this.cdr.detectChanges();
  }

  switchTab(tab: 'home' | 'all' | 'vip' | 'stats' | 'sales') {
    this.activeTab = tab;
    this.currentPage = 1; 
    this.currentCustomerIndex = 0;
    this.cdr.detectChanges();
  }

  // 👥 عمليات الزبائن
  loadCustomers() {
    this.http.get<any[]>('https://whatsappsenderapi.onrender.com/api/customers')
      .subscribe({
        next: (data) => { this.customers = data; this.cdr.detectChanges(); },
        error: (err) => console.error(err)
      });
  }

  editCustomer(customer: any) {
    this.editingCustomerId = customer.id;
    this.customerName = customer.name;
    this.customerPhone = customer.phoneNumber;
    this.isVIP = customer.isVIP || false; 
    if (this.activeTab !== 'all' && this.activeTab !== 'vip') this.switchTab('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveCustomer() {
    if (!this.customerName || !this.customerPhone) {
      this.triggerAlert('دخل البيانات كاملة!'); return;
    }

    const customerData = { 
      name: this.customerName, 
      phoneNumber: this.customerPhone, 
      isVIP: this.isVIP 
    };

    if (this.editingCustomerId) {
      this.http.put<any>(`https://whatsappsenderapi.onrender.com/api/customers/${this.editingCustomerId}`, customerData)
        .subscribe({
          next: () => { this.loadCustomers(); this.cancelEdit(); this.triggerAlert('تم التعديل بنجاح!'); },
          error: (err) => console.error(err)
        });
    } else {
      this.http.post<any>('https://whatsappsenderapi.onrender.com/api/customers', customerData)
        .subscribe({
          next: () => { this.loadCustomers(); this.cancelEdit(); this.triggerAlert('تمت الإضافة!'); },
          error: (err) => console.error(err)
        });
    }
  }

  cancelEdit() {
    this.editingCustomerId = null;
    this.customerName = ''; this.customerPhone = ''; this.isVIP = false;
    this.cdr.detectChanges();
  }

  askDelete(id: number) {
    this.customerToDelete = id;
    this.confirmMessage = 'متأكد بدك تمسح الزبون؟';
    this.showConfirm = true;
  }

  confirmDelete() {
    if (this.customerToDelete) {
      this.http.delete(`https://whatsappsenderapi.onrender.com/api/customers/${this.customerToDelete}`)
        .subscribe({
          next: () => { this.loadCustomers(); this.showConfirm = false; this.cdr.detectChanges(); },
          error: (err) => { this.showConfirm = false; this.triggerAlert('خطأ بالحذف!'); }
        });
    }
  }

  cancelDelete() { this.showConfirm = false; }
  triggerAlert(msg: string) { this.alertMessage = msg; this.showAlert = true; }
  closeAlert() { this.showAlert = false; }

  // 🛒 نظام الفواتير الجديد
  addItemToBill() {
    if (!this.tempItemName || !this.tempItemPrice) { this.triggerAlert('دخل الصنف وسعره!'); return; }
    this.currentBillItems.push({ name: this.tempItemName, price: parseFloat(this.tempItemPrice.toString()) });
    this.tempItemName = ''; this.tempItemPrice = null;
    this.cdr.detectChanges();
  }

  removeItemFromCurrentBill(index: number) {
    this.currentBillItems.splice(index, 1);
    this.cdr.detectChanges();
  }

  get currentBillTotal() {
    return this.currentBillItems.reduce((sum, item) => sum + item.price, 0);
  }

  checkoutBill() {
    if (this.currentBillItems.length === 0) { this.triggerAlert('الفاتورة فاضية!'); return; }
    const newInvoice = {
      id: Date.now(),
      items: [...this.currentBillItems],
      total: this.currentBillTotal,
      method: this.saleMethod,
      time: new Date().toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })
    };
    this.dailySales.unshift(newInvoice);
    this.saveDailySales();
    this.currentBillItems = [];
    this.triggerAlert('تم إصدار الفاتورة! ✅');
  }

  deleteInvoice(id: number) {
    this.dailySales = this.dailySales.filter(s => s.id !== id);
    this.saveDailySales();
    this.cdr.detectChanges();
  }

  loadDailySales() {
    const saved = localStorage.getItem('sparkDailySales');
    if (saved) this.dailySales = JSON.parse(saved);
  }

  saveDailySales() {
    localStorage.setItem('sparkDailySales', JSON.stringify(this.dailySales));
  }

  clearDailySales() {
    this.dailySales = [];
    this.saveDailySales();
    this.triggerAlert('تم تصفير الصندوق!');
  }

  get totalCash() { return this.dailySales.filter(s => s.method === 'cash').reduce((sum, s) => sum + s.total, 0); }
  get totalVisa() { return this.dailySales.filter(s => s.method === 'visa').reduce((sum, s) => sum + s.total, 0); }
  get totalSales() { return this.totalCash + this.totalVisa; }

  sendDailyReport() {
    if (this.dailySales.length === 0) { this.triggerAlert('ما في فواتير!'); return; }
    let report = `*📊 تقرير مبيعات Spark Sport*\nالتاريخ: ${this.currentDate}\n\n`;
    report += `💵 كاش: ${this.totalCash} د.أ\n💳 فيزا: ${this.totalVisa} د.أ\n💰 الإجمالي: ${this.totalSales} د.أ\n\n`;
    [...this.dailySales].reverse().forEach((inv, idx) => {
      report += `*فاتورة #${idx + 1}* [${inv.time}]\n`;
      inv.items.forEach((item: any) => { report += `- ${item.name}: ${item.price} د.أ\n`; });
      report += `🔹 المجموع: ${inv.total} (${inv.method === 'cash' ? 'كاش' : 'فيزا'})\n\n`;
    });
    window.open(`https://wa.me/962787540539?text=${encodeURIComponent(report)}`, '_blank');
  }

  // 💬 واتساب
  get targetCustomersCount() { return this.activeTab === 'vip' ? this.customers.filter(c => c.isVIP).length : this.customers.length; }

  get processedCustomers() {
    let filtered = this.customers;
    if (this.activeTab === 'vip') filtered = filtered.filter(c => c.isVIP);
    if (this.searchTerm.trim() !== '') filtered = filtered.filter(c => c.phoneNumber.includes(this.searchTerm.trim()));
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    let filtered = this.customers;
    if (this.activeTab === 'vip') filtered = filtered.filter(c => c.isVIP);
    if (this.searchTerm.trim() !== '') filtered = filtered.filter(c => c.phoneNumber.includes(this.searchTerm.trim()));
    return Math.ceil(filtered.length / this.itemsPerPage) || 1;
  }

  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  onSearchChange() { this.currentPage = 1; }

  sendSingleWhatsApp(customer: any) { this.executeWhatsApp(customer); }

  sendBulkWhatsApp() {
    if (!this.campName || !this.campPrice) { this.triggerAlert('عبي بيانات المنتج!'); return; }
    let targetCustomers = this.activeTab === 'vip' ? this.customers.filter(c => c.isVIP) : this.customers;
    if (this.currentCustomerIndex >= targetCustomers.length) {
      this.triggerAlert('🎉 خلصنا الإرسال!'); this.currentCustomerIndex = 0; return;
    }
    this.executeWhatsApp(targetCustomers[this.currentCustomerIndex]);
    this.currentCustomerIndex++;
  }

  private executeWhatsApp(customer: any) {
    let message = `مرحبا ${customer.name}\nمتجر SPARK SPORT ⚡\n\n*منتج:* ${this.campName}\n*سعر:* ${this.campPrice}\n${this.campDesc}`;
    let phone = customer.phoneNumber.startsWith('0') ? '962' + customer.phoneNumber.substring(1) : customer.phoneNumber;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  }
}

