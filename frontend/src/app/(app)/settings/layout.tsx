"use client";

// Settings section layout — sidebar nav + content area
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield } from "lucide-react";

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Thông tin cá nhân", icon: User },
  { href: "/settings/security", label: "Bảo mật", icon: Shield },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Cài đặt tài khoản</h1>
        <p className="mt-1 text-sm text-stone-500">Quản lý thông tin và bảo mật tài khoản của bạn</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-48 shrink-0">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
