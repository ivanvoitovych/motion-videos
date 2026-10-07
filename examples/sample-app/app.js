// The sample app's behaviour. Nothing here knows it is being filmed.
const $ = id => document.getElementById(id);
const money = n => '$' + n.toLocaleString('en-US');

const orders = [
  { id: 1047, customer: 'Maya Kern',  plant: 'Monstera',        qty: 1, total: 39,  status: 'Pending' },
  { id: 1046, customer: 'Tom Idris',  plant: 'Snake plant',     qty: 3, total: 54,  status: 'Pending' },
  { id: 1045, customer: 'Nora Ellis', plant: 'Boston fern',     qty: 2, total: 48,  status: 'Shipped' },
  { id: 1044, customer: 'Alex Poole', plant: 'Fiddle-leaf fig', qty: 1, total: 31,  status: 'Shipped' },
  { id: 1043, customer: 'Ines Duarte', plant: 'Monstera',       qty: 2, total: 78,  status: 'Delivered' },
  { id: 1042, customer: 'Sam Okafor', plant: 'Boston fern',     qty: 5, total: 120, status: 'Delivered' },
];
const perDay = [9, 12, 11, 15, 14, 19, 17, 22, 21, 26, 24, 29, 33, 31];

// ---- views ----
const show = name => {
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('on', v.id === name);
  for (const a of document.querySelectorAll('nav a')) a.classList.toggle('on', a.dataset.view === name);
};
for (const a of document.querySelectorAll('nav a')) a.addEventListener('click', e => { e.preventDefault(); show(a.dataset.view); });
$('who').textContent = localStorage.getItem('fernway-session') || '';

// ---- dashboard ----
const drawStats = () => {
  $('stat-orders').textContent = perDay.reduce((a, b) => a + b, 0) + orders.length - 6;
  $('stat-revenue').textContent = money(8420 + orders.slice(0, orders.length - 6).reduce((a, o) => a + o.total, 0));
  $('stat-pending').textContent = orders.filter(o => o.status === 'Pending').length;
};
const X = i => 20 + i * 860 / (perDay.length - 1), Y = v => 240 - v * 6.4;
$('plot').innerHTML =
  [0, 15, 30].map(v => `<line class="grid" x1="20" x2="880" y1="${Y(v)}" y2="${Y(v)}"/>`).join('') +
  `<polyline class="line" pathLength="1" points="${perDay.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`;

// ---- orders ----
let fresh = 0;
const drawRows = () => {
  const want = $('filter').value;
  $('rows').innerHTML = orders.filter(o => want === 'All' || o.status === want).map(o =>
    `<tr class="${o.id === fresh ? 'fresh' : ''}"><td>#${o.id}</td><td>${o.customer}</td><td>${o.plant}</td><td>${o.qty}</td><td>${money(o.total)}</td>` +
    `<td><span class="badge ${o.status.toLowerCase()}">${o.status}</span></td></tr>`).join('');
};
$('filter').addEventListener('change', drawRows);

// ---- the dialog ----
const form = $('order');
const open = on => { $('veil').classList.toggle('on', on); if (on) { form.reset(); $('qty').textContent = 1; } };
$('new').addEventListener('click', () => open(true));
$('cancel').addEventListener('click', () => open(false));
form.quantity.addEventListener('input', () => { $('qty').textContent = form.quantity.value; });
form.addEventListener('submit', e => {
  e.preventDefault();
  const price = Number(form.plant.selectedOptions[0].dataset.price), qty = Number(form.quantity.value);
  fresh = orders[0].id + 1;
  orders.unshift({ id: fresh, customer: form.customer.value.trim(), plant: form.plant.value, qty, total: price * qty + (form.gift.checked ? 4 : 0), status: 'Pending' });
  open(false);
  drawRows();
  drawStats();
  toast(`Order #${fresh} saved`);
});

// ---- toast: goes away by itself after three seconds ----
let hide;
const toast = text => {
  $('toast').textContent = text;
  $('toast').classList.add('on');
  clearTimeout(hide);
  hide = setTimeout(() => $('toast').classList.remove('on'), 3000);
};

// ---- settings ----
$('dark').addEventListener('change', () => document.documentElement.classList.toggle('dark', $('dark').checked));

drawStats();
drawRows();
