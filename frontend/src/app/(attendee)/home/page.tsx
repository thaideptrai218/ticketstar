"use client";

// Attendee home — curated event sections: trending, time-based, by category, by location
// Filter bar has been moved to /events for focused search/browse
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { TrendingEvents } from "@/components/discover/trending-events";
import { TimeFilteredEvents } from "@/components/discover/time-filtered-events";
import { CategoryBrowse } from "@/components/discover/category-browse";
import { LocationBrowse } from "@/components/discover/location-browse";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?returnUrl=%2Fhome");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="space-y-12 pb-16">
      <TrendingEvents />
      <TimeFilteredEvents />
      <CategoryBrowse />
      <LocationBrowse />
    </div>
  );
}
