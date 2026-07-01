const STORAGE_PREFIX = "weekly-expense-tracker";
const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "AUD",
});

const els = {
  total: document.querySelector("h1"),
  weekLabel: document.querySelector("#weekLabel"),
  budgetForm: document.querySelector("#budgetForm"),
  budgetInput: document.querySelector("#budgetInput"),
  budgetFill: document.querySelector("#budgetFill"),
  budgetStatus: document.querySelector("#budgetStatus"),
  remainingAmount: document.querySelector("#remainingAmount"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseName: document.querySelector("#expenseName"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expenseList: document.querySelector("#expenseList"),
  expenseTemplate: document.querySelector("#expenseTemplate"),
  entryCount: document.querySelector("#entryCount"),
  emptyState: document.querySelector("#emptyState"),
  clearWeekButton: document.querySelector("#clearWeekButton"),
};

const state = loadWeek();

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const distanceFromMonday = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + distanceFromMonday);
  return copy;
}

function getWeekKey(date = new Date()) {
  const monday = startOfWeek(date);
  return monday.toISOString().slice(0, 10);
}

function getStorageKey() {
  return `${STORAGE_PREFIX}:${getWeekKey()}`;
}

function getWeekRangeLabel() {
  const start = startOfWeek(new Date());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const format = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${format.format(start)} - ${format.format(end)}`;
}

function loadWeek() {
  const fallback = { budget: 0, expenses: [] };

  const raw = localStorage.getItem(getStorageKey());
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);

    return {
      budget: parsed.budget ?? 0,
      expenses: parsed.expenses ?? [],
    };
  } catch {
    return fallback;
  }
}

function saveWeek() {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch (e) {
    console.error("localStorage save failed:", e);
  }
}

function update() {
  saveWeek();
  render();
}

function money(value) {
  return currency.format(Number(value) || 0);
}

function totalSpent() {
  return state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function render() {
  const total = totalSpent();
  const budget = Number(state.budget) || 0;
  const remaining = budget - total;
  const percent = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;

  els.weekLabel.textContent = getWeekRangeLabel();
  els.total.textContent = money(total);
  els.budgetInput.value = budget > 0 ? budget : "";
  els.budgetFill.style.width = `${percent}%`;
  els.budgetFill.classList.toggle("over", budget > 0 && total > budget);
  els.budgetStatus.textContent = budget > 0 ? `${money(total)} of ${money(budget)}` : "No budget set";
  els.remainingAmount.textContent = budget > 0
    ? remaining >= 0 ? `${money(remaining)} left` : `${money(Math.abs(remaining))} over`
    : `${money(total)} spent`;

  els.entryCount.textContent = `${state.expenses.length} ${state.expenses.length === 1 ? "expense" : "expenses"}`;
  els.expenseList.innerHTML = "";
  els.emptyState.hidden = state.expenses.length > 0;

  [...state.expenses].reverse().forEach((expense) => {
    const item = els.expenseTemplate.content.firstElementChild.cloneNode(true);
    item.querySelector(".expense-title").textContent = expense.name || "Expense";
    item.querySelector(".expense-meta").textContent = new Date(expense.createdAt).toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    item.querySelector(".expense-price").textContent = money(expense.amount);
    item.querySelector(".edit-button").addEventListener("click", () => editExpense(expense.id));
    item.querySelector(".delete-button").addEventListener("click", () => deleteExpense(expense.id));
    els.expenseList.appendChild(item);
  });
}

function addExpense(event) {
  event.preventDefault();
  const amount = parseFloat(els.expenseAmount.value.replace(",", "."));
  if (!amount || amount <= 0) return;

  state.expenses.push({
    id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
    name: els.expenseName.value.trim() || "Expense",
    amount,
    createdAt: new Date().toISOString(),
  });
  saveWeek();
  els.expenseForm.reset();
  els.expenseName.focus();
  render();
}

function editExpense(id) {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense) return;

  const nextAmount = Number(prompt("New amount", expense.amount.toFixed(2)));
  if (!nextAmount || nextAmount <= 0) return;

  const nextName = prompt("Expense name", expense.name);
  expense.amount = nextAmount;
  expense.name = nextName ? nextName.trim() : expense.name;
  update();
}

function deleteExpense(id) {
  const index = state.expenses.findIndex((expense) => expense.id === id);
  if (index === -1) return;
  state.expenses.splice(index, 1);
  update();
}

function setBudget(event) {
  event.preventDefault();
  state.budget = Math.max(0, Number(els.budgetInput.value) || 0);
  els.budgetInput.blur();
  update();
}

function clearWeek() {
  if (!state.expenses.length && !state.budget) return;
  if (!confirm("Clear this week's expenses and budget?")) return;
  state.budget = 0;
  state.expenses = [];
  update();
}

els.expenseForm.addEventListener("submit", addExpense);
els.budgetForm.addEventListener("submit", setBudget);
els.clearWeekButton.addEventListener("click", clearWeek);
render();
