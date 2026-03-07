"use client";

// Ticket type management for an event — CRUD via dialog
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketTypeList } from "@/components/organizer/ticket-type-list";
import { TicketTypeFormDialog, type TicketTypeFormData } from "@/components/organizer/ticket-type-form";
import { apiFetch } from "@/lib/api-client";
import type { TicketType } from "@/types/events";

export default function TicketTypesPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TicketType | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      setTicketTypes(await apiFetch<TicketType[]>(`/api/events/${eventId}/ticket-types`));
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  async function handleCreate(data: TicketTypeFormData) {
    await apiFetch(`/api/events/${eventId}/ticket-types`, {
      method: "POST",
      body: JSON.stringify({ ...data, description: data.description || "" }),
    });
    await fetchTypes();
  }

  async function handleEdit(data: TicketTypeFormData) {
    if (!editTarget) return;
    await apiFetch(`/api/events/${eventId}/ticket-types/${editTarget.id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setEditTarget(null);
    await fetchTypes();
  }

  async function handleDelete(ttId: string) {
    if (!confirm("Xóa loại vé này?")) return;
    setDeleting(ttId);
    try {
      await apiFetch(`/api/events/${eventId}/ticket-types/${ttId}`, { method: "DELETE" });
      await fetchTypes();
    } finally {
      setDeleting(null);
    }
  }

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Loại vé</h1>
        <Button onClick={() => { setEditTarget(null); setDialogOpen(true); }} className="bg-amber-600 hover:bg-amber-700">
          <PlusCircle className="size-4 mr-1.5" />Thêm loại vé
        </Button>
      </div>

      <TicketTypeList ticketTypes={ticketTypes} onEdit={(tt) => { setEditTarget(tt); setDialogOpen(true); }} onDelete={handleDelete} deleting={deleting} />

      <TicketTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={editTarget ? handleEdit : handleCreate}
        defaultValues={editTarget ? { name: editTarget.name, description: editTarget.description, price: editTarget.price, quota: editTarget.quota, maxPerUser: editTarget.maxPerUser } : undefined}
        isEdit={!!editTarget}
      />
    </div>
  );
}
