const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const i18n = {
  en: {
    greet: "NuCalorie coach",
    kcal: "kcal eaten",
    target: "Target",
    left: "Left",
    points: "Points",
    home: "Home",
    log: "Log",
    plan: "Plan",
    profile: "Profile",
    meals: "Meals",
    workout: "Workout",
    challenges: "Challenges",
    join: "Join",
    joined: "Joined",
    add: "Add meal",
    food: "Food",
    save: "Save profile",
    stars: "Unlock deep report · 50 Stars",
    trackers: "Fitness trackers (top-3)",
    age: "Age",
    sex: "Sex",
    height: "Height cm",
    weight: "Weight kg",
    goal: "Goal",
    activity: "Activity",
  },
  ru: {
    greet: "Коуч NuCalorie",
    kcal: "ккал съедено",
    target: "Цель",
    left: "Осталось",
    points: "Баллы",
    home: "Главная",
    log: "Лог",
    plan: "План",
    profile: "Профиль",
    meals: "Рацион",
    workout: "Тренировка",
    challenges: "Челленджи",
    join: "Вступить",
    joined: "Вы в игре",
    add: "Добавить",
    food: "Еда",
    save: "Сохранить профиль",
    stars: "Глубокий отчёт · 50 Stars",
    trackers: "Фитнес-трекеры (топ-3)",
    age: "Возраст",
    sex: "Пол",
    height: "Рост см",
    weight: "Вес кг",
    goal: "Цель",
    activity: "Активность",
  },
};

let state = { lang: "ru", me: null };

const headers = () => ({
  "Content-Type": "application/json",
  "X-Telegram-Init-Data": tg?.initData || "",
});

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  return res.json();
}

function setLang(lang) {
  state.lang = lang;
  const t = i18n[lang];
  document.documentElement.lang = lang;
  document.getElementById("greet").textContent = t.greet;
  document.getElementById("kcalLabel").textContent = t.kcal;
  document.getElementById("targetLbl").textContent = t.target;
  document.getElementById("leftLbl").textContent = t.left;
  document.getElementById("pointsLbl").textContent = t.points;
  document.getElementById("mealsTitle").textContent = t.meals;
  document.getElementById("woTitle").textContent = t.workout;
  document.getElementById("chTitle").textContent = t.challenges;
  document.getElementById("foodLbl").textContent = t.food;
  document.getElementById("logSubmit").textContent = t.add;
  document.getElementById("saveBtn").textContent = t.save;
  document.getElementById("starsBtn").textContent = t.stars;
  document.getElementById("trackTitle").textContent = t.trackers;
  document.getElementById("ageLbl").textContent = t.age;
  document.getElementById("sexLbl").textContent = t.sex;
  document.getElementById("hLbl").textContent = t.height;
  document.getElementById("wLbl").textContent = t.weight;
  document.getElementById("goalLbl").textContent = t.goal;
  document.getElementById("actLbl").textContent = t.activity;
  document.getElementById("langBtn").textContent = lang === "ru" ? "EN" : "RU";
  [...document.querySelectorAll(".tab")].forEach((btn) => {
    btn.textContent = t[btn.dataset.tab];
  });
}

function render(me) {
  state.me = me;
  const lang = me.profile.language || state.lang;
  setLang(lang);
  const rec = me.rec;
  const eaten = me.today.eaten;
  const target = rec.targetKcal;
  const pct = Math.min(1, eaten / Math.max(target, 1));
  document.getElementById("eaten").textContent = eaten;
  document.getElementById("target").textContent = target;
  document.getElementById("left").textContent = Math.max(0, me.today.remaining);
  document.getElementById("points").textContent = me.profile.points || 0;
  document.getElementById("ring").style.strokeDashoffset = String(314 - 314 * pct);
  document.getElementById("coachLine").textContent = rec.coach;
  document.getElementById("coach").textContent = rec.coach;
  document.getElementById("macros").innerHTML = `
    <div><small>P</small><b>${rec.macros.protein}g</b></div>
    <div><small>F</small><b>${rec.macros.fat}g</b></div>
    <div><small>C</small><b>${rec.macros.carbs}g</b></div>`;
  document.getElementById("meals").innerHTML = rec.meals
    .map(
      (m) =>
        `<div class="item"><div>${m.name}<br><small>${m.meal}</small></div><button data-add="${m.name}" data-kcal="${m.kcal}">+${m.kcal}</button></div>`
    )
    .join("");
  document.getElementById("workout").innerHTML = rec.workout
    .map((w) => `<div class="item"><div>${w}</div></div>`)
    .join("");
  const joined = me.profile.challengeProgress || {};
  document.getElementById("challenges").innerHTML = me.challenges
    .map((c) => {
      const on = Boolean(joined[c.id]);
      return `<div class="item"><div>${c.title[lang]}<br><small>${c.desc[lang]} · +${c.points}</small></div>
        <button data-ch="${c.id}" ${on ? "disabled" : ""}>${on ? i18n[lang].joined : i18n[lang].join}</button></div>`;
    })
    .join("");
  document.getElementById("todayLog").innerHTML = (me.today.entries || [])
    .map((e) => `<div class="item"><div>${e.name}</div><small>${e.kcal} kcal</small></div>`)
    .join("");
  const form = document.getElementById("profileForm");
  form.age.value = me.profile.age;
  form.sex.value = me.profile.sex;
  form.heightCm.value = me.profile.heightCm;
  form.weightKg.value = me.profile.weightKg;
  form.goal.value = me.profile.goal;
  form.activity.value = me.profile.activity;
  document.querySelectorAll("[data-tr]").forEach((btn) => {
    btn.classList.toggle("on", Boolean(me.profile.trackers?.[btn.dataset.tr]));
  });

  if (tg?.MainButton) {
    tg.MainButton.setText(lang === "ru" ? "Сохранить профиль" : "Save profile");
    tg.MainButton.show();
    tg.MainButton.onClick(() => form.requestSubmit());
  }
}

async function load() {
  const me = await api("/api/me");
  if (!me.ok) {
    document.getElementById("coachLine").textContent = "Auth failed. Open via Telegram or keep DEV_BYPASS_AUTH.";
    return;
  }
  render(me);
}

document.querySelector(".tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t === tab));
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("on", p.id === tab.dataset.tab));
});

document.getElementById("langBtn").addEventListener("click", async () => {
  const next = state.lang === "ru" ? "en" : "ru";
  const me = await api("/api/profile", {
    method: "POST",
    body: JSON.stringify({ ...state.me.profile, language: next }),
  });
  load();
  return me;
});

document.getElementById("meals").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  await api("/api/log", { method: "POST", body: JSON.stringify({ name: btn.dataset.add, kcal: btn.dataset.kcal }) });
  load();
});

document.getElementById("challenges").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-ch]");
  if (!btn) return;
  await api(`/api/challenges/${btn.dataset.ch}/join`, { method: "POST" });
  load();
});

document.getElementById("logForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  await api("/api/log", { method: "POST", body: JSON.stringify(data) });
  e.target.reset();
  load();
});

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.language = state.lang;
  data.firstName = state.me?.profile?.firstName;
  await api("/api/profile", { method: "POST", body: JSON.stringify(data) });
  tg?.HapticFeedback?.notificationOccurred("success");
  load();
});

document.querySelector(".trackers").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-tr]");
  if (!btn) return;
  const on = !btn.classList.contains("on");
  await api("/api/trackers", { method: "POST", body: JSON.stringify({ key: btn.dataset.tr, on }) });
  load();
});

document.getElementById("starsBtn").addEventListener("click", async () => {
  const out = await api("/api/stars/invoice", { method: "POST" });
  if (out.result?.result && tg?.openInvoice) {
    tg.openInvoice(out.result.result);
  } else {
    alert(state.lang === "ru" ? "В браузере Stars недоступны — нужен бот с BOT_TOKEN." : "Stars need a live bot token inside Telegram.");
  }
});

load();
