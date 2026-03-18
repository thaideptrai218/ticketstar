"use client";

// Step 2: Event dates + ticket type list management
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TicketTypeModal, type TicketTypeFormItem } from "./ticket-type-modal";
import { formatPrice } from "@/lib/format-utils";
import type { WizardState } from "./event-wizard";

interface Step2Props {
  data: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2TimeTickets({ data, onChange, onNext, onBack }: Step2Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketTypeFormItem | undefined>();

  function handleSave(item: TicketTypeFormItem) {
    const existing = data.ticketTypes.findIndex((t) => t.id === item.id);
    if (existing >= 0) {
      const updated = [...data.ticketTypes];
      updated[existing] = item;
      onChange({ ticketTypes: updated });
    } else {
      onChange({ ticketTypes: [...data.ticketTypes, item] });
    }
  }

  function handleEdit(ticket: TicketTypeFormItem) {
    setEditingTicket(ticket);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    onChange({ ticketTypes: data.ticketTypes.filter((t) => t.id !== id) });
  }

  function handleAdd() {
    setEditingTicket(undefined);
    setModalOpen(true);
  }

  const canProceed = data.startAt && data.endAt && data.ticketTypes.length > 0;

  return (
    <div className="space-y-6">
      {/* Event dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ev-start">Thời gian bắt đầu *</Label>
          <Input
            id="ev-start"
            type="datetime-local"
            value={data.startAt}
            onChange={(e) => onChange({ startAt: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ev-end">Thời gian kết thúc *</Label>
          <Input
            id="ev-end"
            type="datetime-local"
            value={data.endAt}
            onChange={(e) => onChange({ endAt: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      {/* Ticket types */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Loại vé *</Label>
          <Button type="button" onClick={handleAdd} size="sm" className="bg-amber-600 hover:bg-amber-700">
            + Thêm loại vé
          </Button>
        </div>

        {data.ticketTypes.length === 0 ? (
          <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center text-stone-400 text-sm">
            Chưa có loại vé nào. Thêm ít nhất một loại vé để tiếp tục.
          </div>
        ) : (
          <div className="space-y-2">
            {data.ticketTypes.map((tt) => (
              <div
                key={tt.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm truncate">{tt.name}</p>
                  <p className="text-xs text-stone-500">
                    {formatPrice(tt.price)} · {tt.quota} vé · tối đa {tt.maxPerUser}/người
                    {tt.saleStartAt && <span> · Mở bán: {tt.saleStartAt.replace("T", " ")}</span>}
                  </p>
                  {tt.description && <p className="text-xs text-stone-400 truncate">{tt.description}</p>}
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(tt)}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tt.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>← Quay lại</Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="bg-amber-600 hover:bg-amber-700 min-w-28"
        >
          Tiếp theo →
        </Button>
      </div>

      <TicketTypeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingTicket}
        onSave={handleSave}
      />
    </div>
  );
}
