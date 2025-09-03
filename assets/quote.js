/**
 * ====== نظام إدارة عروض الأسعار ======
 * 
 * هذا الملف يحتوي على الوظائف الرئيسية لإدارة عروض الأسعار:
 * 
 * الوظائف الأساسية:
 * - إدارة البنود والعناصر (إضافة، حذف، تعديل)
 * - حساب المبالغ المالية (المجموع، الخصم، الضريبة، الإجمالي)
 * - إدارة خطط الدفع (دفعة واحدة أو دفعتان)
 * - رفع وعرض الشعار
 * - طباعة وحفظ عروض الأسعار
 * 
 * ميزات التحقق والأمان:
 * - التحقق من صحة البيانات المدخلة
 * - رسائل خطأ واضحة باللغة العربية
 * - حفظ المسودات محلياً
 * - حفظ البيانات في قاعدة البيانات
 * 
 * ميزات واجهة المستخدم:
 * - مؤشرات التحميل
 * - رسائل النجاح والخطأ
 * - التصميم المتجاوب
 * - Tooltips للمساعدة
 */

(function () {
  // ====== الدوال المساعدة الأساسية ======
  const $ = (id) => document.getElementById(id);  // اختصار للحصول على عنصر بالـ ID
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));  // اختصار لاختيار عدة عناصر
  const toNum = (v) => (v===''||v==null)?0:(isFinite(+v)?+v:0);  // تحويل القيمة إلى رقم آمن
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));  // تحديد القيمة ضمن نطاق معين
  const money = (n)=> (Math.round(n*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});  // تنسيق المبالغ المالية



  // ====== عناصر واجهة المستخدم ======
  
  // عناصر المبالغ المالية
  const qSubTotal=$('qSubTotal');        // المبلغ الفرعي
  const qCurrency=$('qCurrency');        // العملة
  const qDiscount=$('qDiscount');        // قيمة الخصم
  const qDiscountType=$('qDiscountType'); // نوع الخصم (مبلغ أو نسبة)
  const qTaxMode=$('qTaxMode');          // طريقة حساب الضريبة
  const qTax=$('qTax');                  // نسبة الضريبة
  const qTaxValueOut=$('qTaxValue');     // عرض قيمة الضريبة
  const qFinalOut=$('qFinal');           // المبلغ الإجمالي
  const qCurOut=$('qCurOut');            // عرض العملة الرئيسي
  const qCurOut1=$('qCurOut1');          // عرض العملة الثانوي
  const qFinalFoot=$('qFinalFoot');      // المبلغ الإجمالي في الجدول
  const qCurSpans=$$('.qCur');           // جميع عناصر العملة

  // عناصر خطة الدفع
  const qPayPlan=$('qPayPlan');          // عدد الدفعات
  const planFields=$('planFields');      // حقول خطة الدفع
  const qAmtTable=$('qAmtTable');        // جدول المبالغ
  const paySummary=$('paySummary');      // ملخص الدفع للطباعة

  // عناصر البنود
  const bullets=$('bullets');            // قائمة البنود
  const newItem=$('newItem');            // حقل البند الجديد
  const addItem=$('addItem');            // زر إضافة بند
  const clearItems=$('clearItems');      // زر مسح البنود

  // عناصر المعلومات الأساسية
  const qDate=$('qDate');                // التاريخ
  const qPlace=$('qPlace');              // الموقع
  const qClient=$('qClient');            // اسم العميل
  const qStatus=$('qStatus');            // حالة العرض
  const qUnitType=$('qUnitType');        // نوع الوحدة
  const qUnits=$('qUnits');              // عدد الوحدات

  // عناصر الشعار
  const logoInput=$('logoInput');        // رفع الشعار
  const logoImg=$('logoImg');            // عرض الشعار

  // عناصر الصلاحية
  const qValidityChk=$('qValidityChk');  // تفعيل الصلاحية
  const qValidity=$('qValidity');        // مدة الصلاحية

  // عناصر معلومات الدفع
  const qPayTo=$('qPayTo');              // المستفيد
  const qIBAN=$('qIBAN');                // رقم الآيبان
  const qAcct=$('qAcct');                // تفاصيل الحساب
  const qSigner=$('qSigner');            // المدير المسؤول
  const qSignerPhone=$('qSignerPhone');  // هاتف المدير

  // أزرار التحكم
  const btnPrint=$('btnPrint');          // زر الطباعة
  const btnSave=$('btnSave');            // زر الحفظ
  const btnLoad=$('btnLoad');            // زر التحميل
  const btnReset=$('btnReset');          // زر إعادة التعيين
  const btnArchive=$('btnArchive');      // زر الحفظ

  // ====== البنود الافتراضية لخدمات التنظيف ======
  const defaultBullets = [
    "تنظيف الأبواب","تنظيف الجدران","تنظيف وجلي الأرضيات","تنظيف الزجاج والألمنيوم",
    "تنظيف المطابخ","تنظيف مفاتيح الكهرباء","تنظيف دورات المياه","تنظيف السطح الخارجي",
    "تنظيف الحوش","تنظيف الخزان العلوي","تنظيف الخزان الأرضي"
  ];

  /* ====== وظائف التحقق من صحة البيانات ====== */
  
  /**
   * التحقق من صحة حقل واحد
   * @param {HTMLElement} field - العنصر المراد التحقق منه
   * @param {string} value - القيمة المدخلة
   * @param {string} fieldName - اسم الحقل للعرض في رسائل الخطأ
   * @param {string} validationType - نوع التحقق (required, number, positive, percentage, date, phone, iban)
   * @returns {string[]} - مصفوفة برسائل الخطأ
   */
  function validateField(field, value, fieldName, validationType = 'required') {
    const errors = [];
    
    switch (validationType) {
      case 'required':
        if (!value || !value.toString().trim()) {
          errors.push(`${fieldName} مطلوب`);
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
        break;
        
      case 'number':
        if (value && isNaN(+value)) {
          errors.push(`${fieldName} يجب أن يكون رقماً صحيحاً`);
          field.classList.add('error');
        } else if (+value < 0) {
          errors.push(`${fieldName} يجب أن يكون رقماً موجباً`);
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
        break;
        
      case 'positive':
        if (value && (+value <= 0)) {
          errors.push(`${fieldName} يجب أن يكون أكبر من الصفر`);
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
        break;
        
      case 'percentage':
        if (value && (+value < 0 || +value > 100)) {
          errors.push(`${fieldName} يجب أن يكون بين 0 و 100`);
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
        break;
        
      case 'date':
        if (value && !isValidDate(value)) {
          errors.push(`${fieldName} يجب أن يكون تاريخاً صحيحاً`);
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
        break;
        
      case 'phone':
        if (value && !isValidPhone(value)) {
          errors.push(`${fieldName} يجب أن يكون رقم هاتف صحيح`);
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
        break;
        
      case 'iban':
        if (value && !isValidIBAN(value)) {
          errors.push(`${fieldName} يجب أن يكون رقم IBAN صحيح`);
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
        break;
    }
    
    return errors;
  }
  
  /**
   * التحقق من صحة التاريخ
   * @param {string} dateString - النص المراد التحقق منه كتاريخ
   * @returns {boolean} - true إذا كان التاريخ صحيحاً
   */
  function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
  
  /**
   * التحقق من صحة رقم الهاتف
   * @param {string} phone - رقم الهاتف المراد التحقق منه
   * @returns {boolean} - true إذا كان رقم الهاتف صحيحاً
   */
  function isValidPhone(phone) {
    // التحقق من أرقام الهاتف السعودية والدولية
    const phoneRegex = /^(\+966|0)?[5-9]\d{8}$|^\+\d{10,15}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }
  
  /**
   * التحقق من صحة رقم IBAN
   * @param {string} iban - رقم IBAN المراد التحقق منه
   * @returns {boolean} - true إذا كان رقم IBAN صحيحاً
   */
  function isValidIBAN(iban) {
    // التحقق الأساسي من IBAN السعودي
    const cleanIBAN = iban.replace(/\s+/g, '').toUpperCase();
    return /^SA\d{22}$/.test(cleanIBAN);
  }
  
  /**
   * التحقق من صحة جميع الحقول في النموذج
   * @returns {string[]} - مصفوفة برسائل الخطأ
   */
  function validateAllFields() {
    const errors = [];
    
    // التحقق من الحقول المطلوبة
    errors.push(...validateField(qClient, qClient.value, 'اسم العميل', 'required'));
    errors.push(...validateField(qPlace, qPlace.value, 'الموقع', 'required'));
    
    // التحقق من القيم الرقمية
    errors.push(...validateField(qSubTotal, qSubTotal.value, 'المبلغ الفرعي', 'positive'));
    errors.push(...validateField(qDiscount, qDiscount.value, 'الخصم', 'number'));
    errors.push(...validateField(qTax, qTax.value, 'الضريبة', 'number'));
    errors.push(...validateField(qUnits, qUnits.value, 'عدد الوحدات', 'positive'));
    
    // التحقق من النسب المئوية
    if (qDiscountType.value === '%') {
      errors.push(...validateField(qDiscount, qDiscount.value, 'نسبة الخصم', 'percentage'));
    }
    if (qTaxMode.value === '%') {
      errors.push(...validateField(qTax, qTax.value, 'نسبة الضريبة', 'percentage'));
    }
    
    // التحقق من التاريخ
    if (qDate.value) {
      errors.push(...validateField(qDate, qDate.value, 'التاريخ', 'date'));
    }
    
    // التحقق من رقم الهاتف
    if (qSignerPhone.value) {
      errors.push(...validateField(qSignerPhone, qSignerPhone.value, 'رقم هاتف الموقع', 'phone'));
    }
    
    // التحقق من IBAN
    if (qIBAN.value) {
      errors.push(...validateField(qIBAN, qIBAN.value, 'رقم IBAN', 'iban'));
    }
    
    return errors;
  }
  
  /**
   * عرض رسائل الخطأ للمستخدم
   * @param {string[]} errors - مصفوفة برسائل الخطأ
   * @returns {boolean} - true إذا لم توجد أخطاء
   */
  function showValidationErrors(errors) {
    if (errors.length > 0) {
      const errorMessage = 'يرجى تصحيح الأخطاء التالية:\n\n' + errors.join('\n');
      showError(errorMessage);
      return false;
    }
    return true;
  }

  /* ====== إدارة البنود ====== */
  
  /**
   * إضافة بند جديد إلى قائمة البنود
   * @param {string} text - نص البند المراد إضافته
   */
  function addBullet(text){
    if(!text || !text.trim()) {
      showError('يرجى إدخال نص البند');
      return;
    }
    
    // التحقق من طول النص
    if (text.trim().length > 200) {
      showError('نص البند طويل جداً (الحد الأقصى 200 حرف)');
      return;
    }
    
    const li = document.createElement('li');
    const span = document.createElement('span'); span.className='txt'; span.textContent=text.trim();
    const btn = document.createElement('button'); btn.className='del'; btn.type='button'; btn.textContent='حذف';
    btn.addEventListener('click',()=>{ li.remove(); save(); });
    li.appendChild(span); li.appendChild(btn); bullets.appendChild(li);
  }
  
  // ربط أحداث إدارة البنود
  addItem?.addEventListener('click',()=>{ addBullet(newItem.value); newItem.value=''; save(); });
  newItem?.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ addBullet(newItem.value); newItem.value=''; save(); } });
  clearItems?.addEventListener('click',()=>{ if(confirm('مسح البنود؟')){ bullets.innerHTML=''; save(); } });

  /* ====== الحسابات المالية ====== */
  
  /**
   * حساب المبالغ المالية (الخصم، الضريبة، المجموع النهائي)
   * @returns {number} - المبلغ النهائي بعد الخصم والضريبة
   */
  function compute(){
    const currency=qCurrency.value||'SAR';
    const sub=Math.max(0,toNum(qSubTotal.value));
    let discVal=Math.max(0,toNum(qDiscount.value));
    const discType=qDiscountType.value;
    const taxRate=Math.max(0,toNum(qTax.value));
    const taxMode=qTaxMode.value;

    // حساب قيمة الخصم
    if(discType==='percent'){ discVal=sub*clamp(discVal,0,100)/100; } else { discVal=Math.min(discVal,sub); }
    const base=sub-discVal;

    // حساب الضريبة والمجموع النهائي
    let taxValue=0, total=0;
    if(taxMode==='exclusive'){ taxValue=base*taxRate/100; total=base+taxValue; }
    else{ total=base; taxValue= total * (taxRate/(100+taxRate) || 0); }

    // تحديث عناصر العرض
    qCurOut.textContent=currency; qCurOut1.textContent=currency; qCurSpans.forEach(s=>s.textContent=currency);
    qTaxValueOut.textContent=money(taxValue);
    qFinalOut.textContent=money(total);
    qFinalFoot.textContent=money(total);

    rebuildInstallments(total);
    buildPrintSummary(total);
    return total;
  }
  
  // ربط أحداث الحسابات المالية
  [qSubTotal,qDiscount,qTax].forEach(el=> el?.addEventListener('input',()=>{ if(toNum(el.value)<0) el.value='0'; compute(); save(); }));
  [qCurrency,qDiscountType,qTaxMode,qDate,qPlace,qClient,qStatus,qUnitType,qUnits]
    .forEach(el=> el?.addEventListener('change',()=>{ compute(); save(); }));

  /* ====== إدارة الدفعات ====== */
  
  /**
   * بناء حقول خطة الدفع (دفعة واحدة أو دفعتين)
   * @param {string|number} count - عدد الدفعات (1 أو 2)
   */
  function buildPlanFields(count){
    count = (count==='2'||count===2)?2:1;
    planFields.innerHTML='';
    if(count===1){
      planFields.innerHTML = `<label class="inline"><span>الدفعة 1 %</span><input type="number" id="qPct_1" value="100" min="100" max="100" style="width:110px"/></label>`;
    }else{
      planFields.innerHTML = `
        <label class="inline"><span>الدفعة 1 %</span><input type="number" id="qPct_1" value="50" min="1" max="99" style="width:110px"/></label>
        <label class="inline"><span>الدفعة 2 %</span><input type="number" id="qPct_2" value="50" min="1" max="99" style="width:110px" disabled/></label>
      `;
      const p1Input = $('qPct_1');
      if (p1Input) {
        p1Input.addEventListener('input', () => {
          let p1 = clamp(toNum(p1Input.value), 1, 99);
          p1Input.value = p1;
          const p2Input = $('qPct_2');
          if (p2Input) p2Input.value = 100 - p1;
          compute(); save();
        });
      }
    }
  }
  
  /**
   * إعادة بناء جدول الدفعات بناءً على المبلغ الإجمالي
   * @param {number} total - المبلغ الإجمالي
   */
  function rebuildInstallments(total){
    const count = qPayPlan.value==='2'?2:1;
    document.body.dataset.plan = String(count);
    if( (count===1 && !$('qPct_1')) || (count===2 && !$('qPct_2')) ){ buildPlanFields(count); }
    qAmtTable.innerHTML='';
    if(count===1){
      qAmtTable.innerHTML = `<tr><td style="text-align:center">1</td><td class="num">100%</td><td class="num"><span>${money(total)}</span> <span class="qCur">${qCurrency.value}</span></td></tr>`;
    }else{
      const p1=clamp(toNum($('qPct_1').value||50),1,99);
      const p2=100-p1;
      const a1= total*(p1/100); const a2= total-a1;
      qAmtTable.innerHTML = `
        <tr><td style="text-align:center">1</td><td class="num">${p1.toFixed(0)}%</td><td class="num"><span>${money(a1)}</span> <span class="qCur">${qCurrency.value}</span></td></tr>
        <tr><td style="text-align:center">2</td><td class="num">${p2.toFixed(0)}%</td><td class="num"><span>${money(a2)}</span> <span class="qCur">${qCurrency.value}</span></td></tr>
      `;
    }
  }
  
  // ربط حدث تغيير خطة الدفع
  qPayPlan.addEventListener('change',()=>{ buildPlanFields(qPayPlan.value); compute(); save(); });

  /**
   * بناء ملخص الدفعات للطباعة
   * @param {number} total - المبلغ الإجمالي
   */
  function buildPrintSummary(total){
    const count = qPayPlan.value==='2'?2:1;
    if(count===1){ paySummary.style.display='none'; return; }
    const p1=clamp(toNum($('qPct_1').value||50),1,99), p2=100-p1;
    const a1= total*(p1/100), a2= total-a1;
    paySummary.style.display='block';
    paySummary.innerHTML = `
      <strong>ملخص الدفعات:</strong>
      دفعة 1: ${p1.toFixed(0)}% = ${money(a1)} ${qCurrency.value} — 
      دفعة 2: ${p2.toFixed(0)}% = ${money(a2)} ${qCurrency.value}
    `;
  }

  /* ====== إدارة الشعار والملفات ====== */
  
  // رفع وعرض الشعار
  logoInput?.addEventListener('change',(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const rd=new FileReader();
    rd.onload=()=>{ logoImg.src=rd.result; logoImg.style.display='block'; save(); };
    rd.readAsDataURL(f);
  });
  
  // ربط أحداث الأزرار الرئيسية
  btnPrint?.addEventListener('click',()=>window.print());
  btnReset?.addEventListener('click',()=>{ if(confirm('بدء نموذج جديد؟')){ location.reload(); } });



  /* ====== مؤشرات التحميل والرسائل ====== */
  
  /**
   * عرض مؤشر التحميل
   * @param {string} message - رسالة التحميل
   */
  function showLoading(message = 'جاري التحميل...') {
    // إنشاء عنصر التحميل إذا لم يكن موجوداً
    let loadingEl = $('loadingIndicator');
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = 'loadingIndicator';
      loadingEl.className = 'loading-overlay';
      loadingEl.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">${message}</div>
        </div>
      `;
      document.body.appendChild(loadingEl);
    } else {
      loadingEl.querySelector('.loading-text').textContent = message;
    }
    loadingEl.style.display = 'flex';
  }

  /**
   * إخفاء مؤشر التحميل
   */
  function hideLoading() {
    const loadingEl = $('loadingIndicator');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }

  /**
   * عرض رسالة نجاح مؤقتة
   * @param {string} message - رسالة النجاح
   */
  function showSuccess(message) {
    hideLoading();
    // إنشاء رسالة نجاح مؤقتة
    const successEl = document.createElement('div');
    successEl.className = 'success-message';
    successEl.innerHTML = `
      <div class="success-content">
        <span class="success-icon">✅</span>
        <span class="success-text">${message}</span>
      </div>
    `;
    document.body.appendChild(successEl);
    
    // إزالة الرسالة بعد 3 ثواني
    setTimeout(() => {
      if (successEl.parentNode) {
        successEl.parentNode.removeChild(successEl);
      }
    }, 3000);
  }

  /**
   * عرض رسالة خطأ مع إمكانية الإغلاق
   * @param {string} message - رسالة الخطأ
   */
  function showError(message) {
    hideLoading();
    // إنشاء رسالة خطأ مؤقتة
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.innerHTML = `
      <div class="error-content">
        <span class="error-icon">❌</span>
        <span class="error-text">${message}</span>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    document.body.appendChild(errorEl);
  }

  /* ====== الحفظ في قاعدة البيانات (Supabase) ====== */

/**
 * حفظ عرض السعر في قاعدة البيانات
   * يتضمن التحقق من صحة البيانات والحفظ في Supabase
   */
  async function archiveSnapshot() {
    if (!window.Supa) {
      showError('Supabase غير محمّل. تحقق من إعدادات الاتصال.');
      return;
    }

    // التحقق الشامل من صحة البيانات
    const validationErrors = validateAllFields();
    if (!showValidationErrors(validationErrors)) {
      return; // إيقاف العملية إذا كانت هناك أخطاء
    }
    
    const snap = serialize();
    
    // التحقق من وجود بنود في العرض
    if (!snap.bullets || snap.bullets.length === 0) {
      if (!confirm('لا توجد بنود في العرض. هل تريد المتابعة؟')) {
        return;
      }
    }
    
    // التحقق من المبلغ الإجمالي
    const total = compute();
    if (total <= 0) {
      showError('المبلغ الإجمالي يجب أن يكون أكبر من الصفر');
      return;
    }

    const editId = sessionStorage.getItem('quote_edit_id');
    const isUpdate = !!editId;
    
    try {
      // إظهار مؤشر التحميل
      showLoading(isUpdate ? 'جاري تحديث العرض...' : 'جاري حفظ العرض في قاعدة البيانات...');
      
      const total = compute();
      const record = {
        date: snap.date || null,
        client: snap.client.trim(),
        place: snap.place.trim(),
        status: snap.status || 'active',
        unit_type: snap.unitType || null,
        units_count: (snap.units ? +snap.units : 1),
        subtotal: toNum(snap.subtotal),
        discount: toNum(snap.discount),
        discount_type: snap.discountType,
        tax_mode: snap.taxMode,
        tax: toNum(snap.tax),
        currency: snap.currency,
        pay_plan: snap.payPlan === '2' ? 2 : 1,
        p1: snap.p1 ? +snap.p1 : (snap.payPlan === '2' ? 50 : 100),
        total: total,
        valid: !!snap.valid,
        valid_days: snap.validDays ? +snap.validDays : 30,
        pay_to: snap.payTo || null,
        iban: snap.iban || null,
        acct: snap.acct || null,
        signer: snap.signer || null,
        signer_phone: snap.signerPhone || null,
        logo: snap.logo || null,
        bullets: Array.isArray(snap.bullets) ? snap.bullets : [],
        tenant: window.TENANT
      };

      if (isUpdate) {
        await Supa.update(editId, record);
        showSuccess('تم تحديث العرض في قاعدة البيانات بنجاح');
        sessionStorage.removeItem('quote_edit_id');
        // تحديث نص الزر
        if (btnArchive) btnArchive.textContent = 'حفظ العرض';
      } else {
        record.created_at = new Date().toISOString();
        await Supa.insert(record);
        showSuccess('تم حفظ العرض في قاعدة البيانات بنجاح');
      }

      
    } catch (err) {
      console.error('خطأ في الحفظ:', err);
      let errorMessage = 'تعذّرت عملية الحفظ. ';
      
      if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'تحقق من إعدادات config.js وصلاحيات Supabase.';
      }
      
      showError(errorMessage);
    }
  }

  // ربط حدث زر الحفظ
  btnArchive?.addEventListener('click',()=>{ archiveSnapshot(); });

  /* ====== التحقق من صحة البيانات في الوقت الفعلي ====== */
  
  /**
   * إضافة التحقق من صحة البيانات في الوقت الفعلي
   * يتم ربط أحداث blur و change للحقول المختلفة
   */
  function addRealTimeValidation() {
    // التحقق من الحقول المطلوبة
    qClient.addEventListener('blur', () => validateField(qClient, qClient.value, 'اسم العميل', 'required'));
    qPlace.addEventListener('blur', () => validateField(qPlace, qPlace.value, 'الموقع', 'required'));
    
    // التحقق من القيم الرقمية
    qSubTotal.addEventListener('blur', () => {
      validateField(qSubTotal, qSubTotal.value, 'المبلغ الفرعي', 'positive');
      compute(); // إعادة حساب المجموع
    });
    
    qDiscount.addEventListener('blur', () => {
      const validationType = qDiscountType.value === '%' ? 'percentage' : 'number';
      validateField(qDiscount, qDiscount.value, 'الخصم', validationType);
      compute();
    });
    
    qTax.addEventListener('blur', () => {
      const validationType = qTaxMode.value === '%' ? 'percentage' : 'number';
      validateField(qTax, qTax.value, 'الضريبة', validationType);
      compute();
    });
    
    qUnits.addEventListener('blur', () => {
      validateField(qUnits, qUnits.value, 'عدد الوحدات', 'positive');
      compute();
    });
    
    // التحقق من التاريخ
    qDate.addEventListener('blur', () => {
      if (qDate.value) {
        validateField(qDate, qDate.value, 'التاريخ', 'date');
      }
    });
    
    // التحقق من رقم الهاتف
    qSignerPhone.addEventListener('blur', () => {
      if (qSignerPhone.value) {
        validateField(qSignerPhone, qSignerPhone.value, 'رقم هاتف الموقع', 'phone');
      }
    });
    
    // التحقق من IBAN
    qIBAN.addEventListener('blur', () => {
      if (qIBAN.value) {
        validateField(qIBAN, qIBAN.value, 'رقم IBAN', 'iban');
      }
    });
    
    // إعادة التحقق عند تغيير نوع الخصم أو الضريبة
    qDiscountType.addEventListener('change', () => {
      if (qDiscount.value) {
        const validationType = qDiscountType.value === '%' ? 'percentage' : 'number';
        validateField(qDiscount, qDiscount.value, 'الخصم', validationType);
        compute();
      }
    });
    
    qTaxMode.addEventListener('change', () => {
      if (qTax.value) {
        const validationType = qTaxMode.value === '%' ? 'percentage' : 'number';
        validateField(qTax, qTax.value, 'الضريبة', validationType);
        compute();
      }
    });
  }

  /* ====== تهيئة التطبيق ====== */
  
  // تهيئة النموذج
  async function initializeApp() {
    const editId = sessionStorage.getItem('quote_edit_id');
    
    if (editId) {
      // تحميل البيانات من قاعدة البيانات للتعديل
      try {
        showLoading('جاري تحميل البيانات...');
        const record = await Supa.getById(editId);
        if (record) {
          // ملء النموذج بالبيانات المحملة
          qDate.value = record.date || '';
          qPlace.value = record.place || '';
          qClient.value = record.client || '';
          if (qStatus) qStatus.value = record.status || 'active';
          if ($('qUnitType')) $('qUnitType').value = record.unit_type || '';
          if ($('qUnits')) $('qUnits').value = String(record.units_count || '1');
          qSubTotal.value = record.subtotal || '0';
          qCurrency.value = record.currency || 'SAR';
          qDiscount.value = record.discount || '0';
          qDiscountType.value = record.discount_type || 'amount';
          qTaxMode.value = record.tax_mode || 'exclusive';
          qTax.value = record.tax || '15';
          qPayPlan.value = String(record.pay_plan || '1');
          buildPlanFields(qPayPlan.value);
          if (record.p1 && $('qPct_1')) $('qPct_1').value = String(record.p1);
          qValidityChk.checked = !!record.valid;
          qValidity.value = record.valid_days || '30';
          qPayTo.value = record.pay_to || '';
          qIBAN.value = record.iban || '';
          qAcct.value = record.acct || '';
          qSigner.value = record.signer || '';
          qSignerPhone.value = record.signer_phone || '';
          
          // تحميل النقاط
          bullets.innerHTML = '';
          if (record.bullets && record.bullets.length) {
            record.bullets.forEach(addBullet);
          } else {
            defaultBullets.forEach(addBullet);
          }
          
          // تحميل الشعار
          if (record.logo) {
            logoImg.src = record.logo;
            logoImg.style.display = 'block';
          }
          
          // تحديث نص الزر
          if (btnArchive) btnArchive.textContent = 'تحديث العرض';
        }
        hideLoading();
      } catch (error) {
        hideLoading();
        showError('خطأ في تحميل البيانات: ' + error.message);
      }
    } else {
      // تهيئة عادية للنموذج الجديد
      defaultBullets.forEach(addBullet);
    }
    
    if (!qPayPlan.value) qPayPlan.value = '1';
    buildPlanFields(qPayPlan.value);
    compute();
    addRealTimeValidation();
  }
  
  // بدء التهيئة
  initializeApp();
})();
