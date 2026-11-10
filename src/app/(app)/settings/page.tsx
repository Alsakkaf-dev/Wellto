import { SettingsDesk } from "@/components/SettingsDesk";
import { copyOf } from "@/lib/copy";
import { readLocaleCookie } from "@/server/auth";
import { logoutAction } from "@/server/actions";
import { loadWorkspace } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const state = await loadWorkspace();
  const locale = (await readLocaleCookie()) ?? state.settings.locale;
  const copy = copyOf(locale);
  return (
    <main>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="num text-4xl italic">{copy.settings}</h1>
          <p className="mt-1 text-sm text-muted">{copy.settingsIntro}</p>
        </div>
        <form action={logoutAction}>
          <button className="rounded-full border border-line bg-white px-4 py-2 text-sm">{copy.signOut}</button>
        </form>
      </div>
      <div className="mt-5">
        <SettingsDesk locale={locale} settings={state.settings} balances={state.balances} />
      </div>
    </main>
  );
}
