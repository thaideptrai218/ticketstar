"use client";

// Admin users table with search, pagination, and lock/unlock actions
import { useState } from "react";
import { Lock, Unlock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format-utils";
import type { AdminUser } from "@/types/organizer";

const ROLE_MAP: Record<string, string> = {
  Admin: "Quản trị",
  Organizer: "Ban tổ chức",
  Staff: "Nhân viên",
  User: "Người dùng",
};

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

  const filtered = searchQuery
    ? users.filter((u) => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
        <Input
          placeholder="Tìm theo email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell><Badge variant="secondary">{ROLE_MAP[u.role] ?? u.role}</Badge></TableCell>
                <TableCell>
                  <Badge className={u.isLocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}>
                    {u.isLocked ? "Đã khóa" : "Hoạt động"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-stone-500">{formatDate(u.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost" size="sm"
                    disabled={toggling === u.id}
                    onClick={() => toggleLock(u.id, u.isLocked)}
                  >
                    {u.isLocked ? <><Unlock className="size-4 mr-1" />Mở khóa</> : <><Lock className="size-4 mr-1" />Khóa</>}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-stone-400 py-8">Không tìm thấy người dùng.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trước</Button>
          <span className="text-sm text-stone-500">Trang {page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
