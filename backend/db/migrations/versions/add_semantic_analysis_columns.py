"""
Migration: Add semantic analysis columns to the `analyses` table.

Run this script ONCE to add the new columns to an existing database:
    cd backend
    python db/migrations/versions/add_semantic_analysis_columns.py

Safe to run multiple times — uses IF NOT EXISTS / exception-safe approach.
"""

import sys
import os

# Allow running from repo root or backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from sqlalchemy import text
from db.database import engine


COLUMNS_TO_ADD = [
    ("deterministic_score",    "FLOAT",   "0.0"),
    ("semantic_score",         "FLOAT",   "0.0"),
    ("embedding_similarity",   "FLOAT",   "0.0"),
    ("skill_semantic_matches", "TEXT",    "'[]'"),
    ("conceptual_gaps",        "TEXT",    "'[]'"),
    ("semantic_insights",      "TEXT",    "NULL"),
    ("skill_categories",       "TEXT",    "'{}'"),
]

TABLE = "analyses"


def column_exists(conn, table: str, column: str) -> bool:
    """Check if a column already exists (works for SQLite & PostgreSQL)."""
    try:
        url = str(engine.url)
        if "sqlite" in url:
            result = conn.execute(text(f"PRAGMA table_info({table})"))
            return any(row[1] == column for row in result)
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                f"WHERE table_name='{table}' AND column_name='{column}'"
            ))
            return result.fetchone() is not None
    except Exception:
        return False


def run_migration():
    with engine.begin() as conn:
        added = []
        skipped = []

        for col_name, col_type, default in COLUMNS_TO_ADD:
            if column_exists(conn, TABLE, col_name):
                skipped.append(col_name)
                continue

            default_clause = f"DEFAULT {default}" if default != "NULL" else ""
            sql = f"ALTER TABLE {TABLE} ADD COLUMN {col_name} {col_type} {default_clause}"
            conn.execute(text(sql))
            added.append(col_name)

        if added:
            print(f"[OK] Added columns to '{TABLE}': {', '.join(added)}")
        if skipped:
            print(f"[SKIP] Already existed (skipped): {', '.join(skipped)}")
        if not added and not skipped:
            print("No changes made.")


if __name__ == "__main__":
    run_migration()
