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
  return (name||"").trim().split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("") || "?";
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" });
}

function fmtKsh(n) {
  if (n == null) return "—";
  return `Ksh ${Number(n).toLocaleString("en-KE")}`;
}

function timeAgo(d) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30)  return `${days}d ago`;
  return fmtDate(d);
}

/* ─── Status normaliser ─── */
function normalizeStatus(raw) {
  const s = (raw || "pending").toLowerCase().replace(/[\s-]/g, "_");
  if (["active","confirmed"].includes(s))                    return "active";
  if (["both_paid","bothpaid"].includes(s))                  return "both_paid";
  if (["awaiting_payment","awaitingpayment","nanny_paid",
       "nannypaid","pending","partially_paid"].includes(s))  return "pending";
  if (["matched","interviewing","background","offer",
       "negotiating","in_progress"].includes(s))             return "matched";
  if (["ended","terminated","cancelled","closed",
       "completed"].includes(s))                             return "ended";
  return "pending";
}

const STATUS_META = {
  active:     { label:"Active",           icon:"fa-circle-dot",    cls:"active" },
  both_paid:  { label:"Both Paid",        icon:"fa-circle-check",  cls:"both_paid" },
  pending:    { label:"Awaiting Payment", icon:"fa-clock",         cls:"pending" },
  matched:    { label:"Matched",          icon:"fa-handshake",     cls:"matched" },
  ended:      { label:"Ended",            icon:"fa-circle-xmark",  cls:"ended" },
};

/* Progress % per status */
const STATUS_PROGRESS = {
  pending:   30,
  matched:   55,
  active:    80,
  both_paid: 90,
  ended:     100,
};

/* ─── STATE ─── */
const State = {
  matches:        [],
  payments:       {},   // { matchId: [payments] }
  nannyProfiles:  {},   // { nannyId: profile }
  filtered:       [],
  search:         "",
  tabFilter:      "all",
  openMatchId:    null,
  currentUserId:  null,
};

/* ─── API ─── */
async function apiFetch(path, fallback = null) {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
    if (!res.ok) { console.warn(`[matches] ${path} → ${res.status}`); return fallback; }
    return res.json();
  } catch(e) { console.error(e); return fallback; }
}

async function fetchMatches() {
  const data = await apiFetch("/matches/", []);
  return Array.isArray(data) ? data : (data?.matches || data?.data || []);
}

async function fetchPaymentsForMatch(matchId) {
  const data = await apiFetch(`/payments/match/${matchId}`, []);
  return Array.isArray(data) ? data : (data?.payments || []);
}

async function fetchNannyProfile(nannyId) {
  if (State.nannyProfiles[nannyId]) return State.nannyProfiles[nannyId];
  const profile = await apiFetch(`/Nanny/${nannyId}`, null);
  if (profile) State.nannyProfiles[nannyId] = profile;
  return profile;
}

async function fetchProfile() {
  try {
    let uid = localStorage.getItem("user_id");
    if (!uid) {
      const tok = localStorage.getItem("access_token");
      if (tok) { try { uid = JSON.parse(atob(tok.split(".")[1])).sub; } catch {} }
    }
    if (!uid) return null;
    State.currentUserId = uid;
    const res = await fetch(`${API_URL}/Family/${uid}`, { headers: authHeaders() });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

/* ─── Load payments for all matches ─── */
async function loadAllPayments() {
  await Promise.all(
    State.matches.map(async m => {
      const payments = await fetchPaymentsForMatch(m.id);
      State.payments[String(m.id)] = payments;
    })
  );
}

/* ─── STATS ─── */
function renderStats() {
  const matches = State.matches;
  const byStatus = s => matches.filter(m => normalizeStatus(m.status) === s).length;

  safeText("stTotal",    matches.length);
  safeText("stActive",   byStatus("active") + byStatus("both_paid"));
  safeText("stPending",  byStatus("pending"));
  safeText("stBothPaid", byStatus("both_paid"));
  safeText("stEnded",    byStatus("ended"));

  safeText("mmSubtitle",
    matches.length === 0
      ? "No matches yet. Accept an application to create your first match."
      : `${matches.length} match${matches.length !== 1 ? "es" : ""} found`
  );
}

/* ─── FILTER ─── */
function applyFilters() {
  let list = [...State.matches];
  const kw = State.search.toLowerCase();

  if (kw) {
    list = list.filter(m => {
      const nannyName = (State.nannyProfiles[m.selected_nanny_id]?.name || "").toLowerCase();
      const jobTitle  = (m.job_post?.title || "").toLowerCase();
      return nannyName.includes(kw) || jobTitle.includes(kw);
    });
  }

  if (State.tabFilter !== "all") {
    if (State.tabFilter === "active") {
      list = list.filter(m => ["active","both_paid"].includes(normalizeStatus(m.status)));
    } else if (State.tabFilter === "ended") {
      list = list.filter(m => normalizeStatus(m.status) === "ended");
    } else {
      list = list.filter(m => normalizeStatus(m.status) === State.tabFilter);
    }
  }

  // Newest first
  list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  State.filtered = list;

  const rc = $("mmResultsCount");
  if (rc) rc.textContent = list.length === State.matches.length
    ? `${list.length} match${list.length !== 1 ? "es" : ""}`
    : `${list.length} of ${State.matches.length}`;
}

/* ─── PAYMENT HELPERS ─── */
function isPaid(p) {
  return ["completed","success"].includes((p.payment_status||"").toLowerCase());
}

function getFamilyPayment(matchId) {
  const payments = State.payments[String(matchId)] || [];
  return payments.find(p => String(p.user_id) === String(State.currentUserId));
}

function getNannyPayment(matchId) {
  const payments = State.payments[String(matchId)] || [];
  return payments.find(p => String(p.user_id) !== String(State.currentUserId));
}

function familyHasPaid(matchId) {
  const p = getFamilyPayment(matchId);
  return p && isPaid(p);
}

function nannyHasPaid(matchId) {
  const p = getNannyPayment(matchId);
  return p && isPaid(p);
}

/* ─── RENDER GRID ─── */
function renderGrid() {
  applyFilters();
  const grid = $("mmGrid");
  if (!grid) return;

  if (State.filtered.length === 0) {
    const hasFilter = State.search || State.tabFilter !== "all";
    grid.innerHTML = `
      <div class="mm-empty">
        <i class="fas ${hasFilter ? "fa-filter" : "fa-handshake"}"></i>
        <h3>${hasFilter ? "No matching results" : "No matches yet"}</h3>
        <p>${hasFilter
          ? "Try clearing your search or filter."
          : "When you accept a nanny application, a match will be created here."}</p>
        <a href="familyapplications.html"><i class="fas fa-inbox"></i> View Applications</a>
      </div>`;
    return;
  }

  grid.innerHTML = State.filtered.map(m => buildCard(m)).join("");

  // Animate progress bars after render
  requestAnimationFrame(() => {
    grid.querySelectorAll(".mm-progress-fill[data-pct]").forEach(el => {
      el.style.width = el.dataset.pct + "%";
    });
  });

  // Card click → drawer
  grid.querySelectorAll(".mm-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".mm-card-btn")) return;
      openDrawer(card.dataset.matchId);
    });
  });
}

function buildCard(match) {
  const status   = normalizeStatus(match.status);
  const sMeta    = STATUS_META[status] || STATUS_META.pending;
  const progress = STATUS_PROGRESS[status] || 30;

  const nanny     = State.nannyProfiles[match.selected_nanny_id] || {};
  const nannyName = nanny.name || "Nanny";
  const exp       = nanny.years_experience;
  const photo     = nanny.profile_photo_url;

  const job       = match.job_post || {};
  const avail     = { full_time:"Full Time", part_time:"Part Time", evenings:"Evenings", weekends:"Weekends" };

  const famPaid  = familyHasPaid(match.id);
  const nanPaid  = nannyHasPaid(match.id);
  const myPending = !famPaid && status !== "ended";

  const avatarHTML = photo
    ? `<img src="${photo}" alt="${nannyName}">`
    : initials(nannyName);

  return `
    <div class="mm-card s-${status}" data-match-id="${match.id}">
      <div class="mm-card-header">
        <div class="mm-card-avatar">${avatarHTML}</div>
        <div class="mm-card-nanny-info">
          <div class="mm-card-nanny-name">${nannyName}</div>
          <div class="mm-card-nanny-meta">
            ${exp != null ? `<span><i class="fas fa-star"></i>${exp} yr exp</span>` : ""}
            ${nanny.preferred_location ? `<span><i class="fas fa-map-pin"></i>${nanny.preferred_location}</span>` : ""}
          </div>
        </div>
        <span class="mm-status-badge ${sMeta.cls}">
          <i class="fas ${sMeta.icon}"></i>${sMeta.label}
        </span>
      </div>

      <div class="mm-card-body">
        <div class="mm-card-job">
          <div class="mm-card-job-icon"><i class="fas fa-briefcase"></i></div>
          <div class="mm-card-job-info">
            <div class="mm-card-job-title">${job.title || "Job Post"}</div>
            <div class="mm-card-job-meta">
              ${[job.location, avail[job.availability]].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </div>

        <div class="mm-payment-row">
          <div class="mm-pay-pill ${famPaid ? "paid" : myPending ? "pending-pay" : "unpaid"}">
            <i class="fas ${famPaid ? "fa-circle-check" : "fa-circle"}"></i>
            <span>You: ${famPaid ? "Paid" : "Not paid"}</span>
          </div>
          <div class="mm-pay-pill ${nanPaid ? "paid" : "unpaid"}">
            <i class="fas ${nanPaid ? "fa-circle-check" : "fa-circle"}"></i>
            <span>Nanny: ${nanPaid ? "Paid" : "Not paid"}</span>
          </div>
        </div>

        <div class="mm-progress-wrap">
          <div class="mm-progress-label">
            <span>Progress</span>
            <strong>${sMeta.label}</strong>
          </div>
          <div class="mm-progress-bar">
            <div class="mm-progress-fill" data-pct="${progress}" style="width:0"></div>
          </div>
        </div>
      </div>

      <div class="mm-card-footer">
        <span class="mm-card-date"><i class="fas fa-calendar"></i>${timeAgo(match.match_date || match.created_at)}</span>
        ${myPending
          ? `<a class="mm-card-btn pay" href="familypayments.html?match=${match.id}">
               <i class="fas fa-wallet"></i> Pay Now
             </a>`
          : `<button class="mm-card-btn" onclick="openDrawer('${match.id}')">
               <i class="fas fa-eye"></i> Details
             </button>`
        }
      </div>
    </div>`;
}

/* ─── DRAWER ─── */
async function openDrawer(matchId) {
  const match = State.matches.find(m => String(m.id) === String(matchId));
  if (!match) return;
  State.openMatchId = String(matchId);

  const overlay = $("drawerOverlay");
  const drawer  = $("matchDrawer");
  const body    = $("drawerBody");
  const footer  = $("drawerFooter");
  const title   = $("drawerTitle");

  overlay?.classList.add("open");
  drawer?.classList.add("open");

  // Skeleton
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="skeleton" style="height:80px;border-radius:var(--radius-sm)"></div>
      <div class="skeleton" style="height:100px;border-radius:var(--radius-sm)"></div>
      <div class="skeleton" style="height:80px;border-radius:var(--radius-sm)"></div>
    </div>`;

  // Fetch full nanny profile if needed
  let nanny = State.nannyProfiles[match.selected_nanny_id] || {};
  if (!nanny.name) {
    const full = await fetchNannyProfile(match.selected_nanny_id);
    if (full) nanny = full;
  }

  // Fetch payments if not cached
  if (!State.payments[String(matchId)]) {
    State.payments[String(matchId)] = await fetchPaymentsForMatch(matchId);
  }

  const payments = State.payments[String(matchId)] || [];
  const status   = normalizeStatus(match.status);
  const sMeta    = STATUS_META[status] || STATUS_META.pending;
  const job      = match.job_post || {};
  const nannyName = nanny.name || "Your Nanny";
  const photo     = nanny.profile_photo_url;
  const avail     = { full_time:"Full Time", part_time:"Part Time", evenings:"Evenings", weekends:"Weekends" };
  const famPaid   = familyHasPaid(matchId);
  const nanPaid   = nannyHasPaid(matchId);

  title.textContent = nannyName;

  const avatarHTML = photo
    ? `<img src="${photo}" alt="${nannyName}">`
    : initials(nannyName);

  const skills = Array.isArray(nanny.skills) ? nanny.skills : [];

  // Payment history rows
  const payRows = payments.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:var(--text-light);font-size:.8rem">No payments yet</td></tr>`
    : payments.map(p => {
        const paid = isPaid(p);
        const isFam = String(p.user_id) === String(State.currentUserId);
        return `<tr>
          <td>${isFam ? "You (Family)" : "Nanny"}</td>
          <td>${fmtKsh(p.amount)}</td>
          <td><span class="status-badge ${paid ? "accepted" : "pending"}">${paid ? "Paid" : "Pending"}</span></td>
          <td style="font-size:.75rem;color:var(--text-light)">${p.mpesa_transaction_code || "—"}</td>
        </tr>`;
      }).join("");

  body.innerHTML = `
    <!-- Nanny hero -->
    <div class="mm-drawer-section">
      <div class="mm-drawer-nanny-hero">
        <div class="mm-drawer-avatar">${avatarHTML}</div>
        <div class="mm-drawer-nanny-info">
          <strong>${nannyName}</strong>
          <span>${nanny.years_experience != null ? `${nanny.years_experience} year${nanny.years_experience !== 1 ? "s" : ""} experience` : "Experience not specified"}</span>
          <div style="margin-top:5px">
            <span class="mm-status-badge ${sMeta.cls}" style="font-size:.65rem">
              <i class="fas ${sMeta.icon}"></i>${sMeta.label}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Match Info -->
    <div class="mm-drawer-section">
      <div class="mm-drawer-section-title">Match Info</div>
      <div class="mm-drawer-grid">
        <div class="mm-drawer-item">
          <label>Matched On</label>
          <span>${fmtDate(match.match_date || match.created_at)}</span>
        </div>
        <div class="mm-drawer-item">
          <label>Status</label>
          <span>${sMeta.label}</span>
        </div>
        <div class="mm-drawer-item full">
          <label>Job Post</label>
          <span>${job.title || "—"}</span>
        </div>
        <div class="mm-drawer-item">
          <label>Location</label>
          <span>${job.location || "—"}</span>
        </div>
        <div class="mm-drawer-item">
          <label>Availability</label>
          <span>${avail[job.availability] || job.availability || "—"}</span>
        </div>
        ${job.salary ? `
        <div class="mm-drawer-item">
          <label>Salary</label>
          <span>${fmtKsh(job.salary)}/mo</span>
        </div>` : ""}
        ${nanny.preferred_location ? `
        <div class="mm-drawer-item">
          <label>Nanny Location</label>
          <span>${nanny.preferred_location}</span>
        </div>` : ""}
      </div>
    </div>

    <!-- Nanny skills -->
    ${skills.length > 0 ? `
    <div class="mm-drawer-section">
      <div class="mm-drawer-section-title">Nanny Skills</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">
        ${skills.map(s => `<span style="
          font-size:.71rem;font-weight:600;padding:3px 9px;
          border-radius:99px;background:var(--cream-2);
          color:var(--text-mid);border:1px solid var(--border)">${s}</span>`).join("")}
      </div>
    </div>` : ""}

    <!-- Connection fee payment -->
    <div class="mm-drawer-section">
      <div class="mm-drawer-section-title">Connection Fee</div>
      <div class="mm-drawer-pay-grid">
        <div class="mm-drawer-pay-item ${famPaid ? "paid" : "unpaid"}">
          <label>Your Payment</label>
          <span>${famPaid ? "✓ Paid" : "Not paid yet"}</span>
        </div>
        <div class="mm-drawer-pay-item ${nanPaid ? "paid" : "unpaid"}">
          <label>Nanny Payment</label>
          <span>${nanPaid ? "✓ Paid" : "Not paid yet"}</span>
        </div>
      </div>
    </div>

    <!-- Payment history -->
    <div class="mm-drawer-section">
      <div class="mm-drawer-section-title">Payment History</div>
      <div style="overflow-x:auto">
        <table class="mm-pay-table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Amount</th>
              <th>Status</th>
              <th>M-Pesa Code</th>
            </tr>
          </thead>
          <tbody>${payRows}</tbody>
        </table>
      </div>
    </div>`;

  // Footer buttons
  const isPaidByFamily = famPaid;
  const isEnded = status === "ended";

  if (isEnded) {
    footer.innerHTML = `
      <button class="mm-drawer-btn secondary" id="drawerCloseBtn">
        <i class="fas fa-arrow-left"></i> Back
      </button>`;
  } else if (!isPaidByFamily) {
    footer.innerHTML = `
      <a class="mm-drawer-btn pay" href="familypayments.html?match=${match.id}">
        <i class="fas fa-wallet"></i> Pay Connection Fee
      </a>
      <a class="mm-drawer-btn secondary" href="familycontracts.html?match=${match.id}">
        <i class="fas fa-file-contract"></i> View Contract
      </a>`;
  } else {
    footer.innerHTML = `
      <a class="mm-drawer-btn primary" href="familycontracts.html?match=${match.id}">
        <i class="fas fa-file-contract"></i> View Contract
      </a>
      <a class="mm-drawer-btn secondary" href="familypayments.html?match=${match.id}">
        <i class="fas fa-wallet"></i> Payment History
      </a>`;
  }

  $("drawerCloseBtn")?.addEventListener("click", closeDrawer);
}

function closeDrawer() {
  $("drawerOverlay")?.classList.remove("open");
  $("matchDrawer")?.classList.remove("open");
  State.openMatchId = null;
}

window.openDrawer = openDrawer;

/* ─── SKELETONS ─── */
function renderSkeletons() {
  const grid = $("mmGrid");
  if (!grid) return;
  grid.innerHTML = [1,2,3].map(() => `
    <div class="mm-skeleton-card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
        <div class="skeleton" style="width:48px;height:48px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px">
          <div class="skeleton" style="height:13px;width:50%"></div>
          <div class="skeleton" style="height:10px;width:35%"></div>
        </div>
        <div class="skeleton" style="width:70px;height:22px;border-radius:99px"></div>
      </div>
      <div class="skeleton" style="height:44px;border-radius:var(--radius-sm)"></div>
      <div class="skeleton" style="height:36px;border-radius:99px;margin-top:4px"></div>
      <div class="skeleton" style="height:18px;border-radius:99px;margin-top:4px"></div>
    </div>`).join("");
}

/* ─── ACTIVE NAV + SIDEBAR ─── */
function setupActiveNav() {
  const page = window.location.pathname.split("/").pop() || "familymatches.html";
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

/* ─── EVENTS ─── */
function setupEvents() {
  // Search
  let dbt;
  $("mmSearch")?.addEventListener("input", e => {
    State.search = e.target.value;
    $("mmSearchClear").style.display = e.target.value ? "block" : "none";
    clearTimeout(dbt);
    dbt = setTimeout(renderGrid, 220);
  });

  $("mmSearchClear")?.addEventListener("click", () => {
    $("mmSearch").value = ""; State.search = "";
    $("mmSearchClear").style.display = "none";
    renderGrid();
  });

  // Filter tabs
  document.querySelectorAll(".mm-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mm-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      State.tabFilter = tab.dataset.filter;
      renderGrid();
    });
  });

  // Drawer
  $("closeDrawer")?.addEventListener("click",   closeDrawer);
  $("drawerOverlay")?.addEventListener("click", closeDrawer);

  // Refresh
  $("btnRefresh")?.addEventListener("click", async () => {
    renderSkeletons();
    await loadData();
    showToast("Matches refreshed.", "info");
  });

  // Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeDrawer();
  });
}

/* ─── AUTH GUARD ─── */
function authGuard() {
  const token = localStorage.getItem("access_token");
  if (!token) { window.location.href = "/frontend/src/views/login.html"; return false; }
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p.exp && p.exp * 1000 < Date.now()) {
      localStorage.clear(); window.location.href = "/frontend/src/views/login.html"; return false;
    }
  } catch {}
  return true;
}

/* ─── LOAD DATA ─── */
async function loadData() {
  const [profile, matches] = await Promise.all([fetchProfile(), fetchMatches()]);

  if (profile) {
    safeText("sidebarName", profile.name || "Family");
    const av = $("sidebarAvatar");
    if (av) av.textContent = initials(profile.name || "F");
  }

  State.matches = matches;

  // Fetch nanny profiles + payments in parallel
  await Promise.all([
    ...matches.map(m => fetchNannyProfile(m.selected_nanny_id)),
    loadAllPayments(),
  ]);

  renderStats();
  renderGrid();
}

/* ─── INIT ─── */
async function init() {
  if (!authGuard()) return;
  setupActiveNav();
  setupSidebar();
  setupEvents();
  renderSkeletons();
  await loadData();

  // Auto-open match from URL ?match=id
  const param = new URLSearchParams(window.location.search).get("match");
  if (param) openDrawer(param);
}

document.addEventListener("DOMContentLoaded", init);