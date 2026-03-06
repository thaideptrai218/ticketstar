"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { EventDetail } from "@/types/events";
import type { CreateOrderRequest } from "@/types/orders";
import { TicketTypeSelector, type TicketSelection } from "@/components/events/ticket-type-selector";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PaymentStatus } from "@/components/checkout/payment-status";
import { useCheckout } from "@/hooks/use-checkout";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  const itemsParam = searchParams.get("items") ?? "";

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [selection, setSelection] = useState<TicketSelection>({});
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  const { step, paymentState, error, placeOrder, reset } = useCheckout();

  // Parse initial selection from URL params (format: "typeId:qty,typeId:qty")
  useEffect(() => {
    if (!itemsParam) return;
    const parsed: TicketSelection = {};
    for (const pair of itemsParam.split(",")) {
      const [id, qtyStr] = pair.split(":");
      const qty = Number(qtyStr);
      if (id && Number.isFinite(qty) && qty > 0) parsed[id] = qty;
    }
    setSelection(parsed);
  }, [itemsParam]);

  // Fetch event details for ticket type info
  useEffect(() => {
    if (!eventId) return;
    setIsLoadingEvent(true);
    apiFetch<EventDetail>(`/api/events/${eventId}`)
      .then(setEvent)
      .catch(() => toast.error("Khong the tai thong tin su kien"))
      .finally(() => setIsLoadingEvent(false));
  }, [eventId]);

  // Handle order placement
  const handleConfirm = async () => {
    const items = Object.entries(selection)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    if (items.length === 0) {
      toast.error("Vui long chon it nhat mot ve");
      return;
    }

    const request: CreateOrderRequest = { eventId, items };
    await placeOrder(request);
  };

  // Show error toast
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  if (isLoadingEvent) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-16 text-center text-stone-500">Khong tim thay su kien</div>
    );
  }

  // Payment processing / result
  if ((step === "processing" || step === "done") && paymentState) {
    return (
      <div className="mx-auto max-w-lg">
        <PaymentStatus
          state={paymentState}
          eventSlug={event.slug}
        />
      </div>
    );
  }

  // Confirming step
  return (
    <div className="mx-auto max-w-2xl">
      <h1
        className="text-2xl font-bold text-stone-900 mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Dat ve — {event.title}
      </h1>
      <p className="text-sm text-stone-500 mb-8">Xac nhan thong tin ve truoc khi thanh toan</p>

      {/* Allow editing selection */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-stone-700 mb-3">Loai ve</h3>
        <TicketTypeSelector
          ticketTypes={event.ticketTypes}
          selection={selection}
          onSelectionChange={setSelection}
        />
      </div>

      <CheckoutForm
        ticketTypes={event.ticketTypes}
        selection={selection}
        isSubmitting={false}
        onConfirm={handleConfirm}
        onBack={() => window.history.back()}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
