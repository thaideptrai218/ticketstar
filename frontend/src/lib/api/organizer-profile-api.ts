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
