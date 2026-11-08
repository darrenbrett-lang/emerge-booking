"use client";

import { useEffect, useId, useRef } from "react";
import { EVENT } from "@/lib/event";

// The Launch Night stamp (Darren, 8 Nov 2026): a rubber stamp in electric
// blue on the ticket. Double ring, the edition's details running round
// between the rings, LAUNCH NIGHT stacked in the middle, and the tooth star
// from the hero as the full stop. The ink is uneven the way a real stamp is:
// a noise mask takes speckles out and a slight displacement roughs the edge.
// Drawn in SVG, so it is crisp at any size and prints.
export function LaunchStamp({ className = "" }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ring = `${id}-ring`;
  const ink = `${id}-ink`;
  const around = `EMERGE / ${EVENT.dateShort.toUpperCase()} / MAIDENHEAD / `;
  const box = useRef<HTMLDivElement>(null);

  // It lands like a stamp the first time it comes into view. Hidden only once
  // this has run, so without script, or with reduced motion, it simply shows.
  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.classList.add("will-stamp");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        el.classList.add("stamped");
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className={`launch-stamp ${className}`} role="img" aria-label="Launch night">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <path id={ring} d="M100,100 m-77,0 a77,77 0 1,1 154,0 a77,77 0 1,1 -154,0" />
          <filter id={ink} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="7" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.55" result="specks" />
            <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="1" seed="12" result="press" />
            <feColorMatrix in="press" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.9 0 0 0 -0.2" result="pressure" />
            <feComposite in="specks" in2="pressure" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="holes" />
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="wobble" />
            <feDisplacementMap in="SourceGraphic" in2="wobble" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feComposite in="rough" in2="holes" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${ink})`} fill="currentColor" stroke="currentColor">
          <circle cx="100" cy="100" r="92" fill="none" strokeWidth="6" />
          <circle cx="100" cy="100" r="66" fill="none" strokeWidth="2.6" />
          <text className="launch-stamp-around" stroke="none">
            <textPath href={`#${ring}`} startOffset="0" textLength="476" lengthAdjust="spacing">
              {around}
            </textPath>
          </text>
          <text className="launch-stamp-word" x="100" y="99" textAnchor="middle" stroke="none">
            LAUNCH
          </text>
          <text className="launch-stamp-word" x="100" y="129" textAnchor="middle" stroke="none">
            NIGHT
          </text>
          <path
            stroke="none"
            d="M100 137 l2.6 6.4 6.9 .5 -5.3 4.4 1.7 6.7 -5.9 -3.7 -5.9 3.7 1.7 -6.7 -5.3 -4.4 6.9 -.5z"
          />
        </g>
      </svg>
    </div>
  );
}
