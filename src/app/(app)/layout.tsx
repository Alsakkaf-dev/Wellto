import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { hasSession, readLocaleCookie } from "@/server/auth";
import { prepareWorkspace } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const state = await prepareWorkspace();
  if (!state.setupComplete) redirect("/setup");
  if (!(await hasSession())) redirect("/login");
  const locale = (await readLocaleCookie()) ?? state.settings.locale;
  return <Shell locale={locale}>{children}</Shell>;
}
