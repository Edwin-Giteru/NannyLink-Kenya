// ========================================
// API Configuration
// ========================================
const API_BASE = "http://127.0.0.1:8000/nannies";
let cachedConnections = [];

// ========================================
// Authentication Helpers
// ========================================
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

function checkAuth(response) {
    if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = "/frontend/src/views/login.html";
        return true;
    }
    return false;
}

// ========================================
// Toast Notification
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
// Status Configuration
// ========================================
function getStatusConfig(rawStatus) {
    const status = (rawStatus || '').toLowerCase().trim();
    
    if (status === 'completed') {
        return { 
            label: 'Payment Completed', 
            class: 'status-completed'
        };
    }
    
    if (status === 'awaiting_payment') {
        return { 
            label: 'Awaiting Payment', 
            class: 'status-awaiting'
        };
    }

    return { 
        label: status.replace(/_/g, ' ') || 'Pending', 
        class: 'status-pending'
    };
}

// ========================================
// Initialize Dashboard
// ========================================
async function initDashboard() {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "/frontend/src/views/login.html";
        return;
    }

    const headers = getAuthHeaders();

    try {
        const profileRes = await fetch(`${API_BASE}/profile/me`, { headers });
        if (checkAuth(profileRes)) return;
        
        const profile = await profileRes.json();
        if (profileRes.ok) updateUI(profile);

        const connRes = await fetch(`${API_BASE}/connections`, { headers });
        if (checkAuth(connRes)) return;
        
        const connectionsData = await connRes.json();
        if (connRes.ok) {
            cachedConnections = Array.isArray(connectionsData) ? connectionsData : (connectionsData.data || []);
            updateStats(cachedConnections);
        }
    } catch (err) {
        console.error("Dashboard Sync Error:", err);
        showToast("Failed to load dashboard data", "error");
    }
}

// ========================================
// Update UI with Profile Data
// ========================================
function updateUI(data) {
    const defaultAvatar = "https://via.placeholder.com/150?text=Profile";
    const heroImg = document.getElementById('hero_profile_img');
    if (heroImg) heroImg.src = data.profile_photo_url || defaultAvatar;
    
    const nannyName = document.getElementById('nanny_name');
    if (nannyName) nannyName.innerText = data.name || data.full_name || "Nanny";

    const badge = document.getElementById('vetting_badge');
    const vText = document.getElementById('vetting_text');

    const rawStatus = data.vetting_status || data.status || "pending";
    const status = String(rawStatus).toLowerCase();

    if (status === "approved") {
        if (badge) {
            badge.className = "badge badge-approved";
            badge.innerText = "VERIFIED";
        }
        if (vText) vText.innerText = "Profile Approved";
    } else if (status === "rejected") {
        if (badge) {
            badge.className = "badge badge-rejected";
            badge.innerText = "REJECTED";
        }
        if (vText) vText.innerText = "Profile Rejected";
    } else {
        if (badge) {
            badge.className = "badge badge-pending";
            badge.innerText = "IN REVIEW";
        }
        if (vText) vText.innerText = "Checking Credentials";
    }

    const availability = data.availability || "Not Set";
    const availabilityText = document.getElementById('availability_text');
    if (availabilityText) availabilityText.innerText = availability.replace(/_/g, ' ');
}

// ========================================
// Update Stats and Activity List
// ========================================
function updateStats(connections) {
    const list = document.getElementById('activity_list');
    const connectionCount = document.getElementById('connection_count');
    const contractCount = document.getElementById('contract_count');
    
    if (connectionCount) connectionCount.innerText = connections.length;

    const activeContracts = connections.filter(c => String(c.status).toLowerCase() === 'completed').length;
    if (contractCount) contractCount.innerText = activeContracts;

    if (!list) return;

    if (connections.length > 0) {
        list.innerHTML = connections.slice(0, 3).map(conn => {
            const familyName = conn.family?.name || 'Family Connection';
            const statusCfg = getStatusConfig(conn.status);
            
            return `
                <div class="activity-item">
                    <div class="activity-left">
                        <div class="activity-icon">
                            <span class="material-symbols-outlined">family_restroom</span>
                        </div>
                        <div class="activity-info">
                            <p class="family-name">${escapeHtml(familyName)}</p>
                            <span class="activity-status ${statusCfg.class}">
                                ${escapeHtml(statusCfg.label)}
                            </span>
                        </div>
                    </div>
                    <button onclick="openModal('${conn.id}')" class="activity-action">
                        <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            `;
        }).join('');
    } else {
        list.innerHTML = '<p class="empty-message">Waiting for your first match...</p>';
    }
}

// ========================================
// Modal Functions
// ========================================
function openModal(connId) {
    const conn = cachedConnections.find(c => String(c.id) === String(connId));
    if (!conn) return;

    const familyName = conn.family?.name || 'Valued Family';
    const familyLocation = conn.family?.household_location || 'Nairobi Area';
    const statusCfg = getStatusConfig(conn.status);
    const matchDate = new Date(conn.created_at || Date.now()).toLocaleDateString();

    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;
    
    modalContent.innerHTML = `
        <div class="modal-family-card">
            <div class="modal-family-icon">
                <span class="material-symbols-outlined">family_restroom</span>
            </div>
            <div>
                <h3 class="modal-family-name">${escapeHtml(familyName)}</h3>
                <p class="modal-family-date">Matched: ${escapeHtml(matchDate)}</p>
            </div>
        </div>
        <div class="modal-stats-grid">
            <div class="modal-stat-card">
                <p class="modal-stat-label">Status</p>
                <span class="modal-status-badge ${statusCfg.class}">
                    ${escapeHtml(statusCfg.label)}
                </span>
            </div>
            <div class="modal-stat-card">
                <p class="modal-stat-label">Location</p>
                <p class="modal-stat-value">${escapeHtml(familyLocation)}</p>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('connection-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-active');
    }
}

function closeModal() {
    const modal = document.getElementById('connection-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-active');
}

// ========================================
// Helper Functions
// ========================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========================================
// Event Listeners & Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('access_token')) {
        window.location.href = "/frontend/src/views/login.html";
        return;
    }
    initDashboard();
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Make functions globally available
window.openModal = openModal;
window.closeModal = closeModal;