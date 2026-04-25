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
        'Content-Type': 'application/json'
    };
}

// ========================================
// Load Profile Data
// ========================================
async function loadCurrentData() {
    try {
        const response = await fetch(`${API_BASE}/families/profile/me`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '../views/login.html';
            return;
        }
        
        if (!response.ok) throw new Error("Failed to load profile");
        
        const data = await response.json();
        
        // Populate form fields
        const nameInput = document.getElementById('name');
        const locationInput = document.getElementById('household_location');
        const detailsTextarea = document.getElementById('household_details');
        
        if (nameInput) nameInput.value = data.name || '';
        if (locationInput) locationInput.value = data.household_location || '';
        if (detailsTextarea) detailsTextarea.value = data.household_details || '';
        
        // Update initials avatar
        if (data.name) {
            const names = data.name.split(' ');
            const initials = names.map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const initialsElement = document.getElementById('initials_placeholder');
            if (initialsElement) initialsElement.innerText = initials;
        }
        
        // If there's a profile photo URL, show image
        if (data.profile_photo_url) {
            const previewImg = document.getElementById('profile_preview');
            const initialsPlaceholder = document.getElementById('initials_placeholder');
            if (previewImg && initialsPlaceholder) {
                previewImg.src = data.profile_photo_url;
                previewImg.classList.remove('hidden');
                initialsPlaceholder.classList.add('hidden');
            }
        }
        
    } catch (err) {
        console.error("Load error:", err);
        showError("Failed to load profile data. Please refresh the page.");
    }
}

// ========================================
// Update Profile
// ========================================
async function updateProfile(event) {
    event.preventDefault();
    
    const btn = document.getElementById('save_btn');
    const btnText = document.getElementById('btn_text');
    const spinner = document.getElementById('spinner');
    
    // Disable button and show loading state
    btn.disabled = true;
    if (btnText) btnText.innerText = "Updating...";
    if (spinner) spinner.classList.remove('hidden');
    
    // Get form values
    const nameInput = document.getElementById('name');
    const locationInput = document.getElementById('household_location');
    const detailsTextarea = document.getElementById('household_details');
    
    const payload = {
        name: nameInput ? nameInput.value : '',
        household_location: locationInput ? locationInput.value : '',
        household_details: detailsTextarea ? detailsTextarea.value : ''
    };
    
    try {
        const response = await fetch(`${API_BASE}/families/profile/me`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '../views/login.html';
            return;
        }
        
        if (response.ok) {
            // Success - redirect to dashboard
            window.location.href = 'familydashboard.html';
        } else {
            const error = await response.json();
            showError(`Update failed: ${error.detail || 'Unknown error'}`);
        }
    } catch (err) {
        console.error("Update error:", err);
        showError("Network error. Is the backend running?");
    } finally {
        // Reset button state
        btn.disabled = false;
        if (btnText) btnText.innerText = "Save Profile Changes";
        if (spinner) spinner.classList.add('hidden');
    }
}

// ========================================
// Show Error Message
// ========================================
function showError(message) {
    // Create toast notification
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.innerHTML = `
        <span class="toast-icon material-symbols-outlined">error</span>
        <div class="toast-content">
            <p class="toast-label">Error</p>
            <p class="toast-message">${message}</p>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    
    // Add toast styles if not already present
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            }
            .toast {
                background-color: var(--error, #ef4444);
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
                animation: slideInDown 0.3s ease forwards;
                pointer-events: auto;
            }
            .toast .toast-icon {
                font-size: 20px;
            }
            .toast .toast-content {
                flex: 1;
            }
            .toast .toast-label {
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                opacity: 0.8;
                margin-bottom: 2px;
            }
            .toast .toast-message {
                font-weight: 600;
                font-size: 0.875rem;
            }
            .toast.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }
            @keyframes slideInDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes fadeOut {
                to {
                    opacity: 0;
                    transform: translateY(-10px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    return container;
}

// ========================================
// Success Toast (for future use)
// ========================================
function showSuccess(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.style.backgroundColor = '#10b981';
    toast.innerHTML = `
        <span class="toast-icon material-symbols-outlined">check_circle</span>
        <div class="toast-content">
            <p class="toast-label">Success</p>
            <p class="toast-message">${message}</p>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Verify token again on page load
    if (!localStorage.getItem('access_token')) {
        window.location.href = '../views/login.html';
        return;
    }
    
    // Load profile data
    loadCurrentData();
    
    // Attach form submit handler
    const form = document.getElementById('edit_family_form');
    if (form) {
        form.addEventListener('submit', updateProfile);
    }
});

// Make functions available globally if needed
window.updateProfile = updateProfile;