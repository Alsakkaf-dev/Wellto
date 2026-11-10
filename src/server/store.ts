import "server-only";

import { neon } from "@neondatabase/serverless";
import { cache } from "react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { freshState, runAutomations } from "@/lib/money/engine";
import type { AppState } from "@/lib/money/types";

interface Envelope {
  version: number;
  state: AppState;
}

const FILE = process.env.DATA_FILE || path.join(process.cwd(), ".data", "mahfaza.json");

let chain: Promise<unknown> = Promise.resolve();
let tableReady = false;
type Sql = ReturnType<typeof neon<false, false>>;
let pooled: Sql | null = null;

function emptyEnvelope(): Envelope {
  return { version: 1, state: freshState() };
}

async function readFileEnvelope(): Promise<Envelope> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Envelope;
    if (!parsed?.state?.version) return emptyEnvelope();
    return parsed;
  } catch {
    return emptyEnvelope();
  }
}

async function writeFileEnvelope(envelope: Envelope): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(envelope), "utf8");
}

function sqlClient(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pooled) pooled = neon(url);
  return pooled;
}

async function ensureTable(sql: Sql): Promise<void> {
  if (tableReady) return;
  await sql`create table if not exists mahfaza_state (
    id text primary key,
    version integer not null,
    document jsonb not null,
    updated_at timestamptz not null default now()
  )`;
  tableReady = true;
}

async function readEnvelope(): Promise<Envelope> {
  const sql = sqlClient();
  if (!sql) return readFileEnvelope();
  await ensureTable(sql);
  const rows = await sql`select version, document from mahfaza_state where id = 'main'`;
  const row = rows[0] as { version: number; document: AppState | string } | undefined;
  if (!row) return emptyEnvelope();
  const state = typeof row.document === "string" ? (JSON.parse(row.document) as AppState) : row.document;
  return { version: Number(row.version), state };
}

async function writeEnvelope(previous: number, envelope: Envelope): Promise<boolean> {
  const sql = sqlClient();
  if (!sql) {
    await writeFileEnvelope(envelope);
    return true;
  }
  await ensureTable(sql);
  const document = JSON.stringify(envelope.state);
  if (previous <= 1 && (await sql`select 1 from mahfaza_state where id = 'main'`).length === 0) {
    await sql`insert into mahfaza_state (id, version, document) values ('main', ${envelope.version}, ${document}::jsonb)`;
    return true;
  }
  const updated = await sql`update mahfaza_state
    set version = ${envelope.version}, document = ${document}::jsonb, updated_at = now()
    where id = 'main' and version = ${previous}
    returning id`;
  return updated.length > 0;
}

export async function mutate(change: (state: AppState) => AppState): Promise<AppState> {
  const job = chain.then(async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = await readEnvelope();
      const nextState = change(current.state);
      if (nextState === current.state || JSON.stringify(nextState) === JSON.stringify(current.state)) return current.state;
      const saved = await writeEnvelope(current.version, { version: current.version + 1, state: nextState });
      if (saved) return nextState;
    }
    throw new Error("Could not save. Try again.");
  });
  chain = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

/** One database read per navigation. Repeated calls in the same render share it. */
export const loadWorkspace = cache(async (): Promise<AppState> => {
  return mutate((state) => runAutomations(state));
});

export async function readWorkspace(): Promise<AppState> {
  return (await readEnvelope()).state;
}
