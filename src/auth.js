import crypto from "node:crypto";

function timingSafeEqualHex(a, b) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function validateInitData(initData, botToken) {
  if (!initData || !botToken) return { ok: false, reason: "missing" };
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no_hash" };
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const check = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!timingSafeEqualHex(hash, check)) return { ok: false, reason: "bad_hash" };

  const authDate = Number(params.get("auth_date") || 0);
  const age = Date.now() / 1000 - authDate;
  if (authDate && age > 86400) return { ok: false, reason: "expired" };

  let user = null;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    user = null;
  }
  return { ok: true, user, authDate };
}

export function demoUser() {
  return { id: 1001, first_name: "Jasmine", language_code: "ru" };
}
