export function formatRm(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.trunc(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

export function parseRm(value: string): number | null {
  const cleaned = value.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function formatDay(iso: string, locale: "en" | "ar"): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MY" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
