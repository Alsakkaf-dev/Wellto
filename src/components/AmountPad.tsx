"use client";

import { useMemo, useState } from "react";
import { categoryLabel, copyOf, errorText, type Locale } from "@/lib/copy";
import { formatRm } from "@/lib/format";
import type { ExpenseCategory } from "@/lib/money/types";
import { expenseAction, stageIncomeAction, topUpAction } from "@/server/actions";

const CATEGORIES: ExpenseCategory[] = ["daily", "subscription", "medical", "planned", "other", "rent", "internet", "electricity"];

export function AmountPad({
  locale,
  merchants,
  suggestions,
  expectedIncome,
}: {
  locale: Locale;
  merchants: string[];
  suggestions: Record<string, ExpenseCategory>;
  expectedIncome: number;
}) {
  const copy = copyOf(locale);
  const [cents, setCents] = useState(0);
  const [category, setCategory] = useState<ExpenseCategory>("daily");
  const [merchant, setMerchant] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = useMemo(() => formatRm(cents), [cents]);

  function press(key: string) {
    setMessage(null);
    if (key === "del") {
      setCents((current) => Math.floor(current / 10));
      return;
    }
    setCents((current) => Math.min(99_999_999, current * 10 + Number(key)));
  }

  function chooseMerchant(name: string) {
    setMerchant(name);
    const suggested = suggestions[name.toLowerCase()];
    if (suggested) setCategory(suggested);
  }

  async function spend(force = false) {
    setBusy(true);
    const result = await expenseAction({ amount: cents, category, merchant, force });
    setBusy(false);
    if (!result.ok) {
      setMessage(errorText(result.error, copy));
      return;
    }
    setCents(0);
    setMerchant("");
    setMessage(result.waiting ? copy.plannedWait : copy.saved);
  }

  async function topup() {
    setBusy(true);
    const result = await topUpAction(cents);
    setBusy(false);
    if (!result.ok) setMessage(errorText(result.error, copy));
    else {
      setCents(0);
      setMessage(copy.saved);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="rounded-[28px] border border-line bg-card p-5 shadow-card">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">RM</p>
        <p className="num mt-1 text-6xl text-ink">{shown}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", ""].map((key) => (
            <button key={key || "x"} type="button" className="pad-key" disabled={!key} onClick={() => press(key)}>
              {key === "del" ? "⌫" : key}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full px-3 py-1.5 text-sm ${category === item ? "bg-moss text-white" : "bg-white text-ink border border-line"}`}
            >
              {categoryLabel(item, copy)}
            </button>
          ))}
        </div>
        {merchants.length > 0 ? (
          <div>
            <p className="text-xs text-muted">{copy.recent}</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {merchants.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => chooseMerchant(name)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${merchant === name ? "border-moss bg-[#e7f3ec]" : "border-line bg-white"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <label className="text-sm text-muted">
          {copy.merchant}
          <input
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
            placeholder={copy.optional}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-3 text-ink"
          />
        </label>
        <button type="button" disabled={busy || cents <= 0} onClick={() => spend(false)} className="h-14 rounded-2xl bg-moss text-lg text-white disabled:opacity-40">
          {copy.addExpense}
        </button>
        <button type="button" disabled={busy || cents <= 0} onClick={topup} className="h-12 rounded-2xl border border-line bg-white text-ink disabled:opacity-40">
          {copy.topUpThis}
        </button>
        {category === "planned" && cents > 3000 ? (
          <button type="button" disabled={busy} onClick={() => spend(true)} className="text-sm text-muted underline">
            {copy.recordNow}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => stageIncomeAction(cents > 0 ? cents : expectedIncome)}
          className="h-12 rounded-2xl bg-[#f6efdf] text-brass"
        >
          {copy.allowanceArrived} · RM {formatRm(cents > 0 ? cents : expectedIncome)}
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </div>
    </div>
  );
}
