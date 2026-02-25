import { login, signup } from "../../src/service/authService.js";

const showModal = (message, type = "info") => {
    // Create notification element if it doesn't exist
    let modal = document.getElementById("customAlertModal");
    if (!modal) {
        modal = document.createElement('div');
        modal.id = "customAlertModal";
        modal.className = "alert-toast";
        modal.innerHTML = `
            <div class="alert-content">
                <span id="alertIcon"></span>
                <span id="alertMessage"></span>
            </div>`;
        document.body.appendChild(modal);
    }

    const msgEl = document.getElementById("alertMessage");
    const iconEl = document.getElementById("alertIcon");

    msgEl.innerText = message;
    iconEl.innerText = type === "success" ? "✅" : "⚠️";
    
    modal.classList.add("show");

    return new Promise((resolve) => {
        setTimeout(() => {
            modal.classList.remove("show");
            setTimeout(() => {
                resolve();
            }, 300); 
        }, 2500); 
    });
};

console.log("Nanny Link Auth controller loaded");

// --- LOGIN LOGIC ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        // Visual feedback for user
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Logging in...";
        submitBtn.disabled = true;

        try {
            const result = await login(email, password);

            if (result.success) {
                localStorage.setItem("access_token", result.access_token);
                localStorage.setItem("user_role", result.role);
                localStorage.setItem("user_id", result.id);
                
                await showModal("Welcome back to Nanny Link!", "success");
                
                const role = result.role.toLowerCase(); 
                if (role === "nanny") {
                    window.location.href = "../../src/views/nannydashboard.html"; 
                } else if (role === "family") {
                    window.location.href = "../family/dashboard.html";
                } else if (role === "admin") {
                    window.location.href = "../admin/dashboard.html";
                } else {
                    window.location.href = "../../index.html"; 
                }
            } else {
                showModal(result.message || "Invalid email or password", "error");
            }
        } catch (err) {
            showModal("Server error. Please try again later.", "error");
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

// --- SIGNUP LOGIC ---
const signupForm = document.getElementById("signupForm");
const passwordInput = document.getElementById("password");

if (signupForm) {
    // Password Strength Meter Logic for Signup
    passwordInput.addEventListener("input", () => {
        const val = passwordInput.value;
        let strength = "";
        let text = "";
        
        // Find or create strength elements if they aren't in HTML
        let strengthBar = document.getElementById("strengthBar");
        let strengthText = document.getElementById("strengthText");

        if (val.length > 0) {
            if (val.length < 6) {
                strength = "weak";
                text = "Min 6 characters";
            } else if (val.match(/[A-Z]/) && val.match(/[0-9]/) && val.match(/[^A-Za-z0-9]/)) {
                strength = "strong";
                text = "Strong password!";
            } else {
                strength = "medium";
                text = "Medium: add numbers/symbols";
            }
        }

        if (strengthBar) strengthBar.className = "bar " + strength;
        if (strengthText) strengthText.textContent = text;
    });

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const confirmPassword = document.getElementById("confirm-password").value;

        if (passwordInput.value.length < 6) {
            showModal("Password must be at least 6 characters.", "error");
            return;
        }

        if (passwordInput.value !== confirmPassword) {
            showModal("Passwords do not match.", "error");
            return;
        }

        const userData = {
            fullname: document.getElementById("fullname").value,
            email: document.getElementById("email").value,
            password: passwordInput.value
        };

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Creating account...";

        const result = await signup(userData);

        if (result.success) {
            await showModal("Nanny Link account created!", "success");
            window.location.href = "login.html";
        } else {
            showModal(result.message || "Signup failed", "error");
            submitBtn.disabled = false;
            submitBtn.innerText = "Sign up";
        }
    });
}