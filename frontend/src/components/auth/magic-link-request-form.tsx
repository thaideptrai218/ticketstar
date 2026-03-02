"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, AuthApiError } from "@/lib/auth/auth-api-client";
import { magicLinkSchema, type MagicLinkFormData } from "@/lib/auth/auth-types";

export function MagicLinkRequestForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkFormData>({ resolver: zodResolver(magicLinkSchema) });

  const onSubmit = async (data: MagicLinkFormData) => {
    setServerError(null);
    try {
      await authApi.requestMagicLink({ email: data.email });
      setSent(true);
    } catch (err) {
      // API always returns 200, so errors here are network/rate-limit issues
      setServerError(
        err instanceof AuthApiError ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.",
      );
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl bg-emerald-50 p-5 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="size-5 text-emerald-600" aria-hidden="true" />
        </div>
        <h3 className="font-semibold text-stone-900">Kiểm tra email của bạn</h3>
        <p className="mt-1 text-sm text-stone-500">
          Chúng tôi đã gửi link đăng nhập đến{" "}
          <span className="font-medium text-stone-700">{getValues("email")}</span>.
          Link có hiệu lực trong 10 phút.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          Gửi lại
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email" className="text-sm font-medium text-stone-700">
          Email
        </Label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <Input
            id="magic-email"
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            className={`h-11 rounded-lg border-stone-300 pl-10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
              ${errors.email ? "border-red-500 focus:ring-red-500/20" : ""}`}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p role="alert" className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="size-3" aria-hidden="true" />
            {errors.email.message}
          </p>
        )}
      </div>

      {serverError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {serverError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-lg bg-amber-800 hover:bg-amber-900"
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Đang gửi...
          </>
        ) : (
          "Gửi link đăng nhập"
        )}
      </Button>
    </form>
  );
}
