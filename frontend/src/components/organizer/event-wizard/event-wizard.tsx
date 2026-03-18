"use client";

// Main 4-step event creation/edit wizard container
// Manages all wizard state locally and submits in one API call at the end
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { WizardStepper } from "./wizard-stepper";
import { Step1EventInfo } from "./step-1-event-info";
import { Step2TimeTickets } from "./step-2-time-tickets";
import { Step3Settings } from "./step-3-settings";
import { Step4Payment } from "./step-4-payment";
import type { TicketTypeFormItem } from "./ticket-type-modal";
import type { EventDetail } from "@/types/events";

export interface WizardState {
  // Step 1
  organizerIdOverride: string | null; // admin only: create on behalf of organizer
  organizerProfileId: string | null;  // selected organizer profile (for multi-org support)
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  title: string;
  slug: string;
  category: string;
  isOnline: boolean;
  venue: string;
  city: string;
  onlineUrl: string;
  description: string;
  // Step 2
  startAt: string;
  endAt: string;
  ticketTypes: TicketTypeFormItem[];
  // Step 3
  maxTicketsPerOrder: number | null;
  refundPolicy: string;
  contentWarning: string;
  // Step 4
  paymentTerms: string;
}

const DEFAULT_STATE: WizardState = {
  organizerIdOverride: null,
  organizerProfileId: null,
  coverImageUrl: null,
  bannerImageUrl: null,
  title: "",
  slug: "",
  category: "",
  isOnline: false,
  venue: "",
  city: "",
  onlineUrl: "",
  description: "",
  startAt: "",
  endAt: "",
  ticketTypes: [],
  maxTicketsPerOrder: null,
  refundPolicy: "",
  contentWarning: "",
  paymentTerms: "",
};

function eventDetailToWizardState(ev: EventDetail): WizardState {
  return {
    organizerIdOverride: null,
    organizerProfileId: null,
    coverImageUrl: ev.imageUrl ?? null,
    bannerImageUrl: ev.bannerImageUrl ?? null,
    title: ev.title,
    slug: ev.slug,
    category: ev.category ?? "",
    isOnline: ev.isOnline ?? false,
    venue: ev.venue ?? "",
    city: "",
    onlineUrl: "",
    description: ev.description ?? "",
    startAt: ev.startAt ? ev.startAt.slice(0, 16) : "",
    endAt: ev.endAt ? ev.endAt.slice(0, 16) : "",
    ticketTypes: (ev.ticketTypes ?? []).map((tt) => ({
      id: crypto.randomUUID(),
      serverId: tt.id,
      name: tt.name,
      description: tt.description ?? "",
      price: tt.price,
      quota: tt.quota,
      maxPerUser: tt.maxPerUser,
      saleStartAt: tt.saleStartAt ? tt.saleStartAt.slice(0, 16) : "",
      saleEndAt: tt.saleEndAt ? tt.saleEndAt.slice(0, 16) : "",
    })),
    maxTicketsPerOrder: ev.maxTicketsPerOrder ?? null,
    refundPolicy: ev.refundPolicy ?? "",
    contentWarning: ev.contentWarning ?? "",
    paymentTerms: ev.paymentTerms ?? "",
  };
}

interface EventWizardProps {
  mode: "create" | "edit";
  initialData?: EventDetail;
}

export function EventWizard({ mode, initialData }: EventWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [state, setState] = useState<WizardState>(
    initialData ? eventDetailToWizardState(initialData) : DEFAULT_STATE
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(partial: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...(state.organizerIdOverride ? { organizerIdOverride: state.organizerIdOverride } : {}),
        title: state.title,
        description: state.description || null,
        startAt: new Date(state.startAt).toISOString(),
        endAt: new Date(state.endAt).toISOString(),
        venue: state.isOnline ? null : (state.venue || null),
        category: state.category || null,
        imageUrl: state.coverImageUrl || null,
        bannerImageUrl: state.bannerImageUrl || null,
        isOnline: state.isOnline,
        maxTicketsPerOrder: state.maxTicketsPerOrder,
        refundPolicy: state.refundPolicy || null,
        contentWarning: state.contentWarning || null,
        paymentTerms: state.paymentTerms || null,
        ...(mode === "create" ? { slug: state.slug } : {}),
        ticketTypes: state.ticketTypes.map((tt) => ({
          name: tt.name,
          description: tt.description || null,
          price: tt.price,
          quota: tt.quota,
          maxPerUser: tt.maxPerUser,
          saleStartAt: tt.saleStartAt ? new Date(tt.saleStartAt).toISOString() : null,
          saleEndAt: tt.saleEndAt ? new Date(tt.saleEndAt).toISOString() : null,
        })),
      };

      if (mode === "create") {
        await apiFetch("/api/events", { method: "POST", body: JSON.stringify(payload) });
        router.push("/organizer/events");
      } else {
        await apiFetch(`/api/events/${initialData!.id}`, { method: "PUT", body: JSON.stringify(payload) });
        router.push("/organizer/events");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  }

  const stepProps = { data: state, onChange: update };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <WizardStepper
        currentStep={step}
        onStepClick={(s) => setStep(s as 1 | 2 | 3 | 4)}
      />

      <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-sm">
        {step === 1 && (
          <Step1EventInfo
            {...stepProps}
            onNext={() => setStep(2)}
            isCreateMode={mode === "create"}
            isAdmin={isAdmin}
          />
        )}
        {step === 2 && (
          <Step2TimeTickets
            {...stepProps}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3Settings
            {...stepProps}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4Payment
            {...stepProps}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isCreateMode={mode === "create"}
          />
        )}

        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
