"use client";

// Ticket types table with edit/delete actions
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/format-utils";
import type { TicketType } from "@/types/events";

interface TicketTypeListProps {
  ticketTypes: TicketType[];
  onEdit: (tt: TicketType) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
}

export function TicketTypeList({ ticketTypes, onEdit, onDelete, deleting }: TicketTypeListProps) {
  if (ticketTypes.length === 0) {
    return <p className="text-sm text-stone-400 py-8 text-center">Chưa có loại vé nào.</p>;
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Giá</TableHead>
            <TableHead>Đã bán</TableHead>
            <TableHead>Còn lại</TableHead>
            <TableHead>Tối đa/người</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ticketTypes.map((tt) => (
            <TableRow key={tt.id}>
              <TableCell className="font-medium">{tt.name}</TableCell>
              <TableCell>{formatPrice(tt.price)}</TableCell>
              <TableCell>{tt.soldCount}</TableCell>
              <TableCell>{tt.availableCount}</TableCell>
              <TableCell>{tt.maxPerUser}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(tt)} title="Sửa">
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  disabled={tt.soldCount > 0 || deleting === tt.id}
                  onClick={() => onDelete(tt.id)}
                  title={tt.soldCount > 0 ? "Không thể xóa vé đã bán" : "Xóa"}
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
