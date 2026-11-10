import {
  carryCents,
  dailyTargetCents,
  detectAnomaly,
  electricityShareCents,
  emergencyTarget,
  healthScore,
  learnedCode,
  monthEndForecastCents,
  planIncome,
  planMonthClose,
  reserveCents,
  runwayDays,
  safeAmountCents,
  smoothedAllowanceCents,
  splitRemainder,
  subscriptionReserveCents,
  todayAmountCents,
  typicalSpend,
  type IncomePlan,
  type SpendWindows,
} from "@/lib/money/algorithm";
import { addDaysISO, daysRemainingInMonth, enumerateDays, isLastDayOfMonth, klParts, monthKey, weekKey } from "@/lib/money/time";
import type {
  AppState,
  Balances,
  Box,
  DayPlan,
  ExpenseCategory,
  PlannedBuy,
  Proposal,
  Settings,
  Transaction,
  UndoFrame,
} from "@/lib/money/types";

export const OPENING_BALANCES: Balances = {
  treasury: 200_000,
  monthly: 48_752,
  emergency: 0,
  daily: 635,
};

export function defaultSettings(): Settings {
  return {
    treasuryFloor: 200_000,
    rent: 40_000,
    internet: 3_800,
    electricityBill: null,
    electricityDefault: 17_000,
    dailyFloor: 1_200,
    dailyCeiling: 3_500,
    expectedIncome: 120_000,
    locale: "en",
  };
}

export function freshState(): AppState {
  return {
    version: 1,
    setupComplete: false,
    pinHash: null,
    pinSalt: null,
    failedPinAttempts: 0,
    pinLockedUntil: null,
    settings: defaultSettings(),
    balances: { ...OPENING_BALANCES },
    smoothing: { previousAllowance: 1_600, carryArmed: false },
    transactions: [],
    plans: [],
    reviews: [],
    decisions: [],
    notices: [],
    proposals: [],
    plannedBuys: [],
    snapshots: [],
    audits: [],
    undo: [],
    billsPaid: {},
    lastMorningDate: null,
    lastEveningDate: null,
    lastWeeklyKey: null,
    lastMonthCloseKey: null,
  };
}

function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function pushUndo(state: AppState, summary: string, frame: Omit<UndoFrame, "summary" | "at">, at: string): void {
  state.undo.push({ summary, at, ...frame });
  if (state.undo.length > 40) state.undo.splice(0, state.undo.length - 40);
  state.audits.unshift({ id: nid("aud"), at, summary, undone: false });
  if (state.audits.length > 200) state.audits.length = 200;
}

function capture(state: AppState) {
  return {
    balances: clone(state.balances),
    transactions: clone(state.transactions),
    proposals: clone(state.proposals),
    billsPaid: clone(state.billsPaid),
    plannedBuys: clone(state.plannedBuys),
    plans: clone(state.plans),
    smoothing: clone(state.smoothing),
  };
}

export function undoLast(state: AppState, at: string): { state: AppState; error?: string } {
  const next = clone(state);
  const frame = next.undo.pop();
  if (!frame) return { state, error: "nothing" };
  next.balances = frame.balances;
  next.transactions = frame.transactions;
  next.proposals = frame.proposals;
  next.billsPaid = frame.billsPaid;
  next.plannedBuys = frame.plannedBuys;
  next.plans = frame.plans;
  next.smoothing = frame.smoothing;
  next.audits.unshift({ id: nid("aud"), at, summary: `Undone: ${frame.summary}`, undone: false });
  return { state: next };
}

export function completeSetup(
  state: AppState,
  input: { balances: Balances; settings?: Partial<Settings>; today: string; at: string },
): AppState {
  const next = clone(state);
  next.setupComplete = true;
  next.balances = {
    treasury: Math.max(0, Math.trunc(input.balances.treasury)),
    monthly: Math.max(0, Math.trunc(input.balances.monthly)),
    emergency: Math.max(0, Math.trunc(input.balances.emergency)),
    daily: Math.trunc(input.balances.daily),
  };
  next.settings = { ...next.settings, ...input.settings };
  next.audits.unshift({ id: nid("aud"), at: input.at, summary: "Opened the wallet", undone: false });
  const morning = computeMorning(next, input.today, input.at);
  return writeReview(morning, input.today, input.at, "opening");
}

export function spendWindows(state: AppState, today: string): SpendWindows {
  const totals = new Map<string, number>();
  for (const tx of state.transactions) {
    if (tx.type !== "expense" || tx.category !== "daily") continue;
    totals.set(tx.purchaseDate, (totals.get(tx.purchaseDate) ?? 0) + tx.amount);
  }
  const dates = [...totals.keys()].sort();
  if (dates.length === 0) return { long: [], short: [] };
  const yesterday = addDaysISO(today, -1);
  const start = dates[0] > addDaysISO(yesterday, -27) ? dates[0] : addDaysISO(yesterday, -27);
  if (start > yesterday) return { long: [], short: [] };
  const long = enumerateDays(start, yesterday).map((date) => totals.get(date) ?? 0);
  return { long, short: long.slice(-14) };
}

function subscriptionCharges(state: AppState) {
  return state.transactions
    .filter((tx) => tx.type === "expense" && tx.category === "subscription")
    .map((tx) => ({ merchant: tx.merchant || "subscription", amount: tx.amount, date: tx.purchaseDate }));
}

export function picture(state: AppState, today: string) {
  const windows = spendWindows(state, today);
  const typical = typicalSpend(windows, state.settings.dailyFloor);
  const target = dailyTargetCents(typical.typical, state.settings.dailyFloor, state.settings.dailyCeiling);
  const days = daysRemainingInMonth(today);
  const safe = safeAmountCents(state.balances.monthly, target, days);
  const electricity = electricityShareCents(state.settings.electricityBill, state.settings.electricityDefault);
  const reserve = subscriptionReserveCents(subscriptionCharges(state), today, 60);
  const openPlans = state.plannedBuys
    .filter((buy) => buy.status === "waiting")
    .reduce((total, buy) => total + buy.amount, 0);
  const emergency = emergencyTarget({
    rent: state.settings.rent,
    internet: state.settings.internet,
    electricity,
    dailyTarget: target,
    subscriptionReserve: reserve,
    openPlans,
  });
  const split = splitRemainder(10000, state.balances.emergency, emergency.target);
  return { windows, typical, target, days, safe, electricity, emergency, split };
}

function knownMerchants(state: AppState, beforeDate: string): string[] {
  const start = addDaysISO(beforeDate, -90);
  const names = new Set<string>();
  for (const tx of state.transactions) {
    if (tx.purchaseDate < start || tx.purchaseDate >= beforeDate) continue;
    if (tx.merchant.trim()) names.add(tx.merchant.trim().toLowerCase());
  }
  return [...names];
}

function anomalyLine(state: AppState, today: string, typicalCents: number): DayPlan["anomaly"] {
  const yesterday = addDaysISO(today, -1);
  let spend = 0;
  const fresh: string[] = [];
  const known = knownMerchants(state, yesterday);
  for (const tx of state.transactions) {
    if (tx.purchaseDate !== yesterday || tx.type !== "expense") continue;
    if (tx.category === "daily") spend += tx.amount;
    if (tx.merchant.trim()) fresh.push(tx.merchant);
  }
  const spendFlag = detectAnomaly({ daySpend: spend, typical: typicalCents, merchant: null, knownMerchants: known });
  const merchantFlag = fresh
    .map((merchant) => detectAnomaly({ daySpend: 0, typical: typicalCents, merchant, knownMerchants: known }))
    .find((flag) => flag.newMerchant);
  if (spendFlag.hot && merchantFlag) return "both" as const;
  if (spendFlag.hot) return "hot" as const;
  if (merchantFlag) return "new" as const;
  return null;
}

export function computeMorning(state: AppState, today: string, at: string): AppState {
  const next = clone(state);
  const existing = next.plans.find((plan) => plan.date === today);
  if (existing?.toppedUp) return next;
  const allowance = existing ? existing.inputAllowance : next.smoothing.previousAllowance;
  const carryArmed = existing ? existing.inputCarryArmed : next.smoothing.carryArmed;
  const shot = picture(next, today);
  const yesterday = addDaysISO(today, -1);
  const yesterdaySpend = shot.windows.long.at(-1) ?? 0;
  const smoothed =
    allowance == null ? shot.target : smoothedAllowanceCents(allowance, shot.target);
  const carry = allowance == null ? 0 : carryCents(allowance, yesterdaySpend, carryArmed);
  const amount = todayAmountCents(smoothed, carry, shot.safe);
  const plan: DayPlan = {
    date: today,
    target: shot.target,
    safe: shot.safe,
    amount,
    reserve: reserveCents(shot.target),
    alert: shot.safe < shot.target,
    forecast: monthEndForecastCents(next.balances.monthly, amount, shot.days),
    runwayDays: runwayDays(next.balances.monthly, shot.target),
    typical: Math.trunc(shot.typical.typical),
    mean28: shot.typical.meanLong,
    mean14: shot.typical.meanShort,
    blended: shot.typical.blended,
    learning: shot.typical.learning,
    carry,
    inputAllowance: allowance,
    inputCarryArmed: carryArmed,
    anomaly: anomalyLine(next, today, shot.typical.typical),
    toppedUp: false,
    computedAt: at,
    emergencyTarget: shot.emergency.target,
    purchaseFloor: shot.emergency.purchaseFloor,
    treasuryRate: shot.split.treasuryRate,
    emergencyRate: shot.split.emergencyRate,
    learned: learnedCode(shot.typical),
  };
  next.plans = [plan, ...next.plans.filter((item) => item.date !== today)];
  if (!existing) {
    next.smoothing.previousAllowance = amount;
    next.smoothing.carryArmed = true;
    next.lastMorningDate = today;
  }
  upsertNotice(next, { date: today, kind: plan.alert ? "alert" : "topup", at });
  if (plan.anomaly) upsertNotice(next, { date: today, kind: "anomaly", at });
  return next;
}

function upsertNotice(
  state: AppState,
  notice: { date: string; kind: AppState["notices"][number]["kind"]; at: string },
): void {
  const index = state.notices.findIndex((item) => item.date === notice.date && item.kind === notice.kind);
  const next = {
    id: index >= 0 ? state.notices[index].id : nid("ntc"),
    at: notice.at,
    date: notice.date,
    kind: notice.kind,
    read: index >= 0 ? state.notices[index].read : false,
  };
  if (index >= 0) state.notices[index] = next;
  else state.notices.unshift(next);
}

function writeReview(state: AppState, today: string, at: string, kind: "opening" | "weekly" | "month"): AppState {
  const shot = picture(state, today);
  const health = healthScore({
    treasury: state.balances.treasury,
    treasuryFloor: state.settings.treasuryFloor,
    emergency: state.balances.emergency,
    emergencyTarget: shot.emergency.target,
    safe: shot.safe,
    target: shot.target,
    spend: shot.windows.long,
  });
  const learned = learnedCode(shot.typical);
  const previous = state.reviews[0];
  state.reviews.unshift({
    id: nid("rev"),
    at,
    date: today,
    kind,
    health: health.score,
    learned,
    target: shot.target,
    emergencyTarget: shot.emergency.target,
    treasuryRate: shot.split.treasuryRate,
    emergencyRate: shot.split.emergencyRate,
  });
  if (previous) {
    const targetMoved = Math.abs(shot.target - previous.target) >= 100;
    const emergencyMoved = Math.abs(shot.emergency.target - previous.emergencyTarget) >= 5_000;
    const rateMoved = Math.abs(shot.split.treasuryRate - previous.treasuryRate) >= 0.05;
    if (targetMoved || emergencyMoved || rateMoved) {
      state.decisions.unshift({
        id: nid("dec"),
        at,
        date: today,
        targetMoved,
        emergencyMoved,
        rateMoved,
        learned,
      });
    }
  }
  if (kind === "weekly") {
    upsertNotice(state, { date: today, kind: "weekly", at });
  }
  return state;
}

export function runAutomations(state: AppState, now: Date = new Date()): AppState {
  if (!state.setupComplete) return state;
  const clock = klParts(now);
  const at = now.toISOString();
  let next = computeMorning(state, clock.iso, at);
  if (clock.hour >= 23 && next.lastEveningDate !== clock.iso) {
    next = clone(next);
    next.snapshots.unshift({ date: clock.iso, at, balances: clone(next.balances) });
    if (next.snapshots.length > 120) next.snapshots.length = 120;
    next.lastEveningDate = clock.iso;
  }
  const week = weekKey(clock.iso);
  if (clock.weekday === 6 && next.lastWeeklyKey !== week) {
    next = writeReview(clone(next), clock.iso, at, "weekly");
    next.lastWeeklyKey = week;
  }
  next = maybeMonthClose(next, clock.iso, clock.hour, at);
  return next;
}

function maybeMonthClose(state: AppState, today: string, hour: number, at: string): AppState {
  const day = Number(today.slice(8, 10));
  const closingMonth = isLastDayOfMonth(today) ? monthKey(today) : day <= 3 ? previousMonth(today) : null;
  if (!closingMonth) return state;
  if (state.lastMonthCloseKey === closingMonth) return state;
  if (isLastDayOfMonth(today) && hour < 23) return state;
  if (state.proposals.some((proposal) => proposal.kind === "month_close" && proposal.status === "pending")) {
    return state;
  }
  const plan = planMonthClose({
    monthly: state.balances.monthly,
    treasury: state.balances.treasury,
    treasuryFloor: state.settings.treasuryFloor,
    emergency: state.balances.emergency,
    emergencyTarget: picture(state, today).emergency.target,
  });
  if (plan.swept <= 0) {
    state.lastMonthCloseKey = closingMonth;
    return state;
  }
  const next = clone(state);
  const proposal: Proposal = {
    id: nid("prp"),
    at,
    date: today,
    kind: "month_close",
    status: "pending",
    title: "Month-end sweep",
    lines: [
      { label: "From monthly", amount: plan.swept },
      { label: "Treasury", amount: plan.treasuryFill + plan.treasurySplit },
      { label: "Emergency", amount: plan.emergencySplit },
    ],
    delta: {
      treasury: plan.treasuryFill + plan.treasurySplit,
      monthly: -plan.swept,
      emergency: plan.emergencySplit,
      daily: 0,
    },
    leavesBank: 0,
    alert: false,
  };
  next.proposals.unshift(proposal);
  next.lastMonthCloseKey = closingMonth;
  upsertNotice(next, { date: today, kind: "month", at });
  return next;
}

function previousMonth(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return date.toISOString().slice(0, 7);
}

export function previewIncome(state: AppState, income: number, today: string): IncomePlan {
  const shot = picture(state, today);
  const paid = state.billsPaid[monthKey(today)] ?? { rent: false, internet: false, electricity: false };
  return planIncome({
    income,
    monthly: state.balances.monthly,
    treasury: state.balances.treasury,
    treasuryFloor: state.settings.treasuryFloor,
    emergency: state.balances.emergency,
    target: shot.target,
    daysRemaining: shot.days,
    emergencyTarget: shot.emergency.target,
    unpaid: {
      rent: paid.rent ? 0 : state.settings.rent,
      internet: paid.internet ? 0 : state.settings.internet,
      electricity: paid.electricity ? 0 : shot.electricity,
    },
  });
}

export function stageIncome(state: AppState, income: number, today: string, at: string): AppState {
  const plan = previewIncome(state, income, today);
  const next = clone(state);
  next.proposals = next.proposals.filter((proposal) => !(proposal.kind === "income" && proposal.status === "pending"));
  const lines = [
    ...plan.billLines.map((line) => ({
      label: line.key === "rent" ? "Rent" : line.key === "internet" ? "Internet" : "Electricity",
      amount: line.amount,
    })),
    { label: "Monthly", amount: plan.toMonthly },
    { label: "Treasury", amount: plan.treasuryFill + plan.treasurySplit },
    { label: "Emergency", amount: plan.emergencySplit },
  ].filter((line) => line.amount > 0);
  next.proposals.unshift({
    id: nid("prp"),
    at,
    date: today,
    kind: "income",
    status: "pending",
    title: "Allowance arrived",
    lines,
    delta: {
      treasury: plan.treasuryFill + plan.treasurySplit,
      monthly: plan.toMonthly,
      emergency: plan.emergencySplit,
      daily: 0,
    },
    leavesBank: plan.bills,
    alert: plan.alert,
  });
  return next;
}

export function confirmProposal(state: AppState, id: string, at: string): { state: AppState; error?: string } {
  const proposal = state.proposals.find((item) => item.id === id);
  if (!proposal || proposal.status !== "pending") return { state, error: "gone" };
  const next = clone(state);
  const before = capture(next);
  const current = next.proposals.find((item) => item.id === id)!;
  current.status = "applied";
  next.balances = {
    treasury: next.balances.treasury + current.delta.treasury,
    monthly: next.balances.monthly + current.delta.monthly,
    emergency: next.balances.emergency + current.delta.emergency,
    daily: next.balances.daily + current.delta.daily,
  };
  if (current.kind === "income") {
    const month = monthKey(current.date);
    const paid = next.billsPaid[month] ?? { rent: false, internet: false, electricity: false };
    for (const line of current.lines) {
      if (line.label === "Rent") paid.rent = true;
      if (line.label === "Internet") paid.internet = true;
      if (line.label === "Electricity") paid.electricity = true;
    }
    next.billsPaid[month] = paid;
    const allocated =
      current.delta.treasury + current.delta.monthly + current.delta.emergency + current.delta.daily;
    next.transactions.unshift(
      tx(next, {
        at,
        purchaseDate: current.date,
        type: "income",
        category: "income",
        amount: allocated + current.leavesBank,
        merchant: "Income",
        box: null,
        note: "Allowance",
      }),
    );
    for (const line of current.lines) {
      const category = billCategory(line.label);
      if (!category) continue;
      next.transactions.unshift(
        tx(next, {
          at,
          purchaseDate: current.date,
          type: "expense",
          category,
          amount: line.amount,
          merchant: line.label,
          box: null,
          note: "Paid as income arrived",
        }),
      );
    }
  } else {
    next.transactions.unshift(
      tx(next, {
        at,
        purchaseDate: current.date,
        type: "transfer",
        category: "transfer",
        amount: Math.abs(current.delta.monthly),
        merchant: "Month close",
        box: null,
        fromBox: "monthly",
        note: "Leftover monthly split",
      }),
    );
  }
  pushUndo(next, current.title, before, at);
  return { state: next };
}

function billCategory(label: string): ExpenseCategory | null {
  if (label === "Rent") return "rent";
  if (label === "Internet") return "internet";
  if (label === "Electricity") return "electricity";
  return null;
}

function tx(
  _state: AppState,
  input: {
    at: string;
    purchaseDate: string;
    type: Transaction["type"];
    category: Transaction["category"];
    amount: number;
    merchant: string;
    box: Box | null;
    fromBox?: Box | null;
    note: string;
  },
): Transaction {
  return {
    id: nid("tx"),
    at: input.at,
    purchaseDate: input.purchaseDate,
    type: input.type,
    category: input.category,
    amount: input.amount,
    merchant: input.merchant,
    box: input.box,
    fromBox: input.fromBox ?? null,
    toBox: null,
    note: input.note,
    historical: false,
  };
}

export function topUp(
  state: AppState,
  amount: number,
  today: string,
  at: string,
): { state: AppState; error?: string } {
  const cents = Math.trunc(amount);
  if (cents <= 0) return { state, error: "amount" };
  const next = clone(state);
  const before = capture(next);
  next.balances.monthly -= cents;
  next.balances.daily += cents;
  next.transactions.unshift(
    tx(next, {
      at,
      purchaseDate: today,
      type: "transfer",
      category: "transfer",
      amount: cents,
      merchant: "Touch 'n Go",
      box: "daily",
      fromBox: "monthly",
      note: "Top-up",
    }),
  );
  const plan = next.plans.find((item) => item.date === today);
  if (plan) plan.toppedUp = true;
  pushUndo(next, "Topped up daily", before, at);
  return { state: next };
}

const EMERGENCY_CATEGORIES = new Set<ExpenseCategory>(["subscription", "medical", "planned", "other"]);

export function addExpense(
  state: AppState,
  input: {
    amount: number;
    category: ExpenseCategory;
    merchant: string;
    purchaseDate: string;
    at: string;
    force?: boolean;
  },
): { state: AppState; error?: string; waiting?: PlannedBuy } {
  const cents = Math.trunc(input.amount);
  if (cents <= 0) return { state, error: "amount" };
  const today = input.purchaseDate;
  if (input.category === "planned" && cents > 3_000 && !input.force) {
    const next = clone(state);
    const before = capture(next);
    const buy: PlannedBuy = {
      id: nid("buy"),
      at: input.at,
      readyAt: new Date(new Date(input.at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      amount: cents,
      merchant: input.merchant.trim() || "Planned buy",
      status: "waiting",
    };
    next.plannedBuys.unshift(buy);
    pushUndo(next, "Parked a purchase for 24 hours", before, input.at);
    return { state: next, waiting: buy };
  }
  if (input.category === "planned") {
    const floor = picture(state, today).emergency.purchaseFloor;
    if (state.balances.emergency <= floor) {
      return { state, error: "floor_buy" };
    }
  }
  const next = clone(state);
  const before = capture(next);
  const box = boxFor(input.category);
  next.balances[box] -= cents;
  const merchant = input.merchant.trim();
  next.transactions.unshift(
    tx(next, {
      at: input.at,
      purchaseDate: input.purchaseDate,
      type: "expense",
      category: input.category,
      amount: cents,
      merchant: merchant || labelFor(input.category),
      box,
      note: "",
    }),
  );
  if (input.category === "rent" || input.category === "internet" || input.category === "electricity") {
    const key = monthKey(input.purchaseDate);
    const paid = next.billsPaid[key] ?? { rent: false, internet: false, electricity: false };
    paid[input.category] = true;
    next.billsPaid[key] = paid;
  }
  const shot = picture(next, today);
  if (input.category === "daily" || merchant) {
    const known = knownMerchants(next, input.purchaseDate);
    const daySpend = next.transactions
      .filter((item) => item.purchaseDate === input.purchaseDate && item.category === "daily" && item.type === "expense")
      .reduce((total, item) => total + item.amount, 0);
    const flag = detectAnomaly({
      daySpend: input.category === "daily" ? daySpend : 0,
      typical: shot.typical.typical,
      merchant: merchant || null,
      knownMerchants: known,
    });
    if (flag.code) upsertNotice(next, { date: today, kind: "anomaly", at: input.at });
  }
  pushUndo(next, `Spent ${labelFor(input.category).toLowerCase()}`, before, input.at);
  return { state: next };
}

function boxFor(category: ExpenseCategory): Box {
  if (category === "daily") return "daily";
  if (EMERGENCY_CATEGORIES.has(category)) return "emergency";
  return "monthly";
}

function labelFor(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    daily: "Daily",
    subscription: "Subscription",
    medical: "Treatment",
    planned: "Planned buy",
    other: "Other",
    rent: "Rent",
    internet: "Internet",
    electricity: "Electricity",
  };
  return labels[category];
}

export function moveBetween(
  state: AppState,
  input: { from: Box; to: Box; amount: number; today: string; at: string },
): { state: AppState; error?: string } {
  const cents = Math.trunc(input.amount);
  if (cents <= 0) return { state, error: "amount" };
  if (input.from === input.to) return { state, error: "same_box" };
  if (input.from === "treasury" && state.balances.treasury - cents < state.settings.treasuryFloor) {
    return { state, error: "treasury_floor" };
  }
  const next = clone(state);
  const before = capture(next);
  next.balances[input.from] -= cents;
  next.balances[input.to] += cents;
  next.transactions.unshift({
    ...tx(next, {
      at: input.at,
      purchaseDate: input.today,
      type: "transfer",
      category: "transfer",
      amount: cents,
      merchant: "Move",
      box: input.to,
      fromBox: input.from,
      note: "Moved between boxes",
    }),
    toBox: input.to,
  });
  pushUndo(next, "Moved money between boxes", before, input.at);
  return { state: next };
}

export function dropWaitingBuy(state: AppState, id: string): AppState {
  const next = clone(state);
  const buy = next.plannedBuys.find((item) => item.id === id);
  if (buy && buy.status === "waiting") buy.status = "dropped";
  return next;
}

export function recordWaitingBuy(state: AppState, id: string, today: string, at: string, force = false): { state: AppState; error?: string } {
  const buy = state.plannedBuys.find((item) => item.id === id);
  if (!buy || buy.status !== "waiting") return { state, error: "gone" };
  if (!force && at < buy.readyAt) return { state, error: "wait" };
  const spent = addExpense(state, {
    amount: buy.amount,
    category: "planned",
    merchant: buy.merchant,
    purchaseDate: today,
    at,
    force: true,
  });
  if (spent.error || !spent.state) return spent;
  const next = spent.state;
  const found = next.plannedBuys.find((item) => item.id === id);
  if (found) found.status = "recorded";
  return { state: next };
}

export function updateSettings(state: AppState, patch: Partial<Settings>, at: string): AppState {
  const next = clone(state);
  const before = capture(next);
  next.settings = { ...next.settings, ...patch };
  pushUndo(next, "Updated settings", before, at);
  return next;
}

export function setBalances(state: AppState, balances: Balances, at: string): AppState {
  const next = clone(state);
  const before = capture(next);
  next.balances = {
    treasury: Math.trunc(balances.treasury),
    monthly: Math.trunc(balances.monthly),
    emergency: Math.trunc(balances.emergency),
    daily: Math.trunc(balances.daily),
  };
  pushUndo(next, "Corrected balances", before, at);
  return next;
}

export function importHistory(
  state: AppState,
  rows: Omit<Transaction, "id" | "historical" | "at">[],
  at: string,
): AppState {
  const next = clone(state);
  const before = capture(next);
  for (const row of rows) {
    next.transactions.push({ ...row, id: nid("tx"), historical: true, at });
  }
  next.transactions.sort((a, b) => (a.purchaseDate < b.purchaseDate ? 1 : a.purchaseDate > b.purchaseDate ? -1 : 0));
  pushUndo(next, "Imported history", before, at);
  return next;
}

export function markNoticeRead(state: AppState, id: string): AppState {
  const next = clone(state);
  const notice = next.notices.find((item) => item.id === id);
  if (notice) notice.read = true;
  return next;
}

export function dismissProposal(state: AppState, id: string): AppState {
  const next = clone(state);
  const proposal = next.proposals.find((item) => item.id === id);
  if (proposal && proposal.status === "pending") proposal.status = "dismissed";
  return next;
}

export function latestPlan(state: AppState, today: string): DayPlan | null {
  return state.plans.find((plan) => plan.date === today) ?? null;
}

export function recentMerchants(state: AppState, limit = 8): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const tx of state.transactions) {
    if (tx.type !== "expense") continue;
    const name = tx.merchant.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}

export function suggestCategory(state: AppState, merchant: string): ExpenseCategory | null {
  const key = merchant.trim().toLowerCase();
  const found = state.transactions.find(
    (tx) => tx.type === "expense" && tx.merchant.trim().toLowerCase() === key && isExpenseCategory(tx.category),
  );
  return found && isExpenseCategory(found.category) ? found.category : null;
}

function isExpenseCategory(category: Transaction["category"]): category is ExpenseCategory {
  return (
    category === "daily" ||
    category === "subscription" ||
    category === "medical" ||
    category === "planned" ||
    category === "other" ||
    category === "rent" ||
    category === "internet" ||
    category === "electricity"
  );
}
