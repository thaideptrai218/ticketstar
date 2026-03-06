"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format-utils";
import type { TicketType } from "@/types/events";

interface TicketSelection {
  [ticketTypeId: string]: number;
}

interface TicketTypeSelectorProps {
  ticketTypes: TicketType[];
  selection: TicketSelection;
  onSelectionChange: (selection: TicketSelection) => void;
}

export function TicketTypeSelector({
  ticketTypes,
  selection,
  onSelectionChange,
}: TicketTypeSelectorProps) {
  const updateQuantity = (typeId: string, delta: number, max: number, available: number) => {
    const current = selection[typeId] ?? 0;
    const next = Math.max(0, Math.min(current + delta, max, available));
    onSelectionChange({ ...selection, [typeId]: next });
  };

  return (
    <div className="space-y-3">
      {ticketTypes.map((tt) => {
        const qty = selection[tt.id] ?? 0;
        const soldOut = tt.availableCount === 0;

        return (
          <div
            key={tt.id}
            className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
              soldOut
                ? "border-stone-100 bg-stone-50 opacity-60"
                : "border-stone-200 bg-white hover:border-amber-200"
            }`}
          >
            {/* Left: info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-stone-900">{tt.name}</h4>
                {soldOut && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                    Hết vé
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-stone-500 line-clamp-1">{tt.description}</p>
              <div className="mt-1 flex items-center gap-3 text-sm">
                <span className="font-semibold text-amber-700">{formatPrice(tt.price)}</span>
                <span className="text-stone-400">
                  Còn {tt.availableCount}/{tt.quota}
                </span>
              </div>
            </div>

            {/* Right: quantity stepper */}
            {!soldOut && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="size-8 p-0 border-stone-200"
                  onClick={() => updateQuantity(tt.id, -1, tt.maxPerUser, tt.availableCount)}
                  disabled={qty === 0}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-8 text-center font-medium text-stone-900">{qty}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="size-8 p-0 border-stone-200"
                  onClick={() => updateQuantity(tt.id, 1, tt.maxPerUser, tt.availableCount)}
                  disabled={qty >= tt.maxPerUser || qty >= tt.availableCount}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { TicketSelection };
