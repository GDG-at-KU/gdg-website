"use client";
import { useEffect, useRef, useState } from "react";

const links = [["01", "Home", "/"], ["02", "About", "/about"], ["03", "Calendar", "/calendar"], ["04", "Tracks", "/tracks"], ["05", "Team", "/team"], ["06", "Join us", "/join"]];

export function SectionMenu() {
  const [open, setOpen] = useState(false); const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = open ? "hidden" : previous; return () => { document.body.style.overflow = previous; }; }, [open]);
  useEffect(() => { void import("gsap").then(({ gsap }) => { const el = panel.current; if (!el) return; if (open) { gsap.set(el,{display:"block"}); gsap.fromTo(el,{clipPath:"circle(0% at calc(100% - 82px) 50px)"},{clipPath:"circle(145% at calc(100% - 82px) 50px)",duration:.72,ease:"power4.inOut"}); gsap.fromTo(el.querySelectorAll(".section-menu-link"),{y:48,opacity:0},{y:0,opacity:1,stagger:.06,delay:.22,duration:.5,ease:"power3.out"}); } else { gsap.to(el,{clipPath:"circle(0% at calc(100% - 82px) 50px)",duration:.45,ease:"power3.in",onComplete:()=>gsap.set(el,{display:"none"})}); } }); },[open]);
  return <><button className="section-menu-trigger" onClick={()=>setOpen(!open)} aria-expanded={open}><span>{open?"Close":"Menu"}</span><i>{open?"×":"+"}</i></button><div className="section-menu-panel" ref={panel}><div className="section-menu-top"><p>GDG ON CAMPUS · KU</p><button onClick={()=>setOpen(false)} aria-label="Close menu">×</button></div><nav>{links.map(([number,label,href])=><a className="section-menu-link" href={href} key={label} onClick={()=>setOpen(false)}><span>{number}</span><b>{label}</b><i>↗</i></a>)}</nav><div className="section-menu-bottom">BUILD · LEARN · CONNECT<br />UNIVERSITY OF KANSAS</div></div></>;
}
