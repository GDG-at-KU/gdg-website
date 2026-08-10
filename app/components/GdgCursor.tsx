"use client";

import { useEffect, useRef } from "react";

export function GdgCursor() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const move = (event: PointerEvent) => {
      cursor.current?.style.setProperty("transform", `translate3d(${event.clientX}px, ${event.clientY}px, 0)`);
    };
    document.body.classList.add("gdg-cursor-active");
    window.addEventListener("pointermove", move, { passive: true });
    return () => { document.body.classList.remove("gdg-cursor-active"); window.removeEventListener("pointermove", move); };
  }, []);
  return <div ref={cursor} className="gdg-cursor" aria-hidden="true"><i /><i /><i /><i /></div>;
}
