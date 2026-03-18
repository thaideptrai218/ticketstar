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

export async function getMyOrganizerProfile(): Promise<OrganizerProfile> {
  return apiFetch<OrganizerProfile>("/api/account/organizer-profile");
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
