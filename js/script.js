/* ============================================================
   EXPENSE & BUDGET VISUALIZER
   Vanilla JS · Local Storage · Canvas pie chart
   ============================================================ */

// ── 1. CONSTANTS ─────────────────────────────────────────────
const LS_TRANSACTIONS = 'budgetku_transactions';
const LS_CATEGORIES   = 'budgetku_categories';
const LS_THEME        = 'budgetku_theme';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

// Palette for chart slices and category badges
const PALETTE = [
  '#4f46e5', '#e53e3e', '#38a169', '#d69e2e',
  '#3182ce', '#805ad5', '#dd6b20', '#319795',
  '#e53e3e', '#2b6cb0', '#b7791f', '#2c7a7b',
];

// ── 2. STATE ──────────────────────────────────────────────────
let transactions = [];   // [{ id, name, amount, category, type, date }]
let categories   = [];   // ['Food', 'Transport', 'Fun', …custom]
let currentSort  = 'default';

// ── 3. LOCAL STORAGE HELPERS ──────────────────────────────────
function saveTransactions() {
  localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
}

function saveCategories() {
  localStorage.setItem(LS_CATEGORIES, JSON.stringify(categories));
}

function loadFromStorage() {
  try {
    const storedTx  = localStorage.getItem(LS_TRANSACTIONS);
    const storedCat = localStorage.getItem(LS_CATEGORIES);

    transactions = storedTx  ? JSON.parse(storedTx)  : [];
    categories   = storedCat ? JSON.parse(storedCat) : [...DEFAULT_CATEGORIES];

    // Guard: must be arrays
    if (!Array.isArray(transactions)) transactions = [];
    if (!Array.isArray(categories))   categories   = [...DEFAULT_CATEGORIES];

    // Guard: each transaction must have required fields
    transactions = transactions.filter(
      t => t && typeof t.id === 'string'
            && typeof t.name === 'string'
            && typeof t.amount === 'number'
            && typeof t.category === 'string'
            && (t.type === 'income' || t.type === 'expense')
    );
  } catch {
    transactions = [];
    categories   = [...DEFAULT_CATEGORIES];
  }
}

// ── 4. THEME ──────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (theme === 'dark') {
    icon.textContent  = '☀️';
    label.textContent = 'Terang';
  } else {
    icon.textContent  = '🌙';
    label.textContent = 'Gelap';
  }
  localStorage.setItem(LS_THEME, theme);
}

function loadTheme() {
  const saved = localStorage.getItem(LS_THEME);
  applyTheme(saved === 'dark' ? 'dark' : 'light');
}

// ── 5. CURRENCY FORMATTER ─────────────────────────────────────
function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ── 6. SUMMARY ────────────────────────────────────────────────
function updateSummary() {
  const totalIncome  = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  document.getElementById('totalIncome').textContent  = formatIDR(totalIncome);
  document.getElementById('totalExpense').textContent = formatIDR(totalExpense);
  document.getElementById('totalBalance').textContent = formatIDR(balance);
  document.getElementById('totalCount').textContent   = transactions.length;
}

// ── 7. CATEGORY SELECT ────────────────────────────────────────
function populateCategorySelect() {
  const select = document.getElementById('category');
  const current = select.value;  // preserve selection if re-populating
  select.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === current) opt.selected = true;
    select.appendChild(opt);
  });
}

// ── 8. TRANSACTION RENDERING ──────────────────────────────────
function getSortedTransactions() {
  const copy = [...transactions];
  if (currentSort === 'amount-asc')  return copy.sort((a, b) => a.amount - b.amount);
  if (currentSort === 'amount-desc') return copy.sort((a, b) => b.amount - a.amount);
  if (currentSort === 'category')    return copy.sort((a, b) => a.category.localeCompare(b.category));
  // default: newest first (by insertion index — we unshift so index 0 = newest)
  return copy;
}

function renderTransactions() {
  const list      = document.getElementById('transactionList');
  const clearBtn  = document.getElementById('clearAllBtn');
  const sortBar   = document.getElementById('sortBar');
  const sorted    = getSortedTransactions();

  list.innerHTML = '';

  if (sorted.length === 0) {
    clearBtn.style.display = 'none';
    sortBar.style.display  = 'none';
    list.innerHTML = `
      <li class="empty-state" role="status">
        <div class="empty-icon">🧾</div>
        <p>Belum ada transaksi.<br>Tambahkan transaksi di atas!</p>
      </li>`;
    return;
  }

  clearBtn.style.display = 'inline-flex';
  sortBar.style.display  = 'flex';

  sorted.forEach(t => {
    const colorIdx   = categories.indexOf(t.category) % PALETTE.length;
    const badgeColor = PALETTE[Math.max(colorIdx, 0)];

    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = t.id;

    li.innerHTML = `
      <div class="transaction-info">
        <div class="transaction-name">${escapeHTML(t.name)}</div>
        <div class="transaction-meta">
          <span
            class="category-badge"
            style="background:${badgeColor}22; color:${badgeColor}"
          >${escapeHTML(t.category)}</span>
          <span class="category-badge" style="background:${t.type === 'income' ? 'rgba(56,161,105,.15)' : 'rgba(229,62,62,.12)'}; color:${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
            ${t.type === 'income' ? '▲ Pemasukan' : '▼ Pengeluaran'}
          </span>
        </div>
      </div>
      <span class="transaction-amount" style="color:${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
        ${t.type === 'income' ? '+' : '-'}${formatIDR(t.amount)}
      </span>
      <button
        class="btn-icon"
        data-id="${t.id}"
        aria-label="Hapus ${escapeHTML(t.name)}"
        title="Hapus transaksi"
      >✕</button>`;

    list.appendChild(li);
  });
}

// Prevent XSS when inserting user text into innerHTML
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── 9. FORM VALIDATION ────────────────────────────────────────
function validate(name, amount, category) {
  let valid = true;

  const nameErr     = document.getElementById('itemNameError');
  const amountErr   = document.getElementById('amountError');
  const categoryErr = document.getElementById('categoryError');
  nameErr.textContent = amountErr.textContent = categoryErr.textContent = '';

  if (!name.trim()) {
    nameErr.textContent = 'Nama item wajib diisi.';
    valid = false;
  }

  const parsed = parseFloat(amount);
  if (amount === '' || isNaN(parsed) || parsed <= 0) {
    amountErr.textContent = 'Jumlah harus angka positif.';
    valid = false;
  }

  if (!category) {
    categoryErr.textContent = 'Pilih kategori.';
    valid = false;
  }

  return valid;
}

// ── 10. ADD TRANSACTION ───────────────────────────────────────
function addTransaction(name, amount, category, type) {
  const transaction = {
    id:       crypto.randomUUID(),
    name:     name.trim(),
    amount:   parseFloat(amount),
    category,
    type,     // 'income' | 'expense'
    date:     new Date().toISOString(),
  };
  transactions.unshift(transaction);  // newest first
  saveTransactions();
}

// ── 11. DELETE TRANSACTION ────────────────────────────────────
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
}

// ── 12. CLEAR ALL TRANSACTIONS ────────────────────────────────
function clearAllTransactions() {
  const confirmed = window.confirm(
    `Hapus semua ${transactions.length} transaksi? Tindakan ini tidak dapat dibatalkan.`
  );
  if (!confirmed) return;
  transactions = [];
  saveTransactions();
  refreshUI();
}

// ── 13. ADD CUSTOM CATEGORY ───────────────────────────────────
function addCustomCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (categories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
    alert(`Kategori "${trimmed}" sudah ada.`);
    return false;
  }
  categories.push(trimmed);
  saveCategories();
  populateCategorySelect();
  // Select the newly added category automatically
  document.getElementById('category').value = trimmed;
  return true;
}

// ── 14. CHART ─────────────────────────────────────────────────
function drawChart() {
  const canvas  = document.getElementById('spendingChart');
  const legend  = document.getElementById('chartLegend');
  const ctx     = canvas.getContext('2d');
  const size    = canvas.width;
  const cx      = size / 2;
  const cy      = size / 2;
  const radius  = size / 2 - 10;

  ctx.clearRect(0, 0, size, size);
  legend.innerHTML = '';

  const hasExpenses = transactions.some(t => t.type === 'expense');
  if (transactions.length === 0 || !hasExpenses) {
    // Draw a placeholder circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--surface-alt').trim() || '#f0f2f5';
    ctx.fill();

    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-muted').trim() || '#718096';
    ctx.font = `bold 13px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(transactions.length === 0 ? 'Belum ada data' : 'Tidak ada pengeluaran', cx, cy);
    return;
  }

  // Aggregate by category (expense only)
  const totals = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

  const entries = Object.entries(totals);
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  let startAngle = -Math.PI / 2;  // start from top

  entries.forEach(([cat, value], i) => {
    const slice = (value / total) * Math.PI * 2;
    const color = PALETTE[i % PALETTE.length];

    // Draw slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // White border between slices
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Legend entry
    const pct  = ((value / total) * 100).toFixed(1);
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-dot" style="background:${color}"></span>
      <span>${escapeHTML(cat)} — ${pct}%</span>`;
    legend.appendChild(item);

    startAngle += slice;
  });

  // Draw donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--surface').trim() || '#ffffff';
  ctx.fill();

  // Total label inside donut
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--text').trim() || '#1a202c';
  ctx.font      = `bold 11px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Total', cx, cy - 10);
  ctx.font = `bold 12px sans-serif`;
  ctx.fillText(formatIDR(total), cx, cy + 8);
}

// ── 15. FULL UI REFRESH ───────────────────────────────────────
function refreshUI() {
  updateSummary();
  renderTransactions();
  drawChart();
}

// ── 16. EVENT LISTENERS ───────────────────────────────────────
function initEvents() {
  // --- Form submit ---
  document.getElementById('transactionForm').addEventListener('submit', e => {
    e.preventDefault();
    const name     = document.getElementById('itemName').value;
    const amount   = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const type     = document.getElementById('type').value;

    if (!validate(name, amount, category)) return;

    addTransaction(name, amount, category, type);
    refreshUI();

    // Reset form fields
    document.getElementById('itemName').value = '';
    document.getElementById('amount').value   = '';
    document.getElementById('itemName').focus();
  });

  // --- Delete single transaction (event delegation on list) ---
  document.getElementById('transactionList').addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    deleteTransaction(btn.dataset.id);
    refreshUI();
  });

  // --- Clear all ---
  document.getElementById('clearAllBtn').addEventListener('click', clearAllTransactions);

  // --- Add custom category ---
  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const input = document.getElementById('newCategoryInput');
    if (addCustomCategory(input.value)) {
      input.value = '';
    }
    input.focus();
  });

  // Also allow pressing Enter inside the category input field
  document.getElementById('newCategoryInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = document.getElementById('newCategoryInput');
      if (addCustomCategory(input.value)) {
        input.value = '';
      }
    }
  });

  // --- Sort buttons ---
  document.getElementById('sortBar').addEventListener('click', e => {
    const btn = e.target.closest('.sort-btn');
    if (!btn) return;

    currentSort = btn.dataset.sort;

    // Update aria-pressed on all sort buttons
    document.querySelectorAll('.sort-btn').forEach(b => {
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      b.classList.toggle('active', b === btn);
    });

    renderTransactions();  // only re-render list, not chart
  });

  // --- Theme toggle ---
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
    drawChart();  // redraw with new theme colors
  });
}

// ── 17. BOOTSTRAP ─────────────────────────────────────────────
function init() {
  loadTheme();
  loadFromStorage();
  populateCategorySelect();
  initEvents();
  refreshUI();
}

init();
