import { API_URL } from "../utils/config.js";

/**
 * Log in an existing user.
 * Endpoint: POST /login
 * Body: { email, password }
 * @param {string} emailAddress
 * @param {string} password
 * @returns {{ success: boolean, access_token?: string, message?: string }}
 */
export async function login(emailAddress, password) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailAddress, password }),
    });

    const responseData = await response.json();

    if (response.ok) {
      return { success: true, ...responseData };
    } else {
      return {
        success: false,
        message: responseData.detail || "Login failed. Check your credentials.",
      };
    }
  } catch (networkError) {
    console.error("[authService] login network error:", networkError);
    return { success: false, message: "Network error. Please check your connection." };
  }
}

/**
 * Register a new user.
 * Endpoint: POST /nanny  (role === "nanny")
 *           POST /family (role === "family")
 * @param {{ email, password, first_name, last_name, role }} userData
 * @returns {{ success: boolean, data?: object, message?: string }}
 */
export async function signup(userData) {
  try {
    const roleEndpoint = userData.role?.toLowerCase() === "nanny" ? "nanny" : "family";

    const response = await fetch(`${API_URL}/${roleEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const responseData = await response.json();

    if (response.ok) {
      return { success: true, data: responseData };
    } else {
      return {
        success: false,
        message: responseData.detail || "Signup failed. Please try again.",
      };
    }
  } catch (networkError) {
    console.error("[authService] signup network error:", networkError);
    return { success: false, message: "Network error occurred. Please try again." };
  }
}

/**
 * Request a password reset email.
 * Endpoint: POST /auth/forgot-password
 * @param {string} emailAddress
 * @returns {{ success: boolean, message: string }}
 */
export async function requestPasswordReset(emailAddress) {
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailAddress }),
    });

    const responseData = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: responseData.message || "Reset link sent. Check your email.",
      };
    } else {
      return {
        success: false,
        message: responseData.detail || "Could not send reset email.",
      };
    }
  } catch (networkError) {
    console.error("[authService] requestPasswordReset network error:", networkError);
    return { success: false, message: "Network error. Please try again." };
  }
}

/**
 * Confirm a password reset with the token from the email link.
 * Endpoint: POST /auth/reset-password
 * @param {string} resetToken  — from URL param ?token=...
 * @param {string} newPassword
 * @returns {{ success: boolean, message: string }}
 */
export async function confirmPasswordReset(resetToken, newPassword) {
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, new_password: newPassword }),
    });

    const responseData = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: responseData.message || "Password reset successfully.",
      };
    } else {
      return {
        success: false,
        message: responseData.detail || "Reset failed. The link may have expired.",
      };
    }
  } catch (networkError) {
    console.error("[authService] confirmPasswordReset network error:", networkError);
    return { success: false, message: "Network error. Please try again." };
  }
}