"use client";

// Collaborator management page for an event
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { CollaboratorTable } from "@/components/organizer/collaborator-table";
import { CollaboratorInviteDialog } from "@/components/organizer/collaborator-invite-dialog";
import { useEventCollaborators } from "@/hooks/use-collaborators";

export default function EventCollaboratorsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: collaborators, isLoading } = useEventCollaborators(eventId);

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Quản lý cộng tác viên</h1>
        <CollaboratorInviteDialog eventId={eventId} />
      </div>
      <CollaboratorTable eventId={eventId} collaborators={collaborators ?? []} />
    </div>
  );
}
