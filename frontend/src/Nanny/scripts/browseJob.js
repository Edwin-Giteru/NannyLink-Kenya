import { API_URL } from "../../utils/config.js";
import { applyToJob } from "../../service/nannyDashboardService.js";

/* ═══════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const safeText = (id, val) => { const el = $(id); if (el) el.textContent = val ?? ""; };

function showToast(message, type = "info") {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || "ℹ"}</span> ${message}`;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3200);
}

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

function relativeTime(dateStr) {
  if (!dateStr) return "Recently";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

function isNew(dateStr) {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr)) / 1000 < 86400 * 2; // within 48h
}

const availMap = {
  full_time: "Full-Time", part_time: "Part-Time",
  live_in: "Live-In", on_call: "On-Call",
  FULL_TIME: "Full-Time", PART_TIME: "Part-Time",
  LIVE_IN: "Live-In", ON_CALL: "On-Call",
};

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const JOBS_PER_PAGE = 6;

const State = {
  allJobs: [],
  filteredJobs: [],
  appliedIds: new Set(),
  savedIds: new Set(),
  currentPage: 1,
  viewMode: "grid",         // "grid" | "list"
  filters: {
    keyword: "",
    locations: [],
    experience: 0,
    schedules: [],
    salaryMin: 0,
    salaryMax: 200000,
  },
  sort: "newest",
};

/* ═══════════════════════════════════════════
   API
═══════════════════════════════════════════ */
async function fetchJobs() {
  const res = await fetch(`${API_URL}/job/`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.jobs || data.data || []);
}

async function fetchMyApplications() {
  try {
    const res = await fetch(`${API_URL}/Nanny/applications/me`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    const apps = Array.isArray(data) ? data : (data.applications || []);
    return apps.map(a => String(a.job_id)).filter(Boolean);
  } catch { return []; }
}

async function fetchProfile() {
  try {
    const res = await fetch(`${API_URL}/Nanny/profile/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

/* ═══════════════════════════════════════════
   FILTER + SORT
═══════════════════════════════════════════ */
function applyFiltersAndSort() {
  const { keyword, locations, experience, schedules, salaryMin, salaryMax } = State.filters;
  const kw = keyword.toLowerCase().trim();

  let result = State.allJobs.filter(job => {
    // Keyword
    if (kw && !(
      job.title?.toLowerCase().includes(kw) ||
      job.location?.toLowerCase().includes(kw) ||
      job.care_needs?.toLowerCase().includes(kw) ||
      job.duties?.toLowerCase().includes(kw)
    )) return false;

    // Location
    if (locations.length && !locations.some(l =>
      job.location?.toLowerCase().includes(l)
    )) return false;

    // Experience
    if (experience > 0 && (job.required_experience || 0) < experience) return false;

    // Schedule / availability
    if (schedules.length && !schedules.includes(
      (job.availability || "").toLowerCase()
    )) return false;

    // Salary
    const sal = job.salary || job.hourly_pay || 0;
    if (sal < salaryMin || sal > salaryMax) return false;

    return true;
  });

  // Sort
  switch (State.sort) {
    case "salary_high": result.sort((a, b) => (b.salary || 0) - (a.salary || 0)); break;
    case "salary_low":  result.sort((a, b) => (a.salary || 0) - (b.salary || 0)); break;
    case "experience":  result.sort((a, b) => (a.required_experience || 0) - (b.required_experience || 0)); break;
    default: // newest — by created_at desc
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  State.filteredJobs = result;
  State.currentPage = 1;
}

/* ═══════════════════════════════════════════
   RENDER: SKELETONS
═══════════════════════════════════════════ */
function renderSkeletons() {
  const grid = $("jobsGrid");
  grid.className = "jobs-grid";
  grid.innerHTML = Array.from({ length: 6 }, () => `
    <div class="job-card-skeleton">
      <div class="skeleton sk-image"></div>
      <div class="sk-body-wrap">
        <div class="skeleton sk-title"></div>
        <div class="skeleton sk-line short"></div>
        <div class="skeleton sk-line"></div>
        <div class="skeleton sk-line short"></div>
      </div>
      <div class="sk-footer-wrap">
        <div class="skeleton sk-line short"></div>
        <div class="skeleton sk-btn"></div>
      </div>
    </div>`).join("");
}

/* ═══════════════════════════════════════════
   RENDER: JOB CARDS
═══════════════════════════════════════════ */
function renderJobs() {
  const grid = $("jobsGrid");
  if (!grid) return;

  grid.className = `jobs-grid${State.viewMode === "list" ? " list-view" : ""}`;

  const total = State.filteredJobs.length;
  const start = (State.currentPage - 1) * JOBS_PER_PAGE;
  const page  = State.filteredJobs.slice(start, start + JOBS_PER_PAGE);

  // Update counts
  const allCount = State.allJobs.length;
  safeText("jobCountLine", `Explore ${allCount} active caregiver opportunit${allCount !== 1 ? "ies" : "y"} in your area.`);

  const countEl = $("resultsCount");
  if (countEl) {
    countEl.innerHTML = total === 0
      ? "No jobs found"
      : `Showing <strong>${start + 1}–${Math.min(start + JOBS_PER_PAGE, total)}</strong> of <strong>${total}</strong> jobs`;
  }

  if (page.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No jobs match your filters</h3>
        <p>Try adjusting your search or clearing some filters.</p>
      </div>`;
    renderPagination(0);
    return;
  }

  grid.innerHTML = page.map((job, i) => buildJobCard(job, i)).join("");
  renderPagination(total);
}

function buildJobCard(job, i) {
  const applied  = State.appliedIds.has(String(job.id));
  const saved    = State.savedIds.has(String(job.id));
  const schedule = availMap[job.availability] || job.availability || "–";
  const salary   = job.salary ? `Ksh ${Number(job.salary).toLocaleString()}` : "Negotiable";
  const badgeHtml = applied
    ? `<span class="job-card-badge applied">Applied ✓</span>`
    : isNew(job.created_at)
    ? `<span class="job-card-badge new">New</span>`
    : "";

  return `
  <div class="job-card${applied ? " applied" : ""}"
       style="animation-delay:${i * 0.07}s"
       onclick="window._openJobModal('${job.id}')">

    <div class="job-card-image">
      <div class="job-card-image-placeholder">
        <i class="fas fa-baby"></i>
      </div>
      ${badgeHtml}
      <button class="save-btn${saved ? " saved" : ""}"
        onclick="event.stopPropagation(); window._toggleSave('${job.id}')"
        title="${saved ? "Unsave" : "Save job"}">
        <i class="fa${saved ? "s" : "r"} fa-heart"></i>
      </button>
    </div>

    <div class="job-card-body">
      <h3 class="job-card-title">${job.title || "Nanny Position"}</h3>

      <div class="job-card-meta">
        <span class="job-meta-item">
          <i class="fas fa-map-marker-alt"></i> ${job.location || "Location TBD"}
        </span>
        <span class="job-meta-item">
          <i class="fas fa-briefcase"></i> ${job.required_experience || 0}+ yrs exp
        </span>
      </div>

      <div class="job-salary">
        <i class="fas fa-coins"></i> ${salary}
        <span style="font-weight:400;font-size:.85rem;color:var(--text-light)">/mo</span>
      </div>

      ${job.duties || job.description
        ? `<p class="job-card-desc">${job.duties || job.description}</p>`
        : ""}

      <div class="job-card-chips">
        <span class="job-chip">${schedule}</span>
        ${job.care_needs ? `<span class="job-chip care">${job.care_needs}</span>` : ""}
      </div>
    </div>

    <div class="job-card-footer">
      <span class="posted-time">Posted ${relativeTime(job.created_at)}</span>
      <button class="btn-apply-card${applied ? " applied-btn" : ""}"
        onclick="event.stopPropagation(); window._quickApply('${job.id}', this)"
        ${applied ? "disabled" : ""}>
        ${applied ? "Applied ✓" : "Apply Now"}
      </button>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════
   RENDER: PAGINATION
═══════════════════════════════════════════ */
function renderPagination(total) {
  const container = $("pagination");
  if (!container) return;

  const totalPages = Math.ceil(total / JOBS_PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ""; return; }

  const cur = State.currentPage;
  let pages = [];

  // Always show first, last, current ±1, with dots in between
  const show = new Set([1, totalPages, cur, cur - 1, cur + 1].filter(p => p >= 1 && p <= totalPages));
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
   RENDER: ACTIVE FILTER CHIPS
═══════════════════════════════════════════ */
function renderFilterChips() {
  const container = $("activeChips");
  if (!container) return;

  const chips = [];
  const { keyword, locations, experience, schedules, salaryMin, salaryMax } = State.filters;

  if (keyword) chips.push({ label: `"${keyword}"`, action: "clearKeyword" });
  locations.forEach(l => chips.push({ label: `📍 ${l}`, action: `removeLocation:${l}` }));
  if (experience > 0) chips.push({ label: `${experience}+ yrs exp`, action: "clearExp" });
  schedules.forEach(s => chips.push({ label: availMap[s] || s, action: `removeSchedule:${s}` }));
  if (salaryMin > 0) chips.push({ label: `Min Ksh ${salaryMin.toLocaleString()}`, action: "clearSalMin" });
  if (salaryMax < 200000) chips.push({ label: `Max Ksh ${salaryMax.toLocaleString()}`, action: "clearSalMax" });

  container.innerHTML = chips.map(c => `
    <span class="filter-chip">
      ${c.label}
      <button onclick="window._removeChip('${c.action}')">×</button>
    </span>`).join("");

  // Show/hide clear-all button
  const clearBtn = $("clearFilters");
  if (clearBtn) clearBtn.style.display = chips.length ? "flex" : "none";

  // Highlight filter buttons that have active values
  highlightFilterBtns();
}

function highlightFilterBtns() {
  const { locations, experience, schedules, salaryMin, salaryMax } = State.filters;
  const btns = {
    locationFilter:   locations.length > 0,
    experienceFilter: experience > 0,
    scheduleFilter:   schedules.length > 0,
    salaryFilter:     salaryMin > 0 || salaryMax < 200000,
  };
  for (const [id, active] of Object.entries(btns)) {
    const btn = document.querySelector(`#${id} .filter-btn`);
    if (btn) btn.classList.toggle("has-value", active);
  }
}

/* ═══════════════════════════════════════════
   JOB MODAL
═══════════════════════════════════════════ */
function openJobModal(jobId) {
  const job = State.allJobs.find(j => String(j.id) === String(jobId));
  if (!job) return;

  const applied  = State.appliedIds.has(String(jobId));
  const schedule = availMap[job.availability] || job.availability || "–";
  const salary   = job.salary ? `Ksh ${Number(job.salary).toLocaleString()}/mo` : "Negotiable";

  $("modalBody").innerHTML = `
    <div class="modal-job-header">
      <div class="modal-job-icon"><i class="fas fa-baby"></i></div>
      <div class="modal-job-title-area">
        <h3>${job.title || "Nanny Position"}</h3>
        <p><i class="fas fa-map-marker-alt" style="color:var(--gold)"></i>
           ${job.location || "Location TBD"}</p>
      </div>
      <button class="modal-close" onclick="window._closeModal()">×</button>
    </div>

    <div class="modal-job-body">
      <div class="modal-detail-row">
        <div class="modal-detail-chip">
          <label>Salary</label>
          <span>${salary}</span>
        </div>
        <div class="modal-detail-chip">
          <label>Experience</label>
          <span>${job.required_experience || 0}+ years</span>
        </div>
        <div class="modal-detail-chip">
          <label>Schedule</label>
          <span>${schedule}</span>
        </div>
        <div class="modal-detail-chip">
          <label>Care Needs</label>
          <span>${job.care_needs || "General childcare"}</span>
        </div>
      </div>

      ${job.duties ? `
        <div>
          <p class="modal-section-title"><i class="fas fa-list-check"></i> Duties</p>
          <p class="modal-desc-text">${job.duties}</p>
        </div>` : ""}

      ${job.description ? `
        <div>
          <p class="modal-section-title"><i class="fas fa-info-circle"></i> About the Role</p>
          <p class="modal-desc-text">${job.description}</p>
        </div>` : ""}

      <div class="job-card-chips">
        <span class="job-chip">${schedule}</span>
        ${job.care_needs ? `<span class="job-chip care">${job.care_needs}</span>` : ""}
        ${job.required_experience
          ? `<span class="job-chip">${job.required_experience}+ yrs</span>` : ""}
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-apply" id="modalApplyBtn"
        ${applied ? "disabled" : ""}
        onclick="window._modalApply('${job.id}')">
        ${applied ? "Already Applied ✓" : "Apply Now"}
      </button>
      <button class="btn-secondary" onclick="window._closeModal()">Close</button>
    </div>`;

  $("jobModal").classList.add("open");
}

function closeModal() { $("jobModal")?.classList.remove("open"); }

async function modalApply(jobId) {
  if (State.appliedIds.has(String(jobId))) return;

  const btn = $("modalApplyBtn");
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Applying…`; }

  const res = await applyToJob(jobId);

  if (res.success) {
    State.appliedIds.add(String(jobId));
    closeModal();
    renderJobs();
    showToast("Application submitted successfully!", "success");
  } else {
    if (btn) { btn.disabled = false; btn.textContent = "Apply Now"; }
    showToast(res.message || "Could not apply. Try again.", "error");
  }
}

async function quickApply(jobId, btn) {
  if (State.appliedIds.has(String(jobId))) return;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

  const res = await applyToJob(jobId);

  if (res.success) {
    State.appliedIds.add(String(jobId));
    btn.innerHTML = "Applied ✓";
    btn.classList.add("applied-btn");
    showToast("Application submitted!", "success");
    // Update the card visually
    const card = btn.closest(".job-card");
    if (card) card.classList.add("applied");
  } else {
    btn.disabled = false;
    btn.textContent = orig;
    showToast(res.message || "Could not apply.", "error");
  }
}

function toggleSave(jobId) {
  const id = String(jobId);
  if (State.savedIds.has(id)) {
    State.savedIds.delete(id);
    showToast("Job removed from saved.", "info");
  } else {
    State.savedIds.add(id);
    showToast("Job saved!", "success");
  }
  // Update just the heart icon without re-rendering everything
  const btn = document.querySelector(`.save-btn[onclick*="${id}"]`);
  if (btn) {
    const saved = State.savedIds.has(id);
    btn.classList.toggle("saved", saved);
    btn.querySelector("i").className = `fa${saved ? "s" : "r"} fa-heart`;
    btn.title = saved ? "Unsave" : "Save job";
  }
}

/* ═══════════════════════════════════════════
   CHIP REMOVAL
═══════════════════════════════════════════ */
function removeChip(action) {
  const [type, val] = action.split(":");
  switch (type) {
    case "clearKeyword":
      State.filters.keyword = "";
      const inp = $("searchInput");
      if (inp) inp.value = "";
      break;
    case "removeLocation":
      State.filters.locations = State.filters.locations.filter(l => l !== val);
      document.querySelectorAll(`#locationFilter input[value="${val}"]`)
        .forEach(el => el.checked = false);
      break;
    case "clearExp":
      State.filters.experience = 0;
      document.querySelectorAll(`#experienceFilter input[name="exp"]`)
        .forEach(el => el.checked = false);
      break;
    case "removeSchedule":
      State.filters.schedules = State.filters.schedules.filter(s => s !== val);
      document.querySelectorAll(`#scheduleFilter input[value="${val}"]`)
        .forEach(el => el.checked = false);
      break;
    case "clearSalMin":
      State.filters.salaryMin = 0;
      const minEl = $("salaryMin");
      if (minEl) { minEl.value = 0; safeText("salaryMinLabel", "Ksh 0"); }
      break;
    case "clearSalMax":
      State.filters.salaryMax = 200000;
      const maxEl = $("salaryMax");
      if (maxEl) { maxEl.value = 200000; safeText("salaryMaxLabel", "Ksh 200,000"); }
      break;
  }
  applyFiltersAndSort();
  renderJobs();
  renderFilterChips();
}

function clearAllFilters() {
  State.filters = { keyword: "", locations: [], experience: 0, schedules: [], salaryMin: 0, salaryMax: 200000 };
  const inp = $("searchInput"); if (inp) inp.value = "";
  document.querySelectorAll(".dropdown-panel input").forEach(el => el.checked = false);
  const minEl = $("salaryMin"); if (minEl) { minEl.value = 0; safeText("salaryMinLabel", "Ksh 0"); }
  const maxEl = $("salaryMax"); if (maxEl) { maxEl.value = 200000; safeText("salaryMaxLabel", "Ksh 200,000"); }
  applyFiltersAndSort();
  renderJobs();
  renderFilterChips();
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

  const open  = () => { sidebar?.classList.add("open"); overlay?.classList.add("active"); toggle?.querySelector("i")?.classList.replace("fa-bars","fa-times"); };
  const close = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("active"); toggle?.querySelector("i")?.classList.replace("fa-times","fa-bars"); };

  toggle?.addEventListener("click", e => { e.stopPropagation(); sidebar?.classList.contains("open") ? close() : open(); });
  overlay?.addEventListener("click", close);
  window.addEventListener("resize", () => { if (window.innerWidth > 768) close(); });
}

/* ═══════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════ */
function setupEvents() {
  // Search
  let dbt;
  $("searchInput")?.addEventListener("input", e => {
    State.filters.keyword = e.target.value;
    $("clearSearch").style.display = e.target.value ? "flex" : "none";
    clearTimeout(dbt);
    dbt = setTimeout(() => {
      applyFiltersAndSort();
      renderJobs();
      renderFilterChips();
    }, 280);
  });

  $("clearSearch")?.addEventListener("click", () => {
    $("searchInput").value = "";
    $("clearSearch").style.display = "none";
    State.filters.keyword = "";
    applyFiltersAndSort();
    renderJobs();
    renderFilterChips();
  });

  // Sort
  $("sortSelect")?.addEventListener("change", e => {
    State.sort = e.target.value;
    applyFiltersAndSort();
    renderJobs();
  });

  // View toggle
  $("gridViewBtn")?.addEventListener("click", () => {
    State.viewMode = "grid";
    $("gridViewBtn").classList.add("active");
    $("listViewBtn").classList.remove("active");
    renderJobs();
  });

  $("listViewBtn")?.addEventListener("click", () => {
    State.viewMode = "list";
    $("listViewBtn").classList.add("active");
    $("gridViewBtn").classList.remove("active");
    renderJobs();
  });

  // Filter dropdowns — open/close
  document.querySelectorAll(".filter-dropdown").forEach(dd => {
    const btn   = dd.querySelector(".filter-btn");
    const panel = dd.querySelector(".dropdown-panel");

    btn?.addEventListener("click", e => {
      e.stopPropagation();
      const isOpen = panel.classList.contains("open");
      // Close all
      document.querySelectorAll(".dropdown-panel").forEach(p => p.classList.remove("open"));
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("open"));
      if (!isOpen) {
        panel.classList.add("open");
        btn.classList.add("open");
      }
    });
  });

  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-panel").forEach(p => p.classList.remove("open"));
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("open"));
  });

  // Location checkboxes
  document.querySelectorAll("#locationFilter input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      State.filters.locations = [...document.querySelectorAll("#locationFilter input:checked")].map(el => el.value);
      applyFiltersAndSort(); renderJobs(); renderFilterChips();
    });
  });

  // Experience radio
  document.querySelectorAll("#experienceFilter input[type='radio']").forEach(rb => {
    rb.addEventListener("change", () => {
      State.filters.experience = parseInt(rb.value, 10);
      applyFiltersAndSort(); renderJobs(); renderFilterChips();
    });
  });

  // Schedule checkboxes
  document.querySelectorAll("#scheduleFilter input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      State.filters.schedules = [...document.querySelectorAll("#scheduleFilter input:checked")].map(el => el.value);
      applyFiltersAndSort(); renderJobs(); renderFilterChips();
    });
  });

  // Salary range sliders
  $("salaryMin")?.addEventListener("input", e => {
    const val = parseInt(e.target.value, 10);
    State.filters.salaryMin = val;
    safeText("salaryMinLabel", `Ksh ${val.toLocaleString()}`);
    applyFiltersAndSort(); renderJobs(); renderFilterChips();
  });

  $("salaryMax")?.addEventListener("input", e => {
    const val = parseInt(e.target.value, 10);
    State.filters.salaryMax = val;
    safeText("salaryMaxLabel", `Ksh ${val.toLocaleString()}`);
    applyFiltersAndSort(); renderJobs(); renderFilterChips();
  });

  // Clear all filters
  $("clearFilters")?.addEventListener("click", clearAllFilters);

  // Modal backdrop + Escape
  $("jobModal")?.addEventListener("click", e => { if (e.target === $("jobModal")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
}

/* ═══════════════════════════════════════════
   GLOBAL REFERENCES
═══════════════════════════════════════════ */
window._openJobModal = openJobModal;
window._closeModal   = closeModal;
window._modalApply   = modalApply;
window._quickApply   = quickApply;
window._toggleSave   = toggleSave;
window._removeChip   = removeChip;
window._goPage       = (page) => {
  const total = Math.ceil(State.filteredJobs.length / JOBS_PER_PAGE);
  if (page < 1 || page > total) return;
  State.currentPage = page;
  renderJobs();
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
    const [jobs, appliedIds, profile] = await Promise.all([
      fetchJobs(),
      fetchMyApplications(),
      fetchProfile(),
    ]);

    State.allJobs   = jobs;
    State.appliedIds = new Set(appliedIds);

    // Update header
    if (profile) {
      safeText("userName", profile.name || "Nanny User");
      const avatarEl = $("userAvatar");
      if (avatarEl) {
        avatarEl.textContent = (profile.name || "N")
          .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
      }
    }

    applyFiltersAndSort();
    renderJobs();
    renderFilterChips();

  } catch (err) {
    console.error("Browse jobs init error:", err);
    $("jobsGrid").innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Could not load jobs</h3>
        <p>Please check your connection and try refreshing.</p>
      </div>`;
    showToast("Failed to load jobs.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);