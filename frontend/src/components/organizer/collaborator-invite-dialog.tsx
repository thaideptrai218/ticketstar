"use client";

// Dialog for inviting collaborators by email or generating an invite link
import { useState } from "react";
import { Copy, Link2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInviteCollaborator, useGenerateInviteLink } from "@/hooks/use-collaborators";
import { ApiError } from "@/lib/api-client";
import type { CollaboratorPermissionLevel } from "@/types/organizer";

const PERMISSION_OPTIONS: { value: CollaboratorPermissionLevel; label: string }[] = [
  { value: "Viewer", label: "Xem — Chỉ xem thống kê" },
  { value: "Operator", label: "Vận hành — Check-in vé" },
  { value: "Manager", label: "Quản lý — Đầy đủ quyền" },
];

interface CollaboratorInviteDialogProps {
  eventId: string;
}

export function CollaboratorInviteDialog({ eventId }: CollaboratorInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"email" | "link">("email");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<CollaboratorPermissionLevel>("Operator");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteMutation = useInviteCollaborator(eventId);
  const linkMutation = useGenerateInviteLink(eventId);

  async function handleEmailInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    try {
      await inviteMutation.mutateAsync({ email: email.trim(), permissionLevel: permission });
      setEmail("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể gửi lời mời.");
    }
  }

  async function handleGenerateLink() {
    setError(null);
    try {
      const res = await linkMutation.mutateAsync({ permissionLevel: permission });
      setInviteLink(res.inviteLink);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo link mời.");
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) { setEmail(""); setInviteLink(null); setError(null); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-amber-700 hover:bg-amber-800 text-white">
          <Mail className="size-4 mr-2" /> Mời cộng tác viên
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mời cộng tác viên</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-stone-200 overflow-hidden text-sm">
          {(["email", "link"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setInviteLink(null); }}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                tab === t ? "bg-amber-50 text-amber-800 font-medium" : "text-stone-500 hover:bg-stone-50"
              }`}
            >
              {t === "email" ? <><Mail className="size-3.5" /> Email</> : <><Link2 className="size-3.5" /> Link mời</>}
            </button>
          ))}
        </div>

        {/* Permission selector */}
        <div className="space-y-1.5">
          <Label>Quyền hạn</Label>
          <Select value={permission} onValueChange={(v) => setPermission(v as CollaboratorPermissionLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERMISSION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tab === "email" ? (
          <form onSubmit={handleEmailInvite} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email" type="email" placeholder="user@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={inviteMutation.isPending} className="w-full bg-amber-700 hover:bg-amber-800 text-white">
              {inviteMutation.isPending ? "Đang gửi..." : "Gửi lời mời"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            {inviteLink ? (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="size-4" />
                </Button>
              </div>
            ) : null}
            {copied && <p className="text-xs text-green-600">Đã sao chép!</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleGenerateLink} disabled={linkMutation.isPending} className="w-full bg-amber-700 hover:bg-amber-800 text-white">
              <Link2 className="size-4 mr-2" />
              {linkMutation.isPending ? "Đang tạo..." : inviteLink ? "Tạo link mới" : "Tạo link mời"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
