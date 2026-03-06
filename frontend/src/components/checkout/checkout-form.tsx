"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format-utils";
import type { TicketType } from "@/types/events";
import type { TicketSelection } from "@/components/events/ticket-type-selector";

interface CheckoutFormProps {
  ticketTypes: TicketType[];
  selection: TicketSelection;
  isSubmitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export function CheckoutForm({
  ticketTypes,
  selection,
  isSubmitting,
  onConfirm,
  onBack,
}: CheckoutFormProps) {
  // Build line items from selection
  const lineItems = ticketTypes
    .filter((tt) => (selection[tt.id] ?? 0) > 0)
    .map((tt) => ({
      name: tt.name,
      quantity: selection[tt.id],
      unitPrice: tt.price,
      subtotal: tt.price * selection[tt.id],
    }));

  const total = lineItems.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-stone-900">Xac nhan don hang</h2>

      {/* Order items table */}
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Loai ve</th>
              <th className="px-4 py-3 text-center font-medium">SL</th>
              <th className="px-4 py-3 text-right font-medium">Don gia</th>
              <th className="px-4 py-3 text-right font-medium">Thanh tien</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {lineItems.map((item) => (
              <tr key={item.name}>
                <td className="px-4 py-3 font-medium text-stone-900">{item.name}</td>
                <td className="px-4 py-3 text-center text-stone-600">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-stone-600">{formatPrice(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-medium text-stone-900">{formatPrice(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-stone-200 bg-amber-50/50">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-stone-900">
                Tong cong
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-amber-700">
                {formatPrice(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="border-stone-200"
        >
          Quay lai
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 h-11 bg-amber-800 hover:bg-amber-900"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Dang xu ly...
            </>
          ) : (
            "Dat ve"
          )}
        </Button>
      </div>
    </div>
  );
}
