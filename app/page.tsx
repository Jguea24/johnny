import { Suspense } from "react";
import Navbar from "@/components/navbar/Navbar";
import Hero from "@/components/hero/Hero";
import { getPublicHeroCarousel } from "@/lib/hero-carousel";
import About from "@/components/about/About";
import PortfolioContent, {
  PortfolioContentLoading,
} from "@/components/portfolio/PortfolioContent";
import Contact from "@/components/contact/Contact";
import Footer from "@/components/footer/Footer";
import { getPublicSiteSettings } from "@/lib/site-settings";

async function PublicHero() {
  const carousel = await getPublicHeroCarousel();
  return <Hero carousel={carousel} />;
}

export default async function Home() {
  const settings = await getPublicSiteSettings();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar siteTitle={settings.title} />
      <Suspense fallback={<Hero />}>
        <PublicHero />
      </Suspense>
      <About />
      <Suspense fallback={<PortfolioContentLoading />}>
        <PortfolioContent />
      </Suspense>
      <Contact settings={settings} />
      <Footer settings={settings} />
    </main>
  );
}