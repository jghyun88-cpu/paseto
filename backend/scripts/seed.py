"""시드 데이터 — 마스터 §21 기본 사용자 7명 생성

실행: docker compose exec backend python scripts/seed.py
"""

import asyncio
import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.database import async_session_maker
from app.models.user import User
from app.services.user_service import hash_password

SEED_PASSWORD = "elsa2026!"

SEED_USERS = [
    {"email": "admin@winlsa.com", "name": "관리자", "role": "admin", "team": "backoffice"},
    {"email": "sourcing@winlsa.com", "name": "소싱담당", "role": "analyst", "team": "sourcing"},
    {"email": "review@winlsa.com", "name": "심사역", "role": "analyst", "team": "review"},
    {"email": "pm@winlsa.com", "name": "보육PM", "role": "pm", "team": "incubation"},
    {"email": "oi@winlsa.com", "name": "OI담당", "role": "oi_manager", "team": "oi"},
    {"email": "ops@winlsa.com", "name": "백오피스", "role": "backoffice", "team": "backoffice"},
    {"email": "partner@winlsa.com", "name": "파트너", "role": "partner", "team": "review"},
]


async def seed_users() -> None:
    hashed = hash_password(SEED_PASSWORD)
    created = 0
    skipped = 0

    async with async_session_maker() as db:
        for data in SEED_USERS:
            result = await db.execute(
                select(User).where(User.email == data["email"])
            )
            if result.scalar_one_or_none() is not None:
                skipped += 1
                print(f"  SKIP  {data['email']} (이미 존재)")
                continue

            user = User(
                name=data["name"],
                email=data["email"],
                hashed_password=hashed,
                role=data["role"],
                team=data["team"],
            )
            db.add(user)
            created += 1
            print(f"  CREATE {data['email']} ({data['role']}/{data['team']})")

        await db.commit()

    print(f"\n완료: {created}명 생성, {skipped}명 스킵")


if __name__ == "__main__":
    print("=== eLSA 시드 데이터 생성 ===\n")
    asyncio.run(seed_users())
