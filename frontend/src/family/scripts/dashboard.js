import { API_URL } from "../../utils/config.js";

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const safeText = (id, v) => { const el=$(id); if(el) el.textContent = v ?? ""; };
const safeHTML = (id, v) => { const el=$(id); if(el) el.innerHTML  = v ?? ""; };

function authHeaders() {
  return {
    "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  };
}

function showToast(msg, type = "info") {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${{success:"✓",error:"✕",info:"ℹ"}[type]}</span> ${msg}`;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3500);
}

function initials(name = "") {
  return (name || "").trim().split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("") || "F";
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", {day:"numeric", month:"short"});
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-KE", {day:"numeric", month:"short", year:"numeric"});
}

function statusBadge(raw) {
  const s = (raw || "").toLowerCase().replace(/[_\s]/g, "");
  const map = {
    new:         ["new",          "New"],
    pending:     ["new",          "New"],
    reviewing:   ["reviewing",    "Reviewing"],
    review:      ["reviewing",    "Reviewing"],
    shortlisted: ["shortlisted",  "Shortlisted"],
    accepted:    ["accepted",     "Accepted"],
    hired:       ["accepted",     "Hired"],
    rejected:    ["rejected",     "Rejected"],
    withdrawn:   ["rejected",     "Withdrawn"],
    matched:     ["matched",      "Matched"],
  };
  const [cls, label] = map[s] || ["pending", raw || "Pending"];
  return `<span class="status-badge ${cls}">${label}</span>`;
}

/* ─────────────────────────────────────────────
   STATE
───────────────────────────────────────────── */
const State = {
  family:       null,
  jobs:         [],
  applications: [],
  matches:      [],
  contracts:    [],
  currentUserId: null,
};

/* ─────────────────────────────────────────────
   API CALLS
   NOTE: Adjust route paths to match your actual
   backend endpoints.
───────────────────────────────────────────── */

async function apiFetch(path, fallback = null) {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
    if (!res.ok) {
      // Log the response body so we can see the actual error message from FastAPI
      let detail = "";
      try { detail = JSON.stringify(await res.json()); } catch {}
      console.warn(`[familyDashboard] ${path} → HTTP ${res.status}`, detail);
      return fallback;
    }
    return await res.json();
  } catch (e) {
    console.error(`[familyDashboard] ${path} fetch error:`, e);
    return fallback;
  }
}

async function fetchFamilyProfile() {
  // Auth controller (authController.js) stores user_id in localStorage at login.
  // Fall back to decoding the JWT sub claim if it's missing.
  let userId = localStorage.getItem("user_id");

  if (!userId) {
    const token = localStorage.getItem("access_token");
    if (token) {
      try { userId = JSON.parse(atob(token.split(".")[1])).sub; } catch {}
    }
  }

  if (!userId) {
    console.error("[familyDashboard] No user_id in localStorage and no JWT sub — user not logged in?");
    return null;
  }

  // console.log("[familyDashboard] Fetching family profile for user_id:", userId);
  State.currentUserId = userId;

  // NOTE: Your backend's GET /Family/{user_id} ignores the path param and
  // uses current_user.id from the JWT — so the userId in the URL doesn't
  // matter as long as the JWT Bearer token is valid.
  const profile = await apiFetch(`/Family/${userId}`, null);

  if (!profile) {
    console.warn("[familyDashboard] /Family/ returned null — family profile may not exist yet.");
  } else {
    console.log("[familyDashboard] Family profile loaded:");
  }

  return profile;
}

async function fetchFamilyJobs() {
  // Requires: GET /jobs/family/me — see family_dashboard_routes.py
  const data = await apiFetch("/job/family/me", []);
  const jobs = Array.isArray(data) ? data : (data?.jobs || data?.data || []);
  console.log(`[familyDashboard] Jobs loaded: ${jobs.length}`);
  return jobs;
}

async function fetchApplicationsForFamily() {
  // Requires: GET /applications/family/me — see family_dashboard_routes.py
  const data = await apiFetch("/applications/family/me", []);
  const apps = Array.isArray(data) ? data : (data?.applications || data?.data || []);
  console.log(`[familyDashboard] Applications loaded: ${apps.length}`);
  return apps;
}

async function fetchMatches() {
  // GET /matches/ — already exists; returns matches for current user
  const data = await apiFetch("/matches/", []);
  const matches = Array.isArray(data) ? data : (data?.matches || data?.data || []);
  console.log(`[familyDashboard] Matches loaded: ${matches.length}`);
  return matches;
}

async function fetchContracts() {
  // Requires: GET /contracts/me — see family_dashboard_routes.py
  const data = await apiFetch("/contracts/me", []);
  const contracts = Array.isArray(data) ? data : (data?.contracts || data?.data || []);
  console.log(`[familyDashboard] Contracts loaded: ${contracts.length}`);
  return contracts;
}

/* ─────────────────────────────────────────────
   RENDER: HEADER / WELCOME
───────────────────────────────────────────── */
function renderHeader(family) {
  const name = family?.name || "Family";
  const firstName = name.split(" ")[0];

  safeText("welcomeHeading", `Welcome back, ${name}!`);
  safeText("welcomeSub", "Your childcare management is looking great today.");
  safeText("sidebarName", name);

  const sidebarAv = $("sidebarAvatar");
  if (sidebarAv) sidebarAv.textContent = initials(name);

  // Profile completeness check
  const hasName     = !!family?.name;
  const hasLocation = !!family?.household_location;
  const hasDetails  = !!family?.household_details;
  const isComplete  = hasName && hasLocation && hasDetails;

  const pill = $("profileStatusPill");
  const statusEl = $("profileStatusText");
  if (!isComplete && pill && statusEl) {
    pill.classList.add("unverified");
    statusEl.textContent = "Complete Profile";
    pill.style.cursor = "pointer";
    pill.onclick = () => { window.location.href = "familyprofile.html"; };
  }
}

/* ─────────────────────────────────────────────
   RENDER: STATS
───────────────────────────────────────────── */
function renderStats() {
  const { jobs, applications, matches, contracts } = State;

  const activeJobs = jobs.filter(j => {
    const s = (j.status || "active").toLowerCase();
    return ["active", "open", "live"].includes(s);
  });

  const newApps = applications.filter(a => {
    const s = (a.status || "new").toLowerCase();
    return ["new", "pending"].includes(s);
  });

  const pendingMatches = matches.filter(m => {
    const s = (m.status || "").toLowerCase().replace(/_/g, "");
    return !["ended", "terminated", "cancelled", "completed"].includes(s);
  });

  const activeContracts = contracts.filter(c => {
    const s = (c.status || "active").toLowerCase();
    return ["active", "signed", "in_progress", "inprogress"].includes(s);
  });

  safeText("statActiveJobs",      activeJobs.length);
  safeText("statTotalApps",       applications.length);
  safeText("statPendingMatches",  pendingMatches.length);
  safeText("statContracts",       activeContracts.length);

  // Sub-labels
  const expiringJobs = jobs.filter(j => {
    if (!j.expires_at) return false;
    const daysLeft = Math.ceil((new Date(j.expires_at) - Date.now()) / 86400000);
    return daysLeft > 0 && daysLeft <= 7;
  });

  safeHTML("statJobsSub", expiringJobs.length > 0
    ? `<i class="fas fa-clock"></i> ${expiringJobs.length} expiring soon`
    : `<i class="fas fa-circle-dot"></i> All active`
  );

  safeHTML("statAppsSub", newApps.length > 0
    ? `<i class="fas fa-arrow-trend-up"></i> ${newApps.length} new this week`
    : `<i class="fas fa-check"></i> All reviewed`
  );

  safeHTML("statMatchesSub",
    pendingMatches.length > 0
      ? `<i class="fas fa-circle-info"></i> Awaiting your review`
      : `<i class="fas fa-check-circle"></i> No pending action`
  );

  // Find next contract payment
  const nextPayment = contracts.find(c => c.next_payment_date);
  if (nextPayment) {
    const daysUntil = Math.ceil((new Date(nextPayment.next_payment_date) - Date.now()) / 86400000);
    safeHTML("statContractsSub", `<i class="fas fa-calendar-days"></i> Next payment in ${daysUntil}d`);
  } else if (activeContracts.length > 0) {
    safeHTML("statContractsSub", `<i class="fas fa-check"></i> Up to date`);
  } else {
    safeHTML("statContractsSub", `<i class="fas fa-file-circle-plus"></i> No active contracts`);
  }
}

/* ─────────────────────────────────────────────
   RENDER: JOB POSTS
───────────────────────────────────────────── */
function renderJobPosts() {
  const el = $("jobPostsList");
  if (!el) return;

  const jobs = State.jobs.filter(j => {
    const s = (j.status || "active").toLowerCase();
    return ["active", "open", "live"].includes(s);
  });

  if (jobs.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-briefcase"></i>
        <p>No active job posts yet. Start by posting your first job.</p>
        <a href="postjob.html"><i class="fas fa-plus"></i> Post a Job</a>
      </div>`;
    return;
  }

  const icons = ["fa-baby","fa-child","fa-person","fa-house-chimney-user","fa-star"];

  el.innerHTML = jobs.slice(0, 4).map((job, idx) => {
    const appCount = State.applications.filter(a =>
      String(a.job_id || a.job_post?.id) === String(job.id)
    ).length;

    const newCount = State.applications.filter(a =>
      String(a.job_id || a.job_post?.id) === String(job.id) &&
      ["new", "pending"].includes((a.status || "").toLowerCase())
    ).length;

    const posted = job.created_at
      ? `Posted ${timeAgo(job.created_at)}`
      : "";
    const meta = [posted, job.location, job.availability].filter(Boolean).join(" · ");

    return `
      <a class="job-post-row" href="familyjobs.html?id=${job.id}">
        <div class="job-post-icon">
          <i class="fas ${icons[idx % icons.length]}"></i>
        </div>
        <div class="job-post-info">
          <strong>${job.title || "Untitled Job"}</strong>
          <span>${meta || "—"}</span>
        </div>
        <div class="job-post-stat">
          <span class="applicant-count">${appCount} Applicant${appCount !== 1 ? "s" : ""}</span>
          ${newCount > 0 ? `<span class="applicant-new">${newCount} new</span>` : `<span class="applicant-new" style="color:var(--text-light)">0 new</span>`}
        </div>
        <i class="fas fa-chevron-right job-post-chevron"></i>
      </a>`;
  }).join("");
}

/* ─────────────────────────────────────────────
   RENDER: RECENT APPLICANTS
───────────────────────────────────────────── */
function renderRecentApplicants() {
  const tbody = $("applicantsBody");
  if (!tbody) return;

  const apps = State.applications.slice(0, 5);

  if (apps.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No applications yet. Post a job to start receiving applications.</p>
            <a href="postjob.html"><i class="fas fa-plus"></i> Post a Job</a>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = apps.map(app => {
    const nanny = app.nanny || {};
    const name  = nanny.name || app.nanny_name || "Applicant";
    const exp   = nanny.years_experience;
    const photo = nanny.profile_photo_url;
    const jobTitle = app.job_post?.title || app.job_title || "—";
    const when  = timeAgo(app.applied_at || app.created_at);

    const avatarHTML = photo
      ? `<img src="${photo}" alt="${name}">`
      : initials(name);

    const expLabel = exp != null
      ? `${exp} yrs exp · ${when}`
      : when;

    return `
      <tr>
        <td>
          <div class="applicant-cell">
            <div class="applicant-avatar">${avatarHTML}</div>
            <div>
              <span class="applicant-name">${name}</span>
              <span class="applicant-exp">★ ${nanny.rating ? Number(nanny.rating).toFixed(1) : "N/A"} · ${expLabel}</span>
            </div>
          </div>
        </td>
        <td>${jobTitle}</td>
        <td>${statusBadge(app.status)}</td>
        <td class="td-actions">
          <div class="action-btns">
            <a class="act-btn accept" href="familyapplications.html?id=${app.id}&action=accept"
               title="Accept">
              <i class="fas fa-check"></i>
            </a>
            <a class="act-btn reject" href="familyapplications.html?id=${app.id}&action=reject"
               title="Decline">
              <i class="fas fa-xmark"></i>
            </a>
            <a class="act-btn" href="familyapplications.html?id=${app.id}"
               title="Message">
              <i class="fas fa-message"></i>
            </a>
          </div>
        </td>
      </tr>`;
  }).join("");

  // Show "view N more" link
  const remaining = State.applications.length - 5;
  const row = $("viewMoreRow");
  const lnk = $("viewMoreLink");
  const lbl = $("viewMoreLabel");
  if (row && remaining > 0) {
    row.style.display = "block";
    if (lbl) lbl.textContent = `View ${remaining} more applicant${remaining !== 1 ? "s" : ""}`;
  }
}

/* ─────────────────────────────────────────────
   RENDER: MATCHES IN PROGRESS
───────────────────────────────────────────── */
function renderMatches() {
  const el = $("matchesList");
  if (!el) return;

  const activeMatches = State.matches.filter(m => {
    const s = (m.status || "").toLowerCase().replace(/_/g, "");
    return !["ended", "terminated", "cancelled", "completed"].includes(s);
  }).slice(0, 3);

  if (activeMatches.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:24px 16px">
        <i class="fas fa-handshake"></i>
        <p>No active matches yet. Review your applications to create a match.</p>
        <a href="familyapplications.html"><i class="fas fa-inbox"></i> View Applications</a>
      </div>`;
    return;
  }

  // Map status → stage display
  const stageMap = {
    interviewing:   ["interviewing", "Interviewing",    60],
    background:     ["background",   "Background Check", 75],
    offer:          ["offer",        "Offer Sent",       85],
    negotiating:    ["negotiating",  "Negotiating",      50],
    matched:        ["offer",        "Matched",          90],
    active:         ["offer",        "Active",           100],
    confirmed:      ["offer",        "Confirmed",        95],
    awaiting_payment: ["background", "Awaiting Payment", 40],
    nanny_paid:     ["background",   "Nanny Paid",       50],
    both_paid:      ["offer",        "Both Paid",        80],
    pending:        ["interviewing", "Pending",          30],
  };

  el.innerHTML = activeMatches.map(match => {
    const nanny = match.selected_nanny || match.nanny || {};
    const nannyName = nanny.name || "Nanny";
    const exp = nanny.years_experience;
    const photo = nanny.profile_photo_url;

    const rawStatus = (match.status || "pending").toLowerCase().replace(/ /g,"_");
    const [stageClass, stageLabel, progress] = stageMap[rawStatus] || ["interviewing", "Pending", 30];

    const avatarHTML = photo
      ? `<img src="${photo}" alt="${nannyName}">`
      : initials(nannyName);

    // next action hint
    const nextNote = match.next_action || match.notes || "";

    return `
      <div class="match-item">
        <div class="match-item-top">
          <div class="match-avatar">${avatarHTML}</div>
          <div class="match-info">
            <strong>${nannyName}</strong>
            <span>${exp != null ? `${exp} yrs exp` : "Nanny"}</span>
          </div>
          <span class="match-stage ${stageClass}">${stageLabel}</span>
        </div>
        <div class="match-progress-bar">
          <div class="match-progress-fill" style="width:${progress}%"></div>
        </div>
        ${nextNote ? `
        <div class="match-next">
          <i class="fas fa-calendar-check"></i>
          Next: ${nextNote}
        </div>` : ""}
      </div>`;
  }).join("");
}

/* ─────────────────────────────────────────────
   RENDER: CONTRACT OVERVIEW
───────────────────────────────────────────── */
function renderContractOverview() {
  const el = $("contractOverview");
  if (!el) return;

  const active = State.contracts.filter(c =>
    ["active", "signed", "in_progress"].includes((c.status || "").toLowerCase())
  );

  if (active.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:16px 0 4px">
        <i class="fas fa-file-contract"></i>
        <p>No active contracts yet.</p>
        <a href="familycontracts.html"><i class="fas fa-eye"></i> View Contracts</a>
      </div>`;
    return;
  }

  const c = active[0]; // show most recent active contract
  const nannyName = c.nanny?.name || c.nanny_name || "Your Nanny";
  const started   = fmtDate(c.start_date || c.created_at);
  const nextPay   = fmtDate(c.next_payment_date);

  // Progress: months paid / total months
  const totalMonths   = c.duration_months || 12;
  const monthsPaid    = c.months_paid    || 0;
  const progressPct   = Math.round((monthsPaid / totalMonths) * 100);

  el.innerHTML = `
    <div class="contract-card">
      <div class="contract-card-label">
        <i class="fas fa-circle-check"></i> Active Contract
      </div>
      <div class="contract-nanny-name">${nannyName}</div>
      <div class="contract-dates">
        <div class="contract-date-item">
          <label>Started</label>
          <span>${started}</span>
        </div>
        <div class="contract-date-item">
          <label>Next Pay</label>
          <span>${nextPay || "—"}</span>
        </div>
      </div>
      <div class="contract-progress-label">Payment Progress</div>
      <div class="contract-bar">
        <div class="contract-bar-fill" style="width:${progressPct}%"></div>
      </div>
      <div class="contract-progress-sub">Month ${monthsPaid} of ${totalMonths}</div>
    </div>`;

  // Animate bar
  setTimeout(() => {
    const fill = el.querySelector(".contract-bar-fill");
    if (fill) fill.style.width = `${progressPct}%`;
  }, 200);
}

/* ─────────────────────────────────────────────
   SKELETONS
───────────────────────────────────────────── */
function renderSkeletons() {
  const skRow = () => `
    <div class="skeleton-row">
      <div class="skeleton" style="width:34px;height:34px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:5px">
        <div class="skeleton" style="width:55%;height:11px"></div>
        <div class="skeleton" style="width:35%;height:9px"></div>
      </div>
      <div class="skeleton" style="width:70px;height:22px;border-radius:99px"></div>
    </div>`;

  // Job posts
  const jobs = $("jobPostsList");
  if (jobs) jobs.innerHTML = [1,2].map(skRow).join("");

  // Applicants table
  const tbody = $("applicantsBody");
  if (tbody) tbody.innerHTML = [1,2,3].map(() => `
    <tr>
      <td colspan="4">${skRow()}</td>
    </tr>`).join("");

  // Matches
  const matches = $("matchesList");
  if (matches) matches.innerHTML = [1,2].map(skRow).join("");
}

/* ─────────────────────────────────────────────
   ACTIVE NAV
───────────────────────────────────────────── */
function setupActiveNav() {
  const page = window.location.pathname.split("/").pop() || "familydashboard.html";
  document.querySelectorAll(".sidebar-nav a").forEach(a => {
    a.classList.remove("active");
    const href = (a.getAttribute("href") || "").split("/").pop();
    if (href === page) a.classList.add("active");
  });
}

/* ─────────────────────────────────────────────
   SIDEBAR TOGGLE
───────────────────────────────────────────── */
function setupSidebar() {
  const toggle  = $("menuToggle");
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  const open  = () => { sidebar?.classList.add("open"); overlay?.classList.add("active"); toggle?.querySelector("i")?.classList.replace("fa-bars","fa-times"); };
  const close = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("active"); toggle?.querySelector("i")?.classList.replace("fa-times","fa-bars"); };
  toggle?.addEventListener("click", e => { e.stopPropagation(); sidebar?.classList.contains("open") ? close() : open(); });
  overlay?.addEventListener("click", close);
}

document.getElementById('btnLogout')?.addEventListener('click', () => {
    // 1. Clear the authentication tokens
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id"); // Optional: clear user_id if stored

    // 2. Show a toast notification
    showToast("You have been signed out.", "info");

    // 3. Redirect to login page after a short delay to allow the toast to be seen
    setTimeout(() => {
      window.location.href = "../../views/login.html"; // Use a path relative to the server root
    }, 1500); 
});

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
async function init() {
  // ── Auth guard ────────────────────────────────────────────────────
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.href = "/frontend/src/views/login.html";
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = "/frontend/src/views/login.html";
      return;
    }
    // // ── Debug: log everything stored at login ──────────────────────
    // console.log("[familyDashboard] Auth payload:", {
    //   sub:      payload.sub,
    //   role:     payload.role,
    //   email:    payload.email,
    //   exp:      new Date(payload.exp * 1000).toISOString(),
    // });
    // console.log("[familyDashboard] localStorage:", {
    //   user_id:   localStorage.getItem("user_id"),
    //   user_role: localStorage.getItem("user_role"),
    //   token_present: !!token,
    // });
  } catch (e) {
    console.error("[familyDashboard] JWT decode error:", e);
  }
  // ─────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────

  setupActiveNav();
  setupSidebar();
  renderSkeletons();

  try {
    // Phase 1: profile (sets State.currentUserId internally)
    const family = await fetchFamilyProfile();
    State.family = family;

    if (!family) {
      showToast("Please complete your family profile first.", "info");
      // setTimeout(() => { window.location.href = "familyprofile.html"; }, 2000);
    } else {
      renderHeader(family);
    }

    // Phase 2: all other data in parallel
    const [jobs, applications, matches, contracts] = await Promise.all([
      fetchFamilyJobs(),
      fetchApplicationsForFamily(),
      fetchMatches(),
      fetchContracts(),
    ]);

    State.jobs         = jobs;
    State.applications = applications;
    State.matches      = matches;
    State.contracts    = contracts;

    renderStats();
    renderJobPosts();
    renderRecentApplicants();
    renderMatches();
    renderContractOverview();

  } catch (err) {
    console.error("[familyDashboard] init error:", err);
    showToast("Some data failed to load. Please refresh.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);