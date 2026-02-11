// src/service/nannyProfileService.js
const API_URL = "http://127.0.0.1:8000";

export async function getNannyProfile() {
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${API_URL}/nanny/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false, message: data.detail };
    } catch (error) {
        return { success: false, message: "Connection error" };
    }
}

export async function updateNannyProfile(profileData) {
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${API_URL}/nanny/update`, {
            method: "PUT",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(profileData)
        });
        return response.ok ? { success: true } : { success: false };
    } catch (error) { return { success: false }; }
}

export async function deleteNannyAccount() {
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${API_URL}/nanny/delete`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        return response.ok ? { success: true } : { success: false };
    } catch (error) { return { success: false }; }
}

export async function getMyApplications() {
    const token = localStorage.getItem("access_token");
    try {
        const response = await fetch(`${API_URL}/applications/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        return response.ok ? { success: true, data } : { success: false };
    } catch (error) { return { success: false }; }
}