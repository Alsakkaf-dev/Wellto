"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${className}${pending ? " opacity-70" : ""}`} disabled={pending} aria-busy={pending}>
      {children}
    </button>
  );
}
