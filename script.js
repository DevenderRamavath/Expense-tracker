const form = document.querySelector("#transaction-form");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const list = document.querySelector("#transaction-list");
const balanceElement = document.querySelector("#balance");
const incomeElement = document.querySelector("#income");
const expenseElement = document.querySelector("#expense");
const clearAllButton = document.querySelector("#clear-all");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const searchInput = document.querySelector("#search");
const typeFilter = document.querySelector("#filter-type");
const exportButton = document.querySelector("#export-csv");

let transactions = loadTransactions().map((transaction) => ({
  ...transaction,
  category: transaction.category || "General",
  date: transaction.date || new Date().toISOString().slice(0, 10)
}));

const today = new Date().toISOString().slice(0, 10);
dateInput.value = today;
dateInput.max = today;

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem("expenseTrackerTransactions")) || [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem("expenseTrackerTransactions", JSON.stringify(transactions));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);
}

function render() {
  const income = transactions
    .filter(({ type }) => type === "income")
    .reduce((total, { amount }) => total + amount, 0);
  const expense = transactions
    .filter(({ type }) => type === "expense")
    .reduce((total, { amount }) => total + amount, 0);

  balanceElement.textContent = formatCurrency(income - expense);
  incomeElement.textContent = formatCurrency(income);
  expenseElement.textContent = formatCurrency(expense);

  const query = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesQuery = !query || transaction.description.toLowerCase().includes(query)
      || transaction.category.toLowerCase().includes(query);
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesQuery && matchesType;
  });

  if (filteredTransactions.length === 0) {
    list.innerHTML = '<li class="empty">No matching transactions</li>';
    return;
  }

  list.innerHTML = filteredTransactions.map((transaction) => `
    <li class="transaction ${transaction.type}">
      <span>
        <strong>${escapeHtml(transaction.description)}</strong>
        <small>${escapeHtml(transaction.category)} · ${formatDate(transaction.date)}</small>
      </span>
      <strong class="amount">${transaction.type === "expense" ? "-" : "+"}${formatCurrency(transaction.amount)}</strong>
      <button class="delete-button" type="button" data-id="${transaction.id}" aria-label="Delete ${escapeHtml(transaction.description)}">✕</button>
    </li>
  `).join("");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${date}T00:00:00`));
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = form.elements.type.value;

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  transactions.unshift({
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    description,
    amount,
    type,
    category: categoryInput.value,
    date: dateInput.value
  });

  saveTransactions();
  render();
  form.reset();
  dateInput.value = today;
  descriptionInput.focus();
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  transactions = transactions.filter(({ id }) => id !== button.dataset.id);
  saveTransactions();
  render();
});

clearAllButton.addEventListener("click", () => {
  if (transactions.length === 0) return;
  if (!window.confirm("Clear all transactions?")) return;

  transactions = [];
  saveTransactions();
  render();
});

searchInput.addEventListener("input", render);
typeFilter.addEventListener("change", render);

exportButton.addEventListener("click", () => {
  if (transactions.length === 0) return;

  const rows = [
    ["Date", "Description", "Category", "Type", "Amount"],
    ...transactions.map(({ date, description, category, type, amount }) =>
      [date, description, category, type, amount])
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "expense-transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
});

render();
