import { getAllJobs, applyToJob, getNannyApplications } from "../../service/nannyDashboardService.js";
import { API_URL } from "../../utils/config.js";

/* ═══════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const safeText = (id, val) => { const el = $(id); if (el) el.textContent = val; };

function showToast(message, type = "info") {
    let toast = document.querySelector(".toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    const icons = { success: "✓", error: "✕", info: "ℹ" };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || icons.info}</span> ${message}`;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

const initials = (name = "") =>
    name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "N";

function relativeTime(dateStr) {
    if (!dateStr) return "Recently";
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const State = {
    user: null,
    allJobs: [],
    applications: [],
    appliedJobIds: new Set(),
    matches: [],
    currentFilters: { keyword: "" },
    loading: { jobs: true, apps: true, profile: true },
};

/* ═══════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════ */
async function getProfileData() {
    const token = localStorage.getItem("access_token");
    if (!token) return { success: false };

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        const response = await fetch(`${API_URL}/Nanny/profile/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                data: {
                    full_name: data.name,
                    vetting_status: data.vetting_status || "PENDING",
                    profile_photo_url: data.profile_photo_url || null,
                    preferred_location: data.preferred_location || "",
                    match_count: data.match_count || 0,
                    weekly_earnings: data.weekly_earnings || 0,
                }
            };
        }

        // Nanny profile not created yet — fallback to JWT
        return {
            success: true,
            data: {
                full_name: payload.name || payload.email || "Nanny User",
                vetting_status: "PENDING",
                profile_photo_url: null,
                match_count: 0,
                weekly_earnings: 0,
            }
        };

    } catch (e) {
        console.error("Profile fetch error:", e);
        return { success: false };
    }
}

/* ═══════════════════════════════════════════
   MATCHES
═══════════════════════════════════════════ */
async function getMatches() {
    const token = localStorage.getItem("access_token");
    if (!token) return { success: false, data: [] };
    try {
        const res = await fetch(`${API_URL}/matches/`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) return { success: false, data: [] };
        const data = await res.json();
        const matches = Array.isArray(data) ? data : (data.matches || data.data || []);
        return { success: true, data: matches };
    } catch (e) {
        console.error("Matches fetch error:", e);
        return { success: false, data: [] };
    }
}
function updateProfileUI() {
    if (!State.user) return;
    const { full_name, vetting_status, profile_photo_url } = State.user;

    safeText("userName", full_name || "Nanny User");

    const avatarEl = document.querySelector(".user-avatar");
    if (avatarEl) {
        avatarEl.innerHTML = profile_photo_url
            ? `<img src="${profile_photo_url}" alt="avatar">`
            : initials(full_name);
    }

    const status = (vetting_status || "PENDING").toUpperCase();
    const map = {
        PENDING:     { pct: 25,  msg: "Documents received. Reviewing your profile." },
        IN_PROGRESS: { pct: 50,  msg: "Background check in progress." },
        INTERVIEWED: { pct: 75,  msg: "Final verification steps ongoing." },
        VETTED:      { pct: 100, msg: "Your profile is fully verified! 🎉" },
        VERIFIED:    { pct: 100, msg: "Your profile is fully verified! 🎉" },
        REJECTED:    { pct: 0,   msg: "Verification failed. Please contact support." },
    };
    const { pct = 10, msg = "Starting verification process." } = map[status] || {};

    const progressFill = $("progressFill");
    if (progressFill) {
        progressFill.style.width = `${pct}%`;
        progressFill.classList.toggle("complete", pct === 100);
    }
    safeText("progressPercent", `${pct}%`);
    safeText("progressPercentBig", `${pct}% Complete`);
    safeText("vettingDetail", msg);
}

/* ═══════════════════════════════════════════
   UI: STATS
═══════════════════════════════════════════ */
function updateStats() {
    safeText("statAvailable", State.allJobs.length);
    safeText("statApps", State.applications.length);
    safeText("statMatches", State.user?.match_count ?? 0);
    const earnings = State.user?.weekly_earnings ?? 0;
    safeText("statEarnings", `Ksh ${Number(earnings).toLocaleString()}`);
}

/* ═══════════════════════════════════════════
   UI: JOBS
═══════════════════════════════════════════ */
function renderSkeletons(container, count = 3) {
    container.innerHTML = Array.from({ length: count }, () => `
        <div class="skeleton-card">
            <div class="skeleton sk-icon"></div>
            <div class="sk-body">
                <div class="skeleton sk-line"></div>
                <div class="skeleton sk-line short"></div>
                <div class="skeleton sk-line xshort"></div>
            </div>
        </div>`).join("");
}

function renderJobs() {
    const container = $("jobList");
    if (!container) return;

    if (State.loading.jobs) { renderSkeletons(container); return; }

    const kw = State.currentFilters.keyword.toLowerCase().trim();
    const filtered = State.allJobs.filter((j) =>
        !kw ||
        j.title?.toLowerCase().includes(kw) ||
        j.location?.toLowerCase().includes(kw) ||
        j.care_needs?.toLowerCase().includes(kw)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-msg">No jobs found${kw ? ` for "<strong>${kw}</strong>"` : ""}.</div>`;
        return;
    }

    container.innerHTML = filtered.slice(0, 6).map((job, i) => {
        const applied = State.appliedJobIds.has(String(job.id));
        return `
        <div class="job-card-item" style="animation-delay:${i * 0.06}s"
             onclick="window._openJobModal('${job.id}')">
            <div class="job-icon-box"><i class="fas fa-baby"></i></div>
            <div class="job-details">
                <h4>${job.title || "Nanny Position"}</h4>
                <p>${job.location || "Location TBD"} · ${job.required_experience || 0} yrs exp</p>
                <div class="job-chips">
                    <span>${job.availability || "Full-Time"}</span>
                    ${job.care_needs ? `<span class="chip-alt">${job.care_needs}</span>` : ""}
                </div>
            </div>
            <div class="job-price">
                <p>Ksh ${(job.salary || 0).toLocaleString()}</p>
                <button class="btn-view ${applied ? "applied" : ""}"
                    onclick="event.stopPropagation(); window._openJobModal('${job.id}')">
                    ${applied ? "Applied ✓" : "View"}
                </button>
            </div>
        </div>`;
    }).join("");
}

/* ═══════════════════════════════════════════
   UI: APPLICATION STATUS
   
   API response shape (per application):
   {
     id, job_id, nanny_id,
     status,       ← APPLICATION status (pending/reviewing/interview/accepted/rejected)
     applied_at, created_at, updated_at,
     job_post: {
       title,      ← job title  ✅ use this
       location,
       salary,
       status,     ← JOB status (open/closed) — NOT the same as app status
       ...
     }
   }
═══════════════════════════════════════════ */
function renderApplicationStatus() {
    const container = $("appStatusList");
    if (!container) return;

    if (State.loading.apps) { renderSkeletons(container, 2); return; }

    if (State.applications.length === 0) {
        container.innerHTML = `<p class="empty-msg" style="padding:16px 0;">No applications yet.</p>`;
        return;
    }

    container.innerHTML = State.applications.slice(0, 4).map((app) => {
        // ✅ Title is nested inside job_post
        const jobTitle  = app.job_post?.title    || "Childcare Job";
        const location  = app.job_post?.location || "";

        // ✅ Application-level status (top-level field)
        // Backend may not have this column yet — defaults to "Pending"
        const appStatus  = app.status || "Pending";
        const badgeClass = appStatus.toLowerCase().replace(/\s+/g, "_");

        return `
        <div class="status-row">
            <div class="status-info">
                <strong>${jobTitle}</strong>
                <p>${location ? location + " · " : ""}${relativeTime(app.applied_at)}</p>
            </div>
            <span class="status-badge ${badgeClass}">${appStatus}</span>
        </div>`;
    }).join("");
}

/* ═══════════════════════════════════════════
   UI: ACTIVE MATCHES
═══════════════════════════════════════════ */
function renderActiveMatches() {
    const container = $("activeMatchesList");
    if (!container) return;

    const matches = State.matches;

    if (matches.length === 0) {
        container.innerHTML = `
        <div class="seeking-block">
            <i class="fas fa-user-friends"></i>
            <p>Seeking new matches?</p>
            <button onclick="window.location.href='browse-jobs.html'">Browse Jobs</button>
        </div>`;
        return;
    }

    // Helper to extract family name — matches MatchResponse schema
    // match.family.name comes from FamilyBrief in match_schema.py
    const familyName = (m) => m.family?.name || "Family";

    container.innerHTML = matches.slice(0, 5).map((m) => {
        const name    = familyName(m);
        const title   = m.job_post?.title || "Nanny Position";
        const initStr = initials(name);
        return `
        <div class="match-card">
            <div class="match-avatar">${initStr}</div>
            <div class="match-info">
                <strong>${name}</strong>
                <p>${title}</p>
            </div>
            <span class="match-status">Active</span>
        </div>`;
    }).join("") +
    `<button class="btn-manage" onclick="window.location.href='matches.html'">
        View All Matches
    </button>`;
}

/* ═══════════════════════════════════════════
   JOB MODAL
═══════════════════════════════════════════ */
function openJobModal(jobId) {
    const job = State.allJobs.find((j) => String(j.id) === String(jobId));
    if (!job) return;

    const applied = State.appliedJobIds.has(String(jobId));

    $("modalBody").innerHTML = `
        <div class="modal-header">
            <div>
                <h3>${job.title || "Nanny Position"}</h3>
                <p>${job.location || "Location TBD"}</p>
            </div>
            <button class="modal-close" onclick="window._closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="modal-detail-grid">
                <div class="detail-chip">
                    <label>Pay</label>
                    <span>Ksh ${(job.salary || 0).toLocaleString()}/mo</span>
                </div>
                <div class="detail-chip">
                    <label>Experience</label>
                    <span>${job.required_experience || 0} years</span>
                </div>
                <div class="detail-chip">
                    <label>Schedule</label>
                    <span>${job.availability || "Full-Time"}</span>
                </div>
                <div class="detail-chip">
                    <label>Care Needs</label>
                    <span>${job.care_needs || "General"}</span>
                </div>
            </div>
            ${job.duties ? `<p class="modal-desc">${job.duties}</p>` : ""}
        </div>
        <div class="modal-footer">
            <button class="btn-apply" id="applyBtn"
                ${applied ? "disabled" : ""}
                onclick="window._handleApply('${job.id}')">
                ${applied ? "Already Applied ✓" : "Apply Now"}
            </button>
            <button class="btn-secondary" onclick="window._closeModal()">Close</button>
        </div>`;

    $("jobModal").classList.add("open");
}

function closeModal() {
    $("jobModal")?.classList.remove("open");
}

async function handleApply(jobId) {
    if (State.appliedJobIds.has(String(jobId))) return;

    const btn = $("applyBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Applying…"; }

    const res = await applyToJob(jobId);

    if (res.success) {
        State.appliedJobIds.add(String(jobId));

        // ✅ Mirror exact API shape so renderApplicationStatus works immediately
        const matchedJob = State.allJobs.find(j => String(j.id) === String(jobId));
        State.applications.unshift({
            id: res.data?.id || null,
            job_id: jobId,
            applied_at: new Date().toISOString(),
            status: "Pending",       // top-level application status
            job_post: {              // mirrors API response shape
                title:    matchedJob?.title    || "Childcare Job",
                location: matchedJob?.location || "",
            }
        });

        renderApplicationStatus();
        updateStats();
        renderJobs();
        closeModal();
        showToast("Application submitted successfully!", "success");
    } else {
        if (btn) { btn.disabled = false; btn.textContent = "Apply Now"; }
        showToast(res.message || "Could not apply. Try again.", "error");
    }
}

// Expose to inline onclick handlers
window._openJobModal = openJobModal;
window._closeModal   = closeModal;
window._handleApply  = handleApply;

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
/* ── Auto-set active nav based on current page ── */
function setupActiveNav() {
  const page = window.location.pathname.split("/").pop() || "nannydashboard.html";
  document.querySelectorAll(".sidebar-nav a").forEach(a => {
    a.classList.remove("active");
    const href = (a.getAttribute("href") || "").split("/").pop();
    if (href === page) a.classList.add("active");
  });
}

function setupSidebar() {
    const toggle  = $("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    let overlay = document.querySelector(".sidebar-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        document.body.appendChild(overlay);
    }

    const openSidebar  = () => {
        sidebar?.classList.add("open");
        overlay.classList.add("active");
        toggle?.querySelector("i")?.classList.replace("fa-bars", "fa-times");
    };
    const closeSidebar = () => {
        sidebar?.classList.remove("open");
        overlay.classList.remove("active");
        toggle?.querySelector("i")?.classList.replace("fa-times", "fa-bars");
    };

    toggle?.addEventListener("click", (e) => {
        e.stopPropagation();
        sidebar?.classList.contains("open") ? closeSidebar() : openSidebar();
    });
    overlay.addEventListener("click", closeSidebar);
    window.addEventListener("resize", () => { if (window.innerWidth > 768) closeSidebar(); });
}

/* ═══════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════ */
function setupEventListeners() {
    let debounceTimer;
    $("keywordSearch")?.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            State.currentFilters.keyword = e.target.value;
            renderJobs();
        }, 250);
    });

    $("jobModal")?.addEventListener("click", (e) => {
        if (e.target === $("jobModal")) closeModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
}

/* ═══════════════════════════════════════════
   POLLING — refresh every 60s
═══════════════════════════════════════════ */
function startPolling() {
    setInterval(async () => {
        try {
            const [jobsRes, appsRes] = await Promise.all([
                getAllJobs(),
                getNannyApplications()
            ]);

            if (jobsRes.success) {
                State.allJobs = jobsRes.data || [];
                renderJobs();
            }

            if (appsRes.success) {
                const newApps = appsRes.data || [];
                // Notify on status change
                newApps.forEach((a) => {
                    const old = State.applications.find((x) => x.job_id === a.job_id);
                    if (old && old.status !== a.status) {
                        showToast(
                            `"${a.job_post?.title || "Application"}" updated → ${a.status}`,
                            "info"
                        );
                    }
                });
                State.applications = newApps;
                State.appliedJobIds = new Set(newApps.map((a) => String(a.job_id)).filter(Boolean));
                renderApplicationStatus();
                updateStats();
            }
        } catch (e) { /* silent */ }
    }, 60_000);
}
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById('btnLogout');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent page jump
            
            // 1. Clear Auth Data
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_role");
            localStorage.removeItem("user_id");
            
            // 2. Redirect to landing/login
            showToast("You have been signed out.", "info");

            // 3. Redirect to login page after a short delay to allow the toast to be seen
            setTimeout(() => {
            window.location.href = "../../views/login.html"; // Use a path relative to the server root
            }, 1500); 
        });
    }
});
/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
async function initializeDashboard() {
    setupActiveNav();
    setupSidebar();
    setupEventListeners();

    // Show skeletons immediately while data loads
    renderJobs();
    renderApplicationStatus();

    try {
        const [jobsRes, appsRes, profileRes, matchesRes] = await Promise.all([
            getAllJobs(),
            getNannyApplications(),
            getProfileData(),
            getMatches(),
        ]);

        // Profile
        State.loading.profile = false;
        if (profileRes.success && profileRes.data) {
            State.user = profileRes.data;
            updateProfileUI();
        }

        // Jobs
        State.loading.jobs = false;
        if (jobsRes.success) State.allJobs = jobsRes.data || [];
        renderJobs();
        updateStats();

        // Applications
        State.loading.apps = false;
        if (appsRes.success) {
            State.applications = appsRes.data || [];
            // Seed applied IDs from job_id (not application id)
            State.applications.forEach((app) => {
                if (app.job_id) State.appliedJobIds.add(String(app.job_id));
            });
        }
        renderApplicationStatus();

        // Matches — real data from GET /matches/
        if (matchesRes.success) {
            State.matches = matchesRes.data || [];
        }
        // Update match count stat card with real count
        safeText("statMatches", State.matches.length);
        renderActiveMatches();

        updateStats();
        startPolling();

    } catch (err) {
        console.error("Dashboard init error:", err);
        State.loading = { jobs: false, apps: false, profile: false };
        renderJobs();
        renderApplicationStatus();
        showToast("Some data could not be loaded.", "error");
    }
}

document.addEventListener("DOMContentLoaded", initializeDashboard);