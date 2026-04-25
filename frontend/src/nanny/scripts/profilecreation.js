// ========================================
// API Configuration
// ========================================
const API_BASE = "http://127.0.0.1:8000/nannies";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dql4taq0c/image/upload";
const UPLOAD_PRESET = "Nanny_ids";
const token = localStorage.getItem("access_token");

// Redirect if no token
if (!token) {
    window.location.href = "/frontend/src/views/login.html";
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
// Progress Calculation
// ========================================
function updateProgress() {
    const fields = [
        document.getElementById('name')?.value,
        document.getElementById('years_experience')?.value,
        document.getElementById('address')?.value,
        document.getElementById('skills')?.value,
        document.getElementById('national_id_number')?.value,
        document.getElementById('profile_photo_url')?.value,
        document.getElementById('national_id_photo_url')?.value
    ];
    
    const filled = fields.filter(f => f && f.toString().length > 0).length;
    const percentage = Math.round((filled / fields.length) * 100);
    
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const strengthTip = document.getElementById('strengthTip');
    
    if (strengthBar) strengthBar.style.width = percentage + '%';
    if (strengthText) strengthText.innerText = percentage + '%';
    
    if (percentage === 100) {
        if (strengthTip) strengthTip.innerText = "Perfect! You're ready to submit!";
    } else if (percentage >= 50) {
        if (strengthTip) strengthTip.innerText = "Almost there! Complete your details.";
    } else {
        if (strengthTip) strengthTip.innerText = "Fill in your details to get started!";
    }
}

// ========================================
// Loading State
// ========================================
function toggleLoading(show, text = "Saving...") {
    const btn = document.getElementById('submitBtn');
    if (!btn) return;
    
    btn.disabled = show;
    if (show) {
        btn.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">progress_activity</span> ${text}`;
    } else {
        btn.innerHTML = `<span class="material-symbols-outlined">rocket_launch</span> Create My Profile`;
    }
}

// Add spin animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ========================================
// Cloudinary Upload
// ========================================
async function uploadToCloudinary(file, typeName) {
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
    try {
        const compressedFile = await imageCompression(file, options);
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', UPLOAD_PRESET);
        
        const resp = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await resp.json();
        return data.secure_url;
    } catch (error) {
        console.error("Upload error:", error);
        showToast(`Upload failed for ${typeName}`, "error");
        throw error;
    }
}

// ========================================
// Event Listeners for Inputs
// ========================================
['name', 'years_experience', 'address', 'skills', 'national_id_number'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', updateProgress);
    }
});

// ========================================
// Profile Photo Upload
// ========================================
const profilePhotoInput = document.getElementById('profile_photo_input');
if (profilePhotoInput) {
    profilePhotoInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const preview = document.getElementById('profile_preview');
        if (preview) preview.src = URL.createObjectURL(file);
        
        toggleLoading(true, "Uploading photo...");
        try {
            const url = await uploadToCloudinary(file, "Portrait");
            const urlField = document.getElementById('profile_photo_url');
            if (urlField) urlField.value = url;
            updateProgress();
            showToast("Profile photo uploaded successfully!", "success");
        } catch (error) {
            showToast("Failed to upload photo", "error");
        } finally {
            toggleLoading(false);
        }
    };
}

// ========================================
// ID Photo Upload
// ========================================
const idPhotoInput = document.getElementById('id_photo_input');
if (idPhotoInput) {
    idPhotoInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        toggleLoading(true, "Uploading ID...");
        try {
            const url = await uploadToCloudinary(file, "ID Photo");
            const urlField = document.getElementById('national_id_photo_url');
            if (urlField) urlField.value = url;
            
            const statusText = document.getElementById('id_status_text');
            if (statusText) statusText.innerHTML = "ID Uploaded <span style='color: #10b981;'>✓</span>";
            updateProgress();
            showToast("ID photo uploaded successfully!", "success");
        } catch (error) {
            showToast("Failed to upload ID photo", "error");
        } finally {
            toggleLoading(false);
        }
    };
}

// ========================================
// Form Submission
// ========================================
const nannyForm = document.getElementById('nannyForm');
if (nannyForm) {
    nannyForm.onsubmit = async (e) => {
        e.preventDefault();
        toggleLoading(true, "Creating Profile...");

        const payload = {
            name: document.getElementById('name')?.value,
            years_experience: parseInt(document.getElementById('years_experience')?.value) || 0,
            address: document.getElementById('address')?.value,
            preferred_location: document.getElementById('preferred_location')?.value || null,
            skills: document.getElementById('skills')?.value,
            availability: document.getElementById('availability')?.value,
            national_id_number: document.getElementById('national_id_number')?.value,
            profile_photo_url: document.getElementById('profile_photo_url')?.value || null,
            national_id_photo_url: document.getElementById('national_id_photo_url')?.value
        };

        try {
            const response = await fetch(`${API_BASE}/profile`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showToast("Profile created successfully! Redirecting...", "success");
                setTimeout(() => {
                    window.location.href = "nannydashboard.html";
                }, 1500);
            } else {
                if (data.detail && data.detail.includes("UniqueViolationError")) {
                    showToast("Error: This National ID number is already registered to another profile.", "error");
                } else if (data.detail) {
                    showToast("Error: " + data.detail, "error");
                } else {
                    showToast("Submission failed. Please check your information and try again.", "error");
                }
            }
        } catch (err) {
            console.error(err);
            showToast("Server connection error. Please try again later.", "error");
        } finally { 
            toggleLoading(false); 
        }
    };
}

// Initialize progress on page load
updateProgress();