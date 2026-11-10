import { redirect } from "next/navigation";
import { SetupScreen } from "@/components/AuthScreens";
import { envPin, hasSession, readLocaleCookie } from "@/server/auth";
import { readWorkspace } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const state = await readWorkspace();
  if (state.setupComplete) {
    if (await hasSession()) redirect("/");
    redirect("/login");
  }
  const locale = (await readLocaleCookie()) ?? "en";
  return <SetupScreen locale={locale} balances={state.balances} envPin={Boolean(envPin())} />;
}
