-- Adds the columns behind the live workout timer (Start / Finish).
--
-- Both are nullable: workouts logged without the timer, including every
-- workout that existed before this migration, simply have no times.
-- Purely additive, so it is safe to run BEFORE deploying the code that uses
-- it - the running app ignores columns it doesn't know about. Run it first,
-- then deploy. Safe to run more than once (IF NOT EXISTS).
--
-- Mirrors scripts/schema.sql and rcroker-infra/sql/002-workout-schema.sql,
-- which create these columns on a fresh database.

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS started_at  DATETIME NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS finished_at DATETIME NULL AFTER started_at;

-- Check: should list both columns.
SHOW COLUMNS FROM workouts WHERE Field IN ('started_at', 'finished_at');
