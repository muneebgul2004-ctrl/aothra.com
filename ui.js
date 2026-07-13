const UI = (() => {
  const CATEGORIES = {
    income: ['Salary', 'Freelance', 'Business', 'Gift', 'Other'],
    expense: ['Food', 'Shopping', 'Transport', 'Bills', 'Entertainment', 'Health', 'Education', 'Travel', 'Other'],
  };

  const CATEGORY_ICONS = {
    Salary: 'fa-briefcase', Freelance: 'fa-laptop-code', Business: 'fa-store', Gift: 'fa-gift', Other: 'fa-ellipsis',
    Food: 'fa-utensils', Shopping: 'fa-bag-shopping', Transport: 'fa-car', Bills: 'fa-file-invoice-dollar',
    Entertainment: 'fa-film', Health: 'fa-heart-pulse', Education: 'fa-graduation-cap', Travel: 'fa-plane',
  };

  function formatCurrency(amount) {
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(isoDate) {
    const d = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function populateFormCategorySelect(type, selected) {
    const select = document.getElementById('txCategory');
    select.innerHTML = CATEGORIES[type]
      .map((cat) => `<option value="${cat}" ${cat === selected ? 'selected' : ''}>${cat}</option>`)
      .join('');
  }

  function populateCategoryFilterSelect() {
    const select = document.getElementById('categoryFilter');
    const all = [...CATEGORIES.income, ...CATEGORIES.expense];
    const unique = [...new Set(all)];
    const options = unique.map((cat) => `<option value="${cat}">${cat}</option>`).join('');
    select.innerHTML = `<option value="all">All Categories</option>${options}`;
  }

  function renderSummary({ balance, income, expense, incomeCount, expenseCount, total }) {
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense);
    document.getElementById('totalTransactions').textContent = total;
    document.getElementById('incomeCount').textContent = `${incomeCount} ${incomeCount === 1 ? 'entry' : 'entries'}`;
    document.getElementById('expenseCount').textContent = `${expenseCount} ${expenseCount === 1 ? 'entry' : 'entries'}`;
    document.getElementById('balanceSub').textContent = balance >= 0 ? "You're in the black" : "You're in the red";
  }

  function renderTable(transactions, { hasAnyTransactions }) {
    const tbody = document.getElementById('txTableBody');
    const table = document.getElementById('txTable');
    const emptyState = document.getElementById('emptyState');

    if (!hasAnyTransactions) {
      table.style.display = 'none';
      emptyState.style.display = 'flex';
      tbody.innerHTML = '';
      return;
    }

    table.style.display = '';
    emptyState.style.display = 'none';

    if (transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 40px 12px; color: var(--text-muted);">
            No transactions match your filters.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = transactions.map((t) => {
      const icon = CATEGORY_ICONS[t.category] || 'fa-tag';
      return `
        <tr data-id="${t.id}">
          <td class="td-date">${formatDate(t.date)}</td>
          <td class="td-title">${escapeHtml(t.title)}</td>
          <td class="td-category"><span class="cat-tag"><i class="fa-solid ${icon}"></i> ${t.category}</span></td>
          <td class="td-type"><span class="type-badge ${t.type}">${t.type === 'income' ? 'Income' : 'Expense'}</span></td>
          <td class="td-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
          <td class="td-actions">
            <button class="icon-btn edit-btn" data-id="${t.id}" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn danger delete-btn" data-id="${t.id}" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 240);
    }, 2800);
  }

  function openTxModal({ mode, type, transaction }) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('txForm');

    form.reset();
    clearFormErrors();

    document.getElementById('txType').value = type;
    populateFormCategorySelect(type, transaction ? transaction.category : undefined);

    if (mode === 'edit' && transaction) {
      title.textContent = `Edit ${type === 'income' ? 'Income' : 'Expense'}`;
      document.getElementById('txId').value = transaction.id;
      document.getElementById('txTitle').value = transaction.title;
      document.getElementById('txAmount').value = transaction.amount;
      document.getElementById('txDate').value = transaction.date;
    } else {
      title.textContent = type === 'income' ? 'Add Income' : 'Add Expense';
      document.getElementById('txId').value = '';
      document.getElementById('txDate').value = new Date().toISOString().slice(0, 10);
    }

    document.getElementById('modalSaveBtn').className = `btn ${type === 'income' ? 'btn-income' : 'btn-expense'}`;

    overlay.classList.add('is-open');
    setTimeout(() => document.getElementById('txTitle').focus(), 60);
  }

  function closeTxModal() {
    document.getElementById('modalOverlay').classList.remove('is-open');
  }

  function openConfirmModal() {
    document.getElementById('confirmOverlay').classList.add('is-open');
  }

  function closeConfirmModal() {
    document.getElementById('confirmOverlay').classList.remove('is-open');
  }

  function setFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}Error`);
    input.classList.toggle('invalid', Boolean(message));
    errorEl.textContent = message || '';
  }

  function clearFormErrors() {
    ['txTitle', 'txAmount', 'txDate', 'txCategory'].forEach((id) => setFieldError(id, ''));
  }

  function setActiveChip(range) {
    document.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.range === range);
    });
  }

  function setActiveNav(view) {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.view === view);
    });
  }

  function updateSortIndicators(sortKey, sortDir) {
    document.querySelectorAll('.tx-table thead th[data-sort]').forEach((th) => {
      const icon = th.querySelector('i');
      if (th.dataset.sort === sortKey) {
        icon.className = `fa-solid fa-sort-${sortDir === 'asc' ? 'up' : 'down'}`;
      } else {
        icon.className = 'fa-solid fa-sort';
      }
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    label.textContent = theme === 'dark' ? 'Dark mode' : 'Light mode';
  }

  function openSidebar() {
    document.getElementById('sidebar').classList.add('is-open');
    document.getElementById('sidebarScrim').classList.add('is-open');
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('is-open');
    document.getElementById('sidebarScrim').classList.remove('is-open');
  }

  function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.add('is-hidden');
  }

  return {
    CATEGORIES,
    formatCurrency,
    formatDate,
    populateFormCategorySelect,
    populateCategoryFilterSelect,
    renderSummary,
    renderTable,
    showToast,
    openTxModal,
    closeTxModal,
    openConfirmModal,
    closeConfirmModal,
    setFieldError,
    clearFormErrors,
    setActiveChip,
    setActiveNav,
    updateSortIndicators,
    applyTheme,
    openSidebar,
    closeSidebar,
    hideLoadingOverlay,
  };
})();
