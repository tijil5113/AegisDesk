# AegisDesk Mail (Resend)

Outbound mail is sent by the Express backend. The browser never talks to Resend and never receives `RESEND_API_KEY`.

## Architecture

```
AegisDesk Mail UI  --authenticated same-origin POST-->  /api/mail/send
                                                       Express + process.env.RESEND_API_KEY
                                                       Resend
                                                       Recipient inbox
```

## Environment variables

Set these on the server (Railway). Do not put secret values in Git, HTML, or `dist/`.

| Name | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes, to send | Resend API key. Server only. |
| `MAIL_FROM` | Yes, to send | Sender identity, e.g. `AegisDesk <onboarding@resend.dev>` for development. Production custom-domain sending requires a **verified** domain/sender in Resend. Do not invent an unverified domain. |
| `MAIL_REPLY_TO` | No | Optional Reply-To address. |
| `MAIL_FOUNDER_NAME` | No | Welcome-email signature name. Defaults to `Monish Tijil`. |
| `MAIL_APP_URL` | No | Public AegisDesk URL used as the welcome CTA. If unset or not a valid `https://` URL (or `http://localhost`), the CTA is omitted. |
| `RESEND_WEBHOOK_SECRET` | No / future | Required before any Resend webhook endpoint is enabled. Unsigned webhook JSON must never be trusted. Delivery tracking is **not** implemented in this phase. |

Existing login variables still apply: `LOGIN_ALLOWED_EMAILS`, `LOGIN_ACCESS_CODE`, `SESSION_SECRET`.

## Endpoints

### `POST /api/mail/send`

Authenticated with the existing `aegis_gate` HttpOnly session cookie when the login gate is configured. Request body:

```json
{
  "to": ["recipient@example.com"],
  "cc": [],
  "bcc": [],
  "subject": "Subject",
  "text": "Plain-text message",
  "html": "<p>Optional HTML</p>",
  "replyTo": "optional@example.com"
}
```

The client cannot set `from`. Attachments are rejected until a later phase.

Success:

```json
{ "ok": true, "id": "...", "status": "sent" }
```

`status: "sent"` means Resend **accepted** the request. It is not delivery confirmation.

Error codes include: `not_configured`, `unauthorized`, `invalid_request`, `rate_limited`, `provider_error`, `send_failed`.

### `POST /api/mail/welcome`

Authenticated. Recipient is the **session email** from the login gate, not an arbitrary client-supplied address. Uses the official welcome template and a per-recipient idempotency key.

## Welcome automation trigger

AegisDesk login is an allowlist gate, not a persistent user database. The server cannot reliably tell a first-time user from a returning user across restarts.

Do **not** send welcome mail from `index.html`, desktop boot, or every login.

When a durable user record exists, call `sendWelcomeForAuthenticatedUser(session)` from `api/mail-send.js` after **first account creation** only. Until then, use `POST /api/mail/welcome` as the explicit, idempotent hook.

In-memory maps (rate limits, recent-send fingerprints, welcome-sent) reset when the Railway process restarts. Resend idempotency still reduces duplicates inside the provider window.

## Gmail / Outlook

OAuth scaffolding under `/api/mail/gmail/*` and `/api/mail/outlook/*` is retained for a future mailbox integration. Product compose/send uses Resend.

## Service worker

`/api/*` is never cached. Mail UI cache version is bumped with `CACHE_VERSION` in `sw.js`.
