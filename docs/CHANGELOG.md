# Changelog

All notable changes to this project will be documented in this file.

---

## v1.0.0 — Initial Release

### Core Features
- Multi-role authentication (Super Admin, Landlord, Tenant)
- Property and unit management with photo galleries
- Public tenant application form (multi-step)
- AI tenant screening interview (async, chat-based)
- AI applicant scoring with structured JSON output
- Lease management with payment logging
- Maintenance request system
- Landlord and tenant dashboards
- Super admin panel

### Subscription & Billing
- Stripe-powered subscription billing
- 3 default plans: Free, Pro, Business
- Customizable plan limits per feature
- Automatic limit enforcement on all key actions
- Trial period support
- Stripe webhook lifecycle handling
- Landlord billing portal (upgrade, cancel, invoices)
- Revenue dashboard (MRR, ARR, per-plan breakdown)
- Manual plan override for super admin

### AI & Integrations
- Multi-provider AI support (OpenAI, OpenRouter, Gemini, Custom)
- Configurable AI provider from admin UI (no server restart needed)
- BYOK (Bring Your Own Key) for all third-party services
- SMTP email with customizable templates

### Developer Experience
- Docker Compose deployment
- Comprehensive environment variable documentation
- Seed script with realistic demo data
- Full installation documentation

