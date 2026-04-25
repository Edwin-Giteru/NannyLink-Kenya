// ========================================
// DOM Elements
// ========================================
const API_BASE = "http://127.0.0.1:8000";

// Step views
const step1View = document.getElementById('step1View');
const step2View = document.getElementById('step2View');
const emailSentView = document.getElementById('emailSentView');
const resetSuccessView = document.getElementById('resetSuccessView');

// Step indicators
const step1Circle = document.getElementById('step1Circle');
const step2Circle = document.getElementById('step2Circle');
const stepLine = document.getElementById('stepLine');
const step1Label = document.getElementById('step1Label');
const step2Label = document.getElementById('step2Label');

// Error/Success banners
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const successBanner = document.getElementById('successBanner');
const successMessage = document.getElementById('successMessage');

// Form elements
const resetEmail = document.getElementById('resetEmail');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');
const emailInputGroup = document.getElementById('emailInputGroup');
const passwordInputGroup = document.getElementById('passwordInputGroup');
const confirmInputGroup = document.getElementById('confirmInputGroup');

// Error spans
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const confirmError = document.getElementById('confirmError');

// Buttons
const sendResetBtn = document.getElementById('sendResetBtn');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const resendBtn = document.getElementById('resendBtn');

// Password requirements elements
const reqMinLength = document.getElementById('reqMinLength');
const reqMaxLength = document.getElementById('reqMaxLength');
const reqHasLetter = document.getElementById('reqHasLetter');
const reqHasNumber = document.getElementById('reqHasNumber');

// Strength elements
const strengthContainer = document.getElementById('strengthContainer');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');

let currentEmail = '';
let resetToken = null;

// ========================================
// Helper Functions
// ========================================
function hideBanners() {
    errorBanner?.classList.add('hidden');
    successBanner?.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorBanner?.classList.remove('hidden');
    setTimeout(() => {
        errorBanner?.classList.add('hidden');
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successBanner?.classList.remove('hidden');
    setTimeout(() => {
        successBanner?.classList.add('hidden');
    }, 4000);
}

function clearFieldErrors() {
    emailInputGroup?.classList.remove('error');
    passwordInputGroup?.classList.remove('error');
    confirmInputGroup?.classList.remove('error');
    if (emailError) emailError.textContent = '';
    if (passwordError) passwordError.textContent = '';
    if (confirmError) confirmError.textContent = '';
}

function setButtonLoading(button, isLoading, defaultText) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Please wait...`;
    } else {
        button.innerHTML = defaultText;
    }
}

function showStep(stepName) {
    // Hide all views
    if (step1View) step1View.classList.remove('active');
    if (step2View) step2View.classList.remove('active');
    if (emailSentView) emailSentView.classList.remove('active');
    if (resetSuccessView) resetSuccessView.classList.remove('active');
    
    // Show selected view
    if (stepName === 'step1') step1View?.classList.add('active');
    if (stepName === 'step2') step2View?.classList.add('active');
    if (stepName === 'emailSent') emailSentView?.classList.add('active');
    if (stepName === 'success') resetSuccessView?.classList.add('active');
}

function updateStepProgress(step) {
    if (step === 1) {
        step1Circle?.classList.add('active');
        step1Circle?.classList.remove('completed');
        step2Circle?.classList.remove('active', 'completed');
        stepLine?.classList.remove('completed');
        step1Label?.classList.add('active');
        step2Label?.classList.remove('active');
    } else if (step === 'emailSent') {
        step1Circle?.classList.add('completed');
        step1Circle?.classList.remove('active');
        stepLine?.classList.add('completed');
        step2Circle?.classList.add('active');
        step2Circle?.classList.remove('completed');
        step1Label?.classList.remove('active');
        step2Label?.classList.add('active');
    } else if (step === 2) {
        step1Circle?.classList.add('completed');
        stepLine?.classList.add('completed');
        step2Circle?.classList.add('active');
        step1Label?.classList.remove('active');
        step2Label?.classList.add('active');
    }
}

// ========================================
// Password Validation & Strength
// ========================================
function checkPasswordStrength(password) {
    if (!password) return { level: '', label: '', score: 0 };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 2) return { level: 'weak', label: 'Weak', score: 1 };
    if (score <= 4) return { level: 'medium', label: 'Medium', score: 2 };
    return { level: 'strong', label: 'Strong', score: 3 };
}

function updatePasswordRequirements() {
    const password = newPassword?.value || '';
    
    const minLength = password.length >= 8;
    const maxLength = password.length <= 72;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    reqMinLength?.classList.toggle('met', minLength);
    reqMaxLength?.classList.toggle('met', maxLength);
    reqHasLetter?.classList.toggle('met', hasLetter);
    reqHasNumber?.classList.toggle('met', hasNumber);
    
    const strength = checkPasswordStrength(password);
    if (password.length > 0) {
        strengthContainer?.classList.remove('hidden');
        strengthFill.className = `strength-fill ${strength.level}`;
        strengthText.className = `strength-text ${strength.level}`;
        strengthText.textContent = strength.label;
    } else {
        strengthContainer?.classList.add('hidden');
    }
    
    return strength.score >= 2 && minLength && maxLength && hasLetter && hasNumber;
}

function validateEmail(email) {
    if (!email) return { valid: false, message: 'Email is required' };
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Please enter a valid email address' };
    }
    return { valid: true, message: '' };
}

function validatePasswordStrength(password) {
    if (!password) return { valid: false, message: 'Password is required' };
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    if (password.length > 72) return { valid: false, message: 'Password must be no more than 72 characters' };
    if (!/[a-zA-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one letter' };
    if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number' };
    
    const strength = checkPasswordStrength(password);
    if (strength.score < 2) {
        return { valid: false, message: 'Password is too weak. Use a stronger password.' };
    }
    return { valid: true, message: '' };
}

async function requestPasswordReset(email) {
    try {
        // Note: Your backend has router prefix "/auth", so endpoints are:
        // POST /auth/password-reset/request
        const response = await fetch(`${API_BASE}/password-reset/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, token: data.token, message: data.message };
        } else {
            return { success: false, message: data.detail || 'Failed to send reset email' };
        }
    } catch (error) {
        console.error('Request reset error:', error);
        return { success: false, message: 'Network error. Please check your connection.' };
    }
}

async function confirmPasswordReset(token, newPassword) {
    try {
        // Note: Your backend has router prefix "/auth", so endpoints are:
        // POST /auth/password-reset/confirm
        const response = await fetch(`${API_BASE}/password-reset/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, message: data.message };
        } else {
            return { success: false, message: data.detail || 'Failed to reset password' };
        }
    } catch (error) {
        console.error('Confirm reset error:', error);
        return { success: false, message: 'Network error. Please check your connection.' };
    }
}

// ========================================
// Event Handlers
// ========================================
async function handleSendReset(e) {
    e.preventDefault();
    hideBanners();
    clearFieldErrors();
    
    const email = resetEmail?.value?.trim() || '';
    const emailValidation = validateEmail(email);
    
    if (!emailValidation.valid) {
        emailInputGroup?.classList.add('error');
        if (emailError) emailError.textContent = emailValidation.message;
        return;
    }
    
    setButtonLoading(sendResetBtn, true, '<i class="fas fa-paper-plane"></i> Send Reset Link');
    
    const result = await requestPasswordReset(email);
    
    setButtonLoading(sendResetBtn, false, '<i class="fas fa-paper-plane"></i> Send Reset Link');
    
    if (result.success) {
        currentEmail = email;
        const sentEmailDisplay = document.getElementById('sentEmailDisplay');
        if (sentEmailDisplay) sentEmailDisplay.textContent = email;
        updateStepProgress('emailSent');
        showStep('emailSent');
        showSuccess('Reset link sent! Check your email.');
        
        // Store the token for testing (in production, this would be in the email link)
        if (result.token) {
            console.log('Reset token (for testing):', result.token);
            // In production, you would send this token via email
            // For now, we'll store it to allow the flow to complete
            resetToken = result.token;
        }
    } else {
        showError(result.message);
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    hideBanners();
    clearFieldErrors();
    
    const password = newPassword?.value || '';
    const confirm = confirmPassword?.value || '';
    
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
        passwordInputGroup?.classList.add('error');
        if (passwordError) passwordError.textContent = passwordValidation.message;
        return;
    }
    
    if (password !== confirm) {
        confirmInputGroup?.classList.add('error');
        if (confirmError) confirmError.textContent = 'Passwords do not match';
        return;
    }
    
    // Get token from URL if coming from email link, or from stored token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || resetToken;
    
    if (!token) {
        showError('Invalid or missing reset token. Please request a new reset link.');
        return;
    }
    
    setButtonLoading(resetPasswordBtn, true, '<i class="fas fa-shield-alt"></i> Reset Password');
    
    const result = await confirmPasswordReset(token, password);
    
    setButtonLoading(resetPasswordBtn, false, '<i class="fas fa-shield-alt"></i> Reset Password');
    
    if (result.success) {
        updateStepProgress(2);
        showStep('success');
        showSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
    } else {
        showError(result.message);
    }
}

async function handleResend() {
    if (!currentEmail) {
        showStep('step1');
        return;
    }
    
    setButtonLoading(resendBtn, true, '<i class="fas fa-redo-alt"></i> Resend Email');
    
    const result = await requestPasswordReset(currentEmail);
    
    setButtonLoading(resendBtn, false, '<i class="fas fa-redo-alt"></i> Resend Email');
    
    if (result.success) {
        showSuccess('A new reset link has been sent to your email.');
        if (result.token) {
            resetToken = result.token;
            console.log('New reset token:', result.token);
        }
    } else {
        showError(result.message);
    }
}

// ========================================
// Real-time Validation
// ========================================
function setupRealTimeValidation() {
    // Email input
    resetEmail?.addEventListener('input', () => {
        emailInputGroup?.classList.remove('error');
        if (emailError) emailError.textContent = '';
        hideBanners();
    });
    
    // Password input
    newPassword?.addEventListener('input', () => {
        passwordInputGroup?.classList.remove('error');
        if (passwordError) passwordError.textContent = '';
        updatePasswordRequirements();
        hideBanners();
    });
    
    // Confirm password input
    confirmPassword?.addEventListener('input', () => {
        confirmInputGroup?.classList.remove('error');
        if (confirmError) confirmError.textContent = '';
        hideBanners();
    });
}

// ========================================
// Password Visibility Toggles
// ========================================
function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            
            if (input && input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else if (input) {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
}

// ========================================
// Initialize Page Based on URL Token
// ========================================
function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        resetToken = token;
        updateStepProgress(2);
        showStep('step2');
    } else {
        showStep('step1');
    }
}

// ========================================
// Event Listeners
// ========================================
const resetRequestForm = document.getElementById('resetRequestForm');
const resetConfirmForm = document.getElementById('resetConfirmForm');

if (resetRequestForm) resetRequestForm.addEventListener('submit', handleSendReset);
if (resetConfirmForm) resetConfirmForm.addEventListener('submit', handleResetPassword);
if (resendBtn) resendBtn.addEventListener('click', handleResend);

setupPasswordToggles();
setupRealTimeValidation();
initializePage();