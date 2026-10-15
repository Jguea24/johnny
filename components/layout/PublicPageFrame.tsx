import type { ReactNode } from "react";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import type { PublicSiteSettings } from "@/lib/site-settings";

export default function PublicPageFrame({
  children,
  settings,
}: {
  children: ReactNode;
  settings: PublicSiteSettings;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar siteTitle={settings.title} />
      {children}
      <Footer settings={settings} />
    </div>
  );
}
