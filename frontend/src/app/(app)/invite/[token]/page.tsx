"use client";

// Invite acceptance page — shown when user follows a collaborator invite link
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcceptCollaboratorInvite, useDeclineCollaboratorInvite } from "@/hooks/use-collaborators";
import { ApiError } from "@/lib/api-client";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptMutation = useAcceptCollaboratorInvite();
  const declineMutation = useDeclineCollaboratorInvite();

  async function handleAccept() {
    setError(null);
    try {
      await acceptMutation.mutateAsync(token);
      setDone("accepted");
      setTimeout(() => router.push("/organizer/collaborators"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể chấp nhận lời mời.");
    }
  }

  async function handleDecline() {
    setError(null);
    try {
      await declineMutation.mutateAsync(token);
      setDone("declined");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể từ chối lời mời.");
    }
  }

  if (done === "accepted") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <CheckCircle className="size-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-stone-900">Đã chấp nhận lời mời!</h1>
        <p className="text-stone-500 text-sm mt-2">Đang chuyển đến trang cộng tác...</p>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <XCircle className="size-12 text-stone-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-stone-900">Đã từ chối lời mời.</h1>
        <p className="text-stone-500 text-sm mt-2">Bạn có thể đóng trang này.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-20">
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Lời mời cộng tác</h1>
          <p className="text-stone-500 text-sm mt-2">
            Bạn được mời tham gia cộng tác sự kiện. Chấp nhận để bắt đầu.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={declineMutation.isPending || acceptMutation.isPending}
            onClick={handleDecline}
          >
            {declineMutation.isPending ? "..." : "Từ chối"}
          </Button>
          <Button
            className="flex-1 bg-amber-700 hover:bg-amber-800 text-white"
            disabled={acceptMutation.isPending || declineMutation.isPending}
            onClick={handleAccept}
          >
            {acceptMutation.isPending ? "Đang xử lý..." : "Chấp nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
