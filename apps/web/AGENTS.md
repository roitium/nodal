# WEB APP KNOWLEDGE BASE

**App:** Web Frontend  
**Stack:** React Router 7 + React 19 + Tailwind CSS 4  
**Mode:** SPA (SSR disabled)

---

## OVERVIEW

PWA-enabled React Router 7 application with offline persistence, type-safe RPC to backend, and shadcn/ui component library.

---

## STRUCTURE

```
app/
├── root.tsx           # Root component with providers
├── routes.ts          # Route configuration
├── app.css            # Tailwind v4 + global styles
├── routes/            # Page components (15 routes)
├── components/
│   ├── ui/            # shadcn/ui (22 components)
│   └── *.tsx          # Custom components
├── hooks/
│   ├── queries/       # TanStack Query hooks (5)
│   ├── mutations/     # TanStack Mutation hooks (7)
│   └── *.ts           # Custom hooks
├── lib/
│   ├── rpc.ts         # Hono type-safe client
│   ├── query-client.ts # TanStack Query + IndexedDB persistence
│   ├── i18n.ts        # i18next config
│   └── *.ts           # Utilities
└── locales/           # en.json, zh.json
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add page/route | `app/routes/` + `routes.ts` | File-based routing |
| UI component | `app/components/ui/` | shadcn/ui primitives |
| Custom component | `app/components/*.tsx` | App-specific UI |
| Data fetching | `app/hooks/queries/` | use-timeline, use-user, etc. |
| Mutations | `app/hooks/mutations/` | use-create-memo, use-login, etc. |
| API client | `app/lib/rpc.ts` | Hono client with auth |
| Query config | `app/lib/query-client.ts` | 5min stale, 7day cache |
| i18n keys | `app/locales/*.json` | en, zh translations |

---

## ROUTES

```typescript
// routes.ts
[
  route("login", "routes/login.tsx"),
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("explore", "routes/explore.tsx"),
    route("u/:username", "routes/user.$username.tsx"),
    route("memo/:id", "routes/memo.$id.tsx"),
    // ... more
  ]),
  layout("routes/admin.layout.tsx", [
    route("admin", "routes/admin.index.tsx"),
    route("admin/users", "routes/admin.users.tsx"),
  ]),
]
```

---

## CONVENTIONS

### Path Aliases
- `~/` → `app/` directory
- `@/*` → `../backend-hono/src/*` (shared types)

### Component Pattern
```typescript
// shadcn/ui style with CVA
const buttonVariants = cva(
  "inline-flex items-center justify-center",
  {
    variants: {
      variant: { default: "...", destructive: "..." },
      size: { default: "h-9", sm: "h-8", lg: "h-10" },
    },
  }
);
```

### Query Hook Pattern
```typescript
export function useTimeline(params?: MemoParams) {
  return useInfiniteQuery({
    queryKey: ["memos", "timeline", params],
    queryFn: async ({ pageParam }) => { /* RPC */ },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

### Mutation Hook Pattern
```typescript
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => client.api.v1.auth.login.$post({ json: data }),
    onSuccess: (data) => {
      localStorage.setItem("token", data.data.token);
      queryClient.setQueryData(["user", "me"], data.data.user);
    },
  });
}
```

---

## ANTI-PATTERNS

| Rule | File | Issue |
|------|------|-------|
| `useSidebar` outside provider | `sidebar.tsx:48` | Throws runtime error |
| `useFormField` outside `<FormField>` | `form.tsx:53` | Throws runtime error |
| Retry on 401/403 | `query-client.ts:11-14` | Disabled in retry logic |

---

## COMMANDS

```bash
bun dev          # Development server
bun build        # Production build
bun typecheck    # TypeScript check
```

---

## NOTES

- **PWA**: Workbox service worker with avatar image caching
- **Auth**: Token in localStorage, auto-injected in RPC client
- **Styling**: Tailwind v4 with `@theme` CSS variables (oklch colors)
- **Forms**: react-hook-form + zod validation
- **Markdown**: @uiw/react-md-editor with remark-gfm
- **Images**: yet-another-react-lightbox for galleries
- **i18n**: i18next with browser language detection
- **View Transitions**: `document.startViewTransition()` for page animations
