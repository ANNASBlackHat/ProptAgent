# PropAgent — AI Agent Build Phases
**Copy-paste prompts for antigravity | 10 phases | Each phase = runnable + verifiable**

---

## BEFORE YOU START — Prepare These Files

Create these 3 files and attach them to every phase session alongside `propagent_spec.md`:

### `TECH_STACK.md`
```
- Frontend: Next.js 14 (App Router, TypeScript)
- Backend: Next.js API Routes (no separate Express server)
- Database: MongoDB 7 via Mongoose 8
- Auth: JWT (jsonwebtoken) + bcrypt, stored in httpOnly cookies
- AI: OpenAI SDK (model: gpt-4o-mini, configurable via env)
- File Storage: local /public/uploads (v1 only)
- Email: Nodemailer with SMTP (configured via env)
- Styling: Tailwind CSS v3
- State: React Context for auth, SWR for data fetching
- Deployment: Docker Compose (Node 20 Alpine image)
```

### `CONVENTIONS.md`
```
Folder structure:
/app                    → Next.js App Router pages
/app/api               → API route handlers
/components            → Shared UI components
/lib                   → Utilities (db.ts, auth.ts, email.ts, ai.ts)
/models                → Mongoose models
/types                 → TypeScript interfaces
/hooks                 → Custom React hooks

API response format (always):
  Success: { success: true, data: <payload> }
  Error:   { success: false, error: "<message>" }

Naming:
  Models: PascalCase singular (User, Property, Unit, Application)
  API routes: kebab-case (/api/auth/login, /api/properties/[id]/units)
  Components: PascalCase (PropertyCard, UnitStatusBadge)
  Hooks: camelCase with use prefix (useAuth, useProperties)

Auth middleware:
  All protected API routes use withAuth(handler, allowedRoles[])
  Roles: 'super_admin' | 'landlord' | 'tenant'

Error handling:
  All API routes wrapped in try/catch
  Mongoose validation errors → 400
  Auth errors → 401
  Not found → 404
  Server errors → 500
```

### `ENV_TEMPLATE.md`
```
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_NAME=PropAgent

# Database
MONGODB_URI=mongodb://localhost:27017/propagent

# Auth
JWT_SECRET=<random 64 char string>
JWT_EXPIRES_IN=7d

# AI (buyer provides their own key)
OPENAI_API_KEY=<buyer fills this>
AI_MODEL=gpt-4o-mini

# Email (buyer configures their SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<buyer fills this>
SMTP_PASS=<buyer fills this>
SMTP_FROM=noreply@yourdomain.com

# File Upload
UPLOAD_DIR=public/uploads
MAX_FILE_SIZE_MB=5
```

---

---

# PHASE 0 — Project Scaffold & Configuration

## Prompt

```
You are building PropAgent — an AI Tenant Screening & Property Management SaaS.
Stack: Next.js 14 (App Router, TypeScript), MongoDB 7 + Mongoose 8, Tailwind CSS v3.
Reference files: TECH_STACK.md, CONVENTIONS.md, ENV_TEMPLATE.md, propagent_spec.md.

Your task for this phase: scaffold the complete project structure. Do NOT build any
features yet. Only set up the foundation.

Deliverables:
1. Initialize Next.js 14 project with TypeScript and Tailwind CSS
2. Install all dependencies:
   mongoose, jsonwebtoken, bcryptjs, nodemailer, openai, swr, cookie,
   @types/jsonwebtoken, @types/bcryptjs, @types/nodemailer, @types/cookie
3. Create folder structure exactly as defined in CONVENTIONS.md
4. Create /lib/db.ts — MongoDB connection with connection pooling (singleton pattern)
5. Create /lib/auth.ts — JWT sign, verify, and withAuth middleware function
6. Create /lib/email.ts — Nodemailer transporter with sendEmail(to, subject, html) helper
7. Create /lib/ai.ts — OpenAI client initialization with a callAI(messages, systemPrompt) helper
8. Create .env.local from ENV_TEMPLATE.md with placeholder values
9. Create .env.example (same as above, safe to commit)
10. Create docker-compose.yml with: app (Node 20 Alpine) + mongodb service
11. Create Dockerfile for the Next.js app
12. Update tailwind.config.ts with a clean PropAgent color palette:
    primary: #2563EB (blue), success: #16A34A, warning: #D97706,
    danger: #DC2626, neutral: gray scale
13. Create /app/layout.tsx with base HTML shell, font (Inter), and Tailwind base styles
14. Create a simple /app/page.tsx that renders "PropAgent is running" — just a health check page
15. Create /app/api/health/route.ts that returns { success: true, message: "PropAgent API running", timestamp: now }

Output all files with complete content. No placeholders, no TODOs.
```

## Verification Checklist

After pasting this prompt and receiving output:

- [ ] `npm run dev` starts without errors
- [ ] Browser shows "PropAgent is running" at `localhost:3000`
- [ ] `GET /api/health` returns `{ success: true, message: "PropAgent API running" }`
- [ ] `/lib/db.ts` uses singleton pattern (no new connection on every request)
- [ ] `/lib/auth.ts` exports `withAuth`, `signToken`, `verifyToken`
- [ ] `/lib/email.ts` exports `sendEmail(to, subject, html)`
- [ ] `/lib/ai.ts` exports `callAI(messages, systemPrompt)`
- [ ] `.env.local` exists with all keys from ENV_TEMPLATE
- [ ] `docker-compose.yml` has both `app` and `mongodb` services
- [ ] Tailwind primary color `#2563EB` applies correctly (test with a blue element)
- [ ] No TypeScript errors (`npm run build` passes or only shows page-level warnings)

**If anything fails:** Fix before moving to Phase 1. Every subsequent phase depends on this foundation.

---

---

# PHASE 1 — Authentication & Role System

## Prompt

```
Continue building PropAgent. Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.
The scaffold from Phase 0 is complete. Do not re-scaffold; build on top of it.

Your task: implement the complete authentication system for 3 roles:
super_admin, landlord, tenant.

Deliverables:

MODELS:
1. /models/User.ts — fields: name, email, password(hashed), role, isActive,
   companyName(landlord only), logo(landlord only), phone, createdAt
   Add pre-save hook to hash password with bcrypt (rounds: 10)
   Add method: comparePassword(plain) → boolean

API ROUTES:
2. POST /api/auth/register — landlord self-registration only
   Body: { name, email, password, companyName, phone }
   Returns: { success, data: { user, token } }
   Sets httpOnly cookie: token

3. POST /api/auth/login — all roles
   Body: { email, password }
   Returns: { success, data: { user (no password), token } }
   Sets httpOnly cookie: token

4. POST /api/auth/logout
   Clears token cookie
   Returns: { success: true }

5. GET /api/auth/me — protected, all roles
   Returns current user from JWT
   Uses withAuth middleware

6. POST /api/auth/forgot-password
   Body: { email }
   Generates a reset token (crypto.randomBytes), stores on user with 1hr expiry
   Sends email with reset link

7. POST /api/auth/reset-password
   Body: { token, newPassword }
   Validates token not expired, updates password, clears reset token

MIDDLEWARE:
8. /lib/auth.ts — update withAuth to:
   Read token from httpOnly cookie OR Authorization: Bearer header
   Attach decoded user to request as req.user
   Accept allowedRoles array — return 403 if role not in array

SEED SCRIPT:
9. /scripts/seed.ts — creates one super_admin account:
   email: admin@propagent.com, password: Admin123!, role: super_admin
   Run with: npx ts-node scripts/seed.ts

UI PAGES:
10. /app/(auth)/login/page.tsx — login form (email + password)
    On success: redirect landlord → /dashboard, super_admin → /admin, tenant → /tenant
11. /app/(auth)/register/page.tsx — landlord registration form
    Fields: name, email, password, confirm password, company name, phone
12. /app/(auth)/forgot-password/page.tsx — email input form
13. /app/(auth)/reset-password/page.tsx — token from URL param, new password form
14. /components/AuthProvider.tsx — React Context wrapping the app, exposes useAuth() hook
    useAuth() returns: { user, isLoading, login(), logout(), isAuthenticated }
15. Create route groups:
    /app/(dashboard)/layout.tsx — checks auth, redirects to login if not authenticated
    /app/(auth)/layout.tsx — redirects to dashboard if already authenticated

All forms must show validation errors inline. No alert() calls.
All API routes must use try/catch and return standard error format.
```

## Verification Checklist

- [ ] Register a new landlord at `/register` — succeeds, redirects to `/dashboard`
- [ ] Login with wrong password — shows inline error "Invalid email or password"
- [ ] Login as landlord — redirects to `/dashboard`
- [ ] `GET /api/auth/me` with valid cookie — returns user object without password field
- [ ] `GET /api/auth/me` without cookie — returns 401
- [ ] Logout clears cookie — subsequent `/api/auth/me` returns 401
- [ ] Seed script runs: `npx ts-node scripts/seed.ts` creates super_admin
- [ ] Login as super_admin (admin@propagent.com / Admin123!) — redirects to `/admin`
- [ ] `withAuth(handler, ['landlord'])` blocks super_admin — returns 403
- [ ] Forgot password sends email (check console log if SMTP not configured)
- [ ] Reset password with valid token — updates password, old password no longer works
- [ ] Reset password with expired token — returns error
- [ ] Unauthenticated visit to `/dashboard` — redirects to `/login`
- [ ] Already logged in visit to `/login` — redirects to `/dashboard`

---

---

# PHASE 2 — Property & Unit Management

## Prompt

```
Continue building PropAgent. Phase 0 (scaffold) and Phase 1 (auth) are complete.
Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.

Your task: build the property and unit management module. All routes in this phase
are landlord-only unless noted.

Deliverables:

MODELS:
1. /models/Property.ts — fields: landlordId(ref: User), name, address(street, city,
   state, country, zip), description, photos([String] — file paths), isActive,
   createdAt, updatedAt
   Virtual: unitCount (populated via Unit model)

2. /models/Unit.ts — fields: propertyId(ref: Property), landlordId(ref: User),
   unitNumber, floor, type(studio|1BR|2BR|3BR|other), sizeSqft, rentAmount,
   depositAmount, status(available|occupied|maintenance|reserved),
   description, photos([String]), isActive, createdAt, updatedAt

API ROUTES (all protected: landlord only):
3. GET    /api/properties              — list landlord's properties (with unit counts)
4. POST   /api/properties              — create property
5. GET    /api/properties/[id]         — get single property with units
6. PUT    /api/properties/[id]         — update property
7. DELETE /api/properties/[id]         — soft delete (set isActive: false)

8. GET    /api/properties/[id]/units   — list units for a property
9. POST   /api/properties/[id]/units   — create unit
10. PUT   /api/units/[id]              — update unit
11. PATCH /api/units/[id]/status       — update unit status only { status }
12. DELETE /api/units/[id]             — soft delete unit

FILE UPLOAD:
13. POST /api/upload — accepts multipart/form-data with field "files" (max 5 files)
    Saves to /public/uploads/<landlordId>/<timestamp>-<filename>
    Returns: { success, data: { urls: ["/uploads/..."] } }
    Max file size: 5MB per file. Accepted: jpg, jpeg, png, webp only.
    Use formidable for parsing.

UI PAGES (all under /app/(dashboard)/):
14. /properties/page.tsx — property list with cards showing:
    photo thumbnail, name, address, unit count, occupancy rate, active badge
    "Add Property" button top right

15. /properties/new/page.tsx — create property form
    Fields: name, address fields, description, photo upload (drag & drop, preview)
    On success: redirect to /properties/[id]

16. /properties/[id]/page.tsx — property detail page
    Shows: property info, photo gallery, units table
    Units table columns: unit number, type, size, rent, status (colored badge), actions
    "Add Unit" button, "Edit Property" button

17. /properties/[id]/units/new/page.tsx — create unit form
    Fields: unit number, floor, type dropdown, size, rent, deposit, description, photos

18. /components/UnitStatusBadge.tsx — colored badge component
    available: green | occupied: blue | maintenance: yellow | reserved: purple

19. /components/PhotoUpload.tsx — reusable drag & drop photo upload component
    Shows preview thumbnails, allows removal before save

All API routes: landlord can only access their own properties/units.
Add landlordId check on every GET/PUT/DELETE — return 404 if not owner.
```

## Verification Checklist

- [ ] Create a property with 3 photos — photos display in gallery on detail page
- [ ] Create 3 units under the property with different statuses
- [ ] Property list shows correct unit count and occupancy rate
- [ ] Edit property name — change persists on refresh
- [ ] Change unit status via PATCH `/api/units/[id]/status` — badge updates
- [ ] Try to access another landlord's property — returns 404 (not 403, to avoid leaking existence)
- [ ] Upload a non-image file (e.g. .pdf) — returns error
- [ ] Upload a file > 5MB — returns error
- [ ] Soft delete a property — disappears from list but still in DB with isActive: false
- [ ] Unit form validates: rent amount must be > 0, unit number required
- [ ] `GET /api/properties` returns only properties belonging to the logged-in landlord
- [ ] Photos save to `/public/uploads/<landlordId>/` folder

---

---

# PHASE 3 — Tenant Application Form

## Prompt

```
Continue building PropAgent. Phases 0–2 complete.
Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.

Your task: build the public-facing tenant application system. This phase has NO auth
requirement on the tenant-facing side — applications are submitted publicly via a
unique link. Landlord-side views are protected.

Deliverables:

MODELS:
1. /models/Application.ts — fields:
   unitId(ref: Unit), propertyId(ref: Property), landlordId(ref: User),
   tenantInfo: { name, email, phone, currentAddress, moveInDate },
   employment: { status(employed|self_employed|unemployed|student|retired),
     employer, jobTitle, monthlyIncome, employmentDuration },
   references: [{ name, relationship, phone, email }] (max 2),
   additionalNotes: String,
   status: enum(pending|shortlisted|under_review|approved|declined) default: pending,
   applicationLink: String (unique, generated on unit listing),
   aiScreeningStarted: Boolean default false,
   aiTranscript: [{ role(user|assistant), content, timestamp }],
   aiScore: { overall(1-10), incomeStability(1-10), communicationClarity(1-10),
     rentalHistorySignals(1-10), redFlags([String]),
     recommendation(shortlist|review_manually|decline), scoredAt },
   statusHistory: [{ status, changedAt, changedBy(ref: User), note }],
   createdAt, updatedAt

API ROUTES:
2. GET  /api/apply/[unitId] — PUBLIC, no auth
   Returns unit info + property info for the application page
   Only if unit status is 'available' and isActive

3. POST /api/apply/[unitId] — PUBLIC, no auth
   Body: { tenantInfo, employment, references, additionalNotes }
   Creates Application with status: pending
   Creates a tenant User account (if email not exists):
     name from tenantInfo.name, email, temp password (random 8 chars),
     role: tenant, send welcome email with temp password
   Sends confirmation email to applicant
   Returns: { success, data: { applicationId, message } }

4. GET  /api/applications — protected: landlord
   Query params: unitId?, status?, page=1, limit=10
   Returns paginated list of applications for landlord's properties
   Include: tenantInfo.name, tenantInfo.email, unit info, status, aiScore.overall, createdAt

5. GET  /api/applications/[id] — protected: landlord
   Returns full application including aiTranscript and aiScore

6. PATCH /api/applications/[id]/status — protected: landlord
   Body: { status, note? }
   Updates status, appends to statusHistory
   Sends email to applicant on status change

7. PATCH /api/applications/[id]/bulk-status — protected: landlord
   Body: { applicationIds: [], status, note? }
   Bulk update status for multiple applications

PUBLIC UI:
8. /app/apply/[unitId]/page.tsx — multi-step application form (NO login required)
   Step 1: Personal info (name, email, phone, current address, move-in date)
   Step 2: Employment info (status, employer, income, duration)
   Step 3: References (up to 2 optional references)
   Step 4: Additional notes + review summary before submit
   Progress indicator showing current step
   On submit success: show "Application submitted! Check your email." message
   Do NOT redirect — just show success state on same page

LANDLORD UI:
9. /app/(dashboard)/applications/page.tsx — applications list
   Filters: by property (dropdown), by status (tabs: All/Pending/Shortlisted/etc.)
   Table columns: applicant name, email, property/unit, move-in date, AI score (if available), status badge, date
   Click row → application detail page

10. /app/(dashboard)/applications/[id]/page.tsx — application detail
    Shows: all form data, status history timeline, AI score card (if available),
    AI transcript (if available), status update dropdown + note field + save button
    "Start AI Screening" button (disabled if aiScreeningStarted: true)
    Show advisory disclaimer below AI score card

11. /components/ApplicationStatusBadge.tsx — colored badge for application status
    pending: gray | shortlisted: blue | under_review: yellow | approved: green | declined: red

12. Generate a unique application URL per unit:
    Format: /apply/[unitId]
    Show this URL on the unit detail page (/properties/[id]) as a copyable link
```

## Verification Checklist

- [ ] Visit `/apply/[unitId]` without being logged in — form loads correctly
- [ ] Complete all 4 steps — progress indicator advances correctly
- [ ] Submit application — success message shown, no redirect
- [ ] Check DB — Application document created with correct data
- [ ] Check DB — tenant User created with role: tenant
- [ ] Confirmation email sent to applicant email (check console if SMTP not set)
- [ ] Visit `/apply/[unitId]` for an occupied unit — shows "Unit not available" message
- [ ] Landlord views `/applications` — sees the new application
- [ ] Landlord filters by status "pending" — only pending applications shown
- [ ] Landlord opens application detail — all form data visible
- [ ] Landlord changes status to "shortlisted" with a note — status updates, history shows entry
- [ ] Applicant email received on status change (check console)
- [ ] Bulk status update: select 2 applications, decline both — both update correctly
- [ ] Application link shown on unit detail page — copyable
- [ ] "Start AI Screening" button visible and enabled on detail page
- [ ] Landlord cannot see applications belonging to another landlord

---

---

# PHASE 4 — AI Screening Interview

## Prompt

```
Continue building PropAgent. Phases 0–3 complete.
Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.

Your task: build the AI tenant screening interview system.
This is the core differentiator — build it carefully.

The flow:
1. Landlord clicks "Start AI Screening" on an application
2. A chat interface opens (modal or drawer)
3. AI greets the applicant... WAIT — re-read this.

IMPORTANT DESIGN DECISION:
The AI screening interview is conducted ASYNCHRONOUSLY. The landlord triggers it,
but the interview is sent to the TENANT via email as a chat link. The tenant
completes the interview on their own time. The landlord sees the transcript after.

Revised flow:
1. Landlord clicks "Start AI Screening" on application detail page
2. System sends email to tenant with a unique interview link
3. Tenant opens link → sees chat UI → completes interview with AI
4. AI saves transcript in real time
5. When tenant submits "I'm done", interview closes and scoring runs (Phase 5)
6. Landlord sees transcript on application detail (already built in Phase 3)

Deliverables:

MODELS:
1. Add to Application model (update existing):
   interviewToken: String (unique, generated when screening starts)
   interviewTokenExpiry: Date (48 hours from generation)
   interviewStatus: enum(not_started|sent|in_progress|completed) default: not_started

API ROUTES:
2. POST /api/applications/[id]/start-screening — protected: landlord
   Validates: application must be in status pending/shortlisted/under_review
   Validates: interviewStatus must be not_started
   Generates interviewToken (crypto.randomBytes(32).toString('hex'))
   Sets interviewTokenExpiry = now + 48 hours
   Sets interviewStatus = sent, aiScreeningStarted = true
   Sends email to tenant with link: /interview/[token]
   Returns: { success, data: { message: "Interview invitation sent" } }

3. GET /api/interview/[token] — PUBLIC, no auth
   Validates token exists and not expired
   Returns: { success, data: { applicantName, propertyName, unitNumber, interviewStatus } }
   If already completed: return { success: false, error: "Interview already completed" }

4. POST /api/interview/[token]/message — PUBLIC, no auth
   Body: { message: String }
   Validates token, not expired, not completed
   Sets interviewStatus = in_progress if first message
   Appends user message to aiTranscript
   Calls OpenAI with:
     - System prompt (see below)
     - Full conversation history from aiTranscript
     - New user message
   Appends AI response to aiTranscript
   Returns: { success, data: { reply: String, isComplete: Boolean } }
   isComplete = true when AI has asked all required questions (detect via a
   special marker in AI response — see system prompt)

5. POST /api/interview/[token]/complete — PUBLIC, no auth
   Sets interviewStatus = completed
   Triggers scoring (call /api/applications/[id]/score internally)
   Returns: { success, data: { message: "Interview complete. Thank you!" } }

AI SYSTEM PROMPT for interview (store in /lib/prompts.ts):
```
You are a professional tenant screening assistant for a property management company.
Your job is to conduct a friendly, conversational pre-screening interview with a
rental applicant. You already have their application form data: {applicationSummary}.

Your goal: ask follow-up questions to better understand the applicant beyond their
form. Focus on:
1. Employment stability (if self-employed or income seems low, ask for details)
2. Rental history (previous landlord experiences, reasons for moving)
3. Lifestyle fit (pets, smoker, number of occupants, working from home)
4. Any custom questions from the landlord: {customQuestions}

Rules:
- Keep questions conversational, not interrogative. Be warm and professional.
- Ask ONE question at a time. Never ask multiple questions in one message.
- You have 6–8 questions total. Do not exceed 10.
- When you have asked all necessary questions, end with a warm closing message
  and include exactly this marker on its own line: [INTERVIEW_COMPLETE]
- Never ask about age, race, religion, family status, national origin, or disability.
  These are legally protected characteristics.
- Never promise or imply approval or rejection.
```

LANDLORD CUSTOM QUESTIONS:
6. Add to landlord settings (simple for now):
   /api/landlord/screening-questions — GET + PUT
   Body: { questions: [String] } (max 5 custom questions)
   Store on User model: screeningQuestions: [String]
   Update User model to add this field.

PUBLIC UI:
7. /app/interview/[token]/page.tsx — tenant interview chat page
   NO login required
   Show: property name, unit, "Tenant Screening Interview" header
   Chat bubble UI (tenant messages right-aligned, AI messages left-aligned)
   Input field at bottom + Send button
   On first load: AI sends opening message automatically
   Typing indicator while waiting for AI response
   When isComplete = true: show "Complete Interview" button
   On complete: show thank-you screen, chat input disabled
   If token expired: show "This interview link has expired. Contact your landlord."
   If already completed: show "You have already completed this interview."

LANDLORD UI UPDATES:
8. Update /app/(dashboard)/applications/[id]/page.tsx:
   "Start AI Screening" button → POST to start-screening → show success toast
   After screening started: show interview status badge (Sent / In Progress / Completed)
   Screening questions settings link (opens modal to configure custom questions)

EMAIL TEMPLATES (add to /lib/email.ts):
9. Interview invitation email:
   Subject: "Your rental application interview for [Property] - [Unit]"
   Body: applicant name, property details, interview link, 48-hour expiry warning
```

## Verification Checklist

- [ ] Landlord clicks "Start AI Screening" — button shows loading then success toast
- [ ] Application shows interview status: "Sent"
- [ ] Tenant receives email with interview link (check console)
- [ ] Visit `/interview/[token]` — loads without login, shows property/unit name
- [ ] AI sends first message automatically on page load
- [ ] Send a message — AI responds with one follow-up question
- [ ] AI never asks two questions at once
- [ ] AI never asks about protected characteristics (test: ask "how old are you" — AI deflects)
- [ ] After ~7 exchanges — AI sends closing message with [INTERVIEW_COMPLETE] (hidden from UI)
- [ ] "Complete Interview" button appears when AI signals completion
- [ ] Click complete — thank-you screen shown, input disabled
- [ ] Application interviewStatus updates to "completed" in DB
- [ ] aiTranscript array populated with full conversation
- [ ] Landlord views application detail — sees full transcript
- [ ] Visit expired token link — shows expiry message
- [ ] Visit already-completed token — shows completed message
- [ ] Landlord saves custom questions — appear in next interview's AI context
- [ ] Click "Start AI Screening" on already-started application — button disabled

---

---

# PHASE 5 — AI Scoring Engine

## Prompt

```
Continue building PropAgent. Phases 0–4 complete.
Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.

Your task: build the AI scoring engine that runs after interview completion
and displays results to the landlord.

Deliverables:

API ROUTES:
1. POST /api/applications/[id]/score — INTERNAL (called by Phase 4 complete endpoint)
   Also accessible: protected landlord route for manual re-score trigger
   
   Reads from application: tenantInfo, employment, aiTranscript
   Calls OpenAI with scoring prompt (see below)
   Expects JSON response — use OpenAI response_format: { type: "json_object" }
   Saves result to application.aiScore
   Returns: { success, data: { aiScore } }

SCORING SYSTEM PROMPT (add to /lib/prompts.ts):
```
You are a tenant screening analyst. You have been given:
1. A rental applicant's form data
2. A full AI screening interview transcript

Your job: produce an objective advisory scoring report. You are NOT making the
final decision — the landlord makes all final decisions. You are providing
structured analysis to help them prioritize.

Score each dimension 1–10 where:
1–3 = Significant concerns
4–6 = Neutral / unclear
7–9 = Positive indicators
10  = Exceptionally strong

Dimensions:
- income_stability: Does income appear sufficient and stable for this rent?
  (Common rule: monthly income ≥ 3x rent. Flag if below.)
- communication_clarity: Was the applicant clear, responsive, and consistent
  in the interview? Did answers match their form?
- rental_history_signals: Did they mention prior landlords positively?
  Any red flags (eviction mentions, sudden moves, vague answers about past rentals)?
- overall: Weighted average (income_stability 40%, communication 30%, rental_history 30%)

Also provide:
- red_flags: array of specific concerns. Empty array if none.
  Example: ["Stated income ($2,000/mo) is below 3x rent ($2,500/mo)",
            "Was vague when asked about reason for leaving previous rental"]
- recommendation: one of: "shortlist" | "review_manually" | "decline"

IMPORTANT RULES:
- Base scores only on financial and tenancy-relevant factors
- Do NOT factor in protected characteristics (age, race, religion, family status,
  national origin, disability, gender)
- If transcript is too short (<3 exchanges), set all scores to null and
  recommendation to "review_manually" with note: "Insufficient interview data"
- Always err toward "review_manually" when uncertain

Respond ONLY with valid JSON matching this exact schema:
{
  "income_stability": <1-10 or null>,
  "communication_clarity": <1-10 or null>,
  "rental_history_signals": <1-10 or null>,
  "overall": <1-10 or null>,
  "red_flags": [<string>],
  "recommendation": "shortlist" | "review_manually" | "decline",
  "score_summary": "<2-3 sentence plain English summary of findings>",
  "scored_at": "<ISO timestamp>"
}
```

2. GET /api/applications/[id]/score — protected: landlord
   Returns aiScore object for the application
   Returns 404 if scoring not yet run

LANDLORD UI:
3. /components/AIScoreCard.tsx — score display component
   Shows:
   - Overall score: large number with colored ring (green ≥7, yellow 4–6, red ≤3)
   - Recommendation badge: Shortlist (green) | Review Manually (yellow) | Decline (red)
   - 3 dimension scores as horizontal bar chart (use CSS, no chart library)
   - Red flags list (red bullet points, empty state: "No red flags identified")
   - Score summary paragraph
   - Scored at timestamp
   - Advisory disclaimer (always visible, styled as an info box):
     "AI scoring is advisory only. Scores are based on stated information and
      interview responses. The final decision is yours. This tool does not
      perform credit checks or background verification."

4. Update /app/(dashboard)/applications/[id]/page.tsx:
   Replace placeholder AI score section with AIScoreCard component
   Show loading state while scoring runs (poll /api/applications/[id]/score
   every 3 seconds after interview completes until score available)
   "Re-score" button for landlord (triggers manual re-score)

5. Update /app/(dashboard)/applications/page.tsx (list view):
   Show overall score as a colored number badge in the table
   Null score shows "--" in gray
   Add sort by score option

```

## Verification Checklist

- [ ] After interview completes — scoring runs automatically (check DB for aiScore)
- [ ] aiScore has all 5 fields: 4 scores + recommendation + red_flags + summary
- [ ] Score is valid JSON — no markdown, no extra text
- [ ] AIScoreCard renders with correct colors (green/yellow/red based on score)
- [ ] Recommendation badge shows correct color and label
- [ ] Red flags list shows as bullet points; shows "No red flags identified" if empty
- [ ] Advisory disclaimer always visible below score card
- [ ] Short transcript (<3 exchanges) → all scores null, recommendation: review_manually
- [ ] "Re-score" button triggers new scoring and updates the card
- [ ] Applications list shows score badge in correct color
- [ ] Null scores show "--" not "null" or "0"
- [ ] Scoring never factors in age/race/gender (verify by checking prompt is sent correctly)
- [ ] Score persists on page refresh

---

---

# PHASE 6 — Lease Management

## Prompt

```
Continue building PropAgent. Phases 0–5 complete.
Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.

Your task: build the lease management module.

Deliverables:

MODELS:
1. /models/Lease.ts — fields:
   applicationId(ref: Application), unitId(ref: Unit), propertyId(ref: Property),
   landlordId(ref: User), tenantId(ref: User),
   startDate, endDate, monthlyRent, depositAmount, specialTerms(String),
   status: enum(active|expiring_soon|expired|terminated) default: active,
   documents: [{ filename, path, uploadedAt }],
   paymentLog: [{ paidDate, amount, method(cash|bank_transfer|online|other),
     notes, loggedAt, loggedBy(ref: User) }],
   terminationReason: String,
   terminatedAt: Date,
   createdAt, updatedAt

2. Add a daily cron-style check: /lib/leaseChecker.ts
   Function: checkExpiringLeases()
   Finds leases where endDate is within 30 days AND status is 'active'
   Updates their status to 'expiring_soon'
   Sends email to landlord for each expiring lease
   Call this from a Next.js API route that can be triggered by a cron job or manually

API ROUTES (all protected: landlord):
3. POST /api/leases — create lease
   Body: { applicationId, startDate, endDate, monthlyRent, depositAmount, specialTerms }
   Pre-fills tenantId, unitId, propertyId from the application
   Updates unit status to 'occupied'
   Updates application status to 'approved'
   Sends welcome email to tenant with lease summary

4. GET  /api/leases — list landlord's leases
   Query: status?, unitId?, page, limit
   Returns with: tenant name/email, property/unit info

5. GET  /api/leases/[id] — get single lease with full payment log

6. PUT  /api/leases/[id] — update lease (specialTerms, endDate for renewal)
   If endDate extended: set status back to 'active' if was 'expiring_soon'

7. POST /api/leases/[id]/payments — log a payment
   Body: { paidDate, amount, method, notes }
   Appends to paymentLog

8. POST /api/leases/[id]/documents — upload lease document (PDF only)
   Saves to /public/uploads/leases/[leaseId]/
   Appends to documents array

9. POST /api/leases/[id]/terminate — terminate lease early
   Body: { reason }
   Sets status: terminated, terminationReason, terminatedAt
   Updates unit status back to 'available'

10. GET /api/leases/check-expiring — trigger expiry check (for cron or manual)
    Calls checkExpiringLeases(), returns count of leases updated

TENANT API:
11. GET /api/tenant/lease — protected: tenant role
    Returns the tenant's active lease with payment history
    (tenants can only see their own lease)

UI PAGES:
12. /app/(dashboard)/leases/page.tsx — leases list
    Tabs: Active | Expiring Soon | Expired | Terminated
    Table: tenant name, property/unit, rent, start/end date, status badge, actions
    Status colors: active=green, expiring_soon=orange, expired=gray, terminated=red

13. /app/(dashboard)/leases/new/page.tsx — create lease form
    Pre-populate from applicationId query param if provided
    Fields: start date, end date, monthly rent, deposit, special terms (textarea)
    If coming from application: show applicant name and unit as read-only header

14. /app/(dashboard)/leases/[id]/page.tsx — lease detail
    Sections:
    a) Lease summary (all fields, edit button)
    b) Tenant info card (name, email, phone — links to their application)
    c) Documents section (upload PDF, list uploaded docs with download link)
    d) Payment log table (date, amount, method, notes) + "Log Payment" button
    e) Payment log — show running total paid vs expected (monthlyRent × months elapsed)
    f) Danger zone: "Terminate Lease" button (confirm dialog required)
    g) "Renew Lease" button (opens modal to set new end date + optional rent update)

15. /app/(tenant)/lease/page.tsx — tenant's lease view (read-only)
    Shows: lease terms, payment history, landlord contact info
    Cannot edit anything

16. /components/LeaseStatusBadge.tsx — colored badge
    active: green | expiring_soon: orange | expired: gray | terminated: red
```

## Verification Checklist

- [ ] Create lease from an approved application — unit status changes to "occupied"
- [ ] Lease list shows correct status colors
- [ ] Log a payment — appears in payment log immediately
- [ ] Running total shows correct paid vs expected calculation
- [ ] Upload a PDF document — appears in documents list with download link
- [ ] Upload a non-PDF file — returns error
- [ ] Terminate lease — unit status reverts to "available", lease shows "terminated"
- [ ] Renew lease — end date extends, status reverts to "active" if was "expiring_soon"
- [ ] `GET /api/leases/check-expiring` — updates leases expiring in 30 days
- [ ] Lease expiring in 29 days — status changes to "expiring_soon"
- [ ] Expiry email sent to landlord (check console)
- [ ] Tenant logs in — sees their lease at `/tenant/lease`
- [ ] Tenant cannot access `/api/leases` (landlord route) — returns 403
- [ ] Lease list tabs filter correctly (Active/Expiring/etc.)
- [ ] Create lease from application page (via applicationId param) — pre-populates correctly

---

---

# PHASE 7 — Maintenance Requests

## Prompt

```
Continue building PropAgent. Phases 0–6 complete.
Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.

Your task: build the maintenance request module.

Deliverables:

MODELS:
1. /models/MaintenanceRequest.ts — fields:
   leaseId(ref: Lease), unitId(ref: Unit), propertyId(ref: Property),
   landlordId(ref: User), tenantId(ref: User),
   category: enum(plumbing|electrical|hvac|structural|appliance|other),
   urgency: enum(low|medium|urgent),
   title: String (max 100 chars),
   description: String (max 1000 chars),
   photos: [String] (file paths, max 3),
   status: enum(open|in_progress|resolved|closed) default: open,
   landlordNotes: [{ note, addedAt, addedBy(ref: User) }],
   resolvedAt: Date,
   createdAt, updatedAt

API ROUTES:
2. POST /api/maintenance — protected: tenant
   Body: { category, urgency, title, description, photos[] }
   Auto-fills: leaseId, unitId, propertyId, landlordId from tenant's active lease
   If tenant has no active lease: return 400 "No active lease found"
   Sends email notification to landlord

3. GET  /api/maintenance — protected: landlord
   Query: status?, urgency?, propertyId?, page, limit
   Returns all requests for landlord's properties, newest first
   Urgent + open requests sorted to top

4. GET  /api/maintenance/[id] — protected: landlord or tenant (own request only)

5. PATCH /api/maintenance/[id]/status — protected: landlord
   Body: { status }
   If status = resolved: set resolvedAt = now
   Sends email to tenant on status change

6. POST /api/maintenance/[id]/notes — protected: landlord
   Body: { note }
   Appends to landlordNotes (NOT visible to tenant)

7. GET /api/tenant/maintenance — protected: tenant
   Returns tenant's own maintenance requests (all statuses)

UI PAGES:
8. /app/(tenant)/maintenance/page.tsx — tenant maintenance list
   Shows own requests: category icon, title, urgency badge, status badge, date
   "Submit New Request" button

9. /app/(tenant)/maintenance/new/page.tsx — submit request form
   Fields: title, category (dropdown with icons), urgency (radio buttons),
   description (textarea), photo upload (max 3)
   Show helpful hints per urgency level:
     urgent: "We'll contact your landlord immediately"
     medium: "Typically addressed within 3-5 business days"
     low: "Scheduled during routine maintenance"

10. /app/(dashboard)/maintenance/page.tsx — landlord maintenance overview
    Summary row: total open, urgent count, in progress count
    Filter bar: by property, by status, by urgency, by category
    Table: unit/property, tenant name, category icon, title, urgency badge,
    status badge, submitted date, action button
    Urgent + open requests highlighted with left border accent color

11. /app/(dashboard)/maintenance/[id]/page.tsx — maintenance request detail
    Shows: all request fields, photos gallery
    Status update dropdown (Open / In Progress / Resolved / Closed)
    Internal notes section (add note, list of notes with timestamps)
    Note: clearly label "Internal Notes — Not visible to tenant"
    Tenant contact info card

12. /components/UrgencyBadge.tsx
    low: gray | medium: yellow | urgent: red (with pulse animation)

13. /components/CategoryIcon.tsx — icon per category
    Use emoji or simple SVG: 🔧 plumbing, ⚡ electrical, ❄️ hvac,
    🏗️ structural, 🍳 appliance, 📋 other
```

## Verification Checklist

- [ ] Tenant submits maintenance request — appears in landlord's list immediately
- [ ] Landlord receives email notification (check console)
- [ ] Urgent requests appear at top of landlord list
- [ ] Urgency badge shows pulse animation on "urgent"
- [ ] Landlord updates status to "in_progress" — tenant sees updated status
- [ ] Tenant receives email on status change (check console)
- [ ] Landlord adds internal note — note saved, NOT visible in tenant view
- [ ] Landlord marks resolved — resolvedAt timestamp set, status changes
- [ ] Tenant without active lease tries to submit — gets "No active lease found" error
- [ ] Tenant cannot access another tenant's request — returns 404
- [ ] Photo upload (max 3) — 4th photo rejected with error
- [ ] Category icons display correctly for all 6 categories
- [ ] Filter by property — shows only that property's requests
- [ ] Filter by urgent — shows only urgent requests
- [ ] Landlord summary row shows correct counts

---

---

# PHASE 8 — Dashboards

## Prompt

```
Continue building PropAgent. Phases 0–7 complete.
Reference: TECH_STACK.md, CONVENTIONS.dev, propagent_spec.md.

Your task: build the landlord dashboard and tenant dashboard home pages.
All data must come from real DB queries — no hardcoded mock data.

Deliverables:

API ROUTES:
1. GET /api/dashboard/landlord — protected: landlord
   Returns:
   {
     summary: {
       totalProperties: Number,
       totalUnits: Number,
       occupiedUnits: Number,
       occupancyRate: Number (%), // occupiedUnits / totalUnits * 100
       pendingApplications: Number,
       activeLeases: Number,
       expiringSoonLeases: Number, // next 30 days
       openMaintenanceRequests: Number,
       urgentMaintenanceRequests: Number
     },
     recentActivity: [ // last 10 events, newest first
       { type, description, relatedId, relatedModel, timestamp }
       // types: new_application | status_change | payment_logged |
       //        maintenance_submitted | lease_created | lease_expiring
     ],
     expiringLeases: [ // next 60 days
       { leaseId, tenantName, propertyName, unitNumber, endDate, daysUntilExpiry }
     ],
     overdueUnits: [ // units with active lease but no payment logged this month
       { unitId, unitNumber, propertyName, tenantName, tenantEmail, lastPaymentDate }
     ]
   }

2. GET /api/dashboard/tenant — protected: tenant
   Returns:
   {
     lease: { status, endDate, monthlyRent, propertyName, unitNumber, daysUntilExpiry },
     recentPayments: [ last 3 payments ],
     openMaintenanceRequests: Number,
     maintenanceRequests: [ last 3 requests with status ]
   }

UI PAGES:
3. /app/(dashboard)/page.tsx — landlord dashboard (THIS IS THE HOME PAGE after login)

   Section A — Summary Cards (2x4 grid):
   - Total Properties (blue icon)
   - Total Units / Occupancy Rate (e.g. "24 units · 87% occupied")
   - Pending Applications (orange, clickable → /applications?status=pending)
   - Active Leases (green, clickable → /leases?status=active)
   - Expiring Soon (orange warning, clickable → /leases?status=expiring_soon)
   - Open Maintenance (yellow, clickable → /maintenance?status=open)
   - Urgent Maintenance (red with pulse if > 0, clickable → /maintenance?urgency=urgent)

   Section B — Recent Activity Feed:
   List of last 10 events with icon, description, relative timestamp ("2 hours ago")
   Each event clickable → links to relevant detail page
   Icons per event type (use emoji or simple SVG)

   Section C — Two columns:
   Left: Expiring Leases (next 60 days) — table with days until expiry colored:
     ≤7 days: red | 8–30 days: orange | 31–60 days: yellow
   Right: Overdue Rent — table with tenant name, unit, last payment date

4. /app/(tenant)/page.tsx — tenant dashboard home

   Section A: Lease status card
   Shows: property name, unit, monthly rent, lease end date
   If expiring soon (≤30 days): show orange warning banner
   If expired: show red banner with "Contact your landlord"

   Section B: Quick actions row
   - "Submit Maintenance Request" button → /tenant/maintenance/new
   - "View Payment History" button → /tenant/lease

   Section C: Recent maintenance requests (last 3)
   Category icon, title, status badge, date submitted

5. Update /app/(dashboard)/layout.tsx — add sidebar navigation:
   Links: Dashboard, Properties, Applications, Leases, Maintenance, Settings
   Show unread badge on Applications (pending count) and Maintenance (urgent count)
   Active link highlighted
   Landlord name + company logo in sidebar header
   Logout button at bottom

6. Update /app/(tenant)/layout.tsx — add simple top nav:
   Links: Home, My Lease, Maintenance
   Tenant name in top right
   Logout button
```

## Verification Checklist

- [ ] Landlord dashboard loads with real data (not zeros unless DB is empty)
- [ ] Occupancy rate calculates correctly (e.g. 3 occupied / 4 total = 75%)
- [ ] Pending applications card count matches `/applications?status=pending` list count
- [ ] Clicking summary card navigates to correct filtered list
- [ ] Recent activity shows last 10 events in correct order
- [ ] Activity timestamps show relative time ("3 hours ago", "2 days ago")
- [ ] Expiring leases table shows correct days until expiry with correct colors
- [ ] Overdue rent table shows units with no payment this calendar month
- [ ] Urgent maintenance card shows red pulse if count > 0
- [ ] Tenant dashboard shows their lease details correctly
- [ ] Tenant expiring lease warning shows when ≤30 days remaining
- [ ] Tenant maintenance list shows last 3 requests
- [ ] Sidebar navigation shows correct unread badges
- [ ] Active sidebar link is highlighted
- [ ] Sidebar shows landlord company logo if uploaded
- [ ] All navigation links work correctly

---

---

# PHASE 9 — Super Admin Panel

## Prompt

```
Continue building PropAgent. Phases 0–8 complete.
Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.

Your task: build the super admin panel.

Deliverables:

API ROUTES (all protected: super_admin only):
1. GET /api/admin/landlords — paginated list of all landlords
   Returns: name, email, companyName, isActive, propertyCount, createdAt
   Query: search(name/email), isActive?, page, limit

2. PATCH /api/admin/landlords/[id]/toggle — activate/deactivate landlord
   Flips isActive. If deactivated: tenant-facing pages for their properties return 503.

3. GET /api/admin/stats — platform-wide stats
   Returns: totalLandlords, totalProperties, totalUnits, totalApplications,
   totalLeases, activeLeases, totalMaintenanceRequests

4. GET /api/admin/settings — get system settings
5. PUT /api/admin/settings — update system settings

MODELS:
6. /models/SystemSettings.ts — singleton document, fields:
   appName: String default "PropAgent"
   appLogo: String (file path)
   aiModel: String default "gpt-4o-mini"
   openaiApiKey: String (encrypted at rest — use simple AES-256 via Node crypto)
   smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom (all String)
   emailTemplates: {
     applicationConfirmation: { subject, body },
     statusChange: { subject, body },
     interviewInvitation: { subject, body },
     leaseWelcome: { subject, body },
     leaseExpiry: { subject, body }
   }
   updatedAt

   On app startup: if no SystemSettings doc exists, create one with defaults from .env.

7. Update /lib/ai.ts and /lib/email.ts to read config from SystemSettings
   (fallback to env vars if SystemSettings not configured)

UI PAGES:
8. /app/(admin)/layout.tsx — admin layout with sidebar
   Links: Dashboard, Landlords, Settings
   Must verify super_admin role — redirect others to /dashboard

9. /app/(admin)/page.tsx — admin dashboard
   Platform stats cards (totalLandlords, totalProperties, totalApplications, etc.)
   Simple, data-focused layout

10. /app/(admin)/landlords/page.tsx — landlords list
    Search bar (by name or email)
    Table: name, email, company, properties count, status badge, joined date, toggle button
    Toggle active/inactive — confirm dialog: "Deactivate [Name]? Their tenant portal will be unavailable."

11. /app/(admin)/settings/page.tsx — system settings form
    Tabs:
    a) General: app name, app logo upload
    b) AI Config: AI model selector (gpt-4o-mini | gpt-4o | gpt-3.5-turbo),
       OpenAI API key input (masked, show/hide toggle), "Test AI Connection" button
       → calls /api/admin/settings/test-ai → sends a test prompt, returns success/fail
    c) Email Config: SMTP fields, "Send Test Email" button
       → sends test email to super_admin's email
    d) Email Templates: textarea editor per template with variable hints
       Variables shown as chips: {{tenantName}}, {{propertyName}}, {{unitNumber}}, etc.

12. POST /api/admin/settings/test-ai — protected: super_admin
    Uses configured API key to send: "Respond with: OK"
    Returns: { success, data: { response: "OK" } } or error

13. POST /api/admin/settings/test-email — protected: super_admin
    Sends a test email to the super_admin's own email address
    Returns: { success } or error
```

## Verification Checklist

- [ ] Login as super_admin — redirects to `/admin`
- [ ] Login as landlord — cannot access `/admin` (redirects to `/dashboard`)
- [ ] Admin dashboard shows real platform-wide counts
- [ ] Landlords list shows all registered landlords with property counts
- [ ] Search landlords by name — filters correctly
- [ ] Deactivate a landlord — their properties' public pages return 503
- [ ] Reactivate landlord — their pages work again
- [ ] "Test AI Connection" — success if API key valid, clear error if invalid
- [ ] "Send Test Email" — email received at super_admin email (check console)
- [ ] Update app name — reflected in page title
- [ ] Upload app logo — displayed in admin sidebar
- [ ] Email template edit — saves correctly, uses updated template in next email
- [ ] SystemSettings created on first startup with env var defaults
- [ ] OpenAI API key stored encrypted (not plaintext in DB)
- [ ] AI key from SystemSettings used in preference to env var

---

---

# PHASE 10 — Polish & CodeCanyon Prep

## Prompt

```
Continue building PropAgent. Phases 0–9 complete. All features are built.
Reference: TECH_STACK.md, CONVENTIONS.md, propagent_spec.md.

Your task: production polish, demo data, and CodeCanyon submission preparation.
No new features. Only polish, docs, and packaging.

Deliverables:

DEMO DATA:
1. Update /scripts/seed.ts to create a complete demo dataset:
   - 1 super_admin (admin@propagent.com / Admin123!)
   - 2 landlords:
     a) demo@landlord.com / Demo123! — "Sunrise Property Group"
        2 properties, 6 units (mix of statuses)
        4 applications (mix of statuses, 2 with completed AI scores)
        3 active leases with payment history
        2 maintenance requests
     b) second@landlord.com / Demo123! — "Metro Rentals"
        1 property, 3 units
        2 applications
   - 3 tenants with active leases
   - Pre-populated AI transcripts and scores (realistic mock data, not Lorem Ipsum)
   Script should be idempotent: running twice doesn't create duplicates.
   Add npm script: "seed": "ts-node scripts/seed.ts"

ERROR HANDLING & UX POLISH:
2. Add a global error boundary: /components/ErrorBoundary.tsx
   Shows friendly error page with "Return to Dashboard" button
   Log errors to console (no external service for v1)

3. Add loading skeletons for all data-heavy pages:
   - Property list: card skeleton
   - Application list: table row skeleton
   - Dashboard: card skeleton
   Use Tailwind animate-pulse for skeleton effect

4. Add empty states for all list pages:
   - No properties: "You haven't added any properties yet. [Add your first property →]"
   - No applications: "No applications yet. Share your unit link to start receiving applications."
   - No leases: "No leases yet. Approve an application to create a lease."
   - No maintenance: "No maintenance requests. All quiet!"
   Each empty state has an icon and a call-to-action button where relevant.

5. Add toast notification system (no external library — build simple):
   /components/Toast.tsx + /hooks/useToast.ts
   Types: success (green), error (red), warning (yellow), info (blue)
   Auto-dismiss after 4 seconds
   Position: top-right

6. Form validation consistency pass:
   All forms must show inline errors (not alert())
   Required fields marked with *
   Disable submit button while request is in flight (show spinner)
   Re-enable on error so user can retry

DOCUMENTATION:
7. /docs/INSTALL.md — step-by-step installation guide
   Sections:
   a) Requirements (Node 20+, MongoDB 7+, Docker optional)
   b) Quick Start (clone, npm install, .env setup, npm run dev)
   c) Docker Compose setup (recommended for production)
   d) Environment Variables (full table with description and example for every variable)
   e) First Login (seed script, admin credentials)
   f) Setting up AI Screening (how to get OpenAI key, where to enter it)
   g) Setting up Email (SMTP config for Gmail, Sendgrid, Mailgun)
   h) Troubleshooting (top 5 common issues with solutions)

8. /docs/CODECANYON_DESCRIPTION.md — the CodeCanyon listing copy:
   a) Item title: "PropAgent – AI Tenant Screening & Property Management SaaS (Next.js + MongoDB)"
   b) Description sections: Key Features, How AI Screening Works (step-by-step),
      Who Is This For?, Tech Stack, Requirements, What's Included
   c) Feature list (bullet points, ready to paste into CodeCanyon editor)
   d) AI disclaimer (required): exact text for the listing disclaimer section
   e) Tags list (copy from propagent_spec.md)

SECURITY PASS:
9. Audit and fix these specific items:
   a) All API routes — confirm landlordId ownership check on every GET/PUT/DELETE
   b) Tenant routes — confirm tenants can only access their own data
   c) File upload — confirm file type and size validation on every upload endpoint
   d) AI prompts — confirm protected characteristic filter is in every screening prompt
   e) Rate limiting — add simple in-memory rate limiter to:
      POST /api/apply/[unitId] (max 3 per IP per hour)
      POST /api/auth/login (max 10 per IP per 15 minutes)
   f) Sanitize all user text inputs before storing (strip HTML tags)

FINAL CHECKS:
10. Run through and fix any TypeScript errors: npm run build must pass with 0 errors
11. Add /app/not-found.tsx — custom 404 page with PropAgent branding
12. Add /app/error.tsx — Next.js error page with PropAgent branding
13. Test all email notifications end-to-end with a real SMTP config
14. Verify docker-compose up starts the full app successfully
15. Write /docs/CHANGELOG.md — v1.0.0 initial release with full feature list
```

## Verification Checklist

- [ ] `npm run seed` creates all demo data, running twice doesn't duplicate
- [ ] Login as demo@landlord.com — dashboard shows real data (properties, applications, leases)
- [ ] Login as admin@propagent.com — admin panel shows platform stats
- [ ] All list pages show skeleton loader while fetching
- [ ] All list pages show correct empty state when no data
- [ ] Toast notifications appear and auto-dismiss after 4 seconds
- [ ] Submit a form with missing required fields — inline errors shown, no alert()
- [ ] Submit button shows spinner while request is in flight
- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] `/404` shows custom branded page
- [ ] `docker-compose up` starts app and mongo, app accessible at localhost:3000
- [ ] Rate limiting: submit application 4x from same IP within an hour — 4th blocked
- [ ] Rate limiting: wrong login 11x — 11th blocked with "Too many attempts" message
- [ ] HTML in a text field (e.g. `<script>alert(1)</script>`) — stored as sanitized text
- [ ] INSTALL.md covers all env variables in a clear table
- [ ] CODECANYON_DESCRIPTION.md has AI disclaimer text included
- [ ] All 7 email types send correctly end-to-end with real SMTP

---

---

## QUICK REFERENCE — Phase Dependencies

```
Phase 0 → Foundation for everything
Phase 1 → Required by all subsequent phases (auth)
Phase 2 → Required by Phase 3 (units must exist for applications)
Phase 3 → Required by Phase 4 (applications must exist for screening)
Phase 4 → Required by Phase 5 (transcript must exist for scoring)
Phase 5 → Required by Phase 8 dashboard (score cards)
Phase 6 → Required by Phase 7 (lease must exist for maintenance)
Phase 7 → Required by Phase 8 (maintenance counts on dashboard)
Phase 8 → Requires Phases 2–7 complete (all data sources)
Phase 9 → Can be built any time after Phase 1
Phase 10 → Always last
```

## TIPS FOR WORKING WITH THE AI AGENT

1. **Always attach these files to every session:**
   `TECH_STACK.md`, `CONVENTIONS.md`, `ENV_TEMPLATE.md`, `propagent_spec.md`

2. **Start each phase prompt with context:**
   Add: "Phases X–Y are complete and working." so the agent doesn't re-scaffold.

3. **If the agent drifts from conventions** (wrong folder, wrong response format):
   Paste the relevant section from CONVENTIONS.md directly into the prompt.

4. **Verification failures:**
   If a checklist item fails, don't move to the next phase. Fix it first.
   Ask the agent: "Item [X] in the Phase [N] checklist is failing. Here's the error: [paste error]. Fix it."

5. **Context window management:**
   For Phase 10 (polish), the agent may not remember all earlier code.
   Paste specific file contents when asking for targeted fixes.