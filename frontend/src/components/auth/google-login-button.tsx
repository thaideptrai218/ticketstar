"use client";

import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { authApi, AuthApiError } from "@/lib/auth/auth-api-client";
import { isMfaChallenge } from "@/lib/auth/auth-types";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

interface GoogleLoginButtonProps {
    onSuccess: () => void | Promise<void>;
    onMfaRequired: (mfaToken: string) => void;
    onError: (message: string) => void;
}

function GoogleLoginInner({
    onSuccess,
    onMfaRequired,
    onError,
}: GoogleLoginButtonProps) {
    const handleCredential = async (credential: string) => {
        try {
            const res = await authApi.googleLogin({ idToken: credential });
            if (isMfaChallenge(res)) {
                onMfaRequired(res.mfaToken);
            } else {
                await onSuccess();
            }
        } catch (err) {
            onError(
                err instanceof AuthApiError
                    ? err.message
                    : "Đăng nhập Google thất bại",
            );
        }
    };

    return (
        <div className="w-full [&>div]:w-full [&>div>div]:w-full [&_iframe]:w-full">
            <GoogleLogin
                onSuccess={(res) => {
                    if (res.credential) handleCredential(res.credential);
                }}
                onError={() => onError("Đăng nhập Google thất bại")}
                width="100%"
                text="continue_with"
                shape="rectangular"
                theme="outline"
                size="large"
            />
        </div>
    );
}

export function GoogleLoginButton(props: GoogleLoginButtonProps) {
    if (!GOOGLE_CLIENT_ID) return null;
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} locale="vi">
            <GoogleLoginInner {...props} />
        </GoogleOAuthProvider>
    );
}
