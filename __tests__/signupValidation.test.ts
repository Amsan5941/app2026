import {
    isValidEmail,
    isValidPassword,
    validateAccountStep,
    validateBioStep,
} from "@/utils/signupValidation";

// ─── isValidEmail ────────────────────────────────────────────────────────────
describe("isValidEmail", () => {
  it("returns true for valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("a@b")).toBe(true);
  });

  it("returns false when @ is missing", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("just-a-string")).toBe(false);
  });
});

// ─── isValidPassword ────────────────────────────────────────────────────────
describe("isValidPassword", () => {
  it("returns true for ≥8 chars with a special character", () => {
    expect(isValidPassword("hello123!")).toBe(true);
    expect(isValidPassword("Passw0rd@")).toBe(true);
    expect(isValidPassword("12345678$")).toBe(true);
  });

  it("returns false for < 8 characters", () => {
    expect(isValidPassword("abc!")).toBe(false);
    expect(isValidPassword("")).toBe(false);
    expect(isValidPassword("1234567")).toBe(false);
  });

  it("returns false without a special character", () => {
    expect(isValidPassword("abcdefgh")).toBe(false);
    expect(isValidPassword("HelloWorld1")).toBe(false);
  });

  it("recognises various special characters", () => {
    expect(isValidPassword("abcdefg!")).toBe(true);
    expect(isValidPassword("abcdefg@")).toBe(true);
    expect(isValidPassword("abcdefg#")).toBe(true);
    expect(isValidPassword("abcdefg ")).toBe(true); // space is special
  });
});

// ─── validateAccountStep ─────────────────────────────────────────────────────
describe("validateAccountStep", () => {
  const validAccount = {
    firstname: "John",
    lastname: "Doe",
    email: "john@example.com",
    password: "SecureP@ss1",
  };

  it("returns null for valid fields", () => {
    expect(validateAccountStep(validAccount)).toBeNull();
  });

  it("requires first name", () => {
    expect(validateAccountStep({ ...validAccount, firstname: "" })).toBe(
      "Please enter your first and last name",
    );
  });

  it("requires last name", () => {
    expect(validateAccountStep({ ...validAccount, lastname: "  " })).toBe(
      "Please enter your first and last name",
    );
  });

  it("requires email", () => {
    expect(validateAccountStep({ ...validAccount, email: "" })).toBe(
      "Please enter email and password",
    );
  });

  it("requires password", () => {
    expect(validateAccountStep({ ...validAccount, password: "" })).toBe(
      "Please enter email and password",
    );
  });

  it("validates email format", () => {
    expect(
      validateAccountStep({ ...validAccount, email: "not-an-email" }),
    ).toBe("Please enter a valid email address (must include @)");
  });

  it("validates password strength", () => {
    expect(validateAccountStep({ ...validAccount, password: "short" })).toBe(
      "Password must be at least 8 characters and include at least one special character",
    );
  });
});

// ─── validateBioStep ─────────────────────────────────────────────────────────
describe("validateBioStep", () => {
  const validBio = {
    age: "25",
    weight: "180",
    heightFeet: "5",
    sex: "male",
    goal: "Maintaining",
    goalWeight: "175",
  };

  it("returns null for valid bio fields", () => {
    expect(validateBioStep(validBio)).toBeNull();
  });

  it("requires age", () => {
    expect(validateBioStep({ ...validBio, age: "" })).toBe(
      "Please fill in all bio information",
    );
  });

  it("requires weight", () => {
    expect(validateBioStep({ ...validBio, weight: "" })).toBe(
      "Please fill in all bio information",
    );
  });

  it("requires heightFeet", () => {
    expect(validateBioStep({ ...validBio, heightFeet: "" })).toBe(
      "Please fill in all bio information",
    );
  });

  it("requires sex", () => {
    expect(validateBioStep({ ...validBio, sex: "" })).toBe(
      "Please fill in all bio information",
    );
  });

  it("requires goal", () => {
    expect(validateBioStep({ ...validBio, goal: "" })).toBe(
      "Please fill in all bio information",
    );
  });

  it("requires goalWeight", () => {
    expect(validateBioStep({ ...validBio, goalWeight: "" })).toBe(
      "Please fill in all bio information",
    );
  });
});
