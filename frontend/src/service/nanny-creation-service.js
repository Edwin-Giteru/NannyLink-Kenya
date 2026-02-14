import { API_URL } from "../utils/config.js";
export async function createNannyProfile(profileData, token) {
  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_URL}/Nanny`, { 
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(profileData)
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.detail || "Submission failed" };
    }
  } catch (err) {
    return { success: false, message: "Network error" };
  }
}