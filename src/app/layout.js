import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Display face for headings (Magical Night by Viswell Studio)
const magicalNight = localFont({
  src: "./fonts/MagicalNight-Regular.otf",
  variable: "--font-display",
  display: "swap",
});

// Monospace for the interface & ASCII art
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata = {
  title: "Rapids QR Generator",
  description: "Generate offline, static QR codes for website links and vCard contact cards.",
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${magicalNight.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
