(() => {
  let transactions = [];
  let filters = {
    search: '',
    range: 'all',
    type: 'all',
    category: 'all',
  };
  let sort = { key: 'date', dir: 'desc' };
  let pendingDeleteId = null;

  function isInRange(dateStr, range) {
    if (range === 'all') return true;
    const txDate = new Date(`${dateStr}T00:00:00`);
    const now = new Date();

    if (range === 'today') {
      return txDate.toDateString() === now.toDateString();
    }
    if (range === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return txDate >= startOfWeek;
    }
    if (range === 'month') {
      return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
    }
    if (range === 'year') {
      return txDate.getFullYear() === now.getFullYear();
    }
    return true;
  }

  function getFilteredTransactions() {
    let result = transactions.filter((t) => {
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      if (!isInRange(t.date, filters.range)) return false;
      if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });

    result.sort((a, b) => {
      let av = a[sort.key];
      let bv = b[sort.key];
      if (sort.key === 'amount') { av = Number(av); bv = Number(bv); }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }

  function computeSummary() {
    let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') { income += t.amount; incomeCount += 1; }
      else { expense += t.amount; expenseCount += 1; }
    });
    return {
      balance: income - expense,
      income,
      expense,
      incomeCount,
      expenseCount,
      total: transactions.length,
    };
  }

  function computeCategoryTotals() {
    const totals = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return totals;
  }

  function computeMonthlyTrend() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        total: 0,
      });
    }
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      const d = new Date(`${t.date}T00:00:00`);
      const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
      if (bucket) bucket.total += t.amount;
    });
    return months;
  }

  function refreshAll() {
    const filtered = getFilteredTransactions();
    const summary = computeSummary();
    UI.renderSummary(summary);
    UI.renderTable(filtered, { hasAnyTransactions: transactions.length > 0 });
    Charts.renderPieChart(summary.income, summary.expense);
    Charts.renderCategoryChart(computeCategoryTotals());
    Charts.renderTrendChart(computeMonthlyTrend());
    UI.updateSortIndicators(sort.key, sort.dir);
  }

  function validateForm() {
    UI.clearFormErrors();
    let valid = true;

    const title = document.getElementById('txTitle').value.trim();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const date = document.getElementById('txDate').value;
    const category = document.getElementById('txCategory').value;

    if (!title) { UI.setFieldError('txTitle', 'Give this entry a title.'); valid = false; }
    else if (title.length > 60) { UI.setFieldError('txTitle', 'Keep titles under 60 characters.'); valid = false; }

    if (Number.isNaN(amount) || amount <= 0) { UI.setFieldError('txAmount', 'Enter an amount greater than 0.'); valid = false; }

    if (!date) { UI.setFieldError('txDate', 'Pick a date.'); valid = false; }
    else if (new Date(date) > new Date(new Date().toDateString())) {
      UI.setFieldError('txDate', "That date hasn't happened yet.");
      valid = false;
    }

    if (!category) { UI.setFieldError('txCategory', 'Choose a category.'); valid = false; }

    return valid ? { title, amount, date, category } : null;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const data = validateForm();
    if (!data) return;

    const id = document.getElementById('txId').value;
    const type = document.getElementById('txType').value;

    if (id) {
      Storage.updateTransaction(id, { ...data, type });
      UI.showToast('Entry updated.', 'success');
    } else {
      const newTx = { id: Storage.generateId(), type, ...data };
      Storage.addTransaction(newTx);
      UI.showToast(type === 'income' ? 'Income added.' : 'Expense added.', 'success');
    }

    transactions = Storage.getTransactions();
    UI.closeTxModal();
    refreshAll();
  }

  function handleTableClick(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
      const tx = transactions.find((t) => t.id === editBtn.dataset.id);
      if (tx) UI.openTxModal({ mode: 'edit', type: tx.type, transaction: tx });
    }

    if (deleteBtn) {
      pendingDeleteId = deleteBtn.dataset.id;
      UI.openConfirmModal();
    }
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    Storage.deleteTransaction(pendingDeleteId);
    transactions = Storage.getTransactions();
    pendingDeleteId = null;
    UI.closeConfirmModal();
    UI.showToast('Entry deleted.', 'info');
    refreshAll();
  }

  function handleSortClick(e) {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort;
    if (sort.key === key) {
      sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      sort = { key, dir: 'asc' };
    }
    refreshAll();
  }

  function csvField(value) {
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  function exportCsv() {
    if (transactions.length === 0) {
      UI.showToast('Nothing to export yet.', 'error');
      return;
    }
    const header = ['Date', 'Title', 'Category', 'Type', 'Amount'];
    const rows = getFilteredTransactions().map((t) => [t.date, t.title, t.category, t.type, t.amount.toFixed(2)]);
    const csv = [header, ...rows].map((row) => row.map(csvField).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    UI.showToast('CSV exported.', 'success');
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    Storage.setTheme(next);
    UI.applyTheme(next);
    Charts.destroyAll();
    refreshAll();
  }

  function wireEvents() {
    document.getElementById('addIncomeBtn').addEventListener('click', () => UI.openTxModal({ mode: 'add', type: 'income' }));
    document.getElementById('addExpenseBtn').addEventListener('click', () => UI.openTxModal({ mode: 'add', type: 'expense' }));
    document.getElementById('emptyAddBtn').addEventListener('click', () => UI.openTxModal({ mode: 'add', type: 'income' }));

    document.getElementById('modalClose').addEventListener('click', () => UI.closeTxModal());
    document.getElementById('modalCancelBtn').addEventListener('click', () => UI.closeTxModal());
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') UI.closeTxModal();
    });

    document.getElementById('confirmClose').addEventListener('click', () => UI.closeConfirmModal());
    document.getElementById('confirmCancelBtn').addEventListener('click', () => UI.closeConfirmModal());
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);
    document.getElementById('confirmOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'confirmOverlay') UI.closeConfirmModal();
    });

    document.getElementById('txForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('txType').addEventListener('change', (e) => UI.populateFormCategorySelect(e.target.value));

    document.getElementById('txTableBody').addEventListener('click', handleTableClick);
    document.querySelector('.tx-table thead').addEventListener('click', handleSortClick);

    document.getElementById('searchInput').addEventListener('input', (e) => {
      filters.search = e.target.value;
      refreshAll();
    });

    document.getElementById('dateChips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      filters.range = chip.dataset.range;
      UI.setActiveChip(filters.range);
      refreshAll();
    });

    document.getElementById('typeFilter').addEventListener('change', (e) => {
      filters.type = e.target.value;
      refreshAll();
    });

    document.getElementById('categoryFilter').addEventListener('change', (e) => {
      filters.category = e.target.value;
      refreshAll();
    });

    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
      filters = { search: '', range: 'all', type: 'all', category: 'all' };
      document.getElementById('searchInput').value = '';
      document.getElementById('typeFilter').value = 'all';
      document.getElementById('categoryFilter').value = 'all';
      UI.setActiveChip('all');
      refreshAll();
    });

    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    document.getElementById('menuBtn').addEventListener('click', () => UI.openSidebar());
    document.getElementById('sidebarClose').addEventListener('click', () => UI.closeSidebar());
    document.getElementById('sidebarScrim').addEventListener('click', () => UI.closeSidebar());

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        UI.setActiveNav(item.dataset.view);
        UI.closeSidebar();
        const target = item.dataset.view === 'transactions'
          ? document.querySelector('.transactions-section')
          : item.dataset.view === 'reports'
            ? document.querySelector('.charts-grid')
            : document.querySelector('.summary-grid');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement.tagName;
      const isTyping = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

      if (e.key === 'Escape') {
        UI.closeTxModal();
        UI.closeConfirmModal();
        return;
      }
      if (isTyping) return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        UI.openTxModal({ mode: 'add', type: 'income' });
      }
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
    });
  }

  function init() {
    const theme = Storage.getTheme();
    UI.applyTheme(theme);

    transactions = Storage.getTransactions();
    UI.populateCategoryFilterSelect();
    UI.populateFormCategorySelect('income');

    wireEvents();
    refreshAll();

    setTimeout(() => UI.hideLoadingOverlay(), 420);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
