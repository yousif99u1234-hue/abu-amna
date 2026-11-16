'use strict';
/* =========================================================
   أدوات الواجهة — أيقونات، نوافذ، تنبيهات، طباعة
   ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtN = n => Math.round(+n || 0).toLocaleString('en-US');
const money = n => `<span class="money">${fmtN(n)}<small> د.ع</small></span>`;
const moneyT = n => `${fmtN(n)} د.ع`;
const fmtQty = q => String(round3(q));
const compact = n => {
  n = Math.round(+n || 0);
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' مليون';
  if (Math.abs(n) >= 1e3) return Math.round(n / 1e3) + ' ألف';
  return String(n);
};

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const fmtDate = d => { d = new Date(d); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtTime = d => { d = new Date(d); const h = d.getHours(); return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'ص' : 'م'}`; };
const fmtDT = d => `${fmtDate(d)} • ${fmtTime(d)}`;
const fmtLong = d => { d = new Date(d); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const relDay = d => {
  const k = dayKey(d);
  if (k === dayKey(new Date())) return 'اليوم';
  if (k === dayKey(addDays(new Date(), -1))) return 'البارحة';
  return fmtDate(d);
};
const expLabel = d => {
  if (d < 0) return d === -1 ? 'منتهي من البارحة' : `منتهي من ${-d} أيام`;
  if (d === 0) return 'ينتهي اليوم';
  if (d === 1) return 'ينتهي باچر';
  if (d === 2) return 'باقي يومين';
  if (d <= 10) return `باقي ${d} أيام`;
  return `باقي ${d} يوم`;
};
const qtyLabel = (q, unit) => {
  q = round3(q);
  if (unit === 'كيلو') {
    const m = { 0.25: 'ربع كيلو', 0.5: 'نص كيلو', 0.75: 'ثلاث أرباع', 1: 'كيلو', 1.5: 'كيلو ونص', 2: '2 كيلو' };
    if (m[q]) return m[q];
  }
  return `${fmtQty(q)} ${unit}`;
};

/* ---------------- الأيقونات ---------------- */
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  menu: '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  cash: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  trendDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  arrow: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
};
const icon = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* صورة المادة (أو الإيموجي إذا ماكو صورة) داخل حاوية بالكلاس المطلوب */
const pImg = (p, cls, style = '') => p && p.img
  ? `<div class="${cls} has-img" ${style}><img class="pimg" src="${esc(p.img)}" alt="${esc(p.name || '')}" loading="lazy"></div>`
  : `<div class="${cls}" ${style}>${(p && p.icon) || '📦'}</div>`;

/* ---------------- نوافذ ---------------- */
function openModal({ title, body, footer = '', size = '', onMount }) {
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close title="سد (Esc)">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>
    ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
  </div>`;
  root.appendChild(wrap);
  const m = wrap.firstElementChild;
  const onKey = e => {
    if (e.key === 'Escape' && root.lastElementChild === wrap) { e.stopPropagation(); close(); }
  };
  function close() {
    document.removeEventListener('keydown', onKey, true);
    wrap.classList.add('closing');
    setTimeout(() => wrap.remove(), 160);
  }
  document.addEventListener('keydown', onKey, true);
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
  $$('[data-close]', m).forEach(b => b.addEventListener('click', close));
  requestAnimationFrame(() => {
    const f = m.querySelector('[autofocus]') || m.querySelector('.modal-body input:not([type=checkbox]):not([type=radio]),.modal-body select,.modal-body textarea');
    if (f) { f.focus(); if (f.select) f.select(); }
  });
  if (onMount) onMount(m, close);
  return { el: m, close };
}

function confirmBox(msg, { ok = 'إي، كمّل', danger = false, title = 'متأكد؟' } = {}) {
  return new Promise(res => {
    let done = false;
    const { el, close } = openModal({
      title, size: 'sm',
      body: `<p class="confirm-msg">${msg}</p>`,
      footer: `<button class="btn btn-ghost" data-no>لا، رجوع</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${ok}</button>`,
    });
    const fin = v => { if (done) return; done = true; res(v); close(); };
    $('[data-yes]', el).onclick = () => fin(true);
    $('[data-no]', el).onclick = () => fin(false);
    $$('[data-close]', el).forEach(b => b.addEventListener('click', () => fin(false)));
    setTimeout(() => $('[data-yes]', el).focus(), 30);
  });
}

function toast(msg, type = 'ok', opts = {}) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const ic = type === 'ok' ? 'check' : type === 'err' ? 'x' : 'alert';
  t.innerHTML = `<span class="t-ic">${icon(ic, 18)}</span><span class="t-msg">${msg}</span>${opts.action ? `<button class="t-act">${opts.action.label}</button>` : ''}`;
  $('#toasts').appendChild(t);
  const rm = () => { t.classList.add('out'); setTimeout(() => t.remove(), 220); };
  if (opts.action) t.querySelector('.t-act').onclick = () => { opts.action.fn(); rm(); };
  setTimeout(rm, opts.duration || (opts.action ? 7000 : 3200));
}

/* ---------------- أدوات صغيرة ---------------- */
const opts = (arr, sel, map = x => [x, x]) => arr.map(x => { const [v, l] = map(x); return `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const field = (label, input, hint = '', cls = '') => `<div class="field ${cls}"><span class="lbl">${label}</span>${input}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
const empty = (ic, title, text = '', action = '') => `<div class="empty"><div class="empty-ic">${ic}</div><h4>${title}</h4>${text ? `<p>${text}</p>` : ''}${action}</div>`;
const num = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : 0; };

function downloadFile(name, content, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function toCSV(rows) {
  return '﻿' + rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
}

function waLink(phone, text) {
  let n = String(phone || '').replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '964' + n.slice(1);
  else if (n.length === 10 && n.startsWith('7')) n = '964' + n;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/* ---------------- الرسوم ---------------- */
function barChart(items, { height = 170 } = {}) {
  const max = Math.max(1, ...items.map(i => i.value));
  return `<div class="bars" style="--h:${height}px">${items.map(i => `
    <div class="bar-col ${i.hl ? 'hl' : ''}" title="${esc(i.title || i.label)}: ${moneyT(i.value)}">
      <div class="bar-val">${i.value ? compact(i.value) : ''}</div>
      <div class="bar-track"><div class="bar" style="height:${Math.max(i.value ? 3 : 0, (i.value / max) * 100)}%"></div></div>
      <div class="bar-lbl">${esc(i.label)}</div>
    </div>`).join('')}</div>`;
}
function hBars(items, fmt = moneyT) {
  const max = Math.max(1, ...items.map(i => i.value));
  return `<div class="hbars">${items.map((i, k) => `
    <div class="hbar">
      <div class="hbar-top"><span>${i.img ? `<img class="hbar-img" src="${esc(i.img)}" alt="">` : i.icon ? i.icon + ' ' : ''}${esc(i.label)}</span><b>${fmt(i.value)}</b></div>
      <div class="hbar-track"><div class="hbar-fill c${k % 6}" style="width:${Math.max(2, (i.value / max) * 100)}%"></div></div>
      ${i.sub ? `<div class="hbar-sub">${i.sub}</div>` : ''}
    </div>`).join('')}</div>`;
}

/* ---------------- الطباعة ---------------- */
const PRINT_CSS = {
  receipt: `@page{size:80mm auto;margin:3mm}*{box-sizing:border-box}body{margin:0;font-family:Tahoma,'Segoe UI',Arial,sans-serif;font-size:12px;color:#000;width:74mm}
  .rc-head{text-align:center;border-bottom:1px dashed #000;padding-bottom:6px;margin-bottom:6px}.rc-head h1{font-family:'Mataryah',Tahoma,sans-serif;font-weight:400;font-size:26px;margin:2px 0;line-height:1.2}
  .rc-logo{display:block;width:64px;height:64px;margin:0 auto 2px;border-radius:50%}.rc-tag{font-family:'Mataryah',Tahoma,sans-serif;font-size:14px}
  .rc-meta{display:flex;justify-content:space-between;font-size:11px;margin:2px 0}table{width:100%;border-collapse:collapse;margin:6px 0}th,td{padding:3px 2px;text-align:right;font-size:11px}
  th{border-bottom:1px solid #000}td.n,th.n{text-align:left;white-space:nowrap}tbody tr td{border-bottom:1px dotted #999}
  .rc-tot div{display:flex;justify-content:space-between;padding:2px 0}.rc-tot .big{font-size:15px;font-weight:bold;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;margin:3px 0}
  .rc-foot{text-align:center;margin-top:8px;font-size:11px;border-top:1px dashed #000;padding-top:6px}.rc-stamp{text-align:center;border:2px solid #000;font-weight:bold;padding:3px;margin:6px 0}`,
  a4: `@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;font-family:Tahoma,'Segoe UI',Arial,sans-serif;font-size:12px;color:#141210}
  h1,h2{font-family:'Mataryah',Tahoma,sans-serif;font-weight:400}h1{font-size:26px;margin:0}h2{font-size:18px;margin:18px 0 8px}.ph{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #D4A373;padding-bottom:8px;margin-bottom:12px}
  .muted{color:#7D6D58}table{width:100%;border-collapse:collapse}th,td{border:1px solid #E7D7B8;padding:6px;text-align:right}th{background:#F5ECD7}
  .kp{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kp div{border:1px solid #ccc;border-radius:6px;padding:8px}.kp b{display:block;font-size:15px;margin-top:4px}
  .n{white-space:nowrap}.neg{color:#b00}.pos{color:#060}`,
};
function printHTML(inner, mode = 'receipt') {
  const f = $('#print-frame');
  const d = f.contentDocument;
  d.open();
  d.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${esc(S.set.shopName)}</title><style>${typeof BRAND_FONT_CSS !== 'undefined' ? BRAND_FONT_CSS : ''}${PRINT_CSS[mode]}</style></head><body>${inner}</body></html>`);
  d.close();
  const go = () => { f.contentWindow.focus(); f.contentWindow.print(); };
  // ننتظر الخط يتحمّل حتى يطلع اسم المحل بخط الهوية
  Promise.race([d.fonts ? d.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 800))]).then(() => setTimeout(go, 100));
}

function receiptHTML(sale) {
  const st = S.set;
  const c = sale.customerId ? S.customer(sale.customerId) : null;
  const bal = c ? S.balance('customer', c.id) : 0;
  return `<div class="rc">
    <div class="rc-head"><img class="rc-logo" src="${BRAND_LOGO}" alt=""><h1>${esc(st.shopName)}</h1>
      <div class="rc-tag">${esc(st.tagline)}</div><div>📞 ${esc(st.phone)}</div>${st.address ? `<div>${esc(st.address)}</div>` : ''}</div>
    <div class="rc-meta"><span>فاتورة رقم: <b>${sale.no}</b></span><span>${fmtDate(sale.date)} ${fmtTime(sale.date)}</span></div>
    ${c ? `<div class="rc-meta"><span>الزبون: <b>${esc(c.name)}</b></span></div>` : ''}
    ${sale.cashier ? `<div class="rc-meta"><span>الكاشير: ${esc(sale.cashier)}</span></div>` : ''}
    <table><thead><tr><th>المادة</th><th class="n">الكمية</th><th class="n">السعر</th><th class="n">المجموع</th></tr></thead>
    <tbody>${sale.items.map(i => `<tr><td>${esc(i.name)}</td><td class="n">${esc(qtyLabel(i.qty, i.unit))}</td><td class="n">${fmtN(i.price)}</td><td class="n">${fmtN(i.total)}</td></tr>`).join('')}</tbody></table>
    <div class="rc-tot">
      ${sale.discount ? `<div><span>المجموع</span><span>${moneyT(sale.subtotal)}</span></div><div><span>الخصم</span><span>- ${moneyT(sale.discount)}</span></div>` : ''}
      <div class="big"><span>الصافي</span><span>${moneyT(sale.total)}</span></div>
      ${sale.paid < sale.total ? `<div><span>الواصل</span><span>${moneyT(sale.paid)}</span></div><div><span>الباقي (دين)</span><span>${moneyT(sale.total - sale.paid)}</span></div>` : ''}
      ${c && bal > 0 ? `<div><span>مجموع الحساب عليه</span><span><b>${moneyT(bal)}</b></span></div>` : ''}
    </div>
    ${sale.returned ? '<div class="rc-stamp">فاتورة مُرجعة</div>' : ''}
    ${sale.note ? `<div style="margin-top:4px">ملاحظة: ${esc(sale.note)}</div>` : ''}
    <div class="rc-foot">${esc(st.footer)}</div>
  </div>`;
}
const printReceipt = sale => printHTML(receiptHTML(sale), 'receipt');
