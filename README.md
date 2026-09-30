# Rilesman Fitness

Log workouts, browse 1,200+ exercises with animated demonstrations, and
track your strength over time. Next.js + MySQL + the
[ExerciseDB](https://oss.exercisedb.dev) free-tier catalogue (saved
locally; only the GIFs load from ExerciseDB).

**Full documentation: [DOCUMENTATION.md](DOCUMENTATION.md)**
**Learn how it all works: [learning/README.md](learning/README.md)** — a
12-module Next.js/TypeScript course for C#/.NET developers, taught
through this app's own code.

## Quick start

```powershell
npm install       # once
npm run db:init   # once — creates the rilesman_fitness MySQL database
npm run dev       # start → http://localhost:3000/workout
```

Requires Node.js and a MySQL/MariaDB server on localhost:3306
(connection settings in `.env`).

## Features

- Email/password accounts (bcrypt-hashed, stored in your local database)
- Workout logger with an animated-thumbnail exercise picker
- Exercise library: fuzzy search + filters by body part, equipment, muscle;
  detail pages with GIFs and step-by-step instructions
- Workout templates ("Push Day" → start with one click)
- Progress charts (max weight, estimated 1RM, session volume)
- Training calendar and automatic personal records
- Weights in lbs by default, with a per-user lbs/kg toggle in the nav
