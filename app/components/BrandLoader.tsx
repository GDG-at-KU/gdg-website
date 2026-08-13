"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SESSION_KEY = "gdg-intro-seen";
const INTRO_DURATION_MS = 2200;

export function BrandLoader() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (sessionStorage.getItem(SESSION_KEY) || reducedMotion) {
      return;
    }

    const startTimer = window.setTimeout(() => {
      setVisible(true);
      document.body.classList.add("intro-active");
    }, 0);

    const exitTimer = window.setTimeout(
      () => setLeaving(true),
      INTRO_DURATION_MS - 450,
    );

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
      document.body.classList.remove("intro-active");
      sessionStorage.setItem(SESSION_KEY, "true");
    }, INTRO_DURATION_MS);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
      document.body.classList.remove("intro-active");
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`brand-loader${leaving ? " is-leaving" : ""}`}
      aria-hidden="true"
    >
      <div className="brand-loader-lockup">
        <Image
          className="brand-loader-outline"
          src="/logo_256x256.png"
          alt=""
          width={156}
          height={156}
          unoptimized
        />

        <span className="brand-loader-reveal">
          <Image
            className="brand-loader-mark"
            src="/logo_256x256.png"
            alt=""
            width={156}
            height={156}
            priority
            unoptimized
          />
        </span>

        <span className="brand-loader-edge" />
      </div>

      <p className="brand-loader-label">
        <span>Google Developer Groups</span>
        <strong>On Campus · University of Kansas</strong>
      </p>
    </div>
  );
}
