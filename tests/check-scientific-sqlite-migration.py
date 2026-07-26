#!/usr/bin/env python3
"""Execute the P1 scientific migration against a minimal SQLite database."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "prisma/migrations/20260726170000_scientific_measurement_persistence/migration.sql"

EXPECTED = {
    "PoolProfile": {
        "manufacturerSaltMin",
        "manufacturerSaltMax",
        "manufacturerChlorineMax",
    },
    "WaterTest": {
        "totalDissolvedSolids",
        "measuredAt",
        "measurementMethod",
        "measurementMetadata",
        "scientificQualityScore",
        "scientificMethodVersion",
        "scientificLimitations",
        "lsiMethodVersion",
    },
    "ActionPlan": {
        "scientificMethodVersion",
        "dosageMethodVersion",
        "swimSafetyMethodVersion",
    },
}

connection = sqlite3.connect(":memory:")
try:
    connection.executescript(
        """
        CREATE TABLE "PoolProfile" ("id" TEXT PRIMARY KEY);
        CREATE TABLE "WaterTest" ("id" TEXT PRIMARY KEY);
        CREATE TABLE "ActionPlan" ("id" TEXT PRIMARY KEY);
        """
    )
    connection.executescript(MIGRATION.read_text())

    for table, expected_columns in EXPECTED.items():
        columns = {
            row[1]
            for row in connection.execute(f'PRAGMA table_info("{table}")').fetchall()
        }
        missing = expected_columns - columns
        if missing:
            raise SystemExit(f"{table} is missing columns: {sorted(missing)}")
finally:
    connection.close()

print("SQLite scientific persistence migration applied successfully")
