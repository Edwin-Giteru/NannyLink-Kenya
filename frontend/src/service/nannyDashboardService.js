const API_URL = "http://127.0.0.1:8000";

export async function getAllJobs() {
    const token = localStorage.getItem("access_token");
    
    try {
        const response = await fetch(`${API_URL}/job/`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true, data: data };
        } else {
            return { success: false, message: data.detail || "Failed to fetch jobs" };
        }
    } catch (error) {
        return { success: false, message: "Network error. Please try again later." };
    }
}