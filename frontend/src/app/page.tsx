import { Source_Serif_4, Be_Vietnam_Pro } from "next/font/google";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FooterSection } from "@/components/landing/footer-section";

const serif = Source_Serif_4({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
});

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export default function Home() {
  return (
    <div
      className={`${serif.variable} ${body.variable} min-h-screen bg-[#faf8f5]`}
      style={{ fontFamily: "var(--font-body), sans-serif" }}
    >
      <NavigationBar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FooterSection />
    </div>
  );
}
