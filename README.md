# Easy Auth

Sign-up / sign-in module with revocable server-side sessions and permission-based access control.

- **Backend:** NestJS 12 (`NodeAdapter`, ESM), MongoDB (Mongoose), Redis, Zod
- **Frontend:** React 19, Vite, TanStack Query, React Router, React Hook Form, shadcn/ui, Tailwind 4
- **Infra:** one `docker-compose.yml` (MongoDB, Redis, API, nginx serving the SPA and proxying `/api`)

## Quick start

```bash
docker compose up --build
```

Open http://localhost:8080. API docs (Swagger) are at http://localhost:8080/api/docs.

Podman works too: `podman compose up --build`.

Compose variables you can override (shell env or a root `.env`):

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_PORT` | `8080` | Public port |
| `ACCESS_TOKEN_SECRET` | dev value | Signs access tokens. **Set this in any real deployment** |
| `REFRESH_TOKEN_SECRET` | dev value | Signs refresh tokens. Must differ from the access secret (checked at startup) |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` (15 min) | Access token lifetime |
| `SESSION_TTL_SECONDS` | `604800` (7 days) | Absolute session lifetime: the refresh token can't outlive it |
| `SESSION_RETENTION_DAYS` | `180` | How long session records are kept for auditing |
| `COOKIE_SECURE` | `true` | `Secure` cookies with `__Host-` / `__Secure-` prefixes. Browsers accept it on `localhost` over plain HTTP too. Only set `false` for non-localhost HTTP |
| `ALLOW_ADMIN_SIGNUP` | `true` | Shows the "Admin account" toggle on sign-up. Off by default outside compose |

## Local development

Requirements: Node 24+, pnpm 12, MongoDB and Redis.

```bash
docker run -d -p 27017:27017 mongo:8
docker run -d -p 6379:6379 redis:8-alpine
```

```bash
cd backend
cp .env.example .env
pnpm install
pnpm start:dev -- --env-file .env
```

```bash
cd frontend
pnpm install
pnpm dev
```

Vite proxies `/api` to `http://127.0.0.1:3000` (override with `API_URL`), keeping the original `Host` so the CSRF check passes.

### HTTPS in development (no browser warning)

The dev server switches to HTTPS automatically when `frontend/.certs/` contains a certificate. Use [mkcert](https://github.com/FiloSottile/mkcert) so the certificate is trusted by your OS and browsers:

```bash
sudo dnf install mkcert nss-tools        # Fedora; macOS: brew install mkcert nss; Debian/Ubuntu: apt install mkcert libnss3-tools
```

```bash
mkcert -install                          # one-time: adds a local CA to your trust stores
```

```bash
cd frontend && pnpm certs && pnpm dev    # https://localhost:5173
```

`.certs/` is git-ignored. Without certificates the dev server falls back to plain HTTP.

## Tests and checks

| | Backend | Frontend |
| --- | --- | --- |
| Lint | `pnpm lint` (oxlint) | `pnpm lint` (eslint) |
| Types | `pnpm build` | `pnpm typecheck` |
| Unit | `pnpm test` | `pnpm test` |
| E2E | `pnpm test:e2e:services` once, then `pnpm test:e2e` | |

E2E tests never touch your local MongoDB or Redis:

- They run against throwaway services from the compose `test` profile (`127.0.0.1:27018` and `127.0.0.1:6380`, in-memory, never started by a plain `docker compose up`). Override with `E2E_MONGODB_URL` / `E2E_REDIS_URL`.
- Every run uses its own database (`auth-e2e-<uuid>`) and Redis key prefix (`e2e-<uuid>:`, via `REDIS_KEY_PREFIX`). Cleanup only drops that database and deletes keys under that prefix, never `FLUSHDB`, and refuses to run if either name doesn't match.

CI runs all of the above plus `docker compose build` (`.github/workflows/ci.yml`).

## How it works

### Sessions

```
sign-in ──► Mongo: sessions { _id: sid, userId, ip, userAgent, expiresAt, refreshGeneration: 0, revokedAt?, retainUntil }
        └─► Redis: session:{sid} = { userId, permissions }   (TTL = session lifetime)
        └─► Set-Cookie: __Host-access=<JWT {sub, jti: sid}>                 Path=/                  15 min
        └─► Set-Cookie: __Secure-refresh=<JWT {sub, jti: sid, gen: 0}>      Path=/api/auth/refresh  until session expiry
                        (both HttpOnly; Secure; SameSite=Strict, signed with different secrets)

request ──► verify access JWT ──► Redis GET session:{sid}
              hit  → authenticated (no Mongo round-trip)
              "revoked" tombstone → 401
              miss → fall back to Mongo, re-cache

refresh ──► verify refresh JWT ──► Mongo: findOneAndUpdate({ _id: sid, refreshGeneration: gen, active }, { $inc: refreshGeneration })
              matched → new access + refresh (gen + 1)
              gen < stored generation → token reuse: revoke session, tombstone, 401
              otherwise → 401
```

- The access token is only a signed pointer to a session. Every request is checked against Redis, so revocation is immediate.
- **Refresh tokens rotate and work at most once.** The generation check and increment are one atomic Mongo update, so of two requests presenting the same token only one can win. Presenting an already-used token is treated as theft: the whole session is revoked and a warning is logged.
- The refresh cookie is scoped to `Path=/api/auth/refresh`, so the browser never sends it anywhere else.
- **Multiple tabs:** the client refreshes through a single in-flight promise per tab and the [Web Locks API](https://developer.mozilla.org/docs/Web/API/Web_Locks_API) across tabs. Two tabs never present the same refresh token, so strict one-time use doesn't log users out.
- Revoking writes `revokedAt` in Mongo and a `revoked` tombstone in Redis, so revoked tokens never reach Mongo. The tombstone expires when the token itself would have expired; after that, the JWT check rejects the token before Redis is consulted.
- Session documents have a TTL index on `retainUntil` (default 180 days). Expired and revoked sessions stay queryable for audits until then.
- If Redis is flushed or restarted, nobody is signed out: the guard falls back to Mongo and warms the cache again.

### Permissions

- Permissions (`users:read`, `users:manage`) live on the user document, **not** in the token.
- They are cached alongside the session in Redis, so the same single lookup covers both authentication and authorization.
- When an admin changes someone's permissions, every active session of that user is updated in Redis, so the change applies right away without signing in again.
- Routes declare what they need with `@RequirePermissions(...)`. Everything is authenticated by default. Public routes opt out with `@Public()`.

### API

| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/api/auth/sign-up` | public, rate limited |
| `POST` | `/api/auth/sign-in` | public, rate limited |
| `GET` | `/api/auth/options` | public |
| `POST` | `/api/auth/refresh` | refresh cookie, rate limited (rotates both tokens) |
| `POST` | `/api/auth/sign-out` | session |
| `GET` | `/api/auth/me` | session |
| `GET` | `/api/sessions` | session |
| `DELETE` | `/api/sessions` | session (revoke all other sessions) |
| `DELETE` | `/api/sessions/:id` | session |
| `GET` | `/api/admin/users` | `users:read` |
| `PATCH` | `/api/admin/users/:id/permissions` | `users:manage` |
| `GET` | `/api/health/live`, `/api/health/ready` | public |

### Security measures

- **Validation and sanitization:** Zod schemas with `StandardSchemaValidationPipe`. Input is trimmed, lowercased (emails) and NFC-normalized (names). Unknown keys are rejected (`z.strictObject`). Names are allow-listed to letters, spaces, `'`, `.` and `-`, so markup never gets stored.
- **Output:** responses go through `StandardSchemaSerializerInterceptor` with `@SerializeOptions({ schema })`, so only allow-listed fields leave the API (password hashes can't leak by accident). React escapes everything it renders, and the frontend never uses `dangerouslySetInnerHTML`.
- **NoSQL injection:** Zod only accepts strings where strings are expected, and Mongoose `sanitizeFilter` is on as a second layer.
- **Passwords:** scrypt (N=2^15, r=8, p=3) with a random salt, compared in constant time. Sign-in for unknown emails still runs a hash, so response timing doesn't reveal which accounts exist.
- **Cookies:** `__Host-access` (`Path=/`, no `Domain`) and `__Secure-refresh` (`Path=/api/auth/refresh`), both `HttpOnly`, `Secure`, `SameSite=Strict`. JavaScript can't read them, they only travel over secure contexts, and a sibling subdomain can't set or overwrite the access cookie.
- **Tokens:** access and refresh JWTs use different secrets and audiences, so one can never be used as the other. Payloads are validated with Zod after signature verification.
- **CSRF:** `SameSite=Strict` cookie plus Nest's built-in `enableCsrfProtection()` (Fetch Metadata / Origin check).
- **Headers:** `useSecurityHeaders()` (Helmet defaults) on the API, and a strict CSP on the SPA via nginx.
- **Rate limiting:** `@nestjs/throttler` backed by Redis (shared across instances). Sign-in and sign-up allow 10 requests per minute per IP, then block for 5 minutes.
- **Body limits:** 10 KB JSON at the API, 16 KB at nginx. Prototype-poisoning payloads are rejected by the Node adapter.

### Logging and errors

- Nest `ConsoleLogger` in JSON mode, with sensitive keys redacted (`password`, `token`, `cookie`, ...).
- Every request is logged with method, path, status, duration, IP and a request id (`x-request-id`, generated by nginx and passed through).
- Validation errors come back as `400` with `field: message` entries. The frontend maps these onto the matching form fields.

## Project layout

Each backend domain uses the same layering: controller (HTTP + validation/serialization) → service (business rules) → repository (Mongo access). Repositories return plain domain types from `lean()` queries with typed projections, so Mongoose documents never leave the data layer and the password hash leaves it in only one place (`findCredentials`).

```
backend/src
  auth/            controllers, services (auth, password), guards, decorators, dto, constants, types, utils
  users/           repositories, services, schemas (Mongoose + projections), mappers, dto, constants, types
  sessions/        controllers, repositories (Mongo), services (sessions, Redis session cache), schemas, mappers, dto, constants, types
  admin/           controllers, services, dto
  health/          liveness and readiness (Mongo + Redis)
  common/          app-config (typed ConfigService wrapper + Zod env schema), database helpers (typed projections, Mongo errors), time utils, request logger, shared id schemas
  infrastructure/  Redis client and Redis-backed throttler storage
frontend/src
  features/   auth, sessions, admin (API hooks + UI)
  components/ app shell, shadcn/ui
  router.tsx  route guards via loaders
```

## Not included / next steps

- Email verification and password reset.
- An audit-log viewer for the retained sessions.
- Validation schemas are duplicated between the frontend and backend. A shared package would remove that duplication.
