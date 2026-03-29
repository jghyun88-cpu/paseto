# eLSA 운영 매뉴얼 (Ops Runbook)

## 인프라 구성

```
Windows 11 Host
├── Docker Desktop
│   ├── db (PostgreSQL :5432)
│   ├── redis (:6379)
│   ├── backend (FastAPI :8000)
│   ├── celery_worker
│   ├── celery_beat
│   ├── frontend (Next.js :3000)
│   └── nginx (:80)
└── Cloudflare Tunnel → winlsa.com
```

## 1. 서비스 시작/중지

```bash
# 전체 시작
docker compose up -d

# 전체 중지
docker compose down

# 특정 서비스 재시작
docker compose restart frontend
docker compose restart backend
```

## 2. Cloudflare Tunnel 장애 대응

### 증상: winlsa.com 접속 불가

1. **터널 상태 확인**
   ```bash
   cloudflared tunnel info elsa
   ```

2. **터널 재시작**
   ```bash
   # Windows 서비스로 등록된 경우
   net stop cloudflared
   net start cloudflared

   # 수동 실행인 경우
   cloudflared tunnel run elsa
   ```

3. **DNS 확인**: Cloudflare 대시보드 → DNS → winlsa.com CNAME이 터널 ID를 가리키는지 확인

### 예방: 터널 자동 재시작
Windows Task Scheduler에 `cloudflared tunnel run elsa` 등록 (시작 시 자동 실행).

## 3. Docker 자동 시작 (호스트 재부팅)

Docker Desktop 설정에서:
- **General** → "Start Docker Desktop when you sign in" 활성화
- **docker-compose.yml**에 모든 서비스 `restart: unless-stopped` 확인

```yaml
services:
  backend:
    restart: unless-stopped
  frontend:
    restart: unless-stopped
  nginx:
    restart: unless-stopped
  # ... 나머지도 동일
```

## 4. 헬스체크

```bash
# 백엔드 헬스
curl http://localhost:8000/api/v1/health

# 프론트엔드 (nginx 경유)
curl http://localhost:80

# 외부 접근
curl https://winlsa.com/api/v1/health
```

## 5. 로그 확인

```bash
# 백엔드 로그 (최근 100줄)
docker compose logs backend --tail 100

# 전체 서비스 실시간 로그
docker compose logs -f

# 에러만 필터링
docker compose logs backend 2>&1 | grep -i error
```

## 6. DB 백업/복원

```bash
# 백업 (배포 직전 필수)
docker compose exec db pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql

# 복원
docker compose exec -T db psql -U $DB_USER $DB_NAME < backup_YYYYMMDD.sql
```

## 7. 긴급 롤백

```bash
# 1. DB 스냅샷 복원 (위 참조)
# 2. 코드 롤백
git log --oneline -5  # 복원점 확인
git checkout <tag-or-commit>
docker compose up -d --build
```

## 8. 데모 중 장애 시 대응

1. **즉시**: "기술적 이슈가 있어 잠시 확인하겠습니다" 안내
2. **1분 내**: `docker compose logs backend --tail 20`으로 원인 파악
3. **복구 불가 시**: 로컬 환경(localhost)으로 전환하여 데모 계속
