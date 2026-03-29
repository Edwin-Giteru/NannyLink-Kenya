import { login, signup } from "../service/nannyProfileService.js";

// Global state to store nannies for filtering
let allNannies = [];

const showModal = (message, type = "info") => {
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

// --- LOGIN LOGIC ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

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
    passwordInput.addEventListener("input", () => {
        const val = passwordInput.value;
        let strength = "";
        let text = "";
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

const API_BASE = "http://localhost:8000"; 

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
    }
}

// 🔷 RENDER NANNIES (Shared logic for initial fetch and search)
function renderNannies(nannies) {
    const container = document.getElementById("nanny-list");
    if (!container) return;
    container.innerHTML = "";

    if (nannies.length === 0) {
        container.innerHTML = "<p class='col-span-full text-center py-10 text-slate-400 font-bold'>No nannies found matching your criteria.</p>";
        return;
    }

    nannies.forEach(nanny => {
        const exp = parseInt(nanny.experience_years) || 0;
        const baseRate = 250;
        const computedRate = baseRate + (exp * 50);

        const card = document.createElement("div");
        card.className = "nanny-card bg-white rounded-[2rem] overflow-hidden ambient-shadow border border-slate-50 flex flex-col group transition-all duration-300 hover:-translate-y-2";
        
        card.innerHTML = `
            <div class="relative h-64">
                <img class="w-full h-full object-cover" src="${nanny.profile_image || './assets/images/default-avatar.png'}" alt="${nanny.full_name || 'Nanny'}" />
                <div class="absolute top-4 right-4 glass-card px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-yellow-500 text-sm" style="font-variation-settings: 'FILL' 1;">star</span>
                    <span class="text-xs font-bold text-primary">4.9</span>
                </div>
            </div>
            <div class="p-6 flex flex-col flex-1">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-headline font-bold text-primary">${nanny.full_name || "Name Unavailable"}</h3>
                    <span class="text-secondary font-bold text-sm">KES ${computedRate.toLocaleString()}/hr</span>
                </div>
                <div class="flex items-center gap-2 text-slate-400 text-sm mb-4">
                    <span class="material-symbols-outlined text-sm">location_on</span>
                    <span>${nanny.current_location || "Not specified"}</span>
                </div>
                <div class="flex flex-wrap gap-2 mb-6">
                    <span class="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-100">${exp} years exp</span>
                    <span class="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-100">${nanny.skills || 'Vetted'}</span>
                </div>
                <button class="view-btn mt-auto w-full py-4 bg-slate-50 text-primary text-center font-bold rounded-2xl transition-all hover:bg-primary hover:text-white" data-id="${nanny.id}">
                    View Profile
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", () => handleView(btn.dataset.id));
    });
}

// 🔷 IMPROVED SEARCH LOGIC (Filters by both Skill and Location)
function setupSearch() {
    const skillInput = document.getElementById("skill-search");
    const locationInput = document.getElementById("location-search");

    if (!skillInput || !locationInput) return;

    const performFilter = () => {
        const skillTerm = skillInput.value.toLowerCase();
        const locationTerm = locationInput.value.toLowerCase();

        const filtered = allNannies.filter(nanny => {
            const skills = (nanny.skills || "").toLowerCase();
            const location = (nanny.current_location || "").toLowerCase();
            const name = (nanny.full_name || "").toLowerCase();

            // Match if skill term is in skills/name AND location term is in current_location
            const matchesSkill = skills.includes(skillTerm) || name.includes(skillTerm);
            const matchesLocation = location.includes(locationTerm);

            return matchesSkill && matchesLocation;
        });

        renderNannies(filtered);
    };

    skillInput.addEventListener("input", performFilter);
    locationInput.addEventListener("input", performFilter);
}

async function fetchFeaturedNannies() {
    try {
        const res = await fetch(`${API_BASE}/nannies/`); 
        const data = await res.json();

        if (Array.isArray(data)) {
            allNannies = data; // Store globally for searching
            renderNannies(allNannies);
        }
    } catch (err) {
        console.error("Failed to fetch nannies:", err);
    }
}

function handleView(nannyId) {
    const token = localStorage.getItem('access_token'); 
    if (!token) {
        sessionStorage.setItem('redirect_after_login', `/views/nanny-profile.html?id=${nannyId}`);
        window.location.href = "../frontend/src/views/login.html";
    } else {
        window.location.href = "../frontend/src/views/login.html";
    }
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
    fetchStats();
    fetchFeaturedNannies();
    setupSearch(); // Initialize search listener
});