import { Suspense } from "react";
import Navbar from "@/components/navbar/Navbar";
import Hero from "@/components/hero/Hero";
import About from "@/components/about/About";
import PortfolioContent, {
  PortfolioContentLoading,
} from "@/components/portfolio/PortfolioContent";
import Contact from "@/components/contact/Contact";
import Footer from "@/components/footer/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Hero />
      <About />
      <Suspense fallback={<PortfolioContentLoading />}>
        <PortfolioContent />
      </Suspense>
      <Contact />
      <Footer />
    </main>
  );
}