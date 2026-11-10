import { NextResponse } from "next/server";
import { runAutomations } from "@/lib/money/engine";
import { klDateISO } from "@/lib/money/time";
import { mutate } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.VERCEL && !secret) {
    return NextResponse.json({ ok: false, error: "Set CRON_SECRET" }, { status: 500 });
  }
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await mutate((state) => runAutomations(state, new Date()));
  return NextResponse.json({ ok: true, date: klDateISO() });
}
