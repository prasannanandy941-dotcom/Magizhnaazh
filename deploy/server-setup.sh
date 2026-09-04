#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Magizhnaazh — set up / (re)deploy on a fresh Ubuntu server, isolated from any
# other apps already on the box. Idempotent: safe to re-run.
#
# Run as root, AFTER you have:
#   1. cloned the repo to /var/www/magizhnaazh
#   2. placed each service's .env file (services/<name>/.env) with your secrets
#
#   cd /var/www/magizhnaazh && sudo bash deploy/server-setup.sh
# ---------------------------------------------------------------------------
set -euo pipefail

APP_DIR=/var/www/magizhnaazh
GATEWAY_URL=https://event-api.porulontech.com
PORTS=(8000 8001 8002 8003 8004 8005 8006 8007)

echo "==> [1/7] Installing Node 20, pm2, nginx, git, certbot (only if missing)"
export DEBIAN_FRONTEND=noninteractive
command -v curl >/dev/null || apt-get install -y curl
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v git    >/dev/null || apt-get install -y git
command -v nginx  >/dev/null || apt-get install -y nginx
command -v pm2    >/dev/null || npm install -g pm2
command -v certbot>/dev/null || apt-get install -y certbot python3-certbot-nginx

echo "==> [2/7] Verifying our backend ports are free (isolation check)"
for p in "${PORTS[@]}"; do
  if ss -ltnH "sport = :$p" | grep -q .; then
    echo "!! Port $p is ALREADY in use by another app on this server."
    echo "   Free it, or tell Claude to remap Magizhnaazh to a different port range."
    exit 1
  fi
done
echo "   ports ${PORTS[*]} are free."

cd "$APP_DIR"

echo "==> [3/7] Fetching latest code (main)"
git fetch origin main
git reset --hard origin/main

echo "==> [4/7] Installing dependencies (npm workspaces)"
npm install

echo "==> [5/7] Building the three frontends with the production API URL"
export VITE_GATEWAY_URL="$GATEWAY_URL"
npm run build:all

echo "==> [6/7] Starting backend services under pm2 (magizh-*)"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
# Make pm2 resurrect these on reboot (prints/apply the systemd hook once).
pm2 startup systemd -u root --hp /root >/tmp/pm2-startup.txt 2>&1 || true
bash -c "$(grep -m1 '^sudo env' /tmp/pm2-startup.txt || true)" 2>/dev/null || true

echo "==> [7/7] Installing the nginx site"
mkdir -p "$APP_DIR/uploads"
cp deploy/nginx-magizhnaazh.conf /etc/nginx/sites-available/magizhnaazh.conf
ln -sf /etc/nginx/sites-available/magizhnaazh.conf /etc/nginx/sites-enabled/magizhnaazh.conf
nginx -t
systemctl reload nginx

echo ""
echo "=========================================================================="
echo " Backend + frontends are live on http (port 80) for your domains."
echo " NEXT:"
echo "  1. Point these DNS A-records to THIS server, then wait for propagation:"
echo "       event-api / event-vendor / event-customer / event-admin .porulontech.com"
echo "  2. Once DNS resolves here, enable HTTPS:"
echo "       sudo certbot --nginx -d event-api.porulontech.com -d event-vendor.porulontech.com -d event-customer.porulontech.com -d event-admin.porulontech.com"
echo "  3. Create the admin login:  cd services/auth-service && npx tsx scripts/ensure-admin.ts"
echo "=========================================================================="
