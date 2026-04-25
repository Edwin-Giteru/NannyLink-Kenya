// ========================================
// API Configuration
// ========================================
const API_BASE_URL = "http://127.0.0.1:8000/connections";
let allConnections = [];

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
// Rotating Phrases
// ========================================
const phrases = [
    "Your next great family connection is just one click away.",
    "Professional care makes a world of difference.",
    "Consistency is the key to building trust with families.",
    "Showcase your skills and let your profile do the talking.",
    "Great nannies build great futures for children."
];

function rotatePhrases() {
    const el = document.getElementById('catchy-phrase');
    if (!el) return;
    let i = 0;
    setInterval(() => {
        i = (i + 1) % phrases.length;
        el.style.opacity = '0';
        setTimeout(() => {
            el.innerText = phrases[i];
            el.style.opacity = '1';
        }, 500);
    }, 6000);
}

// ========================================
// Fetch Connections
// ========================================
async function fetchConnections() {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        window.location.href = "/frontend/src/views/login.html";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            headers: getAuthHeaders()
        });

        if (checkAuth(response)) return;

        if (response.ok) {
            allConnections = await response.json();
            renderConnections(allConnections);
        } else {
            showToast("Failed to load connections", "error");
        }
    } catch (error) { 
        console.error('Error:', error);
        showToast("Network error. Please try again.", "error");
    }
}

// ========================================
// Render Connections
// ========================================
function renderConnections(connections) {
    const pendingList = document.getElementById('pending-list');
    const paidList = document.getElementById('paid-list');
    
    if (!pendingList || !paidList) return;
    
    pendingList.innerHTML = '';
    paidList.innerHTML = '';
    let pendingCount = 0;

    connections.forEach(conn => {
        const status = (conn.status || '').toLowerCase();
        if (status === 'awaiting_payment') {
            pendingCount++;
            pendingList.innerHTML += createRequestCard(conn);
        } else if (status === 'completed') {
            paidList.innerHTML += createCompletedRow(conn);
        }
    });

    const countBadge = document.getElementById('pending-count');
    if (countBadge) countBadge.innerText = pendingCount;
    
    if (pendingCount === 0) {
        pendingList.innerHTML = `<div class="empty-state">Scanning for new families...</div>`;
    }
}

function createRequestCard(conn) {
    const family = conn.family || {};
    const familyName = escapeHtml(family.name || 'New Family');
    const familyLocation = escapeHtml(family.location || 'Njoro District');
    const familyAvatar = family.profile_picture_url || 'https://via.placeholder.com/150';
    
    return `
        <div class="connection-card" onclick="openModal('${conn.id}')">
            <div class="card-header">
                <img class="card-avatar" src="${familyAvatar}" alt="${familyName}">
                <div class="card-info">
                    <h3>${familyName}</h3>
                    <p class="card-location">
                        <span class="material-symbols-outlined">location_on</span> ${familyLocation}
                    </p>
                </div>
            </div>
            <div class="card-footer">
                <span class="footer-label">Family is Reviewing</span>
                <span class="footer-icon material-symbols-outlined">arrow_forward_ios</span>
            </div>
        </div>
    `;
}

function createCompletedRow(conn) {
    const family = conn.family || {};
    const familyName = escapeHtml(family.name || 'Family');
    const year = conn.created_at ? new Date(conn.created_at).getFullYear() : new Date().getFullYear();
    
    return `
        <div class="completed-row">
            <div class="row-left">
                <div class="row-icon">
                    <span class="material-symbols-outlined">verified</span>
                </div>
                <div class="row-info">
                    <h4>${familyName}</h4>
                    <p class="row-date">Partnered since ${year}</p>
                </div>
            </div>
            <button class="row-action" onclick="event.stopPropagation()">
                <span class="material-symbols-outlined">more_vert</span>
            </button>
        </div>
    `;
}

// ========================================
// Modal Functions
// ========================================
function openModal(matchId) {
    const conn = allConnections.find(c => c.id === matchId);
    if (!conn) return;
    
    const family = conn.family || {};
    const familyName = escapeHtml(family.name || 'New Family');
    const familyLocation = escapeHtml(family.location || 'Nakuru, Kenya');
    const familyAvatar = family.profile_picture_url || 'https://via.placeholder.com/150';
    
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;
    
    modalContent.innerHTML = `
        <div class="modal-family-card">
            <img class="modal-family-avatar" src="${familyAvatar}" alt="${familyName}">
            <div>
                <h4 class="modal-family-name">${familyName}</h4>
                <p class="modal-family-location">${familyLocation}</p>
            </div>
        </div>
        <div class="modal-status-row">
            <span class="modal-status-label">Status</span>
            <span class="modal-status-badge">Pending Payment</span>
        </div>
        <p class="modal-message">
            "This family has shortlisted you. Once they complete the booking process, we will generate your contract automatically."
        </p>
    `;
    
    const modal = document.getElementById('family-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('family-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
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
    // Check for token
    if (!localStorage.getItem('access_token')) {
        window.location.href = "/frontend/src/views/login.html";
        return;
    }
    
    fetchConnections();
    rotatePhrases();
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