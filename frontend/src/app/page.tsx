import { NavigationBar } from "@/components/landing/navigation-bar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturedEventsSection } from "@/components/landing/featured-events-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FooterSection } from "@/components/landing/footer-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <NavigationBar />
      <HeroSection />
      <FeaturedEventsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FooterSection />
    </div>
  );
}
