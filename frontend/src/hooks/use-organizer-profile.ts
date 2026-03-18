"use client";

// TanStack Query hooks for organizer profile
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyOrganizerProfile,
  createOrganizerProfile,
  updateOrganizerProfile,
  type CreateOrganizerProfileRequest,
  type UpdateOrganizerProfileRequest,
} from "@/lib/api/organizer-profile-api";

export const ORGANIZER_PROFILE_KEY = ["organizer-profile"] as const;

export function useOrganizerProfile() {
  return useQuery({
    queryKey: ORGANIZER_PROFILE_KEY,
    queryFn: getMyOrganizerProfile,
    retry: false,
  });
}

export function useCreateOrganizerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrganizerProfileRequest) => createOrganizerProfile(data),
    onSuccess: (profile) => {
      queryClient.setQueryData(ORGANIZER_PROFILE_KEY, profile);
    },
  });
}

export function useUpdateOrganizerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOrganizerProfileRequest) => updateOrganizerProfile(data),
    onSuccess: (profile) => {
      queryClient.setQueryData(ORGANIZER_PROFILE_KEY, profile);
    },
  });
}
