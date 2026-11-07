"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { zipSync } from "fflate";

const PNG_PX = 1024;

const serializeSvg = (svgEl) => {
  let svg = new XMLSerializer().serializeToString(svgEl);
  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svg;
};

// Rasterise a QR SVG to a crisp PNG (no smoothing, so modules stay sharp)
const svgToPng = (svg) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = PNG_PX;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, PNG_PX, PNG_PX);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("PNG export failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

const saveBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// "IMG 1234.jpeg" -> "IMG-1234-qr"; numbered so names stay unique inside the ZIP
const fileBase = (name, index) =>
  `${String(index + 1).padStart(2, "0")}-${name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "-").slice(0, 60)}-qr`;

/**
 * A list of generated QR codes (one per image or per contact) with per-code and download-all (ZIP) exports.
 * results: [{ id, name, qr, preview?, subtitle? }]
 */
export default function BatchResults({ results, zipPrefix = "rapids-qr-codes" }) {
  const svgHosts = useRef({}); // result id -> element wrapping its rendered QR <svg>

  const svgFor = (id) => serializeSvg(svgHosts.current[id].querySelector("svg"));

  const downloadOne = async (result, index, format) => {
    const svg = svgFor(result.id);
    const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" }) : await svgToPng(svg);
    saveBlob(blob, `${fileBase(result.name, index)}.${format}`);
  };

  const downloadZip = async (format) => {
    const files = {};
    for (const [index, result] of results.entries()) {
      const svg = svgFor(result.id);
      files[`${fileBase(result.name, index)}.${format}`] =
        format === "svg"
          ? new TextEncoder().encode(svg)
          : [new Uint8Array(await (await svgToPng(svg)).arrayBuffer()), { level: 0 }]; // PNGs are already compressed
    }
    saveBlob(new Blob([zipSync(files)], { type: "application/zip" }), `${zipPrefix}-${results.length}-${format}.zip`);
  };

  return (
    <div className="batch">
      <div className="downloads">
        <button onClick={() => downloadZip("svg")} className="btn-solid" type="button">
          ↓ ZIP · SVG <span className="btn-note">all {results.length} codes · vector</span>
        </button>
        <button onClick={() => downloadZip("png")} className="btn-outline" type="button">
          ↓ ZIP · PNG <span className="btn-note">all {results.length} codes · high-res</span>
        </button>
      </div>

      <ul className="batch-list">
        {results.map((result, index) => (
          <li key={result.id} className="batch-item">
            <div className="batch-qr" ref={(el) => { svgHosts.current[result.id] = el; }}>
              <QRCodeSVG value={result.qr} size={512} level="M" marginSize={4} title={`QR code for ${result.name}`} />
            </div>
            <div className="batch-info">
              <div className="batch-file">
                {result.preview && (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob: preview
                  <img src={result.preview} alt="" className="batch-thumb" />
                )}
                <div className="batch-text">
                  <span className="batch-name">{result.name}</span>
                  {result.subtitle && <span className="batch-subtitle">{result.subtitle}</span>}
                </div>
              </div>
              <div className="batch-buttons">
                <button type="button" className="btn-mini" onClick={() => downloadOne(result, index, "svg")}>↓ svg</button>
                <button type="button" className="btn-mini" onClick={() => downloadOne(result, index, "png")}>↓ png</button>
                {/^https?:/.test(result.qr) && (
                  <a className="btn-mini" href={result.qr} target="_blank" rel="noreferrer">open ↗</a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
