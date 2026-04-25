// ========================================
// API Configuration
// ========================================
const API_BASE = "http://127.0.0.1:8000";
const token = localStorage.getItem('access_token');

// Redirect if no token
if (!token) {
    window.location.href = '../views/login.html';
}

// ========================================
// Authentication Helpers
// ========================================
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

// ========================================
// Fetch with better error handling
// ========================================
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers
            },
            mode: 'cors'
        });
        
        if (response.status === 401 || response.status === 403) {
            logout();
            return null;
        }
        
        return response;
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
}

// ========================================
// Load Profile Data
// ========================================
async function loadProfile() {
    try {
        const response = await apiFetch(`${API_BASE}/families/profile/me`);
        
        if (!response) return;
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        
        // Populate DOM
        const familyName = document.getElementById('family_name');
        const familyLocation = document.getElementById('family_location');
        const householdDetails = document.getElementById('household_details');
        
        if (familyName) familyName.innerText = data.name || "NannyLink User";
        if (familyLocation) familyLocation.innerText = data.household_location || 'Location not set';
        if (householdDetails) householdDetails.innerText = data.household_details || 'No details provided.';
        
        // Update avatar
        const avatarImg = document.getElementById('avatar');
        if (avatarImg) {
            const name = data.name || 'Family';
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00152f&color=fff`;
        }
        
        // Populate Stats
        const connectionsStat = document.getElementById('stat_connections');
        const contractsStat = document.getElementById('stat_contracts');
        const paymentsStat = document.getElementById('stat_payments');
        
        if (connectionsStat) connectionsStat.innerText = data.stats?.connections || 0;
        if (contractsStat) contractsStat.innerText = data.stats?.contracts || 0;
        
        const totalPaid = data.stats?.total_paid || 0;
        if (paymentsStat) paymentsStat.innerText = `KES ${totalPaid.toLocaleString()}`;

    } catch (error) {
        console.error("Dashboard error:", error);
        
        if (error.message.includes('fetch') || error.message.includes('CORS')) {
            showToast(`
                <strong>Connection Error!</strong><br>
                Unable to connect to the backend server.<br>
                <small>Please check if the server is running on ${API_BASE}</small>
            `, 'error', 5000);
        } else {
            showToast(`Failed to load profile: ${error.message}`, 'error', 4000);
        }
    }
}

// ========================================
// Logout Function
// ========================================
function logout() {
    localStorage.removeItem('access_token');
    window.location.href = '../views/login.html';
}

// ========================================
// Toast Notification System
// ========================================
function createToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'success', duration = 4000) {
    const container = createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check_circle';
    let label = 'Success';
    if (type === 'error') {
        icon = 'error';
        label = 'Error';
    }
    
    toast.innerHTML = `
        <span class="toast-icon material-symbols-outlined">${icon}</span>
        <div class="toast-content">
            <p class="toast-label">${label}</p>
            <p class="toast-message">${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
}

// ========================================
// Check Backend Connection
// ========================================
async function checkBackendConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE}/docs`, {
            signal: controller.signal,
            mode: 'no-cors'
        });
        
        clearTimeout(timeoutId);
        console.log("Backend connection check completed");
        return true;
    } catch (error) {
        console.warn("Backend not reachable:", error);
        showToast(`
            <strong>Cannot connect to backend server!</strong><br>
            Make sure the FastAPI server is running on ${API_BASE}<br>
            <small>Run: uvicorn main:app --reload --host 127.0.0.1 --port 8000</small>
        `, 'error', 8000);
        return false;
    }
}

// ========================================
// Event Listeners & Initialization
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Verify token again on page load
    if (!localStorage.getItem('access_token')) {
        window.location.href = '../views/login.html';
        return;
    }
    
    // Check backend connection
    await checkBackendConnection();
    
    // Load profile data
    await loadProfile();
});

// Make functions globally available
window.logout = logout;