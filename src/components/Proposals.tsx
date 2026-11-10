import { SubmitButton } from "@/components/SubmitButton";
import { copyOf, proposalLine, type Locale } from "@/lib/copy";
import { formatRm } from "@/lib/format";
import type { Proposal } from "@/lib/money/types";
import { confirmForm, dismissAction } from "@/server/actions";

export function Proposals({ proposals, locale }: { proposals: Proposal[]; locale: Locale }) {
  const copy = copyOf(locale);
  const waiting = proposals.filter((proposal) => proposal.status === "pending");
  if (waiting.length === 0) return null;
  return (
    <section className="mt-4 space-y-3">
      <h2 className="text-sm text-muted">{copy.proposals}</h2>
      {waiting.map((proposal) => (
        <article key={proposal.id} className="rounded-[28px] border border-line bg-card p-5 shadow-card">
          <h3 className="text-lg">{proposal.kind === "income" ? copy.allowanceArrived : copy.monthSweep}</h3>
          {proposal.alert ? <p className="mt-1 text-sm text-clay">{copy.incomeShort}</p> : null}
          <ul className="mt-3 space-y-1.5">
            {proposal.lines.map((line) => (
              <li key={line.label} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted">{proposalLine(line.label, copy)}</span>
                <span className="num text-xl">{formatRm(line.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <form action={confirmForm.bind(null, proposal.id)} className="flex-1">
              <SubmitButton className="h-12 w-full rounded-2xl bg-moss text-white">{copy.apply}</SubmitButton>
            </form>
            <form action={dismissAction.bind(null, proposal.id)}>
              <SubmitButton className="h-12 rounded-2xl border border-line px-4 text-muted">{copy.notNow}</SubmitButton>
            </form>
          </div>
        </article>
      ))}
    </section>
  );
}
