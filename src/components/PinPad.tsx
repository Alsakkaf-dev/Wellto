"use client";

import { useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function PinPad({
  label,
  error,
  onComplete,
}: {
  label: string;
  error?: string;
  onComplete: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");
  function press(key: string) {
    if (key === "del") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (!key) return;
    const next = (pin + key).slice(0, 4);
    setPin(next);
    if (next.length === 4) onComplete(next);
  }
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-3 flex gap-3" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={`h-3 w-3 rounded-full ${pin.length > index ? "bg-moss" : "bg-line"}`} />
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key || "blank"}
            type="button"
            className="pad-key"
            disabled={!key}
            onClick={() => press(key)}
          >
            {key === "del" ? "⌫" : key}
          </button>
        ))}
      </div>
    </div>
  );
}
