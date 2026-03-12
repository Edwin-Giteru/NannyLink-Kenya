import { API_URL } from "../../src/utils/config.js";

/* ═══════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const safeText = (id, val) => { const el = $(id); if (el) el.textContent = val ?? ""; };

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

function showToast(message, type = "info") {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span> ${message}`;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3500);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function relativeTime(dateStr) {
  if (!dateStr) return "—";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

const availMap = {
  full_time: "Full-Time", part_time: "Part-Time",
  live_in: "Live-In", on_call: "On-Call",
  FULL_TIME: "Full-Time", PART_TIME: "Part-Time",
  LIVE_IN: "Live-In", ON_CALL: "On-Call",
};

/* ═══════════════════════════════════════════
   STATUS HELPERS
═══════════════════════════════════════════ */

// Normalise any casing variant of status into a lowercase key
function normaliseStatus(raw) {
  return (raw || "pending").toLowerCase().replace(/\s+/g, "_");
}

// Human-readable label + badge CSS class for each status
const STATUS_META = {
  pending:   { label: "Pending",      cls: "pending"   },
  reviewing: { label: "Under Review", cls: "reviewing" },
  review:    { label: "Under Review", cls: "reviewing" },
  interview: { label: "Interview",    cls: "interview" },
  accepted:  { label: "Accepted",     cls: "accepted"  },
  rejected:  { label: "Rejected",     cls: "rejected"  },
  withdrawn: { label: "Withdrawn",    cls: "withdrawn" },
};

function statusMeta(raw) {
  return STATUS_META[normaliseStatus(raw)] || { label: raw || "Pending", cls: "pending" };
}

// Which step index each status corresponds to in the timeline
const TIMELINE_STEPS = ["pending", "reviewing", "interview", "accepted"];

function timelineIndex(status) {
  return TIMELINE_STEPS.indexOf(normaliseStatus(status));
}

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const APPS_PER_PAGE = 8;

const State = {
  allApplications: [],      // raw from API
  filteredApplications: [], // after search + status filter + sort
  currentPage: 1,
  activeStatus: "all",      // currently selected status tab
  keyword: "",
  sort: "newest",
  // for withdraw flow
  pendingWithdrawId: null,
  pendingWithdrawTitle: "",
};

/* ═══════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════ */

// GET /Nanny/applications/me  → nanny's own applications
async function fetchApplications() {
  const res = await fetch(`${API_URL}/Nanny/applications/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Applications fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.applications || []);
}

// GET /Nanny/profile/me  → for header name/avatar
async function fetchProfile() {
  try {
    const res = await fetch(`${API_URL}/Nanny/profile/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// DELETE /application/{application_id}  → withdraw a single application
// Backend now verifies nanny ownership server-side using the JWT token.
// Returns { "detail": "Application deleted successfully." } on success.
async function withdrawApplication(applicationId) {
  const res = await fetch(`${API_URL}/application/${applicationId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Withdraw failed");
  }

  // Read the success message from the response body
  const body = await res.json().catch(() => ({}));
  return body.detail || "Application withdrawn successfully.";
}

// GET /application/{application_id}  → full job detail for modal
async function fetchApplicationDetail(applicationId) {
  const res = await fetch(`${API_URL}/application/${applicationId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Could not load application details");
  return res.json();
}

/* ═══════════════════════════════════════════
   FILTER + SORT
═══════════════════════════════════════════ */
function applyFiltersAndSort() {
  const kw = State.keyword.toLowerCase().trim();

  let result = State.allApplications.filter(app => {
    const title    = (app.job_post?.title    || "").toLowerCase();
    const location = (app.job_post?.location || "").toLowerCase();
    const status   = normaliseStatus(app.status);

    // Keyword filter
    if (kw && !title.includes(kw) && !location.includes(kw)) return false;

    // Status tab filter
    if (State.activeStatus !== "all" && status !== State.activeStatus) return false;

    return true;
  });

  // Sort
  switch (State.sort) {
    case "oldest":
      result.sort((a, b) => new Date(a.applied_at || 0) - new Date(b.applied_at || 0));
      break;
    case "salary_high":
      result.sort((a, b) => (b.job_post?.salary || 0) - (a.job_post?.salary || 0));
      break;
    case "salary_low":
      result.sort((a, b) => (a.job_post?.salary || 0) - (b.job_post?.salary || 0));
      break;
    default: // newest
      result.sort((a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0));
  }

  State.filteredApplications = result;
  State.currentPage = 1;
}

/* ═══════════════════════════════════════════
   RENDER: STAT CARDS
═══════════════════════════════════════════ */
function renderStats() {
  const apps = State.allApplications;

  const counts = {
    total:     apps.length,
    pending:   0,
    reviewing: 0,
    interview: 0,
    accepted:  0,
    rejected:  0,
  };

  apps.forEach(app => {
    const s = normaliseStatus(app.status);
    if (s === "reviewing" || s === "review") counts.reviewing++;
    else if (counts[s] !== undefined) counts[s]++;
  });

  safeText("statTotal",     counts.total);
  safeText("statPending",   counts.pending);
  safeText("statReviewing", counts.reviewing);
  safeText("statInterview", counts.interview);
  safeText("statAccepted",  counts.accepted);
  safeText("statRejected",  counts.rejected);
}

/* ═══════════════════════════════════════════
   RENDER: SKELETONS
═══════════════════════════════════════════ */
function renderSkeletons() {
  const list = $("applicationsList");
  list.innerHTML = Array.from({ length: 5 }, () => `
    <div class="app-skeleton">
      <div class="skeleton app-sk-strip"></div>
      <div class="app-sk-inner">
        <div class="skeleton app-sk-icon"></div>
        <div class="app-sk-body">
          <div class="skeleton app-sk-line w75"></div>
          <div class="skeleton app-sk-line w45"></div>
          <div class="skeleton app-sk-line w30"></div>
        </div>
        <div class="app-sk-right">
          <div class="skeleton app-sk-badge"></div>
          <div class="skeleton app-sk-btn"></div>
        </div>
      </div>
    </div>`).join("");
}

/* ═══════════════════════════════════════════
   RENDER: APPLICATION CARDS
═══════════════════════════════════════════ */
function renderApplications() {
  const list = $("applicationsList");
  if (!list) return;

  const total = State.filteredApplications.length;
  const start = (State.currentPage - 1) * APPS_PER_PAGE;
  const page  = State.filteredApplications.slice(start, start + APPS_PER_PAGE);

  if (total === 0) {
    const isFiltered = State.activeStatus !== "all" || State.keyword;
    list.innerHTML = `
      <div class="apps-empty">
        <i class="fas fa-paper-plane"></i>
        <h3>${isFiltered ? "No matching applications" : "No applications yet"}</h3>
        <p>${isFiltered
          ? "Try adjusting your search or status filter."
          : "Start browsing jobs and apply to ones that interest you."}</p>
        ${!isFiltered ? `<a href="browse-jobs.html" class="btn-browse-jobs">
          <i class="fas fa-search"></i> Browse Jobs
        </a>` : ""}
      </div>`;
    renderPagination(0);
    return;
  }

  list.innerHTML = page.map((app, i) => buildAppCard(app, i)).join("");
  renderPagination(total);
}

/* ── Build a single application card ── */
function buildAppCard(app, i) {
  const title      = app.job_post?.title    || "Nanny Position";
  const location   = app.job_post?.location || "Location TBD";
  const salary     = app.job_post?.salary
    ? `Ksh ${Number(app.job_post.salary).toLocaleString()}/mo`
    : "Salary negotiable";
  const schedule   = availMap[app.job_post?.availability] || app.job_post?.availability || "";
  const { label: statusLabel, cls: statusCls } = statusMeta(app.status);
  const withdrawn  = normaliseStatus(app.status) === "withdrawn";
  const canWithdraw = !withdrawn && !["accepted", "rejected"].includes(normaliseStatus(app.status));
  const tidx       = timelineIndex(app.status);

  return `
  <div class="app-card status-${statusCls}" style="animation-delay:${i * 0.06}s">
    <div class="app-card-inner">

      <!-- Top row: icon + info (stacked on mobile, inline on desktop) -->
      <div class="app-card-top-row">
        <div class="app-card-icon"><i class="fas fa-baby"></i></div>

        <div class="app-card-info">
          <div class="app-card-title">${title}</div>
          <div class="app-card-meta">
            <span class="app-meta-item">
              <i class="fas fa-map-marker-alt"></i> ${location}
            </span>
            <span class="app-meta-item">
              <i class="fas fa-coins"></i> ${salary}
            </span>
            <span class="app-meta-item">
              <i class="fas fa-calendar-alt"></i> Applied ${relativeTime(app.applied_at)}
            </span>
          </div>
          <div class="app-card-chips">
            ${schedule ? `<span class="app-chip">${schedule}</span>` : ""}
            ${app.job_post?.care_needs ? `<span class="app-chip">${app.job_post.care_needs}</span>` : ""}
          </div>
        </div>
      </div>

      <!-- Bottom row: status + date + actions (always full-width row) -->
      <div class="app-card-right">
        <span class="status-badge ${statusCls}">${statusLabel}</span>
        <span class="app-card-date">${formatDate(app.applied_at)}</span>
        <div class="app-card-actions">
          <button class="btn-view-job"
            onclick="window._openJobModal('${app.id}')">
            <i class="fas fa-eye"></i> View Job
          </button>
          ${canWithdraw
            ? `<button class="btn-withdraw"
                onclick="window._confirmWithdraw('${app.id}', '${title.replace(/'/g, "\\'")}')">
                <i class="fas fa-times"></i> Withdraw
              </button>`
            : withdrawn
            ? `<span class="btn-withdrawn-label">
                <i class="fas fa-ban"></i> Withdrawn
              </span>`
            : ""}
        </div>
      </div>

    </div>

    <!-- Progress timeline (hidden on mobile) -->
    ${buildTimeline(tidx, withdrawn)}
  </div>`;
}

/* ── Build the mini progress timeline inside each card ── */
function buildTimeline(activeIdx, withdrawn) {
  if (withdrawn) return ""; // don't show timeline for withdrawn apps

  const steps = ["Applied", "Reviewing", "Interview", "Accepted"];

  let html = `<div class="app-timeline">`;
  steps.forEach((step, i) => {
    const dotCls = i < activeIdx ? "done" : i === activeIdx ? "active" : "";
    const lineCls = i < activeIdx ? "done" : "";
    html += `<div class="timeline-step">
      <div class="timeline-dot ${dotCls}" title="${step}"></div>
      ${i < steps.length - 1 ? `<div class="timeline-line ${lineCls}"></div>` : ""}
    </div>`;
  });
  html += `</div>`;
  return html;
}

/* ═══════════════════════════════════════════
   RENDER: PAGINATION
═══════════════════════════════════════════ */
function renderPagination(total) {
  const container = $("pagination");
  if (!container) return;

  const totalPages = Math.ceil(total / APPS_PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ""; return; }

  const cur    = State.currentPage;
  const show   = new Set([1, totalPages, cur, cur - 1, cur + 1].filter(p => p >= 1 && p <= totalPages));
  const sorted = [...show].sort((a, b) => a - b);

  let html = `
    <button class="page-btn${cur === 1 ? " disabled" : ""}"
      onclick="window._goPage(${cur - 1})">
      <i class="fas fa-chevron-left"></i>
    </button>`;

  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) html += `<button class="page-btn dots">…</button>`;
    html += `<button class="page-btn${p === cur ? " active" : ""}"
      onclick="window._goPage(${p})">${p}</button>`;
    prev = p;
  }

  html += `
    <button class="page-btn${cur === totalPages ? " disabled" : ""}"
      onclick="window._goPage(${cur + 1})">
      <i class="fas fa-chevron-right"></i>
    </button>`;

  container.innerHTML = html;
}

/* ═══════════════════════════════════════════
   JOB DETAIL MODAL
═══════════════════════════════════════════ */
function openJobModal(applicationId) {
  // Find the application in state first for instant render
  const app = State.allApplications.find(a => String(a.id) === String(applicationId));
  if (!app) return;

  const job      = app.job_post || {};
  const schedule = availMap[job.availability] || job.availability || "—";
  const salary   = job.salary
    ? `Ksh ${Number(job.salary).toLocaleString()}/mo`
    : "Negotiable";
  const { label: statusLabel, cls: statusCls } = statusMeta(app.status);

  $("modalBody").innerHTML = `
    <div class="modal-header">
      <div>
        <h3 style="font-family:'Fraunces',serif;color:var(--navy);font-size:1.25rem">
          ${job.title || "Nanny Position"}
        </h3>
        <p style="font-size:.95rem;color:var(--text-mid)">
          <i class="fas fa-map-marker-alt" style="color:var(--gold)"></i>
          ${job.location || "Location TBD"}
        </p>
      </div>
      <button class="modal-close" onclick="window._closeJobModal()">×</button>
    </div>

    <div class="modal-body" style="display:flex;flex-direction:column;gap:16px">

      <!-- Status row -->
      <div style="display:flex;align-items:center;gap:10px">
        <span class="status-badge ${statusCls}">${statusLabel}</span>
        <span style="font-size:.88rem;color:var(--text-light)">
          Applied ${formatDate(app.applied_at)}
        </span>
      </div>

      <!-- Detail chips -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
        ${[
          ["Salary",     salary,               "fa-coins"],
          ["Schedule",   schedule,             "fa-clock"],
          ["Experience", `${job.required_experience || 0}+ yrs`, "fa-briefcase"],
          ["Care Needs", job.care_needs || "General childcare", "fa-heart"],
        ].map(([label, val, icon]) => `
          <div style="background:var(--cream);border:1px solid var(--border);
                      border-radius:var(--radius-sm);padding:12px 14px">
            <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;
                        color:var(--text-light);font-weight:600;margin-bottom:3px">
              <i class="fas ${icon}" style="color:var(--gold);margin-right:5px"></i>${label}
            </div>
            <div style="font-size:1rem;font-weight:600;color:var(--text-dark)">${val}</div>
          </div>`).join("")}
      </div>

      ${job.duties ? `
        <div>
          <div style="font-size:.95rem;font-weight:600;color:var(--navy);margin-bottom:6px">
            <i class="fas fa-list-check" style="color:var(--gold);margin-right:6px"></i>Duties
          </div>
          <p style="font-size:.95rem;line-height:1.7;color:var(--text-mid)">${job.duties}</p>
        </div>` : ""}

      ${job.description ? `
        <div>
          <div style="font-size:.95rem;font-weight:600;color:var(--navy);margin-bottom:6px">
            <i class="fas fa-info-circle" style="color:var(--gold);margin-right:6px"></i>About the Role
          </div>
          <p style="font-size:.95rem;line-height:1.7;color:var(--text-mid)">${job.description}</p>
        </div>` : ""}
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" onclick="window._closeJobModal()">Close</button>
    </div>`;

  $("jobModal").classList.add("open");
}

function closeJobModal() { $("jobModal")?.classList.remove("open"); }

/* ═══════════════════════════════════════════
   WITHDRAW FLOW
═══════════════════════════════════════════ */

// Step 1 — open confirmation modal
function confirmWithdraw(applicationId, jobTitle) {
  State.pendingWithdrawId    = applicationId;
  State.pendingWithdrawTitle = jobTitle;
  safeText("withdrawJobTitle", jobTitle);
  $("withdrawModal").classList.add("open");
}

function closeWithdrawModal() {
  $("withdrawModal")?.classList.remove("open");
  State.pendingWithdrawId    = null;
  State.pendingWithdrawTitle = "";
}

// Step 2 — confirmed, call DELETE /application/{id}
async function executeWithdraw() {
  const id  = State.pendingWithdrawId;
  const btn = $("btnConfirmWithdraw");
  if (!id) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Withdrawing…`;

  try {
    const message = await withdrawApplication(id);

    // Update state: mark the application as withdrawn instead of removing it
    const app = State.allApplications.find(a => String(a.id) === String(id));
    if (app) app.status = "withdrawn";

    closeWithdrawModal();
    renderStats();
    applyFiltersAndSort();
    renderApplications();
    showToast(message, "success");

  } catch (err) {
    showToast(err.message || "Could not withdraw. Try again.", "error");
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-trash-alt"></i> Yes, Withdraw`;
  }
}

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
  const overlay = $("sidebarOverlay");

  const open  = () => {
    sidebar?.classList.add("open");
    overlay?.classList.add("active");
    toggle?.querySelector("i")?.classList.replace("fa-bars", "fa-times");
  };
  const close = () => {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("active");
    toggle?.querySelector("i")?.classList.replace("fa-times", "fa-bars");
  };

  toggle?.addEventListener("click",  e => { e.stopPropagation(); sidebar?.classList.contains("open") ? close() : open(); });
  overlay?.addEventListener("click", close);
  window.addEventListener("resize",  () => { if (window.innerWidth > 768) close(); });
}

/* ═══════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════ */
function setupEvents() {
  // Search with debounce
  let dbt;
  $("appSearch")?.addEventListener("input", e => {
    State.keyword = e.target.value;
    $("clearAppSearch").style.display = e.target.value ? "flex" : "none";
    clearTimeout(dbt);
    dbt = setTimeout(() => {
      applyFiltersAndSort();
      renderApplications();
    }, 260);
  });

  $("clearAppSearch")?.addEventListener("click", () => {
    $("appSearch").value = "";
    $("clearAppSearch").style.display = "none";
    State.keyword = "";
    applyFiltersAndSort();
    renderApplications();
  });

  // Status tabs
  $("statusTabs")?.addEventListener("click", e => {
    const tab = e.target.closest(".stab");
    if (!tab) return;
    document.querySelectorAll(".stab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    State.activeStatus = tab.dataset.status || "all";
    applyFiltersAndSort();
    renderApplications();
  });

  // Sort
  $("appSort")?.addEventListener("change", e => {
    State.sort = e.target.value;
    applyFiltersAndSort();
    renderApplications();
  });

  // Withdraw modal controls
  $("closeWithdrawModal")?.addEventListener("click", closeWithdrawModal);
  $("cancelWithdrawModal")?.addEventListener("click", closeWithdrawModal);
  $("btnConfirmWithdraw")?.addEventListener("click", executeWithdraw);

  // Close modals on backdrop click or Escape
  [$("jobModal"), $("withdrawModal")].forEach(modal => {
    modal?.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeJobModal();
      closeWithdrawModal();
    }
  });
}

/* ═══════════════════════════════════════════
   GLOBAL REFERENCES (for inline onclick handlers)
═══════════════════════════════════════════ */
window._openJobModal     = openJobModal;
window._closeJobModal    = closeJobModal;
window._confirmWithdraw  = confirmWithdraw;

window._goPage = (page) => {
  const total = Math.ceil(State.filteredApplications.length / APPS_PER_PAGE);
  if (page < 1 || page > total) return;
  State.currentPage = page;
  renderApplications();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
async function init() {
  setupActiveNav();
  setupSidebar();
  setupEvents();
  renderSkeletons();

  try {
    const [applications, profile] = await Promise.all([
      fetchApplications(),
      fetchProfile(),
    ]);

    State.allApplications = applications;

    // Populate header
    if (profile) {
      safeText("userName", profile.name || "Nanny User");
      const avatarEl = $("userAvatar");
      if (avatarEl) {
        avatarEl.textContent = (profile.name || "N")
          .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
      }
    }

    renderStats();
    applyFiltersAndSort();
    renderApplications();

  } catch (err) {
    console.error("Applications page init error:", err);
    $("applicationsList").innerHTML = `
      <div class="apps-empty">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Could not load applications</h3>
        <p>Please refresh the page or check your connection.</p>
      </div>`;
    showToast("Failed to load applications.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);