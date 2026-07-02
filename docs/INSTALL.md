# PropAgent Installation & Setup Guide

Welcome to **PropAgent**, the AI-powered tenant screening and property management platform. This guide provides detailed step-by-step instructions to install, configure, and run PropAgent on your system.

---

## 🛠️ System Requirements

Before getting started, make sure you have the following installed:
- **Node.js**: `v18.x` or higher (LTS recommended)
- **NPM**: `v9.x` or higher (installed with Node)
- **MongoDB**: `v6.0` or higher (local community server or MongoDB Atlas instance)
- **OpenAI API Key**: Required for AI-powered interactive voice/chat interviews and scoring.

---

## 🚀 Quick Start Guide

Follow these steps to get your development environment running:

### 1. Clone & Install Dependencies
Navigate to your project directory and run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the sample environment file to create your own configuration:
```bash
cp .env.example .env.local
```
Open `.env.local` in your text editor and fill in your database, email, and OpenAI configuration settings (refer to the **Environment Variables** section below).

### 3. Seed the Demo Database
PropAgent comes with a pre-configured seeding script to generate a complete, realistic dataset for demonstration purposes:
```bash
npm run seed
```
This will seed:
- **Super Admin**: `admin@propagent.com` (Password: `Admin123!`)
- **Demo Landlord 1**: `demo@landlord.com` (Password: `Demo123!`, Sunrise Property Group)
- **Demo Landlord 2**: `second@landlord.com` (Password: `Demo123!`, Metro Rentals)
- **Demo Tenants**: Pre-linked with active leases and payment history.
- **AI Transcripts**: Fully-populated, realistic interview logs and scores.

### 4. Run the Development Server
Launch the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🐋 Docker Local Setup

If you prefer to run MongoDB locally using Docker, we provide a simple `docker-compose.yml` snippet.

### Create a `docker-compose.yml` file:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: propagent-db
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### Run the database container:
```bash
docker-compose up -d
```
Your MongoDB connection string in `.env.local` will be:
```env
MONGODB_URI=mongodb://localhost:27017/propagent
```

---

## 📋 Environment Variables

Configure these settings inside your `.env.local` file:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `MONGODB_URI` | Connection URI for MongoDB database | `mongodb://localhost:27017/propagent` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens | `your-super-secret-jwt-key` |
| `NEXT_PUBLIC_APP_URL` | Root URL of the application | `http://localhost:3000` |
| `OPENAI_API_KEY` | OpenAI API Key for transcript generation & scoring | `sk-proj-...` |
| `SMTP_HOST` | Hostname of your outgoing mail SMTP server | `smtp.mailtrap.io` |
| `SMTP_PORT` | Port of your outgoing mail SMTP server | `587` |
| `SMTP_USER` | Username for SMTP authentication | `your-smtp-username` |
| `SMTP_PASS` | Password for SMTP authentication | `your-smtp-password` |
| `SMTP_FROM` | Sender address shown on outbound emails | `noreply@propagent.com` |

---

## 📧 Email Configuration (SMTP)

PropAgent sends emails when application screening completes, leases are generated, or payments are recorded.

1. **Transactional Email Server**: Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` using your mail provider (e.g. Resend, SendGrid, Mailgun, Amazon SES, or Mailtrap for testing).
2. **From Address**: Ensure `SMTP_FROM` matches a verified sender domain in your email provider console to prevent emails from ending up in spam folders.

---

## 🤖 AI Configuration (OpenAI)

The screening agent relies on OpenAI API completions. 
- **Voice/Chat Screening**: The system prompt is configured dynamically under `lib/prompts.ts` using modern screening practices.
- **Scoring**: Applications are assessed and flagged based on employment, income-to-rent ratio, reference verification results, and rental history matching the landlord's screening criteria.

---

## 🔍 Troubleshooting

### 1. Database Connection Errors
- Check that your local MongoDB server is running (`brew services list` on macOS, or `docker ps` if using Docker compose).
- Ensure your MongoDB connection string in `.env.local` doesn't contain unencoded special characters in the username or password.

### 2. OpenAI API Failures / Insufficient Quota
- Confirm your `OPENAI_API_KEY` is active and has positive credits in your OpenAI Billing portal.
- Verify you are not exceeding rate limits on your OpenAI account level.

### 3. Emails Not Delivering
- Confirm SMTP settings are correct. Use port `587` with TLS.
- If using Gmail, you must configure an **App Password** instead of your primary password.

### 4. File Upload Issues
- Uploads are saved locally inside `public/uploads`. Make sure the Node process has read/write permission to the `public/` directory inside the project root.
