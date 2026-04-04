#!/bin/bash
# ═══════════════════════════════════════════
# PlexusMap — SSL Certificate Setup (Let's Encrypt)
# Run after first deploy with DNS pointing to server
# Usage: ./scripts/ssl-setup.sh
# ═══════════════════════════════════════════

set -euo pipefail

DOMAIN="plexusmap.com"
EMAIL="${CERTBOT_EMAIL:-admin@plexusmap.com}"

echo "🔒 Setting up SSL for ${DOMAIN}..."

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt-get update && apt-get install -y certbot
fi

# Create webroot directory
mkdir -p /var/www/certbot

# Get certificate
echo "📜 Requesting certificate..."
certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email

echo ""
echo "✅ SSL certificate obtained!"
echo ""
echo "Next steps:"
echo "  1. Edit nginx/default.conf:"
echo "     - Uncomment the HTTPS server block"
echo "     - In the HTTP block, uncomment 'return 301' redirect"
echo "     - Comment out the temporary HTTP location blocks"
echo "  2. Restart nginx: docker compose restart nginx"
echo "  3. Set up auto-renewal: certbot renew --dry-run"
echo ""
echo "Auto-renewal cron (add to crontab):"
echo "  0 12 * * * certbot renew --quiet && docker compose restart nginx"
