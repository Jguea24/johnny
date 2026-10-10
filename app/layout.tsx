import type { Metadata } from "next";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import type { Viewport } from "next";
import { getPublicSiteSettings } from "@/lib/site-settings";
import PwaControls from "@/components/pwa/PwaControls";
import WhatsAppButton from "@/components/contact/WhatsAppButton";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#22d3ee",
};

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
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    appleWebApp: {
      capable: true,
      title: "Johnny",
      statusBarStyle: "black-translucent",
    },
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
      <body className="min-h-screen">
        {children}
        <PwaControls />
        <Suspense fallback={null}>
          <WhatsAppButton />
        </Suspense>
      </body>
    </html>
  );
}