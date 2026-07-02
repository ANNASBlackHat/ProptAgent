# PropAgent — AI-Powered Rental Screening & Property Management Platform

**PropAgent** is a state-of-the-art, modern property management SaaS built for landlords, property managers, and real estate professionals. Designed with a premium, sleek, dark-themed dashboard, PropAgent uses OpenAI-driven artificial intelligence to conduct interactive applicant screenings, generate detailed applicant scores, flag lease risks, and automate lease tracking and maintenance workflows.

---

## ✨ Key Features

- 🤖 **Interactive AI-Powered Screening**: Public application portals invite prospective tenants to complete automated, conversational screenings where our AI interviews them regarding their rental history, references, and employment.
- 📊 **Risk Scoring & Flag System**: Generates a unified risk score (0-100) and displays clear warning indicators (e.g. income-to-rent ratio mismatch, rental gap discrepancies, or landlord reference red flags).
- 🏘️ **Property & Unit Management**: Add properties, track occupancy, capture photos, and manage rents, deposits, and status.
- 📑 **Digital Leases & Document Ledger**: Approve applications to generate digital leases. Upload signed lease agreements (PDFs) and maintain an organized digital document repository.
- 💳 **Manual Payment Logger**: Landlords can manually log rent payments, record payment methods (online, cash, bank transfer), and add ledger notes.
- 🔧 **Tenant Portal & Maintenance**: A dedicated dashboard for tenants to review active lease terms, view historical payment receipts, and submit maintenance requests (attaching photos and selecting urgency levels).
- 🚨 **Global Class-based Error Boundaries**: Custom branded error fallbacks and toast notification systems built for premium usability.
- 🔒 **Security-First Architecture**: Built-in sliding-window rate limiters (protecting login and submission APIs), input sanitization, and absolute database ownership checks.
- 🧑‍💻 **Super Admin Control Center**: High-level metrics, platform-wide audit tools, and total control over registered landlords and properties.

---

## 💻 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB (via Mongoose ORM)
- **Styling**: Tailwind CSS (sleek dark glassmorphism)
- **State & Notifications**: Custom Hooks & Toast Notification System
- **Language**: TypeScript
- **AI Integrations**: OpenAI API (Completions)

---

## 🤖 AI & API Usage Disclaimer

PropAgent relies on the OpenAI API to conduct candidate screenings and compute AI scores. 
- Landlords must provide their own OpenAI API Key in the application configuration to enable AI screening features.
- Costs associated with the OpenAI API are billed directly to the API key holder based on usage. PropAgent is not responsible for any API usage fees.

---

## 🏷️ Search & Category Tags

`property management`, `tenant screening`, `ai rental agent`, `landlord portal`, `tenant portal`, `lease management`, `rent ledger`, `maintenance tracker`, `nextjs saas`, `mongodb property app`
