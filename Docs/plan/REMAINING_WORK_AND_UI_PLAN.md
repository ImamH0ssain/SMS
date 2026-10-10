# SMS Registry: Remaining Work and Professional UI Completion Plan

## Purpose and operating rule

This plan closes the gap between the existing functional prototype and an assessment-ready Registry module. It does **not** expand the approved product scope: the system remains focused on enrolment, finance, submissions, and results. Work proceeds in dependency order; a phase is not complete until its acceptance checks, test additions, documentation update, and audit coverage are complete.

The authoritative product rules are in `ARCHITECTURE_AND_DELIVERY_PLAN.md`. This document answers four practical questions:

1. What is currently present versus incomplete?
2. What must be added for every assessed workflow to be demonstrably correct?
3. What professional UI system will replace the present minimal custom interface?
4. What evidence will prove readiness for review/submission?

## Current-state gap assessment

| Area | Present | Remaining to reach assessment-ready standard |
|---|---|---|
| Persistence and session | PostgreSQL, Prisma migration, seed, HTTP-only demo session, guards, development/production local-HTTP cookie gates. | Broader authorization and lifecycle integration coverage. |
| Catalogue and enrolment | Programme/Module/rule APIs, transactional enrolment, IDs, basic filtering/edit UI. | Validated field feedback, duplicate-confirmation UX, audit timeline view, integration tests for rollback/concurrent IDs/activity restrictions. |
| Finance | Derived balance, payment row lock, void action, overdue queue, DB amount checks. | Adjustment service/UI, clear void confirmation, ledger presentation, overpayment/race/void integration tests. |
| Submissions | Eligibility, PDF/DOCX validation, private storage, revisions, download authorization. | Browser-quality upload states/messages, staff revision history, authored integration tests for upload lifecycle/ownership, accessible error UX. |
| Results | Grid union, classification, state rules, optimistic version update, overdue override. | Purpose-built grading interface, explicit withhold/retract confirmation, state-specific feedback, integration tests for stale writes/override audit/student secrecy. |
| UI | Basic server-rendered custom CSS, navigation, tables, forms. | Tailwind v4 token system, shadcn/ui primitives, responsive layouts, loading/empty/error states, accessible dialogs/toasts, consistent content hierarchy. |
| Quality evidence | Unit tests, two DB constraint integration tests, build/lint/typecheck, cookie gates. | Domain lifecycle integration suite, API contract suite, accessibility pass, seeded walkthrough, clean-clone README check. |

## Completion principles

- Keep server components and feature services authoritative. Client components exist only for interaction polish: controlled filters, dialogs, toasts, file inputs, and optimistic presentation—not authorization or persistence.
- Use `FormData`/Server Actions for small forms and the existing multipart Route Handler for document uploads. Every mutation calls a service which validates, changes data, and writes audit data in one transaction.
- Preserve URL-backed navigation state (`q`, programme, year, status, page, assessment) so every staff worklist is bookmarkable and refresh-safe.
- No bulk operations, charts, CSV, payment gateway, authentication provider, attendance, scheduling, or parent portal until all required gates pass.
- Do not rewrite correct domain code merely to fit a UI component. Adapt the presentation boundary and add tests around existing business rules.

## Target UI architecture

### Design-system choice

Adopt Tailwind CSS v4 for layout, responsive styling, spacing, colour, typography, and state variants. Add shadcn/ui as source-owned primitives built on Radix, rather than a black-box dependency. Use the installed Next/React version's compatible stable component versions only; pin additions in `package-lock.json`.

Install/configure only these primitives for scope:

| Primitive | Required use |
|---|---|
| `Button`, `Input`, `Label`, `Textarea`, `Select`, `Checkbox` | All forms; no ad-hoc controls. |
| `Card`, `Badge`, `Separator` | Content grouping, status, and visual hierarchy. |
| `Table` | Worklists, ledger, grading grid, results. |
| `Dialog`, `AlertDialog` | Publish/retract, payment void, and destructive confirmation only. |
| `Alert`, `Skeleton`, `Empty` (local composition if needed) | Error, loading, no-result states. |
| `DropdownMenu` | Compact persona switch/mobile navigation. |
| `Tooltip` | Icon-only actions and truncated labels. |
| `Sonner` or equivalent accessible toast | Successful mutations and concise non-field failure notice. |

Do not add a component library twice, do not use a dashboard template, and do not introduce animated/marketing UI. The product is an operations tool: dense but legible tables, obvious priority, predictable actions, and careful status colour use.

### Tokens, visual language, and responsive rules

Define application tokens once in `src/app/globals.css` using Tailwind v4 theme variables:

| Token class | Decision |
|---|---|
| Surfaces | Neutral/slate page canvas; white cards; a single elevated side navigation surface. |
| Brand/action | Deep blue for primary actions/links; never use colour alone for state. |
| State colours | Green = paid/published/success, amber = warning/late/withheld, red = overdue/error/withdrawn action, slate = draft/neutral. Every badge includes text. |
| Typography | Inter or system sans; 12–14 px metadata, 14–16 px body, 20–24 px route heading; use tabular numerals for money/grades/IDs. |
| Spacing | 4 px base; 16/24 px card padding; 24/32 px route section gaps. |
| Radius/shadow | Restrained 6–8 px radius, one subtle card shadow, visible focus ring. |
| Breakpoints | Desktop: persistent sidebar + content. Tablet: compact sidebar. Mobile: topbar + drawer; tables scroll horizontally with first identifier column retained. |

Accessibility baseline:

- keyboard-visible focus everywhere; no action is hover-only;
- semantic heading sequence; one `h1` per route;
- explicit labels for every control; help/error text connected through `aria-describedby`;
- server validation error summary at the top of each failed form using `role=alert`, with field-level messages;
- dialogs trap focus, name the consequence, and return focus to their trigger;
- minimum AA contrast; status text/icon survives monochrome viewing;
- reduced-motion respected; no essential information appears only in a toast.

### Shared application shell

Implement these reusable components before individual route redesign:

| Component | Behaviour |
|---|---|
| `AppShell` | Staff/student navigation, route title slot, global demo banner, responsive mobile drawer. |
| `DemoIdentityBar` | “Demo mode — viewing as Name (Role)”, persona switch, no false production-auth implication. |
| `PageHeader` | Eyebrow, title, one-sentence task description, primary action, optional secondary action. |
| `FilterBar` | URL-backed fields, Apply/Clear buttons, active-filter count; resets page to 1. |
| `DataTableFrame` | Loading skeleton, empty state, error state, horizontal scroll wrapper, pagination footer. |
| `StatusBadge` | Central mapping for Student, payment, submission, assessment, and result states. |
| `Money`, `DateTime`, `StudentIdentity` | Formatting/presentation-only helpers to eliminate inconsistent display. |
| `ConfirmActionDialog` | Requires an explicit reason when rules need one; disables confirm while mutation pending. |
| `FormErrorSummary` | Receives structured `fieldErrors`; focuses on submission failure. |

## Route-by-route UI plan

### `/` — persona picker

Goal: make demonstration intent immediately clear without resembling a login directory.

- Two Staff cards appear first, then a labelled “Student scenarios” group.
- Each Student card shows name, Student ID, programme, and one purposeful scenario chip: `Published result`, `Overdue balance`, `Late submission`, `Resubmission available`, or `Withdrawn historic work`.
- Use only seeded `isDemoPersona` users; no search field.
- Include a concise scope note: “Demo identities only; server checks every role and ownership decision.”
- Empty state if seed data has not run: explain `npm run setup`, not a generic error.

Acceptance: full keyboard selection, Staff/Student groups are distinguishable, all cards fit without horizontal overflow at 320 px.

### Staff shell and `/staff/dashboard`

Goal: an action queue, not a vanity dashboard.

- Header: “Registry work queue”, current date/time zone metadata, no decorative greeting.
- First row: four compact counters: overdue accounts, open assessments, draft results, withheld results. Each counter links to a filtered worklist.
- Primary panel: `Overdue accounts` table: Student identity, status, due date, days overdue, balance, action “Open record”. Sort by longest overdue first.
- Secondary panels: `Assessment actions` (past deadline/open and close-ready items) and `Result actions` (draft/withheld). Each has an empty state and a direct route link.
- Do not use charts: they add no decision value for this scope.

Acceptance: the highest-risk queue is visible without scrolling on a standard desktop; every count has a destination; inactive Students keep visible debt badges.

### `/staff/students` — worklist

- Use `FilterBar`: search, Programme, academic year, status; active filters appear as removable chips.
- Table columns: Student (name + code), Programme, Year, Status, Balance, Last activity, row action. Balance is server-derived—not a stored field.
- Keep stable 20-item pagination, show “1–20 of N”, preserve filters in next/previous links.
- Row click and keyboard Enter open the record; an explicit “View” link remains for accessibility.
- Empty state distinguishes no Students at all from no matches.

Acceptance: case-insensitive name/code query, filters survive refresh, no unbounded list query, all sortable/derived labels have accessible text.

### `/staff/students/new` — enrolment

- Card-based form grouped as `Identity`, `Academic placement`, `Confirmation`.
- Show a non-editable Student ID preview as `SMS-<year>-next available`; label it provisional until submit because the counter is transactional.
- Programme/year selection calls a server-provided availability check or displays existing fee-rule availability after submit; never trusts a client fee value.
- Duplicate warning response retains all entered fields and presents choices: revise record or check “Continue despite possible duplicate.”
- Success redirects to the record with a toast; failure uses summary + field errors.

Acceptance: a missing fee rule, bad DOB, duplicate email, and possible duplicate each produce different useful feedback; browser back does not lose input where feasible.

### `/staff/students/[code]` — 360° record

- Header: Student identity, programme/year, status badge, `Edit record` primary/secondary action appropriate to role.
- Summary strip: derived balance, due date/overdue state, submission count, result state/count.
- Tabbed sections or vertically stacked cards (choose tabs only if state is URL-addressable):
  - `Overview`: demographics/status reason.
  - `Finance`: assignment snapshot, balance formula breakdown, ledger, record payment action, adjustment action, void history.
  - `Academic`: assessments/submissions/results with download links.
  - `Audit`: reverse-chronological audit timeline with actor, action, local timestamp, concise metadata diff.
- Never hide voided payment/withdrawn status history; use muted visual treatment, not deletion.

Acceptance: staff can understand the current balance and history without opening a second screen; audit data is readable and safely formatted.

### `/staff/students/[code]/edit`

- Prefill current record. Student ID and DOB are clearly read-only after enrolment unless the approved model permits a change (current model does not).
- Changing Programme/year reveals an inline warning: permitted only before finance/academic activity; submit is server-enforced regardless.
- Status selection conditionally reveals required reason for deferred/withdrawn, with 500-character counter.
- Terminal statuses explain they cannot transition again.
- Confirmation dialog only when changing to withdrawn/completed if required by interaction testing; validation remains server-side.

Acceptance: blocked post-activity Programme/year change returns to form with clear reason; terminal transition does not misleadingly appear editable.

### `/staff/settings/programmes`

- Three compact, linked panels/tabs: Programmes, Modules, Fee rules.
- Tables show active state and dependencies; forms create/edit one item at a time.
- Fee-rule form shows currency as read-only `GBP`, captures amount and local due date, and prevents duplicate Programme/year pairs with useful conflict feedback.
- Do not introduce deleting catalogue records in this scope; use activation state where required.

Acceptance: a staff member can add a Programme, Module, and matching fee rule, then enrol a Student without database manipulation.

### `/staff/assessments` and `/staff/assessments/[id]`

- List columns: title/module, academic year, deadline with relative state, submission count, open/closed state, grade-state summary, row action.
- Creation form groups `Assessment identity` and `Availability`, showing Module → Programme context.
- Detail header exposes deadline, state badge, and actions: edit deadline, close/reopen, open grading grid.
- Worklist columns: Student, eligibility/history rationale where non-current, current revision, revision count, submitted timestamp, late status, download action.
- Deadline/close/reopen flows use explicit confirmation copy explaining existing late flags are not recalculated.

Acceptance: a withdrawn historic submitter is visibly retained in the worklist and grid; all downloads use authorised endpoint links.

### `/staff/results` — grading workspace

- Assessment selector is URL-backed and shows deadline/state context.
- Sticky grid header: Student, status/submission, latest file, grade, classification, result state, action.
- Rows differentiate `Not submitted`, `Submitted`, `Late`, `Withdrawn historical`, and `Historic result` without using colour alone.
- Editing model: clicking “Grade” expands a controlled row/panel. Grade input immediately previews classification client-side but server validates it.
- State actions are explicit:
  - Save draft: no dialog.
  - Withhold/retract: dialog requires reason.
  - Publish: dialog shows grade/classification, overdue balance warning if applicable, and requires explicit “publish despite overdue debt” confirmation.
- On `409` version conflict: leave entered grade/reason visible, announce “This result changed elsewhere”, provide Reload action.

Acceptance: no draft/withheld grade appears in a Student projection; audit event stores publication override; staff can recover from conflict without guessing what changed.

### `/student/home`, `/student/assessments`, `/student/results`

- Home is calm and personal: balance/due date/overdue alert first, then next open assessment, published-result count, clear paths to work/results.
- Assessments display deadline in organisation time, state, current revision name/timestamp, late indication, and one upload/resubmit action. Resubmission is disabled with an explanatory message after the deadline; a first late upload remains available while open.
- Use an upload progress/pending treatment; after success, refresh the row and show revision number. Validate the same allowed types/size visibly before submit but retain server enforcement.
- Results table only includes published grade, classification, module, assessment, published date. Do not expose withheld/draft placeholders or result counts that reveal them.

Acceptance: each seeded Student scenario demonstrates its intended path; cross-student URL/API guessing yields `404`.

## Detailed engineering work plan

### Phase A — establish the component system and error contract

1. Verify Tailwind v4 integration against installed Next version; add the shadcn registry/configuration only after lockfile review.
2. Add source-owned primitives and shared components listed above. Migrate one representative route first (`/staff/students`) to establish patterns.
3. Implement `loading.tsx`, `error.tsx`, and `not-found.tsx` boundaries for staff/student route segments. Error boundary logs server-safe diagnostic ID, displays retry/action path, and never leaks database errors.
4. Standardise Server Action result shape or a `useActionState` adapter that carries field errors, form values, and success message. Do not replace existing API envelope.
5. Add component tests for StatusBadge mappings, FormErrorSummary focus, and confirmation-dialog reason requirement.

Gate: all existing routes compile, keyboard navigation works through shell/form primitives, no raw inline action button/input styling remains in migrated route.

### Phase B — finish Student and catalogue workflows (M1)

1. Move direct page/action persistence through `features/students/service.ts` and catalogue services where not already centralised.
2. Implement Student detail audit timeline query with safe metadata formatting.
3. Implement duplicate warning loop and fee-rule existence feedback in enrolment UI.
4. Add activation/edit forms for Programme, Module, Fee Rule; audit every change.
5. Add integration tests: atomic enrolment rollback, parallel Student ID allocation, duplicate normalized email, status matrix, no programme/year edit after payment/adjustment/submission/result, permitted pre-activity re-snapshot plus audit.
6. Add API tests for `401`, `403`, `404`, `409`, `422`, standard envelopes, and pagination/filter response correctness.

Gate: a Staff user can create catalogue records, enrol, find, update, and review a Student entirely through UI; all M1 lifecycle tests pass against `TEST_DATABASE_URL`.

### Phase C — finish finance workflow (M2)

1. Add `createAdjustment` service/action/API: non-zero signed amount, reason, assignment row lock, balance cannot become negative, audit event.
2. Add adjustment card and ledger rows with signed formatted amounts and actor/time. Do not add “edit adjustment”.
3. Replace payment/void bare forms with field errors and an `AlertDialog` void reason flow.
4. Add balance breakdown and organisation-local days-overdue display to Student detail/dashboard.
5. Add transaction integration tests: two parallel payments cannot overpay, duplicate normalized reference rejected, future payment rejected, void recalculates balance, adjustment rule and DB constraint, inactive Student debt remains visible.

Gate: concurrent payment test demonstrates only one accepted write; ledger/audit evidence is complete; overdue queue matches local-date boundaries.

### Phase D — finish assessment/submission workflow (M3)

1. Extract assessment lifecycle service so create/deadline/close/reopen rules and audit events have one implementation shared by actions/API.
2. Add assessment/list filters and counts; render full revision history in staff detail.
3. Improve upload client experience with selected-file validation hints, pending state, success/error alert, and fresh current revision display; keep multipart route as authority.
4. Add revision download links for Student's own file and Staff worklist. Ensure content disposition names cannot inject headers.
5. Add integration tests with generated temporary PDF/DOCX buffers: valid first/on-time revision, late first, late revision rejection, closed rejection, non-enrolled/ineligible rejection, post-storage DB failure cleanup, Staff/owner download access and cross-owner `404`.

Gate: seed persona walkthrough demonstrates first upload, permitted resubmit, late label, closed state, authorised download; unsafe archives never reach storage.

### Phase E — finish result workflow (M4)

1. Extract a query/projection service for Staff grid and Student published results; use it in pages and APIs to eliminate divergent filters.
2. Implement the grading-row interaction and state-change dialogs described above.
3. Show auditable overdue override warning using server-derived current balance, never a client-supplied boolean alone.
4. Add optimistic lock UX: version in hidden/server state, `409` presentation, reload path.
5. Add integration tests: three-source grading-grid union, Staff grade permission for historic members, classification boundaries, all allowed/blocked transitions, reason requirement, DB 0–100 constraint, stale version conflict, overdue override audit, Student published-only projection and ownership `404`.

Gate: Staff can safely draft, withhold, publish, retract, correct, and republish; Student sees exactly the permitted published projection.

### Phase F — assessment-quality polish and evidence (M5)

1. Complete all loading, empty, error, success, confirmation, and conflict states route by route. Every state gets copy designed for the operation, not generic “something went wrong”.
2. Conduct manual keyboard and screen-reader-oriented pass: persona picker, dashboard, filters, enrolment, payment void, upload, grading/publish, Student results.
3. Add automated accessibility scans for picker, dashboard, Students, Student home if time permits; fix critical/serious issues only after manual check.
4. Add one Playwright smoke test only after deterministic seed and local DB reset are stable: Staff enrols + records payment + sees queue; Student submits + only sees published result.
5. Run `db:reset`, full seed walkthrough, lint/typecheck/unit/integration/build, dev cookie gate, production cookie gate.
6. Reconcile README, decisions, AI log, architecture plan, seed scenario matrix, API examples, and known limitations with actual behaviour. Human reviews AI log before submission.
7. Inspect `git status --ignored` and confirm assessment PDF, `.env`, `.uploads`, `.venv`, generated Prisma output, build output, and credentials are ignored.

Gate: every required behaviour has either a direct integration test or a documented manual walkthrough step; no known blocker or placeholder remains in assessed flows.

## Test execution matrix

| Test class | Location/pattern | Required evidence |
|---|---|---|
| Pure domain | `src/features/**/rules.test.ts` | Boundaries and state matrices are fast and deterministic. |
| Database service | `tests/integration/**/*.test.ts` | Uses only `TEST_DATABASE_URL`; cleans own data; exercises transactions/constraints. |
| API handler | `tests/integration/api-*.test.ts` | Status/envelope/authorization/field-error behaviour. |
| UI component | `src/components/**/*.test.tsx` | Critical accessible interactions, not snapshots of layout. |
| Browser smoke | `tests/e2e/*.spec.ts` | One Staff path and one Student privacy path after all Tier 1 work. |
| Manual review | `docs/plan/MANUAL_WALKTHROUGH.md` | Named seed persona, action, expected visual/server/audit outcome. |

Test data rules:

- test databases never use `DATABASE_URL`;
- each test creates or resets only its own data;
- concurrency tests use separate Prisma clients/connections where needed;
- all uploaded test artifacts are under a test-specific ignored directory and are removed in `afterEach`/`afterAll`;
- never rely on wall-clock time without the project clock helper.

## Final submission checklist

### Functional and data integrity

- [ ] All M1–M4 lifecycle scenarios pass against PostgreSQL.
- [ ] Every mutation creates a correctly attributed audit event in the same transaction.
- [ ] Database constraints and unique/index assumptions are migration-backed and integration-tested.
- [ ] Student ownership/Staff authorization/draft secrecy tests pass.
- [ ] Seed scenarios map one-to-one to the demo walkthrough.

### UI and accessibility

- [ ] Tailwind v4 tokens and required shadcn primitives are installed, source-owned, and consistently used.
- [ ] All listed routes have loading, empty, validation-error, and success/conflict states where relevant.
- [ ] Desktop/tablet/mobile layout is reviewed at 1440, 1024, 768, and 320 px.
- [ ] Keyboard path and focus restoration pass for dialogs, forms, filters, upload, and grading.
- [ ] No status is communicated by colour only; contrast/focus controls meet AA expectations.

### Verification and handoff

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:integration`
- [ ] `npm run build`
- [ ] Fresh database `npm run setup` / `npm run db:reset` verification
- [ ] `npm run dev` local-HTTP sign-in
- [ ] `npm run build && npm run start` local-HTTP sign-in
- [ ] README fresh-clone path checked; ignored/sensitive files checked; AI log reviewed by human.

## Exact implementation order

1. Phase A component system/error contract.
2. Phase B Student/catalogue + M1 tests and UI.
3. Phase C finance + M2 tests and UI.
4. Phase D assessments/submissions + M3 tests and UI.
5. Phase E grading/results + M4 tests and UI.
6. Phase F accessibility, walkthrough, final verification, documentation reconciliation.

No later phase begins if an earlier workflow has an unresolved correctness bug, failing test, or missing audit event. This prevents a polished interface from concealing incomplete Registry behaviour.
