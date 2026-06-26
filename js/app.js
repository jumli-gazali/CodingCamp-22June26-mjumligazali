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

// Sort state
let sortMode = 'amount-desc';

// Monthly budget limit (0 = not set)
let monthlyBudgetLimit = 0;
const BUDGET_LIMIT_KEY = 'expense_budget_limit';

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

function saveBudgetLimit() {
  window.localStorage.setItem(BUDGET_LIMIT_KEY, String(monthlyBudgetLimit));
}

function loadBudgetLimit() {
  const raw = window.localStorage.getItem(BUDGET_LIMIT_KEY);
  return raw ? Number(raw) : 0;
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
// Amount input — format with thousand separators (dots) as user types
// ---------------------------------------------------------------------------

function initAmountInput() {
  const display = document.getElementById('amount-display');
  const hidden  = document.getElementById('amount');
  if (!display || !hidden) return;

  display.addEventListener('input', () => {
    // Strip everything except digits
    const digits = display.value.replace(/\D/g, '');
    // Format: 25000 → "25.000"
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    display.value = formatted;
    // Store raw numeric value in hidden input
    hidden.value = digits;
  });

  display.addEventListener('keydown', (e) => {
    // Allow: backspace, delete, tab, arrows, home, end
    if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    // Block non-numeric keys
    if (!/^\d$/.test(e.key)) e.preventDefault();
  });
}

// ---------------------------------------------------------------------------
// Color helpers — random assignment from pool, avoiding colors already in use
// ---------------------------------------------------------------------------

const COLOR_POOL = [
  '#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF',
  '#FF9F40','#2ECC71','#E74C3C','#3498DB','#9B59B6',
  '#1ABC9C','#F39C12','#D35400','#27AE60','#2980B9',
  '#8E44AD','#16A085','#F1C40F','#E67E22','#95A5A6',
];

function pickRandomColor() {
  const used = new Set(allCategories().map((c) => c.color.toUpperCase()));
  const available = COLOR_POOL.filter((c) => !used.has(c.toUpperCase()));
  const pool = available.length > 0 ? available : COLOR_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}


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

function getSorted(txns) {
  const arr = txns.slice();
  switch (sortMode) {
    case 'amount-desc':   return arr.sort((a, b) => b.amount - a.amount);
    case 'amount-asc':    return arr.sort((a, b) => a.amount - b.amount);
    case 'category-asc':  return arr.sort((a, b) => a.category.localeCompare(b.category));
    case 'entry-desc':    return arr.sort((a, b) => (b.createdAt ?? b.timestamp) - (a.createdAt ?? a.timestamp));
    case 'entry-asc':     return arr.sort((a, b) => (a.createdAt ?? a.timestamp) - (b.createdAt ?? b.timestamp));
    case 'date-desc':     return arr.sort((a, b) => b.timestamp - a.timestamp);
    case 'date-asc':      return arr.sort((a, b) => a.timestamp - b.timestamp);
    default:              return arr.sort((a, b) => b.amount - a.amount);
  }
}

function renderTransactionList(txns) {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;
  listEl.style.overflowY = 'auto';
  listEl.innerHTML = '';

  const sorted = getSorted(txns);

  sorted.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.setAttribute('data-id', t.id);
    li.setAttribute('data-category', t.category);
    li.style.setProperty('--cat-color', categoryColor(t.category));

    const dateLabel = new Date(t.timestamp).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    li.innerHTML = `
      <span class="transaction-name">${escapeHtml(t.itemName)}<span class="transaction-date">${dateLabel}</span></span>
      <span class="transaction-amount">${IDR.format(t.amount)}</span>
      <span class="transaction-category">${escapeHtml(t.category)}</span>
      <button class="btn-edit" data-id="${t.id}" aria-label="Edit ${escapeHtml(t.itemName)}">✏️</button>
      <button class="btn-delete" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.itemName)}">✕</button>
    `;
    li.querySelector('.btn-edit').addEventListener('click', () => openEditModal(t.id));
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
    const wrap = canvas?.parentElement;
    if (wrap) wrap.style.display = 'none';
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

  const wrap = canvas?.parentElement;
  if (wrap) wrap.style.display = '';
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
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { padding: 12, font: { size: 12 }, usePointStyle: true, pointStyleWidth: 10, boxWidth: 10 },
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
    renderBudgetBar(content, 0);
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

  const overBudget = monthlyBudgetLimit > 0 && total > monthlyBudgetLimit;

  content.innerHTML = `
    <div class="summary-total${overBudget ? ' over-budget' : ''}">
      Total: <strong>${IDR.format(total)}</strong>
      ${overBudget ? '<span class="budget-exceeded-badge">⚠ Over Budget</span>' : ''}
      <span style="opacity:0.6;font-size:0.8rem">(${monthTxns.length} transaction${monthTxns.length !== 1 ? 's' : ''})</span>
    </div>
    <div class="summary-rows">${rows}</div>
  `;

  renderBudgetBar(content, total);
}

function renderBudgetBar(container, total) {
  // Remove existing budget bar if any
  const existing = container.querySelector('.budget-bar-section');
  if (existing) existing.remove();

  if (monthlyBudgetLimit <= 0) return;

  const pct        = Math.min((total / monthlyBudgetLimit) * 100, 100);
  const over       = total > monthlyBudgetLimit;
  const remaining  = monthlyBudgetLimit - total;

  const section = document.createElement('div');
  section.className = 'budget-bar-section';
  section.innerHTML = `
    <div class="budget-bar-header">
      <span class="budget-bar-label">Monthly Budget</span>
      <span class="budget-bar-limit">${IDR.format(monthlyBudgetLimit)}</span>
    </div>
    <div class="budget-bar-track">
      <div class="budget-bar-fill${over ? ' over' : ''}" style="width:${pct}%"></div>
    </div>
    <div class="budget-bar-footer">
      ${over
        ? `<span class="budget-over-text">⚠ Over by ${IDR.format(Math.abs(remaining))}</span>`
        : `<span class="budget-remain-text">${IDR.format(remaining)} remaining</span>`
      }
      <span class="budget-pct-text">${pct.toFixed(0)}%</span>
    </div>
  `;
  container.prepend(section);
}

// ---------------------------------------------------------------------------
// Render — master (chart filtered by summaryMonth, so all views stay in sync)
// ---------------------------------------------------------------------------

function render() {
  renderBalance(transactions);
  renderTransactionList(transactions);
  renderPieChart();        // uses summaryYear/summaryMonth
  renderMonthlySummary();  // same filter
  renderManageCategories();
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

  transactions.push({ id: generateUUID(), itemName: itemName.trim(), amount: parseFloat(amount), category, timestamp, createdAt: Date.now() });
  saveToLocalStorage(transactions);
  render();
  event.target.reset();
  // Clear the formatted display field (not reset by form.reset() since it's text)
  const display = document.getElementById('amount-display');
  if (display) display.value = '';
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
  const errEl   = document.getElementById('category-add-error');
  if (!nameEl) return;

  const name  = nameEl.value.trim();
  const color = pickRandomColor(); // auto-assign
  if (errEl) errEl.textContent = '';

  if (!name) { if (errEl) errEl.textContent = 'Category name required.'; return; }
  if (allCategories().some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    if (errEl) errEl.textContent = 'Category already exists.'; return;
  }

  customCategories.push({ name, color });
  saveCategories();
  refreshCategorySelect();
  const sel = document.getElementById('category');
  if (sel) sel.value = name;
  const panel = document.getElementById('new-category-panel');
  if (panel) panel.hidden = true;
  nameEl.value = '';
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
// Manage categories (render delete list)
// ---------------------------------------------------------------------------

function renderManageCategories() {
  const container = document.getElementById('manage-cat-list');
  if (!container) return;

  const cats = allCategories();
  if (cats.length === 0) { container.innerHTML = '<p class="summary-empty">No categories.</p>'; return; }

  container.innerHTML = '';
  cats.forEach(({ name, color }) => {
    const isBuiltin = BUILTIN_CATEGORIES.some((b) => b.name === name);
    const row = document.createElement('div');
    row.className = 'manage-cat-row';

    // Color swatch + hidden color input for changing color
    row.innerHTML = `
      <span class="manage-cat-dot" style="background:${color}" title="${color}"></span>
      <span class="manage-cat-dot color-swatch-inline" style="background:${color};cursor:${isBuiltin ? 'default' : 'pointer'}" data-name="${escapeHtml(name)}" title="${color}"></span>
      <span class="manage-cat-name">${escapeHtml(name)}</span>
      <span class="manage-cat-color-badge" style="font-size:0.7rem;color:var(--text-muted)">${color}</span>
      ${isBuiltin ? '' : `
        <input type="color" class="color-picker-inline" value="${color}" data-name="${escapeHtml(name)}" aria-label="Change color for ${escapeHtml(name)}" />
        <button class="btn-change-color" data-name="${escapeHtml(name)}" title="Change color">🎨</button>
        <button class="btn-delete-cat" data-name="${escapeHtml(name)}" aria-label="Delete ${escapeHtml(name)}">✕</button>
      `}
    `;

    if (!isBuiltin) {
      const colorInput = row.querySelector('.color-picker-inline');
      const changeBtn  = row.querySelector('.btn-change-color');
      const deleteBtn  = row.querySelector('.btn-delete-cat');
      const dot        = row.querySelector('.manage-cat-dot');
      const badge      = row.querySelector('.manage-cat-color-badge');

      changeBtn.addEventListener('click', () => colorInput.click());

      colorInput.addEventListener('input', (e) => {
        const newColor = e.target.value;
        // Update custom category color in state
        const idx = customCategories.findIndex((c) => c.name === name);
        if (idx !== -1) {
          customCategories[idx].color = newColor;
          saveCategories();
          // Update all transaction item CSS vars in DOM
          document.querySelectorAll(`.transaction-item[data-category="${CSS.escape(name)}"]`)
            .forEach((el) => el.style.setProperty('--cat-color', newColor));
          // Live update swatch and badge
          dot.style.background = newColor;
          dot.title = newColor;
          badge.textContent = newColor;
          // Refresh chart if category visible
          if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
          renderPieChart();
        }
      });

      deleteBtn.addEventListener('click', () => handleDeleteCategory(name));
    }
    container.appendChild(row);
  });
}

function handleDeleteCategory(name) {
  // Prevent deleting if transactions still use this category
  const inUse = transactions.some((t) => t.category === name);
  if (inUse) {
    alert(`Cannot delete "${name}" — transactions still use this category.`);
    return;
  }
  customCategories = customCategories.filter((c) => c.name !== name);
  saveCategories();
  refreshCategorySelect();
  renderManageCategories();
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------

function openEditModal(id) {
  const t = transactions.find((x) => x.id === id);
  if (!t) return;

  document.getElementById('edit-id').value       = t.id;
  document.getElementById('edit-item-name').value = t.itemName;
  document.getElementById('edit-amount').value    = t.amount;

  // Format display
  const displayEl = document.getElementById('edit-amount-display');
  if (displayEl) displayEl.value = String(Math.round(t.amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Date
  const d = new Date(t.timestamp);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  document.getElementById('edit-date').value = `${yyyy}-${mm}-${dd}`;

  // Populate category select in modal
  const sel = document.getElementById('edit-category');
  if (sel) {
    sel.innerHTML = '';
    allCategories().forEach(({ name }) => {
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      if (name === t.category) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // Clear errors
  ['edit-item-name-error','edit-amount-error','edit-category-error'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  const modal = document.getElementById('edit-modal');
  if (modal) modal.hidden = false;
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.hidden = true;
}

function handleEditSubmit(event) {
  event.preventDefault();

  const id       = document.getElementById('edit-id').value;
  const itemName = document.getElementById('edit-item-name').value;
  const amount   = document.getElementById('edit-amount').value;
  const category = document.getElementById('edit-category').value;
  const dateStr  = document.getElementById('edit-date').value;

  ['edit-item-name-error','edit-amount-error','edit-category-error'].forEach((id) => {
    const el = document.getElementById(id); if (el) el.textContent = '';
  });

  const { valid, errors } = validateForm(itemName, amount, category, dateStr);
  if (!valid) {
    if (errors.itemName) setError('edit-item-name-error', errors.itemName);
    if (errors.amount)   setError('edit-amount-error',   errors.amount);
    if (errors.category) setError('edit-category-error', errors.category);
    return;
  }

  const timestamp = dateStr ? new Date(dateStr + 'T12:00:00').getTime() : Date.now();

  transactions = transactions.map((t) =>
    t.id === id
      ? { ...t, itemName: itemName.trim(), amount: parseFloat(amount), category, timestamp }
      : t
  );  saveToLocalStorage(transactions);
  closeEditModal();
  render();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  customCategories = loadCategories();
  transactions     = loadFromLocalStorage();
  monthlyBudgetLimit = loadBudgetLimit();

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
  initAmountInput();

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    sortMode = e.target.value;
    renderTransactionList(transactions);
  });

  // Edit modal
  document.getElementById('edit-form')?.addEventListener('submit', handleEditSubmit);
  document.getElementById('btn-edit-cancel')?.addEventListener('click', closeEditModal);
  document.getElementById('edit-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditModal();
  });

  // Manage categories modal
  document.getElementById('btn-manage-categories')?.addEventListener('click', () => {
    renderManageCategories();
    const modal = document.getElementById('manage-cat-modal');
    if (modal) modal.hidden = false;
  });
  document.getElementById('btn-manage-cat-close')?.addEventListener('click', () => {
    const modal = document.getElementById('manage-cat-modal');
    if (modal) modal.hidden = true;
  });
  document.getElementById('manage-cat-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      const modal = document.getElementById('manage-cat-modal');
      if (modal) modal.hidden = true;
    }
  });

  // Edit modal amount input formatter
  const editDisplay = document.getElementById('edit-amount-display');
  const editHidden  = document.getElementById('edit-amount');
  if (editDisplay && editHidden) {
    editDisplay.addEventListener('input', () => {
      const digits = editDisplay.value.replace(/\D/g, '');
      editDisplay.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      editHidden.value = digits;
    });
    editDisplay.addEventListener('keydown', (e) => {
      if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      if (!/^\d$/.test(e.key)) e.preventDefault();
    });
  }

  // Budget limit input
  const budgetDisplay = document.getElementById('budget-limit-display');
  const budgetHidden  = document.getElementById('budget-limit');
  if (budgetDisplay) {
    // Pre-fill if saved
    if (monthlyBudgetLimit > 0) {
      budgetDisplay.value = String(monthlyBudgetLimit).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    budgetDisplay.addEventListener('input', () => {
      const digits = budgetDisplay.value.replace(/\D/g, '');
      budgetDisplay.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if (budgetHidden) budgetHidden.value = digits;
    });
    budgetDisplay.addEventListener('keydown', (e) => {
      if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      if (!/^\d$/.test(e.key)) e.preventDefault();
    });
  }

  document.getElementById('btn-set-budget')?.addEventListener('click', () => {
    const raw = document.getElementById('budget-limit')?.value ?? '';
    const val = Number(raw);
    monthlyBudgetLimit = (Number.isFinite(val) && val > 0) ? val : 0;
    saveBudgetLimit();
    renderMonthlySummary();
  });

  document.getElementById('btn-clear-budget')?.addEventListener('click', () => {
    monthlyBudgetLimit = 0;
    saveBudgetLimit();
    const disp = document.getElementById('budget-limit-display');
    if (disp) disp.value = '';
    const hid = document.getElementById('budget-limit');
    if (hid) hid.value = '';
    renderMonthlySummary();
  });
});
