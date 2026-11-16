'use strict';
/* =========================================================
   طبقة البيانات — الخزن والحسابات (البان ابو امنة)
   كل البيانات تنحفظ بجهاز المحل نفسه (IndexedDB)
   ========================================================= */

const UNITS = ['كيلو', 'جدر', 'صينية', 'بطل', 'قطعة', 'علبة', 'طبقة', 'قنينة', 'كيس', 'باكيت', 'لتر', 'درزن'];
const EXPENSE_CATS = ['إيجار المحل', 'كهرباء ومولدة', 'أجور العمّال', 'نقل وتوصيل', 'أكياس وتغليف', 'ثلج وتبريد', 'صيانة وتصليح', 'ماء وتنظيف', 'ضرايب ورسوم', 'غيرها'];
const WASTE_REASONS = ['خربان', 'انتهت صلاحيته', 'انكسر / انكب', 'نقص بالوزن', 'غيرها'];
const EMOJIS = ['🥛', '🥣', '🍶', '🫙', '🧀', '🧈', '🥞', '🍯', '🫗', '🥚', '🍳', '🌾', '🍚', '🫘', '🥜', '🌰', '🥫', '🍅', '🫒', '🛢️', '🧂', '🍞', '🥖', '🍋', '🧃', '🍬', '🍫', '🌿', '📦', '🛒'];

/* صور المنتجات من موقع ألبان أبو آمنة */
const BRAND_IMAGES = [
  ['roba', 'روبة'], ['laban', 'لبن'], ['milk', 'حليب'], ['buffalo', 'جاموس'], ['kaymak', 'كيمر'], ['kaymak-tray', 'صينية كيمر'],
  ['kahi', 'كاهي'], ['kahi-tray', 'صينية كاهي'], ['cheese', 'جبن'], ['cheese-cubes', 'جبن مكعبات'], ['honey', 'عسل'],
  ['honeycomb', 'شهد'], ['dibs', 'دبس'], ['ghee', 'دهن حر'], ['eggs', 'بيض'], ['pots', 'جدور'], ['breakfast', 'ريوك'],
].map(([k, label]) => ({ src: `assets/img/${k}.jpg`, label }));
const IMG_RULES = [
  [/مثلث|موزريلا|مكعب/, 'cheese-cubes'], [/روبة|ماست|يوغرت/, 'roba'], [/لبن|شنينة/, 'laban'], [/حليب/, 'milk'],
  [/كيمر|قيمر|قشطة/, 'kaymak'], [/كاهي/, 'kahi'], [/جبن/, 'cheese'], [/شهد/, 'honeycomb'], [/عسل/, 'honey'],
  [/دبس/, 'dibs'], [/دهن|سمن|زبدة/, 'ghee'], [/بيض/, 'eggs'],
];
const autoImg = name => { const r = IMG_RULES.find(([re]) => re.test(name || '')); return r ? `assets/img/${r[1]}.jpg` : ''; };

const pad = n => String(n).padStart(2, '0');
const round3 = n => Math.round((+n || 0) * 1000) / 1000;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nowISO = () => new Date().toISOString();
const dayKey = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const parseDay = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const startOfDay = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const endOfDay = d => { d = new Date(d); d.setHours(23, 59, 59, 999); return d; };
const addDays = (d, n) => { d = new Date(d); d.setDate(d.getDate() + n); return d; };
const lineTotal = l => (l.fixed != null ? Math.round(l.fixed) : Math.round((+l.qty || 0) * (+l.price || 0)));
const daysUntil = exp => Math.round((startOfDay(parseDay(exp)) - startOfDay(new Date())) / 864e5);

/* ---------------- التخزين ---------------- */
const DB = (() => {
  const KEY = 'abu-amna-db';
  let idb = null;
  const open = () => new Promise(res => {
    try {
      const r = indexedDB.open('abu-amna', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
  async function load() {
    idb = await open();
    if (idb) {
      const v = await new Promise(res => {
        try {
          const g = idb.transaction('kv', 'readonly').objectStore('kv').get(KEY);
          g.onsuccess = () => res(g.result || null);
          g.onerror = () => res(null);
        } catch (e) { res(null); }
      });
      if (v) return v;
    }
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* ignore */ }
    return null;
  }
  function save(state) {
    if (idb) {
      try { idb.transaction('kv', 'readwrite').objectStore('kv').put(state, KEY); return; } catch (e) { /* fallback */ }
    }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error('save failed', e); }
  }
  return { load, save };
})();

const DEFAULT_SETTINGS = {
  shopName: 'ألبان أبو آمنة',
  tagline: '#طعم_الصبح_العراقي',
  phone: '07735445980',
  address: 'بغداد - العامرية - شارع العمل الشعبي',
  footer: 'بالعافية عليكم .. نتشرف بزيارتكم • مفتوحين ٢٤ ساعة',
  cashier: '',
  expiryDays: 3,
  autoPrint: false,
  theme: 'auto',
  lastBackup: null,
};

function seedState() {
  const now = nowISO();
  const inDays = n => dayKey(addDays(new Date(), n));
  const categories = [
    { id: 'c-laban', name: 'الروبة واللبن', icon: '🥣' },
    { id: 'c-milk', name: 'الحليب', icon: '🥛' },
    { id: 'c-cheese', name: 'الأجبان', icon: '🧀' },
    { id: 'c-kemar', name: 'الكيمر والكاهي', icon: '🥞' },
    { id: 'c-honey', name: 'العسل والدبس والراشي', icon: '🍯' },
    { id: 'c-ghee', name: 'دهن الحر', icon: '🧈' },
    { id: 'c-eggs', name: 'البيض', icon: '🥚' },
    { id: 'c-imported', name: 'المستورد', icon: '🌍' },
    { id: 'c-grocery', name: 'المواد الغذائية', icon: '🥫' },
    { id: 'c-bulk', name: 'الحبوب بالكيلو', icon: '🌾' },
  ];
  const suppliers = [
    { id: 's-1', name: 'مورد الجاموس', phone: '', note: 'روبة، حليب، كيمر، دهن حر', opening: 0, createdAt: now },
    { id: 's-2', name: 'معمل الأجبان', phone: '', note: 'جبن عرب وجبن غنم', opening: 0, createdAt: now },
    { id: 's-3', name: 'مجهّز المواد الغذائية', phone: '', note: 'معلبات، زيت، حبوب، مستورد', opening: 0, createdAt: now },
    { id: 's-4', name: 'منحل العسل', phone: '', note: 'عسل، دبس، راشي', opening: 0, createdAt: now },
  ];
  const P = (name, catId, unit, buy, sell, stock, min, x = {}) => ({
    id: uid(), name, catId, unit, buy, sell, stock, min,
    origin: 'local', fraction: unit === 'كيلو',
    icon: (categories.find(c => c.id === catId) || {}).icon || '📦',
    supplierId: '', packName: '', packSize: 0, barcode: '', batches: [], createdAt: now, img: autoImg(name), ...x,
  });
  const B = (qty, days) => [{ id: uid(), qty, exp: inDays(days), date: now }];
  const products = [
    P('روبة جاموس', 'c-laban', 'جدر', 4000, 5000, 14, 4, { supplierId: 's-1', batches: B(14, 3) }),
    P('روبة بقر', 'c-laban', 'جدر', 3000, 4000, 10, 4, { supplierId: 's-1', batches: B(10, 2) }),
    P('لبن شنينة', 'c-laban', 'بطل', 1000, 1500, 20, 6, { icon: '🍶', supplierId: 's-1', batches: B(20, 2) }),
    P('حليب جاموس طازج', 'c-milk', 'بطل', 2000, 2500, 16, 5, { supplierId: 's-1', batches: B(16, 1) }),
    P('حليب بقر طازج', 'c-milk', 'بطل', 1500, 2000, 18, 5, { supplierId: 's-1', batches: B(18, 1) }),
    P('جبن عرب', 'c-cheese', 'كيلو', 6000, 8000, 12, 3, { supplierId: 's-2', packName: 'صينية', packSize: 4, batches: B(12, 6) }),
    P('جبن غنم', 'c-cheese', 'كيلو', 9000, 12000, 6, 2, { supplierId: 's-2', packName: 'صينية', packSize: 4, batches: B(6, 8) }),
    P('كيمر عرب جاموس', 'c-kemar', 'كيلو', 14000, 18000, 6, 2, { supplierId: 's-1', packName: 'صينية', packSize: 3, batches: B(6, 3) }),
    P('كاهي', 'c-kemar', 'قطعة', 750, 1000, 40, 10, { packName: 'صينية', packSize: 20, batches: B(40, 1) }),
    P('عسل طبيعي محلي', 'c-honey', 'كيلو', 25000, 30000, 8, 2, { supplierId: 's-4' }),
    P('دبس تمر', 'c-honey', 'بطل', 3000, 4000, 15, 4, { icon: '🫗', supplierId: 's-4' }),
    P('راشي', 'c-honey', 'علبة', 3000, 4000, 12, 4, { icon: '🫙', supplierId: 's-4' }),
    P('دهن حر', 'c-ghee', 'كيلو', 18000, 22000, 5, 2, { supplierId: 's-1' }),
    P('بيض محلي', 'c-eggs', 'طبقة', 5000, 6000, 20, 5),
    P('بيض عرب', 'c-eggs', 'طبقة', 7500, 9000, 8, 3),
    P('جبن مثلثات مستورد', 'c-imported', 'علبة', 2500, 3250, 24, 6, { icon: '🧀', origin: 'imported', supplierId: 's-3' }),
    P('جبن موزريلا مستورد', 'c-imported', 'كيس', 4500, 6000, 10, 3, { icon: '🧀', origin: 'imported', supplierId: 's-3' }),
    P('زبدة مستوردة', 'c-imported', 'قطعة', 3000, 3750, 12, 4, { icon: '🧈', origin: 'imported', supplierId: 's-3' }),
    P('زيت نباتي ١ لتر', 'c-grocery', 'قنينة', 2250, 2750, 24, 6, { icon: '🛢️', supplierId: 's-3' }),
    P('معجون طماطة', 'c-grocery', 'علبة', 1000, 1250, 36, 10, { icon: '🍅', supplierId: 's-3' }),
    P('حمص معلّب', 'c-grocery', 'علبة', 750, 1000, 30, 8, { supplierId: 's-3' }),
    P('فاصوليا معلّبة', 'c-grocery', 'علبة', 750, 1000, 30, 8, { supplierId: 's-3' }),
    P('تمن عنبر', 'c-bulk', 'كيلو', 2500, 3000, 50, 10, { icon: '🍚', supplierId: 's-3' }),
    P('تمن بسمتي', 'c-bulk', 'كيلو', 2000, 2500, 40, 10, { icon: '🍚', supplierId: 's-3' }),
    P('عدس', 'c-bulk', 'كيلو', 1750, 2250, 25, 5, { icon: '🫘', supplierId: 's-3' }),
    P('فاصوليا يابسة', 'c-bulk', 'كيلو', 2500, 3000, 20, 5, { icon: '🫘', supplierId: 's-3' }),
    P('حمص يابس', 'c-bulk', 'كيلو', 2250, 2750, 20, 5, { icon: '🫘', supplierId: 's-3' }),
    P('برغل', 'c-bulk', 'كيلو', 1500, 2000, 15, 5, { supplierId: 's-3' }),
  ];
  return {
    settings: { ...DEFAULT_SETTINGS },
    categories, products, suppliers,
    customers: [], sales: [], purchases: [], payments: [], expenses: [], wastes: [],
    counters: { sale: 1000, purchase: 100 },
  };
}

function migrate(s) {
  const out = {
    customers: [], suppliers: [], categories: [], products: [], sales: [],
    purchases: [], payments: [], expenses: [], wastes: [], ...s,
  };
  out.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  out.counters = { sale: 1000, purchase: 100, ...(s.counters || {}) };
  out.products.forEach(p => {
    p.batches = p.batches || [];
    if (p.img === undefined) p.img = autoImg(p.name);
  });
  // التحويل لهوية الموقع (بس إذا القيم بعدها القديمة الافتراضية)
  const st = out.settings;
  if (st.shopName === 'البان ابو امنة') st.shopName = DEFAULT_SETTINGS.shopName;
  if (st.tagline === 'ألبان • أجبان • كيمر عرب • عسل طبيعي') st.tagline = DEFAULT_SETTINGS.tagline;
  if ((s.version || 1) < 2 && !st.address) st.address = DEFAULT_SETTINGS.address;
  if (st.footer === 'بالعافية عليكم .. نتشرف بزيارتكم مرة ثانية 🌿') st.footer = DEFAULT_SETTINGS.footer;
  out.version = 2;
  return out;
}

/* ---------------- المنطق ---------------- */
const S = {
  state: null,

  async init() {
    const saved = await DB.load();
    this.state = migrate(saved || seedState());
    if (!saved) this.save();
  },
  save() { DB.save(this.state); },
  get set() { return this.state.settings; },

  product(id) { return this.state.products.find(p => p.id === id); },
  category(id) { return this.state.categories.find(c => c.id === id); },
  customer(id) { return this.state.customers.find(c => c.id === id); },
  supplier(id) { return this.state.suppliers.find(c => c.id === id); },
  party(kind, id) { return kind === 'customer' ? this.customer(id) : this.supplier(id); },

  /* ---- الدفعات (للصلاحية) ---- */
  takeFromBatches(p, qty) {
    if (!p.batches || !p.batches.length || qty <= 0) return;
    const sorted = [...p.batches].sort((a, b) => (a.exp || '9999').localeCompare(b.exp || '9999'));
    let r = qty;
    for (const b of sorted) {
      if (r <= 0) break;
      const t = Math.min(b.qty, r);
      b.qty = round3(b.qty - t);
      r = round3(r - t);
    }
    p.batches = p.batches.filter(b => b.qty > 0.0005);
  },
  syncBatches(p) {
    const sum = (p.batches || []).reduce((a, b) => a + b.qty, 0);
    const stock = Math.max(0, p.stock);
    if (sum > stock) this.takeFromBatches(p, round3(sum - stock));
  },
  addBatch(p, qty, exp) {
    if (!exp || qty <= 0) return;
    p.batches = p.batches || [];
    const same = p.batches.find(b => b.exp === exp);
    if (same) same.qty = round3(same.qty + qty);
    else p.batches.push({ id: uid(), qty: round3(qty), exp, date: nowISO() });
  },

  /* ---- المواد ---- */
  saveProduct(data, init = {}) {
    if (data.id) {
      const p = this.product(data.id);
      Object.assign(p, data);
      p.stock = round3(p.stock);
      this.syncBatches(p);
    } else {
      const p = { batches: [], createdAt: nowISO(), ...data, id: uid() };
      p.stock = round3(p.stock || 0);
      if (init.exp && p.stock > 0) this.addBatch(p, p.stock, init.exp);
      this.state.products.push(p);
    }
    this.save();
  },
  deleteProduct(id) {
    this.state.products = this.state.products.filter(p => p.id !== id);
    this.save();
  },
  adjustStock(id, mode, qty, exp) {
    const p = this.product(id);
    qty = round3(qty);
    if (mode === 'set') p.stock = qty;
    else if (mode === 'add') { p.stock = round3(p.stock + qty); this.addBatch(p, qty, exp); }
    else { p.stock = round3(p.stock - qty); this.takeFromBatches(p, qty); }
    this.syncBatches(p);
    this.save();
  },
  removeBatch(pid, bid) {
    const p = this.product(pid);
    p.batches = p.batches.filter(b => b.id !== bid);
    this.save();
  },

  /* ---- الأصناف ---- */
  saveCategory(c) {
    if (c.id) Object.assign(this.category(c.id), c);
    else this.state.categories.push({ ...c, id: 'c-' + uid() });
    this.save();
  },
  deleteCategory(id) {
    this.state.categories = this.state.categories.filter(c => c.id !== id);
    this.save();
  },

  /* ---- البيع ---- */
  createSale({ lines, discount = 0, paid, customerId = '', note = '' }) {
    const items = lines.map(l => {
      const p = this.product(l.pid);
      return { pid: p.id, name: p.name, unit: p.unit, icon: p.icon, img: p.img || '', qty: round3(l.qty), price: +l.price, total: lineTotal(l), cost: +p.buy || 0 };
    });
    const subtotal = items.reduce((a, i) => a + i.total, 0);
    discount = Math.min(Math.max(0, Math.round(+discount || 0)), subtotal);
    const total = subtotal - discount;
    paid = Math.min(Math.max(0, Math.round(+paid || 0)), total);
    if (paid < total && !customerId) throw new Error('لازم تختار اسم الزبون إذا البيع بالدين');
    items.forEach(it => {
      const p = this.product(it.pid);
      p.stock = round3(p.stock - it.qty);
      this.takeFromBatches(p, it.qty);
    });
    const sale = {
      id: uid(), no: ++this.state.counters.sale, date: nowISO(), items, subtotal, discount, total, paid,
      customerId: customerId || '', note, returned: false, cashier: this.set.cashier || '',
    };
    this.state.sales.push(sale);
    this.save();
    return sale;
  },
  returnSale(id) {
    const s = this.state.sales.find(x => x.id === id);
    if (!s || s.returned) return;
    s.returned = true;
    s.returnedAt = nowISO();
    s.items.forEach(it => { const p = this.product(it.pid); if (p) p.stock = round3(p.stock + it.qty); });
    this.save();
  },

  /* ---- الوارد ---- */
  createPurchase({ supplierId, date, lines, paid, note, updateCost }) {
    const items = lines.map(l => {
      const p = this.product(l.pid);
      p.stock = round3(p.stock + l.qty);
      this.addBatch(p, l.qty, l.exp);
      if (updateCost && l.cost > 0) p.buy = Math.round(l.cost);
      return { pid: p.id, name: p.name, unit: p.unit, qty: round3(l.qty), cost: l.cost, total: Math.round(l.total), exp: l.exp || '', label: l.label };
    });
    const total = items.reduce((a, i) => a + i.total, 0);
    const pur = {
      id: uid(), no: ++this.state.counters.purchase, date: date || nowISO(), supplierId, items, total,
      paid: Math.min(Math.max(0, Math.round(+paid || 0)), total), note,
    };
    this.state.purchases.push(pur);
    this.save();
    return pur;
  },
  deletePurchase(id) {
    const pur = this.state.purchases.find(p => p.id === id);
    if (!pur) return;
    pur.items.forEach(it => {
      const p = this.product(it.pid);
      if (!p) return;
      p.stock = round3(p.stock - it.qty);
      if (it.exp) {
        const b = p.batches.find(x => x.exp === it.exp);
        if (b) b.qty = round3(b.qty - Math.min(b.qty, it.qty));
        p.batches = p.batches.filter(x => x.qty > 0.0005);
      }
      this.syncBatches(p);
    });
    this.state.purchases = this.state.purchases.filter(p => p.id !== id);
    this.save();
  },

  /* ---- الزبائن والموردين ---- */
  list(kind) { return kind === 'customer' ? this.state.customers : this.state.suppliers; },
  saveParty(kind, data) {
    const arr = this.list(kind);
    if (data.id) Object.assign(arr.find(x => x.id === data.id), data);
    else { const x = { ...data, id: uid(), createdAt: nowISO() }; arr.push(x); data = x; }
    this.save();
    return data;
  },
  partyHasMoves(kind, id) {
    if (this.state.payments.some(p => p.type === kind && p.partyId === id)) return true;
    return kind === 'customer'
      ? this.state.sales.some(s => s.customerId === id)
      : this.state.purchases.some(s => s.supplierId === id);
  },
  deleteParty(kind, id) {
    if (kind === 'customer') this.state.customers = this.state.customers.filter(x => x.id !== id);
    else this.state.suppliers = this.state.suppliers.filter(x => x.id !== id);
    this.save();
  },
  balances(kind) {
    const m = new Map();
    this.list(kind).forEach(x => m.set(x.id, +x.opening || 0));
    if (kind === 'customer') {
      for (const s of this.state.sales) if (s.customerId && !s.returned && m.has(s.customerId)) m.set(s.customerId, m.get(s.customerId) + s.total - s.paid);
    } else {
      for (const s of this.state.purchases) if (m.has(s.supplierId)) m.set(s.supplierId, m.get(s.supplierId) + s.total - s.paid);
    }
    for (const p of this.state.payments) if (p.type === kind && m.has(p.partyId)) m.set(p.partyId, m.get(p.partyId) - p.amount);
    return m;
  },
  balance(kind, id) { return this.balances(kind).get(id) || 0; },
  lastMove(kind, id) {
    let last = null;
    const src = kind === 'customer' ? this.state.sales.filter(s => s.customerId === id) : this.state.purchases.filter(s => s.supplierId === id);
    src.forEach(s => { if (!last || s.date > last) last = s.date; });
    this.state.payments.forEach(p => { if (p.type === kind && p.partyId === id && (!last || p.date > last)) last = p.date; });
    return last;
  },
  addPayment({ type, partyId, amount, note }) {
    const p = { id: uid(), type, partyId, amount: Math.round(+amount), note: note || '', date: nowISO() };
    this.state.payments.push(p);
    this.save();
    return p;
  },
  deletePayment(id) {
    this.state.payments = this.state.payments.filter(p => p.id !== id);
    this.save();
  },
  statement(kind, id) {
    const x = this.party(kind, id);
    const rows = [];
    if (+x.opening) rows.push({ date: x.createdAt, desc: 'رصيد سابق (قبل النظام)', debit: +x.opening, credit: 0 });
    if (kind === 'customer') {
      this.state.sales.filter(s => s.customerId === id).forEach(s => {
        if (s.returned) { rows.push({ date: s.date, desc: `فاتورة #${s.no} (مُرجعة)`, debit: 0, credit: 0, ref: s.id }); return; }
        rows.push({ date: s.date, desc: `فاتورة #${s.no} — ${s.items.length} مادة`, debit: s.total, credit: s.paid, ref: s.id });
      });
    } else {
      this.state.purchases.filter(s => s.supplierId === id).forEach(s => {
        rows.push({ date: s.date, desc: `وصل وارد #${s.no} — ${s.items.length} مادة`, debit: s.total, credit: s.paid });
      });
    }
    this.state.payments.filter(p => p.type === kind && p.partyId === id).forEach(p => {
      rows.push({ date: p.date, desc: kind === 'customer' ? 'تسديد' + (p.note ? ` — ${p.note}` : '') : 'دفعة إله' + (p.note ? ` — ${p.note}` : ''), debit: 0, credit: p.amount, payId: p.id });
    });
    rows.sort((a, b) => (a.date > b.date ? 1 : -1));
    let run = 0;
    rows.forEach(r => { run += r.debit - r.credit; r.balance = run; });
    return rows;
  },

  /* ---- المصاريف والتلف ---- */
  addExpense(e) {
    this.state.expenses.push({ id: uid(), date: e.date || nowISO(), category: e.category, amount: Math.round(+e.amount), note: e.note || '' });
    this.save();
  },
  deleteExpense(id) { this.state.expenses = this.state.expenses.filter(e => e.id !== id); this.save(); },
  addWaste({ pid, qty, reason, note }) {
    const p = this.product(pid);
    qty = round3(qty);
    p.stock = round3(p.stock - qty);
    this.takeFromBatches(p, qty);
    this.state.wastes.push({ id: uid(), date: nowISO(), pid, name: p.name, unit: p.unit, qty, cost: Math.round(qty * (+p.buy || 0)), reason, note: note || '' });
    this.save();
  },
  deleteWaste(id) {
    const w = this.state.wastes.find(x => x.id === id);
    const p = w && this.product(w.pid);
    if (p) p.stock = round3(p.stock + w.qty);
    this.state.wastes = this.state.wastes.filter(x => x.id !== id);
    this.save();
  },

  /* ---- التنبيهات ---- */
  alerts() {
    const days = +this.set.expiryDays || 3;
    const out = [], low = [], exp = [];
    for (const p of this.state.products) {
      if (p.stock <= 0) out.push(p);
      else if (p.stock <= (+p.min || 0)) low.push(p);
      for (const b of p.batches || []) {
        const d = daysUntil(b.exp);
        if (d <= days) exp.push({ p, b, d });
      }
    }
    exp.sort((a, b) => a.d - b.d);
    return { out, low, exp, count: out.length + low.length + exp.length };
  },
  nearestExp(p) {
    if (!p.batches || !p.batches.length) return null;
    return p.batches.reduce((m, b) => (!m || b.exp < m ? b.exp : m), null);
  },

  /* ---- التقارير ---- */
  report(from, to) {
    const f = +from, t = +to, st = this.state;
    const inR = d => { const x = +new Date(d); return x >= f && x <= t; };
    const r = {
      sales: 0, count: 0, cost: 0, discount: 0, cashSales: 0, debtNew: 0, returns: 0, returnsCount: 0,
      expenses: 0, waste: 0, custPay: 0, supPay: 0, purchases: 0, purchasesPaid: 0, items: 0,
      byCat: {}, byProd: {}, byDay: {}, expByCat: {}, byHour: Array(24).fill(0),
    };
    for (const s of st.sales) {
      if (!inR(s.date)) continue;
      if (s.returned) { r.returns += s.total; r.returnsCount++; continue; }
      r.count++; r.sales += s.total; r.discount += s.discount || 0;
      r.cashSales += s.paid; r.debtNew += s.total - s.paid;
      const k = dayKey(s.date);
      r.byDay[k] = (r.byDay[k] || 0) + s.total;
      r.byHour[new Date(s.date).getHours()] += s.total;
      for (const it of s.items) {
        const c = it.cost * it.qty;
        r.cost += c; r.items++;
        const p = this.product(it.pid);
        const cat = p ? p.catId : '_';
        const bc = r.byCat[cat] || (r.byCat[cat] = { total: 0, profit: 0 });
        bc.total += it.total; bc.profit += it.total - c;
        const bp = r.byProd[it.pid] || (r.byProd[it.pid] = { name: it.name, unit: it.unit, icon: it.icon || (p && p.icon) || '📦', img: (p && p.img) || it.img || '', qty: 0, total: 0, profit: 0 });
        bp.qty = round3(bp.qty + it.qty); bp.total += it.total; bp.profit += it.total - c;
      }
    }
    r.cost = Math.round(r.cost);
    r.gross = r.sales - r.cost;
    for (const e of st.expenses) if (inR(e.date)) { r.expenses += e.amount; r.expByCat[e.category] = (r.expByCat[e.category] || 0) + e.amount; }
    for (const w of st.wastes) if (inR(w.date)) r.waste += w.cost;
    for (const p of st.payments) if (inR(p.date)) { if (p.type === 'customer') r.custPay += p.amount; else r.supPay += p.amount; }
    for (const p of st.purchases) if (inR(p.date)) { r.purchases += p.total; r.purchasesPaid += p.paid; }
    r.net = r.gross - r.expenses - r.waste;
    r.cashFlow = r.cashSales + r.custPay - r.supPay - r.purchasesPaid - r.expenses;
    return r;
  },
  stockValue() {
    let cost = 0, sell = 0;
    for (const p of this.state.products) if (p.stock > 0) { cost += p.stock * (+p.buy || 0); sell += p.stock * (+p.sell || 0); }
    return { cost: Math.round(cost), sell: Math.round(sell) };
  },

  /* ---- النسخ الاحتياطي ---- */
  exportJSON() {
    this.set.lastBackup = nowISO();
    this.save();
    return JSON.stringify({ app: 'abu-amna', exportedAt: nowISO(), data: this.state }, null, 1);
  },
  importJSON(text) {
    const obj = JSON.parse(text);
    const data = obj && obj.data ? obj.data : obj;
    if (!data || !Array.isArray(data.products)) throw new Error('الملف مو نسخة صحيحة من النظام');
    this.state = migrate(data);
    this.save();
  },
  resetAll(keepProducts) {
    const fresh = seedState();
    if (keepProducts) {
      fresh.products = this.state.products;
      fresh.categories = this.state.categories;
      fresh.suppliers = this.state.suppliers.map(s => ({ ...s, opening: 0 }));
    }
    fresh.settings = { ...this.state.settings };
    this.state = migrate(fresh);
    this.save();
  },

  /* ---- بيانات تجريبية (حتى تشوف النظام شلون يشتغل) ---- */
  generateDemo() {
    const st = this.state;
    const names = ['أبو علي', 'أم حسين', 'حجي كاظم', 'أبو زينب', 'ست هدى', 'أبو مصطفى', 'جاسم الحلاق', 'مطعم الأصيل'];
    const custs = names.map((n, i) => {
      const c = { id: uid(), name: n, phone: '0770' + String(1000000 + i * 137731).slice(0, 7), note: '', opening: 0, createdAt: addDays(new Date(), -30).toISOString() };
      st.customers.push(c);
      return c;
    });
    const prods = st.products;
    if (!prods.length) return;
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    for (let d = 20; d >= 0; d--) {
      const base = startOfDay(addDays(new Date(), -d));
      const n = rnd(14, 34);
      for (let i = 0; i < n; i++) {
        const dt = new Date(base); dt.setHours(rnd(7, 21), rnd(0, 59), rnd(0, 59));
        if (d === 0 && dt > new Date()) continue;
        const items = [];
        const k = rnd(1, 4);
        for (let j = 0; j < k; j++) {
          const p = prods[rnd(0, prods.length - 1)];
          if (items.some(x => x.pid === p.id)) continue;
          const qty = p.fraction ? [0.25, 0.5, 1, 1.5, 2][rnd(0, 4)] : rnd(1, 3);
          items.push({ pid: p.id, name: p.name, unit: p.unit, icon: p.icon, qty, price: p.sell, total: Math.round(qty * p.sell), cost: p.buy });
        }
        const total = items.reduce((a, x) => a + x.total, 0);
        const debt = Math.random() < 0.12;
        const c = debt ? custs[rnd(0, custs.length - 1)] : null;
        st.sales.push({ id: uid(), no: ++st.counters.sale, date: dt.toISOString(), items, subtotal: total, discount: 0, total, paid: debt ? (Math.random() < 0.4 ? Math.round(total / 2000) * 1000 : 0) : total, customerId: c ? c.id : '', note: '', returned: false });
      }
      if (d % 6 === 0) st.expenses.push({ id: uid(), date: addDays(base, 0).toISOString(), category: 'كهرباء ومولدة', amount: 25000, note: 'اشتراك مولدة' });
      if (d % 3 === 0) st.expenses.push({ id: uid(), date: base.toISOString(), category: 'أكياس وتغليف', amount: rnd(3, 8) * 1000, note: '' });
      if (d % 5 === 2) st.payments.push({ id: uid(), type: 'customer', partyId: custs[rnd(0, custs.length - 1)].id, amount: rnd(2, 6) * 1000, note: '', date: new Date(base.getTime() + 15 * 36e5).toISOString() });
    }
    st.sales.sort((a, b) => (a.date > b.date ? 1 : -1));
    st.sales.forEach((s, i) => { s.no = 1001 + i; });
    st.counters.sale = 1000 + st.sales.length;
    this.save();
  },
};
