/**
 * Pure validation helpers for the signup flow.
 * Extracted from AuthModal.tsx for testability and reuse.
 */

/**
 * Returns true if the email contains an "@" symbol.
 */
export function isValidEmail(value: string): boolean {
  return value.includes("@");
}

/**
 * Returns true if the password is at least 8 characters long
 * and contains at least one special (non-alphanumeric) character.
 */
export function isValidPassword(value: string): boolean {
  return value.length >= 8 && /[^A-Za-z0-9]/.test(value);
}

export interface AccountFields {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export interface BioFields {
  age: string;
  weight: string;
  heightFeet: string;
  sex: string;
  goal: string;
  goalWeight: string;
}

/**
 * Validate the account step of signup.
 * Returns an error message or null if valid.
 */
export function validateAccountStep(fields: AccountFields): string | null {
  if (!fields.firstname.trim() || !fields.lastname.trim()) {
    return "Please enter your first and last name";
  }
  if (!fields.email.trim() || !fields.password.trim()) {
    return "Please enter email and password";
  }
  if (!isValidEmail(fields.email)) {
    return "Please enter a valid email address (must include @)";
  }
  if (!isValidPassword(fields.password)) {
    return "Password must be at least 8 characters and include at least one special character";
  }
  return null;
}

/**
 * Validate the bio step of signup.
 * Returns an error message or null if valid.
 */
export function validateBioStep(fields: BioFields): string | null {
  const { age, weight, heightFeet, sex, goal, goalWeight } = fields;
  if (!age || !weight || !heightFeet || !sex || !goal || !goalWeight) {
    return "Please fill in all bio information";
  }
  return null;
}
