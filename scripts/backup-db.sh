#!/bin/bash
# ═══════════════════════════════════════════
# PlexusMap — PostgreSQL Automated Backup
# Run via cron: 0 3 * * * /home/deploy/plexusmap/scripts/backup-db.sh
# ═══════════════════════════════════════════

set -euo pipefail

# Config
BACKUP_DIR="/home/deploy/backups/plexusmap"
CONTAINER_NAME="plexusmap-db"
DB_USER="${POSTGRES_USER:-plexusmap}"
DB_NAME="${POSTGRES_DB:-plexusmap}"
RETENTION_DAYS=14
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/plexusmap_${TIMESTAMP}.sql.gz"

# Ensure backup dir exists
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump and compress
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup is not empty
if [ -s "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup successful: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date)] ERROR: Backup file is empty!"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Clean old backups
DELETED=$(find "$BACKUP_DIR" -name "plexusmap_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned $DELETED old backup(s)"
fi

echo "[$(date)] Backup complete."
