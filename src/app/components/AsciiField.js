"use client";

import { useEffect, useRef } from "react";

// Brightness ramp, dimmest -> brightest
const RAMP = " .·:-=+*#%@";
const FPS = 20;

/**
 * Full-viewport ASCII texture: layered sine waves rendered as characters,
 * brightening around the cursor. Purely decorative.
 */
export default function AsciiField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";

    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let width = 0, height = 0, cellW = 0, cellH = 0, cols = 0, rows = 0;
    let lastDraw = 0, rafId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const fontSize = width < 640 ? 13 : 12;
      cellW = fontSize * 0.75;
      cellH = fontSize * 1.35;
      cols = Math.ceil(width / cellW);
      rows = Math.ceil(height / cellH);
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = "top";
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, width, height);
      // ease the glow toward the cursor so it trails softly
      mouse.x += (mouse.tx - mouse.x) * 0.15;
      mouse.y += (mouse.ty - mouse.y) * 0.15;

      // bucket cells by ramp level so fillStyle changes only once per level
      const buckets = Array.from({ length: RAMP.length }, () => []);
      const time = t * 0.00035;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cellW;
          const y = r * cellH;
          let v =
            Math.sin(c * 0.07 + time * 2.1) +
            Math.sin(r * 0.13 - time * 1.7) +
            Math.sin((c + r) * 0.045 + time) +
            Math.sin(Math.hypot(c - cols * 0.7, r - rows * 0.2) * 0.12 - time * 2.6);
          v = (v + 4) / 8; // 0..1
          v = v * v * v;   // keep most of the field quiet

          const d = Math.hypot(x - mouse.x, y - mouse.y);
          if (d < 160) v += (1 - d / 160) * 0.32;

          const level = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length));
          if (level > 0) buckets[level].push(c, r);
        }
      }

      for (let level = 1; level < RAMP.length; level++) {
        const cells = buckets[level];
        if (!cells.length) continue;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + (level / RAMP.length) * 0.32})`;
        const ch = RAMP[level];
        for (let i = 0; i < cells.length; i += 2) {
          ctx.fillText(ch, cells[i] * cellW, cells[i + 1] * cellH);
        }
      }
    };

    const loop = (t) => {
      rafId = requestAnimationFrame(loop);
      if (t - lastDraw < 1000 / FPS) return;
      lastDraw = t;
      draw(t);
    };

    const onPointerMove = (e) => {
      if (e.pointerType !== "mouse") return; // a touch would leave the glow stuck where the finger lifted
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      if (mouse.x < -9000) { mouse.x = e.clientX; mouse.y = e.clientY; }
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduceMotion) {
      draw(0);
    } else {
      window.addEventListener("pointermove", onPointerMove);
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="ascii-field" aria-hidden="true" />;
}
