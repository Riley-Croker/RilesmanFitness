// Weight unit handling. Weights are STORED in lbs (the app default);
// users who prefer kg get values converted at display time and their
// input converted back to lbs on save.

export type WeightUnit = "lbs" | "kg";

export const DEFAULT_UNIT: WeightUnit = "lbs";
const LBS_PER_KG = 2.20462;

// Stored lbs → value in the user's display unit, rounded to 0.1.
export function toDisplayWeight(storedLbs: number, unit: WeightUnit): number {
  const value = unit === "kg" ? storedLbs / LBS_PER_KG : storedLbs;
  return Math.round(value * 10) / 10;
}

// Input in the user's unit → lbs for storage.
export function toStoredLbs(value: number, unit: WeightUnit): number {
  const lbs = unit === "kg" ? value * LBS_PER_KG : value;
  return Math.round(lbs * 100) / 100;
}

export function isWeightUnit(value: unknown): value is WeightUnit {
  return value === "lbs" || value === "kg";
}
