"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  Ticket,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Data ───────────────────────────────────────────────────────────────────

const productLinks = [
  { label: "Events", href: "/events" },
  { label: "Create Event", href: "/organizer/events/new" },
  { label: "Pricing", href: "#pricing" },
  { label: "Features", href: "#features" },
];

const companyLinks = [
  { label: "About", href: "#about" },
  { label: "Blog", href: "#blog" },
  { label: "Careers", href: "#careers" },
  { label: "Press", href: "#press" },
];

const resourcesLinks = [
  { label: "Help Center", href: "#help" },
  { label: "Documentation", href: "#docs" },
  { label: "Guides", href: "#guides" },
  { label: "API Reference", href: "#api" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "#privacy" },
  { label: "Terms of Service", href: "#terms" },
  { label: "Cookie Policy", href: "#cookies" },
  { label: "GDPR", href: "#gdpr" },
];

const socialLinks = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
];

// ─── Stagger variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function FooterSection() {
  return (
    <footer>
      {/* ── CTA Banner (light section, matches rest of landing page) ── */}
      <div className="border-t border-stone-200/60 bg-[#faf8f5] py-24 sm:py-28">
        <motion.div
          className="mx-auto max-w-2xl px-6 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <h2
            className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sẵn sàng tổ chức sự kiện tiếp theo?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-stone-500">
            Tham gia cùng các nhà tổ chức tin tưởng TicketStar để mang đến những trải nghiệm khó quên.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="bg-amber-700 text-white hover:bg-amber-800 shadow-md" asChild>
              <Link href="/register">
                Bắt đầu miễn phí
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-stone-300 text-stone-700 hover:bg-stone-100" asChild>
              <Link href="/events">Khám phá sự kiện</Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* ── Main footer body — dark ── */}
      <div className="bg-[#1a1d2d] text-white/60">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <motion.div
            className="grid gap-12 lg:grid-cols-[auto_1fr_auto]"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {/* Left: Logo */}
            <motion.div variants={itemVariants} className="lg:w-48">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-600 text-white">
                  <Ticket className="size-5" strokeWidth={2.5} />
                </div>
                <span
                  className="text-xl font-bold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  TicketStar
                </span>
              </Link>
            </motion.div>

            {/* Center: Link columns */}
            <motion.div
              variants={itemVariants}
              className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
            >
              {/* Product */}
              <div>
                <p className="mb-4 text-sm font-semibold text-white">
                  Product
                </p>
                <ul className="space-y-3">
                  {productLinks.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm leading-snug transition-colors hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <p className="mb-4 text-sm font-semibold text-white">
                  Company
                </p>
                <ul className="space-y-3">
                  {companyLinks.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm leading-snug transition-colors hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <p className="mb-4 text-sm font-semibold text-white">
                  Resources
                </p>
                <ul className="space-y-3">
                  {resourcesLinks.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm leading-snug transition-colors hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <p className="mb-4 text-sm font-semibold text-white">
                  Legal
                </p>
                <ul className="space-y-3">
                  {legalLinks.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm leading-snug transition-colors hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Right: Social icons */}
            <motion.div variants={itemVariants} className="flex lg:w-48 lg:justify-end">
              <div className="flex items-center gap-2">
                {socialLinks.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="flex size-10 items-center justify-center rounded-lg bg-white/[0.06] text-white/60 transition-all hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="size-5" strokeWidth={1.5} />
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex flex-col gap-3 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
              <p>© 2026 TicketStar. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                <Link href="#" className="hover:text-white transition-colors">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
