"use client";

// Guard component for organizer-only sections.
// Redirects unauthenticated users to /login and non-organizers to /unauthorized.
// Handles legacy tokens (role="Organizer") and post-become-organizer refresh.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

function hasOrganizerAccess(role?: string, isOrganizer?: boolean): boolean {
  // New tokens: is_organizer claim or Admin role
  // Legacy tokens: role was "Organizer" before the IsOrganizer migration
  return isOrganizer === true || role === "Admin" || role === "Organizer";
}

export function OrganizerRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    if (hasOrganizerAccess(user?.role, user?.isOrganizer)) return;

    // Token may be stale (e.g. just became organizer). Try one refresh before blocking.
    if (!refreshed) {
      setRefreshed(true);
      fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
        .then((r) => { if (r.ok) return refreshUser(); })
        .catch(() => {});
      return;
    }

    router.replace("/unauthorized");
  }, [isAuthenticated, isLoading, user, router, pathname, refreshed, refreshUser]);

  if (isLoading || (!refreshed && isAuthenticated && !hasOrganizerAccess(user?.role, user?.isOrganizer))) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!isAuthenticated || !hasOrganizerAccess(user?.role, user?.isOrganizer)) return null;

  return <>{children}</>;
}
