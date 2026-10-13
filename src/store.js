import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "db.json");
const useMemory = process.env.VERCEL === "1" || process.env.USE_MEMORY_STORE === "true";

if (!globalThis.__nucalorieDb) {
  globalThis.__nucalorieDb = { users: {} };
}

const defaultDb = () => ({ users: {} });

export function defaultProfile(user) {
  const firstName = user?.first_name || "Friend";
  return {
    telegramId: String(user?.id || "demo"),
    firstName,
    language: user?.language_code === "ru" ? "ru" : "en",
    age: 28,
    sex: "female",
    heightCm: 168,
    weightKg: 62,
    goal: "maintain",
    activity: "moderate",
    trackers: { appleHealth: false, googleFit: false, strava: false },
    log: [],
    challengeProgress: {},
    points: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function loadDb() {
  if (useMemory) return globalThis.__nucalorieDb;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return defaultDb();
  }
}

export async function saveDb(db) {
  if (useMemory) {
    globalThis.__nucalorieDb = db;
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function getUser(id) {
  const db = await loadDb();
  return db.users[String(id)] || null;
}

export async function upsertUser(id, patch) {
  const db = await loadDb();
  const key = String(id);
  db.users[key] = { ...(db.users[key] || {}), ...patch, telegramId: key };
  await saveDb(db);
  return db.users[key];
}
