import { login, signup } from "../service/nannyProfileService.js";

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
                    window.location.href = "/frontend/src/views/nannydashboard.html"; 
                } else if (role === "family") {
                    window.location.href = "/frontend/src/family/views/familydashboard.html"; 
                // } else {
                    // window.location.href = "/frontend/src/views/dashboard.html"; 
                }
               
                // console.log("Attempting redirect to:", new URL("/frontend/src/family/views/familydashboard.html", window.location.href).href);
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

const API_BASE = "http://localhost:8000"; // adjust if needed

// 🔷 FETCH STATS
async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/stats/`);
        const stats = await res.json();
        
       
        document.getElementById("stat-nannies").innerText = stats.nannies || 0;
        document.getElementById("stat-families").innerText = stats.families || 0;
        document.getElementById("stat-matches").innerText = stats.matches || 0;

    } catch (err) {
        console.warn("Stats failed to load:", err);
        // Optional: Set defaults on failure
        document.getElementById("stat-nannies").innerText = "-";
        document.getElementById("stat-families").innerText = "-";
        document.getElementById("stat-matches").innerText = "-";
    }
}
/// Fetch featured nannies
async function fetchFeaturedNannies() {
    try {
        const res = await fetch("http://127.0.0.1:8000/Nanny/public"); 
        const data = await res.json();

        const container = document.getElementById("nanny-list");
        if (!container) return;
        container.innerHTML = "";

        data.forEach(nanny => {
            // --- REQUIREMENT 7: Compute hourly rate on the fly ---
            // Logic: Base 250 + 50 for every year of experience
            const baseRate = 250;
            const computedRate = baseRate + (nanny.experience_years * 50);

            const card = document.createElement("div");
            card.className = "nanny-card";
            
            // Map the backend keys correctly here:
            card.innerHTML = `
                <div class="card-image">
                    <img src="${nanny.profile_image || './assets/images/default-avatar.png'}" alt="${nanny.full_name}" />
                </div>
                <div class="card-body">
                    <h3>${nanny.full_name}</h3>
                    <p><strong>Location:</strong> ${nanny.current_location}</p>
                    <p><strong>Preferred Working Location:</strong> ${nanny.preferred_location}</p>
                    <p><strong>Experience:</strong> ${nanny.experience_years} years</p>
                    <p><strong>Skills:</strong> ${nanny.skills || 'General Childcare'}</p>
                    <p><strong>Availability:</strong> <span class="badge">${nanny.availability}</span></p>
                    <p class="rate-text">Rate: <strong>KES ${computedRate.toLocaleString()}/hr</strong></p>
                    
                    <button class="view-btn" data-id="${nanny.id}">View Profile</button>
                </div>
            `;
            container.appendChild(card);
        });

        // Attach click listeners
        document.querySelectorAll(".view-btn").forEach(btn => {
            btn.addEventListener("click", () => handleView(btn.dataset.id));
        });

    } catch (err) {
        console.error("Failed to fetch nannies:", err);
        document.getElementById("nanny-list").innerHTML = "<p>Unable to load nannies at this time.</p>";
    }
}

// 4 & 5. Redirect Logic
function handleView(nannyId) {
    const token = localStorage.getItem('token'); // Check your auth storage
    if (!token) {
        // Store intended destination
        sessionStorage.setItem('redirect_after_login', `/views/nanny-profile.html?id=${nannyId}`);
        window.location.href = "../frontend/src/views/login.html";
    } else {
        window.location.href = `/views/nanny-profile.html?id=${nannyId}`;
    }
}


// INIT
document.addEventListener("DOMContentLoaded", () => {
    fetchStats();
    fetchFeaturedNannies();
});


