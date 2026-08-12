"use client";

import { useEffect, useRef, useState } from "react";

const links = [
  ["01", "Home", "/"],
  ["02", "Members", "/members"],
  ["03", "Buddy match", "/buddies"],
  ["04", "Member pass", "/member"],
  ["05", "About", "/about"],
  ["06", "Calendar", "/calendar"],
  ["07", "Tracks", "/tracks"],
  ["08", "Team", "/team"],
  ["09", "Join us", "/join"],
];

export function SectionMenu() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    void import("gsap").then(({ gsap }) => {
      const element = panel.current;
      if (!element) return;
      if (open) {
        gsap.set(element, { display: "block" });
        gsap.fromTo(element, { clipPath: "circle(0% at calc(100% - 82px) 52px)" }, { clipPath: "circle(145% at calc(100% - 82px) 52px)", duration: 0.65, ease: "power4.inOut" });
        gsap.fromTo(element.querySelectorAll(".section-menu-link"), { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.045, delay: 0.16, duration: 0.4, ease: "power3.out" });
      } else {
        gsap.to(element, { clipPath: "circle(0% at calc(100% - 82px) 52px)", duration: 0.35, ease: "power3.in", onComplete: () => gsap.set(element, { display: "none" }) });
      }
    });
  }, [open]);

  return <>
    <button className="section-menu-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="site-menu"><span>{open ? "Close" : "Menu"}</span><i>{open ? "x" : "+"}</i></button>
    <div className="section-menu-panel" ref={panel} id="site-menu">
      <div className="section-menu-top"><p>GDG ON CAMPUS . KU</p></div>
      <nav aria-label="Site navigation">{links.map(([number, label, href]) => <a className="section-menu-link" href={href} key={label} onClick={() => setOpen(false)}><span>{number}</span><b>{label}</b><i>-&gt;</i></a>)}</nav>
      <div className="section-menu-bottom"><span>BUILD . LEARN . CONNECT</span><span>UNIVERSITY OF KANSAS</span></div>
    </div>
  </>;
}
