# SMS Registry Agent Guide

## Read order

1. This file
2. `Docs/plan/ARCHITECTURE_AND_DELIVERY_PLAN.md`
3. `Docs/plan/REMAINING_WORK_AND_UI_PLAN.md`
4. `Docs/plan/IMPLEMENTATION_PLAN.md`
5. `Docs/DECISIONS.md`
6. `Docs/AI_LOG.md`

## Current state

Milestone 0 is complete and its local database/session gates have passed. M1–M5 implementation and evidence gates are now complete: the documented lifecycle, API, database, browser/accessibility, seed walkthrough, and audit-matrix checks pass. The only environment limitation is that WSL Ubuntu 26.04 cannot download the Playwright Chromium binary; the installed Windows Chrome fallback passed the browser suite against the WSL-backed application.

## Non-negotiable rules

- Work in WSL at `/mnt/d/Projects/SMS`; source/Git stay on `D:` for IDE compatibility. Activate `.venv` for Python support tools and use the WSL Node runtime documented in the README. Do not attempt dependency bind mounts or cross-filesystem symlinks in this workspace; they were tested and are unreliable on this WSL setup.
- Never commit `.env`, `.uploads`, `.venv`, credentials, or the confidential assessment PDF.
- Use PostgreSQL and Prisma; never replace persisted data with client `useState` mocks.
- Every mutation is authorized server-side, validates input, records an audit event, and changes schema only with a migration, seed update, and test update.
- Read installed-version documentation before using framework-specific APIs.
- Update this file's current state, the plan checkbox, and `Docs/AI_LOG.md` after each completed milestone.

## Required verification

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, and `npm run build` before completion where the local dependencies exist.
- Day 1 and Day 7 gates: a clean clone must sign in at HTTP localhost using both `npm run dev` and `npm run build && npm run start`.

## Current verification facts

- WSL Node 24.20.0 is available through the project's WSL Node installation; `npm run lint`, `npm run typecheck`, `npm run test` (35 unit tests), and `npm run test:integration` (26 PostgreSQL-backed/API and submission-lifecycle tests) pass from the WSL checkout. WSL Chromium installation is blocked by the current Ubuntu 26.04 Playwright platform support, so the four Playwright/axe tests were verified with the installed Windows Chrome binary against a WSL-backed production server; all passed.
- `npm run db:reset` was re-run successfully on October 12, 2026, applying migration `0001_initial` and reseeding the development database before the latest full validation.
- Docker Desktop is installed but its CLI is not on PATH. Use `C:\Program Files\Docker\Docker\resources\bin\docker.exe` from Windows to manage `compose.yaml`; containers expose development PostgreSQL at `localhost:5432` and test PostgreSQL at `localhost:5433`.
- `npm run setup` applied the migration and seeded the development database. WSL development and production servers returned HTTP 200 for the persona picker and staff routes; the seeded Student persona loaded the student home successfully. The seed/persona walkthrough and mutation audit matrix are documented in `Docs/plan/MANUAL_WALKTHROUGH.md`.
