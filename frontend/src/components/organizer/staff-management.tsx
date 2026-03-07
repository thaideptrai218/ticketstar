"use client";

// Staff list + add form for event staff management
import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format-utils";
import type { StaffMember } from "@/types/organizer";

interface StaffManagementProps {
  eventId: string;
  staff: StaffMember[];
  onRefresh: () => void;
}

export function StaffManagement({ eventId, staff, onRefresh }: StaffManagementProps) {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await apiFetch(`/api/events/${eventId}/staff`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmail("");
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể thêm nhân viên.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Xóa nhân viên này khỏi sự kiện?")) return;
    setRemoving(userId);
    try {
      await apiFetch(`/api/events/${eventId}/staff/${userId}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add staff form */}
      <form onSubmit={handleAdd} className="flex gap-2 max-w-md">
        <Input
          type="email" placeholder="Email nhân viên"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={adding} className="bg-amber-600 hover:bg-amber-700 shrink-0">
          <UserPlus className="size-4 mr-1" />{adding ? "..." : "Thêm"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}

      {staff.length === 0 ? (
        <p className="text-sm text-stone-400 py-6 text-center">Chưa có nhân viên nào được phân công.</p>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ngày phân công</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.fullName ?? "—"}</TableCell>
                  <TableCell className="text-sm text-stone-500">{s.email}</TableCell>
                  <TableCell className="text-sm text-stone-500">{formatDate(s.assignedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled={removing === s.userId} onClick={() => handleRemove(s.userId)}>
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
