// ========================================
// DOM Elements
// ========================================
const $ = (id) => document.getElementById(id);

// API Configuration - CORRECT ENDPOINTS (no /auth prefix)
const API_BASE = "http://127.0.0.1:8000";

// State
let currentMode = "login";
let selectedRole = "nanny";

// ========================================
// Helper Functions
// ========================================
function clearErrors() {
    document.querySelectorAll('.input-wrapper').forEach(w => w.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(e => e.textContent = "");
    hideBanners();
}

function markError(wrapId, errId, message) {
    const wrap = $(wrapId);
    const err = $(errId);
    if (wrap) wrap.classList.add('error');
    if (err) err.textContent = message;
}

function clearFieldError(wrapId, errId) {
    const wrap = $(wrapId);
    const err = $(errId);
    if (wrap) wrap.classList.remove('error');
    if (err) err.textContent = "";
}

function showBanner(type, message) {
    const bannerError = $("bannerError");
    const bannerSuccess = $("bannerSuccess");
    const errorText = $("bannerErrorText");
    const successText = $("bannerSuccessText");
    
    if (bannerError) bannerError.classList.add("hidden");
    if (bannerSuccess) bannerSuccess.classList.add("hidden");
    
    if (type === "error" && bannerError && errorText) {
        errorText.textContent = message;
        bannerError.classList.remove("hidden");
    } else if (type === "success" && bannerSuccess && successText) {
        successText.textContent = message;
        bannerSuccess.classList.remove("hidden");
    }
}

function hideBanners() {
    const bannerError = $("bannerError");
    const bannerSuccess = $("bannerSuccess");
    if (bannerError) bannerError.classList.add("hidden");
    if (bannerSuccess) bannerSuccess.classList.add("hidden");
}

// ========================================
// Password Strength Checker
// ========================================
function checkPasswordStrength(password) {
    if (!password || password.length === 0) {
        return { score: 0, label: '', className: '', width: 0 };
    }
    
    let strength = 0;
    
    // Length check
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 0.5;
    
    // Has uppercase
    if (/[A-Z]/.test(password)) strength += 1;
    // Has lowercase
    if (/[a-z]/.test(password)) strength += 1;
    // Has numbers
    if (/[0-9]/.test(password)) strength += 1;
    // Has special characters
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    let label = '';
    let className = '';
    let score = 1;
    let width = 33;
    
    if (strength <= 2.5) {
        label = 'Weak';
        className = 'weak';
        score = 1;
        width = 33;
    } else if (strength <= 4) {
        label = 'Medium';
        className = 'medium';
        score = 2;
        width = 66;
    } else {
        label = 'Strong';
        className = 'strong';
        score = 3;
        width = 100;
    }
    
    return { score, label, className, width };
}

function updatePasswordStrength() {
    const password = $("signupPw")?.value || '';
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthDiv || !strengthBar || !strengthText) return;
    
    if (password.length === 0) {
        strengthDiv.classList.add('hidden');
        return;
    }
    
    strengthDiv.classList.remove('hidden');
    const result = checkPasswordStrength(password);
    
    strengthBar.style.width = `${result.width}%`;
    strengthBar.className = `strength-bar ${result.className}`;
    strengthText.className = `strength-text ${result.className}`;
    strengthText.textContent = result.label;
    
    // Real-time validation feedback
    const errorMsg = $("errSignupPw");
    const wrap = $("wrapSignupPw");
    
    // Check length first
    if (password.length < 6) {
        if (errorMsg) errorMsg.textContent = "Password must be at least 6 characters";
        if (wrap) wrap.classList.add('error');
    } else if (password.length > 10) {
        if (errorMsg) errorMsg.textContent = "Password must be 10 characters or less for easy recall";
        if (wrap) wrap.classList.add('error');
    } else if (result.score < 2) {
        if (errorMsg) errorMsg.textContent = "Password too weak. Use letters, numbers, or special characters";
        if (wrap) wrap.classList.add('error');
    } else {
        if (errorMsg) errorMsg.textContent = "";
        if (wrap) wrap.classList.remove('error');
    }
}

// ========================================
// Mode Switching
// ========================================
function setMode(mode) {
    currentMode = mode;
    clearErrors();
    
    const isSignup = mode === "signup";
    const modeToggle = $("modeToggle");
    const viewLogin = $("viewLogin");
    const viewSignup = $("viewSignup");
    const btnLogin = $("btnLogin");
    const btnSignup = $("btnSignup");
    const footerContainer = $("footerContainer");
    
    if (modeToggle) modeToggle.classList.toggle("signup-mode", isSignup);
    if (viewLogin) viewLogin.classList.toggle("active", !isSignup);
    if (viewSignup) viewSignup.classList.toggle("active", isSignup);
    if (btnLogin) btnLogin.classList.toggle("active", !isSignup);
    if (btnSignup) btnSignup.classList.toggle("active", isSignup);
    
    if (footerContainer) {
        footerContainer.innerHTML = isSignup 
            ? `<p>Already have an account? <button type="button" class="footer-link" id="toLogin">Sign in instead</button></p>`
            : `<p>Don't have an account? <button type="button" class="footer-link" id="toSignup">Sign up now</button></p>`;
        
        const toLogin = document.getElementById("toLogin");
        const toSignup = document.getElementById("toSignup");
        if (toLogin) toLogin.addEventListener("click", () => setMode("login"));
        if (toSignup) toSignup.addEventListener("click", () => setMode("signup"));
    }
}

// ========================================
// Role Selection
// ========================================
function initRoleSelection() {
    const grid = $("signupRoleGrid");
    if (!grid) return;
    
    const cards = grid.querySelectorAll(".role-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => {
                c.classList.remove("active");
                const span = c.querySelector("span");
                if (span) span.style.color = "";
            });
            card.classList.add("active");
            const span = card.querySelector("span");
            if (span) span.style.color = "var(--primary)";
            selectedRole = card.dataset.role;
        });
    });
}

// ========================================
// Validation Functions
// ========================================
function validateEmail(email) {
    if (!email || email.trim() === "") {
        return { valid: false, message: "Email is required" };
    }
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: "Please enter a valid email address (e.g., name@example.com)" };
    }
    return { valid: true, message: "" };
}

function validatePhone(phone) {
    if (!phone || phone.trim() === "") {
        return { valid: false, message: "Phone number is required" };
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        return { valid: false, message: "Phone number must be at least 10 digits" };
    }
    if (cleanPhone.length > 12) {
        return { valid: false, message: "Phone number is too long (max 12 digits)" };
    }
    return { valid: true, message: "", cleaned: cleanPhone };
}

function validatePassword(password) {
    if (!password || password.trim() === "") {
        return { valid: false, message: "Password is required" };
    }
    
    if (password.length < 6) {
        return { valid: false, message: "Password must be at least 6 characters" };
    }
    
    if (password.length > 10) {
        return { valid: false, message: "Password must be 10 characters or less for easy recall" };
    }
    
    const strength = checkPasswordStrength(password);
    if (strength.score < 2) {
        return { valid: false, message: "Password too weak. Use a mix of uppercase, lowercase, numbers, or special characters" };
    }
    
    return { valid: true, message: "", strength: strength };
}

function validateConfirmPassword(password, confirmPassword) {
    if (!confirmPassword || confirmPassword.trim() === "") {
        return { valid: false, message: "Please confirm your password" };
    }
    if (password !== confirmPassword) {
        return { valid: false, message: "Passwords do not match" };
    }
    return { valid: true, message: "" };
}

// ========================================
// API Calls - CORRECT ENDPOINTS (no /auth prefix)
// ========================================

// LOGIN - POST /login
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            return { 
                success: true, 
                access_token: data.access_token,
                role: data.role,
                id: data.id,
                email: data.email
            };
        } else {
            return { 
                success: false, 
                message: data.detail || "Invalid email or password" 
            };
        }
    } catch (error) {
        console.error("Login API error:", error);
        return { success: false, message: "Network error. Please check your connection." };
    }
}

// SIGNUP NANNY - POST /nanny
async function signupNanny(userData) {
    try {
        const response = await fetch(`${API_BASE}/nanny`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: userData.email,
                phone_number: userData.phone,
                password: userData.password,
                role: "nanny"
            })
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true, data: data };
        } else {
            return { 
                success: false, 
                message: data.detail || "Signup failed. Please try again." 
            };
        }
    } catch (error) {
        console.error("Signup API error:", error);
        return { success: false, message: "Network error. Please check your connection." };
    }
}

// SIGNUP FAMILY - POST /family
async function signupFamily(userData) {
    try {
        const response = await fetch(`${API_BASE}/family`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: userData.email,
                phone_number: userData.phone,
                password: userData.password,
                role: "family"
            })
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true, data: data };
        } else {
            return { 
                success: false, 
                message: data.detail || "Signup failed. Please try again." 
            };
        }
    } catch (error) {
        console.error("Signup API error:", error);
        return { success: false, message: "Network error. Please check your connection." };
    }
}

// Main signup function that routes to the correct endpoint
async function signup(userData) {
    if (userData.role === "nanny") {
        return await signupNanny(userData);
    } else {
        return await signupFamily(userData);
    }
}

// ========================================
// Form Handlers
// ========================================
async function handleLogin(e) {
    e.preventDefault();
    clearErrors();
    
    let hasError = false;
    
    const email = $("loginEmail")?.value?.trim() || '';
    const password = $("loginPw")?.value || '';
    
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        markError("wrapLoginEmail", "errLoginEmail", emailValidation.message);
        hasError = true;
    }
    
    // Validate password presence
    if (!password) {
        markError("wrapLoginPw", "errLoginPw", "Password is required");
        hasError = true;
    }
    
    if (hasError) return;
    
    const submitBtn = $("btnLoginSubmit");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Verifying...`;
    }
    
    try {
        const result = await login(email, password);
        if (result.success) {
            showBanner("success", "Login successful! Redirecting...");
            localStorage.setItem("access_token", result.access_token);
            localStorage.setItem("user_role", result.role);
            localStorage.setItem("user_id", result.id);
            
            setTimeout(() => {
                const role = result.role;
                
                if (role === "admin") {
                    window.location.href = "../admin/statsoverview.html";
                } else if (role === "family") {
                    window.location.href = "../Family/familydashboard.html";
                } else if (role === "nanny") {
                    window.location.href = "../nanny/nannydashboard.html";
                } else {
                    window.location.href = "../admin/statsoverview.html";
                }
            }, 1500);
        } else {
            showBanner("error", result.message || "Invalid credentials");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Sign In";
            }
        }
    } catch (error) {
        console.error("Login error:", error);
        showBanner("error", "Network error. Please check your connection.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Sign In";
        }
    }
}

async function handleSignup(e) {
    e.preventDefault();
    clearErrors();
    
    let hasError = false;
    
    const email = $("signupEmail")?.value?.trim() || '';
    const phone = $("signupPhone")?.value?.trim() || '';
    const password = $("signupPw")?.value || '';
    const confirmPassword = $("signupConfirm")?.value || '';
    const termsChecked = $("signupTerms")?.checked || false;
    
    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        markError("wrapSignupEmail", "errSignupEmail", emailValidation.message);
        hasError = true;
    }
    
    // Validate phone
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
        markError("wrapSignupPhone", "errSignupPhone", phoneValidation.message);
        hasError = true;
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        markError("wrapSignupPw", "errSignupPw", passwordValidation.message);
        hasError = true;
    }
    
    // Validate confirm password
    const confirmValidation = validateConfirmPassword(password, confirmPassword);
    if (!confirmValidation.valid) {
        markError("wrapSignupConfirm", "errSignupConfirm", confirmValidation.message);
        hasError = true;
    }
    
    // Validate terms
    if (!termsChecked) {
        showBanner("error", "Please agree to the Terms of Service");
        hasError = true;
    }
    
    if (hasError) return;
    
    const submitBtn = $("btnSignupSubmit");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Creating Account...`;
    }
    
    try {
        const result = await signup({
            email,
            phone,
            password,
            role: selectedRole
        });
        
        if (result.success) {
            showBanner("success", "Account created! Logging you in...");
            
            // Auto login after signup
            const loginResult = await login(email, password);
            if (loginResult.success) {
                localStorage.setItem("access_token", loginResult.access_token);
                localStorage.setItem("user_role", loginResult.role);
                localStorage.setItem("user_id", loginResult.id);
                
                setTimeout(() => {
                    if (selectedRole === "nanny") {
                        window.location.href = "../nanny/profilecreation.html";
                    } else {
                        window.location.href = "../Family/createprofile.html";
                    }
                }, 1500);
            } else {
                showBanner("error", "Account created but login failed. Please sign in manually.");
                setTimeout(() => {
                    setMode("login");
                }, 2000);
            }
        } else {
            if (result.message && (result.message.includes("unique") || result.message.includes("already exists"))) {
                showBanner("error", "Email or phone number already in use. Please use different credentials.");
            } else {
                showBanner("error", result.message || "Signup failed. Please try again.");
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Create Account";
            }
        }
    } catch (error) {
        console.error("Signup error:", error);
        showBanner("error", "Network error. Please check your connection.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Create Account";
        }
    }
}

// ========================================
// Real-time Validation Functions
// ========================================
function setupRealTimeValidation() {
    // Email validation on blur
    const signupEmail = $("signupEmail");
    if (signupEmail) {
        signupEmail.addEventListener("blur", () => {
            const email = signupEmail.value.trim();
            const validation = validateEmail(email);
            if (!validation.valid && email) {
                markError("wrapSignupEmail", "errSignupEmail", validation.message);
            } else {
                clearFieldError("wrapSignupEmail", "errSignupEmail");
            }
        });
        
        signupEmail.addEventListener("input", () => {
            clearFieldError("wrapSignupEmail", "errSignupEmail");
        });
    }
    
    // Phone validation on blur
    const signupPhone = $("signupPhone");
    if (signupPhone) {
        signupPhone.addEventListener("blur", () => {
            const phone = signupPhone.value.trim();
            const validation = validatePhone(phone);
            if (!validation.valid && phone) {
                markError("wrapSignupPhone", "errSignupPhone", validation.message);
            } else {
                clearFieldError("wrapSignupPhone", "errSignupPhone");
            }
        });
        
        signupPhone.addEventListener("input", () => {
            clearFieldError("wrapSignupPhone", "errSignupPhone");
        });
    }
    
    // Confirm password real-time validation
    const signupConfirm = $("signupConfirm");
    const signupPw = $("signupPw");
    if (signupConfirm && signupPw) {
        const validateConfirmRealTime = () => {
            const password = signupPw.value;
            const confirm = signupConfirm.value;
            if (confirm && password !== confirm) {
                markError("wrapSignupConfirm", "errSignupConfirm", "Passwords do not match");
            } else {
                clearFieldError("wrapSignupConfirm", "errSignupConfirm");
            }
        };
        
        signupConfirm.addEventListener("input", validateConfirmRealTime);
        signupPw.addEventListener("input", validateConfirmRealTime);
    }
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    // Mode toggles
    const btnLogin = $("btnLogin");
    const btnSignup = $("btnSignup");
    const footerAction = $("footerAction");
    
    if (btnLogin) btnLogin.addEventListener("click", () => setMode("login"));
    if (btnSignup) btnSignup.addEventListener("click", () => setMode("signup"));
    if (footerAction) footerAction.addEventListener("click", () => setMode("signup"));
    
    // Form submissions
    const loginForm = $("formLogin");
    const signupForm = $("formSignup");
    
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
    if (signupForm) signupForm.addEventListener("submit", handleSignup);
    
    // Password strength checker - real-time
    const signupPw = $("signupPw");
    if (signupPw) {
        signupPw.addEventListener("input", updatePasswordStrength);
    }
    
    // Set up real-time validation for other fields
    setupRealTimeValidation();
    
    // Password visibility toggles
    document.querySelectorAll(".password-toggle").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute("data-target");
            const input = $(targetId);
            const icon = btn.querySelector("i");
            
            if (input && input.type === "password") {
                input.type = "text";
                icon.classList.replace("fa-eye", "fa-eye-slash");
            } else if (input) {
                input.type = "password";
                icon.classList.replace("fa-eye-slash", "fa-eye");
            }
        });
    });
    
    // Role selection
    initRoleSelection();
    
    // Forgot password
    const forgotBtn = $("btnForgot");
    if (forgotBtn) {
        forgotBtn.addEventListener("click", () => {
            showBanner("info", "Password reset feature coming soon!");
        });
    }
    
    // Initial setup
    setMode("login");
});

// Export for debugging
window.debugAuth = {
    checkPasswordStrength,
    validatePassword,
    validateEmail,
    validatePhone
};