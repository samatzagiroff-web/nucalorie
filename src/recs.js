const MEALS = {
  lose: {
    en: [
      { name: "Greek yogurt + berries", kcal: 280, meal: "breakfast" },
      { name: "Grilled chicken salad", kcal: 420, meal: "lunch" },
      { name: "Salmon, quinoa, broccoli", kcal: 510, meal: "dinner" },
      { name: "Apple + almond butter", kcal: 190, meal: "snack" },
    ],
    ru: [
      { name: "Греческий йогурт с ягодами", kcal: 280, meal: "breakfast" },
      { name: "Салат с курицей гриль", kcal: 420, meal: "lunch" },
      { name: "Лосось, киноа, брокколи", kcal: 510, meal: "dinner" },
      { name: "Яблоко + миндальная паста", kcal: 190, meal: "snack" },
    ],
  },
  maintain: {
    en: [
      { name: "Oats, banana, peanut butter", kcal: 420, meal: "breakfast" },
      { name: "Turkey wrap + veggies", kcal: 540, meal: "lunch" },
      { name: "Pasta, turkey, tomato", kcal: 620, meal: "dinner" },
      { name: "Cottage cheese + honey", kcal: 220, meal: "snack" },
    ],
    ru: [
      { name: "Овсянка, банан, арахисовая паста", kcal: 420, meal: "breakfast" },
      { name: "Ролл с индейкой и овощами", kcal: 540, meal: "lunch" },
      { name: "Паста, индейка, томаты", kcal: 620, meal: "dinner" },
      { name: "Творог с мёдом", kcal: 220, meal: "snack" },
    ],
  },
  gain: {
    en: [
      { name: "Eggs, toast, avocado", kcal: 560, meal: "breakfast" },
      { name: "Rice bowl + beef", kcal: 720, meal: "lunch" },
      { name: "Chicken, potatoes, olive oil", kcal: 780, meal: "dinner" },
      { name: "Protein smoothie", kcal: 340, meal: "snack" },
    ],
    ru: [
      { name: "Яйца, тост, авокадо", kcal: 560, meal: "breakfast" },
      { name: "Боул с рисом и говядиной", kcal: 720, meal: "lunch" },
      { name: "Курица, картофель, оливковое масло", kcal: 780, meal: "dinner" },
      { name: "Протеиновый смузи", kcal: 340, meal: "snack" },
    ],
  },
};

const WORKOUTS = {
  sedentary: {
    en: ["20 min brisk walk", "10 min mobility", "Core: 3× plank 40s"],
    ru: ["20 мин быстрой ходьбы", "10 мин мобилити", "Кор: 3× планка 40с"],
  },
  light: {
    en: ["30 min zone-2 walk/jog", "Push: 3×10 push-ups", "Stretch 8 min"],
    ru: ["30 мин ходьбы/трусцы в зоне 2", "Жим: 3×10 отжиманий", "Растяжка 8 мин"],
  },
  moderate: {
    en: ["Full body 35 min", "Squats 4×8", "Rows 4×10", "Walk 6k steps"],
    ru: ["Фулбоди 35 мин", "Приседания 4×8", "Тяга 4×10", "Ходьба 6к шагов"],
  },
  active: {
    en: ["Intervals 8×1 min", "Strength lower 40 min", "Cooldown yoga 10 min"],
    ru: ["Интервалы 8×1 мин", "Сила: низ 40 мин", "Заминка-йога 10 мин"],
  },
};

export const CHALLENGES = [
  {
    id: "protein7",
    days: 7,
    points: 120,
    title: { en: "Protein week", ru: "Неделя белка" },
    desc: { en: "Hit protein target 5 of 7 days.", ru: "Закрыть белок 5 из 7 дней." },
  },
  {
    id: "steps8k",
    days: 7,
    points: 90,
    title: { en: "8k steps", ru: "8 тысяч шагов" },
    desc: { en: "Walk 8,000 steps daily.", ru: "8 000 шагов каждый день." },
  },
  {
    id: "log3",
    days: 7,
    points: 80,
    title: { en: "Log streak", ru: "Серия логов" },
    desc: { en: "Log meals 3 days in a row.", ru: "Записать еду 3 дня подряд." },
  },
];

const ACTIVITY_FACTOR = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export function tdee(profile) {
  const w = Number(profile.weightKg) || 62;
  const h = Number(profile.heightCm) || 168;
  const a = Number(profile.age) || 28;
  const s = profile.sex === "male" ? 5 : -161;
  const bmr = 10 * w + 6.25 * h - 5 * a + s;
  const factor = ACTIVITY_FACTOR[profile.activity] || 1.55;
  let kcal = bmr * factor;
  if (profile.goal === "lose") kcal -= 400;
  if (profile.goal === "gain") kcal += 350;
  return Math.round(kcal);
}

export function macros(kcal) {
  const protein = Math.round((kcal * 0.3) / 4);
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.round((kcal * 0.4) / 4);
  return { protein, fat, carbs };
}

export function buildRecommendations(profile) {
  const lang = profile.language === "ru" ? "ru" : "en";
  const goal = MEALS[profile.goal] ? profile.goal : "maintain";
  const kcal = tdee(profile);
  const meals = MEALS[goal][lang];
  const workout = WORKOUTS[profile.activity] || WORKOUTS.moderate;
  return {
    targetKcal: kcal,
    macros: macros(kcal),
    meals,
    workout: workout[lang],
    coach:
      lang === "ru"
        ? `Сегодня цель ${kcal} ккал. Держи белок высоким и закрой шаги — этого достаточно для прогресса.`
        : `Today's target is ${kcal} kcal. Keep protein high and hit your steps — that's enough to progress.`,
  };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loggedToday(profile) {
  const key = todayKey();
  return (profile.log || []).filter((e) => e.date === key);
}
