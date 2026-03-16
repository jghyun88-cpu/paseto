"""KPI 자동 집계 — 매월 1일 02:00"""

from app.tasks import celery_app


@celery_app.task
def aggregate_all():
    """전체 포트폴리오 KPI 월간 집계

    §19 KPI 자동 집계 수식 기반.
    TeamKPI 테이블 또는 캐시에 저장.
    현재는 placeholder — Phase 8(KPI 대시보드)에서 상세 구현.
    """
    from app.database import sync_session_maker

    with sync_session_maker() as db:
        # Phase 8에서 팀별 KPI 집계 구현
        # 현재는 Celery Beat 스케줄 정상 동작 확인용
        return {"aggregated": True, "message": "KPI 집계 완료 (Phase 8에서 상세 구현)"}
