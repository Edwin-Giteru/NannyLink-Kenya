// ========================================
// API Configuration
// ========================================
const API_BASE_URL = "http://localhost:8000";
const LOGIN_PAGE_URL = "../views/login.html";
const CONNECTION_FEE = 1;
const GLOBAL_MAX_LIMIT = 3;
const PAYMENT_TIMEOUT_MS = 60000;

// ========================================
// Global State
// ========================================
let allNanniesRaw = [];
let allFilteredNannies = [];
let selectedCity = "All Cities";
let selectedNannyIds = new Set();
let activeConnectionCount = 0;
let currentPage = 1;
const itemsPerPage = 6;
let searchTimeout;

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

async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = LOGIN_PAGE_URL;
        return;
    }
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = LOGIN_PAGE_URL;
            return;
        }
        return response;
    } catch (error) {
        console.error("Network Error:", error);
        throw error;
    }
}

function logout() {
    localStorage.removeItem('access_token');
    window.location.href = LOGIN_PAGE_URL;
}

// ========================================
// Toast Notification
// ========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? '' : 'error'}`;
    toast.innerHTML = `
        <span class="toast-icon material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
        <div class="toast-content">
            <p class="toast-label">${type === 'success' ? 'Success' : 'Error'}</p>
            <p class="toast-message">${message}</p>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ========================================
// Data Fetching
// ========================================
async function fetchDashboardData() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/connections/discovery`);
        if (!response) return;

        const result = await response.json();

        allNanniesRaw = result.nannies || [];
        activeConnectionCount = result.active_connection_count || 0;

        console.log(`Active connection count: ${activeConnectionCount}`);

        populateLocationDropdown();
        applyFilters();
    } catch (error) {
        console.error("Fetch error:", error);
        const grid = document.getElementById('caregiverGrid');
        if (grid) {
            grid.innerHTML = `<div class="error-state">Unable to load data. Please refresh the page.</div>`;
        }
    }
}

// ========================================
// Location Dropdown
// ========================================
function populateLocationDropdown() {
    const dropdown = document.getElementById('locationDropdown');
    if (!dropdown) return;

    const locations = new Set();
    allNanniesRaw.forEach(n => {
        if (n.preferred_location) locations.add(n.preferred_location.trim());
    });

    let html = `<button onclick="selectLocation('All Cities')">All Cities</button>`;

    Array.from(locations).sort().forEach(loc => {
        html += `<button onclick="selectLocation('${loc}')">${loc}</button>`;
    });

    dropdown.innerHTML = html;
}

function selectLocation(loc) {
    selectedCity = loc === "All Cities" ? "All Cities" : loc;
    document.getElementById('currentLocationText').textContent = loc;
    closeAllDropdowns();
    applyFilters();
}

// ========================================
// Filtering Logic
// ========================================
function debouncedSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFilters();
    }, 300);
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    allFilteredNannies = allNanniesRaw.filter(nanny => {
        const name = (nanny.name || "").toLowerCase();
        const skills = (nanny.skills || "").toLowerCase();
        const location = (nanny.preferred_location || "").toLowerCase();

        const matchesSearch = name.includes(searchTerm) || skills.includes(searchTerm);
        const matchesCity = selectedCity === "All Cities" || location === selectedCity.toLowerCase();

        return matchesSearch && matchesCity;
    });

    currentPage = 1;
    renderGrid();
    updatePaginationControls();
}

// ========================================
// Grid Rendering
// ========================================
function renderGrid() {
    const grid = document.getElementById('caregiverGrid');
    const paginationContainer = document.getElementById('paginationContainer');

    if (!grid) return;

    if (allFilteredNannies.length === 0) {
        grid.innerHTML = `<div class="empty-state">No nannies found matching your criteria.</div>`;
        if (paginationContainer) paginationContainer.classList.add('hidden');
        return;
    }

    if (paginationContainer) paginationContainer.classList.remove('hidden');

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = allFilteredNannies.slice(start, start + itemsPerPage);

    grid.innerHTML = pageItems.map(nanny => {
        const isSelected = selectedNannyIds.has(nanny.id);
        return `
            <div class="nanny-card ${isSelected ? 'selected' : ''}">
                <div class="nanny-image" onclick='openNannyModal(${JSON.stringify(nanny).replace(/'/g, "&apos;")})'>
                    <img src="${nanny.profile_photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(nanny.name)}" alt="${nanny.name}">
                    <div class="image-overlay"></div>
                </div>
                <div class="nanny-info">
                    <h3 class="nanny-name-card">${escapeHtml(nanny.name || 'Anonymous')}</h3>
                    <p class="nanny-location-card">${escapeHtml(nanny.preferred_location || 'N/A')}</p>
                    <button onclick="toggleNannySelection('${nanny.id}')" class="connect-btn ${isSelected ? 'selected' : ''}">
                        ${isSelected ? 'Selected' : 'Connect'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
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
// Selection Logic
// ========================================
function toggleNannySelection(id) {
    if (selectedNannyIds.has(id)) {
        selectedNannyIds.delete(id);
    } else {
        const currentSelectionCount = selectedNannyIds.size;
        if ((activeConnectionCount + currentSelectionCount) >= GLOBAL_MAX_LIMIT) {
            const remaining = GLOBAL_MAX_LIMIT - activeConnectionCount;
            showToast(`You have reached the connection limit. You already have ${activeConnectionCount} active connections and can only select ${remaining} more.`, "error");
            return;
        }
        selectedNannyIds.add(id);
    }
    updateCheckoutBar();
    renderGrid();
}

function updateCheckoutBar() {
    const bar = document.getElementById('checkoutBar');
    if (!bar) return;

    const hasSelections = selectedNannyIds.size > 0;
    bar.classList.toggle('hidden', !hasSelections);

    const selectionText = document.getElementById('selectionCountText');
    if (selectionText) {
        selectionText.textContent = `${selectedNannyIds.size} Nannies selected • KES ${selectedNannyIds.size * CONNECTION_FEE}`;
    }
}

// ========================================
// Payment Logic
// ========================================
// ========================================
// Payment Logic - Updated with loading animation
// ========================================
async function initiateBatchPayment() {
    const phoneInput = document.getElementById('mpesaPhone');
    let phone = phoneInput.value.trim();
    
    // Auto-add 254 prefix if user entered without it
    if (phone.startsWith('0')) {
        phone = '254' + phone.substring(1);
    } else if (!phone.startsWith('254') && phone.length === 9) {
        phone = '254' + phone;
    }
    
    if (!/^254\d{9}$/.test(phone)) {
        showToast("Use format 712345678 or 254712345678", "error");
        return;
    }

    const btn = document.getElementById('payNowBtn');
    const btnText = document.getElementById('payBtnText');
    const controller = new AbortController();

    btn.disabled = true;
    btn.classList.add('loading');
    btnText.textContent = "Verifying...";

    try {
        const connectionIds = [];
        const selectedIds = Array.from(selectedNannyIds);

        for (const nannyId of selectedIds) {
            const res = await authenticatedFetch(`${API_BASE_URL}/connections/?nanny_id=${nannyId}`, {
                method: 'POST'
            });
            if (res) {
                const data = await res.json();
                if (res.ok) {
                    connectionIds.push(data.id);
                } else {
                    console.error("Match creation failed for ID:", nannyId, data);
                }
            }
        }

        if (connectionIds.length === 0) {
            throw new Error("Could not initialize any connections. Please refresh and try again.");
        }

        btnText.textContent = "Requesting M-Pesa...";

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                controller.abort();
                reject(new Error("GATEWAY_TIMEOUT"));
            }, PAYMENT_TIMEOUT_MS);
        });

        const paymentPromise = authenticatedFetch(`${API_BASE_URL}/payments/initiate-batch`, {
            method: 'POST',
            signal: controller.signal,
            body: JSON.stringify({
                match_ids: connectionIds,
                phone_number: phone
            })
        });

        const payRes = await Promise.race([paymentPromise, timeoutPromise]);

        if (payRes && payRes.ok) {
            showToast("Prompt Sent! Enter M-Pesa PIN on your phone.", "success");
            selectedNannyIds.clear();
            closePaymentModal();
            updateCheckoutBar();
            setTimeout(() => {
                window.location.href = 'connections.html';
            }, 3000);
        } else if (payRes) {
            const errorData = await payRes.json();
            throw new Error(errorData.detail || "Payment gateway is currently unavailable.");
        }
    } catch (err) {
        btn.disabled = false;
        btn.classList.remove('loading');
        btnText.textContent = "Pay with M-Pesa";

        if (err.message === "GATEWAY_TIMEOUT") {
            showToast("Safaricom is taking too long. Please try again.", "error");
        } else {
            showToast(err.message, "error");
            console.error("Payment Step Failure:", err);
        }
    }
}

// ========================================
// Modal Functions
// ========================================
function openNannyModal(nanny) {
    document.getElementById('modalImage').src = nanny.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nanny.name)}`;
    document.getElementById('modalName').textContent = nanny.name;
    document.getElementById('modalLocation').textContent = nanny.preferred_location;
    document.getElementById('modalExp').textContent = `${nanny.years_experience || 0} Yrs Exp`;

    const skills = Array.isArray(nanny.skills) ? nanny.skills : (nanny.skills ? nanny.skills.split(',') : []);
    const skillsHtml = skills.map(s => `<span class="skill-tag">${escapeHtml(s.trim())}</span>`).join('');
    document.getElementById('modalSkills').innerHTML = skillsHtml;

    const btn = document.getElementById('modalSelectBtn');
    const isSelected = selectedNannyIds.has(nanny.id);
    btn.textContent = isSelected ? "Remove Selection" : "Select Nanny";
    btn.className = `btn-primary`;
    btn.onclick = () => {
        toggleNannySelection(nanny.id);
        closeNannyModal();
    };

    document.getElementById('nannyModal').classList.remove('hidden');
}

function closeNannyModal() {
    document.getElementById('nannyModal').classList.add('hidden');
}

function openPaymentModal() {
    const amount = selectedNannyIds.size * CONNECTION_FEE;
    const amountElement = document.getElementById('paymentAmountText');
    if (amountElement) {
        amountElement.textContent = `KES ${amount}`;
    }
    
    // Reset the phone input and button state
    const phoneInput = document.getElementById('mpesaPhone');
    if (phoneInput) {
        phoneInput.value = '';
    }
    
    const payBtn = document.getElementById('payNowBtn');
    if (payBtn) {
        payBtn.disabled = false;
        payBtn.classList.remove('loading');
        const btnText = document.getElementById('payBtnText');
        if (btnText) btnText.textContent = "Pay with M-Pesa";
    }
    
    document.getElementById('paymentModal').classList.remove('hidden');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
}

// ========================================
// UI Helpers
// ========================================
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    const isActive = dropdown.classList.contains('active');
    closeAllDropdowns();
    if (!isActive) dropdown.classList.add('active');
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('active'));
}

function changePage(direction) {
    currentPage += direction;
    renderGrid();
    updatePaginationControls();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePaginationControls() {
    const totalPages = Math.ceil(allFilteredNannies.length / itemsPerPage);
    const container = document.getElementById('paginationContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageIndicator = document.getElementById('pageIndicator');

    if (!container) return;

    if (totalPages <= 1) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('access_token')) {
        window.location.href = LOGIN_PAGE_URL;
        return;
    }
    fetchDashboardData();
});

// Make functions globally available for inline handlers
window.logout = logout;
window.debouncedSearch = debouncedSearch;
window.toggleDropdown = toggleDropdown;
window.selectLocation = selectLocation;
window.toggleNannySelection = toggleNannySelection;
window.openNannyModal = openNannyModal;
window.closeNannyModal = closeNannyModal;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.initiateBatchPayment = initiateBatchPayment;
window.changePage = changePage;