"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { CampusMarquee } from "./components/CampusMarquee";
import { SectionMenu } from "./components/SectionMenu";

const passSteps = [
  {
    number: "01",
    title: "Join the community",
    text: "Join the GDG KU Discord so you hear about events and can unlock member access.",
    href: "https://discord.gg/BmKfZUnaQ",
    label: "Join Discord",
    external: true,
  },
  {
    number: "02",
    title: "Sign in with Google",
    text: "Use the same Google account on every device. Your member pass stays connected to that account.",
    href: "/member",
    label: "Create member pass",
    external: false,
  },
  {
    number: "03",
    title: "Connect and show up",
    text: "Connect Discord once, complete your profile, then scan the live QR code at each session.",
    href: "/member",
    label: "Open my pass",
    external: false,
  },
];

export default function Home() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let context: { revert: () => void } | undefined;

    void import("gsap").then(({ gsap }) => {
      if (!root.current) return;
      context = gsap.context(() => {
        gsap.fromTo(
          ".reveal",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" },
        );
      }, root);
    });

    return () => context?.revert();
  }, []);

  return (
    <main ref={root}>
      <section className="hero home-hero" id="top">
        <nav className="shell">
          <a className="brand" href="/" aria-label="GDG on Campus KU home">
            <Image src="/gdg-logo.svg" alt="GDG on Campus KU" width={196} height={48} priority />
          </a>
          <SectionMenu />
        </nav>

        <div className="hero-grid shell">
          <div className="hero-copy">
            <p className="eyebrow reveal"><span /> UNIVERSITY OF KANSAS · LAWRENCE</p>
            <h1 className="reveal">Join once.<br /><i>Show up ready.</i></h1>
            <p className="hero-description reveal">
              Your GDG KU member pass keeps your profile, Discord access, and event check-ins in one place.
            </p>
            <div className="hero-actions reveal">
              <a className="button button-yellow" href="/member">Get your member pass <b>↗</b></a>
              <a className="text-link" href="#member-pass">How it works <b>↓</b></a>
            </div>
          </div>

          <div className="hero-art reveal">
            <CampusMarquee />
            <div className="hero-mark">GDG<br />KU</div>
          </div>
        </div>

        <div className="hero-footer shell">
          <p>GOOGLE DEVELOPER GROUPS ON CAMPUS</p>
          <p>ONE ACCOUNT · EVERY EVENT</p>
        </div>
      </section>

      <section className="member-pass-brief" id="member-pass">
        <div className="shell">
          <div className="pass-brief-heading">
            <div>
              <p className="kicker">MEMBER PASS</p>
              <h2>Everything you need<br /><i>to get started.</i></h2>
            </div>
            <p>
              No repetitive sign-up forms. Once you have a member pass, your profile and event access stay with your Google account.
            </p>
          </div>

          <div className="pass-steps">
            {passSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <a href={step.href} target={step.external ? "_blank" : undefined} rel={step.external ? "noreferrer" : undefined}>
                  {step.label} <b>↗</b>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-update section">
        <div className="shell home-update-grid">
          <div>
            <p className="kicker">WHAT&apos;S NEXT</p>
            <h2>Events are<br /><i>taking shape.</i></h2>
          </div>
          <div>
            <p>
              Workshops, build nights, and community sessions will be announced soon. The Discord is the quickest way to hear first.
            </p>
            <div className="home-update-actions">
              <a className="button button-blue" href="https://discord.gg/BmKfZUnaQ" target="_blank" rel="noreferrer">Join Discord <b>↗</b></a>
              <a className="text-link" href="/calendar">View calendar <b>↗</b></a>
            </div>
          </div>
        </div>
      </section>

      <section className="home-links">
        <div className="shell">
          <p>KEEP IN TOUCH</p>
          <div>
            <a href="https://www.linkedin.com/company/gdg-at-ku/posts/?feedView=all" target="_blank" rel="noreferrer">LinkedIn <b>↗</b></a>
            <a href="mailto:gdgatku@gmail.com">gdgatku@gmail.com <b>↗</b></a>
            <a href="/about">About GDG KU <b>↗</b></a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="shell">
          <span>© {new Date().getFullYear()} GDG ON CAMPUS · KU</span>
          <span>BUILD · LEARN · CONNECT</span>
        </div>
      </footer>
    </main>
  );
}
