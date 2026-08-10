"use client";

import { useEffect, useRef } from "react";

export function GdgCursor() {
  const cursor = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const image = new Image();
    image.src = "/assets/google-developers-mark.png";
    image.onload = () => {
      const output = mark.current;
      if (!output) return;
      const source = document.createElement("canvas");
      source.width = image.naturalWidth; source.height = image.naturalHeight;
      const context = source.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, source.width, source.height);
      let left = source.width, top = source.height, right = 0, bottom = 0;
      for (let i = 0; i < pixels.data.length; i += 4) {
        const isWhite = pixels.data[i] > 245 && pixels.data[i + 1] > 245 && pixels.data[i + 2] > 245;
        if (isWhite) { pixels.data[i + 3] = 0; continue; }
        const x = (i / 4) % source.width, y = Math.floor(i / 4 / source.width);
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      context.putImageData(pixels, 0, 0);
      output.width = 96; output.height = 96;
      output.getContext("2d")!.drawImage(source, left, top, right - left + 1, bottom - top + 1, 4, 4, 88, 88);
    };
    const move = (event: PointerEvent) => {
      cursor.current?.style.setProperty("transform", `translate3d(${event.clientX}px, ${event.clientY}px, 0)`);
    };
    document.body.classList.add("gdg-cursor-active");
    window.addEventListener("pointermove", move, { passive: true });
    return () => { document.body.classList.remove("gdg-cursor-active"); window.removeEventListener("pointermove", move); };
  }, []);
  return <div ref={cursor} className="gdg-cursor" aria-hidden="true"><canvas ref={mark} /></div>;
}
