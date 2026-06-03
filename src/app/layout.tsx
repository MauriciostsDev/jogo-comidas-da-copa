import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--ff-display",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

const vt323 = VT323({
  variable: "--ff-body",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Comidas da Copa",
  description:
    "Sorteie uma seleção da Copa 2026, invente um prato típico e cozinhe de verdade. Depois avalie os pratos da galeria com estrelas e comentários.",
};

export const viewport: Viewport = {
  themeColor: "#150a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${pressStart.variable} ${vt323.variable}`}>
      {/* Inline script sets data-theme from localStorage before first paint — no flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('cc-theme');document.documentElement.setAttribute('data-theme',t||'dark')})()`,
          }}
        />
      </head>
      <body>
        <canvas id="confetti" aria-hidden="true" />
        {children}
        <div id="toast" className="toast" role="status" aria-live="polite" />
      </body>
    </html>
  );
}
