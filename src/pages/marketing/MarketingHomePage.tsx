import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import HeroSection from "@/components/marketing/HeroSection";
import StatsRow from "@/components/marketing/StatsRow";
import VideoSection from "@/components/marketing/VideoSection";
import MarqueeSection from "@/components/marketing/MarqueeSection";
import PolicySection from "@/components/marketing/PolicySection";
import ProductFeatures from "@/components/marketing/ProductFeatures";
import ImpactGrid from "@/components/marketing/ImpactGrid";
import ConsultingSection from "@/components/marketing/ConsultingSection";
import PartnersSection from "@/components/marketing/PartnersSection";
import FinalCTA from "@/components/marketing/FinalCTA";

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MarketingNav />
      <main>
        <HeroSection />
        <StatsRow />
        <VideoSection />
        <MarqueeSection />
        <PolicySection />
        <ProductFeatures />
        <ImpactGrid />
        <ConsultingSection />
        <PartnersSection />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
