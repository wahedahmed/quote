(function(){
  const $ = (id) => document.getElementById(id);

  const qSearch=$('qSearch'), qDay=$('qDay'), qMonth=$('qMonth'), listWrap=$('listWrap');
  const btnExport=$('btnExport');

  function fmt(n){ return (Math.round((n||0)*100)/100).toLocaleString('en-US',{minimumFractionDigits:2}); }

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
      const t=((x.client||'')+' '+(x.place||'')).toLowerCase();
      if(!t.includes(s)) return false;
    }
    return true;
  }

  async function fetchRows(){
    // بنجيب كل سجلات tenant ونفلتر في الكلاينت (كافي هنا)
    const rows = await Supa.select({});
    return rows.filter(passFilters);
  }

  async function render(){
    try{
      const arr = await fetchRows();
      if(!arr.length){
        listWrap.innerHTML = '<p>لا توجد بيانات في الأرشيف أو لا نتائج مطابقة للفلاتر.</p>';
        return;
      }

      const rows = arr.map((x,i)=>`
        <tr data-id="${x.id}">
          <td>${i+1}</td>
          <td>${x.date||'-'}</td>
          <td>${x.client||'-'}</td>
          <td>${x.place||'-'}</td>
          <td>${x.status==='active'?'شغّال':'مش شغّال'}</td>
          <td class="num">${fmt(x.total)} ${x.currency||''}</td>
          <td>
            <div class="table-actions">
              <button class="mini" data-act="open">فتح</button>
              <button class="mini danger" data-act="del">حذف</button>
            </div>
          </td>
        </tr>
      `).join('');

      listWrap.innerHTML = `
        <div style="overflow:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th>#</th><th>التاريخ</th><th>العميل</th><th>الموقع</th>
                <th>الحالة</th><th>الإجمالي</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;

      // فتح سجل في المسودة ثم الرجوع لصفحة العرض
// فتح سجل في المسودة ثم الرجوع لصفحة العرض
listWrap.querySelectorAll('button[data-act="open"]').forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    const id = +e.target.closest('tr')?.dataset.id;
    const data = await fetchRows();
    const item = data.find(r=>r.id===id);
    if(!item) return;

    const clone = {
      date:item.date, client:item.client, place:item.place, status:item.status,
      subtotal:item.subtotal, currency:item.currency, discount:item.discount, discountType:item.discount_type,
      taxMode:item.tax_mode, tax:item.tax, payPlan:String(item.pay_plan||1), p1:String(item.p1||''),
      valid:item.valid, validDays:item.valid_days, payTo:item.pay_to, iban:item.iban, acct:item.acct,
      signer:item.signer, signerPhone:item.signer_phone, bullets:item.bullets||[], logo:item.logo||''
    };
    localStorage.setItem('quote_min_clean_v2', JSON.stringify(clone));
    localStorage.setItem('quote_edit_id', String(item.id)); // ← مهم: وضع تعديل
    location.href = 'index.html';
  });
});


      // حذف
      listWrap.querySelectorAll('button[data-act="del"]').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          const id = +e.target.closest('tr')?.dataset.id;
          if(!confirm('حذف هذا السجل من الأرشيف؟')) return;
          try{
            await Supa.del(id);
            await render();
          }catch(err){
            console.error(err); alert('تعذّر الحذف. افحص الصلاحيات.');
          }
        });
      });

    }catch(err){
      console.error(err);
      listWrap.innerHTML = '<p>تعذّر تحميل الأرشيف. تأكد من config.js وصلاحيات Supabase.</p>';
    }
  }

  // تصدير CSV حسب النتائج الحاليّة
  btnExport.addEventListener('click', async ()=>{
    try{
      const data = await fetchRows();
      const header = ['id','created_at','date','client','place','status','subtotal','discount','discount_type','tax_mode','tax','currency','pay_plan','p1','total'];
      const rows = data.map(x=> header.map(h=> (''+(x[h]??'')).replaceAll('"','""')).map(v=> `"${v}"`).join(','));
      const csv = header.join(',')+'\n'+rows.join('\n');
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='quotes_archive.csv'; document.body.appendChild(a); a.click();
      setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },0);
    }catch(err){
      console.error(err); alert('تعذّر التصدير.');
    }
  });

  qSearch.addEventListener('input', render);
  qDay.addEventListener('change', render);
  qMonth.addEventListener('change', render);

  render();
})();
