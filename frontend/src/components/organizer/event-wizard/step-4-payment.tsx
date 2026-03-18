"use client";

// Step 4: Payment terms + final submit with event summary
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format-utils";
import type { WizardState } from "./event-wizard";

interface Step4Props {
  data: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isCreateMode: boolean;
}

export function Step4Payment({ data, onChange, onBack, onSubmit, isSubmitting, isCreateMode }: Step4Props) {
  return (
    <div className="space-y-6">
      {/* Payment terms */}
      <div>
        <Label htmlFor="ev-payment">Điều khoản thanh toán</Label>
        <p className="text-xs text-stone-400 mb-1">Hiển thị cho người mua tại trang thanh toán</p>
        <textarea
          id="ev-payment"
          value={data.paymentTerms}
          onChange={(e) => onChange({ paymentTerms: e.target.value })}
          rows={5}
          className="mt-1 w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="VD: Vé đã mua không được hoàn tiền trừ khi sự kiện bị hủy..."
        />
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-stone-200 p-4 bg-stone-50 space-y-2">
        <p className="font-semibold text-stone-700 text-sm mb-2">Tóm tắt sự kiện</p>
        <SummaryRow label="Tên" value={data.title || "—"} />
        <SummaryRow label="Hình thức" value={data.isOnline ? "Trực tuyến" : "Trực tiếp"} />
        {!data.isOnline && data.venue && <SummaryRow label="Địa điểm" value={`${data.venue}${data.city ? `, ${data.city}` : ""}`} />}
        <SummaryRow label="Bắt đầu" value={data.startAt ? data.startAt.replace("T", " ") : "—"} />
        <SummaryRow label="Kết thúc" value={data.endAt ? data.endAt.replace("T", " ") : "—"} />
        <SummaryRow
          label="Loại vé"
          value={data.ticketTypes.length > 0
            ? data.ticketTypes.map((t) => `${t.name} (${formatPrice(t.price)})`).join(", ")
            : "—"}
        />
        {data.maxTicketsPerOrder && <SummaryRow label="Tối đa/đơn" value={`${data.maxTicketsPerOrder} vé`} />}
      </div>

      <p className="text-xs text-stone-400">
        Sự kiện sẽ được lưu ở trạng thái <strong>Bản nháp</strong>. Bạn có thể xuất bản sau khi xem xét.
      </p>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>← Quay lại</Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-amber-600 hover:bg-amber-700 min-w-36"
        >
          {isSubmitting ? "Đang xử lý..." : isCreateMode ? "Tạo sự kiện" : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-stone-500 w-24 shrink-0">{label}:</span>
      <span className="text-stone-800 flex-1">{value}</span>
    </div>
  );
}
