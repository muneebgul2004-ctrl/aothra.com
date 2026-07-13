const Storage = (() => {
  const KEYS = {
    TRANSACTIONS: 'ledger_transactions',
    THEME: 'ledger_theme',
  };

  function getTransactions() {
    try {
      const raw = localStorage.getItem(KEYS.TRANSACTIONS);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('Ledger: failed to read transactions', err);
      return [];
    }
  }

  function saveTransactions(transactions) {
    try {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
      return true;
    } catch (err) {
      console.error('Ledger: failed to save transactions', err);
      return false;
    }
  }

  function addTransaction(transaction) {
    const transactions = getTransactions();
    transactions.push(transaction);
    saveTransactions(transactions);
    return transaction;
  }

  function updateTransaction(id, updates) {
    const transactions = getTransactions();
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    transactions[idx] = { ...transactions[idx], ...updates };
    saveTransactions(transactions);
    return transactions[idx];
  }

  function deleteTransaction(id) {
    const transactions = getTransactions();
    const filtered = transactions.filter((t) => t.id !== id);
    saveTransactions(filtered);
    return filtered;
  }

  function getTheme() {
    return localStorage.getItem(KEYS.THEME) || 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
  }

  function generateId() {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  return {
    getTransactions,
    saveTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTheme,
    setTheme,
    generateId,
  };
})();
