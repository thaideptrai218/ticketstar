# Phase 01: TanStack Query Setup

**Priority:** P1 (Critical foundation)
**Status:** Pending
**Estimated Effort:** 30 minutes
**Dependencies:** None

## Context Links

- TanStack Query docs: https://tanstack.com/query/latest/docs/react/overview
- Auth types: `frontend/src/lib/auth/auth-types.ts`
- App providers: `frontend/src/providers/app-providers.tsx`

## Overview

Set up TanStack Query (React Query) for efficient data fetching, caching, and synchronization. Already in `package.json` — just need configuration.

## Key Insights

1. **Auth Already Using Context**: Auth state managed by React Context. TanStack Query for API data (events, tickets, user profile).

2. **Query Invalidation**: Logout should invalidate all queries. Token refresh should retry failed requests.

3. **No QueryClient Yet**: Need to create and wrap app with provider.

## Requirements

### Functional Requirements
- Create QueryClient with sensible defaults
- Wrap app with QueryClientProvider
- Configure retry logic for failed requests
- Handle 401 responses (trigger token refresh)

### Non-Functional Requirements
- Cache time: 5 minutes for stale data
- Retry: 3 attempts for network errors
- No retry for 4xx errors (except 401)

## Architecture

```typescript
// Query client configuration
QueryClient → QueryClientProvider → App
                                    → AuthProvider
                                    → ToastProvider
```

## Related Code Files

### Files to Create
- `frontend/src/lib/query-client.ts` - QueryClient factory

### Files to Modify
- `frontend/src/providers/app-providers.tsx` - Add QueryClientProvider
- `frontend/src/app/layout.tsx` - Verify providers are wrapped

## Implementation Steps

1. **Create QueryClient**
   ```typescript
   // frontend/src/lib/query-client.ts
   import { QueryClient } from '@tanstack/react-query';

   export function createQueryClient() {
     return new QueryClient({
       defaultOptions: {
         queries: {
           staleTime: 5 * 60 * 1000, // 5 minutes
           gcTime: 10 * 60 * 1000,   // 10 minutes
           retry: 3,
           refetchOnWindowFocus: false,
         },
       },
     });
   }
   ```

2. **Update App Providers**
   ```typescript
   // frontend/src/providers/app-providers.tsx
   "use client";

   import { QueryClientProvider } from '@tanstack/react-query';
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
   import { useState } from 'react';
   import { createQueryClient } from '@/lib/query-client';
   import { AuthProvider } from '@/contexts/auth-context';
   import { Toaster } from 'sonner';

   export function AppProviders({ children }: { children: React.ReactNode }) {
     const [queryClient] = useState(() => createQueryClient());

     return (
       <QueryClientProvider client={queryClient}>
         <AuthProvider>
           {children}
           <Toaster richColors position="top-center" />
         </AuthProvider>
         <ReactQueryDevtools initialIsOpen={false} />
       </QueryClientProvider>
     );
   }
   ```

3. **Verify Layout Integration**
   ```typescript
   // frontend/src/app/layout.tsx
   import { AppProviders } from '@/providers/app-providers';

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="vi">
         <body>
           <AppProviders>{children}</AppProviders>
         </body>
       </html>
     );
   }
   ```

## Todo List

- [ ] Create `frontend/src/lib/query-client.ts`
- [ ] Update `frontend/src/providers/app-providers.tsx`
- [ ] Verify `frontend/src/app/layout.tsx` uses AppProviders
- [ ] Add `@tanstack/react-query-devtools` to devDependencies if not present
- [ ] Test: Devtools appear in corner (dev mode only)

## Success Criteria

- [ ] QueryClientProvider wraps entire app
- [ ] Devtools visible in development
- [ ] No console errors related to QueryClient
- [ ] AuthContext still works after wrapping

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Double provider wrapper | Check existing layout.tsx, avoid duplicates |
| QueryClient not singleton | Use useState initialization pattern |
| Devtools bloat bundle | Import only, dev-only (tree-shaken) |

## Security Considerations

- Cache may contain sensitive data (user profile)
- Clear cache on logout (via `queryClient.clear()`)
- No auth tokens in query keys

## Next Steps

Once complete, proceed to **Phase 02: API Client Integration** to verify backend communication.
