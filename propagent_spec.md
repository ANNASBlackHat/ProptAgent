# PropAgent — Feature List & User Stories
**AI Tenant Screening & Property Management SaaS**
Stack: Next.js + Node.js + MongoDB | Target Price: $69

---

## Roles

| Role | Description |
|---|---|
| **Super Admin** | Platform owner (the buyer/developer). Manages all landlords, system settings, billing config. |
| **Landlord / Property Manager** | Primary end-user. Manages properties, units, applications, leases, maintenance. |
| **Tenant (Applicant)** | Submits rental application, completes AI screening interview, manages their lease. |

---

## MODULE 1 — Authentication & Onboarding

### Features
- Email/password registration and login for all roles
- Role-based access control (Super Admin / Landlord / Tenant)
- Landlord self-registration with profile setup (company name, logo, contact)
- Tenant registration triggered by application invite link
- Password reset via email
- Session management (JWT + refresh token)
- Super Admin can impersonate any landlord account for support

### User Stories

**US-101**
As a **landlord**, I want to register an account with my email and password so that I can start managing my properties.

**US-102**
As a **landlord**, I want to upload my company logo and set my business name so that my tenant-facing portal looks professional.

**US-103**
As a **tenant**, I want to create an account via an invite link from a landlord so that I can submit my rental application without needing to find the platform myself.

**US-104**
As a **super admin**, I want to view and manage all registered landlord accounts so that I can handle support and abuse cases.

**US-105**
As any **user**, I want to reset my password via a secure email link so that I can recover access if I forget my credentials.

---

## MODULE 2 — Property & Unit Management

### Features
- Create/edit/archive properties (name, address, description, photos)
- Add multiple units per property (unit number, floor, type, size, rent amount, deposit)
- Unit status tracking: Available / Occupied / Under Maintenance / Reserved
- Property-level and unit-level availability toggle
- Photo gallery per property and per unit (upload, reorder, delete)
- Property dashboard showing occupancy rate, active leases, open maintenance requests

### User Stories

**US-201**
As a **landlord**, I want to create a property with address, description, and photos so that prospective tenants can see what I'm offering.

**US-202**
As a **landlord**, I want to add multiple units to a property with individual rent amounts and sizes so that I can manage an apartment building from one place.

**US-203**
As a **landlord**, I want to see each unit's current status (available, occupied, maintenance) at a glance so that I know what's ready to rent.

**US-204**
As a **landlord**, I want to mark a unit as unavailable so that I can temporarily remove it from the applicant-facing listing without deleting it.

**US-205**
As a **landlord**, I want to see a property-level dashboard showing occupancy rate and active issues so that I can monitor portfolio health quickly.

---

## MODULE 3 — Tenant Application & AI Screening

> This is the core differentiator. Priority module.

### Features
- Public-facing property listing page (per landlord subdomain or slug)
- "Apply Now" button generating a unique application link per unit
- Application form: personal info, employment status, monthly income, move-in date, references
- AI screening interview triggered after form submission
  - Conversational Q&A (text-based chat UI)
  - AI asks follow-up questions based on form answers (e.g. if self-employed, asks for business details)
  - Configurable question templates per landlord (landlord can add custom screening questions)
  - Session stored with full transcript
- AI scoring output (JSON structured):
  - Overall fit score (1–10, advisory only)
  - Per-criteria scores: income stability, communication clarity, rental history signals
  - Red flag summary (e.g. "applicant was vague about employment dates")
  - Recommended action: Shortlist / Review Manually / Decline
- Scoring disclaimer displayed to landlord: "AI scores are advisory. Final decision is yours."
- Landlord can override AI recommendation with manual status
- Applicant status: Pending / Shortlisted / Under Review / Approved / Declined
- Bulk status update for multiple applicants
- Email notification to applicant on status change

### User Stories

**US-301**
As a **landlord**, I want to share a unique application link for each unit so that prospective tenants can apply directly without me manually collecting forms.

**US-302**
As a **tenant (applicant)**, I want to fill out a rental application form online so that I can apply for a unit without visiting in person.

**US-303**
As a **tenant (applicant)**, I want to complete a short AI screening interview after my application so that the landlord gets a fuller picture of my situation beyond the form.

**US-304**
As a **landlord**, I want to see an AI-generated score and summary for each applicant so that I can quickly prioritize who to contact first.

**US-305**
As a **landlord**, I want to read the full AI interview transcript alongside the score so that I can audit why the AI made its recommendation.

**US-306**
As a **landlord**, I want to override the AI's recommendation with my own status decision so that I remain in full control of who I approve.

**US-307**
As a **landlord**, I want to add my own custom screening questions to the AI interview so that the AI asks things specific to my property rules (e.g. "Do you have pets?").

**US-308**
As a **tenant (applicant)**, I want to receive an email when my application status changes so that I'm not left wondering about my application.

**US-309**
As a **landlord**, I want to bulk-decline all pending applicants for a unit once I've approved one so that I can close the listing efficiently.

---

## MODULE 4 — Lease Management

### Features
- Create lease from approved application (pre-fills tenant and unit data)
- Lease fields: start date, end date, monthly rent, security deposit, special terms (text)
- Lease status: Active / Expiring Soon (30-day warning) / Expired / Terminated
- Document upload per lease (PDF — signed agreement, ID copy, etc.)
- Rent payment log (manual entry: paid date, amount, method, notes)
- Payment history view per tenant and per unit
- Lease renewal flow (extend end date, optionally adjust rent)
- Early termination with reason logging
- Email reminder to landlord 30 days before lease expiry

### User Stories

**US-401**
As a **landlord**, I want to create a lease for an approved applicant with pre-filled details so that I don't have to re-enter information I already collected.

**US-402**
As a **landlord**, I want to upload the signed lease PDF to the system so that I have a digital record attached to the tenant's profile.

**US-403**
As a **landlord**, I want to log each rent payment manually so that I can track which tenants are current and which are overdue.

**US-404**
As a **landlord**, I want to see a payment history timeline per tenant so that I can quickly check if a tenant has ever been late.

**US-405**
As a **landlord**, I want to receive an email 30 days before a lease expires so that I can proactively contact the tenant about renewal.

**US-406**
As a **landlord**, I want to renew a lease with an updated end date and optionally a new rent amount so that I don't need to create a new lease from scratch.

**US-407**
As a **tenant**, I want to view my current lease details and payment history from my dashboard so that I have a record of my tenancy.

---

## MODULE 5 — Maintenance Requests

### Features
- Tenant submits maintenance request (category, description, photos, urgency level)
- Categories: Plumbing / Electrical / HVAC / Structural / Appliance / Other
- Urgency levels: Low / Medium / Urgent
- Landlord receives email notification on new request
- Landlord updates request status: Open / In Progress / Resolved / Closed
- Landlord can add internal notes per request (not visible to tenant)
- Tenant receives email on status update
- Maintenance history per unit

### User Stories

**US-501**
As a **tenant**, I want to submit a maintenance request with photos and urgency level so that my landlord knows what needs fixing and how soon.

**US-502**
As a **landlord**, I want to receive an email when a new maintenance request is submitted so that I don't miss urgent issues.

**US-503**
As a **landlord**, I want to update the status of a maintenance request and add internal notes so that I can track what action I've taken.

**US-504**
As a **tenant**, I want to receive an email when my maintenance request status changes so that I know it's being handled.

**US-505**
As a **landlord**, I want to see all open maintenance requests across all my properties in one view so that I can prioritize my workload.

---

## MODULE 6 — Landlord Dashboard & Analytics

### Features
- Summary cards: total properties, total units, occupancy rate, open applications, expiring leases, open maintenance
- Recent activity feed (last 10 events: new application, status change, payment logged, request submitted)
- Units overview table with quick status filters
- Expiring leases list (next 60 days)
- Overdue rent tracker (units where no payment logged in current month)

### User Stories

**US-601**
As a **landlord**, I want to see a dashboard summary of my portfolio on login so that I immediately know what needs my attention today.

**US-602**
As a **landlord**, I want to see which leases are expiring in the next 60 days so that I can plan renewals or new listings in advance.

**US-603**
As a **landlord**, I want to see which units have no payment logged this month so that I can follow up on potential overdue rent.

---

## MODULE 7 — Super Admin Panel

### Features
- List all landlord accounts with registration date and activity status
- Activate / deactivate landlord accounts
- View platform-wide stats (total landlords, total properties, total applications)
- System settings: default email sender, AI model config (API key input), app name and logo
- Email template management (status change notifications, reminders)

### User Stories

**US-701**
As a **super admin**, I want to configure the AI API key from the admin panel so that I can switch LLM providers without touching the codebase.

**US-702**
As a **super admin**, I want to activate or deactivate landlord accounts so that I can handle abuse or trial period enforcement.

**US-703**
As a **super admin**, I want to customize email notification templates so that outgoing emails match my branding.

---

## OUT OF SCOPE — V1

These are explicitly excluded from v1 to keep the build within 5–7 weeks. Document as "planned for v1.1" in the CodeCanyon listing to set expectations.

| Feature | Reason Excluded |
|---|---|
| Online rent payment (Stripe/PayPal) | Adds 2–3 weeks + payment compliance complexity |
| Checkr / TransUnion background check integration | Requires API partnership and adds legal surface area |
| Mobile app (iOS/Android) | Out of scope for CodeCanyon JS category |
| Multi-language / i18n | Nice to have, not a differentiator |
| Tenant-to-landlord messaging/chat | Adds real-time infra complexity |
| Automated lease PDF generation | Complex templating, defer to v1.1 |
| Accounting / invoicing module | Scope creep — not core to the AI differentiator |

---

## TECH STACK SUMMARY

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Aligns with your existing stack |
| Backend | Node.js (Express or Next.js API routes) | Keep it simple for v1 |
| Database | MongoDB (Mongoose) | Standard for CodeCanyon MERN buyers |
| AI Screening | OpenAI GPT-4o or Gemini 1.5 Flash | BYOK — buyer provides API key |
| File Storage | Local disk (v1) / S3-compatible (documented optional) | Keep setup simple |
| Email | Nodemailer + SMTP (buyer configures) | No vendor lock-in |
| Auth | JWT + bcrypt | Standard, no third-party auth dependency |
| Deployment | Docker Compose (VPS) | CodeCanyon buyers expect self-hosted |

---

## CODECANYON LISTING NOTES

- **Title candidate:** `PropAgent – AI Tenant Screening & Property Management SaaS (Next.js + MongoDB)`
- **Lead differentiator in description:** AI screening interview + scoring must be the first feature mentioned — not "property management"
- **Screenshots priority:** AI interview chat UI first, scoring dashboard second, property overview third
- **Disclaimer to include in listing:** "AI scoring is advisory only. The platform does not perform credit checks or background checks. Compliance with local tenancy laws is the deployer's responsibility."
- **Demo site:** Required. Pre-populate with 2 sample properties, 3 units, 5 mock applications with AI scores visible.