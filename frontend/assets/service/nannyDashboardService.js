import { API_URL } from "../../src/utils/config.js";
const getAuthData = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return { token: null, userId: null };
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { token, userId: payload.sub }; 
    } catch (e) {
        return { token: null, userId: null };
    }
};

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

export async function applyToJob(jobId) {
    try {
        const token = localStorage.getItem("access_token"); 
        const response = await fetch(`${API_URL}/apply/${jobId}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();
        if (response.ok) {
            return { success: true, data: result };
        } else {
            return { success: false, message: result.detail || "Failed to apply" };
        }
    } catch (error) {
        return { success: false, message: "Network error occurred." };
    }
}

export async function getNannyApplications() {
    const token = localStorage.getItem("access_token");
    if (!token) return { success: false };

    try {
        const response = await fetch(`${API_URL}/Nanny/applications/me`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        return response.ok
            ? { success: true, data }
            : { success: false, message: data.detail || "Failed to fetch applications" };
    } catch (error) {
        console.error("Applications fetch error:", error);
        return { success: false, message: "Network error" };
    }
}

// endpoint for fetching the family name of a job posting in javascript frontend
export async function getFamilyNameByJobId(jobId) {
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${API_URL}/job/${jobId}/family-name`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, message: data.detail };
    } catch (error) {
        return { success: false, message: "Could not fetch family name." };
    }
}
