# Rilesman Fitness (WorkoutApp2)

Log workouts, browse 870+ exercises with photo demonstrations, and track
your strength over time. Next.js + MySQL + the public-domain
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) catalogue
(bundled locally).

**Full documentation: [DOCUMENTATION.md](DOCUMENTATION.md)**

## Quick start

```powershell
npm install       # once
npm run db:init   # once — creates the workout_app2 MySQL database
npm run dev       # start → http://localhost:3000
```

Requires Node.js and a MySQL/MariaDB server on localhost:3306
(connection settings in `.env`).

## Features

- Email/password accounts (bcrypt-hashed, stored in your local database)
- Workout logger with a photo-thumbnail exercise picker
- Exercise library: fuzzy search + filters by body part, equipment, muscle;
  detail pages with GIFs and step-by-step instructions
- Workout templates ("Push Day" → start with one click)
- Progress charts (max weight, estimated 1RM, session volume)
- Training calendar and automatic personal records
- Weights in lbs by default, with a per-user lbs/kg toggle in the nav
