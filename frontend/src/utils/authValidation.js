/**
 * authValidation.js
 * Shared validation rules for login, signup, and password reset forms.
 * All functions return { valid: boolean, message: string }.
 */

/* ── EMAIL ────────────────────────────────────────────────────────────────── */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate an email address.
 * @param {string} emailAddress
 * @returns {{ valid: boolean, message: string }}
 */
export function validateEmail(emailAddress) {
  const trimmed = (emailAddress || "").trim();

  if (!trimmed) {
    return { valid: false, message: "Email address is required." };
  }
  if (trimmed.length > 254) {
    return { valid: false, message: "Email address is too long." };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: "Enter a valid email address (e.g. jane@gmail.com)." };
  }
  return { valid: true, message: "" };
}

/* ── PASSWORD ─────────────────────────────────────────────────────────────── */

export const PASSWORD_RULES = {
  minLength:    8,
  maxLength:    72,   // bcrypt silently truncates beyond 72 chars — enforce at client
  requireDigit: true,
  requireLetter: true,
};

/**
 * Validate a password against all rules.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, message: "Password is required." };
  }
  if (password.length < PASSWORD_RULES.minLength) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_RULES.minLength} characters.`,
    };
  }
  if (password.length > PASSWORD_RULES.maxLength) {
    return {
      valid: false,
      message: `Password must be no more than ${PASSWORD_RULES.maxLength} characters.`,
    };
  }
  if (PASSWORD_RULES.requireLetter && !/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter." };
  }
  if (PASSWORD_RULES.requireDigit && !/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number." };
  }
  return { valid: true, message: "" };
}

/**
 * Validate that the confirm password matches the original.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePasswordConfirm(password, confirmPassword) {
  if (!confirmPassword) {
    return { valid: false, message: "Please confirm your password." };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: "Passwords do not match." };
  }
  return { valid: true, message: "" };
}

/* ── PASSWORD STRENGTH ────────────────────────────────────────────────────── */

/**
 * Evaluate password strength (for visual feedback only — not a gate).
 * @param {string} password
 * @returns {{ level: "weak"|"fair"|"strong", label: string, score: number } | null}
 */
export function evaluatePasswordStrength(password) {
  if (!password) return null;

  let strengthScore = 0;

  if (password.length >= 8)  strengthScore++;
  if (password.length >= 12) strengthScore++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strengthScore++;
  if (/[0-9]/.test(password)) strengthScore++;
  if (/[^A-Za-z0-9]/.test(password)) strengthScore++;

  if (strengthScore <= 2) return { level: "weak",   label: "Weak",   score: strengthScore };
  if (strengthScore <= 3) return { level: "fair",   label: "Fair",   score: strengthScore };
  return                         { level: "strong", label: "Strong", score: strengthScore };
}

/* ── NAME ─────────────────────────────────────────────────────────────────── */

/**
 * Validate a first or last name.
 * @param {string} nameValue
 * @param {"First"|"Last"} fieldLabel
 * @returns {{ valid: boolean, message: string }}
 */
export function validateName(nameValue, fieldLabel = "Name") {
  const trimmed = (nameValue || "").trim();

  if (!trimmed) {
    return { valid: false, message: `${fieldLabel} name is required.` };
  }
  if (trimmed.length < 2) {
    return { valid: false, message: `${fieldLabel} name must be at least 2 characters.` };
  }
  if (trimmed.length > 50) {
    return { valid: false, message: `${fieldLabel} name must be 50 characters or fewer.` };
  }
  if (/[0-9!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?]/.test(trimmed)) {
    return { valid: false, message: `${fieldLabel} name should not contain numbers or special characters.` };
  }
  return { valid: true, message: "" };
}