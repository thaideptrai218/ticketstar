"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

// Decorative SVG ticket pattern for right panel
function TicketPattern() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.07]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="ticket-grid"
          x="0"
          y="0"
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          <rect
            x="8"
            y="8"
            width="64"
            height="40"
            rx="8"
            fill="none"
            stroke="#92400e"
            strokeWidth="1.5"
          />
          <circle cx="8" cy="28" r="5" fill="#92400e" />
          <circle cx="72" cy="28" r="5" fill="#92400e" />
          <line
            x1="20"
            y1="20"
            x2="60"
            y2="20"
            stroke="#92400e"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="20"
            y1="28"
            x2="60"
            y2="28"
            stroke="#92400e"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1="20"
            y1="36"
            x2="45"
            y2="36"
            stroke="#92400e"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ticket-grid)" />
    </svg>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Respect returnUrl (read from window to avoid useSearchParams Suspense requirement)
      const params = new URLSearchParams(window.location.search);
      const rawReturnUrl = params.get("returnUrl");
      const destination =
        rawReturnUrl?.startsWith("/") && !rawReturnUrl.startsWith("//")
          ? rawReturnUrl
          : "/home";
      router.replace(destination);
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't flash auth page to authenticated users
  if (!isLoading && isAuthenticated) return null;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: Form panel */}
      <div className="flex flex-col px-6 py-8">
        {/* Back to landing */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Trang chủ
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>

      {/* Right: Visual panel (hidden on mobile) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 lg:flex lg:items-center lg:justify-center">
        <TicketPattern />
        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-amber-700/10">
            <svg
              className="size-8 text-amber-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
              />
            </svg>
          </div>
          <h2
            className="text-3xl font-semibold tracking-tight text-amber-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Khám phá sự kiện tuyệt vời
          </h2>
          <p className="mt-4 leading-relaxed text-amber-800/70">
            Mua vé nhanh chóng, an toàn với VietQR. Hàng ngàn sự kiện đang chờ
            bạn khám phá.
          </p>
          <div className="mt-8 flex justify-center gap-6 text-sm text-amber-700/60">
            <div className="text-center">
              <div className="text-2xl font-semibold text-amber-800">500+</div>
              <div>Sự kiện</div>
            </div>
            <div className="h-10 w-px bg-amber-200" />
            <div className="text-center">
              <div className="text-2xl font-semibold text-amber-800">50k+</div>
              <div>Người dùng</div>
            </div>
            <div className="h-10 w-px bg-amber-200" />
            <div className="text-center">
              <div className="text-2xl font-semibold text-amber-800">99%</div>
              <div>Hài lòng</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
