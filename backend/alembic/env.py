"""Alembic 마이그레이션 환경 설정

DATABASE_URL을 환경변수에서 읽어 동기 연결로 사용한다.
(asyncpg → psycopg2 변환)
"""

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    """환경변수 DATABASE_URL에서 읽고, async 드라이버를 동기로 변환"""
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://accel_admin:elsa_dev_2026@db:5432/accel_os",
    )
    # Alembic은 동기 드라이버 필요
    return url.replace("+asyncpg", "+psycopg2").replace("+aiosqlite", "")


def run_migrations_offline() -> None:
    """오프라인 모드: SQL만 생성"""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """온라인 모드: DB에 직접 실행"""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
