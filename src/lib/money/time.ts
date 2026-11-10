const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function klParts(now: Date = new Date()): {
  iso: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = Number(pick("year"));
  const month = Number(pick("month"));
  const day = Number(pick("day"));
  let hour = Number(pick("hour"));
  if (hour === 24) hour = 0;
  return {
    iso: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    year,
    month,
    day,
    weekday: WEEKDAY[pick("weekday")] ?? 0,
    hour,
    minute: Number(pick("minute")),
  };
}

export function klDateISO(now: Date = new Date()): string {
  return klParts(now).iso;
}

export function addDaysISO(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return date.toISOString().slice(0, 10);
}

export function daysRemainingInMonth(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return last - day + 1;
}

export function isLastDayOfMonth(iso: string): boolean {
  return daysRemainingInMonth(iso) === 1;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function enumerateDays(start: string, end: string): string[] {
  if (start > end) return [];
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return dates;
}

/** Saturday-based week id in Malaysia, used so the weekly review runs once. */
export function weekKey(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const saturdayOffset = (weekday + 1) % 7;
  const saturday = new Date(date);
  saturday.setUTCDate(date.getUTCDate() - saturdayOffset);
  return saturday.toISOString().slice(0, 10);
}
