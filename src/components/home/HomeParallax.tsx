"use client";

import { useRef, ReactNode } from "react";

export default function HomeParallax({ children, strength = 14 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const raf = useRef<number | null>(null);
  return (
    <div
      ref={ref}
      className="parallax-stage"
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (raf.current) cancelAnimationFrame(raf.current);
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        raf.current = requestAnimationFrame(() => {
          el.style.setProperty("--px", `${(-x * strength).toFixed(1)}px`);
          el.style.setProperty("--py", `${(-y * strength).toFixed(1)}px`);
          el.style.setProperty("--tilt-x", `${(y * 4).toFixed(2)}deg`);
          el.style.setProperty("--tilt-y", `${(x * 4).toFixed(2)}deg`);
        });
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--px", "0px");
        el.style.setProperty("--py", "0px");
        el.style.setProperty("--tilt-x", "0deg");
        el.style.setProperty("--tilt-y", "0deg");
      }}
    >
      {children}
    </div>
  );
}
