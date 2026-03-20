"use client";

// Notification bell — shows pending collaborator invites with inline accept/decline actions
import { useState } from "react";
import { Bell, CheckCircle2, X, Users, Check, XIcon } from "lucide-react";
import {
  useMyCollaborations,
  useAcceptCollaboratorInvite,
  useDeclineCollaboratorInvite,
  useMyOrgInvites,
  useAcceptOrgInvite,
  useDeclineOrgInvite,
} from "@/hooks/use-collaborators";
import { formatDate } from "@/lib/format-utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: collaborations } = useMyCollaborations();
  const { data: orgInvites } = useMyOrgInvites();
  const acceptEventMutation = useAcceptCollaboratorInvite();
  const declineEventMutation = useDeclineCollaboratorInvite();
  const acceptOrgMutation = useAcceptOrgInvite();
  const declineOrgMutation = useDeclineOrgInvite();

  // Pending event invites
  const pendingEvents = (collaborations ?? []).filter((c) => c.collaboratorStatus === "Pending");
  // Pending org invites (only those with a token for inline accept/decline)
  const pendingOrgs = (orgInvites ?? []).filter((c) => c.status === "Pending");
  const count = pendingEvents.length + pendingOrgs.length;

  const isMutating =
    acceptEventMutation.isPending || declineEventMutation.isPending ||
    acceptOrgMutation.isPending || declineOrgMutation.isPending;

  function handleAccept(token: string) { acceptEventMutation.mutate(token); }
  function handleDecline(token: string) { declineEventMutation.mutate(token); }
  function handleAcceptOrg(token: string) { acceptOrgMutation.mutate(token); }
  function handleDeclineOrg(token: string) { declineOrgMutation.mutate(token); }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
        className="relative flex size-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors cursor-pointer"
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-stone-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-stone-500" />
                <span className="font-semibold text-stone-900 text-sm">Thông báo</span>
                {count > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    {count} mới
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto">
              {count === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="size-8 text-stone-200 mb-2" />
                  <p className="text-sm text-stone-400">Không có thông báo mới</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {/* Event collaborator invites */}
                  {pendingEvents.map((c) => (
                    <div key={c.eventId} className="flex items-start gap-3 px-4 py-3.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 mt-0.5">
                        <Users className="size-4 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900 leading-snug">Lời mời sự kiện</p>
                        <p className="text-xs text-stone-500 truncate mt-0.5">{c.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                            {c.permissionLevel}
                          </span>
                          <span className="text-[10px] text-stone-400">{formatDate(c.startAt)}</span>
                        </div>
                        {c.inviteToken && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => handleAccept(c.inviteToken!)}
                              className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Check className="size-3" />
                              Chấp nhận
                            </button>
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => handleDecline(c.inviteToken!)}
                              className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <XIcon className="size-3" />
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="size-2 shrink-0 rounded-full bg-amber-500 mt-2" />
                    </div>
                  ))}

                  {/* Organizer profile invites */}
                  {pendingOrgs.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 px-4 py-3.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 mt-0.5">
                        <Users className="size-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900 leading-snug">Lời mời tổ chức</p>
                        <p className="text-xs text-stone-500 truncate mt-0.5">{c.organizationName ?? c.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                            {c.permissionLevel}
                          </span>
                          <span className="text-[10px] text-stone-400">{formatDate(c.invitedAt)}</span>
                        </div>
                        {c.inviteToken && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => handleAcceptOrg(c.inviteToken!)}
                              className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Check className="size-3" />
                              Chấp nhận
                            </button>
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => handleDeclineOrg(c.inviteToken!)}
                              className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <XIcon className="size-3" />
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="size-2 shrink-0 rounded-full bg-amber-500 mt-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {count > 0 && (
              <div className="border-t border-stone-100 px-4 py-2.5">
                <a
                  href="/organizer/collaborators"
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Xem tất cả lời mời →
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
