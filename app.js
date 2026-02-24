const STORAGE_KEY = "habbity-habits";
const tips = [
  "Начинай с маленького шага: цель на 2 минуты легче выполнить каждый день.",
  "Привязывай привычку к существующему ритуалу — так проще помнить.",
  "Отмечай успех сразу после выполнения, чтобы закрепить чувство награды.",
  "Сделай привычку видимой: положи напоминание на видное место.",
  "Следи за серией, но не ругай себя за сбой — просто возвращайся завтра.",
];

const habitForm = document.querySelector("#habit-form");
const habitNameInput = document.querySelector("#habit-name");
const habitReminderInput = document.querySelector("#habit-reminder");
const habitColorInput = document.querySelector("#habit-color");
const habitsList = document.querySelector("#habits-list");
const totalHabitsEl = document.querySelector("#total-habits");
const completedTodayEl = document.querySelector("#completed-today");
const weeklyRateEl = document.querySelector("#weekly-rate");
const tipText = document.querySelector("#tip-text");
const todayLabel = document.querySelector("#today-label");
const todayDate = document.querySelector("#today-date");
const filterButtons = document.querySelectorAll(".filter button");
const resetTodayButton = document.querySelector("#reset-today");

const today = new Date();
const todayKey = formatDate(today);
let filter = "all";

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getLastDays(count) {
  const days = [];
  for (let i = 0; i < count; i += 1) {
    const day = new Date();
    day.setDate(today.getDate() - i);
    days.push(formatDate(day));
  }
  return days;
}

function loadHabits() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Не удалось прочитать данные привычек", error);
    return [];
  }
}

function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function computeStreak(habit, referenceDate = today) {
  if (!habit.completions || habit.completions.length === 0) {
    return { streak: 0, best: habit.bestStreak || 0 };
  }
  const completions = new Set(habit.completions);
  let current = 0;
  for (let i = 0; i < 365; i += 1) {
    const day = new Date(referenceDate);
    day.setDate(referenceDate.getDate() - i);
    const key = formatDate(day);
    if (completions.has(key)) {
      current += 1;
    } else {
      break;
    }
  }
  const best = Math.max(habit.bestStreak || 0, current);
  return { streak: current, best };
}

function weeklyProgress(habit) {
  const lastDays = getLastDays(7);
  const completions = new Set(habit.completions || []);
  const done = lastDays.filter((day) => completions.has(day)).length;
  return { done, total: lastDays.length };
}

function updateStats(habits) {
  totalHabitsEl.textContent = habits.length;
  const completedToday = habits.filter((habit) => habit.completions?.includes(todayKey)).length;
  completedTodayEl.textContent = completedToday;
  const weekDays = getLastDays(7);
  const totalSlots = habits.length * weekDays.length;
  const totalDone = habits.reduce((sum, habit) => {
    const completions = habit.completions || [];
    return sum + completions.filter((day) => weekDays.includes(day)).length;
  }, 0);
  const rate = totalSlots === 0 ? 0 : Math.round((totalDone / totalSlots) * 100);
  weeklyRateEl.textContent = `${rate}%`;
}

function renderHabits(habits) {
  habitsList.innerHTML = "";
  const template = document.querySelector("#habit-card-template");

  const visibleHabits = habits.filter((habit) => {
    const doneToday = habit.completions?.includes(todayKey);
    if (filter === "completed") return doneToday;
    if (filter === "active") return !doneToday;
    return true;
  });

  if (visibleHabits.length === 0) {
    const empty = document.createElement("div");
    empty.className = "habit-card";
    empty.innerHTML =
      "<h3>Пока нет привычек</h3><p class=\"habit-card__reminder\">Добавь новую привычку, чтобы начать серию.</p>";
    habitsList.appendChild(empty);
    return;
  }

  visibleHabits.forEach((habit) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.style.setProperty("--accent", habit.color || "#7c5cff");

    card.querySelector(".habit-card__title").textContent = habit.name;
    card.querySelector(".habit-card__reminder").textContent = habit.reminder || "Без напоминания";

    const toggle = card.querySelector(".habit-card__toggle");
    const doneToday = habit.completions?.includes(todayKey);
    toggle.textContent = doneToday ? "Выполнено" : "Отметить";
    toggle.classList.add(doneToday ? "is-complete" : "is-pending");
    toggle.addEventListener("click", () => toggleHabit(habit.id));

    const deleteButton = card.querySelector(".habit-card__delete");
    deleteButton.addEventListener("click", () => deleteHabit(habit.id));

    const { streak, best } = computeStreak(habit);
    card.querySelector(".habit-card__streak").textContent = `${streak} дней`;
    card.querySelector(".habit-card__best").textContent = `${best} дней`;

    const weekly = weeklyProgress(habit);
    card.querySelector(".habit-card__weekly").textContent = `${weekly.done} / ${weekly.total}`;
    const progress = Math.round((weekly.done / weekly.total) * 100);
    card.querySelector(".progress-fill").style.width = `${progress}%`;
    card.querySelector(".progress-label").textContent = `Прогресс недели: ${progress}%`;

    habitsList.appendChild(card);
  });
}

function toggleHabit(id) {
  const habits = loadHabits();
  const updated = habits.map((habit) => {
    if (habit.id !== id) return habit;
    const completions = new Set(habit.completions || []);
    if (completions.has(todayKey)) {
      completions.delete(todayKey);
    } else {
      completions.add(todayKey);
    }
    const updatedHabit = { ...habit, completions: Array.from(completions).sort() };
    const { streak, best } = computeStreak(updatedHabit);
    return { ...updatedHabit, streak, bestStreak: best };
  });
  saveHabits(updated);
  updateStats(updated);
  renderHabits(updated);
}

function deleteHabit(id) {
  const habits = loadHabits();
  const updated = habits.filter((habit) => habit.id !== id);
  saveHabits(updated);
  updateStats(updated);
  renderHabits(updated);
}

function resetTodayCompletions() {
  const habits = loadHabits();
  const updated = habits.map((habit) => ({
    ...habit,
    completions: (habit.completions || []).filter((day) => day !== todayKey),
    streak: 0,
  }));
  saveHabits(updated);
  updateStats(updated);
  renderHabits(updated);
}

function addHabit(event) {
  event.preventDefault();
  const name = habitNameInput.value.trim();
  const reminder = habitReminderInput.value.trim();
  if (!name) return;

  const habits = loadHabits();
  const newHabit = {
    id: crypto.randomUUID(),
    name,
    reminder,
    color: habitColorInput.value,
    createdAt: todayKey,
    completions: [],
    streak: 0,
    bestStreak: 0,
  };

  habits.unshift(newHabit);
  saveHabits(habits);
  habitForm.reset();
  habitColorInput.value = "#7C5CFF";
  updateStats(habits);
  renderHabits(habits);
}

function setTip() {
  const index = Math.floor(Math.random() * tips.length);
  tipText.textContent = tips[index];
}

function setDateHeader() {
  const formatter = new Intl.DateTimeFormat("ru-RU", { weekday: "long" });
  const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  });
  todayLabel.textContent = formatter.format(today);
  todayDate.textContent = dateFormatter.format(today);
}

function bindFilters() {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      filter = button.dataset.filter;
      renderHabits(loadHabits());
    });
  });
}

habitForm.addEventListener("submit", addHabit);
resetTodayButton.addEventListener("click", resetTodayCompletions);

function init() {
  setDateHeader();
  setTip();
  bindFilters();
  const habits = loadHabits();
  updateStats(habits);
  renderHabits(habits);
}

init();
