"use client";

// Admin users table with search, role filter, pagination, and lock/unlock actions
import { useState } from "react";
import { Lock, Unlock, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format-utils";
import type { AdminUser } from "@/types/organizer";

const ROLE_MAP: Record<string, { label: string; className: string }> = {
  Admin: { label: "Quản trị", className: "bg-red-100 text-red-700" },
  Organizer: { label: "Ban tổ chức", className: "bg-purple-100 text-purple-700" },
  Staff: { label: "Nhân viên", className: "bg-blue-100 text-blue-700" },
  User: { label: "Người dùng", className: "bg-stone-100 text-stone-600" },
};

const ALL_ROLES = Object.keys(ROLE_MAP);

interface UsersTableProps {
  users: AdminUser[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function UsersTable({ users, searchQuery, onSearchChange, onRefresh, page, total, pageSize, onPageChange }: UsersTableProps) {
  const [toggling, setToggling] = useState<string | null>(null);
  // Selected roles to show; empty = show all
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const totalPages = Math.ceil(total / pageSize);

  async function toggleLock(userId: string, isLocked: boolean) {
    if (!confirm(isLocked ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?")) return;
    setToggling(userId);
    try {
      await apiFetch(`/api/admin/users/${userId}/${isLocked ? "unlock" : "lock"}`, { method: "POST" });
      onRefresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Lỗi thay đổi trạng thái.");
    } finally {
      setToggling(null);
    }
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  const filtered = users.filter((u) => {
    const matchesSearch = !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(u.role);
    return matchesSearch && matchesRole;
  });

  const filterLabel =
    selectedRoles.length === 0
      ? "Tất cả vai trò"
      : selectedRoles.length === 1
        ? (ROLE_MAP[selectedRoles[0]]?.label ?? selectedRoles[0])
        : `${selectedRoles.length} vai trò`;

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
          <Input
            placeholder="Tìm theo email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              {filterLabel}
              <ChevronDown className="size-3.5 text-stone-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {ALL_ROLES.map((role) => (
              <DropdownMenuCheckboxItem
                key={role}
                checked={selectedRoles.includes(role)}
                onCheckedChange={() => toggleRole(role)}
              >
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${ROLE_MAP[role]?.className}`}>
                  {ROLE_MAP[role]?.label}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear filter */}
        {selectedRoles.length > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-stone-400 hover:text-stone-600" onClick={() => setSelectedRoles([])}>
            Xóa lọc
          </Button>
        )}

        <span className="ml-auto text-xs text-stone-400">{filtered.length} / {total} người dùng</span>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50">
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const roleInfo = ROLE_MAP[u.role];
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-stone-800">{u.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${roleInfo?.className ?? "bg-stone-100 text-stone-600"}`}>
                      {roleInfo?.label ?? u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={u.isLocked ? "bg-red-100 text-red-600 hover:bg-red-100" : "bg-green-100 text-green-700 hover:bg-green-100"}>
                      {u.isLocked ? "Đã khóa" : "Hoạt động"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-stone-500">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost" size="sm"
                      disabled={toggling === u.id}
                      onClick={() => toggleLock(u.id, u.isLocked)}
                      className="text-stone-500 hover:text-stone-800"
                    >
                      {u.isLocked
                        ? <><Unlock className="size-3.5 mr-1" />Mở khóa</>
                        : <><Lock className="size-3.5 mr-1" />Khóa</>
                      }
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-stone-400 py-10">
                  Không tìm thấy người dùng.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trước</Button>
          <span className="text-sm text-stone-500">Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
