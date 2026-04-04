#!/bin/bash
# ═══════════════════════════════════════════
# PlexusMap — Deploy Script
# Usage: ./scripts/deploy.sh
# ═══════════════════════════════════════════

set -euo pipefail

echo "🚀 PlexusMap Deploy — $(date)"
echo "═══════════════════════════════════════"

# 1. Pull latest code
echo ""
echo "📥 Pulling latest code..."
git pull origin main

# 2. Build the app container (no cache for fresh build)
echo ""
echo "🏗️  Building Docker image..."
docker compose build --no-cache plexusmap

# 3. Run database migrations
echo ""
echo "🗄️  Running database migrations..."
docker compose run --rm plexusmap npx prisma migrate deploy

# 4. Start/restart all services
echo ""
echo "🔄 Starting services..."
docker compose up -d

# 5. Show logs
echo ""
echo "═══════════════════════════════════════"
echo "✅ Deploy complete! Showing logs..."
echo "═══════════════════════════════════════"
docker compose logs -f plexusmap --tail 50
