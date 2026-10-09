import type { Metadata } from "next";
import Navbar from "@/components/navbar/Navbar";
import Contact from "@/components/contact/Contact";
import Footer from "@/components/footer/Footer";
import { getPublicSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escribe para conversar sobre tu proyecto o necesidad tecnológica.",
};

export default async function ContactPage() {
  const settings = await getPublicSiteSettings();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar siteTitle={settings.title} />
      <div className="h-20" />
      <Contact settings={settings} />
      <Footer settings={settings} />
    </main>
  );
}
