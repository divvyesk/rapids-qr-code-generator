import { Suspense } from "react";
import Link from "next/link";
import SaveImage from "./SaveImage";

export const metadata = {
  title: "Save image · Rapids QR",
  description: "Save a shared image to your phone.",
  robots: { index: false, follow: false },
};

// Landing page for image QR codes: shows the image with a one-tap save.
// Static shell; the image itself is read from the URL on the client.
export default function SaveImagePage() {
  return (
    <div className="shell save-shell">
      <header className="topbar">
        <Link href="/" className="topbar-brand">rapids<span className="topbar-slash">/</span>qr</Link>
        <span className="topbar-meta"><span>shared image</span></span>
      </header>

      <main className="save-main">
        <Suspense fallback={<p className="idle-caption">loading image<span className="cursor" aria-hidden="true" /></p>}>
          <SaveImage />
        </Suspense>
      </main>

      <footer className="save-footer">
        <Link href="/">made with rapids qr ↗</Link>
      </footer>
    </div>
  );
}
