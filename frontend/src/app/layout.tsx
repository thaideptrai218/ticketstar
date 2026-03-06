import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { PageTransition } from "@/components/ui/page-transition";
import "./globals.css";

const serif = Source_Serif_4({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
});

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TicketStar — Nền tảng bán vé sự kiện",
  description:
    "Nền tảng bán vé sự kiện toàn diện. Tạo sự kiện, bán vé với VietQR, và quản lý check-in dễ dàng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${serif.variable} ${body.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-body), sans-serif" }}
        suppressHydrationWarning
      >
        <AppProviders>
          <PageTransition>{children}</PageTransition>
        </AppProviders>
      </body>
    </html>
  );
}
