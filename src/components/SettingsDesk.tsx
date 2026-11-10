"use client";

import { useState } from "react";
import { copyOf, errorText, type Locale } from "@/lib/copy";
import { formatRm, parseRm } from "@/lib/format";
import type { Balances, Box, Settings } from "@/lib/money/types";
import { balancesAction, importCsvAction, moveAction, restoreAction, settingsAction } from "@/server/actions";

function field(cents: number): string {
  return formatRm(cents).replace("−", "-");
}

export function SettingsDesk({
  locale,
  settings,
  balances,
}: {
  locale: Locale;
  settings: Settings;
  balances: Balances;
}) {
  const copy = copyOf(locale);
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const boxes: Box[] = ["treasury", "monthly", "emergency", "daily"];
  const boxLabel: Record<Box, string> = {
    treasury: copy.treasury,
    monthly: copy.monthly,
    emergency: copy.emergency,
    daily: copy.daily,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        className="rounded-[24px] border border-line bg-card p-5"
        action={async (formData) => {
          const result = await settingsAction(formData);
          setMessage(result.ok ? copy.saved : errorText(result.error, copy));
        }}
      >
        <h2 className="text-lg">{copy.bills}</h2>
        <Field name="rent" label={copy.rent} defaultValue={field(settings.rent)} />
        <Field name="internet" label={copy.internet} defaultValue={field(settings.internet)} />
        <Field name="electricity" label={copy.electricity} defaultValue={settings.electricityBill == null ? "" : field(settings.electricityBill)} hint={copy.electricityHint} />
        <Field name="expected" label={copy.expectedIncome} defaultValue={field(settings.expectedIncome)} />
        <button className="mt-4 h-12 w-full rounded-2xl bg-moss text-white">{copy.save}</button>
      </form>

      <form
        className="rounded-[24px] border border-line bg-card p-5"
        action={async (formData) => {
          const result = await balancesAction(formData);
          setMessage(result.ok ? copy.saved : errorText(result.error, copy));
        }}
      >
        <h2 className="text-lg">{copy.balances}</h2>
        <p className="mt-1 text-sm text-muted">{copy.dangerTreasury}</p>
        <Field name="treasury" label={copy.treasury} defaultValue={field(balances.treasury)} />
        <Field name="monthly" label={copy.monthly} defaultValue={field(balances.monthly)} />
        <Field name="emergency" label={copy.emergency} defaultValue={field(balances.emergency)} />
        <Field name="daily" label={copy.daily} defaultValue={field(balances.daily)} />
        <button className="mt-4 h-12 w-full rounded-2xl bg-ink text-white">{copy.correctBalances}</button>
      </form>

      <form
        className="rounded-[24px] border border-line bg-card p-5"
        action={async (formData) => {
          const cents = parseRm(String(formData.get("amount") ?? ""));
          if (cents == null) {
            setMessage(errorText("amount", copy));
            return;
          }
          const result = await moveAction({
            from: String(formData.get("from")) as Box,
            to: String(formData.get("to")) as Box,
            amount: cents,
          });
          setMessage(result.ok ? copy.saved : errorText(result.error, copy));
        }}
      >
        <h2 className="text-lg">{copy.move}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Select name="from" label={copy.from} boxes={boxes} labels={boxLabel} />
          <Select name="to" label={copy.to} boxes={boxes} labels={boxLabel} />
        </div>
        <label className="mt-3 block text-sm text-muted">
          RM
          <input name="amount" inputMode="decimal" placeholder="0.00" className="mt-1 w-full rounded-2xl border border-line px-3 py-3" />
        </label>
        <button className="mt-4 h-12 w-full rounded-2xl border border-line bg-white">{copy.moveAction}</button>
      </form>

      <div className="rounded-[24px] border border-line bg-card p-5">
        <h2 className="text-lg">{copy.importCsv}</h2>
        <p className="mt-1 text-sm text-muted">{copy.importHelp}</p>
        <form
          className="mt-3"
          action={async (formData) => {
            const result = await importCsvAction(formData);
            setMessage(result.ok ? copy.saved : errorText(result.error, copy));
          }}
        >
          <input name="file" type="file" accept=".csv,text/csv" className="block w-full text-sm" />
          <button className="mt-3 h-12 w-full rounded-2xl bg-moss text-white">{copy.importAction}</button>
        </form>
        <a href="/api/export" className="mt-4 inline-block text-sm text-moss">
          {copy.exportBackup}
        </a>
        <form
          className="mt-4"
          action={async (formData) => {
            const result = await restoreAction(formData);
            setMessage(result.ok ? copy.saved : errorText(result.error, copy));
          }}
        >
          <p className="text-sm text-muted">{copy.restore}</p>
          <input name="file" type="file" accept="application/json" className="mt-2 block w-full text-sm" />
          <button className="mt-3 h-11 rounded-2xl border border-line px-4">{copy.restoreAction}</button>
        </form>
      </div>

      <NotifyNote locale={locale} onNote={setNote} />
      {message ? <p className="text-sm lg:col-span-2">{message}</p> : null}
      {note ? <p className="text-sm text-moss lg:col-span-2">{note}</p> : null}
    </div>
  );
}

function Field({ name, label, defaultValue, hint }: { name: string; label: string; defaultValue: string; hint?: string }) {
  return (
    <label className="mt-3 block text-sm text-muted">
      {label}
      <input name={name} defaultValue={defaultValue} inputMode="decimal" className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-3 text-ink" />
      {hint ? <span className="mt-1 block text-xs">{hint}</span> : null}
    </label>
  );
}

function Select({
  name,
  label,
  boxes,
  labels,
}: {
  name: string;
  label: string;
  boxes: Box[];
  labels: Record<Box, string>;
}) {
  return (
    <label className="text-sm text-muted">
      {label}
      <select
        name={name}
        defaultValue={name === "to" ? "monthly" : "treasury"}
        className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-3 text-ink"
      >
        {boxes.map((box) => (
          <option key={box} value={box}>
            {labels[box]}
          </option>
        ))}
      </select>
    </label>
  );
}

function NotifyNote({ locale, onNote }: { locale: Locale; onNote: (value: string) => void }) {
  const copy = copyOf(locale);
  return (
    <div className="rounded-[24px] border border-line bg-card p-5">
      <h2 className="text-lg">{copy.notifications}</h2>
      <p className="mt-1 text-sm text-muted">{copy.cronHelp}</p>
      <button
        type="button"
        className="mt-4 h-12 w-full rounded-2xl bg-[#f6efdf] text-brass"
        onClick={async () => {
          if (typeof Notification === "undefined") return;
          const permission = await Notification.requestPermission();
          if (permission === "granted") onNote(copy.notificationsOn);
        }}
      >
        {copy.enableNotifications}
      </button>
    </div>
  );
}
