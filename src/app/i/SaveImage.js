"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

// The page only ever shows files from a Vercel Blob public store, under images/,
// so it can't be used to display arbitrary URLs under this domain.
const STORE_RE = /^[a-z0-9]+$/;
const PATH_RE = /^images\/[A-Za-z0-9._-]+$/;

const detectPlatform = () => {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
};

// The device never changes, so there is nothing to subscribe to
const noSubscribe = () => () => {};

const BUTTON_LABEL = { ios: "Save to Photos", android: "Save to Gallery", desktop: "Download image" };

export default function SaveImage() {
  const params = useSearchParams();
  const store = params.get("s") || "";
  const path = params.get("p") || "";
  const valid = STORE_RE.test(store) && PATH_RE.test(path);
  const imageUrl = valid ? `https://${store}.public.blob.vercel-storage.com/${path}` : "";
  const downloadUrl = imageUrl && `${imageUrl}?download=1`; // Blob serves this as an attachment
  const fileName = path.split("/").pop();

  const platform = useSyncExternalStore(noSubscribe, detectPlatform, () => null);
  const [status, setStatus] = useState("");
  const fileRef = useRef(null); // prefetched so the iOS share sheet can open inside the tap
  const autoDownloadedRef = useRef(false);

  const startDownload = () => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    if (!valid) return;

    if (platform === "android" && !autoDownloadedRef.current) {
      // Android saves downloads to a folder the gallery shows, so start right away
      autoDownloadedRef.current = true;
      startDownload();
    }

    if (platform === "ios") {
      fetch(imageUrl)
        .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(res.statusText))))
        .then((blob) => { fileRef.current = new File([blob], fileName, { type: blob.type }); })
        .catch(() => { fileRef.current = null; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per image & device
  }, [imageUrl, platform]);

  const handleSave = async () => {
    const file = fileRef.current;
    if (platform === "ios" && file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        setStatus("");
      } catch (err) {
        if (err.name !== "AbortError") startDownload();
      }
      return;
    }
    startDownload();
    if (platform === "ios") setStatus("Saved to Files. Open it there and tap Share → Save Image to add it to Photos.");
  };

  if (!valid) {
    return (
      <div className="save-empty">
        <h1 className="save-title">Image not found</h1>
        <p className="hint">This link doesn&apos;t point to a Rapids QR image. Check the QR code and try again.</p>
      </div>
    );
  }

  return (
    <div className="save-card">
      <div className="save-frame">
        <span className="qr-corner tl" aria-hidden="true">┌</span>
        <span className="qr-corner tr" aria-hidden="true">┐</span>
        <span className="qr-corner bl" aria-hidden="true">└</span>
        <span className="qr-corner br" aria-hidden="true">┘</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-quality original, shown as-is */}
        <img src={imageUrl} alt="Shared image" className="save-image" />
      </div>

      <button type="button" className="btn-generate save-button" onClick={handleSave}>
        <span className="btn-generate-label">{BUTTON_LABEL[platform] || BUTTON_LABEL.desktop}</span>
        <span className="btn-generate-kbd">[ ↓ ]</span>
      </button>

      <p className="hint save-hint" aria-live="polite">
        {status || {
          ios: "Tap the button, then choose “Save Image” to add it to Photos.",
          android: "Downloading… it will appear in your gallery. Tap the button if it didn't start.",
        }[platform] || "Full-quality original."}
      </p>
    </div>
  );
}
