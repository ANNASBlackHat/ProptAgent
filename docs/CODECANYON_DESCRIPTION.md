# PropAgent – AI Tenant Screening & Property Management SaaS with Subscription Billing (Next.js + MongoDB + Stripe)

**PropAgent** is a state-of-the-art, modern property management SaaS built for landlords, property managers, and real estate professionals. Designed with a premium, sleek, dark-themed dashboard, PropAgent uses OpenAI-driven artificial intelligence to conduct interactive applicant screenings, generate detailed applicant scores, flag lease risks, and automate lease tracking and maintenance workflows.

---

## 👥 Who is this for?

Entrepreneurs who want to launch a property management SaaS business without building from scratch. PropAgent includes everything needed to charge landlords, enforce plan limits, and manage subscribers — deploy and start generating revenue.

---

## ✨ Key Features

✅ **Full SaaS subscription billing** powered by Stripe
✅ **3 built-in plans** (Free / Pro / Business) — fully customizable
✅ **Automatic plan limit enforcement** per feature
✅ **Stripe Customer Portal** for landlord self-service billing
✅ **Revenue dashboard** with MRR, ARR, and per-plan analytics
✅ **Trial period support** (configurable per plan)
✅ **Webhook-driven subscription lifecycle** (payment failed, cancelled, etc.)

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

## 💼 How the Business Model Works

You deploy PropAgent on your server. Landlords register and subscribe to a plan. Stripe handles all payments directly to your account. PropAgent never touches the money — it just manages access.

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
- Stripe integration requires a Stripe account. PropAgent uses Stripe's official API and never stores card details. PCI compliance is handled by Stripe.

---

## 💰 Recommended Pricing

- **Purchase Price**: $89 (The addition of the full Stripe subscription billing system justifies the price increase. Comparable products without billing are priced at $89).

---

## 🏷️ Search & Category Tags

`property management`, `tenant screening`, `ai rental agent`, `landlord portal`, `tenant portal`, `lease management`, `rent ledger`, `maintenance tracker`, `nextjs saas`, `mongodb property app`, `stripe billing`, `subscription saas`, `recurring payments`, `mrr dashboard`, `saas starter`, `property saas`
