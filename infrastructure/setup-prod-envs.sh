#!/bin/bash

# setup-prod-envs.sh
set -e

echo "=========================================================="
echo "   Generating Production Environment Configurations       "
echo "=========================================================="

# JWT_SECRET MUST be identical across every service — each service verifies the
# Authorization Bearer token independently (packages/shared-utils/auth.ts), so if
# auth-service signs with one secret and another service checks with a different
# one, every authenticated call 401s. In the vendor app that surfaces as
# "register business succeeds but drops you back to Sign In" (createVendor gets a
# 401 and api.ts wipes the token + reloads). This script writes ONE generated
# value to all services, which is correct — do NOT commit a divergent
# services/auth-service/.env that would overwrite auth's copy on deploy.
JWT_SECRET=$(openssl rand -hex 32)
INTERNAL_API_SECRET=$(openssl rand -hex 32)

echo "Generated secure JWT_SECRET and INTERNAL_API_SECRET."

MONGODB_BASE_URI="mongodb://127.0.0.1:27017"

services=(
  "gateway:8000"
  "auth-service:8001"
  "marketplace-service:8002"
  "event-budget-service:8003"
  "booking-payment-service:8004"
  "invitation-service:8005"
  "guest-feedback-service:8006"
  "monitor-service:8007"
)

mkdir -p services

for item in "${services[@]}"; do
  name="${item%%:*}"
  port="${item##*:}"
  env_file="services/$name/.env"
  
  echo "Configuring $name on port $port..."
  mkdir -p "services/$name"
  
  cat <<EOT > "$env_file"
PORT=$port
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=2h
EOT

  case "$name" in
    "gateway")
      cat <<EOT >> "$env_file"
AUTH_SERVICE_URL=http://localhost:8001
MARKETPLACE_SERVICE_URL=http://localhost:8002
EVENT_BUDGET_SERVICE_URL=http://localhost:8003
BOOKING_PAYMENT_SERVICE_URL=http://localhost:8004
INVITATION_SERVICE_URL=http://localhost:8005
GUEST_FEEDBACK_SERVICE_URL=http://localhost:8006
MONITOR_SERVICE_URL=http://localhost:8007
EOT
      ;;
    "auth-service")
      cat <<EOT >> "$env_file"
MONGODB_URI=$MONGODB_BASE_URI/magizhnaazh_auth
GOOGLE_CLIENT_ID=965066144511-qf8kg4hdrpuk86qd7tgf59a9l21hmpgt.apps.googleusercontent.com
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
EOT
      ;;
    "marketplace-service")
      cat <<EOT >> "$env_file"
MONGODB_URI=$MONGODB_BASE_URI/magizhnaazh_marketplace
INTERNAL_API_SECRET=$INTERNAL_API_SECRET
MARKETPLACE_SERVICE_URL=https://event-api.porulontech.com
EOT
      ;;
    "event-budget-service")
      cat <<EOT >> "$env_file"
MONGODB_URI=$MONGODB_BASE_URI/magizhnaazh_event_budget
EOT
      ;;
    "booking-payment-service")
      cat <<EOT >> "$env_file"
MONGODB_URI=$MONGODB_BASE_URI/magizhnaazh_booking
EOT
      ;;
    "invitation-service")
      cat <<EOT >> "$env_file"
MONGODB_URI=$MONGODB_BASE_URI/magizhnaazh_invitation
EOT
      ;;
    "guest-feedback-service")
      cat <<EOT >> "$env_file"
MONGODB_URI=$MONGODB_BASE_URI/magizhnaazh_guest_feedback
INTERNAL_API_SECRET=$INTERNAL_API_SECRET
BOOKING_PAYMENT_SERVICE_URL=http://localhost:8004
MARKETPLACE_SERVICE_URL=http://localhost:8002
EOT
      ;;
    "monitor-service")
      cat <<EOT >> "$env_file"
MONITOR_ALLOW_RESTART=false
EOT
      ;;
  esac
  
  echo "Created: $env_file"
done

echo "=========================================================="
echo "Production environment configurations created successfully!"
echo "=========================================================="
EOT
