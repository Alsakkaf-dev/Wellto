import { InsightsPanel } from "@/components/InsightsPanel";
import { copyOf } from "@/lib/copy";
import { healthScore } from "@/lib/money/algorithm";
import { latestPlan, picture } from "@/lib/money/engine";
import { klDateISO } from "@/lib/money/time";
import { readLocaleCookie } from "@/server/auth";
import { prepareWorkspace } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const state = await prepareWorkspace();
  const locale = (await readLocaleCookie()) ?? state.settings.locale;
  const copy = copyOf(locale);
  const today = klDateISO();
  const plan = latestPlan(state, today);
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
  return (
    <main>
      <h1 className="num text-4xl italic">{copy.insights}</h1>
      <p className="mt-1 mb-5 text-sm text-muted">{copy.showMath}</p>
      <InsightsPanel locale={locale} plan={plan} health={health.score} decisions={state.decisions} />
    </main>
  );
}
