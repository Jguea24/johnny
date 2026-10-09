import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Johnny | Soluciones Tecnológicas",
  description:
    "Portafolio profesional de Johnny. Desarrollo web, soluciones tecnológicas, seguridad TI, soporte técnico y capacitación.",
  keywords: [
    "desarrollo web",
    "soluciones tecnológicas",
    "seguridad informática",
    "soporte técnico",
    "software",
    "tecnología",
  ],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}