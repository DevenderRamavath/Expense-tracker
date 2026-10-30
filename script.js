const form = document.querySelector("#transaction-form");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const list = document.querySelector("#transaction-list");
const balanceElement = document.querySelector("#balance");
const incomeElement = document.querySelector("#income");
const expenseElement = document.querySelector("#expense");
const clearAllButton = document.querySelector("#clear-all");

let transactions = loadTransactions();

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

  if (transactions.length === 0) {
    list.innerHTML = '<li class="empty">No transactions yet</li>';
    return;
  }

  list.innerHTML = transactions.map((transaction) => `
    <li class="transaction ${transaction.type}">
      <span>${escapeHtml(transaction.description)}</span>
      <strong class="amount">${transaction.type === "expense" ? "-" : "+"}${formatCurrency(transaction.amount)}</strong>
      <button class="delete-button" type="button" data-id="${transaction.id}" aria-label="Delete ${escapeHtml(transaction.description)}">✕</button>
    </li>
  `).join("");
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
    type
  });

  saveTransactions();
  render();
  form.reset();
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

render();
