import { describe, expect, it } from "vitest";
import { parseMoneyCsv } from "@/lib/money/csv";

describe("csv import", () => {
  it("reads a simple sheet and a note with a purchase date", () => {
    const simple = parseMoneyCsv("date,amount,merchant,category\n2026-11-01,12.50,Market,daily\n");
    expect(simple[0]).toMatchObject({ purchaseDate: "2026-11-01", amount: 1250, category: "daily", include: true });

    const ledger = parseMoneyCsv(
      [
        "event_id,occurred_at,type,amount,currency,wallet,cash_delta,receivable_delta,source,notes",
        'x,2026-11-08,expense,23.95,RM,x,0,0,x,"مطعم (شراء 06-11)"',
        "y,2026-11-01,transfer,100.00,RM,x,0,0,x,self transfer",
      ].join("\n"),
    );
    expect(ledger[0]).toMatchObject({ purchaseDate: "2026-11-06", amount: 2395, category: "daily", include: true });
    expect(ledger[1]?.include).toBe(false);
  });
});