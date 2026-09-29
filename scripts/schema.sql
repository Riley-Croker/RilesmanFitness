-- Rilesman Fitness — local database schema
-- Run with: npm run db:init
--
-- This mirrors production exactly: it is rcroker-infra/sql/001-common-schema.sql
-- followed by rcroker-infra/sql/002-workout-schema.sql. If you change one, change
-- the other. Two databases:
--   common        shared identity (name, email, password_hash) for every rcroker.dev app
--   rilesman_fitness  this app's data, keyed by the same user id
--
-- CREATE ... IF NOT EXISTS never alters an existing table. To pick up a schema
-- change locally, drop both databases first, then re-run db:init.

-- Shared identity across every project on rcroker.dev.
-- Keep this table SMALL. Anything project-specific belongs in that project's own
-- database, keyed by the same `id`. Resist adding columns here.

CREATE DATABASE IF NOT EXISTS common;

CREATE TABLE IF NOT EXISTS common.users (
  id            VARCHAR(36) PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP
);

-- Workout tracker schema, in its post-split shape.
--
-- Identity (name, email, password_hash) now lives in common.users. The local `users`
-- table here keeps only workout-specific data, sharing the SAME id value. That is why
-- every foreign key below still points at a table in this database — there are no
-- cross-database foreign keys, deliberately.

CREATE DATABASE IF NOT EXISTS rilesman_fitness;

-- Local profile row. `id` matches common.users.id; no FK across databases.
-- weight_unit is a display preference; weights are always stored in lbs.
CREATE TABLE IF NOT EXISTS rilesman_fitness.users (
  id          VARCHAR(36) PRIMARY KEY,
  weight_unit VARCHAR(3) NOT NULL DEFAULT 'lbs',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
);

-- One logged gym session.
CREATE TABLE IF NOT EXISTS rilesman_fitness.workouts (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes      TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES rilesman_fitness.users(id) ON DELETE CASCADE,
  INDEX idx_workouts_user_date (user_id, date)
);

-- An exercise performed within a workout. exercise_id references the exercise-catalogue
-- id (free-exercise-db, e.g. "Barbell_Squat"); name/body_part/equipment/target_muscle
-- are denormalised copies so history stays self-contained.
CREATE TABLE IF NOT EXISTS rilesman_fitness.workout_exercises (
  id            VARCHAR(36) PRIMARY KEY,
  workout_id    VARCHAR(36) NOT NULL,
  exercise_id   VARCHAR(100),
  name          VARCHAR(255) NOT NULL,
  body_part     VARCHAR(100),
  equipment     VARCHAR(100),
  target_muscle VARCHAR(100),
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_id) REFERENCES rilesman_fitness.workouts(id) ON DELETE CASCADE,
  INDEX idx_we_name (name)
);

-- One set of an exercise: reps at a weight (stored in lbs). weight 0 = bodyweight.
CREATE TABLE IF NOT EXISTS rilesman_fitness.sets (
  id                  VARCHAR(36) PRIMARY KEY,
  workout_exercise_id VARCHAR(36) NOT NULL,
  reps                INT NOT NULL,
  weight              DECIMAL(6, 2) NOT NULL DEFAULT 0,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_exercise_id)
    REFERENCES rilesman_fitness.workout_exercises(id) ON DELETE CASCADE
);

-- Reusable routines ("Push Day" etc.) to start a workout from.
CREATE TABLE IF NOT EXISTS rilesman_fitness.templates (
  id          VARCHAR(36) PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES rilesman_fitness.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rilesman_fitness.template_exercises (
  id            VARCHAR(36) PRIMARY KEY,
  template_id   VARCHAR(36) NOT NULL,
  exercise_id   VARCHAR(100),
  name          VARCHAR(255) NOT NULL,
  body_part     VARCHAR(100),
  equipment     VARCHAR(100),
  target_muscle VARCHAR(100),
  target_sets   INT NOT NULL DEFAULT 3,
  target_reps   INT NOT NULL DEFAULT 10,
  sort_order    INT NOT NULL DEFAULT 0,
  FOREIGN KEY (template_id) REFERENCES rilesman_fitness.templates(id) ON DELETE CASCADE
);
