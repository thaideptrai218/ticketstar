"use client";

// Admin user management page
import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersTable } from "@/components/admin/users-table";
import { apiFetch } from "@/lib/api-client";
import type { AdminUser, AdminUsersResponse } from "@/types/organizer";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<AdminUsersResponse>(`/api/admin/users?page=${page}&pageSize=${pageSize}`);
      setUsers(data.items);
      setTotal(data.total);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Quản lý người dùng</h1>
      <UsersTable
        users={users}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={fetchUsers}
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
