-- Workout Tracker 2 — Database Schema
-- Run with: npm run db:init
-- Or paste directly into a MySQL client.

CREATE DATABASE IF NOT EXISTS workout_app2;
USE workout_app2;

-- Accounts. Passwords are stored as bcrypt hashes, never plain text.
-- weight_unit is the user's display preference; weights themselves are
-- always stored in lbs.
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  weight_unit VARCHAR(3) NOT NULL DEFAULT 'lbs',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- One logged gym session.
CREATE TABLE IF NOT EXISTS workouts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_workouts_user_date (user_id, date)
);

-- An exercise performed within a workout. exercise_id references the
-- exercise-catalogue id (free-exercise-db, e.g. "Barbell_Squat") so we
-- can link back to photos and instructions; name/body_part/equipment/
-- target_muscle are denormalised copies so history is self-contained.
CREATE TABLE IF NOT EXISTS workout_exercises (
  id VARCHAR(36) PRIMARY KEY,
  workout_id VARCHAR(36) NOT NULL,
  exercise_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  body_part VARCHAR(100),
  equipment VARCHAR(100),
  target_muscle VARCHAR(100),
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  INDEX idx_we_name (name)
);

-- One set of an exercise: reps at a weight (stored in lbs).
-- weight 0 = bodyweight.
CREATE TABLE IF NOT EXISTS sets (
  id VARCHAR(36) PRIMARY KEY,
  workout_exercise_id VARCHAR(36) NOT NULL,
  reps INT NOT NULL,
  weight DECIMAL(6, 2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
);

-- Reusable routines ("Push Day" etc.) to start a workout from.
CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  exercise_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  body_part VARCHAR(100),
  equipment VARCHAR(100),
  target_muscle VARCHAR(100),
  target_sets INT NOT NULL DEFAULT 3,
  target_reps INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);
