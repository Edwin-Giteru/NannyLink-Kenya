// ========================================
// DOM Elements
// ========================================
const profileForm = document.getElementById('familyProfileForm');
const submitBtn = document.getElementById('submitBtn');
const bannerError = document.getElementById('bannerError');
const bannerErrorText = document.getElementById('bannerErrorText');

// ========================================
// Helper Functions
// ========================================
function showError(message) {
    bannerErrorText.textContent = message;
    bannerError.classList.remove('hidden');
    bannerError.classList.add('show');
}

function hideError() {
    bannerError.classList.add('hidden');
    bannerError.classList.remove('show');
}

function setLoadingState(isLoading) {
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving Profile...';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Family Profile</span><span id="btnIcon" class="btn-icon material-symbols-outlined">arrow_forward</span>';
    }
}

function getFormData() {
    return {
        name: document.getElementById('name').value.trim(),
        household_location: document.getElementById('household_location').value.trim(),
        household_details: document.getElementById('household_details').value.trim()
    };
}

function validateFormData(formData) {
    if (!formData.name) {
        showError("Family name is required.");
        return false;
    }
    if (!formData.household_location) {
        showError("Household area is required.");
        return false;
    }
    if (!formData.household_details) {
        showError("Household details are required.");
        return false;
    }
    return true;
}

// ========================================
// API Call
// ========================================
async function submitFamilyProfile(formData) {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        showError("Session expired. Please sign in again.");
        setTimeout(() => {
            window.location.href = "../../auth/login.html";
        }, 2000);
        return false;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/families/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Success - redirect to dashboard
            window.location.href = "./familydashboard.html";
            return true;
        } else {
            showError(data.detail || "Failed to create profile. Please check your information.");
            return false;
        }
    } catch (error) {
        console.error("Profile Error:", error);
        showError("Network error. Please check your connection to the server.");
        return false;
    }
}

// ========================================
// Form Submission Handler
// ========================================
async function handleSubmit(event) {
    event.preventDefault();
    
    // Hide previous errors
    hideError();
    
    // Get and validate form data
    const formData = getFormData();
    
    if (!validateFormData(formData)) {
        return;
    }
    
    // Set loading state
    setLoadingState(true);
    
    // Submit to API
    const success = await submitFamilyProfile(formData);
    
    // Reset loading state if not successful (success will redirect)
    if (!success) {
        setLoadingState(false);
    }
}

// ========================================
// Event Listeners
// ========================================
if (profileForm) {
    profileForm.addEventListener('submit', handleSubmit);
}

// ========================================
// Input Field Cleanup on Focus
// ========================================
const inputs = ['name', 'household_location', 'household_details'];
inputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('focus', () => {
            hideError();
        });
    }
});