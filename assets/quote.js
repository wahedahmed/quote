(function () {
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const toNum = (v) => (v===''||v==null)?0:(isFinite(+v)?+v:0);
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const money = (n)=> (Math.round(n*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

  // مفاتيح المسودة (محليًا فقط)
  const KEY='quote_min_clean_v2';

  // عناصر (كما هي)
  const qSubTotal=$('qSubTotal'), qCurrency=$('qCurrency'), qDiscount=$('qDiscount'), qDiscountType=$('qDiscountType');
  const qTaxMode=$('qTaxMode'), qTax=$('qTax'), qTaxValueOut=$('qTaxValue'), qFinalOut=$('qFinal'), qCurOut=$('qCurOut'), qCurOut1=$('qCurOut1'), qFinalFoot=$('qFinalFoot');
  const qPayPlan=$('qPayPlan'), planFields=$('planFields'), qAmtTable=$('qAmtTable');
  const qCurSpans=$$('.qCur');

  const bullets=$('bullets'), newItem=$('newItem'), addItem=$('addItem'), clearItems=$('clearItems');

  const qDate=$('qDate'), qPlace=$('qPlace'), qClient=$('qClient'), qStatus=$('qStatus');
  const logoInput=$('logoInput'), logoImg=$('logoImg');
  const qValidityChk=$('qValidityChk'), qValidity=$('qValidity');
  const qPayTo=$('qPayTo'), qIBAN=$('qIBAN'), qAcct=$('qAcct'), qSigner=$('qSigner'), qSignerPhone=$('qSignerPhone');

  const btnPrint=$('btnPrint'), btnSave=$('btnSave'), btnLoad=$('btnLoad'), btnReset=$('btnReset'), btnArchive=$('btnArchive');
  const paySummary=$('paySummary');

  const defaultBullets = [
    "تنظيف الأبواب","تنظيف الجدران","تنظيف وجلي الأرضيات","تنظيف الزجاج والألمنيوم",
    "تنظيف المطابخ","تنظيف مفاتيح الكهرباء","تنظيف دورات المياه","تنظيف السطح الخارجي",
    "تنظيف الحوش","تنظيف الخزان العلوي","تنظيف الخزان الأرضي"
  ];

  /* ====== بنود ====== */
  function addBullet(text){
    if(!text || !text.trim()) return;
    const li = document.createElement('li');
    const span = document.createElement('span'); span.className='txt'; span.textContent=text.trim();
    const btn = document.createElement('button'); btn.className='del'; btn.type='button'; btn.textContent='حذف';
    btn.addEventListener('click',()=>{ li.remove(); save(); });
    li.appendChild(span); li.appendChild(btn); bullets.appendChild(li);
  }
  addItem?.addEventListener('click',()=>{ addBullet(newItem.value); newItem.value=''; save(); });
  newItem?.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ addBullet(newItem.value); newItem.value=''; save(); } });
  clearItems?.addEventListener('click',()=>{ if(confirm('مسح البنود؟')){ bullets.innerHTML=''; save(); } });

  /* ====== حسابات ====== */
  function compute(){
    const currency=qCurrency.value||'SAR';
    const sub=Math.max(0,toNum(qSubTotal.value));
    let discVal=Math.max(0,toNum(qDiscount.value));
    const discType=qDiscountType.value;
    const taxRate=Math.max(0,toNum(qTax.value));
    const taxMode=qTaxMode.value;

    if(discType==='percent'){ discVal=sub*clamp(discVal,0,100)/100; } else { discVal=Math.min(discVal,sub); }
    const base=sub-discVal;

    let taxValue=0, total=0;
    if(taxMode==='exclusive'){ taxValue=base*taxRate/100; total=base+taxValue; }
    else{ total=base; taxValue= total * (taxRate/(100+taxRate) || 0); }

    qCurOut.textContent=currency; qCurOut1.textContent=currency; qCurSpans.forEach(s=>s.textContent=currency);
    qTaxValueOut.textContent=money(taxValue);
    qFinalOut.textContent=money(total);
    qFinalFoot.textContent=money(total);

    rebuildInstallments(total);
    buildPrintSummary(total);
    return total;
  }
  [qSubTotal,qDiscount,qTax].forEach(el=> el?.addEventListener('input',()=>{ if(toNum(el.value)<0) el.value='0'; compute(); save(); }));
  [qCurrency,qDiscountType,qTaxMode,qDate,qPlace,qClient,qStatus].forEach(el=> el?.addEventListener('change',()=>{ compute(); save(); }));

  /* ====== الدفعات ====== */
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
  qPayPlan.addEventListener('change',()=>{ buildPlanFields(qPayPlan.value); compute(); save(); });

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

  /* ====== شعار + حفظ/تحميل/طباعة ====== */
  logoInput?.addEventListener('change',(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const rd=new FileReader();
    rd.onload=()=>{ logoImg.src=rd.result; logoImg.style.display='block'; save(); };
    rd.readAsDataURL(f);
  });
  btnPrint?.addEventListener('click',()=>window.print());
  btnSave?.addEventListener('click',()=>{ save(); alert('تم حفظ المسودة محليًا.'); });
  btnLoad?.addEventListener('click',()=>{ load(); compute(); alert('تم فتح المسودة.'); });
  btnReset?.addEventListener('click',()=>{ if(confirm('بدء نموذج جديد؟')){ localStorage.removeItem(KEY); location.reload(); } });

  /* ====== حفظ المسودة (محلي) ====== */
  function serialize(){
    return {
      date:qDate?.value||'', place:qPlace?.value||'', client:qClient?.value||'', status:qStatus?.value||'active',
      subtotal:qSubTotal.value, currency:qCurrency.value, discount:qDiscount.value, discountType:qDiscountType.value,
      taxMode:qTaxMode.value, tax:qTax.value, payPlan:qPayPlan.value, p1:$('qPct_1')?.value||'',
      valid:qValidityChk?.checked||false, validDays:qValidity?.value||30,
      payTo:qPayTo?.value||'', iban:qIBAN?.value||'', acct:qAcct?.value||'',
      signer:qSigner?.value||'', signerPhone:qSignerPhone?.value||'',
      bullets:[...bullets.querySelectorAll('li')].map(li => li.querySelector('.txt')?.textContent ?? li.textContent),
      logo: (logoImg?.src && logoImg.style.display!=='none') ? logoImg.src : ''
    };
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(serialize())); } catch(e){ console.error(e); } }
  function load(){
    const raw=localStorage.getItem(KEY);
    bullets.innerHTML='';
    if(!raw){ defaultBullets.forEach(addBullet); return; }
    try{
      const d=JSON.parse(raw);
      qDate.value=d.date||''; qPlace.value=d.place||''; qClient.value=d.client||''; if(qStatus) qStatus.value=d.status||'active';
      qSubTotal.value=d.subtotal??'0'; qCurrency.value=d.currency||'SAR';
      qDiscount.value=d.discount??'0'; qDiscountType.value=d.discountType||'amount';
      qTaxMode.value=d.taxMode||'exclusive'; qTax.value=d.tax??'15';
      qPayPlan.value=(d.payPlan==='2'?'2':'1'); buildPlanFields(qPayPlan.value);
      if(d.p1 && $('qPct_1')) $('qPct_1').value=d.p1;
      qValidityChk.checked=!!d.valid; qValidity.value=d.validDays??30;
      qPayTo.value=d.payTo||''; qIBAN.value=d.iban||''; qAcct.value=d.acct||'';
      qSigner.value=d.signer||''; qSignerPhone.value=d.signerPhone||'';
      if (d.bullets && d.bullets.length) d.bullets.forEach(addBullet); else defaultBullets.forEach(addBullet);
      if(d.logo){ logoImg.src=d.logo; logoImg.style.display='block'; }
    }catch(e){ console.error(e); }
  }

  /* ====== الأرشيف الدائم (Supabase) ====== */
  async function archiveSnapshot(){
    if(!window.Supa) return alert('Supabase غير محمّل.');
    const snap = serialize();
    const total = compute();
    const record = {
      created_at: new Date().toISOString(),
      date: snap.date || null,
      client: snap.client || null,
      place: snap.place || null,
      status: snap.status || 'active',
      subtotal: toNum(snap.subtotal),
      discount: toNum(snap.discount),
      discount_type: snap.discountType,
      tax_mode: snap.taxMode,
      tax: toNum(snap.tax),
      currency: snap.currency,
      pay_plan: snap.payPlan==='2'?2:1,
      p1: snap.p1? +snap.p1 : (snap.payPlan==='2'?50:100),
      total: total,
      valid: !!snap.valid,
      valid_days: snap.validDays? +snap.validDays : 30,
      pay_to: snap.payTo || null,
      iban: snap.iban || null,
      acct: snap.acct || null,
      signer: snap.signer || null,
      signer_phone: snap.signerPhone || null,
      logo: snap.logo || null,
      bullets: Array.isArray(snap.bullets) ? snap.bullets : []
    };
    try{
      await Supa.insert(record);
      alert('تمت الأرشفة في القاعدة ✅');
    }catch(err){
      console.error(err);
      alert('تعذّرت الأرشفة. تحقق من config.js و صلاحيات Supabase.');
    }
  }

  btnArchive?.addEventListener('click',()=>{ archiveSnapshot(); });

  // تشغيل
  load();
  if(!qPayPlan.value) qPayPlan.value='1';
  buildPlanFields(qPayPlan.value);
  compute();
})();
