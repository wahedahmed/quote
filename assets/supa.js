// عميل بسيط جدا باستخدام fetch بدون مكتبات خارجية
(function () {
  const hdr = () => ({
    'apikey': window.SUPA_ANON_KEY,
    'Authorization': `Bearer ${window.SUPA_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  });

  async function supaSelect(filters={}) {
    // بناء الاستعلام مع فلترة tenant
    const url = new URL(`${window.SUPA_URL}/rest/v1/quotes_archive`);
    url.searchParams.set('tenant', `eq.${window.TENANT}`);
    url.searchParams.set('order', 'id.desc');

    // فلاتر إضافية (اختياري)
    if (filters.eq_date)   url.searchParams.set('date', `eq.${filters.eq_date}`);
    if (filters.like_txt)  url.searchParams.set('or', `(client.ilike.*${filters.like_txt}*,place.ilike.*${filters.like_txt}*)`);
    if (filters.eq_month)  url.searchParams.set('date', `gte.${filters.eq_month}-01`);
    if (filters.eq_month)  url.searchParams.append('date', `lt.${nextMonth(filters.eq_month)}-01`);

    const res = await fetch(url, { headers: hdr() });
    if (!res.ok) throw new Error('Select failed');
    return res.json();
  }

  function nextMonth(yyyyMM){
    const [y,m]=yyyyMM.split('-').map(Number);
    const d=new Date(y, m, 1); // الشهر+1
    const yy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0');
    return `${yy}-${mm}`;
  }

  async function supaInsert(obj){
    obj.tenant = window.TENANT;
    const res = await fetch(`${window.SUPA_URL}/rest/v1/quotes_archive`, {
      method:'POST', headers: hdr(), body: JSON.stringify(obj)
    });
    if (!res.ok) throw new Error('Insert failed');
    return res.json();
  }

  async function supaDelete(id){
    const url = new URL(`${window.SUPA_URL}/rest/v1/quotes_archive`);
    url.searchParams.set('id', `eq.${id}`);
    url.searchParams.set('tenant', `eq.${window.TENANT}`);
    const res = await fetch(url, { method: 'DELETE', headers: hdr() });
    if (!res.ok) throw new Error('Delete failed');
    return true;
  }

  window.Supa = { select: supaSelect, insert: supaInsert, del: supaDelete };
})();


async function supaUpdate(id, obj){
  obj.tenant = window.TENANT;
  const url = new URL(`${window.SUPA_URL}/rest/v1/quotes_archive`);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('tenant', `eq.${window.TENANT}`);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: hdr(),
    body: JSON.stringify(obj)
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

window.Supa = { select: supaSelect, insert: supaInsert, del: supaDelete, update: supaUpdate };
