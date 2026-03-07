"use client";

// Staff management page for an event
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffManagement } from "@/components/organizer/staff-management";
import { apiFetch } from "@/lib/api-client";
import type { StaffMember } from "@/types/organizer";

export default function EventStaffPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      setStaff(await apiFetch<StaffMember[]>(`/api/events/${eventId}/staff`));
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Quản lý nhân viên</h1>
      <StaffManagement eventId={eventId} staff={staff} onRefresh={fetchStaff} />
    </div>
  );
}
