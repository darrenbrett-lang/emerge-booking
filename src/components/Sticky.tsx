"use client";

import { useEffect, useState } from "react";

// The phone's bottom bar, shown once the opening banner has scrolled away.
export function Sticky() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const cta = document.getElementById("hero-cta");
    const rsvp = document.getElementById("rsvp");
    if (!cta || !("IntersectionObserver" in window)) return;
    let pastHero = false;
    let atForm = false;
    const update = () => setShow(pastHero && !atForm);
    const a = new IntersectionObserver(([e]) => {
      pastHero = e.boundingClientRect.bottom <= 0;
      update();
    });
    const b = new IntersectionObserver(([e]) => {
      atForm = e.isIntersecting;
      update();
    });
    a.observe(cta);
    if (rsvp) b.observe(rsvp);
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, []);
  return (
    <div className="sticky" id="sticky" hidden={!show}>
      <a className="button" href="#rsvp">
        Put me on the list! <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
