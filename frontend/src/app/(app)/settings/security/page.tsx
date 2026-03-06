"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { MfaSetupWizard } from "@/components/auth/mfa-setup-wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { authApi, AuthApiError } from "@/lib/auth/auth-api-client";

const disableSchema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã xác thực"),
});
type DisableFormData = z.infer<typeof disableSchema>;

type View = "status" | "setup" | "disable";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("status");
  const [disableError, setDisableError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DisableFormData>({ resolver: zodResolver(disableSchema) });

  const onDisable = async (data: DisableFormData) => {
    setDisableError(null);
    try {
      await authApi.disableMfa({ code: data.code });
      setMfaEnabled(false);
      setView("status");
      reset();
      toast.success("Đã tắt xác thực hai bước");
    } catch (err) {
      setDisableError(
        err instanceof AuthApiError ? err.message : "Mã xác thực không đúng",
      );
    }
  };

  // ── Setup wizard ───────────────────────────────────────────────────────────
  if (view === "setup") {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-stone-200">
          <MfaSetupWizard
            onComplete={() => {
              setMfaEnabled(true);
              setView("status");
              toast.success("Xác thực hai bước đã được bật!");
            }}
            onCancel={() => setView("status")}
          />
        </div>
      </div>
    );
  }

  // ── Disable form ───────────────────────────────────────────────────────────
  if (view === "disable") {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-stone-200 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Tắt xác thực hai bước</h2>
            <p className="mt-1 text-sm text-stone-500">
              Nhập mã từ ứng dụng xác thực để xác nhận.
            </p>
          </div>
          <form onSubmit={handleSubmit(onDisable)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code" className="text-sm font-medium text-stone-700">
                Mã xác thực
              </Label>
              <Input
                id="disable-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
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

            {disableError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                {disableError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setView("status"); reset(); setDisableError(null); }}
                className="flex-1 rounded-lg border-stone-300"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1 rounded-lg"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  "Tắt MFA"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Status view ────────────────────────────────────────────────────────────
  const isMfaOn = mfaEnabled === true;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Bảo mật</h1>
        <p className="mt-1 text-sm text-stone-500">
          Quản lý cài đặt bảo mật cho tài khoản{" "}
          <span className="font-medium text-stone-700">{user?.email}</span>
        </p>
      </div>

      {/* MFA card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex size-10 items-center justify-center rounded-xl ${
              isMfaOn ? "bg-emerald-50" : "bg-amber-50"
            }`}>
              {isMfaOn ? (
                <ShieldCheck className="size-5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Shield className="size-5 text-amber-700" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-stone-900">Xác thực hai bước (TOTP)</h2>
              <p className="mt-0.5 text-sm text-stone-500">
                {isMfaOn
                  ? "Đang bật — tài khoản của bạn được bảo vệ tốt hơn."
                  : "Thêm lớp bảo mật thứ hai bằng ứng dụng xác thực."}
              </p>
            </div>
          </div>

          {isMfaOn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("disable")}
              className="shrink-0 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <ShieldOff className="size-4 mr-1.5" aria-hidden="true" />
              Tắt MFA
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setView("setup")}
              className="shrink-0 rounded-lg bg-amber-800 hover:bg-amber-900"
            >
              Bật MFA
            </Button>
          )}
        </div>

        {mfaEnabled === null && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            Trạng thái MFA chưa xác định. Hãy thử bật hoặc tắt để cập nhật.
          </div>
        )}
      </div>
    </div>
  );
}
