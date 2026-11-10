import { categoryLabel, copyOf } from "@/lib/copy";
import { formatDay, formatRm } from "@/lib/format";
import type { ExpenseCategory } from "@/lib/money/types";
import { readLocaleCookie } from "@/server/auth";
import { prepareWorkspace, undoForm } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const state = await prepareWorkspace();
  const locale = (await readLocaleCookie()) ?? state.settings.locale;
  const copy = copyOf(locale);
  const rows = state.transactions.filter((tx) => tx.amount > 0).slice(0, 200);
  return (
    <main>
      <div className="flex items-end justify-between gap-3">
        <h1 className="num text-4xl italic">{copy.history}</h1>
        <form action={undoForm}>
          <button className="rounded-full border border-line bg-white px-4 py-2 text-sm">{copy.undo}</button>
        </form>
      </div>
      {rows.length === 0 ? <p className="mt-8 text-muted">{copy.historyEmpty}</p> : null}
      <ol className="mt-5 space-y-2">
        {rows.map((tx) => (
          <li key={tx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
            <div>
              <p className="text-sm text-ink">{tx.merchant || tx.note || tx.category}</p>
              <p className="text-xs text-muted">
                {formatDay(tx.purchaseDate, locale)}
                {" · "}
                {tx.category === "income" || tx.category === "transfer" || tx.category === "adjustment"
                  ? tx.category
                  : categoryLabel(tx.category as ExpenseCategory, copy)}
                {tx.historical ? ` · ${copy.imported}` : ""}
              </p>
            </div>
            <p className={`num text-2xl ${tx.type === "income" ? "text-moss" : "text-ink"}`}>
              {tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "−"}
              {formatRm(tx.amount)}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
