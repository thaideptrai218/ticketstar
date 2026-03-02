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

const AUTH_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5010";

// ─── Backend envelope ─────────────────────────────────────────────────────────
// All backend responses: { success, data?, error?, traceId? }

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    traceId?: string;
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class AuthApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public fieldErrors?: Record<string, string[]>,
    ) {
        super(message);
    }
}

// ─── Base Fetch ───────────────────────────────────────────────────────────────

async function authFetch<T>(
    endpoint: string,
    options: RequestInit = {},
    accessToken?: string,
): Promise<T> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${AUTH_BASE_URL}/api/auth${endpoint}`, {
        credentials: "include",
        ...options,
        headers,
    });

    const text = await response.text();
    const body: ApiEnvelope<T> | null = text ? JSON.parse(text) : null;

    if (!response.ok || body?.success === false) {
        const message =
            body?.error ?? body?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.";
        throw new AuthApiError(message, response.status);
    }

    // Return unwrapped data (or empty object for void endpoints)
    return (body?.data ?? {}) as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
    register: (data: RegisterRequest) =>
        authFetch<AccessTokenResponse>("/register", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    login: (data: LoginRequest) =>
        authFetch<LoginResponse>("/login", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    googleLogin: (data: GoogleLoginRequest) =>
        authFetch<LoginResponse>("/google-login", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    requestMagicLink: (data: MagicLinkRequest) =>
        authFetch<{ message: string }>("/magic-link/request", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    verifyMagicLink: (data: MagicLinkVerifyRequest) =>
        authFetch<LoginResponse>("/magic-link/verify", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    refreshToken: () =>
        authFetch<AccessTokenResponse>("/refresh", { method: "POST" }),

    logout: (accessToken: string) =>
        authFetch<void>("/logout", { method: "POST" }, accessToken),

    revokeAll: (accessToken: string) =>
        authFetch<void>("/revoke-all", { method: "POST" }, accessToken),

    setupMfa: (accessToken: string) =>
        authFetch<MfaSetupResponse>(
            "/mfa/setup",
            { method: "POST" },
            accessToken,
        ),

    verifyMfaSetup: (data: MfaVerifySetupRequest, accessToken: string) =>
        authFetch<MfaVerifySetupResponse>(
            "/mfa/verify-setup",
            { method: "POST", body: JSON.stringify(data) },
            accessToken,
        ),

    mfaChallenge: (data: MfaChallengeRequest) =>
        authFetch<AccessTokenResponse>("/mfa/challenge", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    disableMfa: (data: MfaDisableRequest, accessToken: string) =>
        authFetch<void>(
            "/mfa/disable",
            { method: "POST", body: JSON.stringify(data) },
            accessToken,
        ),
};
