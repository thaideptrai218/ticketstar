"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Lock, Mail, Ticket, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { authApi, AuthApiError } from "@/lib/auth/auth-api-client";
import { isMfaChallenge, loginSchema, type LoginFormData } from "@/lib/auth/auth-types";
import { GoogleLoginButton } from "./google-login-button";
import { MagicLinkRequestForm } from "./magic-link-request-form";
import { MfaChallengeForm } from "./mfa-challenge-form";
import { PasswordInput } from "./password-input";

// ─── Main Login Form ──────────────────────────────────────────────────────────

type View = "password" | "magic-link" | "mfa";

export function LoginForm() {
  const [view, setView] = useState<View>("password");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Validate returnUrl is same-origin to prevent open redirect attacks
  const rawReturnUrl = searchParams.get("returnUrl");
  const returnUrl = rawReturnUrl?.startsWith("/") && !rawReturnUrl.startsWith("//")
    ? rawReturnUrl
    : "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const handleSuccess = async () => {
    await refreshUser();
    router.push(returnUrl);
  };

  const handleMfaRequired = (token: string) => {
    setMfaToken(token);
    setView("mfa");
  };

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const res = await authApi.login(data);
      if (isMfaChallenge(res)) {
        handleMfaRequired(res.mfaToken);
      } else {
        await handleSuccess();
        toast.success("Đăng nhập thành công!");
      }
    } catch (err) {
      setServerError(
        err instanceof AuthApiError ? err.message : "Đăng nhập thất bại",
      );
    }
  };

  // ── MFA view ───────────────────────────────────────────────────────────────
  if (view === "mfa" && mfaToken) {
    return (
      <MfaChallengeForm
        mfaToken={mfaToken}
        onSuccess={async () => {
          await handleSuccess();
          toast.success("Đăng nhập thành công!");
        }}
        onBack={() => {
          setMfaToken(null);
          setView("password");
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-700 text-white">
          <Ticket className="size-4" aria-hidden="true" />
        </div>
        <span
          className="text-lg font-semibold tracking-tight text-stone-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          TicketStar
        </span>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Đăng nhập</h1>
        <p className="mt-2 text-sm text-stone-500">
          Chào mừng bạn quay lại. Đăng nhập để tiếp tục.
        </p>
      </div>

      {/* Google login */}
      <GoogleLoginButton
        onSuccess={async () => {
          await handleSuccess();
          toast.success("Đăng nhập thành công!");
        }}
        onMfaRequired={handleMfaRequired}
        onError={(msg) => setServerError(msg)}
      />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-xs uppercase tracking-wide text-stone-400">
            hoặc
          </span>
        </div>
      </div>

      {/* Tab toggle: password / magic link */}
      <div className="flex rounded-lg border border-stone-200 p-1">
        <button
          type="button"
          onClick={() => setView("password")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            view === "password"
              ? "bg-amber-50 text-amber-800"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Mật khẩu
        </button>
        <button
          type="button"
          onClick={() => setView("magic-link")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
            view === "magic-link"
              ? "bg-amber-50 text-amber-800"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          <Wand2 className="size-3.5" aria-hidden="true" />
          Magic Link
        </button>
      </div>

      {/* Magic link form */}
      {view === "magic-link" && <MagicLinkRequestForm />}

      {/* Password form */}
      {view === "password" && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-stone-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ban@example.com"
                className={`h-11 rounded-lg border-stone-300 pl-10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                  ${errors.email ? "border-red-500 focus:ring-red-500/20" : ""}`}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p id="email-error" role="alert" className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="size-3" aria-hidden="true" />
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-stone-700">
                Mật khẩu
              </Label>
              <button
                type="button"
                onClick={() => setView("magic-link")}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`h-11 rounded-lg border-stone-300 pl-10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                  ${errors.password ? "border-red-500 focus:ring-red-500/20" : ""}`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p id="password-error" role="alert" className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="size-3" aria-hidden="true" />
                {errors.password.message}
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
                Đang xử lý...
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>
      )}

      {/* Footer */}
      <p className="text-center text-sm text-stone-500">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-amber-700 hover:text-amber-800">
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
