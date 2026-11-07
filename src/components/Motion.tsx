"use client";

import { useEffect } from "react";

// Marks [data-reveal] elements "is-in" once they scroll into view, so the CSS
// in additions.css can play their entrance once. The hidden starting states
// only apply under html.motion, which is set here, so without this script (or
// with reduced motion asked for) everything simply shows.
export function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    document.documentElement.classList.add("motion");
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
