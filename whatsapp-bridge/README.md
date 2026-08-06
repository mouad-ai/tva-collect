# WhatsApp bridge

Holds the actual WhatsApp connection (via [Baileys](https://github.com/WhiskeySockets/Baileys), the unofficial WhatsApp Web protocol) so Trigger.dev tasks and the main app never need to hold a persistent socket themselves — they just call this service's small HTTP API.

**Use a dedicated phone number/SIM for this, never your real business WhatsApp number.** Unofficial automation carries real ban risk; if this number gets flagged, you lose a SIM, not the number your actual clients already have.

## First-time setup (one manual step — only you can do this)

1. Deploy this service (`docker compose -f docker-compose.prod.yml up -d --build whatsapp-bridge`).
2. Fetch the pairing QR code:
   ```bash
   curl -s "https://whatsapp-bridge.tvacollect.com/qr?token=YOUR_WHATSAPP_BRIDGE_TOKEN"
   ```
   This returns `{"status":"scan_required","qrDataUrl":"data:image/png;base64,..."}`. Paste that `data:image/png;base64,...` string into a browser address bar (or decode it) to see the QR code as an image.
3. On the dedicated phone: WhatsApp → Settings → Linked Devices → Link a Device → scan the QR code.
4. Once linked, `GET /qr` returns `{"status":"already_connected"}` and the session persists in the `whatsapp-auth` Docker volume — you won't need to re-scan on redeploys or reboots, only if the device is explicitly logged out from the phone.

## API

All endpoints require `X-Bridge-Token: <WHATSAPP_BRIDGE_TOKEN>` (or `?token=` for `/qr`).

- `GET /health` — no auth, used by Docker healthcheck.
- `GET /qr` — pairing QR code (see above) or connection status.
- `POST /send` — `{"to": "212612345678", "message": "..."}`. Sends are queued and paced with a randomized 4-12s delay between messages — never sends in a tight, obviously-automated burst.

Inbound messages are forwarded automatically to `APP_WEBHOOK_URL` (the main app's `/api/whatsapp/inbound`), which hands off to the `handle-inbound-reply` Trigger.dev task.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```
