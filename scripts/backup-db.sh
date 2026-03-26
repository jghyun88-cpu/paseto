#!/bin/bash
# eLSA DB 백업 스크립트 — 호스트 crontab에서 실행
# crontab: 0 3 * * * /path/to/elsa/scripts/backup-db.sh
#
# 복원: gzip -dc backups/backup-YYYY-MM-DD.sql.gz | docker exec -i elsa-db-1 psql -U $DB_USER $DB_NAME

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
RETENTION_DAYS=7

# .env 파일에서 DB 정보 로드
if [ -f "$PROJECT_DIR/.env" ]; then
    # shellcheck source=/dev/null
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

DB_USER="${DB_USER:-elsa}"
DB_NAME="${DB_NAME:-elsa}"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# 날짜 기반 파일명
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/backup-${DATE}.sql.gz"

echo "[$(date)] 백업 시작: $DB_NAME → $BACKUP_FILE"

# Docker 컨테이너에서 pg_dump 실행 + gzip 압축
CONTAINER=$(docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps -q db 2>/dev/null || docker compose -f "$PROJECT_DIR/docker-compose.yml" ps -q db 2>/dev/null)

if [ -z "$CONTAINER" ]; then
    echo "[ERROR] DB 컨테이너를 찾을 수 없습니다."
    exit 1
fi

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# 파일 크기 확인
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] 백업 완료: $SIZE"

# 오래된 백업 삭제 (RETENTION_DAYS일 초과)
DELETED=$(find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[$(date)] 오래된 백업 ${DELETED}개 삭제"
fi

echo "[$(date)] 완료"
