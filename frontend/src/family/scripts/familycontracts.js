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

function initials(n="") { return (n||"").trim().split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("")||"F"; }
function fmtDate(d) { if(!d) return "—"; return new Date(d).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"}); }
function fmtDateTime(d) { if(!d) return "—"; return new Date(d).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
const fmtKsh = n => n == null ? "—" : `Ksh ${Number(n).toLocaleString("en-KE")}`;
const AVAIL = { full_time:"Full Time", part_time:"Part Time", evenings:"Evenings", weekends:"Weekends" };

/* Contract status helpers */
function contractStatus(c) {
  const a = c.acceptance;
  if (!a) return "draft";
  if (a.family_accepted && a.nanny_accepted) return "active";
  return "pending";
}

function needsMySignature(c, userId) {
  const a = c.acceptance;
  if (!a) return false;
  return !a.family_accepted;   // family always = current user on this page
}

/* ─── STATE ─── */
const State = {
  contracts:     [],
  filtered:      [],
  matches:       [],
  nannyProfiles: {},
  currentUserId: null,
  search:        "",
  tabFilter:     "all",
  openContractId: null,
  drawerTab:     "text",
  pendingGenerateMatchId: null,
};

/* ─── API ─── */
async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(), ...opts });
    if (!res.ok) { console.warn(`[contracts] ${path} → ${res.status}`); return null; }
    return res.json();
  } catch(e) { console.error(e); return null; }
}

async function fetchContracts() {
  const data = await apiFetch("/contracts/me");
  return Array.isArray(data) ? data : (data?.contracts || []);
}

async function fetchMatches() {
  const data = await apiFetch("/matches/");
  return Array.isArray(data) ? data : (data?.matches || []);
}

async function fetchNannyProfile(nannyId) {
  if (!nannyId || State.nannyProfiles[nannyId]) return State.nannyProfiles[nannyId] || null;
  const p = await apiFetch(`/Nanny/${nannyId}`);
  if (p) State.nannyProfiles[nannyId] = p;
  return p;
}

async function fetchProfile() {
  try {
    let uid = localStorage.getItem("user_id");
    if (!uid) {
      const tok = localStorage.getItem("access_token");
      if (tok) try { uid = JSON.parse(atob(tok.split(".")[1])).sub; } catch {}
    }
    if (!uid) return null;
    State.currentUserId = uid;
    const res = await fetch(`${API_URL}/Family/${uid}`, { headers: authHeaders() });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function generateContract(matchId, customText = null) {
  const body = {};
  if (customText) body.contract_text = customText;
  const res = await fetch(`${API_URL}/contracts/generate/${matchId}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Generation failed.");
  return data;
}

async function acceptContract(contractId) {
  const res = await fetch(`${API_URL}/contracts/${contractId}/accept`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Acceptance failed.");
  return data;
}

/* ─── STATS ─── */
function renderStats() {
  const cs = State.contracts;
  const active    = cs.filter(c => contractStatus(c) === "active").length;
  const pending   = cs.filter(c => contractStatus(c) === "pending").length;
  const needsSig  = cs.filter(c => needsMySignature(c, State.currentUserId)).length;

  safeText("stTotal",    cs.length);
  safeText("stActive",   active);
  safeText("stPending",  pending + cs.filter(c=>contractStatus(c)==="draft").length);
  safeText("stNeedsSig", needsSig);

  safeText("fcSubtitle",
    cs.length === 0
      ? "No contracts yet. Generate one from a match."
      : `${cs.length} contract${cs.length !== 1 ? "s" : ""} found`
  );
}

/* ─── FILTER ─── */
function applyFilters() {
  let list = [...State.contracts];
  const kw = State.search.toLowerCase();

  if (kw) {
    list = list.filter(c => {
      const match = State.matches.find(m => String(m.id) === String(c.match_id));
      const job   = (match?.job_post?.title || "").toLowerCase();
      const nanny = (State.nannyProfiles[match?.selected_nanny_id]?.name || "").toLowerCase();
      return job.includes(kw) || nanny.includes(kw);
    });
  }

  if (State.tabFilter !== "all") {
    list = list.filter(c => {
      const s = contractStatus(c);
      if (State.tabFilter === "active")       return s === "active";
      if (State.tabFilter === "pending")      return s === "pending" || s === "draft";
      if (State.tabFilter === "needs_my_sig") return needsMySignature(c, State.currentUserId);
      return true;
    });
  }

  list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  State.filtered = list;

  const rc = $("fcResultsCount");
  if (rc) rc.textContent = list.length === State.contracts.length
    ? `${list.length} contract${list.length!==1?"s":""}`
    : `${list.length} of ${State.contracts.length}`;
}

/* ─── RENDER LIST ─── */
function renderList() {
  applyFilters();
  const el = $("fcList");
  if (!el) return;

  if (State.filtered.length === 0) {
    // Check if there are matches without contracts — show generate prompts
    const matchesWithoutContracts = State.matches.filter(m => {
      const s = (m.status||"").toLowerCase().replace(/_/g,"");
      const hasContract = State.contracts.some(c => String(c.match_id) === String(m.id));
      return !["ended","terminated","cancelled"].includes(s) && !hasContract;
    });

    const hasFilter = State.search || State.tabFilter !== "all";
    el.innerHTML = `
      <div class="fc-empty">
        <i class="fas ${hasFilter ? "fa-filter" : "fa-file-contract"}"></i>
        <h3>${hasFilter ? "No matching contracts" : "No contracts yet"}</h3>
        <p>${hasFilter
          ? "Try clearing your search or filter."
          : "Generate a contract for one of your active matches."}</p>
        ${!hasFilter && matchesWithoutContracts.length > 0
          ? `<a href="#" id="emptyGenerateBtn">
               <i class="fas fa-wand-magic-sparkles"></i>
               Generate Contract
             </a>`
          : `<a href="familymatches.html">
               <i class="fas fa-handshake"></i> View Matches
             </a>`}
      </div>`;

    $("emptyGenerateBtn")?.addEventListener("click", e => {
      e.preventDefault();
      openGenerateModal(matchesWithoutContracts[0].id);
    });
    return;
  }

  el.innerHTML = State.filtered.map(c => buildCard(c)).join("");

  el.querySelectorAll(".fc-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".fc-btn")) return;
      openDrawer(card.dataset.contractId);
    });
  });

  el.querySelectorAll(".fc-btn[data-action]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "view")     openDrawer(id);
      if (action === "sign")     openAcceptModal(id);
      if (action === "generate") openGenerateModal(id);
    });
  });
}

function buildCard(c) {
  const status = contractStatus(c);
  const match  = State.matches.find(m => String(m.id) === String(c.match_id));
  const nanny  = match ? State.nannyProfiles[match.selected_nanny_id] : null;
  const job    = match?.job_post || {};
  const nannyName = nanny?.name || "Nanny";
  const mySign    = c.acceptance?.family_accepted;
  const nannySign = c.acceptance?.nanny_accepted;
  const needsSig  = !mySign && status !== "draft";

  return `
    <div class="fc-card s-${status}" data-contract-id="${c.id}">
      <div class="fc-card-inner">
        <div class="fc-card-icon">
          <i class="fas fa-file-contract"></i>
        </div>
        <div class="fc-card-info">
          <div class="fc-card-title">${job.title || "Employment Contract"}</div>
          <div class="fc-card-meta">
            <span><i class="fas fa-person"></i>${nannyName}</span>
            ${job.location ? `<span><i class="fas fa-map-pin"></i>${job.location}</span>` : ""}
            <span><i class="fas fa-calendar"></i>${fmtDate(c.generation_date || c.created_at)}</span>
            ${fmtKsh(job.salary) !== "—" ? `<span><i class="fas fa-coins"></i>${fmtKsh(job.salary)}/mo</span>` : ""}
          </div>
        </div>

        <div class="fc-accept-pills">
          <div class="fc-accept-pill ${mySign ? "signed" : "unsigned"}">
            <i class="fas ${mySign ? "fa-circle-check" : "fa-circle"}"></i>
            You
          </div>
          <div class="fc-accept-pill ${nannySign ? "signed" : "unsigned"}">
            <i class="fas ${nannySign ? "fa-circle-check" : "fa-circle"}"></i>
            Nanny
          </div>
        </div>

        <div class="fc-card-actions">
          ${needsSig
            ? `<button class="fc-btn sign" data-action="sign" data-id="${c.id}">
                 <i class="fas fa-pen-nib"></i> Sign
               </button>`
            : ""}
          <button class="fc-btn view" data-action="view" data-id="${c.id}">
            <i class="fas fa-eye"></i> View
          </button>
        </div>
      </div>
    </div>`;
}

/* ─── DRAWER ─── */
function openDrawer(contractId) {
  const c     = State.contracts.find(c => String(c.id) === String(contractId));
  if (!c) return;
  State.openContractId = String(contractId);
  State.drawerTab      = "text";

  $("drawerOverlay")?.classList.add("open");
  $("contractDrawer")?.classList.add("open");

  const match    = State.matches.find(m => String(m.id) === String(c.match_id));
  const nanny    = match ? State.nannyProfiles[match.selected_nanny_id] : null;
  const nannyName = nanny?.name || "Nanny";
  const status   = contractStatus(c);

  safeText("drawerTitle", match?.job_post?.title || "Contract");
  const badge = $("drawerBadge");
  if (badge) { badge.textContent = status === "active" ? "Both Signed" : status === "pending" ? "Awaiting Signatures" : "Draft"; badge.className = `fc-drawer-badge ${status}`; }

  renderDrawerTab(c, match, nanny);
  renderDrawerFooter(c);

  // Tab switching
  document.querySelectorAll(".fc-drawer-tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".fc-drawer-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      State.drawerTab = tab.dataset.tab;
      renderDrawerTab(c, match, nanny);
    };
  });
}

function renderDrawerTab(c, match, nanny) {
  const body = $("drawerBody");
  if (!body) return;

  if (State.drawerTab === "text") {
    const job = match?.job_post || {};
    body.innerHTML = `
      <!-- Match info -->
      <div>
        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-light);padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:10px">
          Match Details
        </div>
        <div class="fc-drawer-grid">
          <div class="fc-drawer-item">
            <label>Nanny</label>
            <span>${nanny?.name || "—"}</span>
          </div>
          <div class="fc-drawer-item">
            <label>Generated</label>
            <span>${fmtDate(c.generation_date || c.created_at)}</span>
          </div>
          <div class="fc-drawer-item full">
            <label>Job Post</label>
            <span>${job.title || "—"}</span>
          </div>
          <div class="fc-drawer-item">
            <label>Location</label>
            <span>${job.location || "—"}</span>
          </div>
          <div class="fc-drawer-item">
            <label>Salary</label>
            <span>${fmtKsh(job.salary)}/mo</span>
          </div>
        </div>
      </div>
      <!-- Contract text -->
      <div>
        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-light);padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:10px">
          Contract Text
        </div>
        <div class="fc-contract-text-wrap">${
          c.contract_text
            ? c.contract_text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
            : "<em style='color:var(--text-light)'>No contract text generated yet.</em>"
        }</div>
      </div>`;
  } else {
    // Signatures tab
    const a = c.acceptance;
    body.innerHTML = `
      <div class="fc-sig-section">
        <div class="fc-sig-title">Signature Status</div>
        <div class="fc-sig-card ${a?.family_accepted ? "signed" : "unsigned"}">
          <div class="fc-sig-icon"><i class="fas ${a?.family_accepted ? "fa-pen-nib" : "fa-clock"}"></i></div>
          <div class="fc-sig-info">
            <strong>Your Family</strong>
            <span>${a?.family_accepted
              ? `Signed on ${fmtDateTime(a.family_acceptance_date)}`
              : "Not signed yet"}</span>
          </div>
        </div>
        <div class="fc-sig-card ${a?.nanny_accepted ? "signed" : "unsigned"}">
          <div class="fc-sig-icon"><i class="fas ${a?.nanny_accepted ? "fa-pen-nib" : "fa-clock"}"></i></div>
          <div class="fc-sig-info">
            <strong>${nanny?.name || "Nanny"}</strong>
            <span>${a?.nanny_accepted
              ? `Signed on ${fmtDateTime(a.nanny_acceptance_date)}`
              : "Not signed yet"}</span>
          </div>
        </div>
      </div>

      <div class="fc-sig-section" style="margin-top:8px">
        <div class="fc-sig-title">Contract Info</div>
        <div class="fc-drawer-grid">
          <div class="fc-drawer-item">
            <label>Contract ID</label>
            <span style="font-size:.75rem;font-family:monospace">${String(c.id).slice(0,13)}…</span>
          </div>
          <div class="fc-drawer-item">
            <label>Match ID</label>
            <span style="font-size:.75rem;font-family:monospace">${String(c.match_id).slice(0,13)}…</span>
          </div>
          <div class="fc-drawer-item">
            <label>Generated</label>
            <span>${fmtDate(c.generation_date || c.created_at)}</span>
          </div>
          <div class="fc-drawer-item">
            <label>Last Updated</label>
            <span>${fmtDate(c.updated_at)}</span>
          </div>
        </div>
      </div>`;
  }
}

function renderDrawerFooter(c) {
  const footer = $("drawerFooter");
  if (!footer) return;
  const status  = contractStatus(c);
  const mySign  = c.acceptance?.family_accepted;

  if (!c.contract_text) {
    // No text generated yet — shouldn't happen from this page but handle gracefully
    footer.innerHTML = `
      <button class="fc-drawer-btn secondary" id="drawerCloseBtn">
        <i class="fas fa-arrow-left"></i> Back
      </button>`;
  } else if (!mySign) {
    footer.innerHTML = `
      <button class="fc-drawer-btn sign" id="drawerSignBtn">
        <i class="fas fa-pen-nib"></i> Sign This Contract
      </button>
      <button class="fc-drawer-btn secondary" id="drawerCloseBtn">
        <i class="fas fa-arrow-left"></i> Back
      </button>`;
    $("drawerSignBtn")?.addEventListener("click", () => openAcceptModal(c.id));
  } else {
    footer.innerHTML = `
      <button class="fc-drawer-btn secondary" id="drawerCloseBtn">
        <i class="fas fa-arrow-left"></i> Back
      </button>`;
  }
  $("drawerCloseBtn")?.addEventListener("click", closeDrawer);
}

function closeDrawer() {
  $("drawerOverlay")?.classList.remove("open");
  $("contractDrawer")?.classList.remove("open");
  State.openContractId = null;
}

/* ─── GENERATE MODAL ─── */
function openGenerateModal(matchId) {
  State.pendingGenerateMatchId = String(matchId);
  const match = State.matches.find(m => String(m.id) === String(matchId));
  const nanny = match ? State.nannyProfiles[match.selected_nanny_id] : null;
  const label = [match?.job_post?.title, nanny?.name].filter(Boolean).join(" · ") || matchId.slice(0,8);
  safeText("generateMatchLabel", label);
  $("customContractText").value = "";
  $("generateModal").classList.add("open");
}

async function confirmGenerate() {
  const btn = $("btnConfirmGenerate");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating…`;

  try {
    const customText = $("customContractText").value.trim() || null;
    const contract = await generateContract(State.pendingGenerateMatchId, customText);
    $("generateModal").classList.remove("open");

    // Merge into state
    const existing = State.contracts.findIndex(c => String(c.id) === String(contract.id));
    if (existing >= 0) State.contracts[existing] = contract;
    else State.contracts.unshift(contract);

    renderStats();
    renderList();
    showToast("Contract generated.", "success");

    // Auto-open the new contract
    openDrawer(contract.id);

  } catch(err) {
    showToast(err.message || "Generation failed.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> Generate`;
  }
}

/* ─── ACCEPT MODAL ─── */
function openAcceptModal(contractId) {
  State.openContractId = String(contractId);
  $("acceptModal").classList.add("open");
}

async function confirmAccept() {
  const btn = $("btnConfirmAccept");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Signing…`;

  try {
    const updated = await acceptContract(State.openContractId);
    $("acceptModal").classList.remove("open");

    const idx = State.contracts.findIndex(c => String(c.id) === String(State.openContractId));
    if (idx >= 0) State.contracts[idx] = updated;

    renderStats();
    renderList();
    showToast("Contract signed.", "success");

    // Refresh open drawer if same contract
    if ($("contractDrawer")?.classList.contains("open")) {
      const match = State.matches.find(m => String(m.id) === String(updated.match_id));
      const nanny = match ? State.nannyProfiles[match.selected_nanny_id] : null;
      const badge = $("drawerBadge");
      const s = contractStatus(updated);
      if (badge) { badge.textContent = s === "active" ? "Both Signed" : "Awaiting Signatures"; badge.className = `fc-drawer-badge ${s}`; }
      renderDrawerTab(updated, match, nanny);
      renderDrawerFooter(updated);
    }

  } catch(err) {
    showToast(err.message || "Failed to sign.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-pen-nib"></i> Sign Contract`;
  }
}

/* ─── ACTIVE NAV + SIDEBAR ─── */
function setupActiveNav() {
  const page = window.location.pathname.split("/").pop() || "familycontracts.html";
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

/* ─── SKELETONS ─── */
function renderSkeletons() {
  const el = $("fcList");
  if (!el) return;
  el.innerHTML = [1,2,3].map(() => `
    <div class="fc-skeleton-card">
      <div class="skeleton" style="width:48px;height:48px;border-radius:var(--radius-sm);flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:7px">
        <div class="skeleton" style="height:13px;width:45%"></div>
        <div class="skeleton" style="height:10px;width:65%"></div>
      </div>
      <div class="skeleton" style="height:28px;width:80px;border-radius:99px"></div>
      <div class="skeleton" style="height:28px;width:60px;border-radius:99px"></div>
    </div>`).join("");
}

/* ─── EVENTS ─── */
function setupEvents() {
  let dbt;
  $("fcSearch")?.addEventListener("input", e => {
    State.search = e.target.value;
    $("fcSearchClear").style.display = e.target.value ? "block" : "none";
    clearTimeout(dbt); dbt = setTimeout(renderList, 220);
  });
  $("fcSearchClear")?.addEventListener("click", () => {
    $("fcSearch").value = ""; State.search = "";
    $("fcSearchClear").style.display = "none"; renderList();
  });

  document.querySelectorAll(".fc-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".fc-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      State.tabFilter = tab.dataset.filter;
      renderList();
    });
  });

  $("closeDrawer")?.addEventListener("click",   closeDrawer);
  $("drawerOverlay")?.addEventListener("click", closeDrawer);

  // Generate modal
  $("closeGenerateModal")?.addEventListener("click",  () => $("generateModal").classList.remove("open"));
  $("cancelGenerateModal")?.addEventListener("click", () => $("generateModal").classList.remove("open"));
  $("btnConfirmGenerate")?.addEventListener("click",  confirmGenerate);
  $("generateModal")?.addEventListener("click", e => { if(e.target===$("generateModal")) $("generateModal").classList.remove("open"); });

  // Accept modal
  $("closeAcceptModal")?.addEventListener("click",  () => $("acceptModal").classList.remove("open"));
  $("cancelAcceptModal")?.addEventListener("click", () => $("acceptModal").classList.remove("open"));
  $("btnConfirmAccept")?.addEventListener("click",  confirmAccept);
  $("acceptModal")?.addEventListener("click", e => { if(e.target===$("acceptModal")) $("acceptModal").classList.remove("open"); });

  $("btnRefresh")?.addEventListener("click", async () => {
    renderSkeletons(); await loadData(); showToast("Refreshed.", "info");
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    closeDrawer();
    $("generateModal")?.classList.remove("open");
    $("acceptModal")?.classList.remove("open");
  });
}

/* ─── AUTH GUARD ─── */
function authGuard() {
  const token = localStorage.getItem("access_token");
  if (!token) { window.location.href = "/frontend/src/views/login.html"; return false; }
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p.exp && p.exp*1000 < Date.now()) { localStorage.clear(); window.location.href = "/frontend/src/views/login.html"; return false; }
  } catch {}
  return true;
}

/* ─── LOAD DATA ─── */
async function loadData() {
  const [profile, contracts, matches] = await Promise.all([
    fetchProfile(), fetchContracts(), fetchMatches()
  ]);

  if (profile) {
    safeText("sidebarName", profile.name || "Family");
    const av = $("sidebarAvatar"); if (av) av.textContent = initials(profile.name||"F");
  }

  State.contracts = contracts;
  State.matches   = matches;

  // Fetch nanny profiles for all matches
  await Promise.all(matches.map(m => fetchNannyProfile(m.selected_nanny_id)));

  renderStats();
  renderList();

  // If matches exist with no contract, show generate prompt
  const needsGen = matches.filter(m => {
    const s = (m.status||"").toLowerCase().replace(/_/g,"");
    const has = contracts.some(c => String(c.match_id) === String(m.id));
    return !["ended","terminated","cancelled"].includes(s) && !has;
  });

  if (needsGen.length > 0 && contracts.length === 0) {
    showToast(`You have ${needsGen.length} match${needsGen.length>1?"es":""} without a contract. Generate one!`, "info");
  }
}

/* ─── INIT ─── */
async function init() {
  if (!authGuard()) return;
  setupActiveNav();
  setupSidebar();
  setupEvents();
  renderSkeletons();
  await loadData();

  // Auto-open from ?match= or ?contract= URL params
  const params = new URLSearchParams(window.location.search);
  const contractParam = params.get("contract");
  const matchParam    = params.get("match");

  if (contractParam) {
    openDrawer(contractParam);
  } else if (matchParam) {
    const existing = State.contracts.find(c => String(c.match_id) === matchParam);
    if (existing) openDrawer(existing.id);
    else openGenerateModal(matchParam);
  }
}

document.addEventListener("DOMContentLoaded", init);