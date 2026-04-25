// ========================================
// API Configuration
// ========================================
const API_BASE = "http://127.0.0.1:8000/nannies";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dql4taq0c/image/upload";
const UPLOAD_PRESET = "Nanny_ids";
const token = localStorage.getItem("access_token");

let isUploading = false;

// Redirect if no token
if (!token) {
    window.location.href = "../views/login.html";
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
// Load Current Profile
// ========================================
async function loadCurrentProfile() {
    if (!token) { 
        window.location.href = "login.html"; 
        return; 
    }
    
    try {
        const response = await fetch(`${API_BASE}/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = "../views/login.html";
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            
            const displayName = document.getElementById('display_name');
            if (displayName) {
                displayName.innerText = data.name || "Nanny Profile";
                displayName.classList.remove('italic', 'text-slate-400');
                displayName.style.color = 'var(--primary)';
                displayName.style.fontStyle = 'normal';
            }
            
            const nameInput = document.getElementById('name');
            const addressInput = document.getElementById('address');
            const yearsInput = document.getElementById('years_experience');
            const preferredInput = document.getElementById('preferred_location');
            const skillsTextarea = document.getElementById('skills');
            const availabilitySelect = document.getElementById('availability');
            const previewImg = document.getElementById('profile_preview');
            const photoUrlField = document.getElementById('profile_photo_url');
            
            if (nameInput) nameInput.value = data.name || "";
            if (addressInput) addressInput.value = data.address || "";
            if (yearsInput) yearsInput.value = data.years_experience || 0;
            if (preferredInput) preferredInput.value = data.preferred_location || "";
            if (skillsTextarea) skillsTextarea.value = data.skills || "";
            if (availabilitySelect) availabilitySelect.value = data.availability || "full_time";
            
            if (data.profile_photo_url && previewImg) {
                previewImg.src = data.profile_photo_url;
                if (photoUrlField) photoUrlField.value = data.profile_photo_url;
            }
        } else {
            showToast("Failed to load profile data", "error");
        }
    } catch (err) { 
        console.error("Profile Load Error:", err);
        showToast("Network error loading profile", "error");
    }
}

// ========================================
// Upload to Cloudinary
// ========================================
async function uploadToCloudinary(file) {
    isUploading = true;
    const saveBtn = document.getElementById('save_btn');
    const statusText = document.getElementById('upload_status');
    
    if (saveBtn) saveBtn.disabled = true;
    if (statusText) statusText.innerText = "Optimizing...";
    
    try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1000, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        
        if (statusText) statusText.innerText = "Uploading to Cloud...";
        
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', UPLOAD_PRESET);

        const resp = await fetch(CLOUDINARY_URL, { 
            method: 'POST', 
            body: formData 
        });

        if (!resp.ok) {
            const errorData = await resp.json();
            console.error("Cloudinary Error:", errorData);
            throw new Error(errorData.error?.message || "Upload failed");
        }

        const data = await resp.json();
        
        if (statusText) {
            statusText.innerText = "Upload successful!";
            setTimeout(() => {
                if (statusText) statusText.innerText = "Nanny Profile Photo";
            }, 2000);
        }
        
        showToast("Photo uploaded successfully!", "success");
        return data.secure_url;
    } catch (err) {
        console.error("Upload process error:", err);
        if (statusText) statusText.innerText = "Upload failed. Check connection.";
        showToast(err.message || "Photo upload failed", "error");
        throw err;
    } finally {
        isUploading = false;
        if (saveBtn) saveBtn.disabled = false;
    }
}

// ========================================
// Photo Upload Event
// ========================================
const fileInput = document.getElementById('profile_file_input');
const triggerBtn = document.getElementById('trigger_upload');

if (triggerBtn) {
    triggerBtn.addEventListener('click', () => {
        if (fileInput) fileInput.click();
    });
}

if (fileInput) {
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const preview = document.getElementById('profile_preview');
        if (preview) preview.src = URL.createObjectURL(file);
        
        try {
            const url = await uploadToCloudinary(file);
            const photoUrlField = document.getElementById('profile_photo_url');
            if (photoUrlField) photoUrlField.value = url;
        } catch (err) {
            console.error("Upload error:", err);
        }
    };
}

// ========================================
// Form Submission
// ========================================
const editForm = document.getElementById('edit_profile_form');
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (isUploading) {
            showToast("Please wait for the photo to finish uploading.", "error");
            return;
        }
        
        const btn = document.getElementById('save_btn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Saving Profile...";
        }

        const updatedData = {
            name: document.getElementById('name')?.value,
            address: document.getElementById('address')?.value,
            years_experience: parseInt(document.getElementById('years_experience')?.value) || 0,
            preferred_location: document.getElementById('preferred_location')?.value,
            skills: document.getElementById('skills')?.value,
            availability: document.getElementById('availability')?.value,
            profile_photo_url: document.getElementById('profile_photo_url')?.value
        };

        try {
            const response = await fetch(`${API_BASE}/profile`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(updatedData)
            });
            
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                window.location.href = "../views/login.html";
                return;
            }
            
            if (response.ok) {
                showToast("Profile updated successfully!", "success");
                setTimeout(() => {
                    window.location.href = "nannydashboard.html";
                }, 1500);
            } else { 
                const errRes = await response.json();
                showToast(errRes.detail || "Update failed", "error");
            }
        } catch (err) {
            console.error("Submission error:", err);
            showToast("Connection error. Could not reach server.", "error");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "Save Profile Changes";
            }
        }
    });
}

// ========================================
// Initialize
// ========================================
loadCurrentProfile();