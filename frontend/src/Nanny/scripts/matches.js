import { API_URL } from "../../utils/config.js";

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

function initials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "F";
}

const availMap = {
  full_time: "Full-Time", part_time: "Part-Time",
  live_in: "Live-In", on_call: "On-Call",
  FULL_TIME: "Full-Time", PART_TIME: "Part-Time",
  LIVE_IN: "Live-In", ON_CALL: "On-Call",
};

/* ═══════════════════════════════════════════
   STATUS HELPERS
   The Match model uses VettingStatus-style enums.
   We map any variant to: active | pending | ended
═══════════════════════════════════════════ */
function normaliseMatchStatus(raw) {
  const s = (raw || "").toLowerCase().replace(/_/g, "");
  if (["active", "confirmed", "accepted", "matched", "inprogress"].includes(s)) return "active";
  if (["ended", "completed", "terminated", "cancelled", "closed"].includes(s)) return "ended";
  // AWAITING_PAYMENT and anything else → pending
  return "pending";
}

const STATUS_META = {
  active:  { label: "Active",  cls: "accepted" },
  pending: { label: "Pending", cls: "pending"  },
  ended:   { label: "Ended",   cls: "rejected" },
};

function statusMeta(raw) {
  return STATUS_META[normaliseMatchStatus(raw)] || STATUS_META.pending;
}

/* ─────────────────────────────────────────
   Extract fields from MatchResponse shape:
   {
     id, job_id, selected_nanny_id, family_id,
     status, match_date, created_at, updated_at,
     job_post: { id, title, location, salary, availability,
                 care_needs, required_experience, duties },
     family:   { id, name, location }
   }
───────────────────────────────────────── */
function familyName(match) {
  return match.family?.name || "Family";
}

function familyLocation(match) {
  return match.family?.location || match.job_post?.location || "Location TBD";
}

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const MATCHES_PER_PAGE = 8;

const State = {
  allMatches:      [],
  filteredMatches: [],
  currentPage:     1,
  activeStatus:    "all",
  keyword:         "",
  sort:            "newest",
};

/* ═══════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════ */

// GET /matches/  — scoped to current user via JWT
async function fetchMatches() {
  const res = await fetch(`${API_URL}/matches/`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Matches fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.matches || data.data || []);
}

// GET /Nanny/profile/me  — for header
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
  const kw = State.keyword.toLowerCase().trim();

  let result = State.allMatches.filter(m => {
    const name     = familyName(m).toLowerCase();
    const jobTitle = (m.job_post?.title || "").toLowerCase();
    const status   = normaliseMatchStatus(m.status);

    if (kw && !name.includes(kw) && !jobTitle.includes(kw)) return false;
    if (State.activeStatus !== "all" && status !== State.activeStatus) return false;

    return true;
  });

  result.sort((a, b) => {
    const da = new Date(a.created_at || a.matched_at || 0);
    const db = new Date(b.created_at || b.matched_at || 0);
    return State.sort === "oldest" ? da - db : db - da;
  });

  State.filteredMatches = result;
  State.currentPage = 1;
}

/* ═══════════════════════════════════════════
   RENDER: STAT CARDS
═══════════════════════════════════════════ */
function renderStats() {
  const all = State.allMatches;
  let active = 0, pending = 0, ended = 0;
  all.forEach(m => {
    const s = normaliseMatchStatus(m.status);
    if (s === "active") active++;
    else if (s === "ended") ended++;
    else pending++;
  });
  safeText("statTotal",   all.length);
  safeText("statActive",  active);
  safeText("statPending", pending);
  safeText("statEnded",   ended);
}

/* ═══════════════════════════════════════════
   RENDER: SKELETONS
═══════════════════════════════════════════ */
function renderSkeletons() {
  $("matchesList").innerHTML = Array.from({ length: 4 }, () => `
    <div class="match-skeleton">
      <div class="skeleton match-sk-strip"></div>
      <div class="match-sk-inner">
        <div class="skeleton match-sk-avatar"></div>
        <div class="match-sk-body">
          <div class="skeleton match-sk-line w70"></div>
          <div class="skeleton match-sk-line w45"></div>
        </div>
      </div>
      <div class="skeleton match-sk-footer"></div>
    </div>`).join("");
}

/* ═══════════════════════════════════════════
   RENDER: MATCH CARDS
═══════════════════════════════════════════ */
function renderMatches() {
  const list = $("matchesList");
  if (!list) return;

  const total = State.filteredMatches.length;
  const start = (State.currentPage - 1) * MATCHES_PER_PAGE;
  const page  = State.filteredMatches.slice(start, start + MATCHES_PER_PAGE);

  if (total === 0) {
    const isFiltered = State.activeStatus !== "all" || State.keyword;
    list.innerHTML = `
      <div class="matches-empty">
        <i class="fas fa-handshake"></i>
        <h3>${isFiltered ? "No matching results" : "No matches yet"}</h3>
        <p>${isFiltered
          ? "Try adjusting your search or filter."
          : "Keep applying to jobs — matches happen when a family selects you."}</p>
        ${!isFiltered ? `<a href="browse-jobs.html" class="btn-browse-jobs">
          <i class="fas fa-search"></i> Browse Jobs
        </a>` : ""}
      </div>`;
    renderPagination(0);
    return;
  }

  list.innerHTML = page.map((m, i) => buildMatchCard(m, i)).join("");
  renderPagination(total);
}

function buildMatchCard(match, i) {
  const name     = familyName(match);
  const location = familyLocation(match);
  const jobTitle = match.job_post?.title    || "Nanny Position";
  const salary   = match.job_post?.salary
    ? `Ksh ${Number(match.job_post.salary).toLocaleString()}/mo`
    : "Salary TBD";
  const schedule = availMap[match.job_post?.availability] || match.job_post?.availability || "";
  const dateStr  = match.created_at || match.matched_at;
  const { label: statusLabel, cls: statusCls } = statusMeta(match.status);

  return `
  <div class="match-card-page status-${normaliseMatchStatus(match.status)}"
       style="animation-delay:${i * 0.07}s"
       onclick="window._openMatchModal('${match.id}')">

    <div class="match-card-inner">

      <!-- Family row -->
      <div class="match-family-row">
        <div class="match-family-avatar">${initials(name)}</div>
        <div class="match-family-info">
          <div class="match-family-name">${name}</div>
          <div class="match-family-sub">
            <i class="fas fa-map-marker-alt"></i> ${location}
          </div>
        </div>
      </div>

      <!-- Right: status + date -->
      <div class="match-card-right">
        <span class="status-badge ${statusCls}">${statusLabel}</span>
        <span class="match-card-date">${formatDate(dateStr)}</span>
      </div>

    </div>

    <!-- Job info strip -->
    <div style="padding: 0 20px 16px">
      <div class="match-job-strip" onclick="event.stopPropagation()">
        <div class="match-job-icon"><i class="fas fa-baby"></i></div>
        <div class="match-job-info">
          <div class="match-job-title">${jobTitle}</div>
          <div class="match-job-meta">
            <span class="match-meta-item"><i class="fas fa-coins"></i> ${salary}</span>
            ${schedule ? `<span class="match-meta-item"><i class="fas fa-clock"></i> ${schedule}</span>` : ""}
            <span class="match-meta-item"><i class="fas fa-calendar-alt"></i> Matched ${relativeTime(dateStr)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="match-card-footer" onclick="event.stopPropagation()">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-view-match" onclick="window._openMatchModal('${match.id}')">
          <i class="fas fa-eye"></i> View Details
        </button>
        <button class="btn-contact-family"
          onclick="showToast('Contact feature coming soon!', 'info')">
          <i class="fas fa-comment-dots"></i> Contact Family
        </button>
      </div>
      <span style="font-size:.8rem;color:var(--text-light)">
        Match #${String(match.id).slice(0, 8).toUpperCase()}
      </span>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════
   RENDER: PAGINATION
═══════════════════════════════════════════ */
function renderPagination(total) {
  const container = $("pagination");
  if (!container) return;

  const totalPages = Math.ceil(total / MATCHES_PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ""; return; }

  const cur    = State.currentPage;
  const show   = new Set([1, totalPages, cur, cur - 1, cur + 1].filter(p => p >= 1 && p <= totalPages));
  const sorted = [...show].sort((a, b) => a - b);

  let html = `<button class="page-btn${cur === 1 ? " disabled" : ""}"
    onclick="window._goPage(${cur - 1})"><i class="fas fa-chevron-left"></i></button>`;

  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) html += `<button class="page-btn dots">…</button>`;
    html += `<button class="page-btn${p === cur ? " active" : ""}"
      onclick="window._goPage(${p})">${p}</button>`;
    prev = p;
  }

  html += `<button class="page-btn${cur === totalPages ? " disabled" : ""}"
    onclick="window._goPage(${cur + 1})"><i class="fas fa-chevron-right"></i></button>`;

  container.innerHTML = html;
}

/* ═══════════════════════════════════════════
   MATCH DETAIL MODAL
═══════════════════════════════════════════ */
function openMatchModal(matchId) {
  const match = State.allMatches.find(m => String(m.id) === String(matchId));
  if (!match) return;

  const name     = familyName(match);
  const location = familyLocation(match);
  const jobTitle = match.job_post?.title || "Nanny Position";
  const salary   = match.job_post?.salary
    ? `Ksh ${Number(match.job_post.salary).toLocaleString()}/mo`
    : "Negotiable";
  const schedule = availMap[match.job_post?.availability] || match.job_post?.availability || "—";
  const dateStr  = match.created_at || match.matched_at;
  const { label: statusLabel, cls: statusCls } = statusMeta(match.status);

  $("matchModalBody").innerHTML = `
    <div class="match-modal-header">
      <div class="match-modal-avatar">${initials(name)}</div>
      <div class="match-modal-title-area">
        <h3>${name}</h3>
        <p><i class="fas fa-map-marker-alt" style="color:var(--gold);margin-right:4px"></i>${location}</p>
      </div>
      <button class="modal-close" onclick="window._closeMatchModal()">×</button>
    </div>

    <div class="match-modal-body">

      <!-- Status + date -->
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="status-badge ${statusCls}">${statusLabel}</span>
        <span style="font-size:.88rem;color:var(--text-light)">
          Matched on ${formatDate(dateStr)}
        </span>
        <span style="font-size:.82rem;color:var(--text-light);margin-left:auto">
          Match #${String(match.id).slice(0, 8).toUpperCase()}
        </span>
      </div>

      <!-- Job details -->
      <div>
        <div style="font-size:.95rem;font-weight:600;color:var(--navy);margin-bottom:10px">
          <i class="fas fa-baby" style="color:var(--gold);margin-right:6px"></i>Job Details
        </div>
        <div class="match-detail-grid">
          ${[
            ["Job Title",   jobTitle,   "fa-briefcase"],
            ["Salary",      salary,     "fa-coins"],
            ["Schedule",    schedule,   "fa-clock"],
            ["Experience",  `${match.job_post?.required_experience || 0}+ yrs`, "fa-star"],
            ["Care Needs",  match.job_post?.care_needs || "General childcare", "fa-heart"],
            ["Location",    location,   "fa-map-marker-alt"],
          ].map(([label, val, icon]) => `
            <div class="match-detail-chip">
              <label><i class="fas ${icon}" style="color:var(--gold);margin-right:4px"></i>${label}</label>
              <span>${val}</span>
            </div>`).join("")}
        </div>
      </div>

      ${match.job_post?.duties ? `
        <div>
          <div style="font-size:.95rem;font-weight:600;color:var(--navy);margin-bottom:8px">
            <i class="fas fa-list-check" style="color:var(--gold);margin-right:6px"></i>Duties
          </div>
          <p style="font-size:.93rem;line-height:1.7;color:var(--text-mid)">${match.job_post.duties}</p>
        </div>` : ""}

    </div>

    <div class="modal-footer">
      <button class="btn-apply" onclick="showToast('Contact feature coming soon!','info')">
        <i class="fas fa-comment-dots"></i> Contact Family
      </button>
      <button class="btn-secondary" onclick="window._closeMatchModal()">Close</button>
    </div>`;

  $("matchModal").classList.add("open");
}

function closeMatchModal() { $("matchModal")?.classList.remove("open"); }

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
  toggle?.addEventListener("click",  e => { e.stopPropagation(); sidebar?.classList.contains("open") ? close() : open(); });
  overlay?.addEventListener("click", close);
  window.addEventListener("resize",  () => { if (window.innerWidth > 768) close(); });
}

/* ═══════════════════════════════════════════
   EVENTS
═══════════════════════════════════════════ */
function setupEvents() {
  // Search
  let dbt;
  $("matchSearch")?.addEventListener("input", e => {
    State.keyword = e.target.value;
    $("clearMatchSearch").style.display = e.target.value ? "flex" : "none";
    clearTimeout(dbt);
    dbt = setTimeout(() => { applyFiltersAndSort(); renderMatches(); }, 260);
  });

  $("clearMatchSearch")?.addEventListener("click", () => {
    $("matchSearch").value = "";
    $("clearMatchSearch").style.display = "none";
    State.keyword = "";
    applyFiltersAndSort(); renderMatches();
  });

  // Status tabs
  $("matchTabs")?.addEventListener("click", e => {
    const tab = e.target.closest(".mtab");
    if (!tab) return;
    document.querySelectorAll(".mtab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    State.activeStatus = tab.dataset.status || "all";
    applyFiltersAndSort(); renderMatches();
  });

  // Sort
  $("matchSort")?.addEventListener("change", e => {
    State.sort = e.target.value;
    applyFiltersAndSort(); renderMatches();
  });

  // Modal backdrop + Escape
  $("matchModal")?.addEventListener("click", e => { if (e.target === $("matchModal")) closeMatchModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMatchModal(); });
}

/* ═══════════════════════════════════════════
   GLOBAL REFS
═══════════════════════════════════════════ */
window._openMatchModal  = openMatchModal;
window._closeMatchModal = closeMatchModal;
window.showToast        = showToast;

window._goPage = (page) => {
  const total = Math.ceil(State.filteredMatches.length / MATCHES_PER_PAGE);
  if (page < 1 || page > total) return;
  State.currentPage = page;
  renderMatches();
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
    const [matches, profile] = await Promise.all([
      fetchMatches(),
      fetchProfile(),
    ]);

    State.allMatches = matches;

    // Header
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
    renderMatches();

  } catch (err) {
    console.error("Matches page init error:", err);
    $("matchesList").innerHTML = `
      <div class="matches-empty">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Could not load matches</h3>
        <p>Please refresh the page or check your connection.</p>
      </div>`;
    showToast("Failed to load matches.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);