import { NextResponse } from "next/server";
import { hasSession } from "@/server/auth";
import { readWorkspace } from "@/server/store";

export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

export async function GET() {
  if (!(await hasSession())) return NextResponse.json({ ok: false }, { status: 401 });
  const state = await readWorkspace();
  const backup = { ...state, pinHash: null, pinSalt: null };
  return new NextResponse(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=mahfaza-backup.json",
    },
  });
}
