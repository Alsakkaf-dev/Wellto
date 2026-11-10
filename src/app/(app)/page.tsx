import { HomeBoard } from "@/components/HomeBoard";
import { Proposals } from "@/components/Proposals";
import { Wake } from "@/components/Wake";
import { anomalyText, copyOf, noticeText } from "@/lib/copy";
import { formatDay } from "@/lib/format";
import { latestPlan } from "@/lib/money/engine";
import { klDateISO } from "@/lib/money/time";
import { readLocaleCookie } from "@/server/auth";
import { loadWorkspace } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const state = await loadWorkspace();
  const locale = (await readLocaleCookie()) ?? state.settings.locale;
  const copy = copyOf(locale);
  const today = klDateISO();
  const plan = latestPlan(state, today);
  const notice = state.notices.find((item) => !item.read && (item.kind === "topup" || item.kind === "alert" || item.kind === "anomaly"));
  return (
    <main>
      <Wake
        title={copy.appName}
        body={
          notice
            ? notice.kind === "anomaly" && plan?.anomaly
              ? anomalyText(plan.anomaly, copy)
              : noticeText(notice.kind, copy)
            : ""
        }
      />
      <HomeBoard locale={locale} todayLabel={formatDay(today, locale)} balances={state.balances} plan={plan} />
      <Proposals proposals={state.proposals} locale={locale} />
    </main>
  );
}
