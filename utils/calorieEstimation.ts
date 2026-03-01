/**
 * Pure utility for calorie estimation using the Mifflin-St Jeor equation.
 * Extracted from profile.tsx for testability and reuse.
 */

export type Sex = "male" | "female" | "other";
export type Goal =
  | "Cutting"
  | "cutting"
  | "Bulking"
  | "bulking"
  | "Maintaining"
  | "maintaining";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export interface CalorieEstimationInput {
  age: number;
  /** Weight in lbs */
  weight: number;
  /** Height in inches */
  heightInInches: number;
  sex: Sex;
  goal: Goal;
  activityLevel: ActivityLevel;
}

/**
 * Activity level multipliers (Mifflin-St Jeor standard).
 */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

/** Minimum calorie floor regardless of calculation */
const MIN_CALORIES = 1200;

/** Surplus/deficit for bulking/cutting */
const GOAL_ADJUSTMENT = 500;

/**
 * Estimate daily calorie goal using the Mifflin-St Jeor equation.
 *
 * @returns The estimated daily calorie target, or null if inputs are invalid.
 */
export function estimateCalories(input: CalorieEstimationInput): number | null {
  const { age, weight, heightInInches, sex, goal, activityLevel } = input;

  if (!age || !weight || !heightInInches || !sex || !goal || !activityLevel) {
    return null;
  }
  if (age <= 0 || weight <= 0 || heightInInches <= 0) {
    return null;
  }

  const heightCm = heightInInches * 2.54;
  const weightKg = weight * 0.45359237;

  let bmr: number;
  const sexLower = sex.toLowerCase();
  if (sexLower === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (sexLower === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    // "other" — average of male and female BMR
    const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    bmr = (male + female) / 2;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  let maintenance = Math.round(bmr * multiplier);

  const goalLower = goal.toLowerCase();
  if (goalLower === "cutting") maintenance -= GOAL_ADJUSTMENT;
  else if (goalLower === "bulking") maintenance += GOAL_ADJUSTMENT;

  return Math.max(MIN_CALORIES, maintenance);
}
