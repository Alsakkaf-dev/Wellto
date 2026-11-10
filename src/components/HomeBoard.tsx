"use client";

import { useOptimistic } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SubmitButton } from "@/components/SubmitButton";
import { anomalyText, copyOf, type Locale } from "@/lib/copy";
import { formatRm } from "@/lib/format";
import type { Balances, DayPlan } from "@/lib/money/types";
import { topUpForm } from "@/server/actions";

export function HomeBoard({
  locale,
  todayLabel,
  balances,
  plan,
}: {
  locale: Locale;
  todayLabel: string;
  balances: Balances;
  plan: DayPlan | null;
}) {
  const copy = copyOf(locale);
  const [shown, applyTopup] = useOptimistic(balances, (current: Balances, amount: number) => ({
    ...current,
    monthly: current.monthly - amount,
    daily: current.daily + amount,
  }));
  const total = shown.treasury + shown.monthly + shown.emergency + shown.daily;
  const rhb = total - shown.daily;
  const boxes: { key: keyof Balances; label: string; hint: string; wash: string; bar: string }[] = [
    { key: "treasury", label: copy.treasury, hint: copy.treasuryHint, wash: "bg-[#f8f1e2]", bar: "bg-brass" },
    { key: "monthly", label: copy.monthly, hint: copy.monthlyHint, wash: "bg-[#e8f4ee]", bar: "bg-moss" },
    { key: "emergency", label: copy.emergency, hint: copy.emergencyHint, wash: "bg-[#e8f0f6]", bar: "bg-tide" },
    { key: "daily", label: copy.daily, hint: copy.dailyHint, wash: "bg-[#f8ece6]", bar: "bg-clay" },
  ];
  const amount = plan?.amount ?? 0;
  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="num text-4xl italic lg:hidden">{copy.appName}</p>
          <p className="mt-1 text-sm text-muted">{todayLabel}</p>
        </div>
        <div className="lg:hidden">
          <LanguageToggle locale={locale} />
        </div>
      </header>

      <section className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
        <article className="rounded-[28px] border border-line bg-card p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{copy.total}</p>
          <p className="num mt-2 text-5xl sm:text-6xl">RM {formatRm(total)}</p>
          <p className="mt-3 text-sm text-muted">
            {copy.inBank} {formatRm(rhb)} · {copy.inWallet} {formatRm(shown.daily)}
          </p>
          <p className="mt-4 max-w-sm text-sm text-ink/80">{copy.rhbNote}</p>
        </article>
        <article className="rounded-[28px] border border-[#cfe3d6] bg-[#f4faf6] p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.18em] text-moss">{copy.todayTopup}</p>
          <p className="num mt-2 text-5xl text-moss">RM {formatRm(amount)}</p>
          <p className="mt-3 text-sm text-ink">
            {plan?.learning ? copy.learning : plan?.alert ? copy.tight : copy.comfortable}
          </p>
          {plan?.anomaly ? <p className="mt-2 text-sm text-clay">{anomalyText(plan.anomaly, copy)}</p> : null}
          <form
            action={async () => {
              applyTopup(amount);
              await topUpForm();
            }}
            className="mt-5"
          >
            <SubmitButton className="h-14 w-full rounded-2xl bg-moss text-lg text-white">
              {copy.toppedUp} {formatRm(amount)}
            </SubmitButton>
          </form>
        </article>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {boxes.map((box) => (
          <article key={box.key} className={`overflow-hidden rounded-[24px] border border-line ${box.wash}`}>
            <div className={`h-1.5 ${box.bar}`} />
            <div className="p-4">
              <p className="text-sm text-ink">{box.label}</p>
              <p className="num mt-2 text-3xl">{formatRm(shown[box.key])}</p>
              <p className="mt-1 text-xs text-muted">{box.hint}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
