"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Wraps page content with a Y-axis slide-in animation on every route change.
 * Uses CSS keyframes for performance (GPU composited transform + opacity).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [animKey, setAnimKey] = useState(0);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setAnimKey((k) => k + 1);
    }
  }, [pathname]);

  return (
    <div
      key={animKey}
      style={
        animKey > 0
          ? { animation: "page-slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both" }
          : undefined
      }
    >
      {children}
    </div>
  );
}
