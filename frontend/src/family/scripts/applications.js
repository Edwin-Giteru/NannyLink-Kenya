import { API_URL } from "../../utils/config.js";

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
  return (name||"").trim().split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("") || "?";
}

function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-KE", { day:"numeric", month:"short" });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" });
}

function normalizeStatus(raw) {
  const s = (raw||"new").toLowerCase().replace(/[_\s]/g,"");
  if (["new","pending"].includes(s))                return "new";
  if (["reviewing","review"].includes(s))          return "reviewing";
  if (["shortlisted","shortlist"].includes(s))     return "shortlisted";
  if (["accepted","hired","approved"].includes(s)) return "accepted";
  if (["rejected","declined"].includes(s))         return "rejected";
  return "new";
}

function statusBadge(raw) {
  const s = normalizeStatus(raw);
  const labels = { new:"New", reviewing:"Reviewing", shortlisted:"Shortlisted", accepted:"Accepted", rejected:"Rejected" };
  return `<span class="status-badge ${s}">${labels[s]||raw}</span>`;
}

/* ── STATE ── */
const State = {
  applications: [],
  filtered:     [],
  selected:      new Set(),
  search:        "",
  statusFilter: ["new","reviewing","shortlisted","accepted"],
  jobFilter:    "all",
  expFilter:    "all",
  sortBy:        "newest",
  openDrawerId: null,
  pendingAction: null,
};

/* ── API ── */
async function fetchApplications() {
  try {
    const res = await fetch(`${API_URL}/applications/family/me`, { headers: authHeaders() });
    if (!res.ok) { console.warn("GET /applications/family/me →", res.status); return []; }
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.applications || []);
  } catch(e) { console.error(e); return []; }
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

async function fetchNannyProfile(nannyId) {
  try {
    const res = await fetch(`${API_URL}/Nanny/${nannyId}`, { headers: authHeaders() });
    if (res.status === 403) {
      console.info(`GET /Nanny/${nannyId} returned 403 — apply the nanny router fix to enable full profile view`);
      return null;
    }
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function updateApplicationStatus(appId, newStatus) {
  // 1. Update the application status first
  const res = await fetch(`${API_URL}/application/${appId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status: newStatus }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Update failed.");

  // 2. If accepted, try to create the Match record
  if (newStatus === "accepted") {
    try {
      // Your backend expects application_id in the URL query string
      const matchRes = await fetch(`${API_URL}/matches/?application_id=${appId}`, {
        method: "POST",
        headers: authHeaders()
      });

      if (!matchRes.ok) {
        const errorData = await matchRes.json();
        // Log the 500 error for debugging, but don't break the UI
        console.error("Match record creation failed on backend:", errorData.detail);
      }
    } catch (e) {
      console.error("Network error during Match creation:", e);
    }
  }
  return data;
}
/* ── STATS ── */
function renderStats() {
  const apps = State.applications;
  const count = s => apps.filter(a => normalizeStatus(a.status) === s).length;
  safeText("stTotal",       apps.length);
  safeText("stNew",         count("new"));
  safeText("stReviewing",   count("reviewing"));
  safeText("stShortlisted", count("shortlisted"));
  safeText("stRejected",    count("rejected"));
  const total = apps.length;
  safeText("apSubtitle",
    total === 0
      ? "No applications yet — post a job to start receiving them."
      : `${total} application${total !== 1 ? "s" : ""} across all your job posts`
  );
}

/* ── CUSTOM SELECT HELPER ── */
function setupCustomSelect(wrapId, btnId, labelId, listId, onChange) {
  const wrap  = $(wrapId);
  const btn   = $(btnId);
  const label = $(labelId);
  const list  = $(listId);
  if (!wrap || !btn || !list) return;

  btn.addEventListener("click", e => {
    e.stopPropagation();
    document.querySelectorAll(".ap-custom-select.open").forEach(el => {
      if (el !== wrap) el.classList.remove("open");
    });
    wrap.classList.toggle("open");
  });

  list.querySelectorAll(".ap-custom-option").forEach(opt => {
    opt.addEventListener("click", e => {
      e.stopPropagation();
      list.querySelectorAll(".ap-custom-option").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      if (label) label.textContent = opt.textContent;
      wrap.classList.remove("open");
      onChange(opt.dataset.value);
    });
  });

  document.addEventListener("click", e => {
    if (!wrap.contains(e.target)) wrap.classList.remove("open");
  });
}

/* ── CUSTOM JOB DROPDOWN ── */
function populateJobFilter() {
  const list = $("jobSelectList");
  if (!list) return;

  const jobs = new Map();
  State.applications.forEach(a => {
    const id    = String(a.job_id);
    const title = a.job_post?.title || `Job ${id.slice(0,6)}`;
    if (!jobs.has(id)) jobs.set(id, title);
  });

  list.innerHTML = `<div class="ap-custom-option selected" data-value="all">All Jobs</div>`;
  jobs.forEach((title, id) => {
    const opt = document.createElement("div");
    opt.className   = "ap-custom-option";
    opt.dataset.value = id;
    opt.textContent = title;
    opt.title       = title;
    list.appendChild(opt);
  });

  list.querySelectorAll(".ap-custom-option").forEach(opt => {
    opt.addEventListener("click", e => {
      e.stopPropagation();
      const val = opt.dataset.value;
      State.jobFilter = val;
      $("jobSelectLabel").textContent = opt.textContent;
      list.querySelectorAll(".ap-custom-option").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      $("jobSelectWrap")?.classList.remove("open");
      renderList();
    });
  });

  const jobParam = new URLSearchParams(window.location.search).get("job");
  if (jobParam && jobs.has(jobParam)) {
    State.jobFilter = jobParam;
    const match = list.querySelector(`[data-value="${jobParam}"]`);
    if (match) {
      $("jobSelectLabel").textContent = match.textContent;
      list.querySelectorAll(".ap-custom-option").forEach(o => o.classList.remove("selected"));
      match.classList.add("selected");
    }
  }
}

function setupJobDropdown() {
  setupCustomSelect("jobSelectWrap", "jobSelectBtn", "jobSelectLabel", "jobSelectList",
    val => { State.jobFilter = val; renderList(); });
}

/* ── FILTER + SORT ── */
function applyFilters() {
  let list = [...State.applications];
  const kw = State.search.toLowerCase();

  if (kw) {
    list = list.filter(a => {
      const name  = (a.nanny?.name || "").toLowerCase();
      const title = (a.job_post?.title || "").toLowerCase();
      return name.includes(kw) || title.includes(kw);
    });
  }

  list = list.filter(a => State.statusFilter.includes(normalizeStatus(a.status)));

  if (State.jobFilter !== "all")
    list = list.filter(a => String(a.job_id) === State.jobFilter);

  if (State.expFilter !== "all") {
    const min = Number(State.expFilter);
    list = list.filter(a => (a.nanny?.years_experience ?? 0) >= min);
  }

  switch (State.sortBy) {
    case "oldest":   list.sort((a,b) => new Date(a.applied_at)-new Date(b.applied_at)); break;
    case "exp_high": list.sort((a,b) => (b.nanny?.years_experience||0)-(a.nanny?.years_experience||0)); break;
    case "exp_low":  list.sort((a,b) => (a.nanny?.years_experience||0)-(b.nanny?.years_experience||0)); break;
    default:         list.sort((a,b) => new Date(b.applied_at)-new Date(a.applied_at));
  }

  State.filtered = list;

  const rc = $("apResultsCount");
  if (rc) rc.textContent = list.length === State.applications.length
    ? `${list.length} application${list.length !== 1 ? "s" : ""}`
    : `${list.length} of ${State.applications.length}`;

  const activeCount =
    (State.statusFilter.length < 5 ? 1 : 0) +
    (State.jobFilter !== "all" ? 1 : 0) +
    (State.expFilter !== "all" ? 1 : 0);
  const badge = $("filterBadge");
  if (badge) { badge.style.display = activeCount > 0 ? "flex" : "none"; badge.textContent = activeCount; }
}

/* ── RENDER LIST ── */
function renderList() {
  applyFilters();
  const container = $("apList");
  if (!container) return;

  if (State.filtered.length === 0) {
    const hasFilters = State.search || State.jobFilter !== "all" || State.expFilter !== "all";
    container.innerHTML = `
      <div class="ap-empty">
        <i class="fas ${hasFilters ? "fa-filter" : "fa-inbox"}"></i>
        <h3>${hasFilters ? "No matching applications" : "No applications yet"}</h3>
        <p>${hasFilters ? "Try adjusting your filters or search." : "Once nannies apply to your job posts, they will appear here."}</p>
        ${hasFilters ? "" : `<a href="postjob.html"><i class="fas fa-plus"></i> Post a Job</a>`}
      </div>`;
    return;
  }

  container.innerHTML = `<div class="ap-list">${State.filtered.map(buildCard).join("")}</div>`;

  container.querySelectorAll(".ap-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".ap-card-check") || e.target.closest(".ap-act-btn")) return;
      openDrawer(card.dataset.appId);
    });
  });

  container.querySelectorAll(".ap-card-check input").forEach(cb => {
    cb.addEventListener("change", e => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      if (e.target.checked) State.selected.add(id);
      else State.selected.delete(id);
      e.target.closest(".ap-card").classList.toggle("selected", e.target.checked);
      updateBulkBar();
    });
  });

  container.querySelectorAll(".ap-act-btn[data-action]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      triggerAction(btn.dataset.action, [btn.dataset.id]);
    });
  });
}

function buildCard(app) {
  const nanny   = app.nanny || {};
  const name    = nanny.name || "Nanny Applicant";
  const exp     = nanny.years_experience;
  const photo   = nanny.profile_photo_url;
  const vetting = (nanny.vetting_status || "pending").toLowerCase();
  const jobTitle= app.job_post?.title || "—";
  const status  = normalizeStatus(app.status);
  const isNew   = status === "new";
  const isSelected = State.selected.has(String(app.id));

  const avatarHTML = photo
    ? `<img src="${photo}" alt="${name}">`
    : initials(name);

  let actionBtns = "";
  if (status === "accepted") {
    actionBtns = `<span style="font-size:.7rem;color:var(--green);font-weight:700;padding:0 4px">✓ Accepted</span>`;
  } else if (status === "rejected") {
    actionBtns = `<span style="font-size:.7rem;color:var(--red);font-weight:700;padding:0 4px">✕ Rejected</span>`;
  } else {
    actionBtns = `
      <button class="ap-act-btn shortlist" data-action="shortlist" data-id="${app.id}" title="Shortlist">
        <i class="fas fa-star"></i>
      </button>
      <button class="ap-act-btn accept" data-action="accept" data-id="${app.id}" title="Accept">
        <i class="fas fa-check"></i>
      </button>
      <button class="ap-act-btn reject" data-action="reject" data-id="${app.id}" title="Reject">
        <i class="fas fa-xmark"></i>
      </button>`;
  }

  return `
    <div class="ap-card ${isNew ? "is-new" : ""} ${isSelected ? "selected" : ""}" data-app-id="${app.id}">
      <div class="ap-card-inner">
        <div class="ap-card-check">
          <input type="checkbox" data-id="${app.id}" ${isSelected ? "checked" : ""}>
        </div>
        <div class="ap-card-avatar">
          ${avatarHTML}
          <span class="ap-vetting-dot ${vetting}"></span>
        </div>
        <div class="ap-card-info">
          <div class="ap-card-name">
            ${name}
            ${isNew ? '<span class="ap-new-dot" title="New application"></span>' : ""}
          </div>
          <div class="ap-card-meta">
            ${statusBadge(status)}
            <span class="ap-job-tag" title="${jobTitle}">${jobTitle}</span>
            ${exp != null ? `<span><i class="fas fa-star"></i>${exp}yr exp</span>` : ""}
          </div>
        </div>
        <div class="ap-card-right">
          <span class="ap-card-time">${timeAgo(app.applied_at)}</span>
          <div class="ap-card-actions">
            ${actionBtns}
            <button class="ap-act-btn view-btn" title="View details" data-app-id="${app.id}">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ── BULK BAR ── */
function updateBulkBar() {
  const bulk  = $("bulkActions");
  const count = $("bulkCount");
  const n = State.selected.size;
  if (bulk)  bulk.style.display = n > 0 ? "flex" : "none";
  if (count) count.textContent  = `${n} selected`;
}

/* ── DRAWER ── */
async function openDrawer(appId) {
  const app = State.applications.find(a => String(a.id) === String(appId));
  if (!app) return;
  State.openDrawerId = String(appId);

  $("drawerOverlay")?.classList.add("open");
  $("appDrawer")?.classList.add("open");

  const body   = $("drawerBody");
  const footer = $("drawerFooter");

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="skeleton" style="width:60px;height:60px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:7px">
          <div class="skeleton" style="height:14px;width:55%"></div>
          <div class="skeleton" style="height:10px;width:35%"></div>
        </div>
      </div>
      <div class="skeleton" style="height:90px;border-radius:var(--radius-sm)"></div>
      <div class="skeleton" style="height:90px;border-radius:var(--radius-sm)"></div>
    </div>`;

  let nanny = { ...(app.nanny || {}) };
  if (app.nanny_id && !nanny.skills) {
    const full = await fetchNannyProfile(app.nanny_id);
    if (full) nanny = full;
  }

  const name    = nanny.name || "Nanny Applicant";
  const exp     = nanny.years_experience;
  const photo   = nanny.profile_photo_url;
  const skills  = Array.isArray(nanny.skills) ? nanny.skills : (nanny.skills ? [nanny.skills] : []);
  const location= nanny.preferred_location || nanny.address || "—";
  const vetting = nanny.vetting_status || "pending";
  const status  = normalizeStatus(app.status);
  const jobTitle= app.job_post?.title || "—";
  const jobLoc  = app.job_post?.location || "—";
  const salary  = app.job_post?.salary;

  const avatarHTML = photo ? `<img src="${photo}" alt="${name}">` : initials(name);
  const skillsHTML = skills.length > 0
    ? `<div class="ap-skills-wrap">${skills.map(s=>`<span class="ap-skill-tag">${s}</span>`).join("")}</div>`
    : `<span style="font-size:.8rem;color:var(--text-light)">No skills listed</span>`;

  body.innerHTML = `
    <div class="ap-drawer-nanny">
      <div class="ap-drawer-avatar">${avatarHTML}</div>
      <div class="ap-drawer-nanny-info">
        <strong>${name}</strong>
        <span>${exp != null ? `${exp} year${exp!==1?"s":""} experience` : "Experience not specified"}</span>
        <div style="margin-top:5px">${statusBadge(status)}</div>
      </div>
    </div>

    <div class="ap-drawer-section">
      <div class="ap-drawer-section-title">Application Info</div>
      <div class="ap-drawer-grid">
        <div class="ap-drawer-item">
          <label>Applied</label>
          <span>${fmtDate(app.applied_at)}</span>
        </div>
        <div class="ap-drawer-item">
          <label>Status</label>
          <span>${status.charAt(0).toUpperCase()+status.slice(1)}</span>
        </div>
        <div class="ap-drawer-item full">
          <label>Applied For</label>
          <span>${jobTitle}</span>
        </div>
        <div class="ap-drawer-item">
          <label>Job Location</label>
          <span>${jobLoc}</span>
        </div>
        ${salary ? `<div class="ap-drawer-item">
          <label>Offered Salary</label>
          <span>Ksh ${Number(salary).toLocaleString("en-KE")}/mo</span>
        </div>` : ""}
      </div>
    </div>

    <div class="ap-drawer-section">
      <div class="ap-drawer-section-title">Nanny Profile</div>
      <div class="ap-drawer-grid">
        <div class="ap-drawer-item">
          <label>Experience</label>
          <span>${exp != null ? `${exp} yr${exp!==1?"s":""}` : "—"}</span>
        </div>
        <div class="ap-drawer-item">
          <label>Vetting Status</label>
          <span>${vetting.charAt(0).toUpperCase()+vetting.slice(1)}</span>
        </div>
        <div class="ap-drawer-item full">
          <label>Location</label>
          <span>${location}</span>
        </div>
        <div class="ap-drawer-item full">
          <label>Skills</label>
          ${skillsHTML}
        </div>
      </div>
    </div>`;

  if (status === "accepted") {
    footer.innerHTML = `
      <button class="ap-drawer-btn secondary" id="drawerCloseBtn">
        <i class="fas fa-arrow-left"></i> Back to list
      </button>`;
  } else if (status === "rejected") {
    footer.innerHTML = `
      <button class="ap-drawer-btn secondary" id="drawerReconsiderBtn">
        <i class="fas fa-rotate-left"></i> Reconsider (Shortlist)
      </button>
      <button class="ap-drawer-btn secondary" id="drawerCloseBtn">
        <i class="fas fa-arrow-left"></i> Back
      </button>`;
    $("drawerReconsiderBtn")?.addEventListener("click", () => triggerAction("shortlist", [appId]));
  } else {
    footer.innerHTML = `
      <button class="ap-drawer-btn accept"    id="drawerAcceptBtn"><i class="fas fa-check"></i> Accept</button>
      <button class="ap-drawer-btn shortlist" id="drawerShortBtn"> <i class="fas fa-star"></i> Shortlist</button>
      <button class="ap-drawer-btn reject"    id="drawerRejectBtn"><i class="fas fa-xmark"></i> Reject</button>`;
    $("drawerAcceptBtn")?.addEventListener("click", () => triggerAction("accept",    [appId]));
    $("drawerShortBtn") ?.addEventListener("click", () => triggerAction("shortlist", [appId]));
    $("drawerRejectBtn")?.addEventListener("click", () => triggerAction("reject",    [appId]));
  }

  $("drawerCloseBtn")?.addEventListener("click", closeDrawer);
}

function closeDrawer() {
  $("drawerOverlay")?.classList.remove("open");
  $("appDrawer")?.classList.remove("open");
  State.openDrawerId = null;
}

/* ── ACTIONS ── */
const ACTION_CONFIG = {
  accept:    { status:"accepted",    label:"Accept",    iconCls:"accept",    confirmCls:"green",  icon:"fa-circle-check" },
  shortlist: { status:"shortlisted", label:"Shortlist", iconCls:"shortlist", confirmCls:"gold",   icon:"fa-star" },
  reject:    { status:"rejected",    label:"Reject",    iconCls:"reject",    confirmCls:"red",    icon:"fa-circle-xmark" },
};

function triggerAction(type, ids) {
  const cfg = ACTION_CONFIG[type];
  if (!cfg) return;
  State.pendingAction = { type, ids, status: cfg.status };

  $("confirmIcon").className  = `ap-modal-icon ${cfg.iconCls}`;
  $("confirmIcon").innerHTML  = `<i class="fas ${cfg.icon}"></i>`;
  $("confirmTitle").textContent = `${cfg.label} Application${ids.length > 1 ? "s" : ""}`;
  $("confirmMsg").textContent   = ids.length > 1
    ? `${cfg.label} ${ids.length} selected applications?`
    : `${cfg.label} this application? You can change this later.`;

  const okBtn = $("confirmOk");
  okBtn.className   = `ap-modal-confirm ${cfg.confirmCls}`;
  okBtn.textContent = cfg.label;

  $("confirmModal")?.classList.add("open");
}

async function executeAction() {
  const { type, ids, status } = State.pendingAction || {};
  if (!ids?.length) return;

  const okBtn = $("confirmOk");
  okBtn.disabled = true;
  okBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

  let errors = 0;
  for (const id of ids) {
    try {
      await updateApplicationStatus(id, status);
      const app = State.applications.find(a => String(a.id) === String(id));
      if (app) app.status = status;
    } catch { errors++; }
  }

  $("confirmModal")?.classList.remove("open");
  State.pendingAction = null;
  State.selected.clear();

  errors
    ? showToast(`${errors} update(s) failed.`, "error")
    : showToast(`Application${ids.length > 1 ? "s" : ""} ${ACTION_CONFIG[type]?.label.toLowerCase()}ed.`, "success");

  renderStats();
  renderList();
  updateBulkBar();

  if (State.openDrawerId && ids.map(String).includes(State.openDrawerId)) {
    openDrawer(State.openDrawerId);
  }

  okBtn.disabled = false;
}

/* ── ACTIVE NAV + SIDEBAR ── */
function closeMobileFilters() {
  $("apFiltersPanel")?.classList.remove("mobile-open");
  $("btnToggleFilters")?.classList.remove("active");
  const bd = $("filterBackdrop");
  if (bd) { bd.remove(); }
}
function setupActiveNav() {
  const page = window.location.pathname.split("/").pop() || "familyapplications.html";
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

/* ── SKELETONS ── */
function renderSkeletons() {
  const container = $("apList");
  if (!container) return;
  container.innerHTML = `<div class="ap-list">${[1,2,3,4,5].map(() => `
    <div class="ap-skeleton-card">
      <div class="skeleton" style="width:14px;height:14px;border-radius:3px;flex-shrink:0"></div>
      <div class="skeleton" style="width:46px;height:46px;border-radius:50%;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div class="skeleton" style="height:12px;width:42%"></div>
        <div class="skeleton" style="height:10px;width:68%"></div>
      </div>
      <div class="skeleton" style="height:22px;width:58px;border-radius:99px"></div>
    </div>`).join("")}</div>`;
}

/* ── EVENTS ── */
function setupEvents() {
  let dbt;
  $("apSearch")?.addEventListener("input", e => {
    State.search = e.target.value;
    $("apSearchClear").style.display = e.target.value ? "block" : "none";
    clearTimeout(dbt);
    dbt = setTimeout(renderList, 220);
  });

  $("apSearchClear")?.addEventListener("click", () => {
    $("apSearch").value = ""; State.search = "";
    $("apSearchClear").style.display = "none";
    renderList();
  });

  document.querySelectorAll("#statusChecks input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      State.statusFilter = [...document.querySelectorAll("#statusChecks input:checked")].map(c => c.value);
      renderList();
    });
  });

  $("filterSort")?.addEventListener("change", e => { State.sortBy    = e.target.value; renderList(); });

  setupCustomSelect("expSelectWrap",  "expSelectBtn",  "expSelectLabel",  "expSelectList",
    val => { State.expFilter = val; renderList(); });
  setupCustomSelect("sortSelectWrap", "sortSelectBtn", "sortSelectLabel", "sortSelectList",
    val => { State.sortBy    = val; renderList(); });

  $("btnResetFilters")?.addEventListener("click", () => {
    State.search=""; State.jobFilter="all"; State.expFilter="all"; State.sortBy="newest";
    State.statusFilter=["new","reviewing","shortlisted","accepted"];
    $("apSearch").value="";

    [
      { listId:"jobSelectList",  labelId:"jobSelectLabel",  defaultVal:"all",    defaultLabel:"All Jobs" },
      { listId:"expSelectList",  labelId:"expSelectLabel",  defaultVal:"all",    defaultLabel:"Any Experience" },
      { listId:"sortSelectList", labelId:"sortSelectLabel", defaultVal:"newest", defaultLabel:"Newest First" },
    ].forEach(({ listId, labelId, defaultVal, defaultLabel }) => {
      const lbl = $(labelId);
      if (lbl) lbl.textContent = defaultLabel;
      $(listId)?.querySelectorAll(".ap-custom-option").forEach(o => {
        o.classList.toggle("selected", o.dataset.value === defaultVal);
      });
    });

    document.querySelectorAll("#statusChecks input").forEach(cb => { cb.checked = cb.value !== "rejected"; });
    renderList();
  });

  $("btnFiltersBack")?.addEventListener("click", closeMobileFilters);

  $("btnToggleFilters")?.addEventListener("click", () => {
    const panel   = $("apFiltersPanel");
    const toggle  = $("btnToggleFilters");
    const isOpen  = panel?.classList.contains("mobile-open");

    if (isOpen) {
      closeMobileFilters();
    } else {
      panel?.classList.add("mobile-open");
      toggle?.classList.add("active");
      if (!$("filterBackdrop")) {
        const bd = document.createElement("div");
        bd.id = "filterBackdrop";
        bd.style.cssText = "position:fixed;inset:0;z-index:399;background:rgba(0,0,0,.4)";
        bd.addEventListener("click", closeMobileFilters);
        document.body.appendChild(bd);
      }
    }
  });

  $("btnBulkShortlist")?.addEventListener("click", () => triggerAction("shortlist", [...State.selected]));
  $("btnBulkReject")?.addEventListener("click",    () => triggerAction("reject",    [...State.selected]));

  $("closeDrawer")?.addEventListener("click",    closeDrawer);
  $("drawerOverlay")?.addEventListener("click",  closeDrawer);

  $("apList")?.addEventListener("click", e => {
    const btn = e.target.closest(".view-btn");
    if (btn) { e.stopPropagation(); openDrawer(btn.dataset.appId); }
  });

  $("confirmOk")?.addEventListener("click",      executeAction);
  $("confirmCancel")?.addEventListener("click", () => $("confirmModal")?.classList.remove("open"));
  $("confirmModal")?.addEventListener("click",  e => { if (e.target === $("confirmModal")) $("confirmModal")?.classList.remove("open"); });

  $("btnRefresh")?.addEventListener("click", async () => {
    renderSkeletons();
    State.applications = await fetchApplications();
    renderStats();
    populateJobFilter();
    renderList();
    showToast("Refreshed.", "info");
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    closeDrawer();
    $("confirmModal")?.classList.remove("open");
    closeMobileFilters();
  });
}

function authGuard() {
  const token = localStorage.getItem("access_token");
  if (!token) { window.location.href = "/frontend/src/views/login.html"; return false; }
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p.exp && p.exp * 1000 < Date.now()) { localStorage.clear(); window.location.href = "/frontend/src/views/login.html"; return false; }
  } catch {}
  return true;
}

async function init() {
  if (!authGuard()) return;
  setupActiveNav();
  setupSidebar();
  setupEvents();
  setupJobDropdown();
  renderSkeletons();

  const [profile, applications] = await Promise.all([fetchProfile(), fetchApplications()]);

  if (profile) {
    safeText("sidebarName", profile.name || "Family");
    const av = $("sidebarAvatar");
    if (av) av.textContent = initials(profile.name || "F");
  }

  State.applications = applications;
  renderStats();
  populateJobFilter();
  renderList();
}

document.addEventListener("DOMContentLoaded", init);