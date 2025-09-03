/**
 * ملف إعدادات التطبيق - نظام عروض الأسعار
 * 
 * يحتوي على جميع الإعدادات الأساسية للتطبيق بما في ذلك:
 * - إعدادات الاتصال بقاعدة البيانات (Supabase)
 * - إعدادات الأمان والأداء
 * - القيم الافتراضية للتطبيق
 * - معرف المستأجر للفصل بين المشاريع
 * 
 * ⚠️ تحذير أمني مهم:
 * هذا الملف يحتوي على مفاتيح حساسة!
 * تأكد من عدم رفع هذا الملف إلى المستودعات العامة (GitHub, GitLab, etc.)
 * أضف config.js إلى ملف .gitignore
 * 
 * @version 2.0.0
 * @author DevGroup
 */

/* ====== إعدادات قاعدة البيانات ====== */

/**
 * رابط مشروع Supabase
 * @type {string}
 * @description احصل على هذه القيمة من Supabase Project Settings > API
 */
window.SUPA_URL = "https://onhtwpgywttemhggqqpa.supabase.co";

/**
 * مفتاح Supabase العام (Anonymous Key)
 * @type {string}
 * @description احصل على هذه القيمة من Supabase Project Settings > API
 */
window.SUPA_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaHR3cGd5d3R0ZW1oZ2dxcXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjM5ODYsImV4cCI6MjA3MjQzOTk4Nn0.O8gWJI_yWVewTVfdfVLzmn-3t71vkMYmmyg2L09-p98";

/**
 * معرف المستأجر (Tenant ID)
 * @type {string}
 * @description يستخدم للفصل بين أرشيفات مشاريعك المختلفة
 */
window.TENANT = "devgroup-info-cleaning";

/* ====== إعدادات التطبيق ====== */

/**
 * كائن إعدادات التطبيق الرئيسي
 * @type {Object}
 * @property {string} appName - اسم التطبيق
 * @property {string} version - إصدار التطبيق
 * @property {Object} security - إعدادات الأمان
 * @property {Object} performance - إعدادات الأداء
 * @property {Object} defaults - القيم الافتراضية
 */
window.APP_CONFIG = {
    appName: "نظام عروض الأسعار - حلول النظافة",
    version: "2.0.0",
    
    /**
     * إعدادات الأمان
     * @property {boolean} encryptLocalData - تشفير البيانات المحلية
     * @property {number} sessionTimeout - انتهاء الجلسة بالدقائق
     */
    security: {
        encryptLocalData: false,
        sessionTimeout: 60 // دقيقة
    },
    
    /**
     * إعدادات الأداء
     * @property {number} pageSize - عدد العناصر في كل صفحة
     * @property {number} searchDelay - تأخير البحث بالميلي ثانية
     * @property {number} maxRetries - عدد المحاولات القصوى
     */
    performance: {
        pageSize: 20,
        searchDelay: 300,
        maxRetries: 3
    },
    
    /**
     * الإعدادات الافتراضية للعروض
     * @property {string} currency - العملة الافتراضية
     * @property {number} tax - نسبة الضريبة
     * @property {number} validityDays - مدة صلاحية العرض بالأيام
     * @property {string} taxMode - نوع الضريبة (inclusive/exclusive)
     * @property {string} discountType - نوع الخصم (amount/percentage)
     */
    defaults: {
        currency: "SAR",
        tax: 15,
        validityDays: 30,
        taxMode: "exclusive",
        discountType: "amount"
    }
};

/* ====== التحقق من صحة الإعدادات ====== */

/**
 * التحقق من صحة واكتمال إعدادات التطبيق
 * يتم تشغيل هذا الكود عند تحميل الملف للتأكد من:
 * - وجود جميع إعدادات Supabase المطلوبة
 * - صحة تكوين التطبيق
 * - عرض رسائل تأكيد أو خطأ مناسبة
 */
if (typeof window !== 'undefined') {
    const config = window.APP_CONFIG;
    
    // التحقق من وجود الإعدادات الأساسية
    if (!window.SUPA_URL || !window.SUPA_ANON_KEY || !window.TENANT) {
        console.error('❌ خطأ: إعدادات Supabase غير مكتملة!');
        alert('خطأ في الإعدادات: يرجى التحقق من ملف config.js');
    } else {
        // عرض رسائل التأكيد عند نجاح التحميل
        console.log('✅ تم تحميل إعدادات التطبيق بنجاح');
        console.log('📱 اسم التطبيق:', config.appName);
        console.log('🏢 المستأجر:', window.TENANT);
    }
}
