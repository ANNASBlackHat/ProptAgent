# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_NAME=PropAgent

# Database
MONGODB_URI=mongodb://localhost:27017/propagent

# Auth
JWT_SECRET=<random 64 char string>
JWT_EXPIRES_IN=7d

# AI Config
AI_PROVIDER=openai
AI_BASE_URL=
AI_API_KEY=<buyer fills this>
AI_MODEL=gpt-4o-mini
# OpenAI:      AI_BASE_URL= (leave empty), AI_MODEL=gpt-4o-mini
# OpenRouter:  AI_BASE_URL=https://openrouter.ai/api/v1, AI_MODEL=anthropic/claude-3-haiku
# Gemini:      AI_BASE_URL=https://generativelanguage.googleapis.com/openai/v1, AI_MODEL=gemini-1.5-flash
# Ollama:      AI_BASE_URL=http://localhost:11434/v1, AI_API_KEY=ollama, AI_MODEL=llama3

# Email (buyer configures their SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<buyer fills this>
SMTP_PASS=<buyer fills this>
SMTP_FROM=noreply@yourdomain.com

# File Upload
UPLOAD_DIR=public/uploads
MAX_FILE_SIZE_MB=5