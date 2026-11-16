'use strict';
/* =========================================================
   الصفحات: الرئيسية + الكاشير
   ========================================================= */
const Pages = {};
const PS = {}; // حالة كل صفحة (حتى ما تضيع الفلاتر)

const catHue = catId => {
  const i = Math.max(0, S.state.categories.findIndex(c => c.id === catId));
  return `color-mix(in srgb, var(--c${i % 6}) 14%, var(--surface))`;
};
const pctDelta = (a, b) => {
  if (!b) return '';
  const d = Math.round(((a - b) / b) * 100);
  return `<span class="delta ${d >= 0 ? 'up' : 'down'}">${icon(d >= 0 ? 'trend' : 'trendDown', 13)} ${Math.abs(d)}%</span>`;
};
const avatarColor = name => `var(--c${[...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % 6})`;
const avatar = name => `<div class="party-avatar" style="background:${avatarColor(name)}">${esc(String(name).trim().charAt(0) || '؟')}</div>`;

/* ================= الرئيسية ================= */
Pages.dashboard = el => {
  const now = new Date();
  const today = S.report(startOfDay(now), endOfDay(now));
  const yest = S.report(startOfDay(addDays(now, -1)), endOfDay(addDays(now, -1)));
  const week = S.report(startOfDay(addDays(now, -6)), endOfDay(now));
  const al = S.alerts();
  const cBal = [...S.balances('customer').values()].filter(v => v > 0);
  const debts = cBal.reduce((a, b) => a + b, 0);
  const owed = [...S.balances('supplier').values()].filter(v => v > 0).reduce((a, b) => a + b, 0);
  const h = now.getHours();
  const greet = h < 12 ? 'صباح الخير' : h < 17 ? 'نهارك سعيد' : 'مساء الخير';
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(now, -i);
    days.push({ label: i === 0 ? 'اليوم' : DAYS[d.getDay()], title: fmtDate(d), value: week.byDay[dayKey(d)] || 0, hl: i === 0 });
  }
  const top = Object.values(week.byProd).sort((a, b) => b.total - a.total).slice(0, 5);
  const recent = S.state.sales.slice(-6).reverse();
  const lb = S.set.lastBackup;
  const backupOld = !lb || (Date.now() - new Date(lb)) / 864e5 > 7;

  el.innerHTML = `
  <div class="welcome">
    <div class="w-txt">
      <span class="w-tag">${esc(S.set.tagline || '#طعم_الصبح_العراقي')}</span>
      <h2>${greet}، هلا بيك بـ${esc(S.set.shopName)}</h2>
      <p>هذا ملخص شغل اليوم — ${fmtLong(now)}. روبة بالجدر، كيمر عرب، وكاهي حار… خلّي الغلّة تكبر 🌿</p>
      <div class="btn-row"><button class="btn btn-primary btn-lg" data-go="pos">${icon('cart')} بيعة جديدة</button><button class="btn btn-ghost" data-go="reports">${icon('chart', 18)} التقارير</button></div>
    </div>
    <div class="w-imgs" aria-hidden="true">
      <svg class="w-star" viewBox="0 0 200 200"><polygon points="100,0 118,58 176,24 142,80 200,100 142,120 176,176 118,142 100,200 82,142 24,176 58,120 0,100 58,80 24,24 82,58"/></svg>
      <img class="w1 w-logo" src="assets/img/logo.png" alt=""><img class="w2" src="assets/img/kahi.jpg" alt="">
    </div>
  </div>

  ${backupOld && S.state.sales.length ? `<div class="alert-box info" style="margin-bottom:16px">${icon('shield')} <span>صارلك ${lb ? 'أكثر من أسبوع' : 'ولا مرة'} ما سويت نسخة احتياطية. سوّي وحدة حتى ما تضيع بياناتك لو صار شي بالجهاز.</span><button class="btn btn-sm btn-ghost" data-act="backup">${icon('download', 16)} نسخة هسة</button></div>` : ''}

  <div class="quick">
    <button data-go="pos"><span class="q-ic q-photo"><img src="assets/img/roba.jpg" alt=""></span><span><b>بيع (كاشير)</b><span class="s">فاتورة نقد أو دين</span></span></button>
    <button data-go="purchases" data-new="1"><span class="q-ic q-photo"><img src="assets/img/buffalo.jpg" alt=""></span><span><b>وصل وارد</b><span class="s">بضاعة جديدة من مورد</span></span></button>
    <button data-go="customers"><span class="q-ic q-photo"><img src="assets/img/breakfast.jpg" alt=""></span><span><b>دفتر الدين</b><span class="s">تسديد وكشف حساب</span></span></button>
    <button data-go="expenses" data-new="1"><span class="q-ic q-photo"><img src="assets/img/pots.jpg" alt=""></span><span><b>مصروف</b><span class="s">مولدة، إيجار، أجور…</span></span></button>
  </div>

  <div class="grid g-4">
    <div class="card kpi hero">
      <div class="kpi-top"><span class="kpi-ic">${icon('cash')}</span>غلّة اليوم</div>
      <div class="kpi-val">${money(today.sales)}</div>
      <div class="kpi-sub">${pctDelta(today.sales, yest.sales)} البارحة ${moneyT(yest.sales)}</div>
    </div>
    <div class="card kpi tone-ok">
      <div class="kpi-top"><span class="kpi-ic">${icon('trend')}</span>ربح اليوم</div>
      <div class="kpi-val">${money(today.gross)}</div>
      <div class="kpi-sub">${today.sales ? `نسبة الربح ${Math.round((today.gross / today.sales) * 100)}%` : 'بعد ما بديت تبيع اليوم'}</div>
    </div>
    <div class="card kpi tone-info">
      <div class="kpi-top"><span class="kpi-ic">${icon('receipt')}</span>فواتير اليوم</div>
      <div class="kpi-val">${today.count}</div>
      <div class="kpi-sub">معدل الفاتورة ${moneyT(today.count ? today.sales / today.count : 0)}</div>
    </div>
    <div class="card kpi tone-warn">
      <div class="kpi-top"><span class="kpi-ic">${icon('users')}</span>ديون السوگ (النا)</div>
      <div class="kpi-val">${money(debts)}</div>
      <div class="kpi-sub">على ${cBal.length} زبون • علينا للموردين ${moneyT(owed)}</div>
    </div>
  </div>

  <div class="grid g-main mt">
    <div class="card">
      <div class="card-head"><h3>${icon('chart')} مبيعات آخر ٧ أيام</h3><span class="badge primary">المجموع ${moneyT(week.sales)}</span></div>
      <div class="card-body">${barChart(days, { height: 190 })}</div>
    </div>
    <div class="card">
      <div class="card-head"><h3>${icon('alert')} تنبيهات المخزن</h3>${al.count ? `<span class="badge danger">${al.count}</span>` : ''}</div>
      <div class="card-body">
        ${al.count ? `<div class="list">
          ${al.exp.slice(0, 4).map(x => `<div class="li">${pImg(x.p, 'li-ic')}<div class="li-main"><div class="li-title">${esc(x.p.name)}</div><div class="li-sub">${fmtQty(x.b.qty)} ${esc(x.p.unit)} — ${fmtDate(parseDay(x.b.exp))}</div></div><span class="badge ${x.d < 0 ? 'danger' : 'warn'}">${expLabel(x.d)}</span></div>`).join('')}
          ${al.out.slice(0, 3).map(p => `<div class="li">${pImg(p, 'li-ic')}<div class="li-main"><div class="li-title">${esc(p.name)}</div><div class="li-sub">لازم تطلب من المورد</div></div><span class="badge danger">خالصة</span></div>`).join('')}
          ${al.low.slice(0, 4).map(p => `<div class="li">${pImg(p, 'li-ic')}<div class="li-main"><div class="li-title">${esc(p.name)}</div><div class="li-sub">باقي ${fmtQty(p.stock)} ${esc(p.unit)} بس</div></div><span class="badge warn">قاربت تخلص</span></div>`).join('')}
        </div>
        <button class="btn btn-ghost btn-sm btn-block mt" data-go="inventory">شوف المخزن كله</button>`
        : empty('✅', 'كلشي تمام', 'ماكو مواد خالصة ولا قربت تنتهي صلاحيتها')}
      </div>
    </div>
  </div>

  <div class="grid g-2 mt">
    <div class="card">
      <div class="card-head"><h3>${icon('sparkles')} الأكثر مبيعاً بهالأسبوع</h3></div>
      <div class="card-body">${top.length ? hBars(top.map(p => ({ label: p.name, icon: p.icon, img: p.img, value: p.total, sub: `${qtyLabel(p.qty, p.unit)} • ربح ${moneyT(p.profit)}` }))) : empty('📊', 'بعد ماكو مبيعات', 'أول ما تبيع راح تطلع هنا أكثر المواد اللي تمشي')}</div>
    </div>
    <div class="card">
      <div class="card-head"><h3>${icon('clock')} آخر الفواتير</h3><button class="btn btn-ghost btn-sm" data-go="sales">الكل</button></div>
      <div class="card-body">${recent.length ? `<div class="list">${recent.map(s => {
        const c = s.customerId && S.customer(s.customerId);
        return `<div class="li" style="cursor:pointer" data-act="sale" data-id="${s.id}"><div class="li-ic">🧾</div><div class="li-main"><div class="li-title">#${s.no} — ${c ? esc(c.name) : 'زبون نقدي'}</div><div class="li-sub">${relDay(s.date)} ${fmtTime(s.date)} • ${s.items.length} مادة</div></div><div class="li-end"><b>${money(s.total)}</b><div>${s.returned ? '<span class="badge danger">مُرجعة</span>' : s.paid < s.total ? '<span class="badge warn">دين</span>' : '<span class="badge ok">نقد</span>'}</div></div></div>`;
      }).join('')}</div>` : empty('🧾', 'ماكو فواتير بعد', 'روح للكاشير وسوّي أول بيعة', `<button class="btn btn-primary" data-go="pos">افتح الكاشير</button>`)}</div>
    </div>
  </div>`;

  el.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) { if (g.dataset.new) PS.openNew = g.dataset.go; App.go(g.dataset.go); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'backup') doBackup();
    if (a.dataset.act === 'sale') viewSale(a.dataset.id);
  });
};

/* ================= الكاشير ================= */
const POS = { cart: [], customerId: '', discount: 0, mode: 'cash', received: '', partPaid: '', cat: 'all', q: '', note: '' };

Pages.pos = el => {
  el.classList.add('pos-view');
  el.innerHTML = `
  <div class="pos">
    <div class="pos-left">
      <div class="search-box big">${icon('search')}<input class="input" id="pos-q" placeholder="دوّر على مادة أو امسح الباركود…   (F2)" autocomplete="off" value="${esc(POS.q)}"></div>
      <div class="chips" id="pos-cats"></div>
      <div class="prod-grid" id="pos-grid"></div>
    </div>
    <aside class="card pos-cart" id="pos-cart"></aside>
  </div>`;
  const grid = $('#pos-grid', el), cartEl = $('#pos-cart', el), qEl = $('#pos-q', el), catsEl = $('#pos-cats', el);

  const filtered = () => {
    const q = POS.q.trim().toLowerCase();
    return S.state.products.filter(p => (POS.cat === 'all' || p.catId === POS.cat) && (!q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode === q)));
  };
  const subtotal = () => POS.cart.reduce((a, l) => a + lineTotal(l), 0);
  const total = () => Math.max(0, subtotal() - Math.min(+POS.discount || 0, subtotal()));

  function renderCats() {
    const cnt = id => S.state.products.filter(p => p.catId === id).length;
    catsEl.innerHTML = `<button class="chip ${POS.cat === 'all' ? 'active' : ''}" data-cat="all">الكل <span class="cnt">${S.state.products.length}</span></button>` +
      S.state.categories.map(c => `<button class="chip ${POS.cat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${esc(c.name)} <span class="cnt">${cnt(c.id)}</span></button>`).join('');
  }
  function renderGrid() {
    const list = filtered();
    const inCart = id => POS.cart.filter(l => l.pid === id).reduce((a, l) => a + l.qty, 0);
    grid.innerHTML = list.length ? list.map(p => {
      const c = inCart(p.id);
      return `<div class="pcard ${p.stock <= 0 ? 'out' : ''}" data-pid="${p.id}" title="${esc(p.name)}">
        ${p.stock <= 0 ? '<span class="badge danger ps">خالص</span>' : p.stock <= p.min ? `<span class="badge warn ps">${fmtQty(p.stock)}</span>` : ''}
        ${c ? `<span class="pin-cnt">${fmtQty(c)}</span>` : ''}
        ${pImg(p, 'pe', `style="--hue:${catHue(p.catId)}"`)}
        <div class="pn">${esc(p.name)}</div>
        <div class="pp">${fmtN(p.sell)} <small>/ ${esc(p.unit)}</small></div>
      </div>`;
    }).join('') : `<div style="grid-column:1/-1">${empty('🔍', 'ماكو هيچ مادة', 'جرّب اسم ثاني، أو ضيفها من صفحة المخزن')}</div>`;
  }
  function renderCart() {
    const custs = [...S.state.customers].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const c = POS.customerId && S.customer(POS.customerId);
    const bal = c ? S.balance('customer', c.id) : 0;
    cartEl.innerHTML = `
      <div class="cart-head"><h3>${icon('cart')} القائمة <span class="pill">${POS.cart.length}</span></h3>
        ${POS.cart.length ? `<button class="btn btn-ghost btn-sm" data-act="clear">${icon('trash', 15)} تفريغ</button>` : ''}</div>
      <div class="cart-cust">
        <div class="row">
          <select class="select sm" id="pos-cust"><option value="">👤 زبون نقدي (بدون اسم)</option>${opts(custs, POS.customerId, x => [x.id, x.name])}</select>
          <button class="icon-btn sm ok" data-act="new-cust" title="زبون جديد">${icon('plus', 17)}</button>
        </div>
        ${c && bal > 0 ? `<div class="cust-info"><span>حسابه السابق عليه</span><span>${moneyT(bal)}</span></div>` : ''}
      </div>
      <div class="cart-lines">${POS.cart.length ? POS.cart.map((l, i) => {
        const p = S.product(l.pid);
        if (!p) return '';
        const step = p.fraction ? 0.25 : 1;
        return `<div class="cline">
          ${pImg(p, 'cl-ic')}
          <div><div class="cl-name">${esc(p.name)}</div>
            <div class="cl-sub"><input class="mini" type="number" data-f="price" data-i="${i}" value="${l.price}" title="السعر"> / ${esc(p.unit)}${l.fixed != null ? ' • <span class="badge accent">بالمبلغ</span>' : ''}</div></div>
          <div class="cl-total">${money(lineTotal(l))}</div>
          <div style="grid-column:2/4" class="cl-ctrl">
            <span class="muted small" style="margin-inline-end:auto">${p.unit === 'كيلو' ? qtyLabel(l.qty, p.unit) : ''}</span>
            <div class="qty"><button data-act="inc" data-i="${i}" data-step="${step}">${icon('plus', 15)}</button><input type="number" step="any" data-f="qty" data-i="${i}" value="${fmtQty(l.qty)}"><button data-act="dec" data-i="${i}" data-step="${step}">${icon('minus', 15)}</button></div>
            <button class="icon-btn sm danger" data-act="rm" data-i="${i}" title="شيل">${icon('x', 16)}</button>
          </div>
        </div>`;
      }).join('') : `<div class="cart-empty"><div class="e">🛒</div><b>القائمة فارغة</b><div class="small">دوس على أي مادة حتى تنضاف هنا</div></div>`}</div>
      <div class="cart-sum">
        <div class="sum-row"><span>المجموع</span><b id="sum-sub">${money(subtotal())}</b></div>
        <div class="sum-row"><span>خصم</span><input class="input sm" type="number" id="pos-disc" min="0" placeholder="0" value="${POS.discount || ''}"></div>
        <div class="sum-total"><span>الصافي</span><b id="sum-total">${money(total())}</b></div>
      </div>
      <div class="cart-pay">
        <div class="seg full" id="pay-mode">
          <button data-mode="cash" class="${POS.mode === 'cash' ? 'active' : ''}">💵 نقد</button>
          <button data-mode="debt" class="${POS.mode === 'debt' ? 'active' : ''}">📒 دين</button>
          <button data-mode="part" class="${POS.mode === 'part' ? 'active' : ''}">🪙 واصل جزء</button>
        </div>
        <div id="pay-extra"></div>
        <button class="btn btn-primary btn-lg btn-block" data-act="checkout" ${POS.cart.length ? '' : 'disabled'}>${icon('check')} اقبض <kbd>Ctrl+Enter</kbd></button>
        <label class="check small"><input type="checkbox" id="pos-print" ${S.set.autoPrint ? 'checked' : ''}> اطبع الوصل بعد كل بيعة</label>
      </div>`;
    renderPayExtra();
  }
  function renderPayExtra() {
    const box = $('#pay-extra', cartEl);
    if (!box) return;
    if (POS.mode === 'cash') {
      box.innerHTML = `<div class="pay-extra"><input class="input sm" type="number" id="pos-recv" placeholder="استلمت من الزبون (اختياري)" value="${esc(POS.received)}"></div><div id="pay-note"></div>`;
    } else if (POS.mode === 'debt') {
      box.innerHTML = '<div id="pay-note"></div>';
    } else {
      box.innerHTML = `<div class="pay-extra"><input class="input sm" type="number" id="pos-part" placeholder="شكد دفع هسة؟" value="${esc(POS.partPaid)}"></div><div id="pay-note"></div>`;
    }
    renderPayNote();
  }
  function renderPayNote() {
    const box = $('#pay-note', cartEl);
    if (!box) return;
    const t = total();
    if (POS.mode === 'cash') {
      const r = num(POS.received);
      box.innerHTML = r > 0 ? `<div class="pay-note" style="margin-top:8px"><span>${r >= t ? 'الباقي إله' : 'ناقص'}</span><span class="${r >= t ? 't-pos' : 't-neg'}">${moneyT(Math.abs(r - t))}</span></div>` : '';
    } else if (POS.mode === 'debt') {
      box.innerHTML = `<div class="pay-note"><span>كل المبلغ ينكتب دين على ${POS.customerId ? esc(S.customer(POS.customerId).name) : '<span class="t-neg">اختار الزبون ☝️</span>'}</span><span class="t-warn">${moneyT(t)}</span></div>`;
    } else {
      const p = Math.min(num(POS.partPaid), t);
      box.innerHTML = `<div class="pay-note" style="margin-top:8px"><span>يبقى عليه</span><span class="t-warn">${moneyT(t - p)}</span></div>`;
    }
  }
  function updateTotals() {
    const a = $('#sum-sub', cartEl), b = $('#sum-total', cartEl);
    if (a) a.innerHTML = money(subtotal());
    if (b) b.innerHTML = money(total());
  }
  const refresh = () => { renderGrid(); renderCart(); };

  function addProduct(p, qty = 1, fixed = null) {
    const ex = fixed == null && POS.cart.find(l => l.pid === p.id && l.fixed == null);
    if (ex) ex.qty = round3(ex.qty + qty);
    else POS.cart.push({ pid: p.id, qty: round3(qty), price: p.sell, fixed });
    if (p.stock - qty < 0) toast(`انتبه: ${esc(p.name)} مخلّص بالمخزن حسب النظام`, 'warn');
    refresh();
  }

  function qtyDialog(p) {
    const isKg = p.unit === 'كيلو';
    const qs = isKg ? [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5] : [0.5, 1, 2, 3, 4, 5, 6, 10];
    const amts = [1000, 2000, 3000, 5000, 10000, 15000, 20000, 25000];
    const { el: m, close } = openModal({
      title: esc(p.name), size: 'sm',
      body: `
        <div class="qd-head">${pImg(p, 'pe')}<div><b>${moneyT(p.sell)}</b> <span class="muted">/ ${esc(p.unit)}</span><div class="small muted">الموجود: ${fmtQty(p.stock)} ${esc(p.unit)}</div></div></div>
        <div class="seg full" style="margin-bottom:14px"><button class="active" data-tab="q">⚖️ بالوزن</button><button data-tab="a">💵 بالمبلغ</button></div>
        <div data-pane="q"><div class="preset-grid">${qs.map(v => `<button class="preset" data-q="${v}">${qtyLabel(v, p.unit)}<small>${fmtN(v * p.sell)}</small></button>`).join('')}</div>
          ${field('أو اكتب الكمية', `<input class="input" type="number" step="any" id="qd-q" placeholder="مثلاً 1.25" autofocus>`, '', 'mt')}</div>
        <div data-pane="a" hidden><div class="preset-grid">${amts.map(v => `<button class="preset" data-a="${v}">${compact(v)}<small>${qtyLabel(round3(v / p.sell), p.unit)}</small></button>`).join('')}</div>
          ${field('أو اكتب المبلغ اللي يريده', `<input class="input" type="number" id="qd-a" placeholder="مثلاً 7000">`, '', 'mt')}</div>
        <div class="qd-prev"><span id="qd-pl">اختار الكمية</span><span id="qd-pv"></span></div>`,
      footer: `<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-primary" id="qd-ok">${icon('plus', 17)} ضيف للقائمة</button>`,
    });
    let tab = 'q';
    const qI = $('#qd-q', m), aI = $('#qd-a', m);
    const prev = () => {
      if (tab === 'q') { const q = num(qI.value); $('#qd-pl', m).textContent = q ? qtyLabel(q, p.unit) : 'اختار الكمية'; $('#qd-pv', m).textContent = q ? moneyT(q * p.sell) : ''; }
      else { const a = num(aI.value); $('#qd-pl', m).textContent = a ? qtyLabel(round3(a / p.sell), p.unit) : 'اكتب المبلغ'; $('#qd-pv', m).textContent = a ? moneyT(a) : ''; }
    };
    const commit = () => {
      if (tab === 'q') { const q = num(qI.value); if (q > 0) { addProduct(p, q); close(); } else qI.focus(); }
      else { const a = num(aI.value); if (a > 0) { addProduct(p, round3(a / p.sell), a); close(); } else aI.focus(); }
    };
    m.addEventListener('click', e => {
      const t = e.target.closest('[data-tab]');
      if (t) {
        tab = t.dataset.tab;
        $$('[data-tab]', m).forEach(b => b.classList.toggle('active', b === t));
        $$('[data-pane]', m).forEach(x => { x.hidden = x.dataset.pane !== tab; });
        (tab === 'q' ? qI : aI).focus(); prev(); return;
      }
      const q = e.target.closest('[data-q]');
      if (q) { addProduct(p, +q.dataset.q); close(); return; }
      const a = e.target.closest('[data-a]');
      if (a) { const v = +a.dataset.a; addProduct(p, round3(v / p.sell), v); close(); }
    });
    m.addEventListener('input', prev);
    m.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    $('#qd-ok', m).onclick = commit;
  }

  function checkout() {
    if (!POS.cart.length) return toast('القائمة فارغة، ضيف مواد أول', 'warn');
    const t = total();
    const paid = POS.mode === 'cash' ? t : POS.mode === 'debt' ? 0 : Math.min(num(POS.partPaid), t);
    if (paid < t && !POS.customerId) {
      toast('اختار اسم الزبون أول — ما يصير دين بدون اسم 🙂', 'warn');
      const s = $('#pos-cust', cartEl); if (s) s.focus();
      return;
    }
    let sale;
    try {
      sale = S.createSale({ lines: POS.cart, discount: POS.discount, paid, customerId: POS.customerId, note: POS.note });
    } catch (err) { return toast(err.message, 'err'); }
    const wantPrint = $('#pos-print', cartEl)?.checked;
    Object.assign(POS, { cart: [], customerId: '', discount: 0, mode: 'cash', received: '', partPaid: '', note: '' });
    refresh();
    App.badges();
    toast(`تمت البيعة ✓ فاتورة #${sale.no} — ${moneyT(sale.total)}`, 'ok', { action: { label: `${icon('print', 15)} اطبع`, fn: () => printReceipt(sale) } });
    if (wantPrint) printReceipt(sale);
    qEl.focus();
  }

  /* أحداث */
  catsEl.addEventListener('click', e => { const c = e.target.closest('[data-cat]'); if (c) { POS.cat = c.dataset.cat; renderCats(); renderGrid(); } });
  grid.addEventListener('click', e => {
    const c = e.target.closest('[data-pid]');
    if (!c) return;
    const p = S.product(c.dataset.pid);
    if (p.fraction) qtyDialog(p); else addProduct(p);
  });
  qEl.addEventListener('input', () => { POS.q = qEl.value; renderGrid(); });
  qEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = qEl.value.trim();
      const exact = S.state.products.find(p => p.barcode && p.barcode === v);
      const list = exact ? [exact] : filtered();
      if (list.length) {
        const p = list[0];
        if (p.fraction && !exact) qtyDialog(p); else addProduct(p);
        POS.q = ''; qEl.value = ''; renderGrid();
      }
    }
    if (e.key === 'Escape') { POS.q = ''; qEl.value = ''; renderGrid(); }
  });
  cartEl.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]');
    if (m) { POS.mode = m.dataset.mode; $$('[data-mode]', cartEl).forEach(b => b.classList.toggle('active', b === m)); renderPayExtra(); const f = $('#pos-recv,#pos-part', cartEl); if (f) f.focus(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const i = +b.dataset.i, l = POS.cart[i];
    switch (b.dataset.act) {
      case 'inc': l.qty = round3(l.qty + +b.dataset.step); l.fixed = null; refresh(); break;
      case 'dec': l.qty = round3(l.qty - +b.dataset.step); l.fixed = null; if (l.qty <= 0) POS.cart.splice(i, 1); refresh(); break;
      case 'rm': POS.cart.splice(i, 1); refresh(); break;
      case 'clear': confirmBox('تريد تفرّغ القائمة كلها؟', { ok: 'إي فرّغها', danger: true }).then(ok => { if (ok) { POS.cart = []; POS.discount = 0; refresh(); } }); break;
      case 'checkout': checkout(); break;
      case 'new-cust': partyForm('customer', null, c => { POS.customerId = c.id; renderCart(); }); break;
    }
  });
  cartEl.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'pos-cust') { POS.customerId = t.value; if (t.value && POS.mode === 'cash') POS.mode = 'debt'; if (!t.value) POS.mode = 'cash'; renderCart(); return; }
    if (t.id === 'pos-print') { S.set.autoPrint = t.checked; S.save(); return; }
    if (t.dataset.f) {
      const l = POS.cart[+t.dataset.i];
      const v = num(t.value);
      if (t.dataset.f === 'qty') { if (v <= 0) POS.cart.splice(+t.dataset.i, 1); else { l.qty = round3(v); l.fixed = null; } }
      else { l.price = Math.max(0, Math.round(v)); if (l.fixed != null) { l.fixed = null; } }
      refresh();
    }
  });
  cartEl.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'pos-disc') { POS.discount = Math.max(0, num(t.value)); updateTotals(); renderPayNote(); }
    if (t.id === 'pos-recv') { POS.received = t.value; renderPayNote(); }
    if (t.id === 'pos-part') { POS.partPaid = t.value; renderPayNote(); }
  });

  const onKey = e => {
    if (document.querySelector('.modal-backdrop')) return;
    if (e.key === 'F2') { e.preventDefault(); qEl.focus(); qEl.select(); }
    if ((e.key === 'Enter' && e.ctrlKey) || e.key === 'F9') { e.preventDefault(); checkout(); }
  };
  document.addEventListener('keydown', onKey);

  renderCats();
  refresh();
  setTimeout(() => qEl.focus(), 50);
  return () => document.removeEventListener('keydown', onKey);
};

/* ================= عرض فاتورة (مشترك) ================= */
function viewSale(id) {
  const s = S.state.sales.find(x => x.id === id);
  if (!s) return;
  const c = s.customerId && S.customer(s.customerId);
  const { el: m, close } = openModal({
    title: `${icon('receipt')} فاتورة #${s.no}`,
    body: `<div class="receipt-preview">${receiptHTML(s)}</div>`,
    footer: `${!s.returned ? `<button class="btn btn-ghost" data-r style="color:var(--danger)">${icon('undo', 17)} إرجاع الفاتورة</button>` : ''}
      ${c && c.phone ? `<a class="btn btn-ghost" target="_blank" href="${waLink(c.phone, saleWaText(s))}">${icon('chat', 17)} واتساب</a>` : ''}
      <span class="spacer"></span><button class="btn btn-primary" data-p>${icon('print', 17)} اطبع</button>`,
  });
  $('[data-p]', m).onclick = () => printReceipt(s);
  const r = $('[data-r]', m);
  if (r) r.onclick = async () => {
    if (!(await confirmBox(`تريد ترجّع فاتورة #${s.no}؟ المواد راح ترجع للمخزن والمبلغ ينشال من الحسابات.`, { ok: 'إي رجّعها', danger: true }))) return;
    S.returnSale(s.id);
    close();
    toast(`انرجعت الفاتورة #${s.no}`, 'ok');
    App.refresh();
  };
}
function saleWaText(s) {
  const st = S.set;
  const lines = s.items.map(i => `• ${i.name} — ${qtyLabel(i.qty, i.unit)} = ${fmtN(i.total)}`).join('\n');
  return `هلا بيك 🌿\nفاتورتك من ${st.shopName}\nرقم: ${s.no} — ${fmtDate(s.date)}\n${lines}\nالمجموع: ${moneyT(s.total)}${s.paid < s.total ? `\nالباقي عليك: ${moneyT(s.total - s.paid)}` : ''}\nبالعافية 🙏 📞 ${st.phone}`;
}

function doBackup() {
  const name = `نسخة-ألبان-أبو-آمنة-${dayKey(new Date())}.json`;
  downloadFile(name, S.exportJSON());
  toast('انحفظت النسخة الاحتياطية بمجلد التنزيلات ✓');
  App.chrome();
  App.refresh();
}
