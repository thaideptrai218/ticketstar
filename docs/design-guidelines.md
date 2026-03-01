# TicketStar Design Guidelines

> Frontend design system for a Vietnamese ticketing marketplace targeting young adults (18-30).
> Visual style: **Friendly & Warm** — rounded corners, warm palette, approachable (Airbnb/Notion feel).
> Light mode only. Vietnamese UI.

---

## 1. Color System

### Brand Colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Brand Primary | `#78350f` | `amber-800` | Logo, primary CTAs, brand anchor |
| Brand Warm | `#92400e` | `amber-700` | Logo bg, nav accent |
| Brand Light | `#fef3c7` | `amber-100` | Badges, tags, soft highlights |
| Brand Surface | `#faf8f5` | custom | Page background (landing) |

### Accent Colors (Feature Highlights)

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Accent Blue | `#3b82f6` | `blue-500` | Feature cards, links, secondary actions |
| Accent Cyan | `#06b6d4` | `cyan-500` | Gradient pairs with blue |
| Accent Violet | `#8b5cf6` | `violet-500` | Premium/VIP badges |

### Semantic Colors

| Token | Tailwind | Usage |
|-------|----------|-------|
| Success | `emerald-500` / `emerald-50` bg | Payment confirmed, valid QR |
| Warning | `amber-500` / `amber-50` bg | Expiring soon, low stock |
| Error | `red-500` / `red-50` bg | Validation errors, failed payment |
| Info | `blue-500` / `blue-50` bg | Informational banners |

### Neutral Scale

Use Tailwind `stone-*` (warm gray) for text, borders, backgrounds:

| Usage | Class |
|-------|-------|
| Heading text | `text-stone-900` |
| Body text | `text-stone-600` |
| Secondary text | `text-stone-500` |
| Placeholder | `text-stone-400` |
| Borders | `border-stone-200` |
| Subtle borders | `border-stone-200/60` |
| Card background | `bg-white` |
| Page background | `bg-[#faf8f5]` or `bg-stone-50` |
| Disabled | `text-stone-300`, `bg-stone-100` |

### CSS Variables (globals.css)

The shadcn/ui theme uses oklch neutral values. Override `--primary` for auth/app pages:

```css
/* Add to globals.css for app pages (non-landing) */
:root {
  --primary: oklch(0.45 0.12 50);        /* amber-800 equivalent */
  --primary-foreground: oklch(0.985 0 0); /* white */
  --ring: oklch(0.55 0.14 55);           /* amber-700 focus ring */
}
```

> **Note:** Landing page uses inline classes directly. App/auth pages use shadcn tokens.

---

## 2. Typography

### Font Stack

| Role | Font | Google Fonts | Subsets | CSS Variable |
|------|------|-------------|---------|-------------|
| Display/Headings | Source Serif 4 | `Source_Serif_4` | latin, vietnamese | `--font-display` |
| Body/UI | Be Vietnam Pro | `Be_Vietnam_Pro` | latin, vietnamese | `--font-body` |
| Monospace | Geist Mono | `Geist_Mono` | latin | `--font-geist-mono` |

Both display and body fonts support Vietnamese diacritical marks (a, a, d, e, o, o, u).

### Loading Fonts

```tsx
// In layout.tsx or page.tsx
import { Source_Serif_4, Be_Vietnam_Pro } from "next/font/google";

const serif = Source_Serif_4({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
});
const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

// Apply to root div:
<div className={`${serif.variable} ${body.variable}`}
     style={{ fontFamily: "var(--font-body), sans-serif" }}>
```

### Type Scale

| Element | Size | Weight | Font | Class |
|---------|------|--------|------|-------|
| H1 (hero) | 3rem-4.5rem | 600 | Display | `text-5xl sm:text-6xl lg:text-7xl font-semibold` + `font-display` |
| H2 (section) | 2.25rem-3rem | 600 | Display | `text-4xl sm:text-5xl font-semibold` + `font-display` |
| H3 (card title) | 1.5rem | 600 | Display | `text-2xl font-semibold` + `font-display` |
| H4 (subsection) | 1.25rem | 600 | Body | `text-xl font-semibold` |
| Body large | 1.125rem | 400 | Body | `text-lg` |
| Body | 1rem | 400 | Body | `text-base` |
| Body small | 0.875rem | 400-500 | Body | `text-sm` |
| Caption | 0.75rem | 500 | Body | `text-xs font-medium` |
| Label | 0.875rem | 500 | Body | `text-sm font-medium` |

### Line Height

- Headings: `leading-[1.1]` to `leading-tight`
- Body text: `leading-relaxed` (1.625)
- UI text: `leading-normal` (1.5)

### Tracking

- Headings: `tracking-tight`
- Body: default
- All-caps labels: `tracking-wide`

---

## 3. Spacing & Layout

### Spacing Scale

Use Tailwind's default scale. Key values:

| Token | Value | Usage |
|-------|-------|-------|
| `1` | 4px | Inline icon gap |
| `2` | 8px | Tight padding |
| `3` | 12px | Badge padding, small gaps |
| `4` | 16px | Card inner padding (mobile) |
| `5` | 20px | Card inner padding |
| `6` | 24px | Section horizontal padding |
| `8` | 32px | Section vertical gaps |
| `12` | 48px | Between sections |
| `20` | 80px | Section top/bottom padding |

### Container

```html
<div class="mx-auto max-w-6xl px-6">
  <!-- max-w-6xl = 1152px, standard content width -->
</div>
<!-- Narrow content (forms, text): max-w-3xl (768px) -->
<!-- Wide content (grids): max-w-7xl (1280px) -->
```

### Responsive Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| Default | 0-639px | Mobile (single column) |
| `sm` | 640px | Large mobile / small tablet |
| `md` | 768px | Tablet (2-col grids, show nav links) |
| `lg` | 1024px | Desktop (3-col grids, split layouts) |
| `xl` | 1280px | Wide desktop |

### Grid Patterns

```html
<!-- Feature cards: 1 → 2 → 3 columns -->
<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

<!-- Content + sidebar: stack → side-by-side -->
<div class="grid gap-8 lg:grid-cols-[1fr_320px]">

<!-- Auth split screen -->
<div class="grid min-h-screen lg:grid-cols-2">
```

---

## 4. Border Radius

Use generous radii for friendly feel:

| Element | Class | Value |
|---------|-------|-------|
| Buttons | `rounded-lg` | 8px |
| Cards | `rounded-2xl` | 16px |
| Badges/tags | `rounded-full` | pill |
| Inputs | `rounded-lg` | 8px |
| Dialogs | `rounded-2xl` | 16px |
| Avatars | `rounded-full` | circle |
| Logo icon | `rounded-lg` | 8px |
| Images | `rounded-xl` | 12px |

---

## 5. Component Styling

### Buttons

```tsx
// Primary CTA (amber brand)
<Button className="rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-900 transition-colors">
  Đăng ký ngay
</Button>

// Secondary
<Button variant="outline" className="rounded-lg border-stone-300 text-stone-700 hover:bg-stone-50">
  Tìm hiểu thêm
</Button>

// Ghost (nav)
<Button variant="ghost" className="text-sm text-stone-500 hover:text-stone-900 hover:bg-transparent">
  Đăng nhập
</Button>

// Destructive
<Button variant="destructive" className="rounded-lg">
  Xóa tài khoản
</Button>

// Sizes: sm (h-8 px-3 text-xs), default (h-10 px-5 text-sm), lg (h-12 px-8 text-base)
```

### Form Inputs

```tsx
<div className="space-y-2">
  <Label htmlFor="email" className="text-sm font-medium text-stone-700">
    Email
  </Label>
  <Input
    id="email"
    placeholder="you@example.com"
    className="h-11 rounded-lg border-stone-300 bg-white px-4 text-stone-900
               placeholder:text-stone-400
               focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
               disabled:bg-stone-100 disabled:text-stone-400"
  />
  {/* Error state */}
  <p className="text-xs text-red-500">Email không hợp lệ</p>
</div>
```

**Input states:**
- Default: `border-stone-300`
- Focus: `border-amber-500 ring-2 ring-amber-500/20`
- Error: `border-red-500 ring-2 ring-red-500/20`
- Disabled: `bg-stone-100 text-stone-400 cursor-not-allowed`

### Cards

```tsx
// Standard card
<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

// Hoverable card
<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm
                transition-all hover:shadow-md hover:-translate-y-0.5">

// Elevated card (forms, auth)
<div className="rounded-2xl bg-white p-8 shadow-lg">
```

### Badges

```tsx
// Status badge
<span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
  Đang bán
</span>

// Variants: emerald (active), red (sold out), stone (default), violet (VIP)
```

### Toast (Sonner)

```tsx
import { toast } from "sonner";

toast.success("Đăng ký thành công!");
toast.error("Đã xảy ra lỗi. Vui lòng thử lại.");
toast.info("Mã xác nhận đã được gửi đến email của bạn.");
```

---

## 6. Auth Page Layout

Split-screen layout inspired by claude.ai login page.

### Structure

```
┌─────────────────────┬─────────────────────┐
│                     │                     │
│   FORM PANEL        │   VISUAL PANEL      │
│   (white bg)        │   (gradient bg)     │
│                     │                     │
│   Logo              │   Illustration /    │
│   Title             │   Pattern /         │
│   Subtitle          │   Animated visual   │
│   Form fields       │                     │
│   Social buttons    │   Tagline           │
│   Footer links      │                     │
│                     │                     │
└─────────────────────┴─────────────────────┘
        LEFT                  RIGHT
        (scrollable)          (fixed, hidden on mobile)
```

### Implementation

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {children}
        </div>
      </div>

      {/* Right: Visual panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:items-center lg:justify-center
                      bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100
                      relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-30">
          {/* SVG pattern or animated illustration */}
        </div>
        <div className="relative z-10 max-w-md px-12 text-center">
          <h2 className="text-3xl font-semibold text-amber-900"
              style={{ fontFamily: "var(--font-display)" }}>
            Khám phá sự kiện tuyệt vời
          </h2>
          <p className="mt-4 text-amber-800/70">
            Mua vé nhanh chóng, an toàn với VietQR
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Auth Form Card

```tsx
// Login page example
<div className="w-full max-w-md space-y-8">
  {/* Logo */}
  <Link href="/" className="flex items-center gap-2.5">
    <div className="flex size-8 items-center justify-center rounded-lg bg-amber-700 text-white">
      <Ticket className="size-4" />
    </div>
    <span className="text-lg font-semibold tracking-tight text-stone-900"
          style={{ fontFamily: "var(--font-display)" }}>
      TicketStar
    </span>
  </Link>

  {/* Header */}
  <div>
    <h1 className="text-2xl font-semibold text-stone-900">Đăng nhập</h1>
    <p className="mt-2 text-sm text-stone-500">
      Chào mừng bạn quay lại. Đăng nhập để tiếp tục.
    </p>
  </div>

  {/* Social login */}
  <div className="space-y-3">
    <Button variant="outline" className="w-full h-11 rounded-lg border-stone-300 gap-3">
      <GoogleIcon className="size-5" />
      Tiếp tục với Google
    </Button>
  </div>

  {/* Divider */}
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <Separator />
    </div>
    <div className="relative flex justify-center">
      <span className="bg-white px-4 text-xs text-stone-400 uppercase tracking-wide">
        hoặc
      </span>
    </div>
  </div>

  {/* Form fields */}
  <form className="space-y-4">
    {/* ...fields... */}
    <Button type="submit" className="w-full h-11 rounded-lg bg-amber-800 hover:bg-amber-900">
      Đăng nhập
    </Button>
  </form>

  {/* Footer */}
  <p className="text-center text-sm text-stone-500">
    Chưa có tài khoản?{" "}
    <Link href="/register" className="font-medium text-amber-700 hover:text-amber-800">
      Đăng ký
    </Link>
  </p>
</div>
```

### Mobile Auth

On screens < `lg` (1024px):
- Visual panel hidden entirely
- Form panel takes full width
- Add subtle gradient accent at top: `border-t-4 border-amber-600` or a small brand illustration above the form

---

## 7. Animation Guidelines

### Framer Motion Variants

```tsx
// Page transition wrapper
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

<motion.div
  variants={pageVariants}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={{ duration: 0.3, ease: "easeOut" }}
>
```

### Form Animations

```tsx
// Field appearance (stagger children)
const formVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
};
const fieldVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// Error shake
const shakeVariants = {
  shake: {
    x: [0, -8, 8, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};

// Success checkmark
const checkVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300 } },
};
```

### Loading States

```tsx
// Button loading
<Button disabled className="w-full h-11">
  <Loader2 className="size-4 animate-spin mr-2" />
  Đang xử lý...
</Button>

// Skeleton loading
<div className="space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

### Hover & Press

```tsx
// Button press feedback
<motion.button whileTap={{ scale: 0.98 }} transition={{ duration: 0.1 }}>

// Card hover lift
<motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
```

### Scroll Reveal (existing pattern)

```tsx
// Already implemented in components/landing/scroll-reveal.tsx
<ScrollReveal delay={0.1}>
  <Component />
</ScrollReveal>
```

### Motion Preferences

```tsx
// Respect reduced motion
const prefersReducedMotion = typeof window !== "undefined"
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
  : false;

// Or use framer-motion's built-in:
<motion.div
  initial={false}  // Skip initial animation if reduced motion
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
>
```

---

## 8. Icon Usage

Use **Lucide React** exclusively.

```tsx
import { Ticket, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Check, X, AlertCircle } from "lucide-react";

// Standard size: size-4 (16px) for inline, size-5 (20px) for buttons, size-6 (24px) for features
// Color: inherit from parent text color
// Stroke width: default (2)
```

### Common Auth Icons

| Context | Icon |
|---------|------|
| Email field | `Mail` |
| Password field | `Lock` |
| Show/hide password | `Eye` / `EyeOff` |
| Error | `AlertCircle` |
| Success | `Check` or `CircleCheck` |
| Loading | `Loader2` + `animate-spin` |
| Google login | Custom SVG (not in Lucide) |
| Magic link | `Wand2` or `Link` |
| MFA/OTP | `Shield` or `Smartphone` |
| Back/close | `ArrowLeft` / `X` |

---

## 9. Shadows & Elevation

| Level | Class | Usage |
|-------|-------|-------|
| None | — | Flat elements, inline |
| Subtle | `shadow-sm` | Cards at rest, inputs |
| Default | `shadow` | Dropdowns, popovers |
| Medium | `shadow-md` | Cards on hover |
| Elevated | `shadow-lg` | Auth form card, modals |
| High | `shadow-xl` | Floating elements |

---

## 10. Accessibility

### Focus States

All interactive elements must have visible focus indicators:

```css
/* Already in globals.css via shadcn */
* { @apply outline-ring/50; }

/* Custom focus for inputs */
focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20

/* Focus-visible for buttons (keyboard only) */
focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
```

### Contrast Ratios

| Pair | Ratio | Pass |
|------|-------|------|
| stone-900 on white | 15.4:1 | AAA |
| stone-600 on white | 5.7:1 | AA |
| stone-500 on white | 4.6:1 | AA (large text only) |
| amber-800 on white | 5.9:1 | AA |
| white on amber-800 | 5.9:1 | AA |
| red-500 on red-50 | 4.8:1 | AA |

### ARIA Patterns

```tsx
// Form errors
<Input aria-invalid={!!error} aria-describedby="email-error" />
<p id="email-error" role="alert" className="text-xs text-red-500">{error}</p>

// Loading buttons
<Button disabled aria-busy="true">
  <Loader2 className="animate-spin" aria-hidden="true" />
  Đang xử lý...
</Button>

// Password toggle
<button type="button" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
  {show ? <EyeOff /> : <Eye />}
</button>
```

### Touch Targets

Minimum 44x44px for mobile:
- Buttons: `h-10` minimum (40px), use `h-11` (44px) for primary actions
- Icon buttons: `size-10` with padding
- Links in nav: adequate padding via `py-2 px-3`

---

## 11. shadcn/ui Customization

### Installed Components

button, card, input, dialog, badge, avatar, select, separator, sheet, skeleton, table, tabs

### Adding New Components

```bash
npx shadcn@latest add label checkbox dropdown-menu tooltip
```

### Theming Strategy

- Do NOT modify shadcn component source files
- Use `className` prop to override styles per-instance
- For global overrides, update CSS variables in `globals.css`
- Wrap shadcn components in project-specific wrappers only when needed repeatedly

### Component Extensions

```tsx
// Password input wrapper (example)
"use client";
import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  (props, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={show ? "text" : "password"} className="pr-10" {...props} />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
```

---

## 12. Form Patterns (react-hook-form + zod)

### Standard Form Structure

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => { /* ... */ };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" {...register("email")}
          className={errors.email ? "border-red-500 focus:ring-red-500/20" : ""}
        />
        {errors.email && (
          <p role="alert" className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="size-3" />{errors.email.message}
          </p>
        )}
      </div>
      {/* ...more fields... */}
      <Button type="submit" disabled={isSubmitting} className="w-full h-11 bg-amber-800 hover:bg-amber-900">
        {isSubmitting ? <><Loader2 className="size-4 animate-spin mr-2" />Đang xử lý...</> : "Đăng nhập"}
      </Button>
    </form>
  );
}
```

### Error Message Vietnamese Translations

| Validation | Vietnamese |
|-----------|-----------|
| Required | `Vui lòng nhập {field}` |
| Invalid email | `Email không hợp lệ` |
| Min length | `{Field} tối thiểu {n} ký tự` |
| Max length | `{Field} tối đa {n} ký tự` |
| Password mismatch | `Mật khẩu xác nhận không khớp` |
| Invalid OTP | `Mã xác thực không hợp lệ` |
| Generic error | `Đã xảy ra lỗi. Vui lòng thử lại.` |

---

## 13. File Organization

```
frontend/src/
├── app/
│   ├── (auth)/           # Auth route group
│   │   ├── layout.tsx    # Split-screen layout
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── verify/page.tsx
│   ├── (app)/            # Authenticated app pages
│   ├── globals.css
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # shadcn/ui (do not modify)
│   ├── auth/             # Auth-specific components
│   ├── landing/          # Landing page components
│   └── shared/           # Shared components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities, API client, schemas
└── types/                # TypeScript type definitions
```

---

## 14. Design Tokens Summary

Quick reference for most-used values:

```
Background:    bg-[#faf8f5] (landing), bg-white (auth form), bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 (auth visual)
Text:          stone-900 (heading), stone-600 (body), stone-500 (secondary), stone-400 (placeholder)
Brand:         amber-800 (primary CTA), amber-700 (logo), amber-50/100 (highlights)
Accent:        blue-500, cyan-500 (feature highlights)
Border:        stone-200 (default), stone-300 (inputs), amber-200 (brand borders)
Radius:        rounded-lg (buttons/inputs), rounded-2xl (cards/dialogs), rounded-full (badges/avatars)
Shadow:        shadow-sm (cards), shadow-lg (auth form, modals)
Font:          var(--font-body) body, var(--font-display) headings
Spacing:       space-y-4 (form fields), space-y-8 (form sections), p-5/p-8 (card padding)
Height:        h-11 (primary buttons/inputs), h-10 (secondary), h-8 (small)
Transition:    transition-colors duration-200, transition-all duration-300
```
