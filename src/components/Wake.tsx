"use client";

import { useEffect } from "react";

export function Wake({ title, body }: { title: string; body: string }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if (!title || !body) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = `${title}|${body}`;
    if (sessionStorage.getItem("mahfaza-ping") === key) return;
    sessionStorage.setItem("mahfaza-ping", key);
    new Notification(title, { body, lang: document.documentElement.lang });
  }, [title, body]);
  return null;
}
