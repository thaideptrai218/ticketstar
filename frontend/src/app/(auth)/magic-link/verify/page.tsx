"use client";

import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { authApi, AuthApiError } from "@/lib/auth/auth-api-client";
import { isMfaChallenge } from "@/lib/auth/auth-types";

type State =
  | { status: "verifying" }
  | { status: "mfa"; mfaToken: string }
  | { status: "error"; message: string };

function MagicLinkVerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<State>({ status: "verifying" });
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token) {
      setState({ status: "error", message: "Link không hợp lệ." });
      return;
    }

    authApi
      .verifyMagicLink({ token })
      .then(async (res) => {
        if (isMfaChallenge(res)) {
          setState({ status: "mfa", mfaToken: res.mfaToken });
        } else {
          await refreshUser();
          toast.success("Đăng nhập thành công!");
          router.push("/");
        }
      })
      .catch((err) => {
        setState({
          status: "error",
          message:
            err instanceof AuthApiError
              ? err.message
              : "Link đã hết hạn hoặc không hợp lệ.",
        });
      });
  }, [token, refreshUser, router]);

  if (state.status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Loader2 className="size-10 animate-spin text-amber-700" aria-hidden="true" />
        <p className="text-stone-600">Đang xác thực link đăng nhập...</p>
      </div>
    );
  }

  if (state.status === "mfa") {
    return (
      <MfaChallengeForm
        mfaToken={state.mfaToken}
        onSuccess={async () => {
          await refreshUser();
          toast.success("Đăng nhập thành công!");
          router.push("/");
        }}
        onBack={() => router.push("/login")}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="size-6 text-red-500" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Xác thực thất bại</h2>
        <p className="mt-1 text-sm text-stone-500">{state.message}</p>
      </div>
      <Button asChild className="rounded-lg bg-amber-800 hover:bg-amber-900">
        <Link href="/login">Quay lại đăng nhập</Link>
      </Button>
    </div>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-700 text-white">
          <CheckCircle className="size-4" aria-hidden="true" />
        </div>
        <span
          className="text-lg font-semibold tracking-tight text-stone-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          TicketStar
        </span>
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="size-8 animate-spin text-amber-700" />
          </div>
        }
      >
        <MagicLinkVerifyInner />
      </Suspense>
    </div>
  );
}
