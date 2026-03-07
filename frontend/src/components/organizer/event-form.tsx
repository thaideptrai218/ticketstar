"use client";

// Shared create/edit event form with react-hook-form + zod validation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const eventSchema = z.object({
  title: z.string().min(3, "Tên sự kiện tối thiểu 3 ký tự"),
  slug: z.string().min(3, "Slug tối thiểu 3 ký tự").regex(/^[a-z0-9-]+$/, "Slug chỉ chứa a-z, 0-9, dấu gạch ngang"),
  description: z.string().optional(),
  venue: z.string().optional(),
  imageUrl: z.string().url("URL ảnh không hợp lệ").optional().or(z.literal("")),
  startAt: z.string().min(1, "Bắt buộc"),
  endAt: z.string().min(1, "Bắt buộc"),
});

export type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  defaultValues?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  submitLabel: string;
  isSubmitting: boolean;
  /** Hide slug field when editing */
  hideSlug?: boolean;
}

export function EventForm({ defaultValues, onSubmit, submitLabel, isSubmitting, hideSlug }: EventFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", slug: "", description: "", venue: "", imageUrl: "", startAt: "", endAt: "", ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
      <div>
        <Label htmlFor="title">Tên sự kiện *</Label>
        <Input id="title" {...register("title")} className="mt-1" />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
      </div>

      {!hideSlug && (
        <div>
          <Label htmlFor="slug">Slug (URL) *</Label>
          <Input id="slug" {...register("slug")} placeholder="ten-su-kien" className="mt-1" />
          {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
        </div>
      )}

      <div>
        <Label htmlFor="description">Mô tả</Label>
        <textarea id="description" {...register("description")} rows={4}
          className="mt-1 w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <div>
        <Label htmlFor="venue">Địa điểm</Label>
        <Input id="venue" {...register("venue")} className="mt-1" />
      </div>

      <div>
        <Label htmlFor="imageUrl">URL ảnh bìa</Label>
        <Input id="imageUrl" {...register("imageUrl")} placeholder="https://..." className="mt-1" />
        {errors.imageUrl && <p className="text-xs text-red-500 mt-1">{errors.imageUrl.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startAt">Bắt đầu *</Label>
          <Input id="startAt" type="datetime-local" {...register("startAt")} className="mt-1" />
          {errors.startAt && <p className="text-xs text-red-500 mt-1">{errors.startAt.message}</p>}
        </div>
        <div>
          <Label htmlFor="endAt">Kết thúc *</Label>
          <Input id="endAt" type="datetime-local" {...register("endAt")} className="mt-1" />
          {errors.endAt && <p className="text-xs text-red-500 mt-1">{errors.endAt.message}</p>}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700">
        {isSubmitting ? "Đang xử lý..." : submitLabel}
      </Button>
    </form>
  );
}
