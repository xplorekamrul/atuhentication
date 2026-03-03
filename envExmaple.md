
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
SMTP_FROM="ArrowheadIt.com <no-reply@ArrowheadIt.com>"
ADMIN_EMAIL="youremail@gmail.com"
COMPANY_NAME="ArrowheadIt"




RESET_TOKEN_SECRET=super-long-random-string
RESET_TOKEN_TTL_MIN=15

# App URL for server-side fetches
NEXT_PUBLIC_APP_URL="http://localhost:3000"


