"use client";

// Dialog for adding/editing a ticket tier within the wizard (local state only — no API call)
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().min(1, "Bắt buộc"),
  description: z.string().default(""),
  price: z.number().min(0, "Giá >= 0"),
  quota: z.number().int().min(1, "Tối thiểu 1"),
  maxPerUser: z.number().int().min(1, "Tối thiểu 1"),
  saleStartAt: z.string().default(""),
  saleEndAt: z.string().default(""),
});

// Use output type (after defaults applied) for form data
type FormData = z.output<typeof schema>;

export interface TicketTypeFormItem {
  id: string;
  serverId?: string;
  name: string;
  description: string;
  price: number;
  quota: number;
  maxPerUser: number;
  saleStartAt: string;
  saleEndAt: string;
}

interface TicketTypeModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: TicketTypeFormItem;
  onSave: (item: TicketTypeFormItem) => void;
}

export function TicketTypeModal({ open, onClose, initialData, onSave }: TicketTypeModalProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      name: "", description: "", price: 0, quota: 100, maxPerUser: 10, saleStartAt: "", saleEndAt: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open) {
      reset(initialData ? {
        name: initialData.name,
        description: initialData.description,
        price: initialData.price,
        quota: initialData.quota,
        maxPerUser: initialData.maxPerUser,
        saleStartAt: initialData.saleStartAt,
        saleEndAt: initialData.saleEndAt,
      } : { name: "", description: "", price: 0, quota: 100, maxPerUser: 10, saleStartAt: "", saleEndAt: "" });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowAdvanced(!!(initialData?.saleStartAt || initialData?.saleEndAt));
    }
  }, [open, initialData, reset]);

  function onSubmit(data: FormData) {
    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      serverId: initialData?.serverId,
      name: data.name,
      description: data.description,
      price: data.price,
      quota: data.quota,
      maxPerUser: data.maxPerUser,
      saleStartAt: data.saleStartAt,
      saleEndAt: data.saleEndAt,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Sửa loại vé" : "Thêm loại vé"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="tt-name">Tên loại vé *</Label>
            <Input id="tt-name" {...register("name")} className="mt-1" placeholder="VD: Vé thường, VIP..." />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="tt-desc">Mô tả / Quyền lợi</Label>
            <Input id="tt-desc" {...register("description")} className="mt-1" placeholder="Quyền lợi đi kèm..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="tt-price">Giá (VND)</Label>
              <Input id="tt-price" type="number" min={0} {...register("price", { valueAsNumber: true })} className="mt-1" />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <Label htmlFor="tt-quota">Số lượng</Label>
              <Input id="tt-quota" type="number" min={1} {...register("quota", { valueAsNumber: true })} className="mt-1" />
              {errors.quota && <p className="text-xs text-red-500 mt-1">{errors.quota.message}</p>}
            </div>
            <div>
              <Label htmlFor="tt-max">Tối đa/người</Label>
              <Input id="tt-max" type="number" min={1} {...register("maxPerUser", { valueAsNumber: true })} className="mt-1" />
              {errors.maxPerUser && <p className="text-xs text-red-500 mt-1">{errors.maxPerUser.message}</p>}
            </div>
          </div>

          {/* Collapsible advanced: sale dates */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-amber-600 hover:underline"
          >
            {showAdvanced ? "▾" : "▸"} Tùy chọn nâng cao (thời gian mở bán)
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tt-sale-start">Mở bán từ</Label>
                <Input id="tt-sale-start" type="datetime-local" {...register("saleStartAt")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="tt-sale-end">Đóng bán lúc</Label>
                <Input id="tt-sale-end" type="datetime-local" {...register("saleEndAt")} className="mt-1" />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
              {initialData ? "Lưu thay đổi" : "Thêm loại vé"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
