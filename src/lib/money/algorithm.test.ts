import { describe, expect, it } from "vitest";
import {
  carryCents,
  dailyTargetCents,
  detectAnomaly,
  electricityShareCents,
  emergencyTarget,
  healthScore,
  planIncome,
  planMonthClose,
  reserveCents,
  runwayDays,
  safeAmountCents,
  smoothedAllowanceCents,
  splitRemainder,
  subscriptionReserveCents,
  todayAmountCents,
  trimmedMean,
  typicalSpend,
} from "@/lib/money/algorithm";
import { addDaysISO, daysRemainingInMonth, klParts } from "@/lib/money/time";

/** Constructed 28-day series. Same shape as the published 11 Nov 2026 morning, not a private ledger. */
function publishedSeries(): number[] {
  const older = [1080, 0, 12000, ...Array(11).fill(1080)];
  const recent = [2844, 0, 12000, ...Array(11).fill(2844)];
  return [...older, ...recent];
}

describe("published morning of 11 Nov 2026", () => {
  const series = publishedSeries();
  const typical = typicalSpend({ long: series, short: series.slice(-14) }, 1200);
  const target = dailyTargetCents(typical.typical, 1200, 3500);

  it("blends the two windows into a RM 24.03 target", () => {
    expect(typical.blended).toBe(true);
    expect(typical.gap).toBeGreaterThan(0.3);
    expect(typical.gap).toBeCloseTo(0.45, 2);
    expect(target).toBe(2403);
  });

  it("reproduces safe, allowance, forecast, and runway from the opening balances", () => {
    const monthly = 48752;
    const days = daysRemainingInMonth("2026-11-11");
    expect(days).toBe(20);
    expect(reserveCents(target)).toBe(1201);
    const safe = safeAmountCents(monthly, target, days);
    expect(safe).toBe(2377);
    const smoothed = smoothedAllowanceCents(1600, target);
    expect(smoothed).toBe(1800);
    const amount = todayAmountCents(smoothed, carryCents(1600, series.at(-1) ?? 0, false), safe);
    expect(amount).toBe(1800);
    expect(safe < target).toBe(true);
    expect(monthly - amount * days).toBe(12752);
    expect(runwayDays(monthly, target)).toBe(19);
  });

  it("scores system health at 55 and splits an empty emergency fund 15 / 85", () => {
    const safe = 2377;
    const emergency = emergencyTarget({
      rent: 40000,
      internet: 3800,
      electricity: electricityShareCents(22195, 17000),
      dailyTarget: target,
      subscriptionReserve: subscriptionReserveCents(
        [{ merchant: "Sample", amount: 3867, date: "2026-11-01" }],
        "2026-11-11",
        60,
      ),
    });
    expect(electricityShareCents(22195, 17000)).toBe(17195);
    expect(emergency.base).toBe(133085);
    expect(emergency.purchaseFloor).toBe(66542);
    expect(emergency.target).toBe(153952);
    const split = splitRemainder(10_000, 0, emergency.target);
    expect(split.treasuryRate).toBeCloseTo(0.15, 5);
    expect(split.emergencyRate).toBeCloseTo(0.85, 5);
    expect(split.treasuryCents).toBe(1500);
    expect(split.emergencyCents).toBe(8500);
    const health = healthScore({
      treasury: 200000,
      treasuryFloor: 200000,
      emergency: 0,
      emergencyTarget: emergency.target,
      safe,
      target,
      spend: series,
    });
    expect(health.score).toBe(55);
  });
});

describe("daily allowance rules", () => {
  it("uses a trimmed mean, and the median when the window is short", () => {
    expect(trimmedMean([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(5.5);
    expect(trimmedMean([4, 1, 9])).toBe(4);
    expect(trimmedMean([1, 100])).toBe(50.5);
  });

  it("keeps the 28-day mean when the recent window is within 30%", () => {
    const flat = Array(28).fill(2000);
    const result = typicalSpend({ long: flat, short: flat.slice(-14) }, 1200);
    expect(result.blended).toBe(false);
    expect(dailyTargetCents(result.typical, 1200, 3500)).toBe(2000);
  });

  it("clips the target to the floor and the ceiling", () => {
    expect(dailyTargetCents(500, 1200, 3500)).toBe(1200);
    expect(dailyTargetCents(9000, 1200, 3500)).toBe(3500);
  });

  it("lets safe undercut the RM 2 smoothing band", () => {
    const smoothed = smoothedAllowanceCents(1600, 2403);
    expect(todayAmountCents(smoothed, 0, 1000)).toBe(1000);
  });

  it("limits carry to RM 5 and skips it on the first day", () => {
    expect(carryCents(1600, 3170, false)).toBe(0);
    expect(carryCents(1600, 3170, true)).toBe(-500);
    expect(carryCents(2000, 0, true)).toBe(500);
  });

  it("uses the remaining balance when monthly is already inside the reserve", () => {
    expect(safeAmountCents(800, 2403, 10)).toBe(80);
    expect(safeAmountCents(0, 2403, 10)).toBe(0);
  });
});

describe("allocation", () => {
  it("pays bills before monthly, then refills treasury, then splits", () => {
    const plan = planIncome({
      income: 120000,
      monthly: 48752,
      treasury: 200000,
      treasuryFloor: 200000,
      emergency: 0,
      target: 2403,
      daysRemaining: 20,
      emergencyTarget: 153952,
      unpaid: { rent: 40000, internet: 3800, electricity: 17195 },
    });
    expect(plan.bills).toBe(60995);
    expect(plan.alert).toBe(false);
    expect(plan.treasuryFill).toBe(0);
    expect(plan.toMonthly + plan.treasurySplit + plan.emergencySplit).toBe(120000 - 60995);
    expect(plan.emergencySplit).toBeGreaterThan(plan.treasurySplit);
  });

  it("stops the split and raises the alert when income cannot fund the month", () => {
    const plan = planIncome({
      income: 10000,
      monthly: 0,
      treasury: 200000,
      treasuryFloor: 200000,
      emergency: 0,
      target: 2403,
      daysRemaining: 20,
      emergencyTarget: 153952,
      unpaid: { rent: 40000, internet: 3800, electricity: 17000 },
    });
    expect(plan.billLines.map((line) => line.key)).toEqual(["rent"]);
    expect(plan.billLines[0]?.amount).toBe(10000);
    expect(plan.toMonthly).toBe(0);
    expect(plan.treasurySplit).toBe(0);
    expect(plan.emergencySplit).toBe(0);
    expect(plan.alert).toBe(true);
  });

  it("sweeps leftover monthly with the same split", () => {
    const plan = planMonthClose({
      monthly: 10000,
      treasury: 190000,
      treasuryFloor: 200000,
      emergency: 0,
      emergencyTarget: 153952,
    });
    expect(plan.treasuryFill).toBe(10000);
    expect(plan.treasurySplit).toBe(0);
    expect(plan.emergencySplit).toBe(0);
  });

  it("uses RM 170 when the electricity bill is unknown", () => {
    expect(electricityShareCents(null, 17000)).toBe(17000);
    expect(electricityShareCents(5000, 17000)).toBe(2500);
  });
});

describe("anomalies", () => {
  it("flags a day above double typical, and a merchant missing from the last 90 days", () => {
    expect(
      detectAnomaly({ daySpend: 5000, typical: 2403, merchant: null, knownMerchants: [] }).hot,
    ).toBe(true);
    expect(
      detectAnomaly({ daySpend: 4806, typical: 2403, merchant: null, knownMerchants: [] }).hot,
    ).toBe(false);
    expect(
      detectAnomaly({ daySpend: 100, typical: 2403, merchant: "New shop", knownMerchants: ["market"] }).code,
    ).toBe("new");
  });
});

describe("calendar", () => {
  it("counts 20 days left on 11 Nov including today", () => {
    expect(daysRemainingInMonth("2026-11-11")).toBe(20);
    expect(addDaysISO("2026-11-11", -1)).toBe("2026-11-10");
    expect(addDaysISO("2026-10-14", 27)).toBe("2026-11-10");
  });

  it("keeps the clock on Malaysia time", () => {
    const parts = klParts(new Date("2026-11-10T16:30:00Z"));
    expect(parts.iso).toBe("2026-11-11");
    expect(parts.hour).toBe(0);
    expect(parts.minute).toBe(30);
  });
});
