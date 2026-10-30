import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'expenseTrackerTransactions';
const categories = ['General', 'Food', 'Transport', 'Shopping', 'Bills', 'Salary'];

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2
  }).format(amount);
}

function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function App() {
  const [transactions, setTransactions] = useState(loadTransactions);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState('income');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesSearch = !query || item.description.toLowerCase().includes(query)
        || item.category.toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, search, typeFilter]);

  function addTransaction(event) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;

    setTransactions((current) => [{
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      description: description.trim(),
      amount: numericAmount,
      category,
      date,
      type
    }, ...current]);
    setDescription('');
    setAmount('');
    setCategory('General');
    setType('income');
    setDate(new Date().toISOString().slice(0, 10));
  }

  function deleteTransaction(id) {
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  function clearAll() {
    if (transactions.length && window.confirm('Clear all transactions?')) setTransactions([]);
  }

  function exportCsv() {
    if (!transactions.length) return;
    const rows = [['Date', 'Description', 'Category', 'Type', 'Amount'], ...transactions.map((item) =>
      [item.date, item.description, item.category, item.type, item.amount])];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'expense-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header><p className="eyebrow">Personal finance</p><h1>Expense Tracker</h1></header>
      <section className="summary" aria-label="Expense summary">
        <article><span>Total balance</span><strong>{formatCurrency(totals.balance)}</strong></article>
        <article><span>Income</span><strong>{formatCurrency(totals.income)}</strong></article>
        <article><span>Expenses</span><strong>{formatCurrency(totals.expense)}</strong></article>
      </section>
      <section className="content-grid">
        <form className="card" onSubmit={addTransaction}>
          <h2>Add transaction</h2>
          <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Salary, groceries..." required /></label>
          <label>Amount<input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required /></label>
          <label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Date<input type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <fieldset><legend>Type</legend><label className="radio-option"><input type="radio" name="type" value="income" checked={type === 'income'} onChange={(e) => setType(e.target.value)} /> Income</label><label className="radio-option"><input type="radio" name="type" value="expense" checked={type === 'expense'} onChange={(e) => setType(e.target.value)} /> Expense</label></fieldset>
          <button type="submit">Add transaction</button>
        </form>
        <section className="card history">
          <div className="history-heading"><h2>Transaction history</h2><div className="history-actions"><button className="text-button" type="button" onClick={exportCsv}>Export CSV</button><button className="text-button" type="button" onClick={clearAll}>Clear all</button></div></div>
          <div className="filters"><label>Search<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description or category" /></label><label>Type<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">All</option><option value="income">Income</option><option value="expense">Expense</option></select></label></div>
          <ul>{visibleTransactions.length ? visibleTransactions.map((item) => <li key={item.id} className={`transaction ${item.type}`}><span><strong>{item.description}</strong><small>{item.category} · {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${item.date}T00:00:00`))}</small></span><strong className="amount">{item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}</strong><button className="delete-button" type="button" onClick={() => deleteTransaction(item.id)} aria-label={`Delete ${item.description}`}>✕</button></li>) : <li className="empty">No matching transactions</li>}</ul>
        </section>
      </section>
    </main>
  );
}
