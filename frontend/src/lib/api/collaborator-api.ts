// Collaborator API client functions
import { apiFetch } from "@/lib/api-client";
import type { Collaborator, CollaboratorPermissionLevel, CollaborationEvent } from "@/types/organizer";

export interface InviteCollaboratorRequest {
  email: string;
  permissionLevel: CollaboratorPermissionLevel;
}

export interface GenerateInviteLinkRequest {
  permissionLevel: CollaboratorPermissionLevel;
}

export interface InviteLinkResponse {
  inviteLink: string;
  token: string;
  permissionLevel: CollaboratorPermissionLevel;
  expiresAt: string;
}

export interface UpdateCollaboratorRequest {
  permissionLevel: CollaboratorPermissionLevel;
}

export async function getEventCollaborators(eventId: string): Promise<Collaborator[]> {
  return apiFetch<Collaborator[]>(`/api/events/${eventId}/collaborators`);
}

export async function inviteCollaboratorByEmail(eventId: string, data: InviteCollaboratorRequest): Promise<Collaborator> {
  return apiFetch<Collaborator>(`/api/events/${eventId}/collaborators/invite`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generateCollaboratorInviteLink(eventId: string, data: GenerateInviteLinkRequest): Promise<InviteLinkResponse> {
  return apiFetch<InviteLinkResponse>(`/api/events/${eventId}/collaborators/invite-link`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCollaboratorPermission(eventId: string, collaboratorId: string, data: UpdateCollaboratorRequest): Promise<Collaborator> {
  return apiFetch<Collaborator>(`/api/events/${eventId}/collaborators/${collaboratorId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function removeCollaborator(eventId: string, collaboratorId: string): Promise<void> {
  return apiFetch<void>(`/api/events/${eventId}/collaborators/${collaboratorId}`, { method: "DELETE" });
}

export async function getMyCollaborations(): Promise<CollaborationEvent[]> {
  return apiFetch<CollaborationEvent[]>("/api/collaborators/my");
}

export async function acceptCollaboratorInvite(token: string): Promise<void> {
  return apiFetch<void>("/api/collaborators/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function declineCollaboratorInvite(token: string): Promise<void> {
  return apiFetch<void>("/api/collaborators/decline", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
