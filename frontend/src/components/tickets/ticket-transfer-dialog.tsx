"use client";

// Transfer ticket dialog — validates email, calls POST /api/tickets/{id}/transfer
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { TicketDetail } from "@/types/tickets";

const transferSchema = z.object({
  recipientEmail: z.string().email("Email không hợp lệ"),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface TicketTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  eventTitle: string;
  onSuccess: () => void;
}

export function TicketTransferDialog({
  open,
  onOpenChange,
  ticketId,
  eventTitle,
  onSuccess,
}: TicketTransferDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  });

  async function onSubmit(values: TransferFormValues) {
    setIsSubmitting(true);
    try {
      await apiFetch<TicketDetail>(`/api/tickets/${ticketId}/transfer`, {
        method: "POST",
        body: JSON.stringify({ recipientEmail: values.recipientEmail }),
      });
      toast.success("Chuyển vé thành công!");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Chuyển vé thất bại. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose(open: boolean) {
    if (!isSubmitting) {
      reset();
      onOpenChange(open);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Chuyển vé</DialogTitle>
          <DialogDescription className="line-clamp-2">
            Chuyển vé <span className="font-medium text-stone-700">{eventTitle}</span> cho người khác
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="recipientEmail">Email người nhận</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="example@email.com"
              {...register("recipientEmail")}
              disabled={isSubmitting}
            />
            {errors.recipientEmail && (
              <p className="text-xs text-red-500">{errors.recipientEmail.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              {isSubmitting ? "Đang chuyển..." : "Chuyển vé"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
