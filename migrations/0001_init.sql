CREATE TABLE IF NOT EXISTS "routes" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "coordinates" VARCHAR(512) NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kilometers" REAL,
    "hours" REAL
);