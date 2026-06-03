import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Serifa editorial, calorosa e cheia de caráter — para títulos e nomes de pratos.
const fraunces = Fraunces({
  variable: "--ff-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

// Sans limpa para o corpo / interface.
const geist = Geist({
  variable: "--ff-body",
  subsets: ["latin"],
  display: "swap",
});

// Mono para números (cronômetro, notas).
const geistMono = Geist_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Comidas da Copa",
  description:
    "Sorteie uma seleção da Copa 2026, invente um prato típico e cozinhe de verdade. Depois avalie os pratos da galeria com estrelas e comentários.",
};

export const viewport: Viewport = {
  themeColor: "#17110b",
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
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
