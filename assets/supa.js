/**
 * ملف إدارة قاعدة البيانات Supabase
 * 
 * هذا الملف يوفر واجهة برمجية للتفاعل مع قاعدة البيانات Supabase
 * ويتضمن الميزات التالية:
 * 
 * - إدارة الاتصال بقاعدة البيانات
 * - معالجة شاملة للأخطاء مع رسائل باللغة العربية
 * - آلية إعادة المحاولة التلقائية
 * - التحقق من صحة البيانات
 * - عمليات CRUD (إنشاء، قراءة، تحديث، حذف)
 * - دعم البحث والفلترة
 * - دعم Pagination للأداء الأمثل
 * - إدارة المهل الزمنية (Timeouts)
 * - نظام Multi-tenancy
 */

// assets/supa.js (نسخة محسنة مع معالجة أخطاء شاملة)
(function () {
  
  /* ====== الإعدادات والثوابت ====== */
  
  // إعدادات الاتصال والأخطاء
  const CONFIG = window.APP_CONFIG || { performance: { maxRetries: 3 } };
  const MAX_RETRIES = CONFIG.performance?.maxRetries || 3;
  const RETRY_DELAY = 1000; // ميلي ثانية
  
  /* ====== رسائل الأخطاء ====== */
  
  // رسائل الأخطاء باللغة العربية لتحسين تجربة المستخدم
  const ERROR_MESSAGES = {
    network: 'خطأ في الاتصال بالشبكة. تحقق من اتصال الإنترنت.',
    unauthorized: 'غير مصرح لك بالوصول. تحقق من إعدادات Supabase.',
    forbidden: 'العملية غير مسموحة. تحقق من صلاحيات قاعدة البيانات.',
    notFound: 'البيانات المطلوبة غير موجودة.',
    serverError: 'خطأ في الخادم. حاول مرة أخرى لاحقاً.',
    timeout: 'انتهت مهلة الاتصال. حاول مرة أخرى.',
    invalidData: 'البيانات المرسلة غير صحيحة.',
    quotaExceeded: 'تم تجاوز الحد المسموح للاستخدام.',
    unknown: 'حدث خطأ غير متوقع. حاول مرة أخرى.'
  };
  
  /* ====== الدوال المساعدة ====== */
  
  /**
   * إنشاء headers الطلب المطلوبة للاتصال بـ Supabase
   * @returns {Object} كائن يحتوي على headers الطلب
   * @throws {Error} إذا كان مفتاح Supabase غير موجود
   */
  const hdr = () => {
    if (!window.SUPA_ANON_KEY) {
      throw new Error('مفتاح Supabase غير موجود. تحقق من ملف config.js');
    }
    return {
      'apikey': window.SUPA_ANON_KEY,
      'Authorization': `Bearer ${window.SUPA_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  };
  
  /**
   * معالج الأخطاء المحسن
   * يحول أخطاء HTTP والشبكة إلى رسائل واضحة باللغة العربية
   * @param {Error} error - كائن الخطأ
   * @param {string} operation - اسم العملية التي فشلت (افتراضي: 'العملية')
   * @returns {Error} كائن خطأ جديد برسالة واضحة
   */
  function handleError(error, operation = 'العملية') {
    console.error(`❌ خطأ في ${operation}:`, error);
    
    // تحديد نوع الخطأ ورسالة مناسبة
    let message = ERROR_MESSAGES.unknown;
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      message = ERROR_MESSAGES.network;
    } else if (error.status) {
      switch (error.status) {
        case 401: message = ERROR_MESSAGES.unauthorized; break;
        case 403: message = ERROR_MESSAGES.forbidden; break;
        case 404: message = ERROR_MESSAGES.notFound; break;
        case 422: message = ERROR_MESSAGES.invalidData; break;
        case 429: message = ERROR_MESSAGES.quotaExceeded; break;
        case 500:
        case 502:
        case 503: message = ERROR_MESSAGES.serverError; break;
        case 408: message = ERROR_MESSAGES.timeout; break;
        default: message = `خطأ ${error.status}: ${error.statusText || 'غير معروف'}`;
      }
    } else if (error.message) {
      message = error.message;
    }
    
    return new Error(message);
  }
  
  /**
   * دالة إعادة المحاولة مع تأخير متزايد
   * تعيد تنفيذ العملية عند الفشل مع زيادة فترة التأخير تدريجياً
   * @param {Function} operation - الدالة المراد تنفيذها
   * @param {number} maxRetries - العدد الأقصى للمحاولات (افتراضي: MAX_RETRIES)
   * @returns {Promise} نتيجة العملية
   * @throws {Error} إذا فشلت جميع المحاولات
   */
  async function retryOperation(operation, maxRetries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`⚠️ المحاولة ${attempt} فشلت:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // تأخير قبل إعادة المحاولة (exponential backoff)
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  /**
   * التحقق من صحة الاستجابة من الخادم
   * @param {Response} response - كائن الاستجابة من fetch
   * @param {string} operation - اسم العملية للمساعدة في رسائل الخطأ
   * @returns {Promise<Response>} كائن الاستجابة إذا كان صحيحاً
   * @throws {Error} إذا كانت الاستجابة تحتوي على خطأ
   */
  async function validateResponse(response, operation) {
    if (!response.ok) {
      const errorData = await response.text();
      const error = new Error(`فشل في ${operation}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = errorData;
      throw error;
    }
    return response;
  }

  /**
   * حساب الشهر التالي بصيغة YYYY-MM
   * @param {string} yyyyMM - الشهر الحالي بصيغة YYYY-MM
   * @returns {string} الشهر التالي بصيغة YYYY-MM
   */
  function nextMonth(yyyyMM){
    const [y,m]=yyyyMM.split('-').map(Number);
    const d=new Date(y, m, 1);
    const yy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0');
    return `${yy}-${mm}`;
  }
  
  /* ====== عمليات قاعدة البيانات ====== */

  /**
   * دالة البحث والاستعلام في قاعدة البيانات
   * تدعم البحث النصي، الفلترة بالتاريخ، والـ pagination
   * @param {Object} filters - معايير البحث والفلترة
   * @param {string} filters.eq_date - البحث بتاريخ محدد
   * @param {string} filters.like_txt - البحث النصي في العميل والموقع ونوع الوحدة
   * @param {string} filters.eq_month - البحث بشهر محدد (YYYY-MM)
   * @param {number} filters.limit - عدد النتائج المطلوبة
   * @param {number} filters.offset - عدد النتائج المراد تخطيها
   * @returns {Promise<Array>} مصفوفة من النتائج
   * @throws {Error} في حالة فشل العملية
   */
  async function supaSelect(filters = {}) {
    return await retryOperation(async () => {
      try {
        // التحقق من وجود الإعدادات المطلوبة
        if (!window.SUPA_URL || !window.TENANT) {
          throw new Error('إعدادات Supabase غير مكتملة');
        }
        
        const url = new URL(`${window.SUPA_URL}/rest/v1/quotes_archive`);
        url.searchParams.set('tenant', `eq.${window.TENANT}`);
        url.searchParams.set('order', 'id.desc');
        
        // تطبيق الفلاتر
        if (filters.eq_date) {
          url.searchParams.set('date', `eq.${filters.eq_date}`);
        }
        if (filters.like_txt) {
          const searchText = filters.like_txt.trim();
          if (searchText) {
            url.searchParams.set('or', `(client.ilike.*${searchText}*,place.ilike.*${searchText}*,unit_type.ilike.*${searchText}*)`);
          }
        }
        if (filters.eq_month) {
          url.searchParams.set('date', `gte.${filters.eq_month}-01`);
          url.searchParams.append('date', `lt.${nextMonth(filters.eq_month)}-01`);
        }
        
        // إضافة pagination إذا كانت متوفرة
        if (filters.limit) {
          url.searchParams.set('limit', filters.limit.toString());
        }
        if (filters.offset) {
          url.searchParams.set('offset', filters.offset.toString());
        }
        
        console.log('🔍 جاري البحث في الأرشيف...', { filters });
        
        const response = await fetch(url, { 
          headers: hdr(),
          signal: AbortSignal.timeout(10000) // مهلة 10 ثواني
        });
        
        await validateResponse(response, 'البحث في الأرشيف');
        const data = await response.json();
        
        console.log('✅ تم البحث بنجاح، عدد النتائج:', data.length);
        return data;
        
      } catch (error) {
        throw handleError(error, 'البحث في الأرشيف');
      }
    });
  }

  /**
   * دالة إدراج سجل جديد في قاعدة البيانات
   * @param {Object} obj - كائن البيانات المراد إدراجه
   * @returns {Promise<Array>} مصفوفة تحتوي على السجل المُدرج
   * @throws {Error} في حالة فشل العملية أو عدم صحة البيانات
   */
  async function supaInsert(obj) {
    return await retryOperation(async () => {
      try {
        // التحقق من صحة البيانات
        if (!obj || typeof obj !== 'object') {
          throw new Error('البيانات المرسلة غير صحيحة');
        }
        
        if (!window.SUPA_URL || !window.TENANT) {
          throw new Error('إعدادات Supabase غير مكتملة');
        }
        
        // إضافة معرف المستأجر
        const dataToInsert = { ...obj, tenant: window.TENANT };
        
        console.log('💾 جاري حفظ البيانات...', { client: dataToInsert.client, date: dataToInsert.date });
        
        const response = await fetch(`${window.SUPA_URL}/rest/v1/quotes_archive`, {
          method: 'POST',
          headers: hdr(),
          body: JSON.stringify(dataToInsert),
          signal: AbortSignal.timeout(15000) // مهلة 15 ثانية للحفظ
        });
        
        await validateResponse(response, 'حفظ البيانات');
        const result = await response.json();
        
        console.log('✅ تم الحفظ بنجاح، ID:', result[0]?.id);
        return result;
        
      } catch (error) {
        throw handleError(error, 'حفظ البيانات');
      }
    });
  }

  /**
   * دالة تحديث سجل موجود في قاعدة البيانات
   * @param {number|string} id - معرف السجل المراد تحديثه
   * @param {Object} obj - كائن البيانات الجديدة
   * @returns {Promise<Array>} مصفوفة تحتوي على السجل المُحدث
   * @throws {Error} في حالة فشل العملية أو عدم صحة المعاملات
   */
  async function supaUpdate(id, obj) {
    return await retryOperation(async () => {
      try {
        // التحقق من صحة المعاملات
        if (!id || (!Number.isInteger(+id) && +id <= 0)) {
          throw new Error('معرف السجل غير صحيح');
        }
        
        if (!obj || typeof obj !== 'object') {
          throw new Error('البيانات المرسلة غير صحيحة');
        }
        
        if (!window.SUPA_URL || !window.TENANT) {
          throw new Error('إعدادات Supabase غير مكتملة');
        }
        
        // إضافة معرف المستأجر
        const dataToUpdate = { ...obj, tenant: window.TENANT };
        
        const url = new URL(`${window.SUPA_URL}/rest/v1/quotes_archive`);
        url.searchParams.set('id', `eq.${id}`);
        url.searchParams.set('tenant', `eq.${window.TENANT}`);
        
        console.log('🔄 جاري تحديث البيانات...', { id, client: dataToUpdate.client });
        
        const response = await fetch(url, {
          method: 'PATCH',
          headers: hdr(),
          body: JSON.stringify(dataToUpdate),
          signal: AbortSignal.timeout(15000) // مهلة 15 ثانية
        });
        
        await validateResponse(response, 'تحديث البيانات');
        const result = await response.json();
        
        console.log('✅ تم التحديث بنجاح');
        return result;
        
      } catch (error) {
        throw handleError(error, 'تحديث البيانات');
      }
    });
  }

  /**
   * دالة حذف سجل من قاعدة البيانات
   * @param {number|string} id - معرف السجل المراد حذفه
   * @returns {Promise<boolean>} true في حالة نجاح الحذف
   * @throws {Error} في حالة فشل العملية أو عدم صحة المعرف
   */
  async function supaDelete(id) {
    return await retryOperation(async () => {
      try {
        // التحقق من صحة المعاملات
        if (!id || (!Number.isInteger(+id) && +id <= 0)) {
          throw new Error('معرف السجل غير صحيح');
        }
        
        if (!window.SUPA_URL || !window.TENANT) {
          throw new Error('إعدادات Supabase غير مكتملة');
        }
        
        const url = new URL(`${window.SUPA_URL}/rest/v1/quotes_archive`);
        url.searchParams.set('id', `eq.${id}`);
        url.searchParams.set('tenant', `eq.${window.TENANT}`);
        
        console.log('🗑️ جاري حذف السجل...', { id });
        
        const response = await fetch(url, {
          method: 'DELETE',
          headers: hdr(),
          signal: AbortSignal.timeout(10000) // مهلة 10 ثواني
        });
        
        await validateResponse(response, 'حذف السجل');
        
        console.log('✅ تم الحذف بنجاح');
        return true;
        
      } catch (error) {
        throw handleError(error, 'حذف السجل');
      }
    });
  }

  /**
   * دالة جلب سجل واحد بالمعرف من قاعدة البيانات
   * @param {number|string} id - معرف السجل المطلوب
   * @returns {Promise<Object|null>} السجل المطلوب أو null إذا لم يوجد
   * @throws {Error} في حالة فشل العملية أو عدم صحة المعرف
   */
  async function supaGetById(id) {
    return await retryOperation(async () => {
      try {
        // التحقق من صحة المعاملات
        if (!id || (!Number.isInteger(+id) && +id <= 0)) {
          throw new Error('معرف السجل غير صحيح');
        }
        
        if (!window.SUPA_URL || !window.TENANT) {
          throw new Error('إعدادات Supabase غير مكتملة');
        }
        
        const url = new URL(`${window.SUPA_URL}/rest/v1/quotes_archive`);
        url.searchParams.set('id', `eq.${id}`);
        url.searchParams.set('tenant', `eq.${window.TENANT}`);
        url.searchParams.set('limit', '1');
        
        console.log('🔍 جاري جلب السجل...', { id });
        
        const response = await fetch(url, { 
          headers: hdr(),
          signal: AbortSignal.timeout(10000) // مهلة 10 ثواني
        });
        
        await validateResponse(response, 'جلب السجل');
        const data = await response.json();
        
        const record = data.length > 0 ? data[0] : null;
        console.log('✅ تم جلب السجل:', record ? 'موجود' : 'غير موجود');
        return record;
        
      } catch (error) {
        throw handleError(error, 'جلب السجل');
      }
    });
  }

  /* ====== التصدير للنافذة العامة ====== */
  
  // تصدير الدوال للاستخدام في باقي التطبيق
  window.Supa = { select: supaSelect, insert: supaInsert, update: supaUpdate, del: supaDelete, getById: supaGetById };
})();
