# nexpo-public — Backlog

> Không commit lên git. Claude tự cập nhật cuối mỗi session.
> Cross-project decisions: xem `nexpo-platform/.claude/PROGRESS.md`

---

## ✅ Đã làm xong

### [2026-03-30] Checkout flow — Bug fixes & Polish

**CORS fix — ticket_class fetch:**
- `checkout/page.tsx` — RSC fetch `ticket_classes` server-side bằng `DIRECTUS_ADMIN_TOKEN` (tránh CORS hoàn toàn), pass `initialTicketClass` prop xuống `CheckoutClient`
- `CheckoutClient.tsx` — xoá `useEffect` fetch client-side, nhận `initialTicketClass` prop thay thế

**PayOS SDK v2 migration (`@payos/node@2.0.5`):**
- API thay đổi hoàn toàn so với v1:
  - Constructor: positional args → options object `{ clientId, apiKey, checksumKey }`
  - `createPaymentLink()` → `payosClient.paymentRequests.create()`
  - `verifyPaymentWebhookData()` → `payosClient.webhooks.verify()` (async)
  - Import: `require('@payos/node').PayOS` (không phải `.default` hay named `PaymentRequests`)
- `api/checkout/route.ts` + `api/webhook/payos/route.ts` — đã update cả hai

**Credentials bug fix:**
- `api/checkout/route.ts` + `api/webhook/payos/route.ts` — `config.client_id` → `config.credentials.client_id` (credentials lưu dưới dạng JSON object, không phải top-level fields)

**Schema fix:**
- `api/checkout/route.ts` — `ticket_orders` create payload thiếu field `subtotal` (required) → thêm vào

**Checkout UI — white text bug (DaisyUI theme override):**
- `CheckoutClient.tsx` — thêm `style={{ color: '#111827' }}` trên root div, dùng inline styles thay Tailwind color classes cho tất cả elements (DaisyUI `--color-base-content` override Tailwind `text-gray-*`)
- `InputField` — thêm `text-gray-900 bg-white` explicit

**InputField focus loss bug:**
- `CheckoutClient.tsx` — `InputField` được định nghĩa bên trong component → React unmount/remount mỗi keystroke → mất focus
- Fix: chuyển `InputField` ra module-level function (ngoài `CheckoutClient`)

**Error detail trong response:**
- `api/checkout/route.ts` — catch block trả về `err?.errors?.[0]?.message ?? err?.message` thay vì generic "Internal server error"

---

### [2026-03-29] Ticketing System — nexpo-public checkout + claim (Phase 3 complete)

**Ticket listing:**
- `/[site]/[lang]/tickets/page.tsx` — RSC fetch published ticket classes, filter by sale window
- `TicketListingClient.tsx` — hiển thị cards, sold out state, Buy Now → `/checkout?class=&qty=1`

**Checkout flow (`/[site]/[lang]/checkout/`):**
- `CheckoutClient.tsx` — 3-step: chọn qty → buyer info + companions → confirm & pay
- Handles `registration_mode: none | buyer_only | per_ticket`
- `/api/checkout/route.ts` — server action (admin token, server-side only):
  - Validate inventory, create `ticket_order` + `ticket_order_item`
  - Gen `ticket_code` via `genBadgeId()`, create `issued_tickets` + stub `registrations`
  - Free orders: mark paid immediately, gửi email
  - Paid orders: tạo PayOS payment link → redirect
- `/checkout/success` + `/checkout/cancel` pages

**Payment webhook:**
- `/api/webhook/payos/route.ts` — verify PayOS signature, mark order paid, gọi `triggerPostPaymentFlow()`
- ⚠️ `triggerPostPaymentFlow()` được gọi nhưng chưa implement body (chưa gửi email sau khi paid)

**Claim flow:**
- `/[site]/[lang]/claim/[ticket_code]/page.tsx` — RSC lookup ticket, check if already claimed
- `ClaimClient.tsx` — hiển thị holder info + optional registration form
- `/api/claim/route.ts` — submit claim: update stub reg (is_stub=false), update issued_ticket.registration_id

**Email helpers (trong checkout route):**
- `none` mode: gửi N QR emails ngay (1/vé)
- `buyer_only` mode: QR cho buyer, claim link cho companions
- `per_ticket` mode: claim link cho tất cả

---

### [2026-03] Directus SDK upgrade
- Upgrade từ v14 → v18 (đồng bộ với các app khác)

---

## 🔄 In Progress / Chưa xong

_(không có task đang dở)_

---

## 📋 Backlog

- [ ] VForm `redirect_url` — support `{{registration_id}}` interpolation (xem nexpo-public CLAUDE.md)
