"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseMoneyCsv, toHistorical } from "@/lib/money/csv";
import {
  addExpense,
  completeSetup,
  confirmProposal,
  dismissProposal,
  dropWaitingBuy,
  importHistory,
  markNoticeRead,
  moveBetween,
  recordWaitingBuy,
  setBalances,
  stageIncome,
  topUp,
  undoLast,
  updateSettings,
} from "@/lib/money/engine";
import { klDateISO } from "@/lib/money/time";
import type { Box, ExpenseCategory } from "@/lib/money/types";
import { parseRm } from "@/lib/format";
import { clearSession, envPin, hasSession, hashPin, pinAccepted, writeLocaleCookie, writeSession } from "@/server/auth";
import { loadWorkspace, mutate, readWorkspace } from "@/server/store";

function refresh() {
  revalidatePath("/", "layout");
}

async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}

export async function loginAction(pin: string): Promise<{ ok: boolean; error?: string }> {
  let error: string | undefined;
  let ok = false;
  await mutate((state) => {
    if (!state.setupComplete) {
      error = "gone";
      return state;
    }
    if (state.pinLockedUntil && state.pinLockedUntil > new Date().toISOString()) {
      error = "locked";
      return state;
    }
    if (!pinAccepted(pin, state.pinHash, state.pinSalt)) {
      const next = structuredClone(state);
      next.failedPinAttempts += 1;
      if (next.failedPinAttempts >= 5) {
        next.pinLockedUntil = new Date(Date.now() + 60_000).toISOString();
        next.failedPinAttempts = 0;
        error = "locked";
      } else error = "wrong";
      return next;
    }
    const next = structuredClone(state);
    next.failedPinAttempts = 0;
    next.pinLockedUntil = null;
    ok = true;
    return next;
  });
  if (!ok) return { ok: false, error };
  await writeSession();
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}

export async function setupAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const existing = await readWorkspace();
  if (existing.setupComplete) redirect("/");
  const provided = envPin();
  const pin = provided ?? String(formData.get("pin") ?? "");
  const again = provided ?? String(formData.get("again") ?? "");
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "short" };
  if (pin !== again) return { ok: false, error: "mismatch" };
  const treasury = parseRm(String(formData.get("treasury") ?? ""));
  const monthly = parseRm(String(formData.get("monthly") ?? ""));
  const emergency = parseRm(String(formData.get("emergency") ?? ""));
  const daily = parseRm(String(formData.get("daily") ?? ""));
  if (treasury == null || monthly == null || emergency == null || daily == null) return { ok: false, error: "amount" };
  const billRaw = String(formData.get("electricity") ?? "").trim();
  const electricityBill = billRaw ? parseRm(billRaw) : null;
  if (billRaw && electricityBill == null) return { ok: false, error: "amount" };
  const { hash, salt } = hashPin(pin);
  const today = klDateISO();
  await mutate((state) => {
    if (state.setupComplete) return state;
    const next = completeSetup(state, {
      balances: { treasury, monthly, emergency, daily },
      settings: { electricityBill },
      today,
      at: new Date().toISOString(),
    });
    next.pinHash = hash;
    next.pinSalt = salt;
    return next;
  });
  await writeSession();
  redirect("/");
}

export async function setLocaleAction(locale: "en" | "ar"): Promise<void> {
  await writeLocaleCookie(locale);
  await mutate((state) => updateSettings(state, { locale }, new Date().toISOString()));
  refresh();
}

export async function topUpForm(): Promise<void> {
  await requireSession();
  await topUpAction();
}

export async function topUpAction(amount?: number): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  let error: string | undefined;
  const today = klDateISO();
  await mutate((state) => {
    const current = state.setupComplete ? state : state;
    const plan = current.plans.find((item) => item.date === today);
    const cents = amount && amount > 0 ? amount : plan?.amount ?? 0;
    const out = topUp(current, cents, today, new Date().toISOString());
    if (out.error) {
      error = out.error;
      return current;
    }
    return out.state;
  });
  refresh();
  return { ok: !error, error };
}

export async function expenseAction(input: {
  amount: number;
  category: ExpenseCategory;
  merchant: string;
  force?: boolean;
}): Promise<{ ok: boolean; error?: string; waiting?: boolean }> {
  await requireSession();
  let error: string | undefined;
  let waiting = false;
  const today = klDateISO();
  await mutate((state) => {
    const out = addExpense(state, {
      amount: input.amount,
      category: input.category,
      merchant: input.merchant,
      purchaseDate: today,
      at: new Date().toISOString(),
      force: input.force,
    });
    if (out.error) {
      error = out.error;
      return state;
    }
    waiting = Boolean(out.waiting);
    return out.state;
  });
  refresh();
  return { ok: !error, error, waiting };
}

export async function stageIncomeAction(amount: number): Promise<void> {
  await requireSession();
  const today = klDateISO();
  await mutate((state) => stageIncome(state, amount, today, new Date().toISOString()));
  refresh();
}

export async function confirmAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  let error: string | undefined;
  await mutate((state) => {
    const out = confirmProposal(state, id, new Date().toISOString());
    if (out.error) {
      error = out.error;
      return state;
    }
    return out.state;
  });
  refresh();
  return { ok: !error, error };
}

export async function dismissAction(id: string): Promise<void> {
  await requireSession();
  await mutate((state) => dismissProposal(state, id));
  refresh();
}

export async function undoAction(): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  let error: string | undefined;
  await mutate((state) => {
    const out = undoLast(state, new Date().toISOString());
    if (out.error) {
      error = out.error;
      return state;
    }
    return out.state;
  });
  refresh();
  return { ok: !error, error };
}

export async function moveAction(input: { from: Box; to: Box; amount: number }): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  let error: string | undefined;
  await mutate((state) => {
    const out = moveBetween(state, { ...input, today: klDateISO(), at: new Date().toISOString() });
    if (out.error) {
      error = out.error;
      return state;
    }
    return out.state;
  });
  refresh();
  return { ok: !error, error };
}

export async function settingsAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const rent = parseRm(String(formData.get("rent") ?? ""));
  const internet = parseRm(String(formData.get("internet") ?? ""));
  const expected = parseRm(String(formData.get("expected") ?? ""));
  const billRaw = String(formData.get("electricity") ?? "").trim();
  const electricityBill = billRaw ? parseRm(billRaw) : null;
  if (rent == null || internet == null || expected == null || (billRaw && electricityBill == null)) {
    return { ok: false, error: "amount" };
  }
  await mutate((state) =>
    updateSettings(state, { rent, internet, expectedIncome: expected, electricityBill }, new Date().toISOString()),
  );
  refresh();
  return { ok: true };
}

export async function balancesAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const treasury = parseRm(String(formData.get("treasury") ?? ""));
  const monthly = parseRm(String(formData.get("monthly") ?? ""));
  const emergency = parseRm(String(formData.get("emergency") ?? ""));
  const dailyRaw = String(formData.get("daily") ?? "").trim().replace(/,/g, "");
  if (treasury == null || monthly == null || emergency == null || !/^-?\d+(\.\d{0,2})?$/.test(dailyRaw)) {
    return { ok: false, error: "amount" };
  }
  const negative = dailyRaw.startsWith("-");
  const dailyAbs = parseRm(dailyRaw.replace("-", ""));
  if (dailyAbs == null) return { ok: false, error: "amount" };
  const daily = negative ? -dailyAbs : dailyAbs;
  await mutate((state) => setBalances(state, { treasury, monthly, emergency, daily }, new Date().toISOString()));
  refresh();
  return { ok: true };
}

export async function importCsvAction(formData: FormData): Promise<{ ok: boolean; error?: string; count?: number }> {
  await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "amount" };
  const text = await file.text();
  const rows = toHistorical(parseMoneyCsv(text).filter((row) => row.include));
  if (rows.length === 0) return { ok: false, error: "amount" };
  await mutate((state) => importHistory(state, rows, new Date().toISOString()));
  refresh();
  return { ok: true, count: rows.length };
}

export async function restoreAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "amount" };
  const parsed = JSON.parse(await file.text()) as { version?: number; pinHash?: string };
  if (parsed.version !== 1) return { ok: false, error: "gone" };
  await mutate((state) => {
    const pinHash = state.pinHash;
    const pinSalt = state.pinSalt;
    const next = parsed as typeof state;
    next.pinHash = pinHash;
    next.pinSalt = pinSalt;
    next.setupComplete = true;
    return next;
  });
  refresh();
  return { ok: true };
}

export async function readNoticeAction(id: string): Promise<void> {
  await requireSession();
  await mutate((state) => markNoticeRead(state, id));
  refresh();
}

export async function recordBuyAction(id: string, force = false): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  let error: string | undefined;
  await mutate((state) => {
    const out = recordWaitingBuy(state, id, klDateISO(), new Date().toISOString(), force);
    if (out.error) {
      error = out.error;
      return state;
    }
    return out.state;
  });
  refresh();
  return { ok: !error, error };
}

export async function dropBuyAction(id: string): Promise<void> {
  await requireSession();
  await mutate((state) => dropWaitingBuy(state, id));
  refresh();
}

export async function prepareWorkspace() {
  return loadWorkspace();
}

export async function confirmForm(id: string): Promise<void> {
  await confirmAction(id);
}

export async function undoForm(): Promise<void> {
  await undoAction();
}

export async function recordBuyForm(id: string): Promise<void> {
  await recordBuyAction(id, true);
}
