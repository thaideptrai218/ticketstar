"use client";

// Step 3: Order limits, refund policy, content warning (all optional)
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { WizardState } from "./event-wizard";

interface Step3Props {
  data: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Settings({ data, onChange, onNext, onBack }: Step3Props) {
  return (
    <div className="space-y-6">
      {/* Max tickets per order */}
      <div>
        <Label htmlFor="ev-max-order">Số vé tối đa mỗi đơn hàng</Label>
        <p className="text-xs text-stone-400 mb-1">Để trống = không giới hạn</p>
        <Input
          id="ev-max-order"
          type="number"
          min={1}
          value={data.maxTicketsPerOrder ?? ""}
          onChange={(e) => onChange({ maxTicketsPerOrder: e.target.value ? Number(e.target.value) : null })}
          className="max-w-xs"
          placeholder="VD: 5"
        />
      </div>

      {/* Refund policy */}
      <div>
        <Label htmlFor="ev-refund">Chính sách hoàn vé</Label>
        <textarea
          id="ev-refund"
          value={data.refundPolicy}
          onChange={(e) => onChange({ refundPolicy: e.target.value })}
          rows={4}
          className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Mô tả điều kiện hoàn vé, thời hạn yêu cầu..."
        />
      </div>

      {/* Content warning */}
      <div>
        <Label htmlFor="ev-warning">Cảnh báo nội dung</Label>
        <textarea
          id="ev-warning"
          value={data.contentWarning}
          onChange={(e) => onChange({ contentWarning: e.target.value })}
          rows={3}
          className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="VD: Sự kiện có âm lượng lớn, ánh sáng nhấp nháy..."
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>← Quay lại</Button>
        <Button type="button" onClick={onNext} className="bg-amber-600 hover:bg-amber-700 min-w-28">
          Tiếp theo →
        </Button>
      </div>
    </div>
  );
}
