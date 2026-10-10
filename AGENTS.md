# SMS Registry Agent Guide

## Read order

1. This file
2. `docs/plan/ARCHITECTURE_AND_DELIVERY_PLAN.md`
3. `docs/plan/REMAINING_WORK_AND_UI_PLAN.md`
4. `docs/plan/IMPLEMENTATION_PLAN.md`
5. `docs/DECISIONS.md`
6. `docs/AI_LOG.md`

## Current state

Milestone 0 is complete and its local database/session gates have passed: WSL tooling, strict project scaffold, Prisma schema, demo session, documentation, migration/seed, integration constraints, and both local-HTTP sign-in modes are verified. M1–M4 source implementation is in progress and must not be marked complete until their broader database-backed workflow tests pass.

## Non-negotiable rules

- Work in WSL at `/mnt/d/Projects/SMS`; source/Git stay on `D:` for IDE compatibility. Activate `.venv` for Python support tools and use the WSL Node runtime documented in the README. Do not attempt dependency bind mounts or cross-filesystem symlinks in this workspace; they were tested and are unreliable on this WSL setup.
- Never commit `.env`, `.uploads`, `.venv`, credentials, or the confidential assessment PDF.
- Use PostgreSQL and Prisma; never replace persisted data with client `useState` mocks.
- Every mutation is authorized server-side, validates input, records an audit event, and changes schema only with a migration, seed update, and test update.
- Read installed-version documentation before using framework-specific APIs.
- Update this file's current state, the plan checkbox, and `docs/AI_LOG.md` after each completed milestone.

## Required verification

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, and `npm run build` before completion where the local dependencies exist.
- Day 1 and Day 7 gates: a clean clone must sign in at HTTP localhost using both `npm run dev` and `npm run build && npm run start`.

## Current verification facts

- `npm run typecheck` and `npm run test` pass after the latest source changes (17 unit tests); `npm run test:integration` passes with two real database-constraint tests.
- Docker Desktop is installed but its CLI is not on PATH. Use `C:\Program Files\Docker\Docker\resources\bin\docker.exe` from Windows to manage `compose.yaml`; containers expose development PostgreSQL at `localhost:5432` and test PostgreSQL at `localhost:5433`.
- `npm run setup` applied the migration and seeded the development database. Both HTTP cookie gates passed under dev and `build && start`; do not claim M1–M5 end-to-end workflow coverage until those specific integration tests are added and pass.
