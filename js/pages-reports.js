'use strict';
/* =========================================================
   الصفحات: المصاريف + التقارير + الإعدادات
   ========================================================= */

/* ================= المصاريف ================= */
PS.exp = { month: dayKey(new Date()).slice(0, 7) };
Pages.expenses = el => {
  const ps = PS.exp;
  const list = S.state.expenses.filter(e => dayKey(e.date).slice(0, 7) === ps.month).sort((a, b) => (a.date < b.date ? 1 : -1));
  const tot = list.reduce((a, e) => a + e.amount, 0);
  const byCat = {};
  list.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const [y, mo] = ps.month.split('-').map(Number);
  const rep = S.report(new Date(y, mo - 1, 1), endOfDay(new Date(y, mo, 0)));
  el.innerHTML = `
    <div class="page-head"><div><h2>المصاريف</h2><p>كل شي يطلع من المحل غير البضاعة — مولدة، إيجار، أجور…</p></div>
      <button class="btn btn-primary" data-act="new">${icon('plus', 18)} مصروف جديد</button></div>
    <div class="toolbar"><span class="muted">الشهر:</span><input class="input" type="month" id="ex-m" value="${ps.month}" style="width:auto"></div>
    <div class="grid g-3" style="margin-bottom:18px">
      <div class="card kpi tone-accent"><div class="kpi-top"><span class="kpi-ic">${icon('wallet')}</span>مصاريف ${MONTHS[mo - 1]}</div><div class="kpi-val">${money(tot)}</div><div class="kpi-sub">${list.length} مصروف</div></div>
      <div class="card kpi tone-ok"><div class="kpi-top"><span class="kpi-ic">${icon('trend')}</span>ربح المبيعات بهالشهر</div><div class="kpi-val">${money(rep.gross)}</div></div>
      <div class="card kpi ${rep.net >= 0 ? 'tone-primary' : 'tone-danger'}"><div class="kpi-top"><span class="kpi-ic">${icon('cash')}</span>الصافي بعد المصاريف والتلف</div><div class="kpi-val">${money(rep.net)}</div></div>
    </div>
    <div class="grid g-main">
      <div class="card"><div class="table-wrap">${list.length ? `<table class="table"><thead><tr><th>التاريخ</th><th>النوع</th><th>التفاصيل</th><th>المبلغ</th><th></th></tr></thead><tbody>
        ${list.map(e => `<tr><td class="nowrap">${fmtDate(e.date)}</td><td><span class="badge accent">${esc(e.category)}</span></td><td>${esc(e.note) || '<span class="muted">—</span>'}</td><td class="nowrap"><b>${moneyT(e.amount)}</b></td>
          <td><div class="actions"><button class="icon-btn sm danger" data-act="del" data-id="${e.id}">${icon('trash', 15)}</button></div></td></tr>`).join('')}
        </tbody></table>` : empty('💸', 'ماكو مصاريف بهالشهر', 'سجّل المصاريف حتى تعرف ربحك الصافي الحقيقي')}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('chart')} حسب النوع</h3></div><div class="card-body">${Object.keys(byCat).length ? hBars(Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v }))) : '<p class="muted">—</p>'}</div></div>
    </div>`;
  el.addEventListener('change', e => { if (e.target.id === 'ex-m' && e.target.value) { ps.month = e.target.value; App.refresh(); } });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'new') expenseForm();
    if (b.dataset.act === 'del' && await confirmBox('تريد تحذف هذا المصروف؟', { ok: 'إي احذف', danger: true })) { S.deleteExpense(b.dataset.id); App.refresh(); }
  });
  if (PS.openNew === 'expenses') { PS.openNew = null; expenseForm(); }
};

function expenseForm() {
  const { el: m, close } = openModal({
    title: `${icon('wallet')} مصروف جديد`,
    body: `<div class="field"><span class="lbl">النوع</span><div class="chips" style="flex-wrap:wrap" id="ef-c">${EXPENSE_CATS.map((c, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
      <div class="form-grid mt">
        ${field('المبلغ (د.ع)', `<input class="input" type="number" id="ef-a" autofocus placeholder="0">`)}
        ${field('التاريخ', `<input class="input" type="date" id="ef-d" value="${dayKey(new Date())}">`)}
        ${field('التفاصيل', `<input class="input" id="ef-n" placeholder="مثلاً: اشتراك المولدة ١٠ أمبير">`, '', 'full')}
      </div>`,
    footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-primary" id="ef-s">${icon('check', 18)} سجّل</button>`,
  });
  let cat = EXPENSE_CATS[0];
  m.addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (c) { cat = c.dataset.c; $$('[data-c]', m).forEach(x => x.classList.toggle('active', x === c)); } });
  const save = () => {
    const a = num($('#ef-a', m).value);
    if (a <= 0) return $('#ef-a', m).focus();
    const ds = $('#ef-d', m).value;
    S.addExpense({ category: cat, amount: a, note: $('#ef-n', m).value, date: ds && ds !== dayKey(new Date()) ? new Date(parseDay(ds).setHours(12)).toISOString() : nowISO() });
    close(); toast('انسجل المصروف ✓'); App.refresh();
  };
  $('#ef-s', m).onclick = save;
  m.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
}

/* ================= التقارير ================= */
PS.rep = { period: 'month', from: '', to: '' };
Pages.reports = el => {
  const ps = PS.rep;
  const [f, t] = periodRange(ps.period, ps.from, ps.to);
  const r = S.report(f, t);
  const days = Math.max(1, Math.round((Math.min(+t, Date.now()) - +f) / 864e5) || 1);
  const spanDays = [];
  if (ps.period !== 'all' && days <= 62) for (let d = new Date(f); d <= t && d <= new Date(); d = addDays(d, 1)) spanDays.push({ label: days > 14 ? String(d.getDate()) : `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()}`, title: fmtDate(d), value: r.byDay[dayKey(d)] || 0 });
  const prods = Object.values(r.byProd).sort((a, b) => b.total - a.total);
  const cats = Object.entries(r.byCat).map(([id, v]) => { const c = S.category(id); return { label: c ? c.name : 'محذوف', icon: c ? c.icon : '❔', value: v.total, sub: `ربح ${moneyT(v.profit)}` }; }).sort((a, b) => b.value - a.value);
  const hours = r.byHour.map((v, h) => ({ label: String(h), title: `الساعة ${h}`, value: v })).slice(6, 24);
  const label = ps.period === 'custom' ? `${fmtDate(f)} ← ${fmtDate(t)}` : PERIODS.find(p => p[0] === ps.period)?.[1];

  el.innerHTML = `
    <div class="page-head"><div><h2>التقارير</h2><p>شكد بعت، شكد ربحت، وشنو اللي يمشي — ${esc(label)}</p></div>
      <div class="btn-row"><button class="btn btn-ghost" data-act="csv">${icon('download', 17)} Excel</button><button class="btn btn-primary" data-act="print">${icon('print', 17)} اطبع التقرير</button></div></div>
    <div class="toolbar">
      <div class="seg">${PERIODS.map(([k, l]) => `<button data-p="${k}" class="${ps.period === k ? 'active' : ''}">${l}</button>`).join('')}<button data-p="custom" class="${ps.period === 'custom' ? 'active' : ''}">مخصص</button></div>
      ${ps.period === 'custom' ? `<input class="input" type="date" id="rp-f" value="${ps.from || dayKey(f)}" style="width:auto"> <span class="muted">إلى</span> <input class="input" type="date" id="rp-t" value="${ps.to || dayKey(t)}" style="width:auto">` : ''}
    </div>
    <div class="grid g-4">
      <div class="card kpi hero"><div class="kpi-top"><span class="kpi-ic">${icon('cash')}</span>المبيعات</div><div class="kpi-val">${money(r.sales)}</div><div class="kpi-sub">${r.count} فاتورة • معدل ${moneyT(r.count ? r.sales / r.count : 0)}</div></div>
      <div class="card kpi tone-ok"><div class="kpi-top"><span class="kpi-ic">${icon('trend')}</span>الربح من البيع</div><div class="kpi-val">${money(r.gross)}</div><div class="kpi-sub">${r.sales ? `هامش ${Math.round((r.gross / r.sales) * 100)}%` : '—'} • الكلفة ${moneyT(r.cost)}</div></div>
      <div class="card kpi tone-accent"><div class="kpi-top"><span class="kpi-ic">${icon('wallet')}</span>المصاريف + التلف</div><div class="kpi-val">${money(r.expenses + r.waste)}</div><div class="kpi-sub">مصاريف ${moneyT(r.expenses)} • تلف ${moneyT(r.waste)}</div></div>
      <div class="card kpi ${r.net >= 0 ? 'tone-primary' : 'tone-danger'}"><div class="kpi-top"><span class="kpi-ic">${icon('sparkles')}</span>الربح الصافي</div><div class="kpi-val ${r.net >= 0 ? '' : 't-neg'}">${money(r.net)}</div><div class="kpi-sub">بعد كل المصاريف والتلف</div></div>
    </div>

    <div class="grid g-main mt">
      <div class="card"><div class="card-head"><h3>${icon('chart')} المبيعات حسب اليوم</h3></div><div class="card-body">${spanDays.length ? barChart(spanDays, { height: 190 }).replace('class="bars"', `class="bars ${spanDays.length > 16 ? 'dense' : ''}"`) : '<p class="muted">اختار فترة أقصر حتى يطلع الرسم</p>'}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('cash')} حركة الصندوق (الكاش)</h3></div><div class="card-body">
        <div class="stat-line"><span>قبضنا من المبيعات</span><b class="t-pos">+ ${moneyT(r.cashSales)}</b></div>
        <div class="stat-line"><span>تسديدات الزبائن</span><b class="t-pos">+ ${moneyT(r.custPay)}</b></div>
        <div class="stat-line"><span>دفعنا للموردين</span><b class="t-neg">- ${moneyT(r.purchasesPaid + r.supPay)}</b></div>
        <div class="stat-line"><span>المصاريف</span><b class="t-neg">- ${moneyT(r.expenses)}</b></div>
        <div class="stat-line total"><span>صافي الكاش</span><b class="${r.cashFlow >= 0 ? 't-pos' : 't-neg'}">${moneyT(r.cashFlow)}</b></div>
        <div class="small muted mt">ديون جديدة انكتبت: <b>${moneyT(r.debtNew)}</b> • خصومات: ${moneyT(r.discount)} • مرجعات: ${r.returnsCount} (${moneyT(r.returns)})</div>
      </div></div>
    </div>

    <div class="grid g-2 mt">
      <div class="card"><div class="card-head"><h3>${icon('layers')} حسب الصنف</h3></div><div class="card-body">${cats.length ? hBars(cats) : empty('📊', 'ماكو مبيعات')}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('clock')} أوقات الزحمة</h3><span class="small muted">مبيعات كل ساعة</span></div><div class="card-body">${r.count ? barChart(hours, { height: 170 }).replace('class="bars"', 'class="bars dense"') : empty('⏰', 'ماكو مبيعات')}</div></div>
    </div>

    <div class="card mt"><div class="card-head"><h3>${icon('sparkles')} المواد — شنو اللي يمشي وشنو اللي يربّح</h3></div>
      <div class="card-body"><div class="table-wrap">${prods.length ? `<table class="table"><thead><tr><th>#</th><th>المادة</th><th>الكمية</th><th>المبيعات</th><th>الربح</th><th>نسبة من المبيعات</th></tr></thead><tbody>
        ${prods.map((p, i) => `<tr><td class="muted">${i + 1}</td><td><div class="p-name">${pImg(p, 'p-emoji')}<b>${esc(p.name)}</b></div></td><td class="nowrap">${qtyLabel(p.qty, p.unit)}</td><td class="nowrap"><b>${moneyT(p.total)}</b></td><td class="nowrap t-pos">${moneyT(p.profit)}</td>
          <td style="min-width:140px"><div class="hbar-track"><div class="hbar-fill c0" style="width:${r.sales ? (p.total / r.sales) * 100 : 0}%"></div></div><span class="small muted">${r.sales ? ((p.total / r.sales) * 100).toFixed(1) : 0}%</span></td></tr>`).join('')}
      </tbody></table>` : empty('📦', 'ماكو مبيعات بهالفترة')}</div></div></div>

    ${Object.keys(r.expByCat).length ? `<div class="card mt"><div class="card-head"><h3>${icon('wallet')} المصاريف حسب النوع</h3></div><div class="card-body">${hBars(Object.entries(r.expByCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v })))}</div></div>` : ''}`;

  el.addEventListener('click', e => {
    const p = e.target.closest('[data-p]');
    if (p) { ps.period = p.dataset.p; App.refresh(); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'print') {
      printHTML(`<div class="ph"><div><h1>تقرير ${esc(S.set.shopName)}</h1><div class="muted">${esc(label)} — ${fmtDate(f)} إلى ${fmtDate(t)}</div></div><div class="muted">${fmtDT(new Date())}</div></div>
        <div class="kp"><div>المبيعات<b>${moneyT(r.sales)}</b></div><div>الربح من البيع<b>${moneyT(r.gross)}</b></div><div>المصاريف + التلف<b>${moneyT(r.expenses + r.waste)}</b></div><div>الربح الصافي<b>${moneyT(r.net)}</b></div></div>
        <h2>حركة الصندوق</h2><table><tr><td>قبض المبيعات</td><td class="n">${moneyT(r.cashSales)}</td></tr><tr><td>تسديدات الزبائن</td><td class="n">${moneyT(r.custPay)}</td></tr><tr><td>دفعات الموردين</td><td class="n">${moneyT(r.purchasesPaid + r.supPay)}</td></tr><tr><td>المصاريف</td><td class="n">${moneyT(r.expenses)}</td></tr><tr><th>صافي الكاش</th><th class="n">${moneyT(r.cashFlow)}</th></tr></table>
        <h2>المواد</h2><table><thead><tr><th>المادة</th><th>الكمية</th><th>المبيعات</th><th>الربح</th></tr></thead><tbody>${prods.map(p => `<tr><td>${esc(p.name)}</td><td>${qtyLabel(p.qty, p.unit)}</td><td class="n">${moneyT(p.total)}</td><td class="n">${moneyT(p.profit)}</td></tr>`).join('')}</tbody></table>
        ${Object.keys(r.expByCat).length ? `<h2>المصاريف</h2><table>${Object.entries(r.expByCat).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${moneyT(v)}</td></tr>`).join('')}</table>` : ''}`, 'a4');
    }
    if (a.dataset.act === 'csv') {
      const rows = [['المادة', 'الوحدة', 'الكمية', 'المبيعات', 'الربح']];
      prods.forEach(p => rows.push([p.name, p.unit, p.qty, p.total, Math.round(p.profit)]));
      downloadFile(`تقرير-${dayKey(f)}-${dayKey(t)}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    }
  });
  el.addEventListener('change', e => {
    if (e.target.id === 'rp-f') { ps.from = e.target.value; App.refresh(); }
    if (e.target.id === 'rp-t') { ps.to = e.target.value; App.refresh(); }
  });
};

/* ================= الإعدادات ================= */
Pages.settings = el => {
  const st = S.set;
  const size = new Blob([JSON.stringify(S.state)]).size;
  el.innerHTML = `
    <div class="page-head"><div><h2>الإعدادات</h2><p>معلومات المحل، الوصل، والنسخ الاحتياطي</p></div></div>
    <div class="card card-pad">
      <div class="setting-sec"><div><h3>🏪 معلومات المحل</h3><p>تطلع بالوصل وكشف الحساب ورسائل الواتساب</p></div>
        <div class="form-grid">
          ${field('اسم المحل', `<input class="input" data-s="shopName" value="${esc(st.shopName)}">`)}
          ${field('رقم التلفون', `<input class="input" data-s="phone" dir="ltr" value="${esc(st.phone)}">`)}
          ${field('شعار تحت الاسم', `<input class="input" data-s="tagline" value="${esc(st.tagline)}">`, '', 'full')}
          ${field('العنوان', `<input class="input" data-s="address" value="${esc(st.address)}" placeholder="مثلاً: بغداد — الشارع العام">`, '', 'full')}
          ${field('اسم الكاشير', `<input class="input" data-s="cashier" value="${esc(st.cashier)}" placeholder="اختياري — يطلع بالوصل">`)}
          ${field('كلمة آخر الوصل', `<input class="input" data-s="footer" value="${esc(st.footer)}">`)}
        </div></div>
      <div class="setting-sec"><div><h3>🔔 التنبيهات والطباعة</h3><p>متى ينبهك النظام على الصلاحية</p></div>
        <div class="form-grid">
          ${field('نبهني قبل انتهاء الصلاحية بـ', `<select class="select" data-s="expiryDays">${opts([1, 2, 3, 4, 5, 7, 10], st.expiryDays, v => [v, `${v} ${v === 1 ? 'يوم' : v === 2 ? 'يومين' : 'أيام'}`])}</select>`)}
          <div class="field" style="justify-content:flex-end"><label class="check"><input type="checkbox" data-s="autoPrint" ${st.autoPrint ? 'checked' : ''}> اطبع الوصل تلقائياً بعد كل بيعة</label></div>
          ${field('شكل النظام', `<div class="seg" id="st-theme">${[['auto', '🖥️ حسب الجهاز'], ['light', '☀️ نهاري'], ['dark', '🌙 ليلي']].map(([k, l]) => `<button data-th="${k}" class="${st.theme === k ? 'active' : ''}">${l}</button>`).join('')}</div>`, '', 'full')}
        </div></div>
      <div class="setting-sec"><div><h3>🛡️ النسخ الاحتياطي</h3><p>البيانات محفوظة بهالجهاز بس. سوّي نسخة كل أسبوع وخليها بالفلاش أو أرسلها لنفسك.</p></div>
        <div>
          <div class="alert-box ${st.lastBackup ? 'info' : ''}" style="margin-bottom:14px">${icon('shield')} <span>${st.lastBackup ? `آخر نسخة: ${fmtDT(st.lastBackup)}` : 'بعد ما سويت ولا نسخة احتياطية'} • حجم البيانات: ${(size / 1024).toFixed(0)} KB</span></div>
          <div class="btn-row">
            <button class="btn btn-primary" data-act="backup">${icon('download', 17)} نزّل نسخة احتياطية</button>
            <button class="btn btn-ghost" data-act="restore">${icon('upload', 17)} رجّع من نسخة</button>
            <input type="file" id="st-file" accept=".json,application/json" hidden>
          </div>
        </div></div>
      <div class="setting-sec"><div><h3>🧪 تجربة النظام</h3><p>تريد تشوف النظام شلون يبين وهو مليان؟ ضيف بيانات وهمية (فواتير وزبائن لآخر ٣ أسابيع).</p></div>
        <div class="btn-row"><button class="btn btn-soft" data-act="demo">${icon('sparkles', 17)} ضيف بيانات تجريبية</button></div></div>
      <div class="setting-sec"><div><h3 style="color:var(--danger)">⚠️ منطقة الخطر</h3><p>هاي ما ترجع! سوّي نسخة احتياطية قبلها.</p></div>
        <div class="btn-row">
          <button class="btn btn-ghost" data-act="reset-keep" style="color:var(--danger)">${icon('undo', 17)} صفّر الحسابات وخلّي المواد</button>
          <button class="btn btn-danger" data-act="reset-all">${icon('trash', 17)} امسح كلشي وابدي من جديد</button>
        </div></div>
    </div>
    <p class="muted" style="text-align:center;margin-top:18px;font-family:var(--font-brand);font-size:17px">نظام ${esc(st.shopName)} • ${esc(st.tagline)} • 📞 ${esc(st.phone)}</p>`;

  el.addEventListener('change', e => {
    const k = e.target.dataset.s;
    if (!k) return;
    st[k] = e.target.type === 'checkbox' ? e.target.checked : k === 'expiryDays' ? +e.target.value : e.target.value.trim();
    S.save(); App.chrome(); App.badges();
    toast('انحفظ ✓');
  });
  el.addEventListener('click', async e => {
    const th = e.target.closest('[data-th]');
    if (th) { App.setTheme(th.dataset.th); $$('[data-th]', el).forEach(b => b.classList.toggle('active', b === th)); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    switch (b.dataset.act) {
      case 'backup': doBackup(); break;
      case 'restore': $('#st-file', el).click(); break;
      case 'demo':
        if (await confirmBox('راح تنضاف فواتير وزبائن وهمية. بعدين تكدر تمسحها من "صفّر الحسابات". نكمل؟', { ok: 'إي ضيف' })) { S.generateDemo(); toast('انضافت البيانات التجريبية ✓'); App.go('dashboard'); }
        break;
      case 'reset-keep':
        if (await confirmBox('راح تنمسح كل الفواتير والوارد والزبائن والديون والمصاريف، وتبقى المواد والأصناف والموردين. متأكد؟', { ok: 'إي صفّر', danger: true })) { S.resetAll(true); toast('تصفّرت الحسابات'); App.go('dashboard'); }
        break;
      case 'reset-all':
        if (await confirmBox('راح ينمسح <b>كلشي</b> ويرجع النظام مثل أول مرة. متأكد مية بالمية؟', { ok: 'إي امسح كلشي', danger: true })) { S.resetAll(false); toast('رجع النظام جديد'); App.go('dashboard'); }
        break;
    }
  });
  $('#st-file', el).addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!(await confirmBox(`راح تتبدل كل البيانات الحالية بالنسخة <b>${esc(file.name)}</b>. نكمل؟`, { ok: 'إي رجّعها', danger: true }))) return;
    try { S.importJSON(await file.text()); toast('رجعت البيانات من النسخة ✓'); App.applyTheme(); App.go('dashboard'); }
    catch (err) { toast('الملف مو صحيح: ' + esc(err.message), 'err'); }
    e.target.value = '';
  });
};
