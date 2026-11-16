'use strict';
/* =========================================================
   التشغيل والتنقل
   ========================================================= */
const ROUTES = [
  { sec: 'الشغل اليومي' },
  { id: 'dashboard', title: 'الرئيسية', icon: 'home' },
  { id: 'pos', title: 'الكاشير', icon: 'cart' },
  { id: 'sales', title: 'الفواتير', icon: 'receipt' },
  { sec: 'البضاعة' },
  { id: 'inventory', title: 'المخزن', icon: 'box' },
  { id: 'purchases', title: 'الوارد', icon: 'truck' },
  { sec: 'الحسابات' },
  { id: 'customers', title: 'الزبائن والدين', icon: 'users' },
  { id: 'suppliers', title: 'الموردين', icon: 'factory' },
  { id: 'expenses', title: 'المصاريف', icon: 'wallet' },
  { id: 'reports', title: 'التقارير', icon: 'chart' },
  { sec: '' },
  { id: 'settings', title: 'الإعدادات', icon: 'settings' },
];

const App = {
  cleanup: null,
  current: 'dashboard',

  go(id) {
    if (location.hash === '#/' + id) this.render();
    else location.hash = '#/' + id;
  },
  render() {
    const id = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0];
    const r = ROUTES.find(x => x.id === id) || ROUTES[1];
    const same = this.current === r.id;
    const scroll = same ? window.scrollY : 0;
    this.current = r.id;
    if (this.cleanup) { this.cleanup(); this.cleanup = null; }
    const old = $('#view');
    const v = document.createElement('section');
    v.id = 'view';
    v.className = 'view';
    if (same) v.style.animation = 'none';
    old.replaceWith(v);
    $('#page-title').textContent = r.title;
    document.title = `${r.title} — ${S.set.shopName}`;
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.id === r.id));
    const c = Pages[r.id](v);
    if (typeof c === 'function') this.cleanup = c;
    window.scrollTo(0, scroll);
    $('#sidebar').classList.remove('open');
    $('#scrim').classList.remove('show');
    this.badges();
  },
  refresh() { this.render(); },

  buildNav() {
    $('#nav').innerHTML = ROUTES.map(r => r.sec !== undefined
      ? (r.sec ? `<div class="nav-sec">${r.sec}</div>` : '<div style="flex:1"></div>')
      : `<a href="#/${r.id}" data-id="${r.id}">${icon(r.icon)}<span>${r.title}</span><span class="nb-slot"></span></a>`).join('');
  },
  badges() {
    const al = S.alerts();
    const debtors = [...S.balances('customer').values()].filter(v => v > 0).length;
    const set = (id, n, cls = '') => { const a = $(`#nav a[data-id="${id}"] .nb-slot`); if (a) a.innerHTML = n ? `<span class="nb ${cls}">${n}</span>` : ''; };
    set('inventory', al.count);
    set('customers', debtors, 'warn');
    $('#alerts-btn').innerHTML = icon('bell') + (al.count ? `<span class="dot">${al.count}</span>` : '');
  },
  chrome() {
    const st = S.set;
    $('#brand-name').textContent = st.shopName;
    $('#side-foot').innerHTML = `<div class="row">${icon('phone', 16)}<a href="tel:${esc(st.phone)}">${esc(st.phone)}</a></div>
      <div class="row small">${icon('shield', 16)} ${st.lastBackup ? `آخر نسخة: ${relDay(st.lastBackup)}` : 'ماكو نسخة احتياطية'}</div>`;
  },
  tick() {
    const n = new Date();
    $('#top-date').textContent = `${fmtLong(n)} • ${fmtTime(n)}`;
  },
  applyTheme() {
    const t = S.set.theme || 'auto';
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    try { localStorage.setItem('abu-amna-theme', JSON.stringify(t)); } catch (e) { /* ignore */ }
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('#theme-btn').innerHTML = icon(dark ? 'sun' : 'moon');
  },
  setTheme(t) { S.set.theme = t; S.save(); this.applyTheme(); },

  showAlerts() {
    const al = S.alerts();
    const row = (p, badge, sub) => `<div class="li">${pImg(p, 'li-ic')}<div class="li-main"><div class="li-title">${esc(p.name)}</div><div class="li-sub">${sub}</div></div>${badge}</div>`;
    const { el: m, close } = openModal({
      title: `${icon('bell')} التنبيهات`,
      body: al.count ? `
        ${al.exp.length ? `<h4 style="margin-bottom:4px">⏳ الصلاحية</h4><div class="list">${al.exp.map(x => row(x.p, `<span class="badge ${x.d < 0 ? 'danger' : 'warn'}">${expLabel(x.d)}</span>`, `${fmtQty(x.b.qty)} ${esc(x.p.unit)} — ${fmtDate(parseDay(x.b.exp))}`)).join('')}</div>` : ''}
        ${al.out.length ? `<h4 class="mt" style="margin-bottom:4px">🚫 خالصة</h4><div class="list">${al.out.map(p => row(p, '<span class="badge danger">خالصة</span>', 'اطلبها من المورد')).join('')}</div>` : ''}
        ${al.low.length ? `<h4 class="mt" style="margin-bottom:4px">📉 قاربت تخلص</h4><div class="list">${al.low.map(p => row(p, `<span class="badge warn">${fmtQty(p.stock)} ${esc(p.unit)}</span>`, `حد التنبيه ${fmtQty(p.min)}`)).join('')}</div>` : ''}`
        : empty('✅', 'ماكو تنبيهات', 'كلشي بالمخزن تمام'),
      footer: `<button class="btn btn-ghost" data-close>سد</button><button class="btn btn-primary" data-g>روح للمخزن</button>`,
    });
    $('[data-g]', m).onclick = () => { close(); App.go('inventory'); };
  },

  async init() {
    await S.init();
    this.buildNav();
    this.chrome();
    this.applyTheme();
    this.tick();
    setInterval(() => this.tick(), 30000);
    $('#menu-btn').innerHTML = icon('menu');
    $('#quick-sale').innerHTML = `${icon('cart', 17)} بيع <kbd>F2</kbd>`;
    $('#quick-sale').onclick = () => this.go('pos');
    $('#alerts-btn').onclick = () => this.showAlerts();
    $('#theme-btn').onclick = () => {
      const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      this.setTheme(dark ? 'light' : 'dark');
    };
    $('#menu-btn').onclick = () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); };
    $('#scrim').onclick = () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); };
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => this.applyTheme());
    window.addEventListener('hashchange', () => this.render());
    document.addEventListener('keydown', e => {
      if (e.key === 'F2' && this.current !== 'pos' && !document.querySelector('.modal-backdrop')) { e.preventDefault(); this.go('pos'); }
    });
    this.render();
  },
};

App.init();
