import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/**
 * Fonts are bundled at build time rather than fetched from a CDN at runtime:
 * this product is demonstrated live, and a font that arrives late is a visible
 * reflow in front of an audience.
 *
 * Three faces, three jobs. Serif for headlines, sans for the interface, mono
 * for identifiers — a case id, a rule id, a timestamp. Keeping data in mono
 * makes what the engine produced visually separable from what it advises.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--f-display",
  display: "swap",
});

const ui = Inter({
  subsets: ["latin"],
  variable: "--f-ui",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--f-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Belong Field Operations",
  description:
    "Resident intake and a field operations back office, built on a deterministic triage engine. Case simulation — all data fictional.",
};

/**
 * Applies a stored theme choice before first paint. Without it the page renders
 * in the system scheme and then snaps to the stored one — a visible flash, and
 * this product is shown on a projector.
 */
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('belong-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
