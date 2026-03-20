#!/bin/bash
# 세션 로그: Claude 응답 완료 시 기록
# Stop 훅에서 호출

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# logs 디렉토리 확인
mkdir -p ai-agent/logs

# 세션 로그 기록
echo "[${TIMESTAMP}] [SESSION_STOP] 작업 완료" >> ai-agent/logs/session.log

exit 0
