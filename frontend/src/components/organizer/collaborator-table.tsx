"use client";

// Collaborator table with permission editing and removal actions
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUpdateCollaboratorPermission, useRemoveCollaborator } from "@/hooks/use-collaborators";
import { formatDate } from "@/lib/format-utils";
import type { Collaborator, CollaboratorPermissionLevel } from "@/types/organizer";

const STATUS_LABELS: Record<string, string> = {
  Pending: "Chờ xác nhận",
  Accepted: "Đã tham gia",
  Declined: "Đã từ chối",
  Revoked: "Đã thu hồi",
};

const STATUS_VARIANTS: Record<string, string> = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Accepted: "bg-green-50 text-green-700 border-green-200",
  Declined: "bg-stone-50 text-stone-500 border-stone-200",
  Revoked: "bg-red-50 text-red-600 border-red-200",
};

const PERMISSION_OPTIONS: CollaboratorPermissionLevel[] = ["Viewer", "Operator", "Manager"];

interface CollaboratorTableProps {
  eventId: string;
  collaborators: Collaborator[];
}

export function CollaboratorTable({ eventId, collaborators }: CollaboratorTableProps) {
  const updatePermission = useUpdateCollaboratorPermission(eventId);
  const removeCollaborator = useRemoveCollaborator(eventId);

  function handlePermissionChange(collaboratorId: string, permissionLevel: CollaboratorPermissionLevel) {
    updatePermission.mutate({ collaboratorId, data: { permissionLevel } });
  }

  function handleRemove(collaboratorId: string) {
    if (!confirm("Xóa cộng tác viên này khỏi sự kiện?")) return;
    removeCollaborator.mutate(collaboratorId);
  }

  if (collaborators.length === 0) {
    return (
      <p className="text-sm text-stone-400 py-8 text-center">
        Chưa có cộng tác viên nào. Mời người dùng tham gia cộng tác.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Quyền hạn</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ngày mời</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collaborators.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.fullName ?? "—"}</TableCell>
              <TableCell className="text-sm text-stone-500">{c.email}</TableCell>
              <TableCell>
                <Select
                  value={c.permissionLevel}
                  onValueChange={(v) => handlePermissionChange(c.id, v as CollaboratorPermissionLevel)}
                  disabled={c.status === "Revoked" || c.status === "Declined"}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${STATUS_VARIANTS[c.status] ?? ""}`}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-stone-500">{formatDate(c.invitedAt)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost" size="icon"
                  disabled={removeCollaborator.isPending}
                  onClick={() => handleRemove(c.id)}
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
