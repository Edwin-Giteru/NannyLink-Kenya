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

export { getAuthData };

export async function getNannyProfile() {
    const { token, userId } = getAuthData();
    if (!userId) return { success: false, message: "Unauthorized" };
    try {
        const response = await fetch(`${API_URL}/Nanny/${userId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, message: data.detail };
    } catch (error) {
        return { success: false, message: "Network error" };
    }
}

export async function getMyApplications() {
    const { token, userId } = getAuthData();
    if (!userId) return { success: false, message: "Unauthorized" };
    try {
        const response = await fetch(`${API_URL}/Nanny/applications/${userId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, message: data.detail };
    } catch (error) {
        return { success: false, message: "Network error" };
    }
}

export async function updateNannyProfile(updateData) {
    const { token } = getAuthData();
    try {
        const response = await fetch(`${API_URL}/Nanny/`, { 
            method: "PATCH",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, message: errorData.detail || "Server validation failed" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error("Actual Fetch Error:", error); 
        return { success: false, message: "Network error" };
    }
}
export async function deleteNannyAccount(userId) {
    const { token } = getAuthData();
    try {
        const response = await fetch(`${API_URL}/Nanny/${userId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        return response.ok ? { success: true } : { success: false };
    } catch (error) {
        return { success: false };
    }
}