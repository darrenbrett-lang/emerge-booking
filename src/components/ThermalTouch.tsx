"use client";

import { useEffect, useRef } from "react";

// Touch the thermal room and it warms (Darren, 7 Nov 2026). A hotter copy of
// the photo shows through wherever a finger or the cursor passes, then cools
// back over a few seconds. The canvas sits exactly over .thermal-room, with
// the same cover crop, read from the photo's own computed object-position.
// Listeners go on the section, since the copy sits above the photo.
const SRC_SMALL = "/images/thermal-touch-1-800.webp";
const SRC_LARGE = "/images/thermal-touch-1-1672.webp";
const COOL = 0.022; // how much heat leaves the mask each frame
const MASK_SCALE = 0.25; // the mask is a quarter size; it is all soft edges

export function ThermalTouch() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const section = canvas?.parentElement;
    const room = section?.querySelector<HTMLImageElement>(".thermal-room");
    if (!canvas || !section || !room) return;
    const ctx = canvas.getContext("2d");
    const mask = document.createElement("canvas");
    const mctx = mask.getContext("2d");
    if (!ctx || !mctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const img = new Image();
    let ready = false;
    let raf = 0;
    let quietFrames = 0;
    let last: { x: number; y: number } | null = null;
    let w = 0;
    let h = 0;

    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width * dpr));
      h = Math.max(1, Math.round(r.height * dpr));
      canvas.width = w;
      canvas.height = h;
      mask.width = Math.max(1, Math.round(w * MASK_SCALE));
      mask.height = Math.max(1, Math.round(h * MASK_SCALE));
      kick();
    };

    // Where the photo sits in the box, as object-fit: cover places it.
    const cover = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const s = Math.max(w / iw, h / ih);
      const dw = iw * s;
      const dh = ih * s;
      const [px, py] = getComputedStyle(room)
        .objectPosition.split(" ")
        .map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5));
      return { x: (w - dw) * px, y: (h - dh) * (py ?? 0.5), dw, dh };
    };

    const draw = () => {
      raf = 0;
      // cool the whole mask a little
      mctx.globalCompositeOperation = "destination-out";
      // late in the cool-down, cool faster: 8-bit alpha stalls on tiny steps
      mctx.fillStyle = `rgba(0,0,0,${quietFrames > 150 ? 0.15 : COOL})`;
      mctx.fillRect(0, 0, mask.width, mask.height);
      mctx.globalCompositeOperation = "source-over";

      ctx.clearRect(0, 0, w, h);
      if (ready) {
        const c = cover();
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(img, c.x, c.y, c.dw, c.dh);
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(mask, 0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
      }
      // keep running until the room has cooled (about three seconds)
      quietFrames++;
      if (quietFrames < 200) raf = requestAnimationFrame(draw);
      else {
        mctx.clearRect(0, 0, mask.width, mask.height);
        ctx.clearRect(0, 0, w, h);
      }
    };

    function kick() {
      quietFrames = 0;
      if (!raf) raf = requestAnimationFrame(draw);
    }

    const warmAt = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      const x = (cx - r.left) / r.width;
      const y = (cy - r.top) / r.height;
      if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) {
        last = null;
        return;
      }
      const mx = x * mask.width;
      const my = y * mask.height;
      const rad = Math.max(mask.width, mask.height) * 0.09;
      // fill the gap since the last point, so a fast swipe leaves a trail
      const from = last ?? { x: mx, y: my };
      const dist = Math.hypot(mx - from.x, my - from.y);
      const steps = Math.max(1, Math.ceil(dist / (rad * 0.35)));
      for (let i = 1; i <= steps; i++) {
        const px = from.x + ((mx - from.x) * i) / steps;
        const py = from.y + ((my - from.y) * i) / steps;
        const g = mctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, "rgba(255,255,255,0.32)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        mctx.fillStyle = g;
        mctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      }
      last = { x: mx, y: my };
      kick();
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // touch has its own events, which keep firing while the page scrolls
      warmAt(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) warmAt(t.clientX, t.clientY);
    };
    const onEnd = () => {
      last = null;
    };

    // The first time the room comes into view, one slow pass warms it across,
    // so it is clear the photo answers to touch.
    let swept = false;
    const sweep = () => {
      if (swept || reduced) return;
      swept = true;
      const r = canvas.getBoundingClientRect();
      const t0 = performance.now();
      const run = (now: number) => {
        const p = Math.min(1, (now - t0) / 1800);
        const e = 1 - Math.pow(1 - p, 3);
        const box = canvas.getBoundingClientRect();
        warmAt(box.left + box.width * (0.08 + 0.84 * e), box.top + box.height * (0.62 - 0.22 * Math.sin(e * Math.PI)));
        if (p < 1) requestAnimationFrame(run);
        else last = null;
      };
      if (r.width) requestAnimationFrame(run);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && ready) {
          setTimeout(sweep, 900);
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );

    img.decoding = "async";
    img.onload = () => {
      ready = true;
      io.observe(canvas);
      kick();
    };
    img.src = window.innerWidth * dpr > 1000 ? SRC_LARGE : SRC_SMALL;

    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    section.addEventListener("pointermove", onPointer);
    section.addEventListener("pointerleave", onEnd);
    section.addEventListener("touchstart", onTouch, { passive: true });
    section.addEventListener("touchmove", onTouch, { passive: true });
    section.addEventListener("touchend", onEnd);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      section.removeEventListener("pointermove", onPointer);
      section.removeEventListener("pointerleave", onEnd);
      section.removeEventListener("touchstart", onTouch);
      section.removeEventListener("touchmove", onTouch);
      section.removeEventListener("touchend", onEnd);
    };
  }, []);

  return <canvas ref={ref} className="thermal-touch" aria-hidden="true" />;
}
