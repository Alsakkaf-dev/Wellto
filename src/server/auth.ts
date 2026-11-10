import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SESSION = "mahfaza_session";
const LOCALE = "mahfaza_locale";
const DAY = 60 * 60 * 24;

export function hashPin(pin: string, salt = randomBytes(16).toString("hex")): { hash: string; salt: string } {
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return { hash, salt };
}

export function checkPin(pin: string, hash: string, salt: string): boolean {
  const next = scryptSync(pin, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

async function secret(): Promise<string> {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.VERCEL) throw new Error("Set AUTH_SECRET before deploying.");
  const file = path.join(process.cwd(), ".data", "dev-secret");
  try {
    return (await readFile(file, "utf8")).trim();
  } catch {
    const value = randomBytes(32).toString("hex");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, value, "utf8");
    return value;
  }
}

export async function writeSession(): Promise<void> {
  const exp = Date.now() + 30 * DAY * 1000;
  const key = await secret();
  const sig = createHmac("sha256", key).update(String(exp)).digest("hex");
  const jar = await cookies();
  jar.set(SESSION, `${exp}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * DAY,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION);
}

export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(SESSION)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const key = await secret();
  const expected = createHmac("sha256", key).update(exp).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function readLocaleCookie(): Promise<"en" | "ar" | null> {
  const jar = await cookies();
  const value = jar.get(LOCALE)?.value;
  if (value === "ar" || value === "en") return value;
  return null;
}

export async function writeLocaleCookie(locale: "en" | "ar"): Promise<void> {
  const jar = await cookies();
  jar.set(LOCALE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * DAY,
  });
}

export function envPin(): string | null {
  const pin = process.env.APP_PIN?.trim();
  if (!pin || !/^\d{4,6}$/.test(pin)) return null;
  return pin;
}

export function pinAccepted(pin: string, hash: string | null, salt: string | null): boolean {
  if (!/^\d{4,6}$/.test(pin)) return false;
  const fromEnv = envPin();
  if (fromEnv && pin === fromEnv) return true;
  if (hash && salt) return checkPin(pin, hash, salt);
  return false;
}
