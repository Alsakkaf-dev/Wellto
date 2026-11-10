import type { ExpenseCategory, Transaction, TxType } from "@/lib/money/types";

export interface ParsedRow {
  purchaseDate: string;
  amount: number;
  merchant: string;
  type: TxType;
  category: Transaction["category"];
  include: boolean;
  note: string;
}

const DAILY = ["طعام", "بقالة", "مطعم", "بنزين", "grocery", "restaurant", "restoran", "grab", "lunch", "food", "mart", "petrol", "petronas", "fuel"];
const SUBSCRIPTION = ["اشتراك", "subscription", "netflix", "spotify"];
const RENT = ["إيجار", "rent"];
const INTERNET = ["إنترنت", "internet", "unifi"];
const ELECTRICITY = ["كهرباء", "electricity", "tnb"];
const MEDICAL = ["علاج", "clinic", "pharmacy", "طبي"];

export function parseMoneyCsv(text: string): ParsedRow[] {
  const table = parseTable(text);
  if (table.length === 0) return [];
  const header = table[0].map((cell) => cell.toLowerCase());
  const ledger = header.includes("event_id") && header.includes("notes");
  const rows = ledger ? table.slice(1) : looksLikeHeader(header) ? table.slice(1) : table;
  return rows.flatMap((cells) => {
    const row = ledger ? fromLedger(header, cells) : fromSimple(header, cells, looksLikeHeader(table[0].map((cell) => cell.toLowerCase())));
    return row ? [row] : [];
  });
}

function fromSimple(header: string[], cells: string[], hasHeader: boolean): ParsedRow | null {
  const value = (name: string, index: number) => {
    if (!hasHeader) return cells[index] ?? "";
    const found = header.indexOf(name);
    return found >= 0 ? cells[found] ?? "" : cells[index] ?? "";
  };
  const date = normalizeDate(value("date", 0));
  const amount = parseAmount(value("amount", 1));
  if (!date || amount == null || amount === 0) return null;
  const merchant = value("merchant", 2).trim();
  const hinted = value("category", 3).trim().toLowerCase();
  const category = asCategory(hinted) ?? classify(`${merchant} ${hinted}`);
  const type: TxType = category === "income" ? "income" : category === "transfer" ? "transfer" : "expense";
  return {
    purchaseDate: date,
    amount: Math.abs(amount),
    merchant,
    type,
    category,
    include: type === "expense" && category !== "adjustment",
    note: "",
  };
}

function fromLedger(header: string[], cells: string[]): ParsedRow | null {
  const col = (name: string) => cells[header.indexOf(name)] ?? "";
  const occurred = col("occurred_at");
  const dateFromNote = purchaseDateFromNote(col("notes"), occurred);
  const date = dateFromNote ?? normalizeDate(occurred);
  const amount = parseAmount(col("amount"));
  if (!date || amount == null || amount === 0) return null;
  const kind = col("type").toLowerCase();
  const notes = col("notes");
  const merchant = merchantFromNotes(notes);
  if (kind === "transfer") {
    return row(date, amount, merchant || "Transfer", "transfer", "transfer", false, notes);
  }
  if (kind === "income") {
    return row(date, amount, merchant || "Income", "income", "income", false, notes);
  }
  if (kind !== "expense") return null;
  const category = classify(notes);
  return row(date, amount, merchant || "Expense", "expense", category, true, "");
}

function row(
  purchaseDate: string,
  amount: number,
  merchant: string,
  type: TxType,
  category: Transaction["category"],
  include: boolean,
  note: string,
): ParsedRow {
  return { purchaseDate, amount: Math.abs(amount), merchant, type, category, include, note };
}

export function classify(text: string): Transaction["category"] {
  const hay = text.toLowerCase();
  if (containsAny(hay, RENT)) return "rent";
  if (containsAny(hay, INTERNET)) return "internet";
  if (containsAny(hay, ELECTRICITY)) return "electricity";
  if (containsAny(hay, SUBSCRIPTION)) return "subscription";
  if (containsAny(hay, MEDICAL)) return "medical";
  if (containsAny(hay, DAILY)) return "daily";
  return "other";
}

function containsAny(hay: string, needles: string[]): boolean {
  return needles.some((needle) => hay.includes(needle));
}

function asCategory(value: string): Transaction["category"] | null {
  const allowed: Transaction["category"][] = [
    "daily",
    "subscription",
    "medical",
    "planned",
    "other",
    "rent",
    "internet",
    "electricity",
    "income",
    "transfer",
  ];
  return allowed.find((item) => item === value) ?? null;
}

function merchantFromNotes(notes: string): string {
  const cleaned = notes.split("[")[0]?.split("؛")[0]?.trim() ?? "";
  return cleaned.slice(0, 48);
}

function purchaseDateFromNote(notes: string, occurred: string): string | null {
  const match = notes.match(/شراء\s*(\d{1,2})[-/](\d{1,2})/);
  if (!match) return null;
  const year = (normalizeDate(occurred) ?? "2026-01-01").slice(0, 4);
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
}

function parseAmount(value: string): number | null {
  const cleaned = value.trim().replace(/[RM\s,]/gi, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const negative = cleaned.startsWith("-");
  const [whole, frac = ""] = cleaned.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return negative ? -cents : cents;
}

function looksLikeHeader(header: string[]): boolean {
  return header.includes("date") || header.includes("amount") || header.includes("event_id");
}

function parseTable(text: string): string[][] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

export function toHistorical(rows: ParsedRow[]): Omit<Transaction, "id" | "historical" | "at">[] {
  return rows
    .filter((row) => row.include && row.type === "expense")
    .map((row) => ({
      purchaseDate: row.purchaseDate,
      type: "expense" as const,
      category: (row.category === "income" || row.category === "transfer" ? "other" : row.category) as ExpenseCategory,
      amount: row.amount,
      merchant: row.merchant,
      box: null,
      fromBox: null,
      toBox: null,
      note: row.note,
    }));
}
