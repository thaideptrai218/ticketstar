"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Ticket, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { authApi, AuthApiError } from "@/lib/auth/auth-api-client";
import { registerSchema, type RegisterFormData } from "@/lib/auth/auth-types";

const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  (props, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={show ? "text" : "password"} className="pr-10" {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { handleTokenReceived } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      const res = await authApi.register(data);
      handleTokenReceived(res.accessToken);
      toast.success("Tạo tài khoản thành công! Chào mừng bạn đến TicketStar.");
      router.push("/");
    } catch (err) {
      setServerError(
        err instanceof AuthApiError ? err.message : "Đăng ký thất bại. Vui lòng thử lại.",
      );
    }
  };

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
        <h1 className="text-2xl font-semibold text-stone-900">Tạo tài khoản</h1>
        <p className="mt-2 text-sm text-stone-500">
          Đăng ký miễn phí và bắt đầu khám phá sự kiện.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium text-stone-700">
            Họ và tên
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              className={`h-11 rounded-lg border-stone-300 pl-10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                ${errors.fullName ? "border-red-500 focus:ring-red-500/20" : ""}`}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              {...register("fullName")}
            />
          </div>
          {errors.fullName && (
            <p id="fullName-error" role="alert" className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="size-3" aria-hidden="true" />
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email */}
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

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-stone-700">
            Mật khẩu
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
              className={`h-11 rounded-lg border-stone-300 pl-10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
                ${errors.password ? "border-red-500 focus:ring-red-500/20" : ""}`}
              aria-invalid={!!errors.password}
              aria-describedby="password-hint password-error"
              {...register("password")}
            />
          </div>
          <p id="password-hint" className="text-xs text-stone-400">
            Tối thiểu 8 ký tự, tối đa 128 ký tự
          </p>
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
              Đang tạo tài khoản...
            </>
          ) : (
            "Đăng ký"
          )}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-stone-500">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-amber-700 hover:text-amber-800">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
