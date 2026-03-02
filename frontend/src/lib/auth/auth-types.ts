import { z } from "zod";

// ─── Request Types ───────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkVerifyRequest {
  token: string;
}

export interface MfaChallengeRequest {
  mfaToken: string;
  code: string;
  isRecoveryCode?: boolean;
}

export interface MfaVerifySetupRequest {
  code: string;
}

export interface MfaDisableRequest {
  code: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface AccessTokenResponse {
  accessToken: string;
  expiresAt: string;
  sessionId: string;
}

export interface MfaChallengeResponse {
  mfaToken: string;
  mfaRequired: true;
}

/** Discriminated union — check mfaRequired to narrow the type */
export type LoginResponse = AccessTokenResponse | MfaChallengeResponse;

export function isMfaChallenge(res: LoginResponse): res is MfaChallengeResponse {
  return (res as MfaChallengeResponse).mfaRequired === true;
}

export interface MfaSetupResponse {
  qrCodeUri: string;
  secret: string;
}

export interface MfaVerifySetupResponse {
  recoveryCodes: string[];
}

export interface AuthErrorResponse {
  message: string;
}

export interface ValidationErrorResponse {
  errors: Record<string, string[]>;
}

/** Decoded JWT claims stored in auth context */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  sessionId: string;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const registerSchema = z.object({
  fullName: z.string().min(1, "Vui lòng nhập họ tên"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128),
});

export const mfaChallengeSchema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã xác thực"),
});

export const magicLinkSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type MfaChallengeFormData = z.infer<typeof mfaChallengeSchema>;
export type MagicLinkFormData = z.infer<typeof magicLinkSchema>;
