// Auth API client — all calls go through Next.js proxy routes (/api/auth/*)
// Proxy routes handle httpOnly cookie management and Bearer token forwarding.
// Client-side JS never touches tokens directly.

import type {
    RegisterRequest,
    LoginRequest,
    GoogleLoginRequest,
    MagicLinkRequest,
    MagicLinkVerifyRequest,
    MfaChallengeRequest,
    MfaVerifySetupRequest,
    MfaDisableRequest,
    AccessTokenResponse,
    LoginResponse,
    MfaSetupResponse,
    MfaVerifySetupResponse,
} from "./auth-types";

// ─── Error class ──────────────────────────────────────────────────────────────

export class AuthApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public fieldErrors?: Record<string, string[]>,
    ) {
        super(message);
        this.name = "AuthApiError";
    }
}

// ─── Internal fetch ───────────────────────────────────────────────────────────

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    errors?: Record<string, string[]>;
}

async function proxyFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    const res = await fetch(path, {
        credentials: "include",
        ...options,
        headers,
    });

    const text = await res.text();
    let body: ApiEnvelope<T> | null = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        throw new AuthApiError("Đã xảy ra lỗi máy chủ. Vui lòng thử lại.", res.status);
    }

    if (!res.ok || body?.success === false) {
        const message = body?.error ?? body?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.";
        throw new AuthApiError(message, res.status, body?.errors);
    }

    return (body?.data ?? {}) as T;
}

// ─── Auth API — all via proxy routes ─────────────────────────────────────────

export const authApi = {
    register: (data: RegisterRequest) =>
        proxyFetch<AccessTokenResponse>("/api/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    login: (data: LoginRequest) =>
        proxyFetch<LoginResponse>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    googleLogin: (data: GoogleLoginRequest) =>
        proxyFetch<LoginResponse>("/api/auth/google", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    requestMagicLink: (data: MagicLinkRequest) =>
        proxyFetch<{ message: string }>("/api/auth/magic-link/request", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    verifyMagicLink: (data: MagicLinkVerifyRequest) =>
        proxyFetch<LoginResponse>("/api/auth/magic-link/verify", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    refreshToken: () =>
        proxyFetch<AccessTokenResponse>("/api/auth/refresh", { method: "POST" }),

    logout: () =>
        proxyFetch<void>("/api/auth/logout", { method: "POST" }),

    revokeAll: () =>
        proxyFetch<void>("/api/auth/revoke-all", { method: "POST" }),

    // MFA — proxy reads ts_at cookie server-side and forwards as Bearer
    mfaChallenge: (data: MfaChallengeRequest) =>
        proxyFetch<AccessTokenResponse>("/api/auth/mfa/challenge", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    setupMfa: () =>
        proxyFetch<MfaSetupResponse>("/api/auth/mfa/setup", { method: "POST" }),

    verifyMfaSetup: (data: MfaVerifySetupRequest) =>
        proxyFetch<MfaVerifySetupResponse>("/api/auth/mfa/verify-setup", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    disableMfa: (data: MfaDisableRequest) =>
        proxyFetch<void>("/api/auth/mfa/disable", {
            method: "POST",
            body: JSON.stringify(data),
        }),
};
