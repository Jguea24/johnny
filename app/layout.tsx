import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { getPublicSiteSettings } from "@/lib/site-settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return {
    title: {
      default: `${settings.title} | Soluciones Tecnológicas`,
      template: `%s | ${settings.title}`,
    },
    description: settings.description,
    keywords: [
      "desarrollo web",
      "soluciones tecnológicas",
      "seguridad informática",
      "soporte técnico",
      "software",
      "tecnología",
    ],
  };
}

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