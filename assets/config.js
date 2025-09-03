// ملف التكوين الآمن - نموذج للإعداد
// ⚠️ تحذير أمني مهم: لا تضع المفاتيح الحقيقية في هذا الملف!
// انسخ هذا الملف إلى config.js وضع المفاتيح الحقيقية هناك
// تأكد من إضافة config.js إلى .gitignore لمنع رفعه للمستودع

// إعدادات Supabase - احصل على هذه القيم من Supabase Project Settings
window.SUPA_URL = "https://onhtwpgywttemhggqqpa.supabase.co"; // مثال: "https://xxxxx.supabase.co"
window.SUPA_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaHR3cGd5d3R0ZW1oZ2dxcXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjM5ODYsImV4cCI6MjA3MjQzOTk4Nn0.O8gWJI_yWVewTVfdfVLzmn-3t71vkMYmmyg2L09-p98"; // المفتاح العام للمشروع

// معرف المستأجر - يستخدم للفصل بين أرشيفات مشاريعك المختلفة
// يمكنك تغيير هذا النص ليناسب مشروعك
window.TENANT = "devgroup-info-cleaning"; // مثال: "cleaning-company-2024"

// إعدادات إضافية
window.APP_CONFIG = {
    // اسم التطبيق
    appName: "نظام عروض الأسعار",
    
    // إعدادات الأمان
    security: {
        // تشفير البيانات المحلية (قريباً)
        encryptLocalData: false,
        
        // مهلة انتهاء الجلسة (بالدقائق)
        sessionTimeout: 60
    },
    
    // إعدادات الأداء
    performance: {
        // عدد السجلات في كل صفحة
        pageSize: 20,
        
        // تأخير البحث (بالميلي ثانية)
        searchDelay: 300
    },
    
    // إعدادات العملة الافتراضية
    defaultCurrency: "SAR",
    
    // إعدادات الضريبة الافتراضية
    defaultTax: 15,
    
    // إعدادات الصلاحية الافتراضية (بالأيام)
    defaultValidityDays: 30
};

// التحقق من وجود المفاتيح المطلوبة
if (typeof window !== 'undefined') {
    // التحقق من إعداد المفاتيح
    const requiredKeys = ['SUPA_URL', 'SUPA_ANON_KEY', 'TENANT'];
    const missingKeys = requiredKeys.filter(key => 
        !window[key] || window[key].includes('YOUR_') || window[key].includes('_HERE')
    );
    
    if (missingKeys.length > 0) {
        console.warn('⚠️ تحذير: المفاتيح التالية غير مُعدة بشكل صحيح:', missingKeys);
        console.warn('يرجى تحديث ملف config.js بالقيم الصحيحة من Supabase');
    }
}