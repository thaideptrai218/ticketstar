"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, AuthApiError } from "@/lib/auth/auth-api-client";
import { mfaChallengeSchema, type MfaChallengeFormData } from "@/lib/auth/auth-types";

interface MfaChallengeFormProps {
  mfaToken: string;
  onSuccess: (accessToken: string) => void;
  onBack: () => void;
}

export function MfaChallengeForm({
  mfaToken,
  onSuccess,
  onBack,
}: MfaChallengeFormProps) {
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MfaChallengeFormData>({
    resolver: zodResolver(mfaChallengeSchema),
  });

  const onSubmit = async (data: MfaChallengeFormData) => {
    setServerError(null);
    try {
      const res = await authApi.mfaChallenge({
        mfaToken,
        code: data.code,
        isRecoveryCode: isRecoveryMode,
      });
      onSuccess(res.accessToken);
    } catch (err) {
      setServerError(
        err instanceof AuthApiError ? err.message : "Xác thực thất bại",
      );
    }
  };

  const toggleMode = () => {
    setIsRecoveryMode((prev) => !prev);
    setServerError(null);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
          <Shield className="size-5 text-amber-700" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Xác thực hai bước
          </h2>
          <p className="text-sm text-stone-500">
            {isRecoveryMode
              ? "Nhập mã khôi phục của bạn"
              : "Nhập mã từ ứng dụng xác thực"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code" className="text-sm font-medium text-stone-700">
            {isRecoveryMode ? "Mã khôi phục" : "Mã xác thực (6 chữ số)"}
          </Label>
          <Input
            id="mfa-code"
            autoComplete={isRecoveryMode ? "off" : "one-time-code"}
            inputMode={isRecoveryMode ? "text" : "numeric"}
            maxLength={isRecoveryMode ? 32 : 6}
            placeholder={isRecoveryMode ? "xxxxxxxx-xxxx-..." : "000000"}
            className={`h-11 rounded-lg border-stone-300 text-center font-mono text-lg tracking-widest
              focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
              ${errors.code ? "border-red-500 focus:ring-red-500/20" : ""}`}
            {...register("code")}
          />
          {errors.code && (
            <p role="alert" className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="size-3" aria-hidden="true" />
              {errors.code.message}
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
              Đang xác thực...
            </>
          ) : (
            "Xác nhận"
          )}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-stone-500 hover:text-stone-700"
        >
          <ArrowLeft className="size-3.5" />
          Quay lại
        </button>
        <button
          type="button"
          onClick={toggleMode}
          className="font-medium text-amber-700 hover:text-amber-800"
        >
          {isRecoveryMode ? "Dùng mã xác thực" : "Dùng mã khôi phục"}
        </button>
      </div>
    </div>
  );
}
