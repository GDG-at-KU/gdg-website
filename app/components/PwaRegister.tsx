"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!import.meta.env.PROD) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())));
      void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
