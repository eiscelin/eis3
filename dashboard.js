(function () {
  var SESSION_KEY = 'chookee_session';
  var DATA_PREFIX = 'chookee_dash_';
  var ROYALTY_RATE = 0.05;
  var LOGO = 'https://media.base44.com/images/public/6a5f4191b1d0b2ff4c467b0a/867435e10_ChatGPTImageAug28202603_34_51PM1.png';

  var PRODUCTS = [
    { id: 'chicken',  name: 'Whole Chicken',            unit: 'per kg',   price: 190 },
    { id: 'marinade', name: 'Chicken Inasal Marinade', unit: '1L pouch', price: 180 },
    { id: 'rice',     name: 'Java Rice Premix',        unit: '1kg pack', price: 95 },
    { id: 'atchara',  name: 'Atchara',                 unit: '1kg tub',  price: 120 },
    { id: 'box',      name: 'Packaging Box',          unit: '50 pcs',   price: 250 },
    { id: 'skewers',  name: 'Bamboo Skewers',          unit: '500 pcs',  price: 150 },
    { id: 'sauce',    name: 'Soy Garlic Sauce',        unit: '1L',       price: 140 },
    { id: 'annatto',  name: 'Annatto Oil',            unit: '500ml',    price: 130 }
  ];

  var TAB_META = {
    overview: ['Dashboard Overview', "Here's what's happening at your branch today."],
    orders:   ['Supply Orders', 'Order products from the main office and track fulfillment.'],
    sales:    ['Sales & Royalty', 'Record daily sales and monitor your royalty balance.'],
    profile:  ['Branch Profile', 'Manage your branch information.']
  };

  var user = null;
  var data = null;
  var draft = [];
  var root = null;
  var activeTab = 'overview';

  /* ---------- styles ---------- */
  var style = document.createElement('style');
  style.textContent = [
    'body.dash-mode .topbar,body.dash-mode header,body.dash-mode main,body.dash-mode footer{display:none!important}',
    '.dash-root{min-height:100vh;display:flex;background:#f6f1e7}',
    '.dash-side{width:252px;background:#161616;color:#fff;padding:24px 16px;display:flex;flex-direction:column;gap:7px;position:sticky;top:0;height:100vh;flex-shrink:0}',
    '.side-brand{display:flex;gap:11px;align-items:center;font-weight:900;margin:0 6px 26px;font-size:15px;line-height:1.1}',
    '.side-brand img{width:42px;height:42px;border-radius:11px}',
    '.side-brand small{display:block;color:#999;font-size:9px;letter-spacing:1.3px;text-transform:uppercase;font-weight:700;margin-top:3px}',
    '.dash-nav-item{display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:12px;color:#cfc9c0;font-weight:700;font-size:14px;cursor:pointer;border:0;background:transparent;text-align:left;width:100%;font-family:inherit}',
    '.dash-nav-item:hover{background:rgba(255,255,255,.07);color:#fff}',
    '.dash-nav-item.active{background:var(--red);color:#fff}',
    '.side-foot{margin-top:auto;font-size:11px;color:#777;padding:0 6px}',
    '.dash-main{flex:1;padding:28px 36px;width:100%;max-width:1140px}',
    '.dash-topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px;gap:16px}',
    '.dash-topbar h2{margin:0 0 4px;font-size:28px;letter-spacing:-1px}',
    '.dash-topbar p{margin:0;color:var(--muted);font-size:13.5px}',
    '.dash-user{display:flex;align-items:center;gap:12px;font-weight:800;font-size:14px}',
    '.dash-avatar{width:38px;height:38px;border-radius:50%;background:var(--yellow);color:#171000;display:grid;place-items:center;font-weight:900;text-transform:uppercase}',
    '.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:22px}',
    '.stat-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 6px 20px rgba(35,25,8,.05)}',
    '.stat-card .label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8b8477;font-weight:800}',
    '.stat-card .value{font-size:26px;font-weight:950;margin-top:9px;letter-spacing:-1px}',
    '.stat-card .hint{font-size:12px;color:var(--muted);margin-top:5px}',
    '.stat-card.accent{background:linear-gradient(135deg,var(--deep-red),var(--red));color:#fff;border:0}',
    '.stat-card.accent .label{color:rgba(255,255,255,.82)}',
    '.stat-card.accent .hint{color:rgba(255,255,255,.75)}',
    '.panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:0 6px 20px rgba(35,25,8,.05)}',
    '.panel h3{margin:0 0 14px;font-size:17px;letter-spacing:-.4px;display:flex;justify-content:space-between;align-items:center}',
    '.dash-2col{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin-bottom:16px}',
    '.table-wrap{overflow-x:auto}',
    'table.dash-table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:440px}',
    '.dash-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#8b8477;padding:9px 10px;border-bottom:1px solid var(--line)}',
    '.dash-table td{padding:11px 10px;border-bottom:1px solid #f4efe5;font-weight:600}',
    '.dash-table tr:last-child td{border-bottom:0}',
    '.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}',
    '.badge.pending{background:#fff0c1;color:#9a6000}',
    '.badge.production{background:#e3ecff;color:#274b9f}',
    '.badge.dispatched{background:#f3e5ff;color:#6b2fa0}',
    '.badge.delivered{background:#e2f5e8;color:var(--green)}',
    '.badge.cancelled{background:#fdeaea;color:var(--deep-red)}',
    '.catalog-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.prod-card{border:1px solid var(--line);border-radius:14px;padding:13px;background:#fffaf0}',
    '.prod-card .p-name{font-weight:800;font-size:13px}',
    '.prod-card .p-unit{color:var(--muted);font-size:11px;margin:2px 0 7px}',
    '.prod-card .p-price{font-weight:900;color:var(--red);font-size:13px;margin-bottom:9px}',
    '.prod-row{display:flex;gap:7px}',
    '.prod-row input{width:64px;padding:8px;border:1px solid #ded8ca;border-radius:9px;font:inherit;font-size:13px;background:#fff}',
    '.draft-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f4efe5;font-size:13.5px;font-weight:700;gap:8px}',
    '.link-btn{border:0;background:transparent;color:var(--red);font-weight:800;cursor:pointer;font-size:12px;padding:0;font-family:inherit}',
    '.draft-total{display:flex;justify-content:space-between;font-weight:950;font-size:16px;margin:14px 0}',
    '.empty{color:var(--muted);font-size:13px;padding:16px 0;text-align:center}',
    '.form-field label{display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#8b8477;margin-bottom:6px}',
    '.form-field input,.form-field textarea{width:100%;padding:11px 12px;border:1px solid #ded8ca;border-radius:11px;font:inherit;background:#fffaf0;box-sizing:border-box}',
    '.form-field input:focus{outline:2px solid var(--red);outline-offset:1px;border-color:transparent}',
    '.form-field input:disabled{background:#f0ece3;color:var(--muted)}',
    '.form-field{margin-bottom:13px}',
    '.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}',
    '.btn-sm{padding:10px 15px;font-size:13px;border-radius:11px}',
    '.royalty-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px}',
    '.royalty-strip .panel{padding:17px 18px;display:flex;flex-direction:column;gap:6px}',
    '.royalty-strip .label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8b8477;font-weight:800}',
    '.royalty-strip .value{font-size:21px;font-weight:900;letter-spacing:-.5px}',
    '.barchart{display:flex;align-items:flex-end;gap:9px;height:150px;padding-top:4px}',
    '.barchart .bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;text-align:center}',
    '.barchart .bar i{display:block;background:linear-gradient(180deg,var(--orange),var(--red));border-radius:6px 6px 0 0;min-height:4px}',
    '.barchart .bar span{font-size:10px;color:var(--muted);margin-top:7px;font-weight:700}',
    '@media(max-width:900px){',
    ' .dash-root{flex-direction:column}',
    ' .dash-side{width:100%;height:auto;position:static;flex-direction:row;align-items:center;overflow-x:auto;padding:12px 14px;gap:6px}',
    ' .side-brand{margin:0 12px 0 0}',
    ' .side-brand small{display:none}',
    ' .side-foot{display:none}',
    ' .dash-nav-item{padding:9px 12px;white-space:nowrap;width:auto}',
    ' .dash-main{padding:20px 16px}',
    ' .stat-grid,.royalty-strip{grid-template-columns:1fr 1fr}',
    ' .dash-2col{grid-template-columns:1fr}',
    ' .catalog-grid,.form-grid{grid-template-columns:1fr}',
    ' .dash-topbar{flex-wrap:wrap}',
    '}'
  ].join('');
  document.head.appendChild(style);

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function peso(n) { return '₱' + Number(n.toFixed(2)).toLocaleString('en-PH'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayISO() { return isoOf(new Date()); }
  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }
  function toastEl(msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function prodById(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function itemsTotal(items) {
    return items.reduce(function (a, it) { return a + it.price * it.qty; }, 0);
  }

  /* ---------- data ---------- */
  function loadData(u) {
    var raw = localStorage.getItem(DATA_PREFIX + u);
    if (raw) { try { return JSON.parse(raw); } catch (e) { /* reseed */ } }
    var d = seed(u);
    saveData(d);
    return d;
  }
  function saveData() { localStorage.setItem(DATA_PREFIX + user, JSON.stringify(data)); }

  function seed(u) {
    var now = new Date();
    function daysAgo(n) { var d = new Date(now); d.setDate(d.getDate() - n); return isoOf(d); }
    var sales = [];
    for (var i = 13; i >= 0; i--) {
      sales.push({ id: 'S' + (1000 + i), date: daysAgo(i), amount: 8500 + Math.round(Math.random() * 15) * 300 });
    }
    function items(list) {
      return list.map(function (p) {
        var prod = prodById(p[0]);
        return { id: prod.id, name: prod.name, unit: prod.unit, price: prod.price, qty: p[1] };
      });
    }
    return {
      profile: {
        name: u + "'s Branch",
        code: 'CHI-' + (Math.floor(Math.random() * 90) + 10),
        address: '',
        opened: isoOf(now)
      },
      orders: [
        { no: 'ORD-1001', date: daysAgo(6), status: 'Delivered',     items: items([['chicken', 40], ['marinade', 10], ['rice', 20]]) },
        { no: 'ORD-1002', date: daysAgo(3), status: 'In Production', items: items([['chicken', 25], ['box', 4], ['skewers', 2]]) },
        { no: 'ORD-1003', date: daysAgo(1), status: 'Pending',       items: items([['marinade', 6], ['annatto', 5], ['atchara', 3]]) }
      ],
      sales: sales,
      orderSeq: 1004
    };
  }

  /* ---------- stats ---------- */
  function monthKey(iso) { return iso.slice(0, 7); }
  function salesSum(fn) { return data.sales.filter(fn).reduce(function (a, s) { return a + s.amount; }, 0); }
  function stats() {
    var today = todayISO();
    var month = monthKey(today);
    var open = data.orders.filter(function (o) {
      return o.status === 'Pending' || o.status === 'In Production' || o.status === 'Dispatched';
    }).length;
    return {
      todaySales: salesSum(function (s) { return s.date === today; }),
      monthSales: salesSum(function (s) { return monthKey(s.date) === month; }),
      royaltyDue: salesSum(function (s) { return monthKey(s.date) === month; }) * ROYALTY_RATE,
      openOrders: open
    };
  }

  /* ---------- shell ---------- */
  function buildShell() {
    var tabs = ['overview', 'orders', 'sales', 'profile'];
    var icons = { overview: '📊', orders: '📦', sales: '📈', profile: '🏪' };
    var labels = { overview: 'Overview', orders: 'Supply Orders', sales: 'Sales & Royalty', profile: 'Branch Profile' };
    return '' +
      '<aside class="dash-side">' +
        '<div class="side-brand"><img src="' + LOGO + '" alt="Chookee Inasal"><div>Chookee Inasal<small>Franchisee Portal</small></div></div>' +
        tabs.map(function (t) {
          return '<button class="dash-nav-item' + (t === activeTab ? ' active' : '') + '" data-tab="' + t + '">' + icons[t] + ' ' + labels[t] + '</button>';
        }).join('') +
        '<div class="side-foot">Central Franchise System v1.0</div>' +
      '</aside>' +
      '<div class="dash-main">' +
        '<div class="dash-topbar">' +
          '<div><h2 id="dashTitle"></h2><p id="dashSub"></p></div>' +
          '<div class="dash-user">' +
            '<div class="dash-avatar">' + esc(user.charAt(0)) + '</div>' +
            '<span>' + esc(user) + '</span>' +
            '<a class="btn btn-outline btn-sm" id="logoutBtn" href="#">Log Out</a>' +
          '</div>' +
        '</div>' +
        '<div id="dashView"></div>' +
      '</div>';
  }

  /* ---------- shared builders ---------- */
  function badge(status) {
    var icons = { 'Pending': '⏳', 'In Production': '🧑‍🍳', 'Dispatched': '🚚', 'Delivered': '✅', 'Cancelled': '✖️' };
    var cls = status.toLowerCase().replace(' ', '-');
    return '<span class="badge ' + cls + '">' + (icons[status] || '') + ' ' + esc(status) + '</span>';
  }
  function ordersTable(orders, withAction) {
    if (!orders.length) return '<div class="empty">No orders yet. Place your first supply order!</div>';
    var rows = orders.map(function (o) {
      var detail = o.items.map(function (it) { return it.qty + ' × ' + it.name; }).join(', ');
      return '<tr>' +
        '<td><strong>' + esc(o.no) + '</strong></td>' +
        '<td>' + fmtDate(o.date) + '</td>' +
        '<td title="' + esc(detail) + '">' + o.items.length + ' item' + (o.items.length === 1 ? '' : 's') + '</td>' +
        '<td>' + peso(itemsTotal(o.items)) + '</td>' +
        '<td>' + badge(o.status) + '</td>' +
        (withAction
          ? '<td>' + (o.status === 'Pending'
              ? '<button class="link-btn" data-cancel="' + esc(o.no) + '">Cancel</button>'
              : '') + '</td>'
          : '') +
      '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="dash-table"><thead><tr>' +
      '<th>Order No.</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th>' +
      (withAction ? '<th></th>' : '') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function sortedOrders() {
    return data.orders.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.no.localeCompare(a.no);
    });
  }
  function sortedSales() {
    return data.sales.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id));
    });
  }

  /* ---------- views ---------- */
  function viewOverview() {
    var s = stats();
    var monthName = new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

    var cards = [
      { label: "Today's Sales", value: peso(s.todaySales), hint: fmtDate(todayISO()), accent: false },
      { label: 'This Month Sales', value: peso(s.monthSales), hint: monthName, accent: false },
      { label: 'Royalty Due', value: peso(s.royaltyDue), hint: '5% of monthly gross sales', accent: true },
      { label: 'Open Orders', value: s.openOrders, hint: 'Awaiting fulfillment', accent: false }
    ].map(function (c) {
      return '<div class="stat-card' + (c.accent ? ' accent' : '') + '">' +
        '<div class="label">' + c.label + '</div>' +
        '<div class="value">' + c.value + '</div>' +
        '<div class="hint">' + c.hint + '</div></div>';
    }).join('');

    /* last 7 days bar chart */
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      days.push({ iso: isoOf(d), label: d.toLocaleDateString('en-PH', { weekday: 'short' }) });
    }
    var amounts = days.map(function (d) {
      return salesSum(function (s) { return s.date === d.iso; });
    });
    var max = Math.max.apply(null, amounts.concat([1]));
    var bars = days.map(function (d, idx) {
      var h = Math.round(amounts[idx] / max * 100);
      return '<div class="bar" title="' + peso(amounts[idx]) + ' on ' + fmtDate(d.iso) + '">' +
        '<i style="height:' + h + '%"></i><span>' + d.label + '</span></div>';
    }).join('');

    return '' +
      '<div class="stat-grid">' + cards + '</div>' +
      '<div class="dash-2col">' +
        '<div class="panel"><h3>Recent Supply Orders <button class="link-btn" data-goto-tab="orders">View all →</button></h3>' +
          ordersTable(sortedOrders().slice(0, 5), false) + '</div>' +
        '<div class="panel"><h3>Sales — Last 7 Days</h3><div class="barchart">' + bars + '</div></div>' +
      '</div>' +
      '<div class="panel"><h3>Recent Sales Entries <button class="link-btn" data-goto-tab="sales">View all →</button></h3>' +
        salesTable(sortedSales().slice(0, 5), false) + '</div>';
  }

  function salesTable(sales, withDelete) {
    if (!sales.length) return '<div class="empty">No sales recorded yet.</div>';
    var rows = sales.map(function (s) {
      return '<tr>' +
        '<td>' + fmtDate(s.date) + '</td>' +
        '<td>' + peso(s.amount) + '</td>' +
        (withDelete ? '<td><button class="link-btn" data-del-sale="' + esc(s.id) + '">✕ Delete</button></td>' : '') +
      '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="dash-table"><thead><tr><th>Date</th><th>Amount</th>' +
      (withDelete ? '<th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function viewOrders() {
    var catalog = PRODUCTS.map(function (p) {
      return '<div class="prod-card">' +
        '<div class="p-name">' + esc(p.name) + '</div>' +
        '<div class="p-unit">' + esc(p.unit) + '</div>' +
        '<div class="p-price">' + peso(p.price) + '</div>' +
        '<div class="prod-row">' +
          '<input type="number" min="1" step="1" value="1" aria-label="Quantity for ' + esc(p.name) + '">' +
          '<button class="btn btn-yellow btn-sm" data-add="' + p.id + '">Add</button>' +
        '</div></div>';
    }).join('');

    return '' +
      '<div class="dash-2col">' +
        '<div class="panel"><h3>Product Catalog <small style="color:var(--muted);font-weight:600;font-size:12px">Prices from main office</small></h3>' +
          '<div class="catalog-grid">' + catalog + '</div></div>' +
        '<div class="panel"><h3>Current Order Draft</h3>' +
          '<div id="draftList"></div>' +
          '<div class="draft-total" id="draftTotalWrap"></div>' +
          '<button class="btn btn-red" id="placeOrderBtn" style="width:100%">Place Order</button>' +
          '<p class="empty" style="padding:10px 0 0;margin:0;font-size:11px">Orders get an automatic reference number and are reviewed by the production team.</p>' +
        '</div>' +
      '</div>' +
      '<div class="panel" style="margin-top:16px"><h3>All Orders</h3>' + ordersTable(sortedOrders(), true) + '</div>';
  }

  function renderDraft() {
    var list = root.querySelector('#draftList');
    var wrap = root.querySelector('#draftTotalWrap');
    var btn = root.querySelector('#placeOrderBtn');
    if (!list) return;
    if (!draft.length) {
      list.innerHTML = '<div class="empty">Add products from the catalog to start an order.</div>';
      wrap.innerHTML = '';
      btn.disabled = true;
      btn.style.opacity = '.5';
      return;
    }
    list.innerHTML = draft.map(function (d, idx) {
      var p = prodById(d.id);
      return '<div class="draft-row">' +
        '<span>' + esc(p.name) + ' × ' + d.qty + '<br><small style="color:var(--muted);font-weight:600">' + esc(p.unit) + ' — ' + peso(p.price) + ' each</small></span>' +
        '<span style="display:flex;align-items:center;gap:12px"><strong>' + peso(p.price * d.qty) + '</strong>' +
        '<button class="link-btn" data-rm="' + idx + '">✕</button></span>' +
      '</div>';
    }).join('');
    wrap.innerHTML = '<span>Total</span><span>' + peso(itemsTotal(draft.map(function (d) {
      var p = prodById(d.id); return { price: p.price, qty: d.qty };
    }))) + '</span>';
    btn.disabled = false;
    btn.style.opacity = '1';
  }

  function viewSales() {
    var s = stats();
    return '' +
      '<div class="royalty-strip">' +
        '<div class="panel"><div class="label">Sales This Month</div><div class="value">' + peso(s.monthSales) + '</div></div>' +
        '<div class="panel"><div class="label">Royalty Rate</div><div class="value">5%</div></div>' +
        '<div class="panel"><div class="label">Royalty Due</div><div class="value" style="color:var(--red)">' + peso(s.royaltyDue) + '</div></div>' +
      '</div>' +
      '<div class="dash-2col">' +
        '<div class="panel"><h3>Record Daily Sales</h3>' +
          '<form id="salesForm">' +
            '<div class="form-grid">' +
              '<div class="form-field"><label for="saleDate">Date</label><input type="date" id="saleDate" value="' + todayISO() + '" required></div>' +
              '<div class="form-field"><label for="saleAmount">Amount (₱)</label><input type="number" id="saleAmount" min="1" step="0.01" placeholder="0.00" required></div>' +
            '</div>' +
            '<button class="btn btn-red btn-sm" type="submit">Record Sales</button>' +
          '</form>' +
          '<p class="empty" style="text-align:left;padding:12px 0 0;margin:0;font-size:11px">Royalty is computed at 5% of gross monthly sales and invoiced by the main office.</p>' +
        '</div>' +
        '<div class="panel"><h3>Sales History</h3>' + salesTable(sortedSales(), true) + '</div>' +
      '</div>';
  }

  function viewProfile() {
    var p = data.profile;
    return '' +
      '<div class="panel" style="max-width:600px">' +
        '<h3>Branch Information</h3>' +
        '<form id="profileForm">' +
          '<div class="form-grid">' +
            '<div class="form-field"><label for="pfName">Branch Name</label><input id="pfName" required value="' + esc(p.name) + '"></div>' +
            '<div class="form-field"><label for="pfCode">Branch Code</label><input id="pfCode" value="' + esc(p.code) + '"></div>' +
          '</div>' +
          '<div class="form-field"><label for="pfAddr">Branch Address</label><input id="pfAddr" placeholder="Unit, street, barangay, city" value="' + esc(p.address) + '"></div>' +
          '<div class="form-grid">' +
            '<div class="form-field"><label for="pfOpened">Date Opened</label><input type="date" id="pfOpened" value="' + esc(p.opened) + '"></div>' +
            '<div class="form-field"><label>Franchise Owner</label><input value="' + esc(user) + '" disabled></div>' +
          '</div>' +
          '<button class="btn btn-red btn-sm" type="submit">Save Changes</button>' +
        '</form>' +
      '</div>';
  }

  /* ---------- render ---------- */
  function renderView() {
    if (!root || !user) return;
    root.querySelectorAll('.dash-nav-item').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === activeTab);
    });
    var meta = TAB_META[activeTab];
    root.querySelector('#dashTitle').textContent = meta[0];
    root.querySelector('#dashSub').textContent = meta[1];
    var views = { overview: viewOverview, orders: viewOrders, sales: viewSales, profile: viewProfile };
    root.querySelector('#dashView').innerHTML = views[activeTab]();
    if (activeTab === 'orders') renderDraft();
  }

  function mount() {
    var session = localStorage.getItem(SESSION_KEY);
    if (!session) { unmount(); return; }
    var wasMounted = !!root;
    user = session;
    data = loadData(user);
    if (!root) {
      root = document.createElement('div');
      root.className = 'dash-root';
      document.body.appendChild(root);
    }
    document.body.classList.add('dash-mode');
    if (!wasMounted) activeTab = 'overview';
    root.innerHTML = buildShell();
    renderView();
  }

  function unmount() {
    if (root) root.remove();
    root = null;
    document.body.classList.remove('dash-mode');
    user = null;
    data = null;
    draft = [];
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    if (!root || !user) return;
    var t = e.target;
    if (!t.closest || !t.closest('.dash-root')) return;

    var nav = t.closest('.dash-nav-item');
    if (nav) { activeTab = nav.getAttribute('data-tab'); renderView(); return; }

    var goto = t.closest('[data-goto-tab]');
    if (goto) { activeTab = goto.getAttribute('data-goto-tab'); renderView(); return; }

    var add = t.closest('[data-add]');
    if (add) {
      var p = prodById(add.getAttribute('data-add'));
      var input = add.parentNode.querySelector('input');
      var qty = Math.max(1, parseInt(input && input.value, 10) || 1);
      var found = draft.filter(function (d) { return d.id === p.id; })[0];
      if (found) found.qty += qty; else draft.push({ id: p.id, qty: qty });
      renderDraft();
      toastEl(p.name + ' added to order draft.');
      return;
    }

    var rm = t.closest('[data-rm]');
    if (rm) { draft.splice(parseInt(rm.getAttribute('data-rm'), 10), 1); renderDraft(); return; }

    var place = t.closest('#placeOrderBtn');
    if (place && !place.disabled && draft.length) {
      data.orderSeq = (data.orderSeq || 1000) + 1;
      var no = 'ORD-' + data.orderSeq;
      var items = draft.map(function (d) {
        var prod = prodById(d.id);
        return { id: prod.id, name: prod.name, unit: prod.unit, price: prod.price, qty: d.qty };
      });
      data.orders.unshift({ no: no, date: todayISO(), status: 'Pending', items: items });
      draft = [];
      saveData();
      renderView();
      toastEl('Order ' + no + ' placed! The production team will review it.');
      return;
    }

    var cancel = t.closest('[data-cancel]');
    if (cancel) {
      var no2 = cancel.getAttribute('data-cancel');
      data.orders.forEach(function (o) { if (o.no === no2) o.status = 'Cancelled'; });
      saveData();
      renderView();
      toastEl('Order ' + no2 + ' cancelled.');
      return;
    }

    var del = t.closest('[data-del-sale]');
    if (del) {
      var id = del.getAttribute('data-del-sale');
      data.sales = data.sales.filter(function (s) { return String(s.id) !== id; });
      saveData();
      renderView();
      return;
    }
  });

  document.addEventListener('submit', function (e) {
    if (!root || !user) return;
    if (!e.target.closest || !e.target.closest('.dash-root')) return;

    if (e.target.id === 'salesForm') {
      e.preventDefault();
      var date = root.querySelector('#saleDate').value;
      var amount = parseFloat(root.querySelector('#saleAmount').value);
      if (!date || !amount || amount <= 0) return;
      data.sales.push({ id: 'S' + Date.now(), date: date, amount: amount });
      saveData();
      renderView();
      toastEl('Sales of ' + peso(amount) + ' recorded for ' + fmtDate(date) + '.');
      return;
    }
    if (e.target.id === 'profileForm') {
      e.preventDefault();
      data.profile.name = root.querySelector('#pfName').value.trim() || data.profile.name;
      data.profile.code = root.querySelector('#pfCode').value.trim();
      data.profile.address = root.querySelector('#pfAddr').value.trim();
      data.profile.opened = root.querySelector('#pfOpened').value;
      saveData();
      toastEl('Branch profile saved.');
      renderView();
      return;
    }
  });

  window.addEventListener('chookee:session', mount);
  mount();
})();
