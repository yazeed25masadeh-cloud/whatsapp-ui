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
  isLoggedIn: boolean = false;
  loginUser: string = '';
  loginPass: string = '';
  readonly ADMIN_USER = 'Spark2017';
  readonly ADMIN_PASS = 'WebSite';

  customerName: string = '';
  customerPhone: string = '';
  isVIP: boolean = false; 
  customers: any[] = []; 
  editingCustomerId: number | null = null;
  
  campName: string = '';
  campPrice: string = '';
  campDesc: string = '';
  campImageLink: string = ''; 
  currentCustomerIndex: number = 0;

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 50;
  
  // 🌟 التعديل: إضافة الشاشات الجديدة للتابات
  activeTab: 'home' | 'all' | 'vip' | 'stats' = 'home';

  showAlert: boolean = false;
  alertMessage: string = '';
  showConfirm: boolean = false;
  confirmMessage: string = '';
  customerToDelete: number | null = null;

  // 🕒 متغيرات الوقت والتاريخ
  currentTime: string = '';
  currentDate: string = '';
  clockInterval: any;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get('https://whatsappsenderapi.onrender.com/api/customers')
      .subscribe({
        next: () => console.log('السيرفر صاحي وجاهز!'),
        error: () => console.log('جاري إيقاظ السيرفر...')
      });

    // 🕒 تشغيل الساعة أول ما يفتح الموقع
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  // 🕒 دالة تحديث الوقت والتاريخ
  updateClock() {
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate = now.toLocaleDateString('ar-JO', dateOptions);
    this.currentTime = now.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.cdr.detectChanges();
  }

  // 📊 دوال الإحصائيات الذكية
  get totalCustomersCount() {
    return this.customers.length;
  }

  get vipPercentage() {
    if (this.customers.length === 0) return 0;
    const vips = this.customers.filter(c => c.isVIP).length;
    return Math.round((vips / this.customers.length) * 100);
  }

  get recentCustomers() {
    return [...this.customers].sort((a, b) => b.id - a.id).slice(0, 5);
  }

  // 🌐 روابط السوشيال ميديا
  openFacebook() { window.open('https://web.facebook.com/SparkSportsShop/', '_blank'); }
  openInstagram() { window.open('https://www.instagram.com/sparksport_jo?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', '_blank'); }
  openWhatsAppContact() { window.open('https://wa.me/962787540539', '_blank'); }

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
    this.loginUser = '';
    this.loginPass = '';
    this.customers = []; 
    this.activeTab = 'home';
    this.cdr.detectChanges();
  }

  switchTab(tab: 'home' | 'all' | 'vip' | 'stats') {
    this.activeTab = tab;
    this.currentPage = 1; 
    this.currentCustomerIndex = 0;
    this.cdr.detectChanges();
  }

  get targetCustomersCount() {
    return this.activeTab === 'vip' ? this.customers.filter(c => c.isVIP).length : this.customers.length;
  }

  get processedCustomers() {
    let filtered = this.customers;
    if (this.activeTab === 'vip') filtered = filtered.filter(c => c.isVIP === true);
    if (this.searchTerm.trim() !== '') filtered = filtered.filter(c => c.phoneNumber.includes(this.searchTerm.trim()));
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    let filtered = this.customers;
    if (this.activeTab === 'vip') filtered = filtered.filter(c => c.isVIP === true);
    if (this.searchTerm.trim() !== '') filtered = filtered.filter(c => c.phoneNumber.includes(this.searchTerm.trim()));
    return Math.ceil(filtered.length / this.itemsPerPage) || 1;
  }

  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  onSearchChange() { this.currentPage = 1; }

  loadCustomers() {
    this.http.get<any[]>('https://whatsappsenderapi.onrender.com/api/customers')
      .subscribe({
        next: (data) => {
          this.customers = data;
          this.cdr.detectChanges(); 
        },
        error: (err) => console.error('مشكلة بجلب البيانات', err)
      });
  }

  editCustomer(customer: any) {
    this.editingCustomerId = customer.id;
    this.customerName = customer.name;
    this.customerPhone = customer.phoneNumber;
    this.isVIP = customer.isVIP || false; 
    
    // نرجع لتاب 'all' أو 'vip' عشان تبين شاشة التعديل إذا كنا بالإحصائيات
    if (this.activeTab === 'home' || this.activeTab === 'stats') {
      this.switchTab('all');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveCustomer() {
    if (!this.customerName || !this.customerPhone) {
      this.triggerAlert('الرجاء إدخال اسم ورقم الزبون!');
      return;
    }

    const isDuplicate = this.customers.some(
      c => c.phoneNumber === this.customerPhone && c.id !== this.editingCustomerId
    );

    if (isDuplicate) {
      this.triggerAlert('عفواً! هذا الزبون موجود مسبقاً في النظام (نفس رقم الهاتف) ⚠️');
      return;
    }

    const customerData = { 
      name: this.customerName, 
      phoneNumber: this.customerPhone,
      isVIP: this.isVIP 
    };

    if (this.editingCustomerId) {
      this.http.put<any>(`https://whatsappsenderapi.onrender.com/api/customers/${this.editingCustomerId}`, customerData)
        .subscribe({
          next: () => {
            this.loadCustomers(); 
            this.cancelEdit();    
            this.triggerAlert('تم تحديث بيانات الزبون بنجاح!');
          },
          error: (err) => console.error(err)
        });
    } else {
      this.http.post<any>('https://whatsappsenderapi.onrender.com/api/customers', customerData)
        .subscribe({
          next: () => {
            this.loadCustomers(); 
            this.cancelEdit();    
            this.triggerAlert('تم إضافة الزبون للقائمة بنجاح!');
          },
          error: (err) => console.error(err)
        });
    }
  }

  cancelEdit() {
    this.editingCustomerId = null;
    this.customerName = '';
    this.customerPhone = '';
    this.isVIP = false;
    this.cdr.detectChanges();
  }

  askDelete(id: number) {
    this.customerToDelete = id;
    this.confirmMessage = 'متأكد بدك تمسح هذا الزبون نهائياً؟';
    this.showConfirm = true;
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (this.customerToDelete) {
      this.http.delete(`https://whatsappsenderapi.onrender.com/api/customers/${this.customerToDelete}`)
        .subscribe({
          next: () => {
            this.loadCustomers(); 
            this.showConfirm = false;
            this.customerToDelete = null;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.showConfirm = false;
            this.triggerAlert('صار مشكلة بالحذف!');
          }
        });
    }
  }

  cancelDelete() { 
    this.showConfirm = false; 
    this.customerToDelete = null; 
    this.cdr.detectChanges();
  }

  triggerAlert(msg: string) { 
    this.alertMessage = msg; 
    this.showAlert = true; 
    this.cdr.detectChanges();
  }

  closeAlert() { 
    this.showAlert = false; 
    this.cdr.detectChanges();
  }

  sendSingleWhatsApp(customer: any) { 
    this.executeWhatsApp(customer); 
  }

  sendBulkWhatsApp() {
    if (!this.campName || !this.campPrice) { 
      this.triggerAlert('عبي تفاصيل المنتج أولاً يا معلم!'); 
      return; 
    }
    
    let targetCustomers = this.activeTab === 'vip' ? this.customers.filter(c => c.isVIP) : this.customers;

    if (targetCustomers.length === 0) return;
    
    if (this.currentCustomerIndex >= targetCustomers.length) {
      this.triggerAlert('🎉 خلصنا! تم الإرسال لكل الزباين بالقائمة المختارة.');
      this.currentCustomerIndex = 0; 
      this.cdr.detectChanges();
      return;
    }
    const customerTarget = targetCustomers[this.currentCustomerIndex];
    this.executeWhatsApp(customerTarget);
    this.currentCustomerIndex++;
    this.cdr.detectChanges();
  }

  private executeWhatsApp(customer: any) {
    let message = '';
    if (this.campName) {
      message = `مرحبا ${customer.name}\nاهلا وسهلا نحن متجر SPARK SPORT ⚡\n\nلانك من الزبائن المميزين لدينا وفرنا لك عرض خاص بك 🎁\n\n*اسم المنتج* : ${this.campName}\n*المواصفات* : ${this.campDesc}\n*السعر* : ${this.campPrice}\n\n`;
      if (this.campImageLink) message += `${this.campImageLink}`;
    } else {
      message = `مرحبا ${customer.name}\nاهلا وسهلا نحن متجر SPARK SPORT ⚡`;
    }
    let phone = customer.phoneNumber;
    if (phone.startsWith('0')) phone = '962' + phone.substring(1);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  }
}