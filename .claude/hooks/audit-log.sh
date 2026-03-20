#!/bin/bash
# 감사 로그: 파일 생성/수정 시 자동 기록
# PostToolUse (Write/Edit) 훅에서 호출

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // "unknown"' 2>/dev/null)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# logs 디렉토리 확인
mkdir -p ai-agent/logs

# 감사 로그 기록
echo "[${TIMESTAMP}] [FILE_${TOOL_NAME}] [agent] [${FILE_PATH}] [파일 조작]" >> ai-agent/logs/audit.log

exit 0
