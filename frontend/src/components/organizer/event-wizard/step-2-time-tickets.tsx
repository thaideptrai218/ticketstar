"use client";

// Step 2: Event dates + ticket type list management
// End time is constrained to be after start time
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

// Compute duration label between two datetime-local strings
function getDurationLabel(startAt: string, endAt: string): string | null {
  if (!startAt || !endAt) return null;
  const diffMs = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
}

export function Step2TimeTickets({ data, onChange, onNext, onBack }: Step2Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketTypeFormItem | undefined>();

  function handleStartAtChange(value: string) {
    const update: Partial<WizardState> = { startAt: value };
    // Clear endAt if it's now before or equal to the new startAt
    if (data.endAt && value && data.endAt <= value) {
      update.endAt = "";
    }
    onChange(update);
  }

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
  const durationLabel = getDurationLabel(data.startAt, data.endAt);
  // Minimum end time: 1 minute after start
  const minEndAt = data.startAt
    ? new Date(new Date(data.startAt).getTime() + 60000).toISOString().slice(0, 16)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Event dates */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="ev-start">Thời gian bắt đầu *</Label>
            <Input
              id="ev-start"
              type="datetime-local"
              value={data.startAt}
              onChange={(e) => handleStartAtChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ev-end">
              Thời gian kết thúc *
              {!data.startAt && (
                <span className="ml-2 text-xs font-normal text-stone-400">(chọn giờ bắt đầu trước)</span>
              )}
            </Label>
            <Input
              id="ev-end"
              type="datetime-local"
              value={data.endAt}
              min={minEndAt}
              disabled={!data.startAt}
              onChange={(e) => onChange({ endAt: e.target.value })}
              className="mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Duration hint */}
        {durationLabel && (
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <span>⏱</span> Thời lượng sự kiện: {durationLabel}
          </p>
        )}
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
