# Changelog

All notable changes to this project will be documented in this file.

---

## [1.0.0] - 2026-07-02

### Added
- **Initial Release of PropAgent** - An AI-powered tenant screening and property management system.
- **AI Screening Engine**: Conversational chatbot screening system for applicants. Conducting interviews regarding employment, current housing, references, and financial profiles.
- **AI Scoring System**: Automatically parses transcripts to grade applicants (0-100) and identify critical screening red flags.
- **Property & Unit Module**: Full landlord interface to manage properties, track unit availability, set rent/deposits, and upload unit photos.
- **Lease Ledger**: Digital lease tracking, including custom special terms, lease extensions, and manual rent payment logging.
- **Tenant Portal**: Dedicated dashboard for tenants to review active lease agreements, check rent status, download receipts, and submit maintenance requests.
- **Maintenance Tracker**: Maintenance request submission for tenants (with urgency and photo attachments), and management/filtering dashboard for landlords.
- **Super Admin Panel**: Full administrative visibility over landlords, tenants, properties, and system-wide audits.
- **Global Error Handling**: Custom class-based `ErrorBoundary` and branded pages for 404/500 scenarios.
- **Custom Toast Notification System**: Custom notification banner UI with slide-in animations.
- **Local Database Seeding**: Pre-loaded, idempotent seeder script (`npm run seed`) creating complete landlord/tenant/admin demo datasets.

### Security & Optimization
- **API Rate Limiting**: Added sliding-window in-memory rate limiting to auth endpoints (max 10 attempts/15m) and application portals (max 3 submissions/hour).
- **Input Sanitization**: Implemented HTML tag stripping sanitization utility recursively executed on user inputs before database storage.
- **Secure File Storage**: Type, mimetype, and size validation on all uploaded files.
- **Database Ownership Audits**: Complete backend checks to ensure landlords can only modify/view their own assets and tenants only view their own active lease details.
- **UI Skeletons**: Swapped loading spinners for native, high-fidelity table and card pulsing skeletons (`animate-pulse`) across all landlord list views and dashboard panels.
