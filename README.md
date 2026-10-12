# SMS Registry

A focused Student Management System Registry module for enrolment, fee tracking, submission handling, and controlled result publication. It is deliberately a real PostgreSQL application rather than a browser-only prototype. The complete approved architecture, workflow rules, API contract, seed matrix, and test plan are in [Docs/plan/ARCHITECTURE_AND_DELIVERY_PLAN.md](Docs/plan/ARCHITECTURE_AND_DELIVERY_PLAN.md).

## Architecture

```text
Browser → Next.js App Router → server guards/actions/route handlers
                              → domain services + Zod rules
                              → Prisma transactions + audit events → PostgreSQL
                              → LocalDiskAdapter → private .uploads directory
```

The home page exposes only designated seed personas. A signed, `httpOnly` JWT cookie contains the subject only; each request resolves the current role and linked student record from PostgreSQL. Staff and student ownership checks are performed on the server, not by the UI.

## Quick start

Prerequisites: Node.js 20.19+ (or a supported newer LTS), npm, and PostgreSQL 14+ (Docker Compose is convenient but not required).

```bash
cp .env.example .env
npm ci
npm run setup
npm run dev
```

`npm run setup` applies the Prisma migrations and deterministic demo seed. If using the included Compose database, start it first:

```bash
docker compose up -d
npm run setup
npm run dev
```

Alternatively, point `DATABASE_URL` in `.env` at any reachable PostgreSQL database and run the same setup commands.

### WSL and Docker notes

WSL is optional. When using WSL, run commands from the Linux checkout path and use the Node/npm installation available in that environment. Docker Desktop users may need to enable WSL integration or invoke Docker from the host operating system; these are environment-specific details and are not required by the application.

When the server runs in WSL and the browser runs on Windows, use `http://127.0.0.1:3000/` in Windows Chrome if `http://localhost:3000/` resolves to IPv6 (`::1`) and times out. WSL localhost forwarding is environment-dependent; this does not require HTTPS or a virtual environment.

The supplied development secret and demo mode are intentionally usable locally. Replace `SESSION_SECRET` and set `ENABLE_DEMO_SESSION=false` before any public deployment. The application itself has no default deployment target.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Local PostgreSQL database URL. |
| `TEST_DATABASE_URL` | Isolated integration-test database URL. |
| `SESSION_SECRET` | HS256 secret, at least 32 characters. |
| `ENABLE_DEMO_SESSION` | Enables seeded demo personas and session test endpoint. |
| `COOKIE_SECURE` | `auto`, `true`, or `false`; auto derives HTTPS from the request. |
| `ORGANIZATION_TIMEZONE` | Display and business-date time zone; defaults to `Europe/London`. |
| `APP_CURRENCY` | Application-wide currency; defaults to `GBP`. |
| `UPLOAD_DIR` | Private local upload directory; defaults to `.uploads`. |
| `MAX_UPLOAD_MB` | Maximum PDF/DOCX upload size; defaults to 4. |

## Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:integration`, `db:migrate`, `db:seed`, `db:reset`, and `setup` are defined in `package.json`.

`db:reset` refuses non-local database hosts. Integration tests must use `TEST_DATABASE_URL`, never the development database. If Docker's ephemeral test container was recreated, apply its schema before running integration tests:

```bash
bash scripts/migrate-test-db.sh
npm run test:integration
```

## Demo data

The deterministic seed creates two Staff accounts, nine Students, two Programmes, three Modules, fee rules, and both PDF/DOCX upload fixtures. It includes fully paid, overdue, future-due, deferred, withdrawn, and completed Students; voided payments and an adjustment; late and resubmitted work; open, past-deadline, and closed assessments; and result boundaries 39, 40, 59, 60, 69, and 70.

Demo Student personas cover: a new upload, an allowed resubmission, a late-submission display, an overdue balance, and published-result display.

## Key workflow rules

| Area | Behaviour |
|---|---|
| Enrolment | One transaction creates a Student, linked user, fee snapshot, ID, and audit event. A fee rule is required. |
| Finance | Balance is derived: fee snapshot + adjustments − active payments. Payments lock the assignment row to prevent concurrent overpayment. |
| Submissions | First submissions may be late while an assessment is open; resubmissions stop at the deadline. PDF/DOCX files are restricted to 4 MB and DOCX ZIP metadata is inspected. |
| Grading | The grid is the union of eligible Students, previous submitters, and existing result holders. A withdrawn submitter remains gradeable. |
| Results | Publication requires an explicit checkbox if fees are overdue. Draft and withheld results are invisible to Students. |

## API conventions and examples

All API handlers return either `{ "data": ... }` or `{ "error": { "code", "message", "fieldErrors?" } }` and use `400`, `401`, `403`, `404`, `409`, `422`, or `500` consistently.

```bash
# Sign in using a seeded demo user ID from the persona picker.
curl -i -X POST http://localhost:3000/api/session \
  -H 'content-type: application/json' \
  -d '{"userId":"<seeded-demo-user-id>"}'

# The returned session cookie is then required by protected APIs.
curl -b 'sms_demo_session=<token>' \
  'http://localhost:3000/api/students?q=Amina'
```

Primary endpoints cover students, payments and voiding, programmes/modules/fee rules, assessments and uploads, protected revision downloads, results, the overdue queue, and Student-specific assessment/result projections. See `Docs/plan/IMPLEMENTATION_PLAN.md` for the complete route list.

## Testing and verification

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run build
```

Unit coverage includes classification and result-publication rules, student ID widening and transition rules, financial/date boundaries, and submission/ZIP safety. Database integration coverage additionally requires the local PostgreSQL containers. Before submission, verify a clean clone can sign in over HTTP localhost under both `npm run dev` and `npm run build && npm run start`; `COOKIE_SECURE=auto` deliberately derives the secure flag from the request protocol rather than build mode.

## Security and limitations

- Uploads are private, UUID-keyed files outside `public/`; downloads check role/ownership and use `nosniff` and `private, no-store` headers.
- The app sends `nosniff`, frame-denial, and strict referrer-policy headers globally.
- This assessment build intentionally uses demo identities rather than passwords/SSO, a local-disk storage adapter rather than object storage/virus scanning, and no payment gateway, reporting, CSV export, or deployment pipeline.
- Do not commit the supplied assessment brief, `.env`, `.uploads`, `.venv`, generated Prisma client, or any credentials.

## Decisions and AI use

The decision record, delivery board, and factual AI-assistance log are maintained in [`Docs/DECISIONS.md`](Docs/DECISIONS.md), [`Docs/plan/IMPLEMENTATION_PLAN.md`](Docs/plan/IMPLEMENTATION_PLAN.md), and [`Docs/AI_LOG.md`](Docs/AI_LOG.md). The human reviewer must check and correct the AI log before submission.
