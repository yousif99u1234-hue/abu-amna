'use strict';
/* =========================================================
   الصفحات: الفواتير + الزبائن والدين + الموردين
   ========================================================= */

const PERIODS = [['today', 'اليوم'], ['yest', 'البارحة'], ['week', 'آخر ٧ أيام'], ['month', 'هالشهر'], ['lastmonth', 'الشهر الفات'], ['all', 'الكل']];
function periodRange(k, from, to) {
  const n = new Date();
  switch (k) {
    case 'today': return [startOfDay(n), endOfDay(n)];
    case 'yest': return [startOfDay(addDays(n, -1)), endOfDay(addDays(n, -1))];
    case 'week': return [startOfDay(addDays(n, -6)), endOfDay(n)];
    case 'month': return [new Date(n.getFullYear(), n.getMonth(), 1), endOfDay(n)];
    case 'lastmonth': return [new Date(n.getFullYear(), n.getMonth() - 1, 1), endOfDay(new Date(n.getFullYear(), n.getMonth(), 0))];
    case 'custom': return [startOfDay(parseDay(from || dayKey(n))), endOfDay(parseDay(to || dayKey(n)))];
    default: return [new Date(2000, 0, 1), endOfDay(n)];
  }
}

/* ================= الفواتير ================= */
PS.sales = { period: 'today', q: '', type: 'all' };
Pages.sales = el => {
  const ps = PS.sales;
  el.innerHTML = `
    <div class="page-head"><div><h2>الفواتير</h2><p>كل البيعات — تكدر تشوف أي فاتورة، تطبعها أو ترجّعها</p></div>
      <div class="btn-row"><button class="btn btn-ghost" data-act="csv">${icon('download', 17)} Excel</button><button class="btn btn-primary" data-go="pos">${icon('plus', 18)} بيعة جديدة</button></div></div>
    <div class="toolbar">
      <div class="seg" id="sl-p">${PERIODS.map(([k, l]) => `<button data-p="${k}" class="${ps.period === k ? 'active' : ''}">${l}</button>`).join('')}</div>
      <div class="search-box">${icon('search')}<input class="input" id="sl-q" placeholder="رقم الفاتورة، اسم الزبون أو مادة…" value="${esc(ps.q)}"></div>
      <select class="select" id="sl-t">${opts([['all', 'كل الأنواع'], ['cash', 'نقد'], ['debt', 'دين / جزء'], ['ret', 'مُرجعة']], ps.type, x => x)}</select>
    </div>
    <div id="sl-sum" class="grid g-4" style="margin-bottom:16px"></div>
    <div class="card"><div class="table-wrap" id="sl-t-box"></div></div>`;
  let current = [];
  const render = () => {
    const [f, t] = periodRange(ps.period);
    const q = ps.q.trim();
    current = S.state.sales.filter(s => {
      const d = new Date(s.date);
      if (d < f || d > t) return false;
      if (ps.type === 'cash' && (s.returned || s.paid < s.total)) return false;
      if (ps.type === 'debt' && (s.returned || s.paid >= s.total)) return false;
      if (ps.type === 'ret' && !s.returned) return false;
      if (q) {
        const c = s.customerId && S.customer(s.customerId);
        if (!(String(s.no).includes(q) || (c && c.name.includes(q)) || s.items.some(i => i.name.includes(q)))) return false;
      }
      return true;
    }).reverse();
    const ok = current.filter(s => !s.returned);
    const tot = ok.reduce((a, s) => a + s.total, 0);
    const debt = ok.reduce((a, s) => a + s.total - s.paid, 0);
    const profit = ok.reduce((a, s) => a + s.total - s.items.reduce((b, i) => b + i.cost * i.qty, 0), 0);
    $('#sl-sum', el).innerHTML = `
      <div class="card kpi tone-primary"><div class="kpi-top"><span class="kpi-ic">${icon('receipt')}</span>عدد الفواتير</div><div class="kpi-val">${ok.length}</div></div>
      <div class="card kpi tone-info"><div class="kpi-top"><span class="kpi-ic">${icon('cash')}</span>المجموع</div><div class="kpi-val">${money(tot)}</div></div>
      <div class="card kpi tone-ok"><div class="kpi-top"><span class="kpi-ic">${icon('trend')}</span>الربح</div><div class="kpi-val">${money(profit)}</div></div>
      <div class="card kpi tone-warn"><div class="kpi-top"><span class="kpi-ic">${icon('users')}</span>منها دين</div><div class="kpi-val">${money(debt)}</div></div>`;
    $('#sl-t-box', el).innerHTML = current.length ? `<table class="table"><thead><tr><th>#</th><th>الوقت</th><th>الزبون</th><th>المواد</th><th>المجموع</th><th>الواصل</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${current.slice(0, 400).map(s => {
        const c = s.customerId && S.customer(s.customerId);
        return `<tr class="${s.returned ? 'tr-dim' : ''}" style="cursor:pointer" data-view="${s.id}"><td><b>${s.no}</b></td><td class="nowrap">${relDay(s.date)} <span class="muted small">${fmtTime(s.date)}</span></td>
          <td>${c ? esc(c.name) : '<span class="muted">نقدي</span>'}</td>
          <td class="small">${s.items.slice(0, 3).map(i => esc(i.name)).join('، ')}${s.items.length > 3 ? ` +${s.items.length - 3}` : ''}</td>
          <td class="nowrap"><b>${moneyT(s.total)}</b>${s.discount ? `<div class="small muted">خصم ${fmtN(s.discount)}</div>` : ''}</td>
          <td class="nowrap">${moneyT(s.paid)}</td>
          <td>${s.returned ? '<span class="badge danger">مُرجعة</span>' : s.paid >= s.total ? '<span class="badge ok">نقد</span>' : s.paid > 0 ? '<span class="badge warn">جزء</span>' : '<span class="badge warn">دين</span>'}</td>
          <td><div class="actions"><button class="icon-btn sm" data-print="${s.id}" title="اطبع">${icon('print', 16)}</button></div></td></tr>`;
      }).join('')}</tbody></table>${current.length > 400 ? '<p class="muted small" style="padding:10px 14px">يطلع أول 400 بس — ضيّق الفترة حتى تشوف الباقي</p>' : ''}`
      : empty('🧾', 'ماكو فواتير بهالفترة', 'غيّر الفترة أو البحث');
  };
  render();
  el.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) return App.go(g.dataset.go);
    const p = e.target.closest('[data-p]');
    if (p) { ps.period = p.dataset.p; $$('[data-p]', el).forEach(b => b.classList.toggle('active', b === p)); render(); return; }
    const pr = e.target.closest('[data-print]');
    if (pr) { e.stopPropagation(); printReceipt(S.state.sales.find(s => s.id === pr.dataset.print)); return; }
    const v = e.target.closest('[data-view]'); if (v) return viewSale(v.dataset.view);
    const a = e.target.closest('[data-act="csv"]');
    if (a) {
      const rows = [['رقم الفاتورة', 'التاريخ', 'الوقت', 'الزبون', 'المادة', 'الكمية', 'الوحدة', 'السعر', 'المجموع', 'الكلفة', 'الحالة']];
      current.forEach(s => {
        const c = s.customerId && S.customer(s.customerId);
        s.items.forEach(i => rows.push([s.no, fmtDate(s.date), fmtTime(s.date), c ? c.name : 'نقدي', i.name, i.qty, i.unit, i.price, i.total, Math.round(i.cost * i.qty), s.returned ? 'مرجعة' : s.paid < s.total ? 'دين' : 'نقد']));
      });
      downloadFile(`مبيعات-${dayKey(new Date())}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    }
  });
  el.addEventListener('input', e => { if (e.target.id === 'sl-q') { ps.q = e.target.value; render(); } });
  el.addEventListener('change', e => { if (e.target.id === 'sl-t') { ps.type = e.target.value; render(); } });
};

/* ================= الزبائن والموردين ================= */
const PARTY = {
  customer: {
    title: 'الزبائن والدين', sub: 'دفتر الدين — مين عليه، شكد، ومتى سدّد', one: 'زبون', newBtn: 'زبون جديد',
    balLbl: 'عليه', payBtn: 'تسديد', payTitle: 'تسديد دين', payHint: 'المبلغ اللي سدّده الزبون', totalLbl: 'مجموع الديون (النا)',
    emptyT: 'ماكو زبائن بعد', emptyD: 'ضيف الزبائن اللي يشترون بالدين حتى تتابع حساباتهم', ico: '📒',
  },
  supplier: {
    title: 'الموردين', sub: 'الناس اللي نشتري منهم البضاعة وحساباتنا وياهم', one: 'مورد', newBtn: 'مورد جديد',
    balLbl: 'إله بذمتنا', payBtn: 'دفعة', payTitle: 'دفعة للمورد', payHint: 'المبلغ اللي دفعته للمورد', totalLbl: 'مجموع اللي علينا',
    emptyT: 'ماكو موردين', emptyD: 'ضيف الموردين حتى تسجل الوارد وتتابع الحساب وياهم', ico: '🚚',
  },
};
PS.party = { customer: { q: '', debt: false }, supplier: { q: '', debt: false } };

function partiesPage(el, kind) {
  const T = PARTY[kind], ps = PS.party[kind];
  const bals = S.balances(kind);
  const all = S.list(kind);
  const pos = [...bals.values()].filter(v => v > 0);
  const totBal = pos.reduce((a, b) => a + b, 0);
  const topId = [...bals.entries()].sort((a, b) => b[1] - a[1])[0];
  const top = topId && topId[1] > 0 ? S.party(kind, topId[0]) : null;
  el.innerHTML = `
    <div class="page-head"><div><h2>${T.title}</h2><p>${T.sub}</p></div>
      <button class="btn btn-primary" data-act="new">${icon('plus', 18)} ${T.newBtn}</button></div>
    <div class="grid g-3" style="margin-bottom:18px">
      <div class="card kpi tone-danger"><div class="kpi-top"><span class="kpi-ic">${icon('wallet')}</span>${T.totalLbl}</div><div class="kpi-val">${money(totBal)}</div><div class="kpi-sub">على ${pos.length} ${T.one}</div></div>
      <div class="card kpi tone-primary"><div class="kpi-top"><span class="kpi-ic">${icon('users')}</span>عدد ${kind === 'customer' ? 'الزبائن' : 'الموردين'}</div><div class="kpi-val">${all.length}</div></div>
      <div class="card kpi tone-warn"><div class="kpi-top"><span class="kpi-ic">${icon('alert')}</span>أكبر حساب</div><div class="kpi-val" style="font-size:20px">${top ? esc(top.name) : '—'}</div><div class="kpi-sub">${top ? moneyT(topId[1]) : 'ماكو حسابات مفتوحة'}</div></div>
    </div>
    <div class="toolbar">
      <div class="search-box">${icon('search')}<input class="input" id="pt-q" placeholder="دوّر بالاسم أو الرقم…" value="${esc(ps.q)}"></div>
      <label class="check"><input type="checkbox" id="pt-d" ${ps.debt ? 'checked' : ''}> بس اللي ${kind === 'customer' ? 'عليهم دين' : 'إلهم فلوس'}</label>
    </div>
    <div class="card"><div class="table-wrap" id="pt-t"></div></div>`;
  const render = () => {
    const q = ps.q.trim();
    const list = all.filter(x => (!q || x.name.includes(q) || (x.phone || '').includes(q)) && (!ps.debt || bals.get(x.id) > 0))
      .sort((a, b) => bals.get(b.id) - bals.get(a.id) || a.name.localeCompare(b.name, 'ar'));
    $('#pt-t', el).innerHTML = list.length ? `<table class="table"><thead><tr><th>الاسم</th><th>الهاتف</th><th>${T.balLbl}</th><th>آخر حركة</th><th></th></tr></thead><tbody>
      ${list.map(x => {
        const b = bals.get(x.id) || 0, lm = S.lastMove(kind, x.id);
        return `<tr><td><div class="p-name">${avatar(x.name)}<div><b>${esc(x.name)}</b>${x.note ? `<div class="small muted">${esc(x.note)}</div>` : ''}</div></div></td>
          <td class="nowrap" dir="ltr" style="text-align:right">${x.phone ? `<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>` : '<span class="muted">—</span>'}</td>
          <td class="nowrap">${b > 0 ? `<span class="badge danger" style="font-size:13.5px">${moneyT(b)}</span>` : b < 0 ? `<span class="badge info">إله ${moneyT(-b)}</span>` : '<span class="badge ok">صافي ✓</span>'}</td>
          <td class="nowrap small muted">${lm ? relDay(lm) : '—'}</td>
          <td><div class="actions">
            ${b > 0 ? `<button class="btn btn-sm btn-soft" data-act="pay" data-id="${x.id}">${icon('cash', 15)} ${T.payBtn}</button>` : ''}
            <button class="icon-btn sm" data-act="stmt" data-id="${x.id}" title="كشف حساب">${icon('file', 16)}</button>
            ${x.phone ? `<a class="icon-btn sm ok" target="_blank" href="${waLink(x.phone, remindText(kind, x, b))}" title="واتساب">${icon('chat', 16)}</a>` : ''}
            <button class="icon-btn sm" data-act="edit" data-id="${x.id}" title="تعديل">${icon('edit', 16)}</button>
            <button class="icon-btn sm danger" data-act="del" data-id="${x.id}" title="حذف">${icon('trash', 16)}</button>
          </div></td></tr>`;
      }).join('')}</tbody></table>` : empty(T.ico, all.length ? 'ماكو نتايج' : T.emptyT, all.length ? 'غيّر البحث' : T.emptyD, all.length ? '' : `<button class="btn btn-primary" data-act="new">${icon('plus', 17)} ${T.newBtn}</button>`);
  };
  render();
  el.addEventListener('input', e => { if (e.target.id === 'pt-q') { ps.q = e.target.value; render(); } });
  el.addEventListener('change', e => { if (e.target.id === 'pt-d') { ps.debt = e.target.checked; render(); } });
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.dataset.id;
    switch (b.dataset.act) {
      case 'new': partyForm(kind, null, () => App.refresh()); break;
      case 'edit': partyForm(kind, S.party(kind, id), () => App.refresh()); break;
      case 'pay': paymentForm(kind, id); break;
      case 'stmt': statementView(kind, id); break;
      case 'del': {
        const x = S.party(kind, id);
        if (S.partyHasMoves(kind, id)) return toast(`ما يصير تحذف ${esc(x.name)} — عنده حركات مسجلة. صفّر حسابه وخليه.`, 'warn');
        if (await confirmBox(`تريد تحذف <b>${esc(x.name)}</b>؟`, { ok: 'إي احذف', danger: true })) { S.deleteParty(kind, id); App.refresh(); }
      }
    }
  });
}
Pages.customers = el => partiesPage(el, 'customer');
Pages.suppliers = el => partiesPage(el, 'supplier');

function remindText(kind, x, bal) {
  const st = S.set;
  if (kind === 'customer') return `هلا بيك ${x.name} 🌹\nنذكّرك بحسابك ويانا بمحل ${st.shopName}:\nالمبلغ الباقي: ${moneyT(Math.max(0, bal))}\nشكراً لتعاملك ويانا 🙏\n📞 ${st.phone}`;
  return `هلا ${x.name} 🌿\nوياك ${st.shopName}.\n`;
}

function partyForm(kind, x, onSaved) {
  const T = PARTY[kind];
  const d = x || { name: '', phone: '', note: '', opening: '' };
  const { el: m, close } = openModal({
    title: x ? `تعديل ${esc(d.name)}` : `${icon('plus')} ${T.newBtn}`,
    body: `<div class="form-grid">
      ${field('الاسم *', `<input class="input" id="pa-n" value="${esc(d.name)}" autofocus placeholder="${kind === 'customer' ? 'مثلاً: أبو علي' : 'مثلاً: معمل الأجبان'}">`, '', 'full')}
      ${field('رقم الموبايل', `<input class="input" id="pa-p" dir="ltr" value="${esc(d.phone)}" placeholder="07xx xxx xxxx">`, 'حتى تكدر تراسله واتساب')}
      ${field(kind === 'customer' ? 'دين قديم عليه (قبل النظام)' : 'فلوس إله علينا (قبل النظام)', `<input class="input" type="number" id="pa-o" value="${d.opening || ''}" placeholder="0">`)}
      ${field('ملاحظة', `<input class="input" id="pa-note" value="${esc(d.note)}" placeholder="${kind === 'customer' ? 'مثلاً: جار المحل، يسدد آخر الشهر' : 'شنو يجيب؟'}">`, '', 'full')}
    </div>`,
    footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-primary" id="pa-s">${icon('check', 18)} احفظ</button>`,
  });
  const save = () => {
    const name = $('#pa-n', m).value.trim();
    if (!name) return $('#pa-n', m).focus();
    if (S.list(kind).some(y => y.name === name && (!x || y.id !== x.id))) return toast('اكو واحد بنفس الاسم — ميّزه بشي (مثلاً أبو علي الحداد)', 'warn');
    const saved = S.saveParty(kind, { ...(x ? { id: x.id } : {}), name, phone: $('#pa-p', m).value.trim(), opening: Math.round(num($('#pa-o', m).value)), note: $('#pa-note', m).value.trim() });
    close();
    toast(x ? 'انحفظ ✓' : `انضاف ${esc(name)} ✓`);
    if (onSaved) onSaved(saved);
  };
  $('#pa-s', m).onclick = save;
  m.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
}

function paymentForm(kind, id) {
  const T = PARTY[kind], x = S.party(kind, id), bal = S.balance(kind, id);
  const { el: m, close } = openModal({
    title: `${icon('cash')} ${T.payTitle}`, size: 'sm',
    body: `<div class="qd-head">${avatar(x.name)}<div><b>${esc(x.name)}</b><div class="small muted">${T.balLbl}: <b class="t-neg">${moneyT(bal)}</b></div></div></div>
      ${field(T.payHint, `<input class="input" type="number" id="py-a" value="${bal > 0 ? bal : ''}" autofocus>`)}
      <div class="btn-row mt">${[0.25, 0.5, 1].map(f => `<button class="btn btn-ghost btn-sm" data-f="${f}">${f === 1 ? 'كلّه' : f === 0.5 ? 'النص' : 'الربع'}</button>`).join('')}</div>
      ${field('ملاحظة', `<input class="input" id="py-n" placeholder="اختياري">`, '', 'mt')}
      <div class="qd-prev"><span>الباقي بعد ${T.payBtn === 'تسديد' ? 'التسديد' : 'الدفعة'}</span><b id="py-r"></b></div>`,
    footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-primary" id="py-s">${icon('check', 18)} سجّل</button>`,
  });
  const a = $('#py-a', m);
  const calc = () => { $('#py-r', m).textContent = moneyT(bal - num(a.value)); };
  calc();
  a.addEventListener('input', calc);
  m.addEventListener('click', e => { const f = e.target.closest('[data-f]'); if (f) { a.value = Math.round((bal * +f.dataset.f) / 250) * 250; calc(); } });
  const save = () => {
    const v = num(a.value);
    if (v <= 0) return a.focus();
    S.addPayment({ type: kind, partyId: id, amount: v, note: $('#py-n', m).value });
    close();
    const after = bal - v;
    toast(`انسجل ${moneyT(v)} ✓ ${after > 0 ? `— باقي ${moneyT(after)}` : '— صار الحساب صافي'}`, 'ok',
      kind === 'customer' && x.phone ? { action: { label: 'ابعث واتساب', fn: () => window.open(waLink(x.phone, `هلا ${x.name} 🌹\nوصلنا منك ${moneyT(v)}، تسلم إيدك 🙏\n${after > 0 ? `الباقي بحسابك: ${moneyT(after)}` : 'حسابك صار صافي ✓'}\n— ${S.set.shopName}`), '_blank') } } : {});
    App.refresh();
  };
  $('#py-s', m).onclick = save;
  a.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
}

function statementView(kind, id) {
  const x = S.party(kind, id), rows = S.statement(kind, id), bal = S.balance(kind, id);
  const T = PARTY[kind];
  const table = cls => `<table class="${cls}"><thead><tr><th>التاريخ</th><th>البيان</th><th>${kind === 'customer' ? 'عليه' : 'إله'}</th><th>واصل</th><th>الرصيد</th>${cls ? '<th></th>' : ''}</tr></thead><tbody>
    ${rows.map(r => `<tr><td class="nowrap">${fmtDate(r.date)}</td><td>${r.ref ? `<a href="#" data-sale="${r.ref}">${esc(r.desc)}</a>` : esc(r.desc)}</td><td class="n">${r.debit ? fmtN(r.debit) : ''}</td><td class="n">${r.credit ? fmtN(r.credit) : ''}</td><td class="n"><b>${fmtN(r.balance)}</b></td>
      ${cls ? `<td>${r.payId ? `<button class="icon-btn sm danger" data-delpay="${r.payId}" title="حذف هذي الدفعة">${icon('trash', 14)}</button>` : ''}</td>` : ''}</tr>`).join('')}
    </tbody></table>`;
  const { el: m, close } = openModal({
    title: `${icon('file')} كشف حساب — ${esc(x.name)}`, size: 'lg',
    body: `<div class="total-box" style="margin-bottom:14px;${bal > 0 ? 'background:var(--danger-soft);color:var(--danger)' : ''}"><span>${T.balLbl} هسة</span><span>${moneyT(bal)}</span></div>
      ${rows.length ? `<div class="table-wrap">${table('table')}</div>` : empty('📄', 'ماكو حركات بعد')}`,
    footer: `${x.phone ? `<a class="btn btn-ghost" target="_blank" href="${waLink(x.phone, remindText(kind, x, bal))}">${icon('chat', 17)} واتساب</a>` : ''}
      <span class="spacer"></span>${bal > 0 ? `<button class="btn btn-soft" data-pay>${icon('cash', 17)} ${T.payBtn}</button>` : ''}<button class="btn btn-primary" data-p>${icon('print', 17)} اطبع الكشف</button>`,
  });
  m.addEventListener('click', async e => {
    const s = e.target.closest('[data-sale]'); if (s) { e.preventDefault(); viewSale(s.dataset.sale); return; }
    const d = e.target.closest('[data-delpay]');
    if (d && await confirmBox('تريد تحذف هذي الدفعة؟ المبلغ يرجع على الحساب.', { ok: 'إي احذف', danger: true })) { S.deletePayment(d.dataset.delpay); close(); App.refresh(); statementView(kind, id); }
  });
  const pb = $('[data-pay]', m); if (pb) pb.onclick = () => { close(); paymentForm(kind, id); };
  $('[data-p]', m).onclick = () => printHTML(`<div class="ph"><div><h1>كشف حساب: ${esc(x.name)}</h1><div class="muted">${esc(S.set.shopName)} — 📞 ${esc(S.set.phone)}</div></div><div>${fmtLong(new Date())}</div></div>
    ${table('')}<h2>${T.balLbl}: ${moneyT(bal)}</h2>`, 'a4');
}
