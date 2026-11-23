-- Adds what templates need to carry a training program into the logger:
--   template_sets                   one row per planned set (target reps, weight
--                                   in lbs, warm-up or working)
--   template_exercises.notes        a short cue shown under the exercise
--   template_exercises.is_optional  optional vs priority exercise
--   sets.is_warmup                  so logged history can tell warm-ups apart
--
-- Purely additive: existing templates have no template_sets rows and keep
-- working as before (target_sets x target_reps), and every existing set
-- becomes a working set (is_warmup = 0). Safe to run BEFORE deploying the code
-- that uses it - the running app ignores tables and columns it doesn't know,
-- and its inserts get the defaults. Run it first, then deploy. Safe to run
-- more than once (IF NOT EXISTS).
--
-- Mirrors scripts/schema.sql and rcroker-infra/sql/002-workout-schema.sql,
-- which create all of this on a fresh database.

ALTER TABLE template_exercises
  ADD COLUMN IF NOT EXISTS notes       VARCHAR(500) NULL AFTER target_reps,
  ADD COLUMN IF NOT EXISTS is_optional TINYINT(1) NOT NULL DEFAULT 0 AFTER notes;

CREATE TABLE IF NOT EXISTS template_sets (
  id                   VARCHAR(36) PRIMARY KEY,
  template_exercise_id VARCHAR(36) NOT NULL,
  sort_order           INT NOT NULL DEFAULT 0,
  reps                 INT NOT NULL,
  weight               DECIMAL(6, 2) NOT NULL DEFAULT 0,
  is_warmup            TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (template_exercise_id)
    REFERENCES template_exercises(id) ON DELETE CASCADE
);

ALTER TABLE sets
  ADD COLUMN IF NOT EXISTS is_warmup TINYINT(1) NOT NULL DEFAULT 0 AFTER weight;

-- Check: three columns, then the new table's columns.
SHOW COLUMNS FROM template_exercises WHERE Field IN ('notes', 'is_optional');
SHOW COLUMNS FROM sets WHERE Field = 'is_warmup';
SHOW COLUMNS FROM template_sets;
