"use client";

// Dialog form for creating/editing a ticket type
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ticketTypeSchema = z.object({
  name: z.string().min(1, "Bắt buộc"),
  description: z.string().optional(),
  price: z.number().min(0, "Giá >= 0"),
  quota: z.number().int().min(1, "Tối thiểu 1"),
  maxPerUser: z.number().int().min(1, "Tối thiểu 1"),
});

export type TicketTypeFormData = z.infer<typeof ticketTypeSchema>;

interface TicketTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketTypeFormData) => Promise<void>;
  defaultValues?: Partial<TicketTypeFormData>;
  isEdit?: boolean;
}

export function TicketTypeFormDialog({ open, onOpenChange, onSubmit, defaultValues, isEdit }: TicketTypeFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<TicketTypeFormData>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: { name: "", description: "", price: 0, quota: 100, maxPerUser: 5, ...defaultValues },
  });

  async function handleFormSubmit(data: TicketTypeFormData) {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa loại vé" : "Thêm loại vé"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="tt-name">Tên *</Label>
            <Input id="tt-name" {...register("name")} className="mt-1" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="tt-desc">Mô tả</Label>
            <Input id="tt-desc" {...register("description")} className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="tt-price">Giá (VND)</Label>
              <Input id="tt-price" type="number" {...register("price", { valueAsNumber: true })} className="mt-1" />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <Label htmlFor="tt-quota">Số lượng</Label>
              <Input id="tt-quota" type="number" {...register("quota", { valueAsNumber: true })} className="mt-1" />
              {errors.quota && <p className="text-xs text-red-500 mt-1">{errors.quota.message}</p>}
            </div>
            <div>
              <Label htmlFor="tt-max">Tối đa/người</Label>
              <Input id="tt-max" type="number" {...register("maxPerUser", { valueAsNumber: true })} className="mt-1" />
              {errors.maxPerUser && <p className="text-xs text-red-500 mt-1">{errors.maxPerUser.message}</p>}
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-700">
            {isSubmitting ? "Đang xử lý..." : isEdit ? "Lưu" : "Thêm"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
