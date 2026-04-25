// ========================================
// API Configuration
// ========================================
const API_BASE = "http://localhost:8000/admin";
let currentPage = 1;
let selectedStatus = "";
let matchIdToProcess = null;

// ========================================
// Authentication Helpers
// ========================================
function checkAuth(status) {
    if (status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = "../views/login.html";
        return true;
    }
    return false;
}

function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// ========================================
// UI Helpers
// ========================================
function getStatusBadgeClass(status) {
    switch(status) {
        case 'completed': return 'status-completed';
        case 'cancelled': return 'status-cancelled';
        case 'awaiting_payment': return 'status-awaiting_payment';
        default: return 'status-awaiting_payment';
    }
}

function formatStatus(status) {
    return (status || 'unknown').replace('_', ' ');
}

function formatId(id) {
    return id ? id.substring(0, 8).toUpperCase() + '...' : 'N/A';
}

// ========================================
// Table Rendering
// ========================================
function renderMatches(matches) {
    const tbody = document.getElementById('matchTableBody');
    tbody.innerHTML = '';

    if (!matches || matches.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="4" class="text-center" style="padding: 80px 32px;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8;">
                    <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px;">search_off</span>
                    <p style="font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">No matches found</p>
                    <p style="font-size: 10px; margin-top: 4px;">Try adjusting your filters or search criteria.</p>
                </div>
            </td>
        `;
        tbody.appendChild(emptyRow);
        return;
    }

    matches.forEach(m => {
        const badgeClass = getStatusBadgeClass(m.status);
        const statusDisplay = formatStatus(m.status);
        const matchId = formatId(m.id);
        const nannyName = m.nanny?.name || 'Unknown Nanny';
        const familyName = m.family?.name || 'Unknown Family';
        const familyLocation = m.family?.location || 'Location N/A';
        const familyAvatar = m.family?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(familyName)}`;
        
        const row = document.createElement('tr');
        row.className = "match-row";
        row.innerHTML = `
            <td>
                <p class="match-id">${matchId}</p>
                <p class="match-nanny">${escapeHtml(nannyName)}</p>
            </td>
            <td>
                <div class="family-info">
                    <div class="family-avatar">
                        <img src="${familyAvatar}" alt="${escapeHtml(familyName)}">
                    </div>
                    <div>
                        <p class="family-name">${escapeHtml(familyName)}</p>
                        <p class="family-location">${escapeHtml(familyLocation)}</p>
                    </div>
                </div>
            </td>
            <td>
                <span class="status-badge ${badgeClass}">${escapeHtml(statusDisplay)}</span>
            </td>
            <td class="text-right">
                ${m.status === 'awaiting_payment' ? 
                    `<button onclick="forceComplete('${m.id}')" class="action-btn">Force Complete</button>` : 
                    `<button class="action-icon"><span class="material-symbols-outlined">more_vert</span></button>`
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateUI(data) {
    const total = data.total_count ?? 0;
    const active = data.active_count ?? 0;
    
    document.getElementById('totalMatchCount').innerText = active;
    const start = ((currentPage - 1) * 10) + 1;
    const end = Math.min(currentPage * 10, total);
    
    document.getElementById('paginationLabel').innerText = 
        `Showing ${total > 0 ? start : 0}-${end} of ${total} matches`;
    
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = end >= total;
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
// API Calls
// ========================================
async function loadMatches() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            status: selectedStatus
        });

        const response = await fetch(`${API_BASE}/matches?${params}`, {
            headers: getAuthHeaders()
        });
        
        if (checkAuth(response.status)) return;

        const result = await response.json();
        const matches = result.data?.matches ?? result.matches ?? [];
        const metaData = result.data ?? result;

        renderMatches(matches);
        updateUI(metaData);
    } catch (error) {
        console.error("Error loading matches:", error);
        renderMatches([]);
    }
}

async function forceComplete(matchId) {
    matchIdToProcess = matchId;
    const modal = document.getElementById('confirmModal');
    const confirmBtn = document.getElementById('confirmModalBtn');
    
    confirmBtn.disabled = false;
    confirmBtn.innerText = "Confirm";
    confirmBtn.classList.remove('disabled');
    
    modal.classList.remove('hidden');
}

async function confirmForceComplete() {
    if (!matchIdToProcess) return;

    const confirmBtn = document.getElementById('confirmModalBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerText = "Processing...";
    confirmBtn.classList.add('disabled');

    try {
        const response = await fetch(`${API_BASE}/matches/${matchIdToProcess}/force-complete`, { 
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (checkAuth(response.status)) return;

        if (response.ok) {
            closeConfirmModal();
            loadMatches();
        } else {
            const error = await response.json();
            alert(error.detail || "Action failed");
            confirmBtn.disabled = false;
            confirmBtn.innerText = "Confirm";
            confirmBtn.classList.remove('disabled');
        }
    } catch (err) {
        console.error("Override failed:", err);
        alert("A network error occurred.");
        confirmBtn.disabled = false;
        confirmBtn.innerText = "Confirm";
        confirmBtn.classList.remove('disabled');
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
    matchIdToProcess = null;
}

async function openManualMatchModal() {
    const modal = document.getElementById('manualMatchModal');
    const familySelect = document.getElementById('manualFamilySelect');
    const nannySelect = document.getElementById('manualNannySelect');

    modal.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/match-candidates`, {
            headers: getAuthHeaders()
        });
        
        if (checkAuth(response.status)) return;

        const result = await response.json();
        const families = result.data?.families ?? result.families ?? [];
        const nannies = result.data?.nannies ?? result.nannies ?? [];

        familySelect.innerHTML = families.length 
            ? families.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')
            : '<option value="">No eligible families found</option>';

        nannySelect.innerHTML = nannies.length 
            ? nannies.map(n => `<option value="${n.id}">${escapeHtml(n.name)}</option>`).join('')
            : '<option value="">No eligible nannies found</option>';

    } catch (err) {
        console.error("Failed to load candidates:", err);
    }
}

function closeManualModal() {
    document.getElementById('manualMatchModal').classList.add('hidden');
}

async function submitManualMatch() {
    const family_id = document.getElementById('manualFamilySelect').value;
    const nanny_id = document.getElementById('manualNannySelect').value;
    const btn = document.getElementById('submitManualMatch');

    if (!family_id || !nanny_id) {
        alert("Please select both participants.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Creating...";

    try {
        const response = await fetch(`${API_BASE}/matches/manual`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ family_id, nanny_id })
        });

        if (checkAuth(response.status)) return;

        if (response.ok) {
            closeManualModal();
            loadMatches();
        } else {
            const err = await response.json();
            alert(err.detail || "Could not create match.");
        }
    } catch (err) {
        console.error("Submission error:", err);
        alert("A network error occurred.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Create Match";
    }
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        if (sidebar.style.display === 'flex') {
            sidebar.style.display = 'none';
        } else {
            sidebar.style.display = 'flex';
            sidebar.style.position = 'fixed';
            sidebar.style.top = '0';
            sidebar.style.left = '0';
            sidebar.style.zIndex = '100';
        }
    }
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Status filter buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.status-btn').forEach(b => 
                b.classList.remove('active')
            );
            btn.classList.add('active');
            selectedStatus = btn.getAttribute('data-status');
            currentPage = 1;
            loadMatches();
        });
    });

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => { 
        if(currentPage > 1) { 
            currentPage--; 
            loadMatches(); 
        } 
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => { 
        currentPage++; 
        loadMatches(); 
    });

    // Manual match button
    document.getElementById('manualMatchBtn').addEventListener('click', openManualMatchModal);
    
    // Modal buttons
    document.getElementById('cancelModalBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmModalBtn').addEventListener('click', confirmForceComplete);
    document.getElementById('closeManualModalBtn').addEventListener('click', closeManualModal);
    document.getElementById('submitManualMatch').addEventListener('click', submitManualMatch);
    
    // Close modals when clicking overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            closeConfirmModal();
            closeManualModal();
        });
    });

    // Initial load
    loadMatches();
});

// Make functions globally available for inline handlers
window.forceComplete = forceComplete;
window.toggleMobileMenu = toggleMobileMenu;