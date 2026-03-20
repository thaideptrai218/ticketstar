"use client";

// TanStack Query hooks for event collaborator management
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEventCollaborators,
  inviteCollaboratorByEmail,
  generateCollaboratorInviteLink,
  updateCollaboratorPermission,
  removeCollaborator,
  getMyCollaborations,
  acceptCollaboratorInvite,
  declineCollaboratorInvite,
  type InviteCollaboratorRequest,
  type GenerateInviteLinkRequest,
  type UpdateCollaboratorRequest,
} from "@/lib/api/collaborator-api";
import { getMyOrgInvites, acceptOrgInvite, declineOrgInvite } from "@/lib/api/organizer-profile-api";

export const collaboratorsKey = (eventId: string) => ["collaborators", eventId] as const;
export const myCollaborationsKey = ["my-collaborations"] as const;

export function useEventCollaborators(eventId: string) {
  return useQuery({
    queryKey: collaboratorsKey(eventId),
    queryFn: () => getEventCollaborators(eventId),
    enabled: !!eventId,
  });
}

export function useInviteCollaborator(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteCollaboratorRequest) => inviteCollaboratorByEmail(eventId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collaboratorsKey(eventId) }),
  });
}

export function useGenerateInviteLink(eventId: string) {
  return useMutation({
    mutationFn: (data: GenerateInviteLinkRequest) => generateCollaboratorInviteLink(eventId, data),
  });
}

export function useUpdateCollaboratorPermission(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collaboratorId, data }: { collaboratorId: string; data: UpdateCollaboratorRequest }) =>
      updateCollaboratorPermission(eventId, collaboratorId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collaboratorsKey(eventId) }),
  });
}

export function useRemoveCollaborator(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collaboratorId: string) => removeCollaborator(eventId, collaboratorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collaboratorsKey(eventId) }),
  });
}

export function useMyCollaborations() {
  return useQuery({
    queryKey: myCollaborationsKey,
    queryFn: getMyCollaborations,
    refetchInterval: 30_000,  // poll every 30s so NotificationBell stays up-to-date
  });
}

export function useAcceptCollaboratorInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptCollaboratorInvite(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myCollaborationsKey }),
  });
}

export function useDeclineCollaboratorInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => declineCollaboratorInvite(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myCollaborationsKey }),
  });
}

export const myOrgInvitesKey = ["my-org-invites"] as const;

export function useMyOrgInvites() {
  return useQuery({
    queryKey: myOrgInvitesKey,
    queryFn: getMyOrgInvites,
    refetchInterval: 30_000,
  });
}

export function useAcceptOrgInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptOrgInvite(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myOrgInvitesKey }),
  });
}

export function useDeclineOrgInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => declineOrgInvite(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myOrgInvitesKey }),
  });
}
