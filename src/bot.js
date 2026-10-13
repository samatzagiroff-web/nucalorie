import { buildRecommendations, CHALLENGES } from "./recs.js";
import { defaultProfile, getUser, upsertUser } from "./store.js";

const API = (token) => `https://api.telegram.org/bot${token}`;

export async function tg(token, method, body) {
  const res = await fetch(`${API(token)}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error("Telegram API error", method, json);
  }
  return json;
}

function webAppButton(text, url) {
  return { text, web_app: { url } };
}

function keyboard(webappUrl, lang) {
  const ru = lang === "ru";
  return {
    inline_keyboard: [
      [webAppButton(ru ? "Открыть NuCalorie" : "Open NuCalorie", webappUrl)],
      [
        { text: ru ? "Профиль" : "Profile", callback_data: "cmd_profile" },
        { text: ru ? "Рекомендации" : "Recommend", callback_data: "cmd_recommend" },
      ],
      [{ text: ru ? "Челленджи" : "Challenges", callback_data: "cmd_challenges" }],
    ],
  };
}

async function ensureUser(from) {
  const existing = await getUser(from.id);
  if (existing) return existing;
  return upsertUser(from.id, defaultProfile(from));
}

function profileText(p, lang) {
  if (lang === "ru") {
    return [
      `Профиль ${p.firstName}`,
      `Цель: ${p.goal} · активность: ${p.activity}`,
      `${p.age} лет · ${p.heightCm} см · ${p.weightKg} кг`,
      `Баллы: ${p.points || 0}`,
    ].join("\n");
  }
  return [
    `Profile ${p.firstName}`,
    `Goal: ${p.goal} · activity: ${p.activity}`,
    `${p.age} y · ${p.heightCm} cm · ${p.weightKg} kg`,
    `Points: ${p.points || 0}`,
  ].join("\n");
}

function recText(p, lang) {
  const rec = buildRecommendations(p);
  const meals = rec.meals.map((m) => `• ${m.name} — ${m.kcal} kcal`).join("\n");
  const wo = rec.workout.map((w) => `• ${w}`).join("\n");
  if (lang === "ru") {
    return `${rec.coach}\n\nРацион (~${rec.targetKcal} ккал)\n${meals}\n\nТренировки\n${wo}`;
  }
  return `${rec.coach}\n\nMeals (~${rec.targetKcal} kcal)\n${meals}\n\nWorkouts\n${wo}`;
}

function challengesText(lang) {
  return CHALLENGES.map((c) => `• ${c.title[lang]} — ${c.desc[lang]} (+${c.points})`).join("\n");
}

export async function handleUpdate(update, { token, webappUrl }) {
  const msg = update.message;
  const cb = update.callback_query;
  const from = msg?.from || cb?.from;
  if (!from) return;

  const user = await ensureUser(from);
  const lang = user.language === "ru" || from.language_code === "ru" ? "ru" : "en";
  const chatId = msg?.chat?.id || cb?.message?.chat?.id;
  const text = (msg?.text || "").trim();
  const cmd = text.split(/\s+/)[0].split("@")[0];

  const reply = async (body) =>
    tg(token, "sendMessage", {
      chat_id: chatId,
      parse_mode: "HTML",
      reply_markup: keyboard(webappUrl, lang),
      ...body,
    });

  const action = cb?.data || cmd;

  if (cb) {
    await tg(token, "answerCallbackQuery", { callback_query_id: cb.id });
  }

  if (action === "/start") {
    const hello =
      lang === "ru"
        ? `Привет, ${from.first_name}! Я NuCalorie — умный коуч по калориям и тренировкам.\n\nЗаполни профиль в Mini App и получи рацион на сегодня за 30 секунд.`
        : `Hey ${from.first_name}! I'm NuCalorie — your calorie + training coach.\n\nOpen the Mini App, complete your profile, and get today's plan in 30 seconds.`;
    await reply({ text: hello });
    return;
  }

  if (action === "/profile" || action === "cmd_profile") {
    await reply({
      text:
        lang === "ru"
          ? `${profileText(user, "ru")}\n\nРедактировать удобнее в Mini App.`
          : `${profileText(user, "en")}\n\nEdit in the Mini App.`,
    });
    return;
  }

  if (action === "/recommend" || action === "cmd_recommend") {
    await reply({ text: recText(user, lang) });
    return;
  }

  if (action === "/challenges" || action === "cmd_challenges") {
    const head = lang === "ru" ? "Челленджи этой недели" : "This week's challenges";
    await reply({ text: `${head}\n${challengesText(lang)}` });
    return;
  }

  if (msg && !cb) {
    await reply({
      text:
        lang === "ru"
          ? "Команды: /start /profile /recommend /challenges — или открой Mini App."
          : "Commands: /start /profile /recommend /challenges — or open the Mini App.",
    });
  }
}

export async function setWebhook(token, publicUrl, secret) {
  return tg(token, "setWebhook", {
    url: `${publicUrl.replace(/\/$/, "")}/webhook`,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function setCommands(token) {
  await tg(token, "setMyCommands", {
    commands: [
      { command: "start", description: "Start / Начать" },
      { command: "profile", description: "Profile / Профиль" },
      { command: "recommend", description: "Recommendations / Рекомендации" },
      { command: "challenges", description: "Challenges / Челленджи" },
    ],
  });
  await tg(token, "setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "NuCalorie",
      web_app: { url: process.env.WEBAPP_URL || process.env.PUBLIC_URL },
    },
  });
}
