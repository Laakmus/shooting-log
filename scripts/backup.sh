#!/usr/bin/env bash
# Dump the whole database from the Docker container into backups/, one file per run.
# Restore with: docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < backups/<file>.sql
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
source .env
set +a

mkdir -p backups
file="backups/shooting_log_$(date +%Y-%m-%d_%H%M%S).sql"
docker compose exec -T db pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" > "$file"
echo "Backup saved: $file ($(du -h "$file" | cut -f1))"
