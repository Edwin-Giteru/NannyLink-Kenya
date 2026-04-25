// ========================================
// API Configuration
// ========================================
const API_BASE = "http://localhost:8000/families/connections";
const PROFILE_API = "http://localhost:8000/families/profile/me";
const PAYMENT_API = "http://localhost:8000/payments/initiate-batch";

let allConnections = [];
let currentFilter = 'all';

// ========================================
// Authentication Helpers
// ========================================
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function checkAuth(response) {
    if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = "../views/login.html";
        return true;
    }
    return false;
}

// ========================================
// Data Fetching
// ========================================
async function fetchProfile() {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
        const response = await fetch(PROFILE_API, { headers: getAuthHeaders() });
        if (response.ok) {
            const data = await response.json();
            if (data.name) {
                const nameSpan = document.getElementById('headerFamilyName');
                nameSpan.innerText = data.name;
                nameSpan.classList.remove('hidden');
                
                const avatarImg = document.getElementById('userAvatar');
                avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0F2A4A&color=fff`;
            }
        }
    } catch (error) {
        console.error("Profile fetch error:", error);
    }
}

async function fetchConnections() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = "../views/login.html";
        return;
    }
    
    try {
        const response = await fetch(API_BASE, { headers: getAuthHeaders() });
        if (checkAuth(response)) return;
        
        const data = await response.json();
        allConnections = Array.isArray(data) ? data : (data.data || []);
        renderAll();
    } catch (error) {
        console.error("Fetch error:", error);
        const grid = document.getElementById('connectionsGrid');
        if (grid) {
            grid.innerHTML = '<p class="loading-state">Failed to load connections.</p>';
        }
    }
}

// ========================================
// Helper Functions
// ========================================
function resolveNannyName(connection) {
    return connection.nanny?.user?.full_name || 
           connection.nanny?.full_name || 
           connection.full_name || 
           connection.nanny?.name || 
           "Professional Nanny";
}

function getStatusConfig(status) {
    const s = (status || '').toLowerCase();
    if (['accepted', 'completed', 'successful', 'active'].includes(s)) 
        return 'completed';
    if (['pending', 'awaiting_payment', 'processing', 'requested'].includes(s)) 
        return 'pending';
    if (['failed', 'rejected', 'cancelled', 'expired'].includes(s)) 
        return 'failed';
    return 'pending';
}

function getStatusLabel(status) {
    const s = (status || '').toLowerCase();
    if (['accepted', 'completed', 'successful', 'active'].includes(s)) return 'Active';
    if (['pending', 'awaiting_payment', 'processing', 'requested'].includes(s)) return 'Awaiting Payment';
    if (['failed', 'rejected', 'cancelled', 'expired'].includes(s)) return 'Failed';
    return status || 'Active';
}

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
// Rendering
// ========================================
function renderAll() {
    const grid = document.getElementById('connectionsGrid');
    let displayList = allConnections;
    
    if (currentFilter === 'pending') {
        displayList = allConnections.filter(c => 
            ['pending', 'awaiting_payment', 'requested'].includes(c.status?.toLowerCase())
        );
    }

    const allCount = allConnections.length;
    const pendingCount = allConnections.filter(c => 
        ['pending', 'awaiting_payment', 'requested'].includes(c.status?.toLowerCase())
    ).length;
    
    document.getElementById('count-all').innerText = allCount;
    document.getElementById('count-pending').innerText = pendingCount;

    if (displayList.length === 0) {
        grid.innerHTML = '<p class="loading-state">No connections found.</p>';
        return;
    }

    grid.innerHTML = displayList.map((connection, index) => {
        const nannyName = resolveNannyName(connection);
        const nannyBio = connection.nanny?.bio || "Expert childcare provider verified by NannyLink.";
        const statusClass = getStatusConfig(connection.status);
        const statusLabel = getStatusLabel(connection.status);
        const isUnpaid = connection.status === 'awaiting_payment' || connection.status === 'accepted';
        
        return `
            <div class="connection-card">
                <div class="card-header">
                    <div class="card-avatar">
                        <div class="avatar-initial">${escapeHtml(nannyName.charAt(0))}</div>
                        <div class="avatar-info">
                            <h3>${escapeHtml(nannyName)}</h3>
                            <p>ID: #${connection.id.toString().substring(0, 8)}</p>
                        </div>
                    </div>
                    <span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
                </div>
                
                <div class="card-bio">
                    <p>"${escapeHtml(nannyBio)}"</p>
                </div>

                <div class="card-actions">
                    <button onclick="viewProfile(${index})" class="btn-outline">View Details</button>
                    ${isUnpaid ? `
                        <button onclick="openPaymentModal('${connection.id}')" class="btn-primary-sm">
                            <span class="material-symbols-outlined" style="font-size: 14px;">payments</span> Pay
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// Filter Functions
// ========================================
function filterContent(type) {
    currentFilter = type;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`filter-${type}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    renderAll();
}

// ========================================
// Modal Functions
// ========================================
function openPaymentModal(connectionId) {
    document.getElementById('pendingConnectionId').value = connectionId;
    document.getElementById('paymentFormContent').classList.remove('hidden');
    document.getElementById('paymentSuccessContent').classList.add('hidden');
    document.getElementById('paymentModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Reset phone input
    const phoneInput = document.getElementById('mpesaPhone');
    if (phoneInput) phoneInput.value = '';
    
    // Reset button state
    const payBtn = document.getElementById('confirmPayBtn');
    if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = 'Send STK Push';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    if (modalId === 'paymentModal') {
        fetchConnections();
    }
}

function viewProfile(index) {
    const connection = allConnections[index];
    const nanny = connection.nanny || {};
    const name = resolveNannyName(connection);
    
    const modalAvatar = document.getElementById('modalAvatar');
    const modalName = document.getElementById('modalName');
    const modalLocation = document.getElementById('modalLocation');
    const modalBio = document.getElementById('modalBio');
    const modalExp = document.getElementById('modalExp');
    
    if (modalAvatar) modalAvatar.innerText = name.charAt(0);
    if (modalName) modalName.innerText = name;
    if (modalLocation) modalLocation.innerText = nanny.address || nanny.location || "Nairobi, Kenya";
    if (modalBio) modalBio.innerText = nanny.bio || "This professional nanny is vetted and ready to provide high-quality childcare services.";
    if (modalExp) modalExp.innerText = nanny.years_experience ? `${nanny.years_experience} Years` : "3+ Years";
    
    document.getElementById('profileModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// ========================================
// Payment Submission
// ========================================
async function submitStkPush() {
    const connectionId = document.getElementById('pendingConnectionId').value;
    const phoneInput = document.getElementById('mpesaPhone');
    let phone = phoneInput ? phoneInput.value.trim() : '';
    
    // Format phone number
    if (phone.startsWith('0')) {
        phone = '254' + phone.substring(1);
    } else if (!phone.startsWith('254') && phone.length === 9) {
        phone = '254' + phone;
    }
    
    if (!phone || !/^254\d{9}$/.test(phone)) {
        alert("Please enter a valid phone number (e.g., 254712345678)");
        return;
    }

    const btn = document.getElementById('confirmPayBtn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `<span class="loader"></span> Sending...`;

    try {
        const response = await fetch(PAYMENT_API, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                match_ids: [connectionId],
                phone_number: phone
            })
        });

        if (response.ok) {
            document.getElementById('paymentFormContent').classList.add('hidden');
            document.getElementById('paymentSuccessContent').classList.remove('hidden');
        } else {
            const error = await response.json();
            alert("Error: " + (error.detail || "Request failed."));
        }
    } catch (err) {
        console.error("Payment error:", err);
        alert("Network error. Please try again.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ========================================
// Event Listeners & Initialization
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('access_token')) {
        window.location.href = "../views/login.html";
        return;
    }
    await fetchProfile();
    await fetchConnections();
});

// Make functions globally available for inline handlers
window.filterContent = filterContent;
window.closeModal = closeModal;
window.viewProfile = viewProfile;
window.openPaymentModal = openPaymentModal;
window.submitStkPush = submitStkPush;