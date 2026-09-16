# AegisDesk

AegisDesk is a browser-based operating environment: windows, a launcher, search, applications, and an optional server-side account layer. It is not a native OS and does not claim host filesystem, unrestricted shell, or guaranteed email delivery.

## Local setup

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000/`. The public website works without a database. Account sign-up and password login need PostgreSQL.

## Database

AegisDesk uses PostgreSQL with `pg` (node-postgres) and versioned SQL migrations. That stack was chosen because this Express app is small: parameterized SQL, no ORM generate step, and Railway provides `DATABASE_URL` natively.

```bash
# .env
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB
npm run migrate
```

Schema lives in `db/migrations/`. Migrations never drop user tables. Device-local Notes, Tasks, Bookmarks, theme, and similar data stay in the browser. The database stores accounts, sessions, and an empty `user_preferences` row for future expansion.

## Authentication

- **Sign up / Sign in:** email + password. Passwords are hashed with bcryptjs. Sessions are random tokens stored hashed in PostgreSQL and issued as HttpOnly, SameSite=Lax cookies (`Secure` in production).
- **Sign out:** `POST /api/auth/logout` revokes the server session and clears cookies.
- **Optional allowlist:** if `LOGIN_ALLOWED_EMAILS` is set, only those emails can create accounts or use the access-code gate.
- **Legacy access code:** `POST /api/login` still supports email + `LOGIN_ACCESS_CODE` for private deployments.

Required for accounts: `DATABASE_URL`. Recommended for the access-code gate: `SESSION_SECRET`. Missing provider keys do not take down the public website.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Apply pending SQL migrations (if `DATABASE_URL` is set), then run Express |
| `npm run migrate` | Apply SQL migrations |
| `npm run build` | Copy a static `dist/` snapshot |
| `npm run test:auth` | Validation + Intl checks; live DB tests if `DATABASE_URL` works |
| `npm run secret-scan` | Scan for hardcoded credential assignments |

## Railway

1. Web service from this repo. Start command: `npm start`. Health check: `/health`.
2. PostgreSQL plugin. Copy `DATABASE_URL` onto the **web** service (not only the database service).
3. Set `SESSION_SECRET` and `NODE_ENV=production`. Optionally `LOGIN_ALLOWED_EMAILS` / `LOGIN_ACCESS_CODE`.
4. Optional providers: `OPENAI_API_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `YOUTUBE_API_KEY`, `NEWS_API_KEY`, `GNEWS_API_KEY`.

`npm start` applies SQL migrations on boot when `DATABASE_URL` is set. That does not drop tables. If migrations fail, the public website still starts and account routes return a structured error. You can still run `npm run migrate` as a one-off.

Do not put secrets in frontend code. `/health` reports `service` and `database` (`ok` / `unavailable` / `unconfigured`) without connection details.

## Security notes

- Authenticated APIs require an account session or the legacy gate cookie when those are configured.
- Login/signup/AI/mail/provider routes are rate-limited.
- State-changing cookie routes check Origin/Referer (CSRF). SameSite=Lax is not treated as sufficient by itself.
- CSP allows `'unsafe-inline'` because existing boot/theme scripts are inline, and YouTube embeds for Music. That is an acknowledged exception, not a claim of a locked-down CSP.
- Notes markdown preview is sanitized against script/event-handler injection. Do not treat that as a complete HTML sanitizer for every app.

## Browser limitations

AegisDesk is tested as a Chromium web app. Other browsers are not claimed unless separately tested. Files is a virtual workspace. Terminal is simulated. System Monitor reports browser metrics. Many sites block iframe embedding.

## Testing

After `npm start`:

- Public pages: `/`, `/login.html`, `/signup.html`
- `GET /health`
- Create an account (needs migrations + `DATABASE_URL`)
- Desktop: launcher, World Clock, Settings → Sign out
