# SMS Registry manual walkthrough

This walkthrough records the seeded browser checks completed during the Copilot continuation. It is evidence of presentation and authorization paths, not a replacement for database integration tests.

## Environment

- WSL2 Ubuntu 26.04 at `/mnt/d/Projects/SMS`
- Node 24.20.0 from the project's WSL Node installation
- Docker Desktop PostgreSQL: development `localhost:5432`, integration `localhost:5433`
- `ENABLE_DEMO_SESSION=true`, `COOKIE_SECURE=auto`

## Staff path

1. Open `http://localhost:3000/` (or `http://127.0.0.1:3000/` when the browser is Windows Chrome and the server is running in WSL).
2. Choose **Amelia Reid — Registry Staff**.
3. Confirm `/staff/dashboard` loads with the Staff navigation and database-backed worklist.
4. Visit Students, New student, Assessments, New assessment, Results, and Programme & fees. Each route returned HTTP 200 in the production server smoke pass.
5. On a Student detail page, record a payment or adjustment. The form uses server-backed `useActionState` feedback; invalid input focuses the alert summary and successful mutation announces a status message.
6. Void an active payment. The confirmation dialog names the action, supports Escape/cancel, and returns focus to the trigger.
7. Open Results and publish/withhold a result. The confirmation dialog and result action preserve the server-side transition and audit rules.

## Student path

1. Return to `/` and choose **Amina Rahman — SMS-2026-0001**.
2. Confirm `/student/home` loads only Amina's balance, assessment summary, and published-result count.
3. Visit My assessments and My results. Student navigation remains available and no Staff links are exposed.
4. Confirm result visibility is projection-based: draft and withheld results are not displayed.

## Responsive and keyboard checks

The Student home was loaded at 1440, 1024, 768, and 320 CSS pixels. The layout retained its heading, navigation, summary cards, and action links without horizontal content overflow beyond the browser scrollbar. Focus-visible styles are provided by the shared controls; destructive actions use native modal focus handling.

## Accessibility evidence

The shared browser was used to inspect the persona picker, Staff dashboard, and
Student shell with semantic headings, named landmarks, labelled controls,
keyboard-visible focus rings, and status text that remains understandable
without colour. The repository includes Playwright/axe scans in `tests/e2e/`.
The WSL Ubuntu 26.04 Playwright Chromium download remains unavailable, so the
suite was executed with the installed Windows Chrome binary while the
application and PostgreSQL remained WSL-backed. All four smoke and
accessibility tests passed, including zero axe violations on the tested Staff
and Student pages.

## Server and audit expectations

Every mutation remains server-authorized, validates through the existing service/rule layer, persists through Prisma/PostgreSQL, and writes an audit event where specified. Direct URL access with the wrong persona reaches the route error boundary rather than bypassing authorization; the correct seeded Student persona loads the Student routes successfully.

## Seed scenario mapping

| Seeded persona/scenario | Walkthrough evidence |
|---|---|
| Amelia Reid, Registry Staff | Staff path; dashboard, catalogue, student, finance, assessment, and result mutations |
| Marcus Cole, Registry Staff | Staff path; alternate assessment creator and audit actor |
| Amina Rahman, enrolled | Student path; published Programming project result and no Staff navigation |
| Ben Carter, enrolled | Partial payment, current Programming project submission, withheld result |
| Clara Hayes, enrolled Business student | Closed Business case study and published result |
| Dev Shah, deferred | Voided payment, adjustment, and inactive-student finance visibility |
| Ella Wright, withdrawn | Late Algorithms coursework submission and draft result secrecy |
| Farah Khan, completed prior-year student | Historic Data Structures result and prior-year fee snapshot |
| Gita Singh, enrolled | Two-revision Programming project history with current DOCX revision |
| Isla Moore, enrolled | Published result without a submission, demonstrating grading-grid membership |

## Mutation audit matrix

| Mutation | Server implementation | Audit action | Evidence |
|---|---|---|---|
| Programme, module, and fee rule creation | `src/app/actions/catalogue.ts` | `PROGRAMME_CREATED`, `MODULE_CREATED`, `FEE_RULE_CREATED` | Transactional action implementation and lint/typecheck/build |
| Student enrolment and status/programme updates | `src/features/students/service.ts` | `STUDENT_ENROLLED`, `STUDENT_UPDATED` | `student-workflow.test.ts` atomicity and resnapshot tests |
| Payment, void, and fee adjustment | `src/features/finance/service-mutations.ts` | `PAYMENT_RECORDED`, `PAYMENT_VOIDED`, `FEE_ADJUSTMENT_CREATED` | Finance integration coverage and service transaction boundaries |
| Assessment create, deadline, close, and reopen | `src/app/actions/assessments.ts` | `ASSESSMENT_CREATED`, `ASSESSMENT_DEADLINE_CHANGED`, `ASSESSMENT_CLOSED`, `ASSESSMENT_REOPENED` | Action transaction implementation and production build |
| Submission upload and revision | `src/app/api/assessments/[assessmentId]/submissions/route.ts` | `SUBMISSION_REVISION_CREATED` | `submission-lifecycle.test.ts`, including actor and rollback cleanup |
| Result create and lifecycle transitions | `src/features/results/service.ts` | `RESULT_CREATED`, `RESULT_UPDATED` | `grading-grid.test.ts` actor and transition assertions |

Every listed audit write is inside the same Prisma transaction as its mutation. Invalid requests are rejected before storage or persistence, and transaction failures surface as API errors rather than success-shaped responses.
