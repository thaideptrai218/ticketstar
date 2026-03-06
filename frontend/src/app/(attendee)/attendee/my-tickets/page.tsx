"use client";

// My Tickets page — lists all tickets owned by the current attendee
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketCard } from "@/components/tickets/ticket-card";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { MyTicket } from "@/types/tickets";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<MyTicket[]>("/api/tickets");
      setTickets(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tải danh sách vé.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Vé của tôi</h1>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!isLoading && !error && tickets.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="size-16 rounded-full bg-stone-100 flex items-center justify-center">
            <TicketIcon className="size-7 text-stone-400" />
          </div>
          <div>
            <p className="text-base font-medium text-stone-700">Bạn chưa có vé nào</p>
            <p className="text-sm text-stone-400 mt-1">Khám phá sự kiện và đặt vé ngay</p>
          </div>
          <Button variant="outline" className="mt-2 border-amber-200 text-amber-700 hover:bg-amber-50" asChild>
            <Link href="/events">Khám phá sự kiện</Link>
          </Button>
        </div>
      )}

      {!isLoading && !error && tickets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onTransferSuccess={fetchTickets}
            />
          ))}
        </div>
      )}
    </div>
  );
}
