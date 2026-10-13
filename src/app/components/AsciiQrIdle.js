"use client";

import { useEffect, useRef } from "react";

const SIZE = 21; // a version-1 QR grid
const TICK_MS = 110;
const SHADES = ["  ", "  ", "  ", "░░", "▒▒", "▓▓", "██", "██"];

// Cells that are part of a finder pattern (the three big squares) or the timing lines
const fixedCell = (r, c) => {
  const corners = [[0, 0], [0, SIZE - 7], [SIZE - 7, 0]];
  for (const [r0, c0] of corners) {
    const y = r - r0, x = c - c0;
    if (y >= -1 && y <= 7 && x >= -1 && x <= 7) {
      if (y < 0 || y > 6 || x < 0 || x > 6) return "  "; // quiet separator
      const ring = Math.min(y, x, 6 - y, 6 - x);
      return ring === 1 ? "  " : "██";
    }
  }
  if (r === 6 || c === 6) return (r + c) % 2 === 0 ? "██" : "  ";
  return null;
};

/** Placeholder shown before a code is generated: a QR "assembling" itself in ASCII. */
export default function AsciiQrIdle() {
  const preRef = useRef(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const grid = Array.from({ length: SIZE }, (_, r) =>
      Array.from({ length: SIZE }, (_, c) => fixedCell(r, c) ?? SHADES[Math.floor(Math.random() * SHADES.length)])
    );

    const render = () => {
      preRef.current.textContent = grid.map((row) => row.join("")).join("\n");
    };

    const step = () => {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (fixedCell(r, c) === null && Math.random() < 0.12) {
            grid[r][c] = SHADES[Math.floor(Math.random() * SHADES.length)];
          }
        }
      }
      render();
    };

    render();
    const interval = reduceMotion ? null : setInterval(step, TICK_MS);
    return () => interval && clearInterval(interval);
  }, []);

  return <pre ref={preRef} className="ascii-qr-idle" aria-hidden="true" />;
}
