import { formatTime } from "@/utils/formatTime";
import {
    cmToInches,
    feetInchesToInches,
    formatHeight,
    inchesToCm,
    inchesToFeetInches,
} from "@/utils/heightConversion";
import {
    estimateCaloriesFromSteps,
    estimateDistanceFromSteps,
    getDayAbbrev,
} from "@/utils/stepUtils";

// ─── formatTime ──────────────────────────────────────────────────────────────
describe("formatTime", () => {
  it("formats 0 seconds as 00:00:00", () => {
    expect(formatTime(0)).toBe("00:00:00");
  });

  it("formats seconds only", () => {
    expect(formatTime(45)).toBe("00:00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125)).toBe("00:02:05");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatTime(3661)).toBe("01:01:01");
  });

  it("pads single-digit values", () => {
    expect(formatTime(1)).toBe("00:00:01");
    expect(formatTime(60)).toBe("00:01:00");
    expect(formatTime(3600)).toBe("01:00:00");
  });

  it("handles large values", () => {
    // 99 hours, 59 minutes, 59 seconds
    expect(formatTime(359999)).toBe("99:59:59");
  });
});

// ─── heightConversion ────────────────────────────────────────────────────────
describe("feetInchesToInches", () => {
  it("converts 5 feet 10 inches to 70 inches", () => {
    expect(feetInchesToInches(5, 10)).toBe(70);
  });

  it("converts feet only (0 inches default)", () => {
    expect(feetInchesToInches(6)).toBe(72);
  });

  it("handles 0 feet", () => {
    expect(feetInchesToInches(0, 5)).toBe(5);
  });
});

describe("inchesToFeetInches", () => {
  it("converts 70 inches to 5 feet 10 inches", () => {
    expect(inchesToFeetInches(70)).toEqual({ feet: 5, inches: 10 });
  });

  it("converts exact foot values", () => {
    expect(inchesToFeetInches(72)).toEqual({ feet: 6, inches: 0 });
  });

  it("converts 0 inches", () => {
    expect(inchesToFeetInches(0)).toEqual({ feet: 0, inches: 0 });
  });
});

describe("inchesToCm", () => {
  it("converts 70 inches to ~178 cm", () => {
    expect(inchesToCm(70)).toBe(178);
  });

  it("converts 0 inches to 0 cm", () => {
    expect(inchesToCm(0)).toBe(0);
  });
});

describe("cmToInches", () => {
  it("converts 178 cm to ~70 inches", () => {
    expect(cmToInches(178)).toBe(70);
  });

  it("converts 0 cm to 0 inches", () => {
    expect(cmToInches(0)).toBe(0);
  });
});

describe("formatHeight", () => {
  it("formats imperial height", () => {
    expect(formatHeight(70, "imperial")).toBe("5'10\"");
  });

  it("formats metric height", () => {
    expect(formatHeight(70, "metric")).toBe("178 cm");
  });

  it("defaults to imperial", () => {
    expect(formatHeight(72)).toBe("6'0\"");
  });
});

// ─── stepTracking utilities ──────────────────────────────────────────────────
describe("estimateCaloriesFromSteps", () => {
  it("returns 0 for 0 steps", () => {
    expect(estimateCaloriesFromSteps(0)).toBe(0);
  });

  it("estimates ~400 calories for 10,000 steps", () => {
    expect(estimateCaloriesFromSteps(10000)).toBe(400);
  });

  it("rounds to nearest integer", () => {
    expect(estimateCaloriesFromSteps(1)).toBe(0); // 0.04 rounds to 0
    expect(estimateCaloriesFromSteps(13)).toBe(1); // 0.52 rounds to 1
  });
});

describe("estimateDistanceFromSteps", () => {
  it("returns 0 for 0 steps", () => {
    expect(estimateDistanceFromSteps(0)).toBe(0);
  });

  it("estimates ~4.73 miles for 10,000 steps", () => {
    // 10000 * 2.5 / 5280 ≈ 4.73
    const result = estimateDistanceFromSteps(10000);
    expect(result).toBeCloseTo(4.73, 1);
  });
});

describe("getDayAbbrev", () => {
  it("returns short weekday for a known date", () => {
    // 2026-03-01 is a Sunday
    expect(getDayAbbrev("2026-03-01")).toBe("Sun");
  });

  it("returns Mon for 2026-03-02", () => {
    expect(getDayAbbrev("2026-03-02")).toBe("Mon");
  });
});
