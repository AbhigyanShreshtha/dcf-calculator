import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.core.config import Settings


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS valuation_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    default_scenario TEXT NOT NULL,
    scenarios_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_valuation_models_updated_at
    ON valuation_models(updated_at DESC);
"""


def _ensure_directory(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


@contextmanager
def get_connection(settings: Settings) -> Iterator[sqlite3.Connection]:
    _ensure_directory(settings.sqlite_path)
    connection = sqlite3.connect(settings.sqlite_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database(settings: Settings) -> None:
    with get_connection(settings) as connection:
        connection.executescript(SCHEMA_SQL)

