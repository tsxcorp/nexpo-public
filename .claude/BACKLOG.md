# nexpo-public — Backlog

> Không commit lên git. Claude tự cập nhật cuối mỗi session.
> Cross-project decisions: xem `nexpo-platform/.claude/PROGRESS.md`

---

## ✅ Đã làm xong

### [2026-03] Directus SDK upgrade
- Upgrade từ v14 → v18 (đồng bộ với các app khác)

---

## 🔄 In Progress / Chưa xong

_(không có task đang dở)_

---

## 📋 Backlog (Ticketing — chờ schema implement)

- [ ] Ticket checkout flow: chọn hạng vé → thanh toán → tạo `ticket_order`
- [ ] `/claim/[ticket_code]`: visitor điền registration form để claim ticket
- [ ] Gửi QR email sau khi claim xong (gọi nexpo-services `/send-email-with-qr` với `link_type: "ticket"`)
- [ ] Payment gateway integration (`tenant_payment_configs`)
