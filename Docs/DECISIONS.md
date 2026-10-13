# Product and engineering decisions

This document records the assumptions and deliberate product decisions that was made where the brief was silent or vague. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design.

## Identity and access

| Decision | Why | Alternatives considered | Consequence |
|---|---|---|---|
| **Demo accounts instead of passwords or single sign-on** | Authentication was optional, and the marks are for Registry rules, so the effort went there. Authorization is still enforced on the server, and a student can never reach another student's data. | Credentials with a library such as Auth.js; single sign-on | Must be replaced before any real deployment. Everything sits behind one `getSession()` function, so the swap is contained. |
| **Check access in every page, action and route** | Layouts are not re-run on every client-side navigation, and the proxy only sees whether a cookie exists. | A single layout-level or proxy-level check | A little repetition, but no page depends on something else having protected it. |
| **Another student's record returns 404, not 403** | A 403 would confirm the record exists. | 403 | Responses reveal nothing about other students. |
| **The session cookie's `Secure` flag follows the request protocol** | A production build served on `http://localhost` must still sign in, while a real HTTPS deployment should get a secure cookie automatically. | Tie the flag to the build mode | The application works in development, in a local production build and behind HTTPS with the same setting. |

## Students

| Decision | Why | Alternatives considered | Consequence |
|---|---|---|---|
| **Student ID is `SMS-<academic-year-start>-<number>`, issued by a counter inside the enrolment transaction** | Matches the example in the brief, is unique under concurrent enrolments, and leaves no gaps if a transaction rolls back. | Random IDs; database sequence | IDs are readable and stable. The number widens past 9999 instead of failing. |
| **Status changes follow a fixed map, and deferral and withdrawal need a reason** | Registries need to explain why a student left or paused. Completed and Withdrawn are end states. | Free movement between any statuses | Invalid moves return 409. Every change is audited with the old and new status and the reason. |
| **Programme and year can only change before any payment, adjustment, submission or result exists** | Changing them afterwards would rewrite the fee and academic history. | Always allow edits; recalculate history | A mistake after activity needs a future transfer process, which is noted as future work. |
| **A matching name and date of birth gives a duplicate warning** | Duplicate records are a classic registry problem, but two real people can share both. | Hard block; no check | Staff are warned and can confirm, rather than being stopped. |
| **Search matches any part of a name or ID, case-insensitively** | Staff rarely remember an exact spelling or the full code. | Prefix only | Simple matching is fine at this scale; a trigram index is the noted upgrade for much larger data. |

## Fees and payments

| Decision | Why | Alternatives considered | Consequence |
|---|---|---|---|
| **Balance is calculated, never stored** | A stored balance can drift out of step with the ledger. | A balance column kept up to date | The figure is always correct and refreshes after every change. |
| **Each student's fee is frozen at enrolment** | Later changes to a programme's fee rule must not rewrite what a student already owes. | Look up the current fee rule each time | History is stable. Corrections use adjustments. |
| **Payments are never edited or deleted; mistakes are voided with a reason** | A ledger must remain auditable. | Editable payments; hard delete | Voided payments stay visible and are excluded from the balance. |
| **A payment cannot exceed the outstanding balance, and the fee record is locked while checking** | There is no refund workflow, and two simultaneous payments must not both succeed. | Allow overpayment and credit it; check without a lock | Overpayment is rejected. A parallel test proves only one of two competing payments wins. |
| **Adjustments are append-only, need a reason, and cannot take the balance below zero** | Gives staff a safe way to waive or correct a fee without touching history. | Edit the fee amount directly | Waivers and extra charges are visible, attributed and audited. |
| **Overdue means a positive balance after the due date, for every status** | "Due today" is not yet late, and a student who leaves still owes what they owe. | Show only enrolled students | Deferred, withdrawn and completed students stay in the queue, labelled by status. |
| **One application-wide currency and time zone; money in whole pennies** | A single institution is assumed, and floating-point money is a source of rounding errors. | Per-record currency; decimal columns | Currency and time zone come from configuration, and amounts are exact. |

## Assessments and submissions

| Decision | Why | Alternatives considered | Consequence |
|---|---|---|---|
| **A first submission is accepted after the deadline and marked late; a resubmission must arrive by the deadline** | The brief asks for late work to be accepted and flagged, and for resubmission before the deadline. Allowing replacements after the deadline would undermine it. | Reject all late work; allow late resubmissions | Late work is visible to staff and students. A student whose late file is wrong must contact the Registry. |
| **The late flag is stored with the revision when it is created** | Later deadline edits must not rewrite what happened. | Recalculate from the current deadline | The record of what actually happened never changes. |
| **Closing an assessment stops all submissions, including late first ones** | "Open" needs a meaning, and staff need a hard stop. | Deadline as the only cut-off | Close and reopen are audited. |
| **Every upload is kept as a revision** | Disputes about which file was submitted when need an answer. | Overwrite the file | Staff can see the full history. |
| **PDF or DOCX up to 4 MB, validated by content** | File names and browser-declared types are easy to get wrong or fake, and some browsers send generic types for valid files. DOCX archives are inspected for unsafe entries without being unpacked. The limit also fits typical serverless request limits. | Trust extension or declared type; 10 MB | Valid files from any browser are accepted, and renamed or disguised files are rejected. |
| **Files are stored privately under random names, behind an access check** | Student work is personal data. | Files under `public/`; original names as keys | Downloads need the right role or ownership. |

## Results

| Decision | Why | Alternatives considered | Consequence |
|---|---|---|---|
| **The grading grid shows eligible students plus anyone with a submission or result** | A student who withdrew after submitting still needs their work graded. | Only currently eligible students | No one's work disappears from view. Non-submitters can be graded too. |
| **Results are Draft, Withheld or Published; withholding and retracting need a reason** | Registries hold results back for reasons that must be recorded. | A simple published flag | The audit trail records why. |
| **A published grade is locked until it is withheld** | Prevents silent changes to something the student can already see. | Allow edits on published results | Corrections are deliberate: withhold, edit, republish. |
| **Concurrent edits are detected using a version number** | Two staff members can open the same row. | Last write wins | The second save is rejected with a clear conflict message and nothing is silently overwritten. |
| **Publishing for a student with an overdue balance warns and needs explicit confirmation** | Whether to hold results for unpaid fees is a Registry policy call, not a system rule. | Block publication; ignore the balance | Staff decide with the facts in front of them, and the override is audited. |
| **Results published before the deadline are flagged in the grid** | Results for an assessment that is still open are usually a mistake, but not always. | Block; say nothing | An informational marker on the row, not a barrier. |
| **Students only receive their own published results, filtered in the query** | Withheld and draft results must not leak, even their existence. | Filter in the interface | A withheld result is indistinguishable from having no result. |

## Engineering

| Decision | Why | Alternatives considered | Consequence |
|---|---|---|---|
| **One service layer shared by pages, actions and the API** | A rule should exist once. | Separate logic for the interface and the API | The web interface and the API cannot disagree. |
| **Every change and its audit event commit together** | An audit trail is only trustworthy if it cannot disagree with the data. | Write audit entries separately | Either both exist or neither does. |
| **Read-only pages query Prisma directly; changes go through actions or services** | Reads carry no audit or validation concern, and the extra layer would only add code. | Route every read through services | Simple read code, strict write code. |
| **Native selects and dialogs instead of extra component libraries** | They are accessible by default and keep the dependency list short. | Replace them with library primitives | Fewer moving parts. Base components still follow a shadcn-style pattern. |
| **Integration tests run against a real PostgreSQL database** | Transactions, locks and constraints cannot be proved with mocks. | Mocked database | Concurrency and constraint behaviour is tested for real. |
| **Local-disk storage behind an adapter interface** | Keeps setup simple while leaving a clean seam for object storage. | Cloud storage from the start | Production would swap the adapter. |
| **Scope held to the four workflows** | The brief asks for judgment over volume, so deployment, real sign-in, refunds, reporting and bulk tools were left out. | A broader platform | Each omission is listed under limitations in the README. |
