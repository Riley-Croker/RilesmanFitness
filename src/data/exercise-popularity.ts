// Hand-curated popularity tiers for the exercise catalogue, used to rank
// browsing and search (see rankExercises in src/lib/exercise-library.ts).
//
// There is no public data on which exercises people actually do most: the
// big tracker apps don't publish it, and web signals (search volume, page
// views) measure the wrong thing and can't tell ExerciseDB's very specific
// names apart. So this is an honest judgement call, kept small and editable:
//   STAPLE - the lifts most gym programs are built around
//   COMMON - well-known variations and accessories
//   everything else ranks after these.
//
// Keyed by ExerciseDB id (stable across catalogue refreshes; names can be
// renamed via NAME_OVERRIDES). The comment after each id is its name, for
// humans only. To change a tier, move the line. To find an id, open the
// exercise in the app: it's the last part of the URL.
//
// Gaps in the catalogue, filled with the closest real exercise:
//   hip thrust      -> barbell glute bridge
//   overhead press  -> ExerciseDB's "barbell standing close-grip military press",
//                      renamed "barbell overhead press" in NAME_OVERRIDES
//   plank           -> weighted front plank (common)

export const STAPLE: readonly string[] = [
  // Chest
  "EIeI8Vf", // barbell bench press
  "3TZduzM", // barbell incline bench press
  "SpYC0Kp", // dumbbell bench press
  "B3Rxp6L", // dumbbell incline bench press
  "I4hDWkc", // push-up
  "9WTm7dq", // chest dip
  "0CXGHya", // cable crossover
  "DOoWcnA", // machine chest press
  // Back
  "ila4NZS", // barbell deadlift
  "lBDjFxJ", // pull-up
  "T2mxWqc", // chin-up
  "LEprlgG", // cable lat pulldown full range of motion
  "RVwzP10", // cable pulldown
  "eZyBC3j", // barbell bent over row
  "BJ0Hz5L", // dumbbell bent over row
  "fUBheHs", // cable seated row
  // Legs & glutes
  "iYzB0Cz", // barbell full squat
  "wQ2c4XD", // barbell romanian deadlift
  "10Z2DXU", // sled 45° leg press
  "my33uHU", // machine leg extension
  "17lJ1kr", // machine lying leg curl
  "Zg3XY7P", // machine seated leg curl
  "RRWFUcw", // dumbbell lunge
  "qx4fgX7", // dumbbell single leg split squat
  "8ozhUIZ", // barbell standing calf raise
  "yn8yg1r", // dumbbell goblet squat
  "qKBpF7I", // barbell glute bridge
  // Shoulders
  "wdRZISl", // barbell overhead press (renamed via NAME_OVERRIDES)
  "znQUdHY", // dumbbell seated shoulder press
  "DsgkuIt", // dumbbell lateral raise
  "ZfyAGhK", // face pull
  "67n3r98", // machine shoulder press
  // Arms
  "25GPyDY", // barbell curl
  "NbVPDMW", // dumbbell biceps curl
  "2NpxjC1", // dumbbell hammer curl
  "3ZflifB", // cable pushdown
  "dU605di", // cable pushdown (with rope attachment)
  "h8LFzo9", // barbell lying triceps extension skull crusher
  "X6C6i5Y", // triceps dip
  // Core
  "I3tsCnC", // hanging leg raise
  "Bn6TXyO", // sit-up
];

export const COMMON: readonly string[] = [
  // Chest
  "GrO65fd", // barbell decline bench press
  "DwhEmmE", // dumbbell decline bench press
  "trqKQv2", // smith bench press
  "5v7KYld", // smith incline bench press
  "nIR4Rwl", // cable seated chest press
  "Pr9Rhf4", // cable standing fly
  "yz9nUhF", // dumbbell fly
  "jHAnWmT", // machine incline chest press
  "v3xmPAR", // machine seated fly
  "tBWXbIT", // cable incline fly
  "FVmZVhk", // cable low fly
  "xLYSdtg", // cable middle fly
  // Back
  "KgI0tqW", // barbell sumo deadlift
  "rR0LJzx", // dumbbell romanian deadlift
  "jQGwmxN", // trap bar deadlift
  "kiJ4Z2K", // assisted pull-up
  "eYnzaCm", // cable bar lateral pulldown
  "ecpY0rH", // reverse-grip machine lat pulldown
  "rkg41Fb", // twin handle parallel grip lat pulldown
  "qdRxqCj", // cable pulldown (pro lat bar)
  "bZGHsAZ", // inverted row
  "7I6LNUG", // machine seated row
  "aaXr7ld", // machine t bar row
  "nZZZy9m", // machine high row
  "IGjKj1v", // machine narrow grip seated row
  "oROuvrX", // machine unilateral row
  "X3cqyXz", // machine bent over row
  "qcY50ZD", // cable seated wide-grip row
  "zhMwOwE", // hyperextension
  // Legs & glutes
  "zG0zs85", // barbell front squat
  "5VCj6iH", // barbell hack squat
  "Qa55kX1", // sled hack squat
  "jFtipLl", // smith squat
  "NNoHCEA", // smith full squat
  "7zdxRTl", // smith leg press
  "WWD6FzI", // sled 45 degrees single-leg press
  "ykHcWme", // sled calf press on leg press
  "nnmCTLN", // machine kneeling leg curl
  "FkBIE6a", // lying dumbbell leg curl
  "t8iSghb", // barbell lunge
  "IZVHb27", // walking lunge
  "HBYyX94", // barbell split squat
  "aXtJhlg", // dumbbell step-up
  "Kxquu2E", // barbell step-up
  "ipvgBnC", // barbell seated calf raise
  "r29jP7S", // dumbbell seated calf raise
  "dPmaUaU", // dumbbell standing calf raise
  "ZA8b5hc", // kettlebell goblet squat
  "UHJlbu3", // kettlebell swing
  // Shoulders
  "kTbSH9h", // barbell seated overhead press
  "A6wtbuL", // dumbbell standing overhead press
  "1TkiAFK", // dumbbell single-arm shoulder press
  "FS63wTN", // dumbbell push press
  "83HoW9X", // barbell upright row
  "goJ6ezq", // cable lateral raise
  "eOrFCnx", // dumbbell arnold press
  "3eGE2JC", // dumbbell front raise
  "v1qBec9", // dumbbell rear lateral raise
  "EAs3xL9", // dumbbell reverse fly
  "dRTfGZT", // machine lateral raise
  "wqNPGCg", // cable rear delt row (with rope)
  "PzQanLE", // cable shoulder press
  // Arms
  "qOgPVf6", // barbell preacher curl
  "G08RZcQ", // cable curl
  "gvsWLQw", // dumbbell concentration curl
  "ae9UoXQ", // dumbbell incline curl
  "jivWf8n", // dumbbell preacher curl
  "b6hQYMb", // machine preacher curl
  "J6Dx1Mu", // barbell close-grip bench press
  "iZop9xO", // barbell lying triceps extension
  "2IxROQ1", // cable overhead triceps extension (rope attachment)
  "gAwDzB3", // cable triceps pushdown (v-bar)
  "BRImeP8", // machine seated dip
  // Core
  "1ZFqTDN", // bicycle crunch
  "WW95auq", // cable kneeling crunch
  "iny3m5y", // dead bug
  "RJgzwny", // mountain climber
  "XVDdcoj", // russian twist
  "NAgVB3t", // wheel rollout
  "VBAWRPG", // weighted front plank
  "9Ap7miY", // decline crunch
  // Traps, carries & conditioning
  "dG7tG5y", // barbell shrug
  "NJzBsGJ", // dumbbell shrug
  "qPEzJjA", // farmers walk
  "dK9394r", // burpee
  "e1e76I2", // jump rope
];
