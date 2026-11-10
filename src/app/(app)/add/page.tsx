import { AmountPad } from "@/components/AmountPad";
import { Proposals } from "@/components/Proposals";
import { copyOf } from "@/lib/copy";
import { formatRm } from "@/lib/format";
import { recentMerchants, suggestCategory } from "@/lib/money/engine";
import type { ExpenseCategory } from "@/lib/money/types";
import { readLocaleCookie } from "@/server/auth";
import { dropBuyAction, prepareWorkspace, recordBuyForm } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const state = await prepareWorkspace();
  const locale = (await readLocaleCookie()) ?? state.settings.locale;
  const copy = copyOf(locale);
  const merchants = recentMerchants(state);
  const suggestions: Record<string, ExpenseCategory> = {};
  for (const name of merchants) {
    const category = suggestCategory(state, name);
    if (category) suggestions[name.toLowerCase()] = category;
  }
  return (
    <main>
      <h1 className="num text-4xl italic">{copy.add}</h1>
      <p className="mt-1 text-sm text-muted">{copy.tagline}</p>
      <div className="mt-5">
        <AmountPad locale={locale} merchants={merchants} suggestions={suggestions} expectedIncome={state.settings.expectedIncome} />
      </div>
      {state.plannedBuys.some((buy) => buy.status === "waiting") ? (
        <section className="mt-6 space-y-2">
          <h2 className="text-sm text-muted">{copy.waitingBuys}</h2>
          {state.plannedBuys
            .filter((buy) => buy.status === "waiting")
            .map((buy) => (
              <article key={buy.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
                <div>
                  <p>{buy.merchant}</p>
                  <p className="num text-2xl">{formatRm(buy.amount)}</p>
                </div>
                <div className="flex gap-2">
                  <form action={recordBuyForm.bind(null, buy.id)}>
                    <button className="rounded-full bg-moss px-3 py-2 text-sm text-white">{copy.recordNow}</button>
                  </form>
                  <form action={dropBuyAction.bind(null, buy.id)}>
                    <button className="rounded-full border border-line px-3 py-2 text-sm">{copy.dropBuy}</button>
                  </form>
                </div>
              </article>
            ))}
        </section>
      ) : null}
      <Proposals proposals={state.proposals} locale={locale} />
    </main>
  );
}
