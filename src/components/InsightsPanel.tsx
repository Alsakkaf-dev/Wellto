"use client";

import { useState } from "react";
import { anomalyText, copyOf, learnedText, type Locale } from "@/lib/copy";
import { formatPercent, formatRm } from "@/lib/format";
import type { DayPlan, Decision } from "@/lib/money/types";

export function InsightsPanel({
  locale,
  plan,
  health,
  decisions,
}: {
  locale: Locale;
  plan: DayPlan | null;
  health: number;
  decisions: Decision[];
}) {
  const copy = copyOf(locale);
  const [open, setOpen] = useState(false);
  return (
    <div>
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-[24px] border border-line bg-card p-5">
          <p className="text-sm text-muted">{copy.monthEnd}</p>
          <p className="num mt-2 text-4xl">RM {formatRm(plan?.forecast ?? 0)}</p>
        </article>
        <article className="rounded-[24px] border border-line bg-card p-5">
          <p className="text-sm text-muted">{copy.runway}</p>
          <p className="num mt-2 text-4xl">
            {plan?.runwayDays ?? 0} <span className="text-lg text-muted">{copy.runwayUnit}</span>
          </p>
        </article>
        <article className="rounded-[24px] border border-line bg-[#f4faf6] p-5">
          <p className="text-sm text-moss">{copy.health}</p>
          <p className="num mt-2 text-4xl text-moss">
            {health}
            <span className="ms-2 text-lg text-muted">{copy.of100}</span>
          </p>
        </article>
      </section>
      <article className="mt-3 rounded-[24px] border border-line bg-card p-5">
        <p className="text-sm text-muted">{copy.learnedTitle}</p>
        <p className="mt-2 text-lg">{plan ? learnedText(plan.learned, copy) : copy.learning}</p>
        {plan?.anomaly ? <p className="mt-2 text-sm text-clay">{anomalyText(plan.anomaly, copy)}</p> : null}
      </article>
      <button type="button" onClick={() => setOpen((value) => !value)} className="mt-4 text-sm text-moss">
        {open ? copy.hideNumbers : copy.seeNumbers}
      </button>
      {open && plan ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 rounded-[24px] border border-dashed border-line bg-white p-4 text-sm">
          <div>
            <dt className="text-muted">{copy.target}</dt>
            <dd className="num text-2xl">{formatRm(plan.target)}</dd>
          </div>
          <div>
            <dt className="text-muted">{copy.safe}</dt>
            <dd className="num text-2xl">{formatRm(plan.safe)}</dd>
          </div>
          <div>
            <dt className="text-muted">{copy.emergencyTarget}</dt>
            <dd className="num text-2xl">{formatRm(plan.emergencyTarget)}</dd>
          </div>
          <div>
            <dt className="text-muted">{copy.purchaseFloor}</dt>
            <dd className="num text-2xl">{formatRm(plan.purchaseFloor)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">{copy.split}</dt>
            <dd className="num text-2xl">
              {formatPercent(plan.treasuryRate)} {copy.treasury} · {formatPercent(plan.emergencyRate)} {copy.emergency}
            </dd>
          </div>
        </dl>
      ) : null}
      {decisions.length > 0 ? (
        <ul className="mt-6 space-y-2 text-sm text-muted">
          {decisions.slice(0, 6).map((decision) => (
            <li key={decision.id}>
              {decision.date}:{" "}
              {[
                decision.targetMoved ? copy.decisionTarget : null,
                decision.emergencyMoved ? copy.decisionEmergency : null,
                decision.rateMoved ? copy.decisionSplit : null,
              ]
                .filter(Boolean)
                .join(" ")}{" "}
              {learnedText(decision.learned, copy)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
