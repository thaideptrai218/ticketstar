"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { CreateOrderRequest, Order, OrderDetail } from "@/types/orders";
import type { PaymentState } from "@/components/checkout/payment-status";

type CheckoutStep = "confirming" | "processing" | "done";

interface UseCheckoutReturn {
  step: CheckoutStep;
  paymentState: PaymentState | null;
  order: OrderDetail | null;
  error: string | null;
  placeOrder: (request: CreateOrderRequest) => Promise<void>;
  reset: () => void;
}

const POLL_INTERVAL = 2000;
const MAX_POLLS = 60; // 2 minutes max

export function useCheckout(): UseCheckoutReturn {
  const [step, setStep] = useState<CheckoutStep>("confirming");
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const cancelledRef = useRef(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const startPolling = useCallback(
    (orderId: string) => {
      setStep("processing");
      setPaymentState("processing");
      pollCountRef.current = 0;
      cancelledRef.current = false;

      const poll = async () => {
        if (cancelledRef.current) return;
        pollCountRef.current++;

        if (pollCountRef.current >= MAX_POLLS) {
          stopPolling();
          setPaymentState("expired");
          setStep("done");
          return;
        }

        try {
          const detail = await apiFetch<OrderDetail>(`/api/orders/${orderId}`);
          if (cancelledRef.current) return;
          const status = detail.status.toLowerCase();

          if (status === "paid" || status === "completed") {
            stopPolling();
            setOrder(detail);
            setPaymentState("success");
            setStep("done");
            return;
          } else if (status === "cancelled" || status === "expired") {
            stopPolling();
            setPaymentState("expired");
            setStep("done");
            return;
          } else if (status === "refunded" || status === "failed") {
            stopPolling();
            setPaymentState("failed");
            setStep("done");
            return;
          }
        } catch {
          // Ignore transient errors during polling
        }

        // Schedule next poll after current completes (no overlap)
        if (!cancelledRef.current) {
          pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL);
        }
      };

      pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL);
    },
    [stopPolling],
  );

  const placeOrder = useCallback(
    async (request: CreateOrderRequest) => {
      setError(null);
      try {
        const created = await apiFetch<Order>("/api/orders", {
          method: "POST",
          body: JSON.stringify(request),
        });
        startPolling(created.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setError("Ve da het. Vui long chon loai ve khac.");
        } else {
          setError(err instanceof Error ? err.message : "Dat ve that bai");
        }
      }
    },
    [startPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    setStep("confirming");
    setPaymentState(null);
    setOrder(null);
    setError(null);
  }, [stopPolling]);

  return { step, paymentState, order, error, placeOrder, reset };
}
