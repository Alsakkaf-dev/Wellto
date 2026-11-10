"use client";

import { setLocaleAction } from "@/server/actions";
import type { Locale } from "@/lib/copy";

export function LanguageToggle({ locale }: { locale: Locale }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-white p-1 text-sm">
      <button
        type="button"
        onClick={() => setLocaleAction("en")}
        className={`rounded-full px-3 py-1 ${locale === "en" ? "bg-ink text-white" : "text-muted"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocaleAction("ar")}
        className={`rounded-full px-3 py-1 ${locale === "ar" ? "bg-ink text-white" : "text-muted"}`}
      >
        ع
      </button>
    </div>
  );
}
