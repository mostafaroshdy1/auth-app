# How I used AI on this project

I used Claude Code for this task. My role was architect and reviewer. I made the design decisions, read the output, and kept sending it back until it matched how I'd want a production codebase to look. The AI did most of the typing: scaffolding, boilerplate, tests, Docker setup, and the first draft of every file. I decided what got built and what wasn't good enough yet.

## Starting with the architecture, not the feature

I didn't open with "build a sign-up page". My first prompt was a list of constraints I'd already decided on:

- NestJS 12 with the new `NodeAdapter`, the latest React with shadcn/ui and TanStack Query, and the whole thing running from one `docker-compose.yml`.
- **Server-side sessions in MongoDB with a TTL index (around six months)**, so there's an audit trail of who signed in, from where, and when.
- **Every session visible to the user and revocable**, which is also the protected endpoint the brief asked for.
- **Redis as the revocation check**, keyed by the token's `jti`, so a normal request never has to hit Mongo.
- **Permissions in the database, not in the token.** I didn't want stale permissions in a JWT that can't be taken back. I asked the AI to challenge this if it saw something better.
- Nest's built-in JSON logs, minimal comments, and one human-sounding commit.

I also set the working rules: read the official docs first (NestJS 12 is newer than the model's training data), ask me before any design decision, and remind me of anything in the brief I hadn't covered. Those rules mattered more than anything else I wrote. With the docs in hand, it used Nest 12's built-in cookies, `useSecurityHeaders()`, `enableCsrfProtection()` and `StandardSchemaValidationPipe` instead of reaching for `cookie-parser`, `helmet` and `class-validator` out of habit.

## Decisions I made

Before writing code, the AI came back with questions. I answered them:

- **Permissions** live in Mongo and are cached in Redis alongside the session. One Redis lookup covers both "who is this?" and "what can they do?". When an admin changes someone's permissions, every live session of that user picks up the change immediately, with no re-login.
- **Admin sign-up toggle:** kept for the demo, but behind `ALLOW_ADMIN_SIGNUP`, which is off by default. A public "make me admin" checkbox is fine for a demo and a hole anywhere else.
- **Retention vs. login lifetime.** A sign-in lasts days; the session record stays for 180 days for auditing.
- **Custom auth instead of `@nestjs/authentication`.** The new first-party package covers some of this. I kept my own implementation because the session and permission model is the point of the exercise.

## Review: what I sent back

Most of my time went into reviewing the generated code and pushing it toward something I'd sign off on in a real code review. These all came from me:

- **Validation:** Zod with `StandardSchemaValidationPipe`, not class-validator, with proper sanitization. That produced trimming and normalization in the schemas, `strictObject` to reject unknown fields, an allow-list for names, and `sanitizeFilter` against NoSQL injection.
- **Serialization:** `@SerializeOptions({ schema })` on every route. The first version mapped responses by hand. With response schemas, only listed fields leave the API, so a password hash can't slip out.
- **Type safety:** I flagged `.select('+passwordHash')` as stringly typed. It also left the `User` type claiming a password hash existed on every query. The fix was typed projections (a misspelled field fails to compile) and a domain `User` type with no hash at all. Exactly one repository method returns credentials.
- **Repositories per domain:** services no longer talk to Mongoose directly, every read is `lean()`, and Mongoose documents never leave the data layer.
- **Project structure:** I didn't like flat module folders. Each domain is now split into controllers, services, repositories, schemas, DTOs, mappers and types.
- **No loose helpers in service files:** constants, mappers and utilities moved out. That also produced a dedicated session-cache class.
- **Config:** I wrapped `ConfigService` in a typed `AppConfigService`, the same pattern I use in my own projects.
- **Rate-limit options:** `satisfies Parameters<typeof Throttle>[0]`, so a typo in the options fails to compile.
- **Lean controllers:** no logic in controllers, and an explicit `@HttpCode` on every route.
- **Cookies and HTTPS:** secure `HttpOnly` cookies everywhere, plus a dev server on real HTTPS with no browser warning (Vite + mkcert).
- **Refresh tokens with strict rotation:** each refresh token works once. Replaying a used one revokes the whole session as suspected theft.
  - Early on I'd agreed with the AI that a single cookie was enough because revocation was already instant.
  - On reflection I wanted short-lived access tokens and theft detection, so I changed course.
  - The AI pointed out that multiple browser tabs could trip the one-time rule. We handle that on the client with a cross-tab lock rather than loosening the rule on the server.
- **E2E isolation:** during development the e2e suite connected to a Redis container I already had running locally and wiped one of its databases. I had it fixed properly: dedicated test services, a unique database and key prefix per run, and cleanup that refuses to touch anything else.

I also asked questions that led to fixes. For example, when I asked how long revoked-session markers stay in Redis, the answer exposed that they lived longer than needed. They now expire when the token would have.

## What the AI got wrong, and how it was caught

Running the real stack turned up problems the unit tests didn't. The AI found these by running a smoke script against the API and by using the app in a browser through the full Docker setup:

- shadcn's generator imported `cn` from a non-existent package and pulled in `next-themes`.
- Mongoose's `sanitizeFilter` blocked the app's own `$gt` and `$in` queries.
- The community Redis rate-limiter package didn't support Nest 12, so a small Lua-based replacement was written.
- Behind nginx, and later through Vite's dev proxy, every POST failed the CSRF check because the `Host` header was being rewritten.
- The e2e suite set its config after the app had already loaded it.
- Dropping the test database at runtime silently removed the unique email index, so duplicate sign-ups slipped through. There's now a test for it.

## What worked

- **Constraints up front, decisions kept with me.** The AI was fast and thorough when the direction was clear, and it asked when it wasn't.
- **Official docs over memory.** This was the single biggest quality lever on a framework version this new.
- **Reviewing like a teammate's PR.** Short, specific comments ("controllers must be lean", "this isn't type-safe", "no helpers at the top of service files") turned into consistent changes across the codebase, not one-off patches.
- **Verifying in the running app.** Every change was checked against the real compose stack, not just tests.
