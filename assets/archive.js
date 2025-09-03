/**
 * ملف إدارة صفحة الأرشيف
 * 
 * هذا الملف يدير صفحة عرض وإدارة أرشيف العروض المحفوظة
 * ويتضمن الميزات التالية:
 * 
 * - عرض قائمة العروض مع pagination
 * - البحث والفلترة (نصي، بالتاريخ، بالشهر)
 * - تصدير البيانات إلى CSV
 * - تحرير وحذف العروض
 * - مؤشرات التحميل والرسائل
 * - تصميم متجاوب
 * - معالجة الأخطاء
 */

(function(){
  
  /* ====== الدوال المساعدة والمتغيرات ====== */
  
  // دالة مختصرة للوصول للعناصر
  const $ = (id) => document.getElementById(id);

  // عناصر واجهة المستخدم
  const qSearch=$('qSearch'), qDay=$('qDay'), qMonth=$('qMonth'), listWrap=$('listWrap');
  const btnExport=$('btnExport');

  // إعدادات Pagination
  let currentPage = 1;
  const pageSize = 20; // عدد السجلات في كل صفحة
  let totalRecords = 0;
  let allRecords = []; // تخزين جميع السجلات للبحث والفلترة

  /**
   * تنسيق الأرقام لعرضها بصيغة مناسبة
   * @param {number} n - الرقم المراد تنسيقه
   * @returns {string} الرقم منسق بفاصلتين عشريتين
   */
  function fmt(n){ return (Math.round((n||0)*100)/100).toLocaleString('en-US',{minimumFractionDigits:2}); }

  /* ====== مؤشرات التحميل والرسائل ====== */
  
  /**
   * عرض مؤشر التحميل
   * @param {string} message - رسالة التحميل (افتراضي: 'جاري التحميل...')
   */
  function showLoading(message = 'جاري التحميل...') {
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
    const successEl = document.createElement('div');
    successEl.className = 'success-message';
    successEl.innerHTML = `
      <div class="success-content">
        <span class="success-icon">✅</span>
        <span class="success-text">${message}</span>
      </div>
    `;
    document.body.appendChild(successEl);
    
    setTimeout(() => {
      if (successEl.parentNode) {
        successEl.parentNode.removeChild(successEl);
      }
    }, 3000);
  }

  /**
   * عرض رسالة خطأ
   * @param {string} message - رسالة الخطأ
   */
  function showError(message) {
    hideLoading();
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

  /* ====== دوال البحث والفلترة ====== */
  
  /**
   * فحص ما إذا كان السجل يمر عبر الفلاتر المحددة
   * @param {Object} x - السجل المراد فحصه
   * @returns {boolean} true إذا كان السجل يمر عبر الفلاتر
   */
  function passFilters(x){
    const s=(qSearch.value||'').trim().toLowerCase();
    const d=(qDay.value||'');
    const m=(qMonth.value||'');
    if(d && (x.date||'')!==d) return false;
    if(m){
      const mk=(x.date||'').slice(0,7);
      if(mk!==m) return false;
    }
    if(s){
      // البحث يشمل العميل + الموقع + نوع الوحدة + عدد الوحدات
      const t=(
        (x.client||'')+' '+
        (x.place||'')+' '+
        (x.unit_type||'')+' '+
        String(x.units_count??'')
      ).toLowerCase();
      if(!t.includes(s)) return false;
    }
    return true;
  }

  /**
   * جلب جميع السجلات من قاعدة البيانات
   * @returns {Promise<Array>} مصفوفة جميع السجلات
   * @throws {Error} في حالة فشل جلب البيانات
   */
  async function fetchAllRows(){
    try {
      const rows = await Supa.select({});
      allRecords = rows;
      return rows;
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      throw error;
    }
  }

  /**
   * الحصول على السجلات المفلترة حسب معايير البحث
   * @returns {Array} مصفوفة السجلات المفلترة
   */
  function getFilteredRows() {
    return allRecords.filter(passFilters);
  }

  /**
   * الحصول على السجلات للصفحة الحالية (pagination)
   * @param {Array} filteredRows - السجلات المفلترة
   * @returns {Array} مصفوفة السجلات للصفحة الحالية
   */
  function getPaginatedRows(filteredRows) {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRows.slice(startIndex, endIndex);
  }

  /* ====== دوال Pagination ====== */
  
  /**
   * إنشاء عناصر التحكم في الصفحات (pagination controls)
   * @param {number} totalItems - العدد الإجمالي للعناصر
   * @returns {string} HTML للتحكم في الصفحات
   */
  function createPaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return '';

    let paginationHTML = '<div class="pagination-controls" style="margin: 20px 0; text-align: center;">';
    
    // زر الصفحة السابقة
    if (currentPage > 1) {
      paginationHTML += `<button class="btn ghost" onclick="changePage(${currentPage - 1})">السابق</button>`;
    }
    
    // أرقام الصفحات
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
      paginationHTML += `<button class="btn ghost" onclick="changePage(1)">1</button>`;
      if (startPage > 2) paginationHTML += '<span>...</span>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === currentPage ? 'primary' : 'ghost';
      paginationHTML += `<button class="btn ${activeClass}" onclick="changePage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) paginationHTML += '<span>...</span>';
      paginationHTML += `<button class="btn ghost" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // زر الصفحة التالية
    if (currentPage < totalPages) {
      paginationHTML += `<button class="btn ghost" onclick="changePage(${currentPage + 1})">التالي</button>`;
    }
    
    paginationHTML += `<div style="margin-top: 10px; color: #666;">الصفحة ${currentPage} من ${totalPages} (${totalItems} سجل)</div>`;
    paginationHTML += '</div>';
    
    return paginationHTML;
  }

  /* ====== دوال العرض الرئيسية ====== */
  
  /**
   * دالة العرض الرئيسية لعرض البيانات مع الفلترة والـ pagination
   * @param {boolean} loadData - هل يجب تحميل البيانات من قاعدة البيانات
   */
  async function render(loadData = true){
    try{
      if (loadData) {
        showLoading('جاري تحميل الأرشيف...');
        await fetchAllRows();
      }
      
      const filteredRows = getFilteredRows();
      totalRecords = filteredRows.length;
      
      if(!totalRecords){
        hideLoading();
        listWrap.innerHTML = '<p>لا توجد بيانات في الأرشيف أو لا نتائج مطابقة للفلاتر.</p>';
        return;
      }
      
      const arr = getPaginatedRows(filteredRows);
      hideLoading();

      const rows = arr.map((x,i)=>{
        const globalIndex = (currentPage - 1) * pageSize + i + 1;
        return `
        <tr data-id="${x.id}">
          <td>${globalIndex}</td>`
          <td>${x.date||'-'}</td>
          <td>${x.client||'-'}</td>
          <td>${x.place||'-'}</td>
          <td>${x.unit_type || '-'}</td>
          <td class="num">${x.units_count ?? '-'}</td>
          <td>${x.status==='active'?'شغّال':'مش شغّال'}</td>
          <td class="num">${fmt(x.total)} ${x.currency||''}</td>
          <td>
            <div class="table-actions">
              <button class="mini" data-act="open">فتح</button>
              <button class="mini danger" data-act="del">حذف</button>
            </div>
          </td>
        </tr>
        `;
      }).join('');

      const paginationControls = createPaginationControls(totalRecords);
      
      listWrap.innerHTML = `
        ${paginationControls}
        <div style="overflow:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th>#</th><th>التاريخ</th><th>العميل</th><th>الموقع</th>
                <th>نوع الوحدة</th><th>عدد الوحدات</th>
                <th>الحالة</th><th>الإجمالي</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${paginationControls}
      `;

      // فتح سجل في المسودة
      listWrap.querySelectorAll('button[data-act="open"]').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          try {
            showLoading('جاري تحميل العرض...');
            const id = +e.target.closest('tr')?.dataset.id;
            const item = allRecords.find(r=>r.id===id);
            
            if(!item) {
              showError('لم يتم العثور على العرض المطلوب');
              return;
            }

            sessionStorage.setItem('quote_edit_id', String(item.id));
            hideLoading();
            location.href = 'index.html';
          } catch (error) {
            console.error('خطأ في فتح العرض:', error);
            showError('تعذر فتح العرض. حاول مرة أخرى.');
          }
        });
      });

      // حذف
      listWrap.querySelectorAll('button[data-act="del"]').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          const id = +e.target.closest('tr')?.dataset.id;
          if(!confirm('حذف هذا السجل من الأرشيف؟')) return;
          
          try{
            showLoading('جاري حذف السجل...');
            await Supa.del(id);
            showSuccess('تم حذف السجل بنجاح');
            await render();
          }catch(err){
            console.error('خطأ في الحذف:', err);
            showError('تعذّر الحذف. تحقق من الصلاحيات والاتصال.');
          }
        });
      });

    }catch(err){
      console.error('خطأ في عرض الأرشيف:', err);
      hideLoading();
      showError('تعذّر تحميل الأرشيف. تأكد من إعدادات الاتصال.');
      listWrap.innerHTML = '<p>تعذّر تحميل الأرشيف. تأكد من config.js وصلاحيات Supabase.</p>';
    }
  }

  /**
   * دالة تغيير الصفحة (pagination)
   * @param {number} page - رقم الصفحة المطلوبة
   */
  window.changePage = function(page) {
    currentPage = page;
    render(false); // لا نحتاج لإعادة تحميل البيانات
  }

  /* ====== أحداث التصدير والبحث ====== */
  
  // تصدير CSV حسب النتائج الحاليّة
  btnExport.addEventListener('click', async ()=>{
    try{
      showLoading('جاري تحضير ملف التصدير...');
      const data = getFilteredRows(); // تصدير جميع النتائج المفلترة وليس فقط الصفحة الحالية
      
      if (!data.length) {
        showError('لا توجد بيانات للتصدير');
        return;
      }
      
      const header = [
        'id','created_at','date','client','place','unit_type','units_count',
        'status','subtotal','discount','discount_type','tax_mode','tax',
        'currency','pay_plan','p1','total'
      ];
      const rows = data.map(x=> header
        .map(h=> (''+(x[h]??'')).replaceAll('"','""'))
        .map(v=> `"${v}"`).join(',')
      );
      const csv = header.join(',')+'
'+rows.join('
');
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='quotes_archive.csv';
      document.body.appendChild(a); a.click();
      setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },0);
      
      showSuccess(`تم تصدير ${data.length} سجل بنجاح`);
    }catch(err){
      console.error('خطأ في التصدير:', err);
      showError('تعذّر التصدير. حاول مرة أخرى.');
    }
  });

  // أحداث البحث والفلترة - إعادة العرض عند تغيير المعايير
  qSearch.addEventListener('input', ()=>{
    currentPage = 1; // العودة للصفحة الأولى عند البحث
    render(false); // لا نحتاج لإعادة تحميل البيانات
  });
  qDay.addEventListener('change', ()=>{
    currentPage = 1; // العودة للصفحة الأولى عند البحث
    render(false); // لا نحتاج لإعادة تحميل البيانات
  });
  qMonth.addEventListener('change', ()=>{
    currentPage = 1; // العودة للصفحة الأولى عند البحث
    render(false); // لا نحتاج لإعادة تحميل البيانات
  });
  
  /* ====== تهيئة التطبيق ====== */
  
  // تحميل البيانات وعرضها عند بدء التطبيق

  render();
})();
