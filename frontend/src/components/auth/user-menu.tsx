"use client";

import { LayoutDashboard, LogOut, Settings, Shield, ShoppingBag, Ticket, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";

const ROLE_LABELS: Record<string, string> = {
  Admin: "Quản trị",
  Organizer: "Ban tổ chức",
  Staff: "Nhân viên",
  User: "Khán giả",
  Attendee: "Khán giả",
};

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const initials = user.email.slice(0, 2).toUpperCase();
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  const handleLogout = async () => {
    await logout();
    toast.success("Đã đăng xuất");
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-2 ring-transparent hover:ring-amber-200 transition-all duration-200 focus-visible:ring-amber-300">
        <Avatar className="size-8 cursor-pointer">
          <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="pb-1">
          <p className="truncate text-sm font-medium text-stone-900">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 text-xs"
            >
              {roleLabel}
            </Badge>
            {user.isOrganizer && (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs"
              >
                Ban tổ chức
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {user.isOrganizer && (
          <DropdownMenuItem asChild>
            <Link href="/organizer/dashboard" className="cursor-pointer">
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Quản lý sự kiện
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href="/attendee/my-tickets" className="cursor-pointer">
            <Ticket className="size-4" aria-hidden="true" />
            Vé của tôi
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/attendee/orders" className="cursor-pointer">
            <ShoppingBag className="size-4" aria-hidden="true" />
            Đơn hàng
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings/security" className="cursor-pointer">
            <Shield className="size-4" aria-hidden="true" />
            Bảo mật
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="size-4" aria-hidden="true" />
            Cài đặt
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
