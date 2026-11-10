"use client";

import { useState } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PinPad } from "@/components/PinPad";
import { copyOf, errorText, type Locale } from "@/lib/copy";
import { formatRm } from "@/lib/format";
import type { Balances } from "@/lib/money/types";
import { loginAction, setupAction } from "@/server/actions";

export function LoginScreen({ locale }: { locale: Locale }) {
  const copy = copyOf(locale);
  const [error, setError] = useState<string | undefined>();
  return (
    <AuthFrame locale={locale} title={copy.welcomeBack} body={copy.tagline}>
      <PinPad
        label={copy.pinPad}
        error={error ? errorText(error, copy) : undefined}
        onComplete={async (pin) => {
          const result = await loginAction(pin);
          if (result && !result.ok) setError(result.error);
        }}
      />
    </AuthFrame>
  );
}

export function SetupScreen({ locale, balances, envPin }: { locale: Locale; balances: Balances; envPin: boolean }) {
  const copy = copyOf(locale);
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [stage, setStage] = useState<"pin" | "again" | "balances">(envPin ? "balances" : "pin");
  const [error, setError] = useState<string | undefined>();

  return (
    <AuthFrame locale={locale} title={copy.setupTitle} body={copy.setupBody}>
      {stage === "pin" ? (
        <PinPad
          label={copy.pin}
          error={error ? errorText(error, copy) : undefined}
          onComplete={(value) => {
            setPin(value);
            setError(undefined);
            setStage("again");
          }}
        />
      ) : null}
      {stage === "again" ? (
        <PinPad
          label={copy.pinAgain}
          error={error ? errorText(error, copy) : undefined}
          onComplete={(value) => {
            if (value !== pin) {
              setError("mismatch");
              setStage("pin");
              return;
            }
            setAgain(value);
            setError(undefined);
            setStage("balances");
          }}
        />
      ) : null}
      {stage === "balances" ? (
        <form
          className="space-y-3"
          action={async (formData) => {
            if (!envPin) {
              formData.set("pin", pin);
              formData.set("again", again);
            }
            const result = await setupAction(formData);
            if (result && !result.ok) setError(result.error);
          }}
        >
          <p className="text-sm text-muted">{copy.setupBalances}</p>
          <Field name="treasury" label={copy.treasury} defaultValue={formatRm(balances.treasury)} />
          <Field name="monthly" label={copy.monthly} defaultValue={formatRm(balances.monthly)} />
          <Field name="emergency" label={copy.emergency} defaultValue={formatRm(balances.emergency)} />
          <Field name="daily" label={copy.daily} defaultValue={formatRm(balances.daily)} />
          <Field name="electricity" label={copy.electricity} defaultValue="" hint={copy.electricityHint} />
          {error ? <p className="text-sm text-clay">{errorText(error, copy)}</p> : null}
          <button className="h-14 w-full rounded-2xl bg-moss text-lg text-white">{copy.openWallet}</button>
        </form>
      ) : null}
    </AuthFrame>
  );
}

function AuthFrame({
  locale,
  title,
  body,
  children,
}: {
  locale: Locale;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{copyOf(locale).currencyNote}</p>
        <LanguageToggle locale={locale} />
      </div>
      <h1 className="num mt-10 text-5xl italic">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function Field({ name, label, defaultValue, hint }: { name: string; label: string; defaultValue: string; hint?: string }) {
  return (
    <label className="block text-sm text-muted">
      {label}
      <input name={name} defaultValue={defaultValue} inputMode="decimal" className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-3 text-lg text-ink" />
      {hint ? <span className="mt-1 block text-xs">{hint}</span> : null}
    </label>
  );
}
