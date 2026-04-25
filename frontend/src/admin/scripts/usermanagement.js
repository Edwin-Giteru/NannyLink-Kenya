// ========================================
// Global Variables
// ========================================
let currentStatus = 'VETTED';
const limit = 10;
let searchTimeout = null;
let userToVerify = null;
let userToDelete = null;

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
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token');
        window.location.href = '../views/login.html';
        return true;
    }
    return false;
}

// ========================================
// API Calls
// ========================================
async function fetchUsers(page = 1) {
    const search = document.getElementById('identity-search').value;
    const role = document.getElementById('role-filter').value;
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        window.location.href = '../views/login.html';
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/admin/users?page=${page}&search=${search}&role=${role}&status=${currentStatus}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (checkAuth(response)) return;

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        renderUsers(data.users);
        updatePagination(data.total_count, page);

    } catch (error) {
        console.error("Failed to fetch users:", error);
    }
}

// ========================================
// Rendering Functions - TABLE VERSION
// ========================================
function renderUsers(users) {
    const container = document.getElementById('user-container');
    
    if (!users || users.length === 0) {
        container.innerHTML = `<div class="empty-state">No users found.</div>`;
        return;
    }

    let html = `
        <div class="table-container">
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User Identity</th>
                            <th>Contact</th>
                            <th>Role Type</th>
                            <th>Status</th>
                            <th class="text-right">Management</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    users.forEach(user => {
        const isApproved = currentStatus === 'VETTED';
        const statusTextClass = isApproved ? 'vetted' : 'pending';
        const statusIcon = isApproved ? 'verified' : 'pending';
        const statusDisplay = currentStatus;
        const statusBadgeClass = isApproved ? 'status-vetted' : 'status-pending';
        
        html += `
            <tr class="user-table-row">
                <td class="user-identity-cell">
                    <div class="user-identity-table">
                        <div class="user-avatar-table">
                            <img src="${user.profile_photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name)}" alt="${escapeHtml(user.name)}">
                            <div class="status-dot ${statusTextClass}"></div>
                        </div>
                        <div class="user-info-table">
                            <h4>${escapeHtml(user.name)}</h4>
                            <p class="user-date-table">Joined ${new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </td>
                <td class="user-contact-cell">
                    <span class="contact-info">${escapeHtml(user.phone || 'N/A')}</span>
                </td>
                <td class="user-role-cell">
                    <span class="role-badge-table">${escapeHtml(user.role)}</span>
                </td>
                <td class="user-status-cell">
                    <span class="status-badge-table ${statusBadgeClass}">
                        <span class="material-symbols-outlined">${statusIcon}</span>
                        ${escapeHtml(statusDisplay)}
                    </span>
                </td>
                <td class="user-actions-cell">
                    <div class="action-buttons">
                        ${!isApproved ? `<button onclick="verifyUser('${user.id}')" class="btn-verify-table">Verify</button>` : ''}
                        <button onclick="openDeleteModal('${user.id}')" class="btn-delete-table">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function updatePagination(total, currentPage) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    document.getElementById('total-records').innerText = total;
    
    const start = total === 0 ? 0 : ((currentPage - 1) * limit) + 1;
    const end = Math.min(currentPage * limit, total);
    document.getElementById('record-range').innerText = total === 0 ? '0-0' : `${start}-${end}`;

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button onclick="fetchUsers(${i})" class="page-number ${i === currentPage ? 'active' : ''}">
                ${i}
            </button>
        `;
    }
    document.getElementById('pagination-controls').innerHTML = html;
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
// User Verification
// ========================================
function verifyUser(userId) {
    userToVerify = userId;
    const modal = document.getElementById('verify-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeVerifyModal() {
    const modal = document.getElementById('verify-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    userToVerify = null;
}

async function confirmVerification() {
    if (!userToVerify) return;
    const token = localStorage.getItem('access_token');
    const btn = document.getElementById('confirm-verify-btn');
    const originalText = btn.innerText;
    btn.innerText = "Verifying...";
    btn.disabled = true;

    try {
        const response = await fetch(`http://127.0.0.1:8000/admin/users/${userToVerify}/verify`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            closeVerifyModal();
            fetchUsers(1);
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.detail || 'Failed to verify user'}`);
        }
    } catch (error) {
        alert("Network error. Please try again.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ========================================
// User Deletion
// ========================================
function openDeleteModal(userId) {
    userToDelete = userId;
    document.getElementById('delete-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    userToDelete = null;
}

async function confirmDeletion() {
    if (!userToDelete) return;
    const token = localStorage.getItem('access_token');
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.innerText = "Purging...";

    try {
        const response = await fetch(`http://127.0.0.1:8000/admin/${userToDelete}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            closeDeleteModal();
            fetchUsers(1);
        } else {
            const err = await response.json();
            alert(`Error: ${err.detail || 'Delete failed'}`);
        }
    } catch (error) {
        alert("Network error occurred.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Delete Account";
    }
}

// ========================================
// User Creation
// ========================================
function openCreateModal() {
    document.getElementById('create-user-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCreateModal() {
    document.getElementById('create-user-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.getElementById('create-user-form').reset();
}

async function createUser(formData) {
    const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || null,
        password: formData.get('password'),
        role: formData.get('role').toLowerCase()
    };

    const token = localStorage.getItem('access_token');
    const submitBtn = document.querySelector('#create-user-form button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.innerText = "Initializing...";

    try {
        const response = await fetch('http://127.0.0.1:8000/admin/users', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            closeCreateModal();
            fetchUsers(1);
            alert(result.detail || "Account created.");
        } else {
            alert(`Error: ${result.detail || 'Failed'}`);
        }
    } catch (error) {
        alert("Connection failed.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Create Account";
    }
}

// ========================================
// Event Listeners & Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Search input
    const searchInput = document.getElementById('identity-search');
    const roleFilter = document.getElementById('role-filter');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => fetchUsers(1), 300);
        });
    }

    if (roleFilter) {
        roleFilter.addEventListener('change', () => fetchUsers(1));
    }

    // Status filter buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.status-btn').forEach(b => {
                b.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
            currentStatus = e.currentTarget.dataset.status;
            fetchUsers(1);
        });
    });

    // Form submission
    const createForm = document.getElementById('create-user-form');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await createUser(formData);
        });
    }

    // Modal confirm buttons
    const confirmVerifyBtn = document.getElementById('confirm-verify-btn');
    if (confirmVerifyBtn) {
        confirmVerifyBtn.addEventListener('click', confirmVerification);
    }

    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeletion);
    }

    // Initial load
    fetchUsers(1);
});

// ========================================
// Utility Functions (Global)
// ========================================
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

function showNotifications() {
    alert("Notification feature coming soon.");
}

// Make functions globally available
window.fetchUsers = fetchUsers;
window.verifyUser = verifyUser;
window.closeVerifyModal = closeVerifyModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.toggleMobileMenu = toggleMobileMenu;
window.showNotifications = showNotifications;