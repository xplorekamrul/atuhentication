
DATABASE_URL="mysql://root:@localhost:3306/auth"
MARIADB_HOST="localhost"
MARIADB_PORT="3306"
MARIADB_USER="root"
MARIADB_PASSWORD=""
MARIADB_DATABASE="auth"

# In dev:
NEXTAUTH_URL="http://localhost:3000"

# Strong random string 
NEXTAUTH_SECRET="YOUR_SECRET_HERE_CHANGE_ME_PLEASE_123456_7890_!@#$%^&*()_+_-="

# ---------- Role auto-assignment (signup) ----------
SUPERADMIN_EMAIL="youremail@gmail.com"
DEVELOPER_EMAIL="youremail@gmail.com"


# .env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="youremail@gmail.com"
SMTP_PASS="gihyiybutxplojxn"
SMTP_FROM="rareviewit.com <no-reply@rareviewit.com>"
ADMIN_EMAIL="youremail@gmail.com"
COMPANY_NAME="rareviewit"




RESET_TOKEN_SECRET=super-long-random-string
RESET_TOKEN_TTL_MIN=15

# App URL for server-side fetches
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ---------- Redis Cache & Rate Limiting ----------
# Run `docker compose up -d` to start local Redis on port 6379
REDIS_URL="redis://localhost:6379"
REDIS_PREFIX="authapp:"
DEFAULT_REDIS_CACHE_TTL_SECONDS=3600
# Auth rate limiter (login, registration, OTP, brute-force account lockouts)
AUTH_RATELIMIT_ENABLED=true
# Global page-wide rate limiter in proxy.ts (stops scraping & page-flooding bots)
PAGE_RATELIMIT_ENABLED=true
PAGE_RATELIMIT_MAX_REQUESTS=60
PAGE_RATELIMIT_WINDOW_SECONDS=60
PAGE_RATELIMIT_BLOCK_SECONDS=300
# Optional deploy hook secret (min 16 chars) for CI/CD calls to POST /api/admin/cache/invalidate
# CACHE_INVALIDATION_SECRET="change-this-to-a-long-random-secret"

# ---------- OAuth Credentials ----------
# Get from https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Get from https://developers.facebook.com/apps
FACEBOOK_CLIENT_ID="YOUR_FACEBOOK_CLIENT_ID"
FACEBOOK_CLIENT_SECRET="YOUR_FACEBOOK_CLIENT_SECRET"
