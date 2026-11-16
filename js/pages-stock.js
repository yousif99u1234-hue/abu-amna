'use strict';
/* =========================================================
   الصفحات: المخزن (المواد، التلف، الأصناف) + الوارد
   ========================================================= */

PS.inv = { tab: 'items', q: '', cat: '', status: 'all' };

Pages.inventory = el => {
  const ps = PS.inv;
  const al = S.alerts();
  const sv = S.stockValue();
  el.innerHTML = `
    <div class="page-head">
      <div><h2>المخزن</h2><p>كل المواد اللي بالمحل — أسعارها وكمياتها وصلاحيتها</p></div>
      <div class="btn-row">
        <button class="btn btn-ghost" data-act="waste-new">${icon('drop', 18)} سجّل تلف</button>
        <button class="btn btn-primary" data-act="add">${icon('plus', 18)} مادة جديدة</button>
      </div>
    </div>
    <div class="grid g-4" style="margin-bottom:18px">
      <div class="card kpi tone-primary"><div class="kpi-top"><span class="kpi-ic">${icon('box')}</span>عدد المواد</div><div class="kpi-val">${S.state.products.length}</div><div class="kpi-sub">بـ ${S.state.categories.length} صنف</div></div>
      <div class="card kpi tone-info"><div class="kpi-top"><span class="kpi-ic">${icon('wallet')}</span>قيمة البضاعة (شراء)</div><div class="kpi-val">${money(sv.cost)}</div><div class="kpi-sub">إذا انباعت كلها: ${moneyT(sv.sell)}</div></div>
      <div class="card kpi tone-warn"><div class="kpi-top"><span class="kpi-ic">${icon('alert')}</span>قاربت تخلص / خالصة</div><div class="kpi-val">${al.low.length} <span class="muted" style="font-size:16px">/ ${al.out.length}</span></div><div class="kpi-sub">اطلبها من المورد</div></div>
      <div class="card kpi tone-danger"><div class="kpi-top"><span class="kpi-ic">${icon('clock')}</span>قربت تنتهي صلاحيتها</div><div class="kpi-val">${al.exp.length}</div><div class="kpi-sub">خلال ${S.set.expiryDays} أيام أو منتهية</div></div>
    </div>
    <div class="tabs">
      <button data-tab="items" class="${ps.tab === 'items' ? 'active' : ''}">${icon('box', 17)} المواد</button>
      <button data-tab="exp" class="${ps.tab === 'exp' ? 'active' : ''}">${icon('clock', 17)} الصلاحية ${al.exp.length ? `<span class="badge danger">${al.exp.length}</span>` : ''}</button>
      <button data-tab="waste" class="${ps.tab === 'waste' ? 'active' : ''}">${icon('drop', 17)} التلف والهدر</button>
      <button data-tab="cats" class="${ps.tab === 'cats' ? 'active' : ''}">${icon('layers', 17)} الأصناف</button>
    </div>
    <div id="inv-body"></div>`;
  const body = $('#inv-body', el);

  function renderBody() {
    if (ps.tab === 'items') renderItems();
    else if (ps.tab === 'exp') renderExp();
    else if (ps.tab === 'waste') renderWaste();
    else renderCats();
  }

  function renderItems() {
    body.innerHTML = `
      <div class="toolbar">
        <div class="search-box">${icon('search')}<input class="input" id="inv-q" placeholder="دوّر بالاسم أو الباركود…" value="${esc(ps.q)}"></div>
        <select class="select" id="inv-cat"><option value="">كل الأصناف</option>${opts(S.state.categories, ps.cat, c => [c.id, `${c.icon} ${c.name}`])}</select>
        <div class="seg" id="inv-st">
          ${[['all', 'الكل'], ['low', 'قاربت تخلص'], ['out', 'خالصة'], ['imported', 'مستورد']].map(([k, l]) => `<button data-st="${k}" class="${ps.status === k ? 'active' : ''}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="card"><div class="table-wrap" id="inv-table"></div></div>`;
    renderTable();
  }
  function renderTable() {
    const q = ps.q.trim().toLowerCase();
    const list = S.state.products.filter(p =>
      (!ps.cat || p.catId === ps.cat) &&
      (!q || p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q)) &&
      (ps.status === 'all' || (ps.status === 'low' && p.stock > 0 && p.stock <= p.min) || (ps.status === 'out' && p.stock <= 0) || (ps.status === 'imported' && p.origin === 'imported')));
    const box = $('#inv-table', body);
    if (!list.length) { box.innerHTML = empty('📦', 'ماكو مواد هنا', 'غيّر البحث أو ضيف مادة جديدة'); return; }
    box.innerHTML = `<table class="table"><thead><tr>
      <th>المادة</th><th>الصنف</th><th>الشراء</th><th>البيع</th><th>الربح</th><th>الموجود</th><th>أقرب انتهاء</th><th></th></tr></thead><tbody>
      ${list.map(p => {
        const c = S.category(p.catId);
        const prof = p.sell - p.buy;
        const pct = p.buy ? Math.round((prof / p.buy) * 100) : 0;
        const ne = S.nearestExp(p);
        const d = ne ? daysUntil(ne) : null;
        const stBadge = p.stock <= 0 ? 'danger' : p.stock <= p.min ? 'warn' : 'ok';
        return `<tr>
          <td><div class="p-name">${pImg(p, 'p-emoji')}<div><b>${esc(p.name)}</b>
            <div class="small muted">${p.origin === 'imported' ? '<span class="badge info">مستورد</span> ' : ''}${p.packName && p.packSize ? `يجي بـ${esc(p.packName)} (${fmtQty(p.packSize)} ${esc(p.unit)})` : ''}${p.fraction ? ' • يتباع بالكسور' : ''}</div></div></div></td>
          <td class="nowrap">${c ? `${c.icon} ${esc(c.name)}` : '<span class="muted">—</span>'}</td>
          <td class="nowrap">${fmtN(p.buy)}</td>
          <td class="nowrap"><b>${fmtN(p.sell)}</b> <span class="small muted">/ ${esc(p.unit)}</span></td>
          <td class="nowrap ${prof >= 0 ? 't-pos' : 't-neg'}">${fmtN(prof)} <span class="small">(${pct}%)</span></td>
          <td class="nowrap"><span class="badge ${stBadge}">${fmtQty(p.stock)} ${esc(p.unit)}</span></td>
          <td class="nowrap">${ne ? `<span class="badge ${d < 0 ? 'danger' : d <= S.set.expiryDays ? 'warn' : ''}">${expLabel(d)}</span>` : '<span class="muted small">—</span>'}</td>
          <td><div class="actions">
            <button class="icon-btn sm ok" data-act="stock" data-id="${p.id}" title="تعديل الكمية / جرد">${icon('scale', 16)}</button>
            <button class="icon-btn sm" data-act="waste" data-id="${p.id}" title="سجّل تلف">${icon('drop', 16)}</button>
            <button class="icon-btn sm" data-act="edit" data-id="${p.id}" title="تعديل">${icon('edit', 16)}</button>
            <button class="icon-btn sm danger" data-act="del" data-id="${p.id}" title="حذف">${icon('trash', 16)}</button>
          </div></td></tr>`;
      }).join('')}</tbody></table>`;
  }

  function renderExp() {
    const rows = [];
    S.state.products.forEach(p => (p.batches || []).forEach(b => rows.push({ p, b, d: daysUntil(b.exp) })));
    rows.sort((a, b) => a.d - b.d);
    body.innerHTML = `<div class="alert-box info" style="margin-bottom:14px">${icon('clock')} <span>الصلاحية تنسجل من وصل الوارد أو من زر الجرد. النظام يبيع الأقدم أول (اللي تنتهي صلاحيته قبل).</span></div>
      <div class="card"><div class="table-wrap">${rows.length ? `<table class="table"><thead><tr><th>المادة</th><th>الكمية</th><th>تاريخ الانتهاء</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.d < 0 ? '' : ''}"><td><div class="p-name">${pImg(r.p, 'p-emoji')}<b>${esc(r.p.name)}</b></div></td>
        <td>${fmtQty(r.b.qty)} ${esc(r.p.unit)}</td><td>${fmtDate(parseDay(r.b.exp))}</td>
        <td><span class="badge ${r.d < 0 ? 'danger' : r.d <= S.set.expiryDays ? 'warn' : 'ok'}">${expLabel(r.d)}</span></td>
        <td><div class="actions">
          ${r.d <= S.set.expiryDays ? `<button class="btn btn-sm btn-ghost" data-act="waste-batch" data-id="${r.p.id}" data-b="${r.b.id}">${icon('drop', 15)} سجّلها تلف</button>` : ''}
          <button class="icon-btn sm danger" data-act="rm-batch" data-id="${r.p.id}" data-b="${r.b.id}" title="شيل التاريخ (الكمية تبقى)">${icon('x', 15)}</button></div></td></tr>`).join('')}
      </tbody></table>` : empty('🗓️', 'ماكو تواريخ صلاحية مسجلة', 'لمن تسجل وصل وارد حط تاريخ الانتهاء ويطلع هنا')}</div></div>`;
  }

  function renderWaste() {
    const list = [...S.state.wastes].reverse();
    const tot = list.reduce((a, w) => a + w.cost, 0);
    const month = list.filter(w => dayKey(w.date).slice(0, 7) === dayKey(new Date()).slice(0, 7)).reduce((a, w) => a + w.cost, 0);
    body.innerHTML = `
      <div class="grid g-2" style="margin-bottom:16px">
        <div class="card kpi tone-danger"><div class="kpi-top"><span class="kpi-ic">${icon('drop')}</span>خسارة التلف هالشهر</div><div class="kpi-val">${money(month)}</div></div>
        <div class="card kpi tone-warn"><div class="kpi-top"><span class="kpi-ic">${icon('trendDown')}</span>خسارة التلف الكلية</div><div class="kpi-val">${money(tot)}</div></div>
      </div>
      <div class="card"><div class="table-wrap">${list.length ? `<table class="table"><thead><tr><th>التاريخ</th><th>المادة</th><th>الكمية</th><th>السبب</th><th>الخسارة</th><th></th></tr></thead><tbody>
      ${list.map(w => `<tr><td class="nowrap">${relDay(w.date)} <span class="muted small">${fmtTime(w.date)}</span></td><td><b>${esc(w.name)}</b>${w.note ? `<div class="small muted">${esc(w.note)}</div>` : ''}</td>
        <td>${fmtQty(w.qty)} ${esc(w.unit)}</td><td><span class="badge">${esc(w.reason)}</span></td><td class="t-neg nowrap">${moneyT(w.cost)}</td>
        <td><div class="actions"><button class="icon-btn sm danger" data-act="del-waste" data-id="${w.id}" title="حذف (ترجع الكمية للمخزن)">${icon('undo', 15)}</button></div></td></tr>`).join('')}
      </tbody></table>` : empty('👌', 'ماكو تلف مسجل', 'إذا خرب شي (روبة حمضت، بيض انكسر…) سجّله حتى تعرف خسارتك الحقيقية')}</div></div>`;
  }

  function renderCats() {
    body.innerHTML = `<div class="btn-row" style="margin-bottom:14px"><button class="btn btn-soft" data-act="cat-add">${icon('plus', 17)} صنف جديد</button></div>
      <div class="grid g-3">${S.state.categories.map((c, i) => {
        const n = S.state.products.filter(p => p.catId === c.id).length;
        return `<div class="card card-pad" style="display:flex;align-items:center;gap:14px">
          <div class="p-emoji" style="width:52px;height:52px;font-size:28px;background:color-mix(in srgb,var(--c${i % 6}) 14%,var(--surface))">${c.icon}</div>
          <div style="flex:1"><b>${esc(c.name)}</b><div class="small muted">${n} مادة</div></div>
          <button class="icon-btn sm" data-act="cat-edit" data-id="${c.id}">${icon('edit', 15)}</button>
          <button class="icon-btn sm danger" data-act="cat-del" data-id="${c.id}">${icon('trash', 15)}</button></div>`;
      }).join('')}</div>`;
  }

  el.addEventListener('click', async e => {
    const t = e.target.closest('[data-tab]');
    if (t) { ps.tab = t.dataset.tab; $$('.tabs [data-tab]', el).forEach(b => b.classList.toggle('active', b === t)); renderBody(); return; }
    const st = e.target.closest('[data-st]');
    if (st) { ps.status = st.dataset.st; $$('[data-st]', el).forEach(b => b.classList.toggle('active', b === st)); renderTable(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.dataset.id;
    switch (b.dataset.act) {
      case 'add': productForm(); break;
      case 'edit': productForm(S.product(id)); break;
      case 'stock': stockForm(S.product(id)); break;
      case 'waste': wasteForm(S.product(id)); break;
      case 'waste-new': wasteForm(); break;
      case 'waste-batch': { const p = S.product(id); const bt = p.batches.find(x => x.id === b.dataset.b); wasteForm(p, bt ? bt.qty : '', daysUntil(bt.exp) < 0 ? 'انتهت صلاحيته' : 'خربان'); break; }
      case 'rm-batch': S.removeBatch(id, b.dataset.b); App.refresh(); break;
      case 'del': {
        const p = S.product(id);
        if (await confirmBox(`تريد تحذف <b>${esc(p.name)}</b>؟ الفواتير القديمة تبقى بس المادة تنشال من القائمة.`, { ok: 'إي احذفها', danger: true })) { S.deleteProduct(id); toast('انحذفت المادة'); App.refresh(); }
        break;
      }
      case 'del-waste':
        if (await confirmBox('تريد تحذف هذا التلف؟ الكمية راح ترجع للمخزن.', { ok: 'إي احذف' })) { S.deleteWaste(id); App.refresh(); }
        break;
      case 'cat-add': categoryForm(); break;
      case 'cat-edit': categoryForm(S.category(id)); break;
      case 'cat-del': {
        if (S.state.products.some(p => p.catId === id)) return toast('ما يصير تحذف صنف بي مواد — انقل المواد لصنف ثاني أول', 'warn');
        if (await confirmBox('تريد تحذف هذا الصنف؟', { ok: 'إي احذف', danger: true })) { S.deleteCategory(id); App.refresh(); }
        break;
      }
    }
  });
  el.addEventListener('input', e => { if (e.target.id === 'inv-q') { ps.q = e.target.value; renderTable(); } });
  el.addEventListener('change', e => { if (e.target.id === 'inv-cat') { ps.cat = e.target.value; renderTable(); } });
  renderBody();
};

/* ---------- نموذج مادة ---------- */
function productForm(p) {
  const isNew = !p;
  const d = p || { name: '', catId: PS.inv.cat || (S.state.categories[0] || {}).id || '', unit: 'كيلو', buy: '', sell: '', stock: '', min: 3, origin: 'local', fraction: true, icon: '📦', supplierId: '', packName: '', packSize: '', barcode: '' };
  const units = UNITS.includes(d.unit) ? UNITS : [...UNITS, d.unit];
  const { el: m, close } = openModal({
    title: isNew ? `${icon('plus')} مادة جديدة` : `${icon('edit')} تعديل: ${esc(d.name)}`, size: 'lg',
    body: `<form class="form-grid" id="pf" autocomplete="off">
      ${field('اسم المادة *', `<input class="input" name="name" value="${esc(d.name)}" required placeholder="مثلاً: روبة جاموس" autofocus>`, '', 'full')}
      ${field('صورة المادة', `<div class="img-pick" id="pf-imgs">
          <button type="button" data-img="" class="${!d.img ? 'active' : ''}" title="بدون صورة (تطلع الأيقونة)">بدون</button>
          ${BRAND_IMAGES.map(x => `<button type="button" data-img="${x.src}" class="${x.src === d.img ? 'active' : ''}" title="${esc(x.label)}"><img src="${x.src}" alt="${esc(x.label)}"></button>`).join('')}
          ${d.img && d.img.startsWith('data:') ? `<button type="button" data-img="${d.img}" class="active" title="صورتك"><img src="${d.img}" alt=""></button>` : ''}
          <button type="button" class="up" data-upload title="ارفع صورة من جهازك">${icon('upload', 18)}</button>
        </div><input type="hidden" name="img" value="${esc(d.img || '')}"><input type="file" id="pf-file" accept="image/*" hidden>`, 'صور منتجات أبو آمنة، أو ارفع صورة من جهازك', 'full')}
      ${field('الأيقونة (إذا ماكو صورة)', `<div class="emoji-pick">${EMOJIS.map(x => `<button type="button" data-emo="${x}" class="${x === d.icon ? 'active' : ''}">${x}</button>`).join('')}</div><input type="hidden" name="icon" value="${esc(d.icon)}">`, '', 'full')}
      ${field('الصنف', `<select class="select" name="catId">${opts(S.state.categories, d.catId, c => [c.id, `${c.icon} ${c.name}`])}</select>`)}
      ${field('وحدة البيع', `<select class="select" name="unit">${opts(units, d.unit)}</select>`)}
      ${field('سعر الشراء (د.ع)', `<input class="input" type="number" name="buy" value="${d.buy}" min="0" placeholder="0">`)}
      ${field('سعر البيع (د.ع) *', `<input class="input" type="number" name="sell" value="${d.sell}" min="0" required placeholder="0">`, '<span id="pf-profit"></span>')}
      ${isNew ? field('الكمية الموجودة هسة', `<input class="input" type="number" step="any" name="stock" value="" placeholder="0">`) + field('تاريخ الانتهاء (إذا تنتهي)', `<input class="input" type="date" name="exp">`) : ''}
      ${field('نبّهني لمن توصل الكمية لـ', `<input class="input" type="number" step="any" name="min" value="${d.min}">`, 'تطلع بالتنبيهات إذا قلّت عن هالرقم')}
      ${field('المصدر', `<div class="seg full" id="pf-origin"><button type="button" data-o="local" class="${d.origin !== 'imported' ? 'active' : ''}">🇮🇶 محلي</button><button type="button" data-o="imported" class="${d.origin === 'imported' ? 'active' : ''}">🌍 مستورد</button></div><input type="hidden" name="origin" value="${d.origin}">`)}
      ${field('المورد', `<select class="select" name="supplierId"><option value="">— بدون —</option>${opts(S.state.suppliers, d.supplierId, s => [s.id, s.name])}</select>`)}
      ${field('يجي من المورد بـ', `<select class="select" name="packName"><option value="">نفس وحدة البيع</option>${opts(UNITS, d.packName)}</select>`, 'مثلاً الجبن يجي بصواني ويتباع بالكيلو')}
      ${field('شكد بيها؟', `<input class="input" type="number" step="any" name="packSize" value="${d.packSize || ''}" placeholder="مثلاً الصينية = 4 كيلو">`)}
      ${field('الباركود (اختياري)', `<input class="input" name="barcode" value="${esc(d.barcode)}" placeholder="امسحه بالقارئ">`)}
      <div class="field" style="justify-content:flex-end"><label class="check"><input type="checkbox" name="fraction" ${d.fraction ? 'checked' : ''}> يتباع بالكسور (ربع، نص، بالمبلغ)</label></div>
    </form>`,
    footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-primary" id="pf-save">${icon('check', 18)} ${isNew ? 'ضيف المادة' : 'احفظ التعديل'}</button>`,
  });
  const f = $('#pf', m);
  const prof = () => {
    const b = num(f.buy.value), s = num(f.sell.value);
    $('#pf-profit', m).innerHTML = s ? `ربحك بالـ${esc(f.unit.value)}: <b class="${s - b >= 0 ? 't-pos' : 't-neg'}">${moneyT(s - b)}</b>${b ? ` (${Math.round(((s - b) / b) * 100)}%)` : ''}` : '';
  };
  prof();
  f.addEventListener('input', prof);
  f.unit.addEventListener('change', () => { f.fraction.checked = f.unit.value === 'كيلو'; prof(); });
  f.catId.addEventListener('change', () => {
    const c = S.category(f.catId.value);
    if (isNew && c && f.icon.value === '📦') { f.icon.value = c.icon; $$('[data-emo]', m).forEach(b => b.classList.toggle('active', b.dataset.emo === c.icon)); }
  });
  const pickImg = b => { f.img.value = b.dataset.img; $$('[data-img]', m).forEach(x => x.classList.toggle('active', x === b)); };
  let imgTouched = !isNew;
  f.name.addEventListener('input', () => {
    if (imgTouched) return;
    const src = autoImg(f.name.value);
    const b = $$('[data-img]', m).find(x => x.dataset.img === src);
    if (b) pickImg(b);
  });
  $('#pf-file', m).addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      // نصغّر الصورة حتى ما تثقّل البيانات
      const c = document.createElement('canvas'), sz = 240, s = Math.min(img.width, img.height);
      c.width = c.height = sz;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, sz, sz);
      const url = c.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(img.src);
      $('[data-upload]', m).insertAdjacentHTML('beforebegin', `<button type="button" data-img="${url}" title="صورتك"><img src="${url}" alt=""></button>`);
      imgTouched = true;
      pickImg($('[data-upload]', m).previousElementSibling);
    };
    img.src = URL.createObjectURL(file);
  });
  m.addEventListener('click', e => {
    const im = e.target.closest('[data-img]');
    if (im) { imgTouched = true; pickImg(im); }
    if (e.target.closest('[data-upload]')) $('#pf-file', m).click();
    const em = e.target.closest('[data-emo]');
    if (em) { f.icon.value = em.dataset.emo; $$('[data-emo]', m).forEach(b => b.classList.toggle('active', b === em)); }
    const o = e.target.closest('[data-o]');
    if (o) { f.origin.value = o.dataset.o; $$('[data-o]', m).forEach(b => b.classList.toggle('active', b === o)); }
  });
  const save = () => {
    const name = f.name.value.trim();
    if (!name) { f.name.focus(); return toast('اكتب اسم المادة', 'warn'); }
    if (num(f.sell.value) <= 0) { f.sell.focus(); return toast('اكتب سعر البيع', 'warn'); }
    if (S.state.products.some(x => x.name === name && (!p || x.id !== p.id))) return toast('اكو مادة بنفس هذا الاسم', 'warn');
    const data = {
      name, icon: f.icon.value, img: f.img.value, catId: f.catId.value, unit: f.unit.value, buy: Math.round(num(f.buy.value)), sell: Math.round(num(f.sell.value)),
      min: num(f.min.value), origin: f.origin.value, supplierId: f.supplierId.value, packName: f.packName.value, packSize: num(f.packSize.value),
      barcode: f.barcode.value.trim(), fraction: f.fraction.checked,
    };
    if (isNew) { data.stock = num(f.stock.value); S.saveProduct(data, { exp: f.exp.value }); toast(`انضافت ${esc(name)} ✓`); }
    else { data.id = p.id; S.saveProduct(data); toast('انحفظ التعديل ✓'); }
    close();
    App.refresh();
  };
  $('#pf-save', m).onclick = save;
  f.addEventListener('submit', e => { e.preventDefault(); save(); });
}

/* ---------- جرد / تعديل كمية ---------- */
function stockForm(p) {
  let mode = 'add';
  const { el: m, close } = openModal({
    title: `${icon('scale')} كمية ${esc(p.name)}`,
    body: `
      <div class="qd-head">${pImg(p, 'pe')}<div><div class="muted small">الموجود حسب النظام</div><b style="font-size:22px">${fmtQty(p.stock)} ${esc(p.unit)}</b></div></div>
      <div class="seg full" style="margin-bottom:14px"><button data-m="add" class="active">➕ إضافة</button><button data-m="sub">➖ تنقيص</button><button data-m="set">📋 جرد (الكمية الصحيحة)</button></div>
      <div class="form-grid">
        ${field('<span id="sf-l">شكد تضيف؟</span>', `<input class="input" type="number" step="any" id="sf-q" autofocus>`)}
        ${field('تاريخ الانتهاء', `<input class="input" type="date" id="sf-exp">`, 'اختياري — للإضافة بس', 'sf-expf')}
      </div>
      <div class="qd-prev"><span>الكمية الجديدة راح تصير</span><b id="sf-new">${fmtQty(p.stock)} ${esc(p.unit)}</b></div>
      ${p.batches.length ? `<h4 class="mt-l" style="margin-bottom:8px">تواريخ الصلاحية المسجلة</h4><div class="list">${p.batches.map(b => `<div class="li"><div class="li-main">${fmtQty(b.qty)} ${esc(p.unit)} — ${fmtDate(parseDay(b.exp))}</div><span class="badge ${daysUntil(b.exp) < 0 ? 'danger' : daysUntil(b.exp) <= S.set.expiryDays ? 'warn' : 'ok'}">${expLabel(daysUntil(b.exp))}</span></div>`).join('')}</div>` : ''}
      <p class="small muted" style="margin-bottom:0">💡 إذا الكمية نقصت لأن الشي خرب، استعمل "سجّل تلف" بدال التنقيص حتى تنحسب الخسارة.</p>`,
    footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-primary" id="sf-save">${icon('check', 18)} احفظ</button>`,
  });
  const qI = $('#sf-q', m);
  const calc = () => {
    const q = num(qI.value);
    const n = mode === 'set' ? q : mode === 'add' ? p.stock + q : p.stock - q;
    $('#sf-new', m).textContent = `${fmtQty(n)} ${p.unit}`;
  };
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    mode = b.dataset.m;
    $$('[data-m]', m).forEach(x => x.classList.toggle('active', x === b));
    $('#sf-l', m).textContent = mode === 'add' ? 'شكد تضيف؟' : mode === 'sub' ? 'شكد تنقص؟' : 'الكمية الصحيحة بعد العد';
    $('.sf-expf', m).style.visibility = mode === 'add' ? 'visible' : 'hidden';
    calc(); qI.focus();
  });
  qI.addEventListener('input', calc);
  const save = () => {
    if (qI.value === '') return qI.focus();
    S.adjustStock(p.id, mode, num(qI.value), $('#sf-exp', m).value);
    close(); toast('انحفظت الكمية ✓'); App.refresh();
  };
  $('#sf-save', m).onclick = save;
  qI.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
}

/* ---------- تلف ---------- */
function wasteForm(p, qty = '', reason = 'خربان') {
  const prods = [...S.state.products].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const { el: m, close } = openModal({
    title: `${icon('drop')} تسجيل تلف / هدر`,
    body: `<div class="form-grid">
      ${field('المادة', `<select class="select" id="wf-p">${opts(prods, p ? p.id : '', x => [x.id, `${x.icon} ${x.name} (${fmtQty(x.stock)} ${x.unit})`])}</select>`, '', 'full')}
      ${field('الكمية', `<input class="input" type="number" step="any" id="wf-q" value="${qty}" autofocus>`, '<span id="wf-u"></span>')}
      ${field('السبب', `<select class="select" id="wf-r">${opts(WASTE_REASONS, reason)}</select>`)}
      ${field('ملاحظة', `<input class="input" id="wf-n" placeholder="اختياري">`, '', 'full')}
    </div>
    <div class="qd-prev" style="background:var(--danger-soft);color:var(--danger)"><span>الخسارة (بسعر الشراء)</span><b id="wf-c">0 د.ع</b></div>`,
    footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-danger" id="wf-save">${icon('check', 18)} سجّل التلف</button>`,
  });
  const sel = $('#wf-p', m), qI = $('#wf-q', m);
  const calc = () => { const x = S.product(sel.value); if (!x) return; $('#wf-u', m).textContent = `بالـ${x.unit}`; $('#wf-c', m).textContent = moneyT(num(qI.value) * x.buy); };
  calc();
  m.addEventListener('input', calc);
  m.addEventListener('change', calc);
  $('#wf-save', m).onclick = () => {
    const q = num(qI.value);
    if (!sel.value || q <= 0) return qI.focus();
    S.addWaste({ pid: sel.value, qty: q, reason: $('#wf-r', m).value, note: $('#wf-n', m).value });
    close(); toast('انسجل التلف وانقصت الكمية'); App.refresh();
  };
}

/* ---------- صنف ---------- */
function categoryForm(c) {
  const d = c || { name: '', icon: '📦' };
  const { el: m, close } = openModal({
    title: c ? 'تعديل الصنف' : 'صنف جديد', size: 'sm',
    body: `${field('الاسم', `<input class="input" id="cf-n" value="${esc(d.name)}" autofocus>`)}
      ${field('الأيقونة', `<div class="emoji-pick">${[...EMOJIS, '🌍'].map(x => `<button type="button" data-emo="${x}" class="${x === d.icon ? 'active' : ''}">${x}</button>`).join('')}</div>`, '', 'mt')}`,
    footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-primary" id="cf-s">احفظ</button>`,
  });
  let ic = d.icon;
  m.addEventListener('click', e => { const b = e.target.closest('[data-emo]'); if (b) { ic = b.dataset.emo; $$('[data-emo]', m).forEach(x => x.classList.toggle('active', x === b)); } });
  $('#cf-s', m).onclick = () => {
    const name = $('#cf-n', m).value.trim();
    if (!name) return $('#cf-n', m).focus();
    S.saveCategory({ ...(c ? { id: c.id } : {}), name, icon: ic });
    close(); App.refresh();
  };
}

/* ================= الوارد (المشتريات) ================= */
PS.pur = { q: '', sup: '' };
Pages.purchases = el => {
  const ps = PS.pur;
  const monthStart = new Date(); monthStart.setDate(1);
  const rep = S.report(startOfDay(monthStart), endOfDay(new Date()));
  const owed = [...S.balances('supplier').values()].filter(v => v > 0).reduce((a, b) => a + b, 0);
  el.innerHTML = `
    <div class="page-head"><div><h2>الوارد</h2><p>البضاعة اللي تجي من الموردين — كل وصل يزيد المخزن تلقائياً</p></div>
      <button class="btn btn-primary" data-act="new">${icon('plus', 18)} وصل وارد جديد</button></div>
    <div class="grid g-3" style="margin-bottom:18px">
      <div class="card kpi tone-info"><div class="kpi-top"><span class="kpi-ic">${icon('truck')}</span>وارد هالشهر</div><div class="kpi-val">${money(rep.purchases)}</div></div>
      <div class="card kpi tone-ok"><div class="kpi-top"><span class="kpi-ic">${icon('cash')}</span>دفعنا هالشهر</div><div class="kpi-val">${money(rep.purchasesPaid + rep.supPay)}</div></div>
      <div class="card kpi tone-danger"><div class="kpi-top"><span class="kpi-ic">${icon('wallet')}</span>علينا للموردين</div><div class="kpi-val">${money(owed)}</div></div>
    </div>
    <div class="toolbar">
      <div class="search-box">${icon('search')}<input class="input" id="pu-q" placeholder="دوّر برقم الوصل أو اسم مادة…" value="${esc(ps.q)}"></div>
      <select class="select" id="pu-s"><option value="">كل الموردين</option>${opts(S.state.suppliers, ps.sup, s => [s.id, s.name])}</select>
    </div>
    <div class="card"><div class="table-wrap" id="pu-t"></div></div>`;
  const render = () => {
    const q = ps.q.trim();
    const list = S.state.purchases.filter(p => (!ps.sup || p.supplierId === ps.sup) && (!q || String(p.no).includes(q) || p.items.some(i => i.name.includes(q)))).reverse();
    $('#pu-t', el).innerHTML = list.length ? `<table class="table"><thead><tr><th>#</th><th>التاريخ</th><th>المورد</th><th>المواد</th><th>المجموع</th><th>الواصل</th><th>الباقي</th><th></th></tr></thead><tbody>
      ${list.map(p => {
        const s = S.supplier(p.supplierId);
        const rest = p.total - p.paid;
        return `<tr><td><b>${p.no}</b></td><td class="nowrap">${relDay(p.date)}</td><td>${s ? esc(s.name) : '<span class="muted">—</span>'}</td>
          <td class="small">${p.items.slice(0, 3).map(i => esc(i.name)).join('، ')}${p.items.length > 3 ? ` +${p.items.length - 3}` : ''}</td>
          <td class="nowrap"><b>${moneyT(p.total)}</b></td><td class="nowrap">${moneyT(p.paid)}</td>
          <td>${rest > 0 ? `<span class="badge warn">${moneyT(rest)}</span>` : '<span class="badge ok">مدفوع</span>'}</td>
          <td><div class="actions"><button class="icon-btn sm" data-act="view" data-id="${p.id}">${icon('eye', 16)}</button><button class="icon-btn sm danger" data-act="del" data-id="${p.id}">${icon('trash', 16)}</button></div></td></tr>`;
      }).join('')}</tbody></table>` : empty('🚚', 'ماكو وصولات وارد', 'لمن تجيك بضاعة من المورد سجّلها هنا حتى يزيد المخزن وتنحسب الكلفة', `<button class="btn btn-primary" data-act="new">${icon('plus', 17)} أول وصل</button>`);
  };
  render();
  el.addEventListener('input', e => { if (e.target.id === 'pu-q') { ps.q = e.target.value; render(); } });
  el.addEventListener('change', e => { if (e.target.id === 'pu-s') { ps.sup = e.target.value; render(); } });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'new') purchaseForm();
    if (b.dataset.act === 'view') viewPurchase(b.dataset.id);
    if (b.dataset.act === 'del') {
      if (await confirmBox('تريد تحذف هذا الوصل؟ الكميات اللي انضافت راح تنشال من المخزن.', { ok: 'إي احذف', danger: true })) { S.deletePurchase(b.dataset.id); toast('انحذف الوصل'); App.refresh(); }
    }
  });
  if (PS.openNew === 'purchases') { PS.openNew = null; purchaseForm(); }
};

function purchaseForm() {
  const prods = [...S.state.products].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const lines = [{ pid: '', qty: '', pack: false, cost: '', exp: '' }];
  let paidTouched = false;
  const prodOpts = sel => S.state.categories.map(c => {
    const ps = prods.filter(p => p.catId === c.id);
    return ps.length ? `<optgroup label="${esc(c.icon + ' ' + c.name)}">${opts(ps, sel, p => [p.id, p.name])}</optgroup>` : '';
  }).join('') + opts(prods.filter(p => !S.category(p.catId)), sel, p => [p.id, p.name]);
  const { el: m, close } = openModal({
    title: `${icon('truck')} وصل وارد جديد`, size: 'xl',
    body: `<div class="form-grid" style="grid-template-columns:2fr 1fr">
        ${field('المورد', `<div style="display:flex;gap:6px"><select class="select" id="pf-sup"><option value="">— اختار المورد —</option>${opts(S.state.suppliers, '', s => [s.id, s.name])}</select><button class="icon-btn ok" id="pf-newsup" title="مورد جديد">${icon('plus', 17)}</button></div>`)}
        ${field('التاريخ', `<input class="input" type="date" id="pf-date" value="${dayKey(new Date())}">`)}
      </div>
      <div class="table-wrap mt"><table class="table line-table"><thead><tr><th style="min-width:200px">المادة</th><th style="width:110px">الكمية</th><th style="width:170px">الوحدة</th><th style="width:130px">سعر الوحدة</th><th style="width:150px">تاريخ الانتهاء</th><th style="width:120px">المجموع</th><th></th></tr></thead><tbody id="pl"></tbody></table></div>
      <button class="btn btn-soft btn-sm mt" id="pf-add">${icon('plus', 16)} سطر ثاني</button>
      <div class="form-grid mt-l">
        ${field('المبلغ اللي دفعته للمورد', `<div style="display:flex;gap:6px"><input class="input" type="number" id="pf-paid" placeholder="0"><button class="btn btn-ghost btn-sm" id="pf-all">كلّه</button><button class="btn btn-ghost btn-sm" id="pf-none">ولا شي</button></div>`, '<span id="pf-rest"></span>')}
        ${field('ملاحظة', `<input class="input" id="pf-note" placeholder="اختياري">`)}
        <div class="full"><label class="check"><input type="checkbox" id="pf-upd" checked> حدّث سعر الشراء بالمخزن حسب هذا الوصل</label></div>
      </div>
      <div class="total-box mt"><span>مجموع الوصل</span><span id="pf-total">0 د.ع</span></div>`,
    footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-primary" id="pf-save">${icon('check', 18)} احفظ الوصل وزيد المخزن</button>`,
  });
  const tb = $('#pl', m);
  const lt = l => Math.round(num(l.qty) * num(l.cost));
  const total = () => lines.reduce((a, l) => a + lt(l), 0);
  const updTotals = () => {
    $('#pf-total', m).textContent = moneyT(total());
    if (!paidTouched) $('#pf-paid', m).value = total() || '';
    const rest = total() - num($('#pf-paid', m).value);
    $('#pf-rest', m).innerHTML = rest > 0 ? `<span class="t-warn">يبقى علينا ${moneyT(rest)} — ينكتب على حساب المورد</span>` : '';
    lines.forEach((l, i) => { const c = $(`[data-tot="${i}"]`, tb); if (c) c.textContent = fmtN(lt(l)); });
  };
  const renderLines = () => {
    tb.innerHTML = lines.map((l, i) => {
      const p = l.pid && S.product(l.pid);
      const unitSel = p ? `<select class="select" data-k="pack" data-i="${i}"><option value="0">${esc(p.unit)}</option>${p.packName && p.packSize ? `<option value="1" ${l.pack ? 'selected' : ''}>${esc(p.packName)} (${fmtQty(p.packSize)} ${esc(p.unit)})</option>` : ''}</select>` : '<span class="muted small">—</span>';
      return `<tr>
        <td><select class="select" data-k="pid" data-i="${i}"><option value="">— اختار —</option>${prodOpts(l.pid)}</select></td>
        <td><input class="input" type="number" step="any" data-k="qty" data-i="${i}" value="${l.qty}"></td>
        <td>${unitSel}</td>
        <td><input class="input" type="number" data-k="cost" data-i="${i}" value="${l.cost}"></td>
        <td><input class="input" type="date" data-k="exp" data-i="${i}" value="${l.exp}"></td>
        <td class="nowrap"><b data-tot="${i}">${fmtN(lt(l))}</b></td>
        <td>${lines.length > 1 ? `<button class="icon-btn sm danger" data-rm="${i}">${icon('x', 15)}</button>` : ''}</td></tr>`;
    }).join('');
    updTotals();
  };
  renderLines();
  tb.addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k || k === 'pid' || k === 'pack') return;
    lines[+e.target.dataset.i][k] = e.target.value; updTotals();
  });
  tb.addEventListener('change', e => {
    const k = e.target.dataset.k, l = lines[+e.target.dataset.i];
    if (k === 'pid') {
      l.pid = e.target.value; l.pack = false;
      const p = S.product(l.pid);
      if (p) { l.cost = p.buy || ''; if (p.packName && p.packSize) { l.pack = true; l.cost = Math.round(p.buy * p.packSize) || ''; } }
      const sup = $('#pf-sup', m); if (p && p.supplierId && !sup.value) sup.value = p.supplierId;
      renderLines();
      const q = $(`[data-k="qty"][data-i="${e.target.dataset.i}"]`, tb); if (q) q.focus();
    } else if (k === 'pack') {
      const p = S.product(l.pid), np = e.target.value === '1';
      if (np !== l.pack && num(l.cost)) l.cost = Math.round(np ? num(l.cost) * p.packSize : num(l.cost) / p.packSize);
      l.pack = np; renderLines();
    }
  });
  tb.addEventListener('click', e => { const r = e.target.closest('[data-rm]'); if (r) { lines.splice(+r.dataset.rm, 1); renderLines(); } });
  $('#pf-add', m).onclick = () => { lines.push({ pid: '', qty: '', pack: false, cost: '', exp: '' }); renderLines(); };
  $('#pf-paid', m).addEventListener('input', () => { paidTouched = true; updTotals(); });
  $('#pf-all', m).onclick = () => { paidTouched = true; $('#pf-paid', m).value = total(); updTotals(); };
  $('#pf-none', m).onclick = () => { paidTouched = true; $('#pf-paid', m).value = 0; updTotals(); };
  $('#pf-newsup', m).onclick = () => partyForm('supplier', null, s => { const sel = $('#pf-sup', m); sel.insertAdjacentHTML('beforeend', `<option value="${s.id}">${esc(s.name)}</option>`); sel.value = s.id; });
  $('#pf-save', m).onclick = () => {
    const valid = lines.filter(l => l.pid && num(l.qty) > 0);
    if (!valid.length) return toast('ضيف مادة وحدة على الأقل بكمية', 'warn');
    const supplierId = $('#pf-sup', m).value;
    const paid = num($('#pf-paid', m).value);
    if (paid < total() && !supplierId) return toast('اختار المورد إذا باقي عليك فلوس إله', 'warn');
    const ds = $('#pf-date', m).value;
    const date = ds && ds !== dayKey(new Date()) ? new Date(parseDay(ds).setHours(12)).toISOString() : nowISO();
    S.createPurchase({
      supplierId, date, paid, note: $('#pf-note', m).value, updateCost: $('#pf-upd', m).checked,
      lines: valid.map(l => {
        const p = S.product(l.pid), mult = l.pack ? p.packSize : 1;
        return { pid: l.pid, qty: num(l.qty) * mult, cost: num(l.cost) / mult, total: lt(l), exp: l.exp, label: `${fmtQty(num(l.qty))} ${l.pack ? p.packName : p.unit}` };
      }),
    });
    close(); toast('انحفظ الوصل وزاد المخزن ✓'); App.refresh();
  };
}

function viewPurchase(id) {
  const p = S.state.purchases.find(x => x.id === id);
  const s = S.supplier(p.supplierId);
  const html = `<div class="ph"><div><h1>وصل وارد #${p.no}</h1><div class="muted">${esc(S.set.shopName)} — ${fmtDT(p.date)}</div></div><div>${s ? `المورد: <b>${esc(s.name)}</b>` : ''}</div></div>
    <table class="table"><thead><tr><th>المادة</th><th>الكمية</th><th>الكلفة للوحدة</th><th>الانتهاء</th><th>المجموع</th></tr></thead><tbody>
    ${p.items.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.label || `${fmtQty(i.qty)} ${i.unit}`)}</td><td>${fmtN(i.cost)} / ${esc(i.unit)}</td><td>${i.exp ? fmtDate(parseDay(i.exp)) : '—'}</td><td class="n">${moneyT(i.total)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4">المجموع</td><td class="n">${moneyT(p.total)}</td></tr><tr><td colspan="4">الواصل</td><td class="n">${moneyT(p.paid)}</td></tr>${p.total > p.paid ? `<tr><td colspan="4">الباقي</td><td class="n">${moneyT(p.total - p.paid)}</td></tr>` : ''}</tfoot></table>
    ${p.note ? `<p>ملاحظة: ${esc(p.note)}</p>` : ''}`;
  const { el: m } = openModal({ title: `${icon('truck')} وصل وارد #${p.no}`, size: 'lg', body: html, footer: `<button class="btn btn-primary" data-p>${icon('print', 17)} اطبع</button>` });
  $('.ph', m).style.cssText = 'display:flex;justify-content:space-between;margin-bottom:14px';
  $('[data-p]', m).onclick = () => printHTML(html, 'a4');
}
