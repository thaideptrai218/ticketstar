# Phase 3: Login & Register Pages

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 3h

Build login and register pages with forms, validation, error handling, and Google OAuth button.

## Context Links
- [Phase 1](/plans/260301-1601-auth-frontend/phase-01-auth-api-client-and-types.md)
- [Phase 2](/plans/260301-1601-auth-frontend/phase-02-auth-context-and-provider.md)
- [Navigation bar](/frontend/src/components/landing/navigation-bar.tsx) — has "Dang nhap" button, needs link to /login

## Key Insights
- Vietnamese UI (existing landing uses Vietnamese)
- Login may return MFA challenge — need to show MFA form inline
- Use shadcn/ui Card for form container, consistent with app aesthetic (amber-700 accent, stone colors)
- Google OAuth needs `@react-oauth/google` package or manual GSI script

## Requirements

### Functional
- `/login` page: email/password form, Google button, magic link link, register link
- `/register` page: fullName/email/password form, link to login
- Form validation via zod + react-hook-form
- Server error display (field-level and general)
- Loading states on submit buttons
- Redirect to `/` (or returnUrl) on success
- If login returns MFA, show MFA challenge form inline

### Non-functional
- Responsive (mobile-first)
- Accessible (labels, aria, focus management)

## Architecture

```
/app/(auth)/layout.tsx     — centered layout with logo
/app/(auth)/login/page.tsx — imports LoginForm
/app/(auth)/register/page.tsx — imports RegisterForm

/components/auth/login-form.tsx       — email/pw + MFA inline
/components/auth/register-form.tsx    — fullName/email/pw
/components/auth/google-login-button.tsx — Google sign-in
```

Auth layout: centered card on warm bg, consistent with landing page style.

## Related Code Files

### Create
- `frontend/src/app/(auth)/layout.tsx`
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(auth)/register/page.tsx`
- `frontend/src/components/auth/login-form.tsx`
- `frontend/src/components/auth/register-form.tsx`
- `frontend/src/components/auth/google-login-button.tsx`
- `frontend/src/components/auth/mfa-challenge-form.tsx` (also used in phase 4)

### Modify
- `frontend/src/components/landing/navigation-bar.tsx` — link "Dang nhap" to /login, "Bat dau" to /register

## Implementation Steps

1. Create `(auth)/layout.tsx`:
   - Centered layout, bg-[#faf8f5], TicketStar logo at top
   - Use same fonts as landing page (Source_Serif_4 + Be_Vietnam_Pro)
   - Card container max-w-md

2. Create `login-form.tsx`:
   - react-hook-form with `loginSchema` (zod)
   - Email + password fields (shadcn Input)
   - Submit button with loading spinner
   - State: `idle` | `loading` | `mfa` (shows MFA challenge inline)
   - On MFA response: store mfaToken, switch to MFA view
   - Google login button below separator
   - Links: "Quen mat khau?" → magic link, "Chua co tai khoan?" → /register

3. Create `register-form.tsx`:
   - react-hook-form with `registerSchema`
   - fullName, email, password fields
   - Password requirements hint
   - Submit → call register → setToken → redirect
   - Link: "Da co tai khoan?" → /login

4. Create `mfa-challenge-form.tsx`:
   - Takes `mfaToken` prop
   - 6-digit code input
   - Toggle: "Dung ma khoi phuc" switches to recovery code input
   - Submit → mfaChallenge → setToken → redirect

5. Create `google-login-button.tsx`:
   - Renders Google sign-in button via GSI script (avoid extra dep)
   - On credential response: call `googleLogin(idToken)` → handle same as login
   - Note: needs Google Client ID env var

6. Update `navigation-bar.tsx`:
   - Link "Dang nhap" button → `/login`
   - Link "Bat dau" button → `/register`

7. Create page files:
   - `/login/page.tsx`: metadata + LoginForm
   - `/register/page.tsx`: metadata + RegisterForm

## Todo List
- [ ] Create (auth) layout with centered card design
- [ ] Build login-form with email/password + error handling
- [ ] Build register-form with validation
- [ ] Build mfa-challenge-form
- [ ] Build google-login-button (GSI script approach)
- [ ] Create login and register page files
- [ ] Update navigation-bar links
- [ ] Test: login → MFA flow transitions correctly
- [ ] Test: validation errors display properly

## Success Criteria
- Users can register, login, and see their session persist
- MFA users see challenge form after login
- Google OAuth works end-to-end
- Form validation prevents invalid submissions
- Server errors display clearly

## Risk Assessment
- Google OAuth requires Client ID configured — document in .env.example
- GSI script may have CSP issues — fallback: `@react-oauth/google` package
