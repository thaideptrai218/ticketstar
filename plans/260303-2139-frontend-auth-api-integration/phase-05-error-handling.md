# Phase 05: Error Handling

**Priority:** P2 (Polish)
**Status:** Pending
**Estimated Effort:** 30 minutes
**Dependencies:** Phase 01, Phase 02

## Context Links

- Auth API errors: `frontend/src/lib/auth/auth-api-client.ts` (AuthApiError class)
- Toast notifications: `frontend/src/providers/app-providers.tsx` (sonner)
- React Query errors: handled by default error callbacks

## Overview

Implement global error boundary, standardized error handling for API calls, and user-friendly error messages in Vietnamese. Ensure errors are logged for debugging while showing clear messages to users.

## Key Insights

1. **Already Using Sonner**: Toast notifications configured. Just need consistent error display.

2. **AuthApiError Exists**: Custom error class with status codes and field errors. Leverage this for UI.

3. **Error Boundary**: React error boundary for unexpected crashes. Separate from API errors.

4. **Vietnamese Messages**: All user-facing errors should be in Vietnamese. Technical errors logged to console.

5. **TanStack Query Errors**: Use `onError` callbacks for query-level error handling.

## Requirements

### Functional Requirements
- Global error boundary catches React errors
- API errors display toasts with Vietnamese messages
- Validation errors show field-level messages
- Network errors prompt retry
- Log errors to console in development

### Non-Functional Requirements
- Don't overwhelm user with toasts (debounce rapid errors)
- Preserve stack traces for debugging
- Show fallback UI for crashes

## Architecture

```
Component → API Call → Error → Toast (user) + Console (dev)
                      ↓
                  Error Boundary → Fallback UI
```

## Related Code Files

### Files to Create
- `frontend/src/components/error-boundary.tsx` - React error boundary
- `frontend/src/lib/error-handler.ts` - Centralized error handling logic
- `frontend/src/app/error.tsx` - Next.js error page
- `frontend/src/components/ui/api-error-alert.tsx` - Reusable error display

### Files to Modify
- `frontend/src/lib/auth/auth-api-client.ts` - Enhance error messages
- `frontend/src/providers/app-providers.tsx` - Wrap with error boundary

## Implementation Steps

1. **Create Error Handler Utility**
   ```typescript
   // frontend/src/lib/error-handler.ts
   import { toast } from "sonner";
   import type { AuthApiError } from "./auth/auth-api-client";

   export interface ErrorDisplayConfig {
     showToast?: boolean;
     logToConsole?: boolean;
     fallbackMessage?: string;
   }

   const defaultConfig: ErrorDisplayConfig = {
     showToast: true,
     logToConsole: true,
     fallbackMessage: "Đã xảy ra lỗi. Vui lòng thử lại.",
   };

   /**
    * Handle API errors with user-friendly messages
    */
   export function handleApiError(
     error: unknown,
     config: ErrorDisplayConfig = {}
   ): void {
     const { showToast, logToConsole, fallbackMessage } = {
       ...defaultConfig,
       ...config,
     };

     // Log to console for debugging
     if (logToConsole) {
       console.error("[API Error]", error);
     }

     // Show toast notification
     if (showToast) {
       const message = getErrorMessage(error, fallbackMessage);
       toast.error(message);
     }
   }

   /**
    * Extract user-friendly error message from error object
    */
   function getErrorMessage(
     error: unknown,
     fallback: string = defaultConfig.fallbackMessage!
   ): string {
     // AuthApiError with Vietnamese messages
     if (isAuthApiError(error)) {
       return error.message;
     }

     // Fetch errors
     if (error instanceof TypeError && error.message.includes("fetch")) {
       return "Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng.";
     }

     // Generic Error
     if (error instanceof Error) {
       // In development, show full message
       if (process.env.NODE_ENV === "development") {
         return error.message;
       }
     }

     return fallback;
   }

   function isAuthApiError(error: unknown): error is AuthApiError {
     return (
       typeof error === "object" &&
       error !== null &&
       "message" in error &&
       "status" in error
     );
   }

   /**
    * Map HTTP status codes to Vietnamese messages
    */
   export const statusMessages: Record<number, string> = {
     400: "Dữ liệu không hợp lệ.",
     401: "Phiên làm việc hết hạn. Vui lòng đăng nhập lại.",
     403: "Bạn không có quyền thực hiện thao tác này.",
     404: "Không tìm thấy tài nguyên.",
     409: "Xung đột dữ liệu. Vui lòng thử lại.",
     429: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
     500: "Lỗi máy chủ. Vui lòng thử lại sau.",
     502: "Máy chủ đang bận. Vui lòng thử lại sau.",
     503: "Dịch vụ tạm thời không khả dụng.",
   };
   ```

2. **Create React Error Boundary**
   ```typescript
   // frontend/src/components/error-boundary.tsx
   "use client";

   import React from "react";
   { AlertTriangle, RefreshCcw } from "lucide-react";
   import { Button } from "@/components/ui/button";
   { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

   interface Props {
     children: React.ReactNode;
     fallback?: React.ReactNode;
   }

   interface State {
     hasError: boolean;
     error?: Error;
   }

   export class ErrorBoundary extends React.Component<Props, State> {
     constructor(props: Props) {
       super(props);
       this.state = { hasError: false };
     }

     static getDerivedStateFromError(error: Error): State {
       return { hasError: true, error };
     }

     componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
       console.error("[Error Boundary]", error, errorInfo);
     }

     handleReset = () => {
       this.setState({ hasError: false, error: undefined });
     };

     render() {
       if (this.state.hasError) {
         if (this.props.fallback) {
           return this.props.fallback;
         }

         return (
           <div className="flex min-h-screen items-center justify-center bg-[#faf8f5] p-6">
             <Card className="max-w-md">
               <CardHeader>
                 <div className="flex items-center gap-3">
                   <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
                     <AlertTriangle className="size-5 text-red-600" />
                   </div>
                   <CardTitle>Đã xảy ra lỗi</CardTitle>
                 </div>
               </CardHeader>
               <CardContent className="space-y-4">
                 <p className="text-sm text-stone-600">
                   Ứng dụng gặp lỗi không mong muốn. Vui lòng thử lại.
                 </p>

                 {process.env.NODE_ENV === "development" && this.state.error && (
                   <details className="rounded-lg bg-stone-50 p-3 text-xs">
                     <summary className="cursor-pointer font-medium text-stone-700">
                       Chi tiết lỗi
                     </summary>
                     <pre className="mt-2 overflow-auto text-stone-600">
                       {this.state.error.stack}
                     </pre>
                   </details>
                 )}

                 <div className="flex gap-3">
                   <Button
                     onClick={this.handleReset}
                     className="flex-1 bg-amber-800 hover:bg-amber-900"
                   >
                     <RefreshCcw className="mr-2 size-4" />
                     Thử lại
                   </Button>
                   <Button
                     variant="outline"
                     onClick={() => window.location.href = "/"}
                     className="flex-1"
                   >
                     Về trang chủ
                   </Button>
                 </div>
               </CardContent>
             </Card>
           </div>
         );
       }

       return this.props.children;
     }
   }
   ```

3. **Create API Error Alert Component**
   ```typescript
   // frontend/src/components/ui/api-error-alert.tsx
   import { AlertCircle, XCircle } from "lucide-react";
   { Button } from "./button";
   { AuthApiError } from "@/lib/auth/auth-api-client";

   interface ApiErrorAlertProps {
     error: unknown;
     onRetry?: () => void;
     onDismiss?: () => void;
   }

   export function ApiErrorAlert({ error, onRetry, onDismiss }: ApiErrorAlertProps) {
     if (!(error instanceof AuthApiError)) {
       return null;
     }

     const hasFieldErrors = error.fieldErrors && Object.keys(error.fieldErrors).length > 0;

     return (
       <div className="rounded-lg bg-red-50 border border-red-200 p-4">
         <div className="flex items-start gap-3">
           <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />

           <div className="flex-1 space-y-2">
             <p className="text-sm font-medium text-red-800">
               {error.message}
             </p>

             {hasFieldErrors && (
               <ul className="space-y-1 text-sm text-red-700">
                 {Object.entries(error.fieldErrors!).map(([field, messages]) => (
                   <li key={field} className="flex items-start gap-2">
                     <span className="font-medium capitalize">{field}:</span>
                     <span>{messages.join(", ")}</span>
                   </li>
                 ))}
               </ul>
             )}

             {(onRetry || onDismiss) && (
               <div className="flex gap-2 pt-2">
                 {onRetry && (
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={onRetry}
                     className="h-8 text-red-700 border-red-300 hover:bg-red-100"
                   >
                     Thử lại
                   </Button>
                 )}
                 {onDismiss && (
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={onDismiss}
                     className="h-8 text-red-700 hover:bg-red-100"
                   >
                     <XCircle className="mr-1 size-3" />
                     Đóng
                   </Button>
                 )}
               </div>
             )}
           </div>
         </div>
       </div>
     );
   }
   ```

4. **Update App Providers**
   ```typescript
   // frontend/src/providers/app-providers.tsx
   import { ErrorBoundary } from "@/components/error-boundary";

   export function AppProviders({ children }: { children: React.ReactNode }) {
     const [queryClient] = useState(() => createQueryClient());

     return (
       <QueryClientProvider client={queryClient}>
         <ErrorBoundary>
           <AuthProvider>
             {children}
             <Toaster richColors position="top-center" />
           </AuthProvider>
         </ErrorBoundary>
         <ReactQueryDevtools initialIsOpen={false} />
       </QueryClientProvider>
     );
   }
   ```

5. **Create Next.js Error Page**
   ```typescript
   // frontend/src/app/error.tsx
   "use client";

   import { useEffect } from "react";
   { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
   { Button } from "@/components/ui/button";
   { AlertCircle, Home } from "lucide-react";

   export default function Error({
     error,
   }: {
     error: Error & { digest?: string };
   }) {
     useEffect(() => {
     console.error("[App Error]", error);
   }, [error]);

   return (
     <div className="flex min-h-screen items-center justify-center bg-[#faf8f5] p-6">
       <Card className="max-w-md">
         <CardHeader>
           <div className="flex items-center gap-3">
             <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
               <AlertCircle className="size-5 text-red-600" />
             </div>
             <CardTitle>Đã xảy ra lỗi</CardTitle>
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           <p className="text-sm text-stone-600">
             Ứng dụng gặp lỗi không mong muốn. Vui lòng thử lại.
           </p>

           {process.env.NODE_ENV === "development" && (
             <details className="rounded-lg bg-stone-50 p-3 text-xs">
               <summary className="cursor-pointer font-medium text-stone-700">
                 Chi tiết lỗi
               </summary>
               <pre className="mt-2 overflow-auto text-stone-600">
                 {error.message}
                 {error.stack}
               </pre>
             </details>
           )}

           <div className="flex gap-3">
             <Button
               onClick={() => window.location.reload()}
               className="flex-1 bg-amber-800 hover:bg-amber-900"
             >
               Tải lại trang
             </Button>
             <Button
               variant="outline"
               asChild
               className="flex-1"
             >
               <a href="/">
                 <Home className="mr-2 size-4" />
                 Về trang chủ
               </a>
             </Button>
           </div>
         </CardContent>
       </Card>
     </div>
   );
   }
   ```

## Todo List

- [ ] Create `error-handler.ts` utility
- [ ] Create `error-boundary.tsx` component
- [ ] Create `api-error-alert.tsx` component
- [ ] Create `app/error.tsx` page
- [ ] Wrap app with ErrorBoundary
- [ ] Test error boundary (throw error in dev)
- [ ] Test API error toasts
- [ ] Verify Vietnamese messages

## Success Criteria

- [ ] Error boundary catches React crashes
- [ ] API errors show Vietnamese toasts
- [ ] Validation errors display field messages
- [ ] Network errors prompt retry
- [ ] Errors logged to console in dev
- [ ] 404 page shows helpful message

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Error boundary catches too much | Narrow scope, avoid wrapping async ops |
| Toast spam on rapid errors | Debounce or limit toast frequency |
| Vietnamese translation gaps | Use fallback messages |
| Sensitive data in error logs | Sanitize in production |

## Security Considerations

- Don't expose stack traces in production
- Sanitize error messages before display
- Log full errors server-side for debugging
- Don't leak internal API paths in user messages

## Next Steps

Phase complete! Verify all success criteria, then begin Phase 5 (Feature Implementation).

## Unresolved Questions

- Should we implement error logging service (Sentry)?
- Do we need offline detection/persistence?
