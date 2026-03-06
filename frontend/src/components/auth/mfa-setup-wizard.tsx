"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import QRCode from "react-qr-code";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, AuthApiError } from "@/lib/auth/auth-api-client";
import { RecoveryCodesDisplay } from "./recovery-codes-display";

type Step = "setup" | "verify" | "done";

interface MfaSetupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const verifySchema = z.object({
  code: z.string().length(6, "Mã phải có 6 chữ số"),
});
type VerifyFormData = z.infer<typeof verifySchema>;

export function MfaSetupWizard({ onComplete, onCancel }: MfaSetupWizardProps) {
  const [step, setStep] = useState<Step>("setup");
  const [qrUri, setQrUri] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<VerifyFormData>({ resolver: zodResolver(verifySchema) });

  useEffect(() => {
    authApi
      .setupMfa()
      .then((res) => {
        setQrUri(res.qrCodeUri);
        setSecret(res.secret);
      })
      .catch((err) => {
        setSetupError(
          err instanceof AuthApiError ? err.message : "Không thể khởi tạo MFA",
        );
      })
      .finally(() => setIsLoadingSetup(false));
  }, []);

  const onVerify = async (data: VerifyFormData) => {
    try {
      const res = await authApi.verifyMfaSetup({ code: data.code });
      // Clear sensitive data from state after successful verification
      setQrUri("");
      setSecret("");
      setRecoveryCodes(res.recoveryCodes);
      setStep("done");
    } catch (err) {
      setError("code", {
        message:
          err instanceof AuthApiError ? err.message : "Mã xác thực không đúng",
      });
    }
  };

  // ── Step 1: QR code ────────────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="text-stone-400 hover:text-stone-600">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <div>
            <h3 className="font-semibold text-stone-900">Bật xác thực hai bước</h3>
            <p className="text-sm text-stone-500">Bước 1: Quét mã QR</p>
          </div>
        </div>

        {isLoadingSetup ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-8 animate-spin text-amber-700" aria-hidden="true" />
          </div>
        ) : setupError ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {setupError}
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              Quét mã QR này bằng ứng dụng xác thực (Google Authenticator, Authy...) của bạn.
            </p>
            <div className="flex justify-center rounded-xl bg-white p-4 shadow-sm border border-stone-200">
              <QRCode value={qrUri} size={180} />
            </div>
            <div className="rounded-lg bg-stone-50 p-3">
              <p className="text-xs text-stone-500 mb-1">Hoặc nhập thủ công:</p>
              <code className="text-xs font-mono text-stone-700 break-all">{secret}</code>
            </div>
            <Button
              onClick={() => setStep("verify")}
              className="w-full h-11 rounded-lg bg-amber-800 hover:bg-amber-900"
            >
              Tiếp theo
            </Button>
          </>
        )}
      </div>
    );
  }

  // ── Step 2: Verify code ────────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep("setup")} className="text-stone-400 hover:text-stone-600">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <div>
            <h3 className="font-semibold text-stone-900">Xác nhận thiết lập</h3>
            <p className="text-sm text-stone-500">Bước 2: Nhập mã từ ứng dụng</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setup-code" className="text-sm font-medium text-stone-700">
              Mã xác thực (6 chữ số)
            </Label>
            <Input
              id="setup-code"
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-lg bg-amber-800 hover:bg-amber-900"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Đang xác nhận...
              </>
            ) : (
              "Xác nhận"
            )}
          </Button>
        </form>
      </div>
    );
  }

  // ── Step 3: Recovery codes ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="size-5 text-emerald-600" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-stone-900">Xác thực hai bước đã bật</h3>
          <p className="text-sm text-stone-500">Lưu mã khôi phục của bạn</p>
        </div>
      </div>

      <RecoveryCodesDisplay codes={recoveryCodes} />

      <Button
        onClick={onComplete}
        className="w-full h-11 rounded-lg bg-amber-800 hover:bg-amber-900"
      >
        Hoàn tất
      </Button>
    </div>
  );
}
