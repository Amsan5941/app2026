import {
    CalorieEstimationInput,
    estimateCalories,
} from "@/utils/calorieEstimation";

describe("estimateCalories (Mifflin-St Jeor)", () => {
  const baseMale: CalorieEstimationInput = {
    age: 25,
    weight: 180, // lbs
    heightInInches: 70, // 5'10"
    sex: "male",
    goal: "Maintaining",
    activityLevel: "moderate",
  };

  const baseFemale: CalorieEstimationInput = {
    ...baseMale,
    sex: "female",
    weight: 140,
    heightInInches: 65,
  };

  // ── Null / invalid input ───────────────────────────────────────────
  it("returns null when age is missing (0)", () => {
    expect(estimateCalories({ ...baseMale, age: 0 })).toBeNull();
  });

  it("returns null when weight is missing (0)", () => {
    expect(estimateCalories({ ...baseMale, weight: 0 })).toBeNull();
  });

  it("returns null when height is missing (0)", () => {
    expect(estimateCalories({ ...baseMale, heightInInches: 0 })).toBeNull();
  });

  it("returns null for negative inputs", () => {
    expect(estimateCalories({ ...baseMale, age: -1 })).toBeNull();
    expect(estimateCalories({ ...baseMale, weight: -5 })).toBeNull();
    expect(estimateCalories({ ...baseMale, heightInInches: -10 })).toBeNull();
  });

  // ── Male calculations ──────────────────────────────────────────────
  it("calculates correct maintenance calories for a male", () => {
    const result = estimateCalories(baseMale)!;
    // Manual: weightKg=81.65, heightCm=177.8
    // BMR = 10*81.65 + 6.25*177.8 - 5*25 + 5 = 816.5 + 1111.25 - 125 + 5 = 1807.75
    // TDEE = 1807.75 * 1.55 ≈ 2802
    expect(result).toBeGreaterThan(2700);
    expect(result).toBeLessThan(2900);
  });

  it("applies -500 for cutting goal", () => {
    const maintaining = estimateCalories(baseMale)!;
    const cutting = estimateCalories({ ...baseMale, goal: "Cutting" })!;
    expect(cutting).toBe(maintaining - 500);
  });

  it("applies +500 for bulking goal", () => {
    const maintaining = estimateCalories(baseMale)!;
    const bulking = estimateCalories({ ...baseMale, goal: "Bulking" })!;
    expect(bulking).toBe(maintaining + 500);
  });

  it("is case-insensitive for goal strings", () => {
    const upper = estimateCalories({ ...baseMale, goal: "Cutting" })!;
    const lower = estimateCalories({ ...baseMale, goal: "cutting" })!;
    expect(upper).toBe(lower);
  });

  // ── Female calculations ────────────────────────────────────────────
  it("calculates lower BMR for females (uses -161 offset)", () => {
    const male = estimateCalories(baseMale)!;
    const female = estimateCalories({
      ...baseMale,
      sex: "female",
    })!;
    expect(female).toBeLessThan(male);
  });

  it("calculates correct maintenance calories for a female", () => {
    const result = estimateCalories(baseFemale)!;
    // Manual: weightKg≈63.5, heightCm=165.1
    // BMR = 10*63.5 + 6.25*165.1 - 5*25 - 161 = 635 + 1031.875 - 125 - 161 = 1380.875
    // TDEE = 1380.875 * 1.55 ≈ 2140
    expect(result).toBeGreaterThan(2050);
    expect(result).toBeLessThan(2250);
  });

  // ── "Other" sex (average of male + female) ─────────────────────────
  it("averages male and female BMR for sex='other'", () => {
    const male = estimateCalories(baseMale)!;
    const female = estimateCalories({ ...baseMale, sex: "female" })!;
    const other = estimateCalories({ ...baseMale, sex: "other" })!;
    // Should be roughly midway — allow ±1 for rounding
    const expected = Math.round((male + female) / 2);
    expect(Math.abs(other - expected)).toBeLessThanOrEqual(1);
  });

  // ── Activity levels ────────────────────────────────────────────────
  it("sedentary < light < moderate < active", () => {
    const levels = ["sedentary", "light", "moderate", "active"] as const;
    const results = levels.map(
      (activityLevel) => estimateCalories({ ...baseMale, activityLevel })!,
    );
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBeGreaterThan(results[i - 1]);
    }
  });

  // ── Minimum floor ─────────────────────────────────────────────────
  it("never returns below 1200 calories", () => {
    const extreme = estimateCalories({
      age: 80,
      weight: 90, // very light person
      heightInInches: 55,
      sex: "female",
      goal: "Cutting",
      activityLevel: "sedentary",
    })!;
    expect(extreme).toBeGreaterThanOrEqual(1200);
  });
});
