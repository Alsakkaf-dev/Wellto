import { describe, expect, it } from "vitest";
import { addDaysISO } from "@/lib/money/time";
import {
  addExpense,
  computeMorning,
  confirmProposal,
  freshState,
  importHistory,
  latestPlan,
  moveBetween,
  stageIncome,
  topUp,
  undoLast,
} from "@/lib/money/engine";
import type { ExpenseCategory, Transaction } from "@/lib/money/types";

function seriesTransactions(today: string): Omit<Transaction, "id" | "historical" | "at">[] {
  const older = [1080, 0, 12000, ...Array(11).fill(1080)];
  const recent = [2844, 0, 12000, ...Array(11).fill(2844)];
  const amounts = [...older, ...recent];
  const start = addDaysISO(addDaysISO(today, -1), -(amounts.length - 1));
  return amounts.flatMap((amount, index) => {
    if (amount === 0) return [];
    return [
      {
        purchaseDate: addDaysISO(start, index),
        type: "expense" as const,
        category: "daily" as const,
        amount,
        merchant: "Market",
        box: "daily" as const,
        fromBox: null,
        toBox: null,
        note: "",
      },
    ];
  });
}

describe("engine morning", () => {
  it("reproduces the published morning once equivalent history is loaded", () => {
    let state = freshState();
    state.setupComplete = true;
    state = importHistory(state, seriesTransactions("2026-11-11"), "2026-11-11T00:00:00.000Z");
    state.settings.electricityBill = 22195;
    state.transactions.unshift({
      id: "sub",
      at: "2026-11-01T00:00:00.000Z",
      purchaseDate: "2026-11-01",
      type: "expense",
      category: "subscription",
      amount: 3867,
      merchant: "Sample",
      box: "emergency",
      fromBox: null,
      toBox: null,
      note: "",
      historical: true,
    });
    state = computeMorning(state, "2026-11-11", "2026-11-11T00:05:00.000Z");
    const plan = latestPlan(state, "2026-11-11");
    expect(plan?.amount).toBe(1800);
    expect(plan?.target).toBe(2403);
    expect(plan?.safe).toBe(2377);
    expect(plan?.alert).toBe(true);
    expect(plan?.forecast).toBe(12752);
    expect(plan?.runwayDays).toBe(19);
    expect(plan?.emergencyTarget).toBe(153952);
    expect(plan?.purchaseFloor).toBe(66542);
    expect(plan?.treasuryRate).toBeCloseTo(0.15, 5);
    expect(plan?.emergencyRate).toBeCloseTo(0.85, 5);
    expect(plan?.anomaly).toBeNull();
    expect(plan?.learned).toBe("hotter");
  });

  it("does not invent a top-up for a missed day, and daily spending can go negative", () => {
    let state = freshState();
    state.setupComplete = true;
    state.balances.daily = 100;
    const spent = addExpense(state, {
      amount: 500,
      category: "daily",
      merchant: "Lunch",
      purchaseDate: "2026-11-11",
      at: "2026-11-11T04:00:00.000Z",
    });
    expect(spent.state.balances.daily).toBe(-400);
    expect(spent.state.balances.monthly).toBe(state.balances.monthly);
    expect(spent.state.plans.some((plan) => plan.date === "2026-11-10")).toBe(false);
  });

  it("undoes a top-up", () => {
    let state = freshState();
    state.setupComplete = true;
    state = computeMorning(state, "2026-11-11", "2026-11-11T00:05:00.000Z");
    const before = state.balances.daily;
    const topped = topUp(state, 1800, "2026-11-11", "2026-11-11T01:00:00.000Z");
    expect(topped.state.balances.daily).toBe(before + 1800);
    expect(latestPlan(topped.state, "2026-11-11")?.toppedUp).toBe(true);
    const undone = undoLast(topped.state, "2026-11-11T01:05:00.000Z");
    expect(undone.state.balances.daily).toBe(before);
    expect(latestPlan(undone.state, "2026-11-11")?.toppedUp).toBe(false);
  });

  it("applies an allowance in one confirm and can undo it", () => {
    let state = freshState();
    state.setupComplete = true;
    state = computeMorning(state, "2026-11-11", "2026-11-11T00:05:00.000Z");
    state = stageIncome(state, 120000, "2026-11-11", "2026-11-11T02:00:00.000Z");
    const proposal = state.proposals.find((item) => item.kind === "income" && item.status === "pending");
    expect(proposal?.alert).toBe(false);
    const before = { ...state.balances };
    const applied = confirmProposal(state, proposal!.id, "2026-11-11T02:01:00.000Z");
    expect(applied.error).toBeUndefined();
    const delta =
      applied.state.balances.treasury +
      applied.state.balances.monthly +
      applied.state.balances.emergency -
      (before.treasury + before.monthly + before.emergency);
    expect(delta).toBe(120000 - (proposal?.leavesBank ?? 0));
    expect(applied.state.billsPaid["2026-11"]?.rent).toBe(true);
    const undone = undoLast(applied.state, "2026-11-11T02:02:00.000Z");
    expect(undone.state.balances).toEqual(before);
  });

  it("refuses to pull treasury under its floor", () => {
    const state = freshState();
    const moved = moveBetween(state, {
      from: "treasury",
      to: "monthly",
      amount: 100,
      today: "2026-11-11",
      at: "2026-11-11T03:00:00.000Z",
    });
    expect(moved.error).toBe("treasury_floor");
  });

  it("holds a planned purchase above RM 30 for a day", () => {
    const state = freshState();
    state.balances.emergency = 200000;
    const parked = addExpense(state, {
      amount: 4000,
      category: "planned" satisfies ExpenseCategory,
      merchant: "Headphones",
      purchaseDate: "2026-11-11",
      at: "2026-11-11T03:00:00.000Z",
    });
    expect(parked.waiting?.status).toBe("waiting");
    expect(parked.state.balances.emergency).toBe(200000);
  });
});
