// Organizer profile API client functions
import { apiFetch } from "@/lib/api-client";

export interface OrganizerProfile {
  id: string;
  userId: string;
  organizationName: string;
  description?: string;
  phone?: string;
  address?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  logoUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateOrganizerProfileRequest {
  organizationName: string;
  description?: string;
  phone?: string;
  address?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  logoUrl?: string;
}

export interface OrgCollaborator {
  id: string;
  userId?: string;
  email: string;
  fullName?: string;
  permissionLevel: string;
  status: string;
  invitedAt: string;
  acceptedAt?: string;
  inviteToken?: string;
  organizerProfileId?: string;
  organizationName?: string;
}

export async function getOrgCollaborators(profileId: string): Promise<OrgCollaborator[]> {
  return apiFetch<OrgCollaborator[]>(`/api/account/organizer-profiles/${profileId}/collaborators`);
}

export async function inviteOrgCollaborator(profileId: string, email: string, permissionLevel: string): Promise<OrgCollaborator> {
  return apiFetch<OrgCollaborator>(`/api/account/organizer-profiles/${profileId}/collaborators`, {
    method: "POST",
    body: JSON.stringify({ email, permissionLevel }),
  });
}

export async function removeOrgCollaborator(profileId: string, collaboratorId: string): Promise<void> {
  return apiFetch(`/api/account/organizer-profiles/${profileId}/collaborators/${collaboratorId}`, { method: "DELETE" });
}

export async function updateOrgCollaboratorPermission(profileId: string, collaboratorId: string, permissionLevel: string): Promise<OrgCollaborator> {
  return apiFetch<OrgCollaborator>(`/api/account/organizer-profiles/${profileId}/collaborators/${collaboratorId}`, {
    method: "PUT",
    body: JSON.stringify({ permissionLevel }),
  });
}

export async function getMyOrgInvites(): Promise<OrgCollaborator[]> {
  return apiFetch<OrgCollaborator[]>("/api/account/org-invites");
}

export async function acceptOrgInvite(token: string): Promise<OrgCollaborator> {
  return apiFetch<OrgCollaborator>(`/api/account/org-invites/${token}/accept`, { method: "POST" });
}

export async function declineOrgInvite(token: string): Promise<void> {
  return apiFetch(`/api/account/org-invites/${token}/decline`, { method: "POST" });
}

export type UpdateOrganizerProfileRequest = Partial<CreateOrganizerProfileRequest>;

/** Returns first (primary) profile — backwards compat */
export async function getMyOrganizerProfile(): Promise<OrganizerProfile> {
  return apiFetch<OrganizerProfile>("/api/account/organizer-profile");
}

/** Returns all organizer profiles for the current user */
export async function getMyOrganizerProfiles(): Promise<OrganizerProfile[]> {
  return apiFetch<OrganizerProfile[]>("/api/account/organizer-profiles");
}

export async function createOrganizerProfile(data: CreateOrganizerProfileRequest): Promise<OrganizerProfile> {
  return apiFetch<OrganizerProfile>("/api/account/become-organizer", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateOrganizerProfile(data: UpdateOrganizerProfileRequest): Promise<OrganizerProfile> {
  return apiFetch<OrganizerProfile>("/api/account/organizer-profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updateOrganizerProfileById(id: string, data: UpdateOrganizerProfileRequest): Promise<OrganizerProfile> {
  return apiFetch<OrganizerProfile>(`/api/account/organizer-profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** Returns distinct organizer profiles from events the user is a collaborator on (joined, not owned). */
export async function getCollaboratorOrgs(): Promise<OrganizerProfile[]> {
  return apiFetch<OrganizerProfile[]>("/api/account/collaborator-orgs");
}
