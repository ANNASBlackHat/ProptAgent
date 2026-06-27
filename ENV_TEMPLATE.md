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