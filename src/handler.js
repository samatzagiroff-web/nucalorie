import { demoUser, validateInitData } from "./auth.js";
import { handleUpdate } from "./bot.js";
import {
  buildRecommendations,
  CHALLENGES,
  loggedToday,
  todayKey,
} from "./recs.js";
import { defaultProfile, getUser, upsertUser } from "./store.js";

function env() {
  return {
    botToken: process.env.BOT_TOKEN || "",
    webhookSecret: process.env.WEBHOOK_SECRET || "dev-secret",
    webappUrl: process.env.WEBAPP_URL || process.env.PUBLIC_URL || "",
    devBypass: process.env.DEV_BYPASS_AUTH !== "false",
  };
}

function json(status, obj) {
  return Response.json(obj, { status });
}

function pathnameOf(request) {
  const url = new URL(request.url);
  return url.searchParams.get("route") || url.pathname;
}

function authUser(request) {
  const { botToken, devBypass } = env();
  const initData = request.headers.get("x-telegram-init-data") || "";
  if (botToken && initData) {
    const result = validateInitData(initData, botToken);
    if (!result.ok || !result.user?.id) {
      return { error: result.reason || "invalid" };
    }
    return { tg: result.user };
  }
  if (devBypass) return { tg: demoUser(), demo: true };
  return { error: "unauthorized" };
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

function todaySummary(profile, rec) {
  const today = loggedToday(profile);
  const eaten = today.reduce((s, e) => s + Number(e.kcal || 0), 0);
  return { date: todayKey(), eaten, remaining: rec.targetKcal - eaten, entries: today };
}

export async function handleWebRequest(request) {
  const { botToken, webhookSecret, webappUrl, devBypass } = env();
  const method = request.method || "GET";
  const p = pathnameOf(request);

  try {
    if (method === "GET" && (p === "/api/health" || p === "/api")) {
      return json(200, { ok: true, app: "nucalorie", demo: devBypass && !botToken });
    }

    if (method === "GET" && p === "/api/me") {
      const auth = authUser(request);
      if (auth.error) return json(401, { ok: false, error: auth.error });
      let profile = await getUser(auth.tg.id);
      if (!profile) profile = await upsertUser(auth.tg.id, defaultProfile(auth.tg));
      const rec = buildRecommendations(profile);
      return json(200, {
        ok: true,
        demo: Boolean(auth.demo),
        profile,
        rec,
        challenges: CHALLENGES,
        today: todaySummary(profile, rec),
      });
    }

    if (method === "POST" && p === "/api/profile") {
      const auth = authUser(request);
      if (auth.error) return json(401, { ok: false, error: auth.error });
      const body = await readJson(request);
      const patch = {
        firstName: body.firstName,
        language: body.language === "ru" ? "ru" : "en",
        age: Number(body.age),
        sex: body.sex === "male" ? "male" : "female",
        heightCm: Number(body.heightCm),
        weightKg: Number(body.weightKg),
        goal: ["lose", "maintain", "gain"].includes(body.goal) ? body.goal : "maintain",
        activity: ["sedentary", "light", "moderate", "active"].includes(body.activity)
          ? body.activity
          : "moderate",
      };
      const profile = await upsertUser(auth.tg.id, patch);
      return json(200, { ok: true, profile, rec: buildRecommendations(profile) });
    }

    if (method === "POST" && p === "/api/log") {
      const auth = authUser(request);
      if (auth.error) return json(401, { ok: false, error: auth.error });
      const body = await readJson(request);
      let profile = (await getUser(auth.tg.id)) || (await upsertUser(auth.tg.id, defaultProfile(auth.tg)));
      const entry = {
        id: `${Date.now()}`,
        date: todayKey(),
        name: String(body?.name || "Meal").slice(0, 80),
        kcal: Math.max(0, Math.round(Number(body?.kcal) || 0)),
      };
      profile = await upsertUser(auth.tg.id, {
        log: [...(profile.log || []), entry].slice(-200),
        points: (profile.points || 0) + 5,
      });
      const rec = buildRecommendations(profile);
      return json(200, { ok: true, profile, rec, today: todaySummary(profile, rec) });
    }

    const join = p.match(/^\/api\/challenges\/([^/]+)\/join$/);
    if (method === "POST" && join) {
      const auth = authUser(request);
      if (auth.error) return json(401, { ok: false, error: auth.error });
      const challenge = CHALLENGES.find((c) => c.id === join[1]);
      if (!challenge) return json(404, { ok: false, error: "not_found" });
      let profile = (await getUser(auth.tg.id)) || (await upsertUser(auth.tg.id, defaultProfile(auth.tg)));
      const challengeProgress = { ...(profile.challengeProgress || {}) };
      if (!challengeProgress[join[1]]) {
        challengeProgress[join[1]] = { joinedAt: new Date().toISOString(), progress: 1 };
        profile = await upsertUser(auth.tg.id, {
          challengeProgress,
          points: (profile.points || 0) + 15,
        });
      }
      return json(200, { ok: true, profile });
    }

    if (method === "POST" && p === "/api/trackers") {
      const auth = authUser(request);
      if (auth.error) return json(401, { ok: false, error: auth.error });
      const body = await readJson(request);
      const allowed = ["appleHealth", "googleFit", "strava"];
      const key = allowed.includes(body?.key) ? body.key : null;
      if (!key) return json(400, { ok: false, error: "bad_tracker" });
      let profile = (await getUser(auth.tg.id)) || (await upsertUser(auth.tg.id, defaultProfile(auth.tg)));
      profile = await upsertUser(auth.tg.id, {
        trackers: { ...(profile.trackers || {}), [key]: Boolean(body?.on) },
      });
      return json(200, { ok: true, profile });
    }

    if (method === "POST" && p === "/api/stars/invoice") {
      const auth = authUser(request);
      if (auth.error) return json(401, { ok: false, error: auth.error });
      if (!botToken) {
        return json(200, {
          ok: true,
          demo: true,
          message: "Set BOT_TOKEN to create a live Stars invoice (XTR).",
        });
      }
      const result = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "NuCalorie Deep Report",
          description: "Personalized weekly nutrition + training report",
          payload: `deep-${auth.tg.id}-${Date.now()}`,
          currency: "XTR",
          prices: [{ label: "Deep report", amount: 50 }],
        }),
      }).then((r) => r.json());
      return json(200, { ok: Boolean(result.ok), result });
    }

    if (method === "POST" && (p === "/webhook" || p === "/api/webhook")) {
      const secret = request.headers.get("x-telegram-bot-api-secret-token");
      if (webhookSecret && secret !== webhookSecret) {
        return json(401, { ok: false });
      }
      const body = await readJson(request);
      if (!botToken) return json(200, { ok: true, skipped: "no_token" });
      await handleUpdate(body, { token: botToken, webappUrl: webappUrl });
      return json(200, { ok: true });
    }

    return json(404, { ok: false, error: "not_found" });
  } catch (err) {
    console.error(err);
    return json(500, { ok: false, error: "server" });
  }
}
