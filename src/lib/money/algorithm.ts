/**
 * D-R-064 money brain.
 * Amounts are integer cents. Statistical means stay fractional until a
 * money output is cut (truncated toward zero) to the cent.
 */

export interface SpendWindows {
  long: number[];
  short: number[];
}

export interface TypicalResult {
  typical: number;
  meanLong: number;
  meanShort: number;
  blended: boolean;
  /** |short − long| / long, or 0 when there is nothing to compare. */
  gap: number;
  learning: boolean;
}

export function trimmedMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (values.length < 10) {
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  const drop = Math.floor(values.length * 0.1);
  const core = sorted.slice(drop, sorted.length - drop);
  const sum = core.reduce((total, value) => total + value, 0);
  return sum / core.length;
}

export function populationCv(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * 28-day trimmed mean, blended with the 14-day mean when they differ by more than 30%.
 * A shorter ledger uses every available day (zeros included) instead of inventing a 28-day span.
 */
export function typicalSpend(windows: SpendWindows, floorCents: number): TypicalResult {
  const long = windows.long;
  if (long.length === 0) {
    return {
      typical: floorCents,
      meanLong: floorCents,
      meanShort: floorCents,
      blended: false,
      gap: 0,
      learning: true,
    };
  }
  const meanLong = trimmedMean(long);
  const short = windows.short.length > 0 ? windows.short : long.slice(-Math.min(14, long.length));
  const meanShort = trimmedMean(short);
  const gap = meanLong === 0 ? 0 : Math.abs(meanShort - meanLong) / meanLong;
  const blended = long.length >= 14 && short.length >= 14 && gap > 0.3;
  const typical = blended ? (meanLong + meanShort) / 2 : meanLong;
  return { typical, meanLong, meanShort, blended, gap, learning: long.length < 14 };
}

export function dailyTargetCents(typical: number, floorCents: number, ceilingCents: number): number {
  const clipped = Math.min(ceilingCents, Math.max(floorCents, typical));
  return Math.trunc(clipped);
}

export function reserveCents(targetCents: number): number {
  return Math.max(1000, Math.trunc(targetCents / 2));
}

export function safeAmountCents(monthlyCents: number, targetCents: number, daysRemaining: number): number {
  if (daysRemaining <= 0) return 0;
  const reserve = reserveCents(targetCents);
  const base = monthlyCents <= reserve ? monthlyCents : monthlyCents - reserve;
  if (base <= 0) return 0;
  return Math.trunc(base / daysRemaining);
}

/** 70% yesterday + 30% target, then held within RM 2 of yesterday, then cut to the cent. */
export function smoothedAllowanceCents(yesterdayCents: number, targetCents: number): number {
  const rawTimes10 = 7 * yesterdayCents + 3 * targetCents;
  const lo = (yesterdayCents - 200) * 10;
  const hi = (yesterdayCents + 200) * 10;
  const clamped = Math.min(hi, Math.max(lo, rawTimes10));
  return Math.trunc(clamped / 10);
}

/** Half of (yesterday's allowance − yesterday's spend), limited to ± RM 5. First day is zero. */
export function carryCents(
  yesterdayAllowance: number,
  yesterdaySpend: number,
  armed: boolean,
): number {
  if (!armed) return 0;
  const half = Math.trunc((yesterdayAllowance - yesterdaySpend) / 2);
  return Math.min(500, Math.max(-500, half));
}

export function todayAmountCents(smoothed: number, carry: number, safe: number): number {
  const base = safe < smoothed ? safe : smoothed;
  return Math.max(0, Math.min(base + carry, safe));
}

export function monthEndForecastCents(
  monthlyCents: number,
  todayAmount: number,
  daysRemaining: number,
): number {
  return monthlyCents - todayAmount * daysRemaining;
}

export function runwayDays(monthlyCents: number, targetCents: number): number {
  if (targetCents <= 0) return 0;
  const reserve = reserveCents(targetCents);
  return Math.max(0, Math.floor((monthlyCents - reserve) / targetCents));
}

/** Share of a known total bill: RM 25 plus everything above RM 75. Unknown bill → default (RM 170). */
export function electricityShareCents(totalBillCents: number | null, fallbackCents: number): number {
  if (totalBillCents == null) return fallbackCents;
  return 2500 + Math.max(0, totalBillCents - 7500);
}

export function subscriptionReserveCents(
  charges: { merchant: string; amount: number; date: string }[],
  asOf: string,
  lookbackDays: number,
): number {
  const start = shiftIso(asOf, -lookbackDays);
  const latest = new Map<string, { amount: number; date: string }>();
  for (const charge of charges) {
    if (charge.date < start || charge.date > asOf) continue;
    if (charge.amount > 5000) continue;
    const key = charge.merchant.trim().toLowerCase();
    const prev = latest.get(key);
    if (!prev || charge.date >= prev.date) latest.set(key, { amount: charge.amount, date: charge.date });
  }
  const sum = [...latest.values()].reduce((total, row) => total + row.amount, 0);
  return Math.min(8000, sum + 2000);
}

export interface EmergencyTarget {
  bills: number;
  base: number;
  subscriptionReserve: number;
  target: number;
  purchaseFloor: number;
}

export function emergencyTarget(input: {
  rent: number;
  internet: number;
  electricity: number;
  dailyTarget: number;
  subscriptionReserve: number;
  openPlans?: number;
  months?: number;
}): EmergencyTarget {
  const bills = input.rent + input.internet + input.electricity;
  const months = input.months ?? 1;
  const base = bills + input.dailyTarget * 30 * months;
  const subscriptionReserve = input.subscriptionReserve;
  const target = base + subscriptionReserve + 15000 + (input.openPlans ?? 0);
  return {
    bills,
    base,
    subscriptionReserve,
    target,
    purchaseFloor: Math.trunc(base / 2),
  };
}

export interface Split {
  gap: number;
  emergencyRate: number;
  treasuryRate: number;
  emergencyBps: number;
  treasuryBps: number;
  treasuryCents: number;
  emergencyCents: number;
}

/** Emergency share = 0.20 + 0.65 × gap. Treasury is cut to the cent; leftover cents go to emergency. */
export function splitRemainder(remainderCents: number, emergencyBalance: number, emergencyTargetCents: number): Split {
  const gap =
    emergencyTargetCents <= 0
      ? 0
      : Math.min(1, Math.max(0, (emergencyTargetCents - emergencyBalance) / emergencyTargetCents));
  const emergencyBps = 2000 + Math.round(6500 * gap);
  const treasuryBps = 10000 - emergencyBps;
  const amount = Math.max(0, remainderCents);
  const treasuryCents = Math.floor((amount * treasuryBps) / 10000);
  const emergencyCents = amount - treasuryCents;
  return {
    gap,
    emergencyRate: emergencyBps / 10000,
    treasuryRate: treasuryBps / 10000,
    emergencyBps,
    treasuryBps,
    treasuryCents,
    emergencyCents,
  };
}

export interface HealthParts {
  treasury: number;
  emergency: number;
  monthly: number;
  stability: number;
  cv: number;
  score: number;
}

export function healthScore(input: {
  treasury: number;
  treasuryFloor: number;
  emergency: number;
  emergencyTarget: number;
  safe: number;
  target: number;
  spend: number[];
}): HealthParts {
  const treasury =
    input.treasury >= input.treasuryFloor || input.treasuryFloor <= 0
      ? 100
      : 100 * (input.treasury / input.treasuryFloor);
  const emergency =
    input.emergencyTarget <= 0 ? 100 : 100 * Math.min(1, Math.max(0, input.emergency / input.emergencyTarget));
  const monthly = input.target <= 0 ? 0 : 100 * Math.min(1, Math.max(0, input.safe / input.target));
  const cv = populationCv(input.spend);
  const stability = 100 * Math.max(0, 1 - cv / 1.5);
  const raw = 0.25 * treasury + 0.3 * emergency + 0.25 * monthly + 0.2 * stability;
  return {
    treasury,
    emergency,
    monthly,
    stability,
    cv,
    score: Math.round(raw),
  };
}

export type LearnedCode = "learning" | "hotter" | "lighter" | "steady";

export function learnedCode(result: TypicalResult): LearnedCode {
  if (result.learning) return "learning";
  if (result.blended && result.meanShort > result.meanLong) return "hotter";
  if (result.blended) return "lighter";
  return "steady";
}

export type AnomalyCode = "hot" | "new" | "both";

export interface Anomaly {
  hot: boolean;
  newMerchant: boolean;
  code: AnomalyCode | null;
}

export function detectAnomaly(input: {
  daySpend: number;
  typical: number;
  merchant: string | null;
  knownMerchants: string[];
}): Anomaly {
  const hot = input.typical > 0 && input.daySpend > input.typical * 2;
  const name = input.merchant?.trim().toLowerCase() ?? "";
  const newMerchant =
    name.length > 0 && !input.knownMerchants.some((known) => known.toLowerCase() === name);
  const code: AnomalyCode | null = hot && newMerchant ? "both" : hot ? "hot" : newMerchant ? "new" : null;
  return { hot, newMerchant, code };
}

export interface IncomePlan {
  income: number;
  bills: number;
  billLines: { key: "rent" | "internet" | "electricity"; amount: number }[];
  toMonthly: number;
  treasuryFill: number;
  treasurySplit: number;
  emergencySplit: number;
  alert: boolean;
  monthlyNeed: number;
}

export function planIncome(input: {
  income: number;
  monthly: number;
  treasury: number;
  treasuryFloor: number;
  emergency: number;
  target: number;
  daysRemaining: number;
  emergencyTarget: number;
  unpaid: { rent: number; internet: number; electricity: number };
}): IncomePlan {
  const order: ("rent" | "internet" | "electricity")[] = ["rent", "internet", "electricity"];
  let left = Math.max(0, input.income);
  const billLines: IncomePlan["billLines"] = [];
  for (const key of order) {
    const due = input.unpaid[key];
    if (due <= 0 || left <= 0) continue;
    const pay = Math.min(due, left);
    billLines.push({ key, amount: pay });
    left -= pay;
  }
  const bills = billLines.reduce((total, line) => total + line.amount, 0);
  const billsDue =
    Math.max(0, input.unpaid.rent) + Math.max(0, input.unpaid.internet) + Math.max(0, input.unpaid.electricity);
  const buffer = Math.max(2000, input.target * 2);
  const monthlyNeed = input.target * input.daysRemaining + buffer;
  const wantMonthly = Math.max(0, monthlyNeed - input.monthly);
  const toMonthly = Math.min(left, wantMonthly);
  left -= toMonthly;
  const shortOfMonthly = toMonthly < wantMonthly;
  const treasuryFill = shortOfMonthly ? 0 : Math.min(left, Math.max(0, input.treasuryFloor - input.treasury));
  left -= treasuryFill;
  const split = shortOfMonthly
    ? { treasuryCents: 0, emergencyCents: 0 }
    : splitRemainder(left, input.emergency, input.emergencyTarget);
  const alert = bills < billsDue || shortOfMonthly;
  return {
    income: input.income,
    bills,
    billLines,
    toMonthly,
    treasuryFill,
    treasurySplit: split.treasuryCents,
    emergencySplit: split.emergencyCents,
    alert,
    monthlyNeed,
  };
}

export interface MonthClosePlan {
  swept: number;
  treasuryFill: number;
  treasurySplit: number;
  emergencySplit: number;
}

export function planMonthClose(input: {
  monthly: number;
  treasury: number;
  treasuryFloor: number;
  emergency: number;
  emergencyTarget: number;
}): MonthClosePlan {
  let left = Math.max(0, input.monthly);
  const treasuryFill = Math.min(left, Math.max(0, input.treasuryFloor - input.treasury));
  left -= treasuryFill;
  const split = splitRemainder(left, input.emergency, input.emergencyTarget);
  return {
    swept: Math.max(0, input.monthly),
    treasuryFill,
    treasurySplit: split.treasuryCents,
    emergencySplit: split.emergencyCents,
  };
}

function shiftIso(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return date.toISOString().slice(0, 10);
}
