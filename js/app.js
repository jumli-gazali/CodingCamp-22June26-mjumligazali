// Expense Budget Visualizer

// ---------------------------------------------------------------------------
// Rupiah formatter
// ---------------------------------------------------------------------------

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {{ id:string, itemName:string, amount:number, category:string, timestamp:number }[]} */
let transactions = [];

const BUILTIN_CATEGORIES = [
  { name: 'Food',      color: '#FF6384' },
  { name: 'Transport', color: '#36A2EB' },
  { name: 'Fun',       color: '#FFCE56' },
];

let customCategories = [];

let summaryYear  = new Date().getFullYear();
let summaryMonth = new Date().getMonth(); // 0-indexed

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY            = 'expense_transactions';
const CATEGORIES_STORAGE_KEY = 'expense_custom_categories';
const DARK_MODE_KEY          = 'expense_dark_mode';

function saveToLocalStorage(txns) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
}

function loadFromLocalStorage() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); }
  catch { window.localStorage.removeItem(STORAGE_KEY); return []; }
}

function saveCategories() {
  window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(customCategories));
}

function loadCategories() {
  const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); }
  catch { return []; }
}

// ---------------------------------------------------------------------------
// UUID
// ---------------------------------------------------------------------------

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

function allCategories() {
  return [...BUILTIN_CATEGORIES, ...customCategories];
}

function categoryColor(name) {
  const cat = allCategories().find((c) => c.name === name);
  return cat ? cat.color : '#AAAAAA';
}

/** Rebuild <select> — keeps placeholder as first item, appends custom, ends with "Add new" */
function refreshCategorySelect() {
  const sel = document.getElementById('category');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select Category --';
  sel.appendChild(placeholder);

  allCategories().forEach(({ name }) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });

  const addNew = document.createElement('option');
  addNew.value = '__new__';
  addNew.textContent = '+ Add new category…';
  sel.appendChild(addNew);

  // Restore previous selection if still valid
  if (currentVal && currentVal !== '__new__') sel.value = currentVal;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

function validateForm(itemName, amount, category, dateStr) {
  const errors = {};
  if (typeof itemName !== 'string' || itemName.trim().length === 0) {
    errors.itemName = 'Item name is required.';
  }
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.amount = 'Amount must be a positive number.';
  }
  if (!allCategories().some((c) => c.name === category)) {
    errors.category = 'Please select a valid category.';
  }
  // date is optional — if provided, must be a valid date string
  if (dateStr && isNaN(Date.parse(dateStr))) {
    errors.date = 'Invalid date.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

// ---------------------------------------------------------------------------
// Render — Hero balance
// ---------------------------------------------------------------------------

function renderBalance(txns) {
  const total = txns.reduce((s, t) => s + t.amount, 0);
  const el = document.getElementById('balance');
  if (el) el.textContent = IDR.format(total);
}

// ---------------------------------------------------------------------------
// Render — Transaction list
// ---------------------------------------------------------------------------

function renderTransactionList(txns) {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;
  listEl.style.overflowY = 'auto';
  listEl.innerHTML = '';

  const sorted = txns.slice().sort((a, b) => b.timestamp - a.timestamp);

  sorted.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.setAttribute('data-id', t.id);
    li.setAttribute('data-category', t.category);
    li.style.setProperty('--cat-color', categoryColor(t.category));

    const dateLabel = new Date(t.timestamp).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    li.innerHTML = `
      <span class="transaction-name">${escapeHtml(t.itemName)}<span class="transaction-date">${dateLabel}</span></span>
      <span class="transaction-amount">${IDR.format(t.amount)}</span>
      <span class="transaction-category">${escapeHtml(t.category)}</span>
      <button class="btn-delete" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.itemName)}">✕</button>
    `;
    li.querySelector('.btn-delete').addEventListener('click', () => handleDelete(t.id));
    listEl.appendChild(li);
  });
}

// ---------------------------------------------------------------------------
// Render — Pie chart (filtered by summaryMonth/summaryYear)
// ---------------------------------------------------------------------------

let chartInstance = null;

function renderPieChart() {
  const canvas      = document.getElementById('pie-chart');
  const placeholder = document.getElementById('chart-placeholder');
  const totalLabel  = document.getElementById('chart-total-label');
  const monthLabel  = document.getElementById('chart-month-label');

  // Filter to current summary month
  const monthTxns = transactions.filter((t) => {
    const d = new Date(t.timestamp);
    return d.getFullYear() === summaryYear && d.getMonth() === summaryMonth;
  });

  const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  if (monthLabel) monthLabel.textContent = `${MONTH_NAMES[summaryMonth]} ${summaryYear}`;

  if (monthTxns.length === 0) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (canvas) canvas.style.display = 'none';
    if (placeholder) placeholder.style.display = '';
    if (totalLabel) totalLabel.textContent = '';
    return;
  }

  if (typeof Chart === 'undefined') {
    const sec = document.querySelector('.chart-section');
    if (sec) sec.style.display = 'none';
    return;
  }

  const totals = {};
  monthTxns.forEach((t) => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const labels = Object.keys(totals);
  const data   = labels.map((c) => totals[c]);
  const colors = labels.map((c) => categoryColor(c));
  const monthTotal = monthTxns.reduce((s, t) => s + t.amount, 0);

  if (canvas) canvas.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';
  if (totalLabel) totalLabel.textContent = `Total: ${IDR.format(monthTotal)}`;

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.update();
    return;
  }

  const percentLabelPlugin = {
    id: 'percentLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const ds    = chart.data.datasets[0];
      const total = ds.data.reduce((s, v) => s + v, 0);
      const meta  = chart.getDatasetMeta(0);
      ctx.save();
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      meta.data.forEach((arc, i) => {
        const pct = total > 0 ? (ds.data[i] / total) * 100 : 0;
        if (pct < 5) return;
        const angle = (arc.startAngle + arc.endAngle) / 2;
        const r = (arc.innerRadius + arc.outerRadius) / 2;
        ctx.fillText(`${pct.toFixed(1)}%`, arc.x + Math.cos(angle) * r, arc.y + Math.sin(angle) * r);
      });
      ctx.restore();
    },
  };

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff' }] },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, font: { size: 13 }, usePointStyle: true, pointStyleWidth: 10 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val   = ctx.parsed;
              const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
              const pct   = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return `${ctx.label}: ${IDR.format(val)} (${pct}%)`;
            },
          },
        },
      },
    },
    plugins: [percentLabelPlugin],
  });
}

// ---------------------------------------------------------------------------
// Render — Monthly summary
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function renderMonthlySummary() {
  const label   = document.getElementById('summary-month-label');
  const content = document.getElementById('monthly-summary-content');
  if (!label || !content) return;

  label.textContent = `${MONTH_NAMES[summaryMonth]} ${summaryYear}`;

  const monthTxns = transactions.filter((t) => {
    const d = new Date(t.timestamp);
    return d.getFullYear() === summaryYear && d.getMonth() === summaryMonth;
  });

  if (monthTxns.length === 0) {
    content.innerHTML = '<p class="summary-empty">No transactions this month.</p>';
    return;
  }

  const total = monthTxns.reduce((s, t) => s + t.amount, 0);
  const byCategory = {};
  monthTxns.forEach((t) => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });

  const rows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct   = ((amt / total) * 100).toFixed(1);
      const color = categoryColor(cat);
      return `
        <div class="summary-row">
          <span class="summary-cat-dot" style="background:${color}"></span>
          <span class="summary-cat-name">${escapeHtml(cat)}</span>
          <div class="summary-bar-wrap"><div class="summary-bar" style="width:${pct}%;background:${color}"></div></div>
          <span class="summary-pct">${pct}%</span>
          <span class="summary-amt">${IDR.format(amt)}</span>
        </div>`;
    }).join('');

  content.innerHTML = `
    <div class="summary-total">Total: <strong>${IDR.format(total)}</strong> (${monthTxns.length} transaksi)</div>
    <div class="summary-rows">${rows}</div>
  `;
}

// ---------------------------------------------------------------------------
// Render — master (chart filtered by summaryMonth, so all views stay in sync)
// ---------------------------------------------------------------------------

function render() {
  renderBalance(transactions);
  renderTransactionList(transactions);
  renderPieChart();        // uses summaryYear/summaryMonth
  renderMonthlySummary();  // same filter
}

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------

function applyDarkMode(enabled) {
  document.body.classList.toggle('dark', enabled);
  const btn = document.getElementById('dark-mode-toggle');
  if (btn) btn.textContent = enabled ? '☀️' : '🌙';
}

function initDarkMode() {
  applyDarkMode(window.localStorage.getItem(DARK_MODE_KEY) === 'true');
  const btn = document.getElementById('dark-mode-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      window.localStorage.setItem(DARK_MODE_KEY, isDark);
      applyDarkMode(isDark);
    });
  }
}

// ---------------------------------------------------------------------------
// HTML escape
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function handleFormSubmit(event) {
  event.preventDefault();

  const itemNameEl = document.getElementById('item-name');
  const amountEl   = document.getElementById('amount');
  const categoryEl = document.getElementById('category');
  const dateEl     = document.getElementById('txn-date');

  const itemName = itemNameEl?.value ?? '';
  const amount   = amountEl?.value   ?? '';
  const category = categoryEl?.value ?? '';
  const dateStr  = dateEl?.value     ?? '';

  // Clear errors
  ['item-name-error','amount-error','category-error','date-error'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  const { valid, errors } = validateForm(itemName, amount, category, dateStr);
  if (!valid) {
    if (errors.itemName) setError('item-name-error', errors.itemName);
    if (errors.amount)   setError('amount-error',    errors.amount);
    if (errors.category) setError('category-error',  errors.category);
    if (errors.date)     setError('date-error',       errors.date);
    return;
  }

  // Use the user-selected date at noon (avoids timezone day-shift), or now
  const timestamp = dateStr
    ? new Date(dateStr + 'T12:00:00').getTime()
    : Date.now();

  // Sync summary view to the transaction's month so chart stays in sync
  const d = new Date(timestamp);
  summaryYear  = d.getFullYear();
  summaryMonth = d.getMonth();

  transactions.push({ id: generateUUID(), itemName: itemName.trim(), amount: parseFloat(amount), category, timestamp });
  saveToLocalStorage(transactions);
  render();
  event.target.reset();
  // Hide new-category panel if open
  const panel = document.getElementById('new-category-panel');
  if (panel) panel.hidden = true;
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function handleDelete(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveToLocalStorage(transactions);
  render();
}

function handleCategoryChange() {
  const sel   = document.getElementById('category');
  const panel = document.getElementById('new-category-panel');
  if (!sel || !panel) return;
  panel.hidden = sel.value !== '__new__';
}

function handleAddCategory() {
  const nameEl  = document.getElementById('new-category-name');
  const colorEl = document.getElementById('new-category-color');
  const errEl   = document.getElementById('category-add-error');
  if (!nameEl || !colorEl) return;

  const name  = nameEl.value.trim();
  const color = colorEl.value;
  if (errEl) errEl.textContent = '';

  if (!name) { if (errEl) errEl.textContent = 'Category name required.'; return; }
  if (allCategories().some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    if (errEl) errEl.textContent = 'Category already exists.'; return;
  }

  customCategories.push({ name, color });
  saveCategories();
  refreshCategorySelect();
  // Auto-select the newly created category
  const sel = document.getElementById('category');
  if (sel) sel.value = name;
  // Hide panel
  const panel = document.getElementById('new-category-panel');
  if (panel) panel.hidden = true;
  nameEl.value = '';
  colorEl.value = '#9b5de5';
}

function handlePrevMonth() {
  summaryMonth--;
  if (summaryMonth < 0) { summaryMonth = 11; summaryYear--; }
  // destroy chart so it recreates for new month
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  renderPieChart();
  renderMonthlySummary();
}

function handleNextMonth() {
  summaryMonth++;
  if (summaryMonth > 11) { summaryMonth = 0; summaryYear++; }
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  renderPieChart();
  renderMonthlySummary();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  customCategories = loadCategories();
  transactions     = loadFromLocalStorage();

  // Set date input default to today
  const dateEl = document.getElementById('txn-date');
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);

  refreshCategorySelect();
  initDarkMode();
  render();

  document.getElementById('transaction-form')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('category')?.addEventListener('change', handleCategoryChange);
  document.getElementById('btn-add-category')?.addEventListener('click', handleAddCategory);
  document.getElementById('btn-prev-month')?.addEventListener('click', handlePrevMonth);
  document.getElementById('btn-next-month')?.addEventListener('click', handleNextMonth);
});
