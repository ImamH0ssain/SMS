# SMS Registry Implementation Board

> Read [ARCHITECTURE_AND_DELIVERY_PLAN.md](ARCHITECTURE_AND_DELIVERY_PLAN.md) before using this board. It is the complete v4 architecture, data/rules/API/seed/test specification. Execute the remaining work in [REMAINING_WORK_AND_UI_PLAN.md](REMAINING_WORK_AND_UI_PLAN.md). This file is deliberately the concise current-state checklist.

## Environment decision

All development and verification run inside WSL from `/mnt/d/Projects/SMS`; source remains at `D:\Projects\SMS` for IDE compatibility. Activate `.venv` for Python support tools and use the WSL Node runtime. Native dependency bind mounts and Windows-to-WSL symlinks were tested but rejected as unreliable in this environment. PostgreSQL data belongs in a Docker/Linux volume, not in the repository.

## Milestones

- [x] M0: WSL toolchain, exact package lock, project shell, documentation, environment validation, demo session, migration/seed, and both local-HTTP cookie gates.
- [x] M1: Programmes, modules, fee rules, atomic enrolment, ID generation, student search/edit/status transitions.
- [x] M2: Fee assignment snapshots, payments, voids, adjustments, derived balance, overdue work queue.
- [x] M3: Assessments, eligibility, local document storage, upload/download, revisions and late state, student assessment page.
- [x] M4: Results grid, classification, publication lifecycle, student home and results views.
- [x] M5: Route/API coverage, accessibility pass, complete seed, README, clean-clone verification and submission review.

## Scope boundaries

Required: the four Registry workflows, PostgreSQL + Prisma, Staff and Student views, role/ownership enforcement, API routes, seed data, README and tests.

Deferred until all required work passes: deployment, real credentials, CSV export, CI, bulk publication, payment gateway, refunds, reporting, imports, attendance, timetable and parent portal. Playwright and axe are required verification tooling for this handoff.

## End gates

- [x] `npm run dev` permits a demo persona to sign in at local HTTP (`http://localhost` or `http://127.0.0.1` when Windows Chrome reaches a WSL server).
- [x] `npm run build && npm run start` permits the same local HTTP sign-in.
- [x] No confidential brief, `.env`, `.uploads`, `.venv`, or secrets appear in Git.
- [x] README-only setup works from a fresh clone and empty local database.

## Verification status (current)

Docker Desktop PostgreSQL containers are running on local ports 5432 (development) and 5433 (test). The migration applied, deterministic seed completed, and the test schema can be restored after an ephemeral-container restart with `bash scripts/migrate-test-db.sh`. The current UI/component pass has passed `npm run lint`, `npm run typecheck`, `npm run test` (35 tests), `npm run test:integration` (26 PostgreSQL-backed workflow, lifecycle, API contract, and submission-lifecycle tests), and production build output generation. WSL Chromium installation is blocked by the current Ubuntu 26.04 Playwright platform support; the installed Windows Chrome fallback ran all four Playwright/axe tests successfully against a WSL-backed production server. `npm run db:reset` was also re-run successfully on October 12, 2026. Both local-HTTP sign-in gates were previously exercised with a seeded Staff user. In both modes, `POST /api/session` returned `200`, issued an `HttpOnly; SameSite=Lax` cookie without `Secure`, and that cookie loaded `/staff/dashboard` with `200`.
