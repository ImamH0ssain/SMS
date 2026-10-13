# How AI was used

This page records what each tool did, how the work was organised, which decisions were mine, how I verified the result, and where AI got things wrong.

## At a glance

| | |
|---|---|
| **Tools** | Codex (GPT-5.6 Terra), GitHub Copilot in VS Code (GPT-5.6 Luna), Claude (Sonnet 5.5), Claude Opus 4.6 in Antigravity |
| **Biggest effect on quality** | Independent review: a second model checking the first model's plan, code and status reports |
| **Evidence at the end** | 35 unit tests, 26 integration tests against real PostgreSQL, 4 browser tests with accessibility scans, lint, type checking and a production build, plus manual walkthroughs of both roles |
| **Mistakes caught and fixed** | A dozen significant ones, listed [below](#what-ai-got-wrong-and-how-it-was-caught) |

## Tools and what each was used for

| Tool | Used for |
|---|---|
| **Codex** (GPT-5.6 Terra, Extra high reasoning effort) | Drafting the first plan, the project foundation (environment validation, schema, migrations, sessions, seed), and the first implementation of the services, API and interface, and most of the tests. |
| **GitHub Copilot in VS Code** (GPT-5.6 Luna) | Continuing the build: finishing features, tests, accessibility fixes, and the fixes that came out of review. |
| **Claude** (Sonnet 5.5) | An independent review of the plan against the assessment requirements, the revised plan, wireframes of the dashboard and grading grid, reviews of the code and of the agents' status reports, and the final documentation. |
| **Claude Opus 4.6** (Antigravity) | Read-only audits and status reports of the codebase, used as a second opinion while Copilot was working. |

Tools were chosen by task. Planning and review went to the models best at reasoning about trade-offs, mechanical changes went to the faster agent. Each handover relied on written plans and the shared guide in `AGENTS.md`, not on any one tool's memory.

## How the work was organised

**1. Plan thoroughly.** Codex GPT 5.6 Terra on xhigh was used to draft an architecture and an in depth detailed implementation plan from meticulous prompting based on my understanding of the assessment brief. In between my revisions, I also had Claude Sonnet 5.5 review it. The second opinion helped cut some scope that was not required (real authentication, hosted deployment, production monitoring, performance testing).

**2. Build against a written specification.** The plan defined the data model, the business rules, the API contract, the seed scenarios and the tests, so each agent session had a clear target. Work proceeded one area at a time: foundation, enrolment, fees, submissions, results, then the student pages.

**3. Gate every step.** An area counted as done only when lint, type checking, the unit and integration tests and a production build all passed, and the agent had shown the real verified output.

**4. Audit with a different model.** Claude Sonnet 5.5 and Opus 4.6 periodically reviewed the repository and the agents' own reports. They checked claims against the source, and the precise audit findings were fed back to the coding agent for fixes.

**5. Manual Verification.** I manually verified the staff and student journeys in a browser, including the overdue queue, the late submission, the withheld result and the student's view, and checked that sign-in works over plain `http://localhost` in both development and a production build. Found issues were investigated and fed back for fixes.

**6. Final consistency pass.** The documentation was rewritten last after everything passed, against the finished code, so it is grounded.

## Decisions

Every product rule is written up in [DECISIONS.md](DECISIONS.md).

## How I verified the work

| Method | What it caught or proved |
|---|---|
| Unit tests | Rule boundaries: grade classification, status transitions, overdue dates, late and resubmission timing, file and archive validation. |
| Integration tests on a real PostgreSQL database | Transactions, locks and constraints: concurrent enrolments, parallel payments that cannot overpay, version conflicts on results, upload cleanup when a transaction fails, and the API's authentication and error behaviour. |
| Browser tests with axe | The main staff and student paths, and accessibility problems on key pages. |
| Production build and lint | Errors that only appear outside development mode. |
| Manual walkthroughs of both roles | What a reviewer will actually see, including the seeded edge cases. |
| Reading the source against agent claims | Several incorrect claims, below. |
| Reproducing problems in a clean environment | A fresh install that failed when no environment file existed. |

## What AI got wrong, and how it was caught

Keeping this list honest is the main reason the project can be trusted. Most of these were caught because a second reviewer, or a clean run, disagreed with the first.

| What went wrong | How it was caught | What changed |
|---|---|---|
| The first plan was over-scoped (real authentication, hosted deployment, monitoring, performance tests) and set a 10 MB upload limit that typical serverless platforms reject. | Review of the plan against the assessment brief. | Scope reduced, a server-enforced demo session adopted, upload limit set to 4 MB. |
| Payments and student IDs had no protection against two people acting at the same moment. | Plan review. | Row locking for payments and a transactional counter for IDs, each proved by a parallel integration test. |
| The session cookie was planned as always secure in production builds, which would stop sign-in on `http://localhost`. | Plan review. | `COOKIE_SECURE=auto` follows the request protocol, and sign-in was checked in both development and production modes. |
| The grading grid only listed students currently enrolled, so someone who withdrew after submitting would disappear. | Plan review. | The grid now includes anyone with a submission or result, with a test. |
| Assessment creation wrote the record and its audit event separately, and one fee form rounded money using floating-point arithmetic. | First codebase audit. | Both wrapped in a transaction and moved to strict money parsing. |
| An audit report made several incorrect claims: that `proxy.ts` was dead code, that the native dialog could not trap focus, that `zod` was unused, and that a particular rounding example failed. | I checked each against the framework documentation and the source. | None of the four was acted on. The audit retracted the first itself. |
| An agent's closing summary said nothing was outstanding, while a code review found open items. | I had a second reviewer read the code instead of relying on the summary. | A fix list was worked through: content-based upload validation, a guard on every page, centralised database-error handling, email conflict checks, read-only identity fields, a required reason when deferring or withdrawing, a postinstall step, and more tests. |
| Upload validation required an exact declared file type, which would reject valid DOCX files from some browsers. | Code review. | File content now decides, and generic browser types are accepted. |
| Pages relied on their layout to enforce access, and layouts are not re-run on every navigation. | Code review. | Each page performs its own check. |
| Duplicate-value database errors surfaced as generic failures, and editing an email could collide with another student. | Code review. | A central handler returns a clear 409, with an explicit check on update. |
| A fresh `npm ci` failed when no `.env` file existed, because the Prisma client generation step needed the database setting. | Reproduced in a clean environment. | The Prisma configuration now falls back to a safe default for generation. |
| Persona scenario hints were mapped to the wrong seeded students, and a hint was shown for non-demo student 0004. | Compared the picker mapping with `prisma/seed.ts` and the demo-account flags. | Corrected 0003, 0005 and 0006, added the 0007 and 0008 scenarios, and removed the 0004 mapping. |
| Smaller slips during building: a missing command-line tool mistaken for an unavailable service, overlapping install runs, a first error helper that pulled server-only code into the browser bundle and broke the build, global styles that overrode colours until the accessibility scan flagged them, and an incomplete component install. | Each surfaced when the checks or the build ran. | Corrected on the spot, and the checks stayed in the loop. |

