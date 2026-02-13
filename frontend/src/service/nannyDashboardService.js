const API_URL = "http://127.0.0.1:8000";

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

// export async function getNannyApplications() {
//     try {
//         const token = localStorage.getItem("access_token");
//         const response = await fetch(`${API_URL}/`, {
//             headers: { "Authorization": `Bearer ${token}` }
//         });
//         const result = await response.json();
//         return response.ok ? { success: true, data: result } : { success: false, message: result.detail };
//     } catch (error) {
//         return { success: false, message: "Could not sync applications." };
//     }
// }

export async function getNannyApplications() {
    const { token, userId } = getAuthData();
    try {
        const response = await fetch(`${API_URL}/Nanny/applications${userId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false };
    } catch (error) {
        return { success: false };
    }
}