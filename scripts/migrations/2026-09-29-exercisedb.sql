-- Move logged exercises from the free-exercise-db catalogue to ExerciseDB.
--
-- Each logged exercise stores a copy of its name/body part/equipment/target
-- muscle plus the catalogue id. Sets, reps and weights are untouched here.
-- The id only drives the thumbnail and the link to the exercise page, but the
-- NAME matters too: personal records and progress charts group by name, so a
-- row still called "Barbell Bench Press - Medium Grip" would split its
-- history from new "barbell bench press" rows. This updates both.
--
-- Generated from the 24 exercises in production on 29 Sep 2026. Safe to run
-- more than once: already-migrated rows no longer match an old id. Run it
-- against the rilesman_fitness database, AFTER deploying the ExerciseDB code
-- and AFTER taking a backup.

START TRANSACTION;

CREATE TEMPORARY TABLE exercise_map (
  old_id        VARCHAR(100) NULL,  -- NULL = a custom exercise, matched by name
  old_name      VARCHAR(255) NOT NULL,  -- lowercase
  new_id        VARCHAR(100) NOT NULL,
  new_name      VARCHAR(255) NOT NULL,
  body_part     VARCHAR(100),
  equipment     VARCHAR(100),
  target_muscle VARCHAR(100)
);

INSERT INTO exercise_map VALUES
  ('Triceps_Pushdown', 'triceps pushdown', '3ZflifB', 'cable pushdown', 'upper arms', 'cable', 'triceps'),
  ('Machine_Bench_Press', 'machine bench press', 'DOoWcnA', 'machine chest press', 'chest', 'leverage machine', 'pectorals'),
  ('Side_Lateral_Raise', 'side lateral raise', 'DsgkuIt', 'dumbbell lateral raise', 'shoulders', 'dumbbell', 'deltoids'),
  ('Butterfly', 'butterfly', 'v3xmPAR', 'machine seated fly', 'chest', 'leverage machine', 'pectorals'),
  ('Face_Pull', 'face pull', 'ZfyAGhK', 'face pull', 'shoulders', 'cable', 'deltoids'),
  ('Seated_Cable_Rows', 'seated cable rows', 'fUBheHs', 'cable seated row', 'back', 'cable', 'upper back'),
  ('Pushups', 'pushups', 'I4hDWkc', 'push-up', 'chest', 'bodyweight', 'pectorals'),
  ('Underhand_Cable_Pulldowns', 'underhand cable pulldowns', 'xBYcQHj', 'cable underhand pulldown', 'back', 'cable', 'latissimus dorsi'),
  ('Handstand_Push-Ups', 'handstand push-ups', 'rQxwMxO', 'handstand push-up', 'upper arms', 'bodyweight', 'triceps'),
  ('Machine_Shoulder_Military_Press', 'machine shoulder (military) press', '67n3r98', 'machine shoulder press', 'shoulders', 'leverage machine', 'deltoids'),
  ('Pullups', 'pullups', 'lBDjFxJ', 'pull-up', 'back', 'bodyweight', 'latissimus dorsi'),
  ('Inverted_Row', 'inverted row', 'bZGHsAZ', 'inverted row', 'back', 'bodyweight', 'upper back'),
  ('Alternating_Renegade_Row', 'alternating renegade row', 'b9kqlBy', 'kettlebell alternating renegade row', 'back', 'kettlebell', 'upper back'),
  ('Seated_One-arm_Cable_Pulley_Rows', 'seated one-arm cable pulley rows', 'vpp9Ku2', 'cable seated single-arm alternate row', 'back', 'cable', 'upper back'),
  ('Dip_Machine', 'dip machine', 'BRImeP8', 'machine seated dip', 'upper arms', 'leverage machine', 'triceps'),
  ('Smith_Machine_Incline_Bench_Press', 'smith machine incline bench press', '5v7KYld', 'smith incline bench press', 'chest', 'smith machine', 'pectorals'),
  ('Dumbbell_Bicep_Curl', 'dumbbell bicep curl', 'NbVPDMW', 'dumbbell biceps curl', 'upper arms', 'dumbbell', 'biceps'),
  ('Dumbbell_Shoulder_Press', 'dumbbell shoulder press', 'znQUdHY', 'dumbbell seated shoulder press', 'shoulders', 'dumbbell', 'deltoids'),
  ('Barbell_Bench_Press_-_Medium_Grip', 'barbell bench press - medium grip', 'EIeI8Vf', 'barbell bench press', 'chest', 'barbell', 'pectorals'),
  ('Machine_Preacher_Curls', 'machine preacher curls', 'b6hQYMb', 'machine preacher curl', 'upper arms', 'leverage machine', 'biceps'),
  ('Incline_Dumbbell_Press', 'incline dumbbell press', 'B3Rxp6L', 'dumbbell incline bench press', 'chest', 'dumbbell', 'pectorals'),
  ('Hammer_Curls', 'hammer curls', '2NpxjC1', 'dumbbell hammer curl', 'upper arms', 'dumbbell', 'biceps'),
  ('Pallof_Press_With_Rotation', 'pallof press with rotation', '9pa4H5m', 'band horizontal pallof press', 'waist', 'resistance band', 'abdominals'),
  (NULL, 'burpees', 'dK9394r', 'burpee', 'cardio', 'bodyweight', 'cardiovascular system');

-- Catalogue exercises: match on the old id.
UPDATE workout_exercises t JOIN exercise_map m ON t.exercise_id = m.old_id
SET t.exercise_id = m.new_id, t.name = m.new_name, t.body_part = m.body_part,
    t.equipment = m.equipment, t.target_muscle = m.target_muscle;

UPDATE template_exercises t JOIN exercise_map m ON t.exercise_id = m.old_id
SET t.exercise_id = m.new_id, t.name = m.new_name, t.body_part = m.body_part,
    t.equipment = m.equipment, t.target_muscle = m.target_muscle;

-- Custom exercises (no id): match on name, so they gain a picture.
UPDATE workout_exercises t JOIN exercise_map m
  ON t.exercise_id IS NULL AND m.old_id IS NULL AND LOWER(TRIM(t.name)) = m.old_name
SET t.exercise_id = m.new_id, t.name = m.new_name, t.body_part = m.body_part,
    t.equipment = m.equipment, t.target_muscle = m.target_muscle;

UPDATE template_exercises t JOIN exercise_map m
  ON t.exercise_id IS NULL AND m.old_id IS NULL AND LOWER(TRIM(t.name)) = m.old_name
SET t.exercise_id = m.new_id, t.name = m.new_name, t.body_part = m.body_part,
    t.equipment = m.equipment, t.target_muscle = m.target_muscle;

COMMIT;

-- Anything left over still points at an old catalogue id (e.g. logged after
-- this file was generated). It keeps working, just shows the placeholder
-- picture. Expect this to return no rows.
SELECT 'workout' AS source, exercise_id, name, COUNT(*) AS uses
FROM workout_exercises
WHERE exercise_id IS NOT NULL AND exercise_id NOT IN (SELECT new_id FROM exercise_map)
GROUP BY exercise_id, name
UNION ALL
SELECT 'template', exercise_id, name, COUNT(*)
FROM template_exercises
WHERE exercise_id IS NOT NULL AND exercise_id NOT IN (SELECT new_id FROM exercise_map)
GROUP BY exercise_id, name;
