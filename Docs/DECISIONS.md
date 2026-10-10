# Product Decisions

| Decision | Registry rationale | Alternative rejected | Consequence |
|---|---|---|---|
| Demo session | The brief allows a role toggle; server-enforced personas demonstrate separation without consuming time on credential flows. | Password/SSO authentication now. | `getSession()` is the replacement boundary for production auth. |
| GBP and Europe/London | The brief leaves both unspecified; these are sensible defaults for the assessment context and remain configurable. | Per-record currency/time-zone complexity. | Currency is app-wide; deadlines are stored UTC and displayed in organisation time. |
| Fee snapshots | Past liabilities must not change when an annual fee rule changes. | Deriving every balance from the current programme rule. | Assignment is immutable except for pre-activity programme/year correction. |
| Debt and results | Registry staff need discretion; overdue debt is a warning, not an academic publication block. | Hard publication block or no warning. | Explicit audited override is required. |
| 4 MB documents | Safe local workflow that remains compatible with common serverless request limits. | 10 MB implied default. | PDF/DOCX only and clear validation feedback. |
| WSL source and Docker data | Keep source/Git at `D:\Projects\SMS` for IDE use while running tools through WSL; store PostgreSQL only in Docker-managed Linux volumes. | Cross-filesystem dependency symlinks/bind mounts or a repository-hosted database directory. | Mounted-tree scans can be slower, but source remains authoritative and database I/O is isolated from Windows filesystem overhead. |
| Local HTTP cookie handling | `COOKIE_SECURE=auto` derives from forwarded protocol/origin rather than `NODE_ENV`. | Always setting `Secure` in production builds. | A clean local production build can sign in over `http://localhost`, while HTTPS deployment still receives a Secure cookie. |
