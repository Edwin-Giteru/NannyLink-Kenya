const URL = "http://127.0.0.1:8000"; 

export const login = async (email, password) => {
  try {
    const response = await fetch(`${URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, ...data };
    } else {
      return { success: false, message: data.detail || "Login failed" };
    }
  } catch (err) {
    return { success: false, message: "Network error" };
  }
};

export async function signup(userData) {
  try {
    const endpoint = userData.role.toLowerCase() === "nanny" ? "nanny" : "family";
    
    const response = await fetch(`${URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data: data };
    } else {
      return { success: false, message: data.detail || "Signup failed" };
    }
  } catch (error) {
    return { success: false, message: "Network error occurred" };
  }
}