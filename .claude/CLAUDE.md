# nexpo-public — Event Public Site (Multi-tenant)

## 🎯 Project Identity
- **Role**: Visitor / Public
- **Domain**: `[site-slug].nexpo.vn` or `nexpo.vn/[site]`
- **Users**: Event visitors, general public
- **Purpose**: Public event pages, exhibitor directory, registration forms, agenda, blog

## 🛠️ Tech Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v3 + DaisyUI v4
- React Hook Form + Zod (registration forms)
- i18next + next-i18n-router (vi/en bilingual)
- @directus/sdk **⚠️ MUST upgrade from v14 to v18**
- framer-motion v10 (animations)

## ⚠️ Known Issues to Fix
1. **Directus SDK v14 → v18**: Update `package.json` and refactor SDK calls
   ```bash
   pnpm add @directus/sdk@^18
   ```
2. **Duplicate config files**: Remove `next.config.js`, keep only `next.config.ts`
3. **React v18 → v19**: Update when other deps are compatible

## 📡 Backend / API
- **Directus**: `https://app.nexpo.vn`
- **Auth**: Mostly public/anonymous read — no user login required
- **Site context**: Each site is identified by slug in URL; fetch site config from Directus `sites` collection
- **No admin token on frontend** — use Directus public policies for visitor access

## 🗂️ Routing Structure
```
/[site]/[lang]/           — Site homepage (multi-tenant + i18n)
/[site]/[lang]/register   — Event registration form
/[site]/[lang]/exhibitors — Exhibitor directory
/[site]/[lang]/agenda     — Event agenda/schedule
/[site]/[lang]/blog       — Blog/news
/[site]/[lang]/[slug]     — Dynamic pages (page builder)
/api/...                  — Form submission, revalidation
```

## 🌐 i18n Rules
- Supported languages: `vi` (Vietnamese), `en` (English)
- Default: `vi` — Vietnamese first
- Always wrap user-facing strings with `t()` from `useTranslation`
- Translation files: `src/i18n/locales/[lang]/[namespace].json`
- Directus collections with translations: use `translations` field with `languages_code`

## 🎨 Design / UI Rules
- **This is a MULTI-TENANT site** — each event has its own branding via Directus `sites.globals`
- Use CSS variables for theme-able properties; override per-site via `globals` collection
- DaisyUI theme can be set dynamically per site
- **Typography**: respect site's configured fonts; fallback to Inter/system-ui
- **Mobile-first**: All pages must be responsive; test at 375px, 768px, 1280px
- **Performance**: Core Web Vitals are critical — this is public-facing

## 📝 Code Conventions
- **RSC-first**: Maximize server components for SEO and performance
- **Data fetching**: fetch in RSC with appropriate cache settings
  ```ts
  // Static with revalidation
  fetch(url, { next: { revalidate: 3600 } })
  // Dynamic per-request
  fetch(url, { cache: 'no-store' })
  ```
- **Forms**: Always use React Hook Form + Zod; show field-level errors
- **i18n**: Use `t()` hook in client components, `getTranslation()` in server components
- **Metadata**: Every page MUST have `generateMetadata()` for SEO

## 🔐 Auth & Permissions
- No user login needed for most pages
- Registration form submits to Directus `form_submissions` using public policy
- `_eq` filter by site_id to scope all queries to the correct site

## ⚡ Performance Rules (CRITICAL for public site)
- Images: ALWAYS use Next.js `<Image>` component with proper `sizes`
- Fonts: Use `next/font` — never link external font CSS 
- Static pages: use ISR (`revalidate`) not `'no-store'` for event pages
- No large client-side bundles — keep interactive islands small
- LCP images: add `priority` prop on hero images

## 🧩 Component Hierarchy
```
src/
├── app/
│   └── [site]/[lang]/    — Multi-tenant routes
├── components/           — UI components (blocks, layout, forms)
├── directus/             — Directus client + query functions
├── i18n/                 — i18n config and locale files
├── hooks/                — Custom hooks
├── lib/                  — Utilities
└── types/                — TypeScript interfaces
```

## 🎟️ Ticketing System (Coming)

> Full schema & plan: `nexpo-platform/.claude/ticketing-schema.md`

### Routes mới (dedicated — KHÔNG phải page builder blocks)

```
/[site]/[lang]/tickets/page.tsx          ← listing ticket classes
/[site]/[lang]/checkout/page.tsx         ← multi-step: chọn vé → info → payment
/[site]/[lang]/claim/[ticket_code]/      ← claim link: điền form → link ticket → redirect insight
/api/checkout/route.ts                   ← server action (dùng DIRECTUS_ADMIN_TOKEN)
/api/webhook/vnpay/route.ts              ← VNPay callback + verify signature
/src/utils/genBadgeId.ts                 ← gen badge_id / ticket_code
```

### Checkout API — Luôn dùng DIRECTUS_ADMIN_TOKEN (server-side)

```
POST /api/checkout:
1. readItems ticket_classes → kiểm tra inventory (optimistic)
2. Tạo ticket_order (pending, expires_at +15 phút)
3. Gen ticket_code = genBadgeId() → tạo issued_tickets
4. Auto-tạo stub registrations (is_stub = true) từ buyer/holder info
5. Update quantity_sold
6. Free → mark paid ngay; Paid → redirect VNPay
```

### Form integration — Registration form trong checkout

- `forms.is_registration = true` → form dùng trong checkout (buyer_only mode)
- `forms.is_registration = false/null` → hiring, matching forms — KHÔNG dùng trong checkout
- Fetch: `readItems('forms', { filter: { event_id: { _eq: eventId }, is_registration: { _eq: true } } })`
- Reuse `VForm` component — chỉ thay submit handler (tạo registration + link ticket thay vì chỉ form_submission)

### badge_id generation

```ts
// src/utils/genBadgeId.ts
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export function genBadgeId(event: { event_code?: string | null; id: number }): string {
  const bytes = randomBytes(6)
  const random = Array.from(bytes).map(b => CHARSET[b % CHARSET.length]).join('')
  const prefix = event.event_code?.toUpperCase() ?? `EVT${event.id}`
  return `${prefix}-${random}`
}
```

Gọi hàm này khi tạo mọi registration (cả non-ticketed flow qua form submission).

### Cần sửa hiện tại

- `POST /api/form-submissions`: gen `badge_id` khi tạo registration mới (non-ticketed flow hiện chưa gen)

### ⚠️ VForm redirect_url — Cần sửa để support `{{registration_id}}`

Hiện tại VForm bỏ qua response từ API và push `redirect_url` static.
Cần sửa để admin có thể cấu hình `redirect_url = "https://insights.nexpo.vn/{{registration_id}}"`:

```typescript
// VForm.tsx submitForm — sau khi fetch
const data = await response.json()                          // parse response
const registrationId = data?.registration_id ?? ''
const resolvedUrl = (form.redirect_url ?? '')
  .replace('{{registration_id}}', registrationId)
if (form.on_success === 'redirect' && resolvedUrl) {
  return router.push(resolvedUrl)
}
```

**Claim/Checkout routes**: Không dùng form's redirect_url — custom handler luôn redirect đến insight.

---

## 🚫 Do NOT
- Do NOT hardcode event/site IDs — always read from URL params or context
- Do NOT skip `generateMetadata` — SEO is critical
- Do NOT use client components for content that can be server-rendered
- Do NOT import the full directus/sdk if only using a subset
- Do NOT dùng Directus public policy cho checkout — phải dùng `DIRECTUS_ADMIN_TOKEN` trong server action

## 🔗 Related Projects
- `nexpo-admin`: Admins create/manage sites, ticket classes, zones, và xem orders
- `nexpo-portal`: Exhibitors manage their own data
- `nexpo-services`: Python API — gọi `/send-email-with-qr` sau checkout (truyền `link_type: "ticket"`)
- `nexpo-insight`: Check-in viewer — email link ticketed → `insights.nexpo.vn/ticket/{ticket_code}`
- **Directus**: `https://app.nexpo.vn` (shared backend, public policies apply)
