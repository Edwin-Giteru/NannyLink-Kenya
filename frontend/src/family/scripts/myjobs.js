import { API_URL } from "../../utils/config.js";

/* ─── utils ─── */
const $ = id => document.getElementById(id);
const safeText = (id, v) => { const el=$(id); if(el) el.textContent = v ?? ""; };

function authHeaders() {
  return { "Authorization": `Bearer ${localStorage.getItem("access_token")}`, "Content-Type": "application/json" };
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
  return (name||"").trim().split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("") || "F";
}

function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days/7)}w ago`;
  return new Date(d).toLocaleDateString("en-KE", { day:"numeric", month:"short" });
}

function fmtKsh(n) {
  if (n == null) return "—";
  return `Ksh ${Number(n).toLocaleString("en-KE")}`;
}

const AVAIL_LABELS = { full_time:"Full Time", part_time:"Part Time", evenings:"Evenings", weekends:"Weekends" };

/* Normalize backend enum → canonical UI key
   Backend stores: ACTIVE, OPEN, CLOSED, FILLED, PAUSED (uppercase)
   Filter options use: active, closed, paused, filled               */
function normalizeStatus(raw) {
  const s = (raw || "active").toLowerCase().replace(/[_\s]/g, "");
  if (["active","open","live"].includes(s)) return "active";
  if (["closed","close"].includes(s))       return "closed";
  if (["paused","pause"].includes(s))       return "paused";
  if (["filled","fill"].includes(s))        return "filled";
  return "active"; // safe fallback
}

const STATUS_META = {
  active:  { cls:"status-active",  label:"Active",  icon:"fa-circle-dot" },
  open:    { cls:"status-active",  label:"Active",  icon:"fa-circle-dot" },
  closed:  { cls:"status-closed",  label:"Closed",  icon:"fa-circle-xmark" },
  paused:  { cls:"status-paused",  label:"Paused",  icon:"fa-pause-circle" },
  filled:  { cls:"status-filled",  label:"Filled",  icon:"fa-circle-check" },
};

function jobStatusBadge(raw) {
  const s = normalizeStatus(raw);
  const m = STATUS_META[s] || STATUS_META.active;
  const badgeCls = {
    "status-active": "accepted",
    "status-closed": "rejected",
    "status-paused": "reviewing",
    "status-filled": "matched",
  }[m.cls] || "pending";
  return `<span class="status-badge ${badgeCls}">
    <i class="fas ${m.icon}" style="font-size:.6rem;margin-right:3px"></i>${m.label}
  </span>`;
}

/* ─────────────────────────────────
   STATE
───────────────────────────────── */
const State = {
  jobs:         [],       // raw from API
  applications: [],       // all applications across family's jobs
  filtered:     [],       // after search/filter/sort
  view:         "grid",   // "grid" | "list"
  search:       "",
  statusFilter: "all",
  availFilter:  "all",
  sortBy:       "newest",
  editingJobId: null,
  deletingJobId: null,
};

/* ─────────────────────────────────
   API
───────────────────────────────── */
async function fetchJobs() {
  try {
    const res = await fetch(`${API_URL}/job/family/me`, { headers: authHeaders() });
    if (!res.ok) { console.warn("GET /job/family/me →", res.status); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.jobs || data?.data || []);
  } catch(e) { console.error(e); return []; }
}

async function fetchApplications() {
  try {
    const res = await fetch(`${API_URL}/applications/family/me`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.applications || []);
  } catch { return []; }
}

async function fetchProfile() {
  try {
    let uid = localStorage.getItem("user_id");
    if (!uid) {
      const tok = localStorage.getItem("access_token");
      if (tok) { try { uid = JSON.parse(atob(tok.split(".")[1])).sub; } catch {} }
    }
    if (!uid) return null;
    const res = await fetch(`${API_URL}/Family/${uid}`, { headers: authHeaders() });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function updateJob(jobId, payload) {
  const res = await fetch(`${API_URL}/job/${jobId}`, {
    method:  "PATCH",
    headers: authHeaders(),
    body:    JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Update failed.");
  return data;
}

/* ─────────────────────────────────
   STATS STRIP
───────────────────────────────── */
function renderStats() {
  const jobs = State.jobs;
  const apps = State.applications;

  const active = jobs.filter(j => normalizeStatus(j.status) === "active").length;
  const totalApps = apps.length;
  const newApps = apps.filter(a => ["new","pending"].includes((a.status||"new").toLowerCase())).length;

  safeText("statTotal",  jobs.length);
  safeText("statActive", active);
  safeText("statApps",   totalApps);
  safeText("statNew",    newApps);

  const sub = jobs.length === 0
    ? "You haven't posted any jobs yet."
    : `${jobs.length} job post${jobs.length !== 1 ? "s" : ""} · ${active} active`;
  safeText("mjSubtitle", sub);
}

/* ─────────────────────────────────
   FILTER + SORT
───────────────────────────────── */
function applyFilters() {
  let list = [...State.jobs];
  const kw = State.search.toLowerCase();

  if (kw) {
    list = list.filter(j =>
      (j.title||"").toLowerCase().includes(kw) ||
      (j.location||"").toLowerCase().includes(kw) ||
      (j.duties||"").toLowerCase().includes(kw)
    );
  }

  if (State.statusFilter !== "all") {
    list = list.filter(j => normalizeStatus(j.status) === State.statusFilter);
  }

  if (State.availFilter !== "all") {
    list = list.filter(j => (j.availability||"").toLowerCase() === State.availFilter);
  }

  switch (State.sortBy) {
    case "oldest":    list.sort((a,b) => new Date(a.created_at)-new Date(b.created_at)); break;
    case "most_apps": list.sort((a,b) => appCount(b.id)-appCount(a.id)); break;
    case "salary_high": list.sort((a,b) => (b.salary||0)-(a.salary||0)); break;
    case "salary_low":  list.sort((a,b) => (a.salary||0)-(b.salary||0)); break;
    default:          list.sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
  }

  State.filtered = list;

  // results count
  const rc = $("mjResultsCount");
  if (rc) rc.textContent = list.length === State.jobs.length
    ? `${list.length} job post${list.length !== 1 ? "s" : ""}`
    : `${list.length} of ${State.jobs.length} posts`;

  // clear filters button
  const cf = $("mjClearFilters");
  const hasFilters = State.search || State.statusFilter !== "all" || State.availFilter !== "all";
  if (cf) cf.style.display = hasFilters ? "inline-flex" : "none";
}

function appCount(jobId) {
  return State.applications.filter(a => String(a.job_id||a.job_post?.id) === String(jobId)).length;
}

function newAppCount(jobId) {
  return State.applications.filter(a =>
    String(a.job_id||a.job_post?.id) === String(jobId) &&
    ["new","pending"].includes((a.status||"new").toLowerCase())
  ).length;
}

/* ─────────────────────────────────
   RENDER GRID
───────────────────────────────── */
function renderGrid() {
  applyFilters();
  const grid = $("mjGrid");
  if (!grid) return;

  grid.className = `mj-grid${State.view === "list" ? " list-view" : ""}`;

  if (State.filtered.length === 0) {
    const hasFilter = State.search || State.statusFilter !== "all" || State.availFilter !== "all";
    grid.innerHTML = `
      <div class="mj-empty">
        <i class="fas ${hasFilter ? "fa-filter" : "fa-briefcase"}"></i>
        <h3>${hasFilter ? "No matching jobs" : "No job posts yet"}</h3>
        <p>${hasFilter ? "Try adjusting your search or filters." : "Post your first job to start receiving applications from vetted nannies."}</p>
        ${hasFilter ? "" : `<a href="postjob.html"><i class="fas fa-plus"></i> Post a Job</a>`}
      </div>`;
    return;
  }

  // Max apps for bar scale
  const maxApps = Math.max(1, ...State.filtered.map(j => appCount(j.id)));

  grid.innerHTML = State.filtered.map(job => buildCard(job, maxApps)).join("");

  // Animate bars after render
  requestAnimationFrame(() => {
    grid.querySelectorAll(".mj-apps-bar-fill[data-pct]").forEach(el => {
      el.style.width = el.dataset.pct + "%";
    });
  });

  // Wire up dropdown menus
  grid.querySelectorAll(".mj-card-menu-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      // close all others
      document.querySelectorAll(".mj-card-dropdown.open").forEach(d => {
        if (d !== btn.nextElementSibling) d.classList.remove("open");
      });
      btn.nextElementSibling?.classList.toggle("open");
    });
  });

  // Wire dropdown items
  grid.querySelectorAll(".mj-dropdown-item[data-action]").forEach(item => {
    item.addEventListener("click", e => {
      e.stopPropagation();
      const jobId = item.closest(".mj-card").dataset.jobId;
      const action = item.dataset.action;
      document.querySelectorAll(".mj-card-dropdown.open").forEach(d => d.classList.remove("open"));
      if (action === "edit")   openEditModal(jobId);
      if (action === "close")  openDeleteModal(jobId);
      if (action === "apps")   window.location.href = `familyapplications.html?job=${jobId}`;
      if (action === "reopen") reopenJob(jobId);
    });
  });
}

function buildCard(job, maxApps) {
  const status = normalizeStatus(job.status);
  const sMeta  = STATUS_META[status] || STATUS_META.active;
  const count  = appCount(job.id);
  const newC   = newAppCount(job.id);
  const pct    = Math.round((count / maxApps) * 100);
  const avail  = AVAIL_LABELS[(job.availability||"").toLowerCase()] || job.availability || "—";
  const isClosed = ["closed","filled"].includes(status);

  return `
    <div class="mj-card ${sMeta.cls}" data-job-id="${job.id}">
      <div class="mj-card-top">
        <div class="mj-card-title-wrap">
          <div class="mj-card-title" title="${job.title||""}">${job.title || "Untitled Job"}</div>
          <div class="mj-card-meta">
            ${jobStatusBadge(status)}
            <span><i class="fas fa-map-pin"></i>${job.location||"—"}</span>
            <span><i class="fas fa-clock"></i>${avail}</span>
          </div>
        </div>
        <div style="position:relative">
          <button class="mj-card-menu-btn" title="Options">
            <i class="fas fa-ellipsis-vertical"></i>
          </button>
          <div class="mj-card-dropdown">
            <button class="mj-dropdown-item" data-action="edit">
              <i class="fas fa-pen"></i> Edit Post
            </button>
            <button class="mj-dropdown-item" data-action="apps">
              <i class="fas fa-inbox"></i> View Applications
            </button>
            <div class="mj-dropdown-divider"></div>
            ${isClosed
              ? `<button class="mj-dropdown-item" data-action="reopen">
                   <i class="fas fa-rotate-left"></i> Reopen Post
                 </button>`
              : `<button class="mj-dropdown-item danger" data-action="close">
                   <i class="fas fa-circle-xmark"></i> Close Post
                 </button>`
            }
          </div>
        </div>
      </div>

      <div class="mj-card-body">
        <div class="mj-card-salary">
          <span class="mj-salary-num">${fmtKsh(job.salary)}</span>
          <span class="mj-salary-label">/month</span>
        </div>
        ${job.duties ? `<p class="mj-card-duties">${job.duties}</p>` : ""}
        <div class="mj-card-apps">
          <div class="mj-apps-info">
            <span class="mj-apps-count">${count} Applicant${count !== 1 ? "s" : ""}</span>
            <span class="mj-apps-new ${newC === 0 ? "none" : ""}">
              ${newC > 0 ? `+${newC} new` : "No new"}
            </span>
          </div>
          <div class="mj-apps-bar-wrap">
            <div class="mj-apps-bar">
              <div class="mj-apps-bar-fill" data-pct="${pct}" style="width:0"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="mj-card-footer">
        <span class="mj-card-posted">
          <i class="fas fa-calendar"></i> ${timeAgo(job.created_at)}
        </span>
        <div class="mj-card-actions">
          <a class="mj-action-btn apps"
             href="familyapplications.html?job=${job.id}">
            <i class="fas fa-inbox"></i> ${count}
          </a>
          <button class="mj-action-btn view" onclick="openEditModal('${job.id}')">
            <i class="fas fa-pen"></i> Edit
          </button>
        </div>
      </div>
    </div>`;
}

/* ─────────────────────────────────
   EDIT MODAL
───────────────────────────────── */
function openEditModal(jobId) {
  const job = State.jobs.find(j => String(j.id) === String(jobId));
  if (!job) return;
  State.editingJobId = jobId;

  $("editTitle").value        = job.title || "";
  $("editLocation").value     = job.location || "";
  $("editSalary").value       = job.salary || "";
  $("editExperience").value   = job.required_experience ?? 1;
  $("editDuties").value       = job.duties || "";
  $("editCareNeeds").value    = job.care_needs || "";
  $("editAvailability").value = job.availability || "full_time";

  $("editModal").classList.add("open");
}

function closeEditModal() {
  $("editModal").classList.remove("open");
  State.editingJobId = null;
}

async function saveEdit() {
  const btn = $("btnSaveEdit");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving…`;

  try {
    const payload = {
      title:               $("editTitle").value.trim(),
      location:            $("editLocation").value.trim(),
      salary:              Number($("editSalary").value),
      availability:        $("editAvailability").value,
      required_experience: Number($("editExperience").value),
      duties:              $("editDuties").value.trim(),
      care_needs:          $("editCareNeeds").value.trim() || null,
    };

    if (!payload.title) { showToast("Title is required.", "error"); return; }
    if (!payload.location) { showToast("Location is required.", "error"); return; }
    if (!payload.salary || payload.salary < 1) { showToast("Enter a valid salary.", "error"); return; }
    if (!payload.duties) { showToast("Duties are required.", "error"); return; }

    const updated = await updateJob(State.editingJobId, payload);

    // Update in state
    const idx = State.jobs.findIndex(j => String(j.id) === String(State.editingJobId));
    if (idx !== -1) State.jobs[idx] = { ...State.jobs[idx], ...updated };

    closeEditModal();
    renderStats();
    renderGrid();
    showToast("Job post updated.", "success");

  } catch(err) {
    showToast(err.message || "Update failed.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-floppy-disk"></i> Save Changes`;
  }
}

/* ─────────────────────────────────
   CLOSE / REOPEN JOB
───────────────────────────────── */
function openDeleteModal(jobId) {
  const job = State.jobs.find(j => String(j.id) === String(jobId));
  if (!job) return;
  State.deletingJobId = jobId;
  safeText("deleteJobTitle", job.title || "this job");
  $("deleteModal").classList.add("open");
}

function closeDeleteModal() {
  $("deleteModal").classList.remove("open");
  State.deletingJobId = null;
}

async function confirmClose() {
  const btn = $("btnConfirmDelete");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Closing…`;

  try {
    await updateJob(State.deletingJobId, { title: State.jobs.find(j=>String(j.id)===String(State.deletingJobId))?.title });
    // Optimistically update local state
    const idx = State.jobs.findIndex(j => String(j.id) === String(State.deletingJobId));
    if (idx !== -1) State.jobs[idx].status = "closed";

    closeDeleteModal();
    renderStats();
    renderGrid();
    showToast("Job post closed.", "info");
  } catch(err) {
    showToast(err.message || "Failed to close job.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-circle-xmark"></i> Close Job`;
  }
}

async function reopenJob(jobId) {
  try {
    const job = State.jobs.find(j => String(j.id) === String(jobId));
    if (!job) return;
    await updateJob(jobId, { title: job.title }); // trigger backend status reset if supported
    const idx = State.jobs.findIndex(j => String(j.id) === String(jobId));
    if (idx !== -1) State.jobs[idx].status = "active";
    renderStats();
    renderGrid();
    showToast("Job post reopened.", "success");
  } catch(err) {
    showToast(err.message || "Failed to reopen job.", "error");
  }
}

/* ─────────────────────────────────
   SKELETON
───────────────────────────────── */
function renderSkeletons() {
  const grid = $("mjGrid");
  if (!grid) return;
  grid.innerHTML = [1,2,3,4].map(() => `
    <div class="mj-skeleton-card">
      <div class="skeleton" style="height:14px;width:65%;margin-bottom:6px"></div>
      <div class="skeleton" style="height:10px;width:40%;margin-bottom:16px"></div>
      <div class="skeleton" style="height:20px;width:45%;margin-bottom:10px"></div>
      <div class="skeleton" style="height:10px;width:90%"></div>
      <div class="skeleton" style="height:10px;width:70%;margin-top:4px"></div>
      <div style="margin-top:14px;display:flex;gap:8px">
        <div class="skeleton" style="height:28px;flex:1;border-radius:99px"></div>
        <div class="skeleton" style="height:28px;flex:1;border-radius:99px"></div>
      </div>
    </div>`).join("");
}

/* ─────────────────────────────────
   ACTIVE NAV + SIDEBAR
───────────────────────────────── */
function setupActiveNav() {
  const page = window.location.pathname.split("/").pop() || "familyjobs.html";
  document.querySelectorAll(".sidebar-nav a").forEach(a => {
    a.classList.remove("active");
    const href = (a.getAttribute("href")||"").split("/").pop();
    if (href === page) a.classList.add("active");
  });
}

function setupSidebar() {
  const toggle  = $("menuToggle");
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  const open  = () => { sidebar?.classList.add("open"); overlay?.classList.add("active"); toggle?.querySelector("i")?.classList.replace("fa-bars","fa-times"); };
  const close = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("active"); toggle?.querySelector("i")?.classList.replace("fa-times","fa-bars"); };
  toggle?.addEventListener("click", e => { e.stopPropagation(); sidebar?.classList.contains("open") ? close() : open(); });
  overlay?.addEventListener("click", close);
}

/* ─────────────────────────────────
   EVENTS
───────────────────────────────── */
function setupEvents() {
  // Search
  let debounce;
  $("mjSearch")?.addEventListener("input", e => {
    State.search = e.target.value;
    $("mjSearchClear").style.display = e.target.value ? "block" : "none";
    clearTimeout(debounce);
    debounce = setTimeout(renderGrid, 220);
  });

  $("mjSearchClear")?.addEventListener("click", () => {
    $("mjSearch").value = "";
    State.search = "";
    $("mjSearchClear").style.display = "none";
    renderGrid();
  });

  // Filters
  $("mjStatusFilter")?.addEventListener("change", e => { State.statusFilter = e.target.value; renderGrid(); });
  $("mjAvailFilter")?.addEventListener("change",  e => { State.availFilter  = e.target.value; renderGrid(); });
  $("mjSortBy")?.addEventListener("change",       e => { State.sortBy       = e.target.value; renderGrid(); });

  // Clear filters
  $("mjClearFilters")?.addEventListener("click", () => {
    State.search = ""; State.statusFilter = "all"; State.availFilter = "all";
    $("mjSearch").value = ""; $("mjStatusFilter").value = "all"; $("mjAvailFilter").value = "all";
    $("mjSearchClear").style.display = "none";
    renderGrid();
  });

  // View toggle
  $("btnGridView")?.addEventListener("click", () => {
    State.view = "grid";
    $("btnGridView").classList.add("active");
    $("btnListView").classList.remove("active");
    renderGrid();
  });

  $("btnListView")?.addEventListener("click", () => {
    State.view = "list";
    $("btnListView").classList.add("active");
    $("btnGridView").classList.remove("active");
    renderGrid();
  });

  // Edit modal
  $("closeEditModal")?.addEventListener("click",  closeEditModal);
  $("cancelEditModal")?.addEventListener("click", closeEditModal);
  $("btnSaveEdit")?.addEventListener("click",     saveEdit);
  $("editModal")?.addEventListener("click", e => { if (e.target === $("editModal")) closeEditModal(); });

  // Delete modal
  $("closeDeleteModal")?.addEventListener("click",  closeDeleteModal);
  $("cancelDeleteModal")?.addEventListener("click", closeDeleteModal);
  $("btnConfirmDelete")?.addEventListener("click",  confirmClose);
  $("deleteModal")?.addEventListener("click", e => { if (e.target === $("deleteModal")) closeDeleteModal(); });

  // Escape key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeEditModal(); closeDeleteModal(); }
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    document.querySelectorAll(".mj-card-dropdown.open").forEach(d => d.classList.remove("open"));
  });
}

/* expose for inline onclick (edit button in card footer) */
window.openEditModal = openEditModal;

/* ─────────────────────────────────
   AUTH GUARD
───────────────────────────────── */
function authGuard() {
  const token = localStorage.getItem("access_token");
  if (!token) { window.location.href = "/frontend/src/views/login.html"; return false; }
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p.exp && p.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = "/frontend/src/views/login.html";
      return false;
    }
  } catch {}
  return true;
}

/* ─────────────────────────────────
   INIT
───────────────────────────────── */
async function init() {
  if (!authGuard()) return;
  setupActiveNav();
  setupSidebar();
  setupEvents();
  renderSkeletons();

  const [profile, jobs, applications] = await Promise.all([
    fetchProfile(),
    fetchJobs(),
    fetchApplications(),
  ]);

  // Sidebar
  if (profile) {
    safeText("sidebarName", profile.name || "Family");
    const av = $("sidebarAvatar");
    if (av) av.textContent = initials(profile.name || "F");
  }

  State.jobs         = jobs;
  State.applications = applications;

  renderStats();
  renderGrid();
}

document.addEventListener("DOMContentLoaded", init);