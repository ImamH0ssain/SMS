# Working on SMS Registry

A guide for anyone changing this codebase, whether a person or a coding agent. It explains what the project is, how to run and verify it, and the rules that keep it correct. For setup and usage see the [README](README.md); for the full design see [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md).

## What this is

A Registry module for a Student Management System. It covers four workflows: student enrolment, fees and payments, assessment submissions, and results publishing. It is built with Next.js 16 (App Router), React 19, TypeScript, PostgreSQL, Prisma 7, Tailwind CSS 4 and Zod. Staff and student roles are enforced on the server. Sign-in is a demo mechanism with seeded accounts and no passwords.

## Commands

```bash
npm ci                     # install (also generates the Prisma client)
npm run setup              # generate client, apply migrations, load demo data
npm run dev                # development server on http://localhost:3000
npm run build && npm run start    # production build and server

npm run lint
npm run typecheck
npm run test               # unit tests
npm run test:integration   # PostgreSQL integration tests (uses TEST_DATABASE_URL)
npm run test:e2e           # Playwright browser tests with axe
```

Integration tests need the separate test database. If its container was recreated, run `bash scripts/migrate-test-db.sh` first. Settings live in `.env` (copy `.env.example`).

## Before you call a change finished

Run lint, type checking, the unit tests and the integration tests, and run `npm run build` for anything that touches routing, configuration, server or client boundaries. Report what you actually ran and what it printed. If a check could not run, say so rather than assuming it passes. For interface changes, click through the affected pages as both staff and a student.

## Where things live

| Path | Contents |
|---|---|
| `src/app/staff`, `src/app/student` | Pages for each role |
| `src/app/actions` | Server actions |
| `src/app/api` | JSON route handlers |
| `src/features/<area>` | Business logic: `students`, `finance`, `assessments`, `submissions`, `results` |
| `src/components` | Shared components; `ui/` holds base primitives |
| `src/lib` | Session, environment, errors, money, clock and formatting, storage |
| `prisma` | Schema, migrations, seed |
| `tests` | Integration and browser tests |

## Rules that matter

**Access control**
- Every page, server action and route handler must call its own guard (`requireStaff`, `requireStudent` or `requireOwnStudent`). Do not rely on a layout or on `proxy.ts` for protection.
- The session cookie identifies the user and nothing else. Role and student link are always loaded from the database.
- Student-facing queries must filter by the student's own id, and for results by the Published status, inside the query itself. A draft or withheld result must be indistinguishable from none.
- Another student's resource returns 404, not 403.

**Data and rules**
- Put business rules in the feature services so pages, actions and the API share them. Do not duplicate a rule in a component or a route.
- Every state change writes its audit event in the same transaction as the change.
- Money is an integer number of pennies. Parse it with the shared money helpers and never use floating-point arithmetic for amounts.
- Format dates with the shared `formatDate` and `formatDateTime` helpers. Deadlines use the organisation time zone; date-only values such as fee due dates and dates of birth are formatted in UTC.
- Balances are derived (fee plus adjustments minus active payments). Do not add a stored balance.
- Payments, adjustments, audit events and submission revisions are append-only. Correct mistakes with a void or an adjustment, not an edit.
- Anything that checks a balance or limit and then writes must do so inside a transaction that locks the relevant row.
- Validate input with Zod and the domain rules at the edge, and return errors in the standard envelope: `{ error: { code, message, fieldErrors } }`.

**Uploads**
- Only PDF and DOCX, up to `MAX_UPLOAD_MB` (at most 4). Decide by file content, not by extension or declared type. Store under random names outside `public/` and never serve a file without an access check.

**Schema changes**
- Any schema change needs a migration, an update to the seed, and a test. Keep database constraints in step with the rules in code.

**Interface**
- Forms are full pages with field-level errors and an announced summary. Status is always text as well as colour. Prefer native controls where they are sufficient.

## Framework notes

Next.js 16 and Prisma 7 differ from older versions in ways that are easy to get wrong from memory: request APIs such as `params`, `searchParams` and `cookies()` are asynchronous, middleware is now `proxy.ts`, and Prisma's connection settings live in `prisma.config.ts` and use a driver adapter. Check the documentation shipped with the installed versions before using an API you are unsure about.

## Things not to do

- Do not commit `.env`, `.uploads`, credentials, or the assessment brief.
- Do not widen the demo mechanism, or enable it in a shared deployment, without replacing it with real authentication.
- Do not store files under `public/` or by their original names.
- Do not use `db:reset` against anything but a local database. The script refuses non-local hosts; keep it that way.
- Do not commit generated output such as the Prisma client, build folders or test reports.

## Documentation

Keep the documents in step with the code. If you change behaviour, update the relevant page: [README](README.md) for setup and usage, [Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) for design and rules, [Docs/DECISIONS.md](Docs/DECISIONS.md) when you make a judgement call, and [Docs/AI_LOG.md](Docs/AI_LOG.md) when AI tools materially shaped the work.
