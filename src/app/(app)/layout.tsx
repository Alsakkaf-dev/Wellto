import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { hasSession, readLocaleCookie } from "@/server/auth";
import { loadWorkspace } from "@/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const state = await loadWorkspace();
  if (!state.setupComplete) redirect("/setup");
  if (!(await hasSession())) redirect("/login");
  const locale = (await readLocaleCookie()) ?? state.settings.locale;
  return <Shell locale={locale}>{children}</Shell>;
}
