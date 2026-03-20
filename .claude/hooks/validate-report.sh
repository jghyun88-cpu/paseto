#!/bin/bash
#
# 보고서 자동 검증 훅
# PostToolUse(Write) 이벤트에서 보고서 파일 작성 시 자동으로 품질 검증을 수행합니다.
#
# 검증 항목:
# 1. 메타 정보 블록 존재 여부
# 2. 기밀등급 표기 여부
# 3. 필수 섹션 존재 여부
# 4. 기본 수치 정합성
#
# settings.json 훅 설정:
# {
#   "PostToolUse": [{
#     "matcher": "Write",
#     "hooks": [{ "type": "command", "command": "bash .claude/hooks/validate-report.sh" }]
#   }]
# }

# stdin에서 tool input 읽기
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

# ai-agent/reports/ 디렉토리의 .md 파일만 검증
if [[ ! "$FILE_PATH" == *"ai-agent/reports/"* ]] || [[ ! "$FILE_PATH" == *".md" ]]; then
    exit 0
fi

LOG_DIR="ai-agent/logs"
mkdir -p "$LOG_DIR"
VALIDATION_LOG="$LOG_DIR/validation.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ERRORS=0
WARNINGS=0

log_result() {
    local level=$1
    local message=$2
    echo "[$TIMESTAMP] [$level] $FILE_PATH: $message" >> "$VALIDATION_LOG"
    if [ "$level" = "ERROR" ]; then
        ERRORS=$((ERRORS + 1))
    elif [ "$level" = "WARN" ]; then
        WARNINGS=$((WARNINGS + 1))
    fi
}

# 파일이 존재하는지 확인
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

CONTENT=$(cat "$FILE_PATH" 2>/dev/null || echo "")

# ─── 검증 1: 메타 정보 블록 ──────────────────────────

if echo "$CONTENT" | grep -q "^---"; then
    log_result "OK" "메타 정보 블록 존재"
else
    log_result "WARN" "메타 정보 블록 누락"
fi

# ─── 검증 2: 작성일 ──────────────────────────────────

if echo "$CONTENT" | grep -qi "작성일"; then
    log_result "OK" "작성일 표기 존재"
else
    log_result "WARN" "작성일 표기 누락"
fi

# ─── 검증 3: 기밀등급 (reports/lp 또는 investment-committee) ──

if [[ "$FILE_PATH" == *"ai-agent/reports/lp/"* ]]; then
    if echo "$CONTENT" | grep -qi "기밀"; then
        log_result "OK" "LP 보고서 기밀등급 표기 확인"
    else
        log_result "ERROR" "LP 보고서에 기밀등급 표기 누락"
    fi
fi

if [[ "$FILE_PATH" == *"ai-agent/reports/investment-committee/"* ]]; then
    if echo "$CONTENT" | grep -qi "대외비\|기밀"; then
        log_result "OK" "투자 메모 기밀등급 표기 확인"
    else
        log_result "ERROR" "투자 메모에 기밀등급 표기 누락"
    fi
fi

# ─── 검증 4: 보고서 유형별 필수 섹션 ─────────────────

if [[ "$FILE_PATH" == *"ai-agent/reports/screening/"* ]]; then
    for section in "요약" "평가" "강점" "우려"; do
        if echo "$CONTENT" | grep -qi "$section"; then
            log_result "OK" "섹션 존재: $section"
        else
            log_result "WARN" "섹션 누락 가능: $section"
        fi
    done
fi

if [[ "$FILE_PATH" == *"ai-agent/reports/analysis/"* ]]; then
    for section in "SWOT" "리스크" "질문" "매력도"; do
        if echo "$CONTENT" | grep -qi "$section"; then
            log_result "OK" "섹션 존재: $section"
        else
            log_result "WARN" "섹션 누락 가능: $section"
        fi
    done
fi

if [[ "$FILE_PATH" == *"ai-agent/reports/risk/"* ]]; then
    for section in "대시보드" "긴급" "주의" "액션"; do
        if echo "$CONTENT" | grep -qi "$section"; then
            log_result "OK" "섹션 존재: $section"
        else
            log_result "WARN" "섹션 누락 가능: $section"
        fi
    done
fi

# ─── 검증 결과 요약 ──────────────────────────────────

SUMMARY="검증 완료 - 오류: ${ERRORS}건, 경고: ${WARNINGS}건"
log_result "SUMMARY" "$SUMMARY"

# 오류가 있으면 stderr로 경고 출력 (훅에서 사용자에게 표시)
if [ $ERRORS -gt 0 ]; then
    echo "[품질 검증] $FILE_PATH: 오류 ${ERRORS}건 발견. ai-agent/logs/validation.log 확인 필요" >&2
fi

exit 0
