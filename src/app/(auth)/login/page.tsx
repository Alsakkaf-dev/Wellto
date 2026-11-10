import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/AuthScreens";
import { hasSession, readLocaleCookie } from "@/server/auth";
import { readWorkspace } from "@/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

export default async function LoginPage() {
  const state = await readWorkspace();
  if (!state.setupComplete) redirect("/setup");
  if (await hasSession()) redirect("/");
  const locale = (await readLocaleCookie()) ?? state.settings.locale;
  return <LoginScreen locale={locale} />;
}
