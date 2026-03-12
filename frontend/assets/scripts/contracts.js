import { API_URL } from "../../src/utils/config.js";

/* ─── utils ─── */
const $ = id => document.getElementById(id);
const safeText = (id, v) => { const el = $(id); if (el) el.textContent = v ?? ""; };

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

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" });
}

function formatKsh(n) {
  if (n == null) return "—";
  return `Ksh ${Number(n).toLocaleString("en-KE")}`;
}

const availMap = {
  full_time:"Full-Time", part_time:"Part-Time",
  live_in:"Live-In", on_call:"On-Call",
  FULL_TIME:"Full-Time", PART_TIME:"Part-Time",
  LIVE_IN:"Live-In", ON_CALL:"On-Call",
};

/* ── Contract status derived from ContractAcceptance ──
   active  = both accepted
   pending = generated but not both accepted
   ended   = match ended / no contract
*/
function contractStatus(contract) {
  const acc = contract.acceptance;
  if (!acc) return "pending";
  if (acc.nanny_accepted && acc.family_accepted) return "active";
  return "pending";
}

function statusBadgeCls(status) {
  if (status === "active")  return "accepted";
  if (status === "ended")   return "closed";
  return "pending";
}

/* ─── State ─── */
const CONTRACTS_PER_PAGE = 6;
const State = {
  contracts:         [],
  filteredContracts: [],
  currentPage:       1,
  keyword:           "",
  statusFilter:      "all",
  sort:              "newest",
  pendingAcceptId:   null,
  pendingAcceptTitle:"",
};

/* ─── API ─── */
async function fetchProfile() {
  try {
    const res = await fetch(`${API_URL}/Nanny/profile/me`, { headers: authHeaders() });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// GET /contracts/me  — adjust to your actual route
async function fetchContracts() {
  try {
    const res = await fetch(`${API_URL}/contracts/me`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.contracts || data.data || []);
  } catch { return []; }
}

// PATCH /contracts/{id}/accept  — adjust to your actual route
async function acceptContract(contractId) {
  const res = await fetch(`${API_URL}/contracts/${contractId}/accept`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to accept contract.");
  }
  return res.json();
}

/* ─── Render: stats ─── */
function renderStats() {
  let active = 0, pending = 0, ended = 0;
  State.contracts.forEach(c => {
    const s = contractStatus(c);
    if (s === "active") active++;
    else if (s === "ended") ended++;
    else pending++;
  });
  safeText("statTotal",   State.contracts.length);
  safeText("statActive",  active);
  safeText("statPending", pending);
  safeText("statEnded",   ended);
}

/* ─── Filter + sort ─── */
function applyFilters() {
  const kw = State.keyword.toLowerCase();
  let result = State.contracts.filter(c => {
    const familyName = (c.match?.family?.name || "").toLowerCase();
    const jobTitle   = (c.match?.job_post?.title || "").toLowerCase();
    if (kw && !familyName.includes(kw) && !jobTitle.includes(kw)) return false;
    const status = contractStatus(c);
    if (State.statusFilter !== "all" && status !== State.statusFilter) return false;
    return true;
  });

  result.sort((a, b) => {
    const da = new Date(a.created_at || 0);
    const db = new Date(b.created_at || 0);
    return State.sort === "oldest" ? da - db : db - da;
  });

  State.filteredContracts = result;
  State.currentPage = 1;
}

/* ─── Render: skeletons ─── */
function renderSkeletons() {
  $("contractsList").innerHTML = Array.from({length:3}, () => `
    <div class="contract-card">
      <div class="contract-card-top pending"></div>
      <div class="contract-card-body">
        <div style="display:flex;gap:14px;align-items:center">
          <div class="skeleton" style="width:100%;height:18px;border-radius:4px"></div>
          <div class="skeleton" style="width:80px;height:26px;border-radius:99px;flex-shrink:0"></div>
        </div>
        <div class="skeleton" style="width:60%;height:14px;border-radius:4px"></div>
        <div class="contract-detail-row">
          ${Array.from({length:3}, () => `<div class="skeleton" style="height:54px;border-radius:var(--radius-sm)"></div>`).join("")}
        </div>
      </div>
      <div class="contract-card-footer">
        <div class="skeleton" style="width:120px;height:36px;border-radius:var(--radius-sm)"></div>
      </div>
    </div>`).join("");
}

/* ─── Render: contract cards ─── */
function renderContracts() {
  const list = $("contractsList");
  if (!list) return;

  const total = State.filteredContracts.length;
  const start = (State.currentPage - 1) * CONTRACTS_PER_PAGE;
  const page  = State.filteredContracts.slice(start, start + CONTRACTS_PER_PAGE);

  if (total === 0) {
    list.innerHTML = `
      <div class="panel">
        <div class="pcs-empty">
          <i class="fas fa-file-contract"></i>
          <h3>${State.keyword || State.statusFilter !== "all" ? "No matching contracts" : "No contracts yet"}</h3>
          <p>${State.keyword || State.statusFilter !== "all"
            ? "Try adjusting your search or filter."
            : "Contracts are generated after both parties pay the connection fee."}</p>
        </div>
      </div>`;
    renderPagination(0);
    return;
  }

  list.innerHTML = page.map((c, i) => buildContractCard(c, i)).join("");
  renderPagination(total);
}

function buildContractCard(contract, i) {
  const match     = contract.match || {};
  const job       = match.job_post || {};
  const family    = match.family   || {};
  const status    = contractStatus(contract);
  const acc       = contract.acceptance || {};
  const nannyAccepted  = acc.nanny_accepted  || false;
  const familyAccepted = acc.family_accepted || false;
  const salary    = job.salary ? formatKsh(job.salary) + "/mo" : "—";
  const schedule  = availMap[job.availability] || job.availability || "—";
  const badgeCls  = statusBadgeCls(status);
  const statusLabel = { active:"Active", pending:"Awaiting Sign", ended:"Ended" }[status] || "Pending";

  return `
  <div class="contract-card" style="animation-delay:${i*0.07}s">
    <div class="contract-card-top ${status}"></div>
    <div class="contract-card-body">

      <div class="contract-title-row">
        <div>
          <div class="contract-title">${job.title || "Nanny Position"}</div>
          <div class="contract-subtitle">
            <i class="fas fa-house-user"></i> ${family.name || "Family"}
            &nbsp;·&nbsp;
            <i class="fas fa-map-marker-alt"></i> ${family.location || job.location || "Location TBD"}
          </div>
        </div>
        <span class="status-badge ${badgeCls}">${statusLabel}</span>
      </div>

      <div class="contract-detail-row">
        ${[
          ["Salary",    salary,   "fa-coins"],
          ["Schedule",  schedule, "fa-clock"],
          ["Generated", formatDate(contract.generation_date || contract.created_at), "fa-calendar"],
        ].map(([label, val, icon]) => `
          <div class="contract-detail-chip">
            <label><i class="fas ${icon}" style="color:var(--gold);margin-right:4px"></i>${label}</label>
            <span>${val}</span>
          </div>`).join("")}
      </div>

      <!-- Acceptance status -->
      <div class="contract-acceptance">
        <div class="acceptance-pill ${nannyAccepted ? "accepted" : "pending"}">
          <i class="fas ${nannyAccepted ? "fa-circle-check" : "fa-hourglass-half"}"></i>
          You: ${nannyAccepted ? "Accepted" : "Pending"}
        </div>
        <div class="acceptance-pill ${familyAccepted ? "accepted" : "pending"}">
          <i class="fas ${familyAccepted ? "fa-circle-check" : "fa-hourglass-half"}"></i>
          Family: ${familyAccepted ? "Accepted" : "Pending"}
        </div>
      </div>

    </div>

    <div class="contract-card-footer">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-view-contract" onclick="window._openContractModal('${contract.id}')">
          <i class="fas fa-eye"></i> View Contract
        </button>
        ${!nannyAccepted && contract.contract_text ? `
          <button class="btn-accept-contract"
            onclick="window._confirmAccept('${contract.id}', '${(job.title||"this position").replace(/'/g,"\\'")}')">
            <i class="fas fa-signature"></i> Accept
          </button>` : ""}
      </div>
      <span style="font-size:.78rem;color:var(--text-light)">
        #${String(contract.id).slice(0,8).toUpperCase()}
      </span>
    </div>
  </div>`;
}

/* ─── Pagination ─── */
function renderPagination(total) {
  const container = $("pagination");
  if (!container) return;
  const totalPages = Math.ceil(total / CONTRACTS_PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ""; return; }
  const cur = State.currentPage;
  const show = new Set([1,totalPages,cur,cur-1,cur+1].filter(p=>p>=1&&p<=totalPages));
  const sorted = [...show].sort((a,b)=>a-b);
  let html = `<button class="page-btn${cur===1?" disabled":""}" onclick="window._goPage(${cur-1})"><i class="fas fa-chevron-left"></i></button>`;
  let prev = 0;
  for (const p of sorted) {
    if (prev && p-prev>1) html += `<button class="page-btn dots">…</button>`;
    html += `<button class="page-btn${p===cur?" active":""}" onclick="window._goPage(${p})">${p}</button>`;
    prev = p;
  }
  html += `<button class="page-btn${cur===totalPages?" disabled":""}" onclick="window._goPage(${cur+1})"><i class="fas fa-chevron-right"></i></button>`;
  container.innerHTML = html;
}

/* ─── Contract detail modal ─── */
function openContractModal(contractId) {
  const contract = State.contracts.find(c => String(c.id) === String(contractId));
  if (!contract) return;

  const match    = contract.match || {};
  const job      = match.job_post || {};
  const family   = match.family   || {};
  const status   = contractStatus(contract);
  const acc      = contract.acceptance || {};
  const badgeCls = statusBadgeCls(status);
  const statusLabel = { active:"Active", pending:"Awaiting Sign", ended:"Ended" }[status] || "Pending";

  $("contractModalBody").innerHTML = `
    <div class="modal-header">
      <div>
        <h3 style="font-family:'Fraunces',serif;color:var(--navy);font-size:1.2rem">
          ${job.title || "Nanny Position"}
        </h3>
        <p style="font-size:.9rem;color:var(--text-mid)">
          <i class="fas fa-house-user" style="color:var(--gold)"></i>
          ${family.name || "Family"} &nbsp;·&nbsp;
          <i class="fas fa-map-marker-alt" style="color:var(--gold)"></i>
          ${family.location || job.location || "Location TBD"}
        </p>
      </div>
      <button class="modal-close" onclick="window._closeContractModal()">×</button>
    </div>

    <div class="modal-body" style="display:flex;flex-direction:column;gap:18px">

      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <span class="status-badge ${badgeCls}">${statusLabel}</span>
        <span style="font-size:.85rem;color:var(--text-light)">
          Generated ${formatDate(contract.generation_date || contract.created_at)}
        </span>
      </div>

      <!-- Acceptance pills -->
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div class="acceptance-pill ${acc.nanny_accepted ? "accepted":"pending"}">
          <i class="fas ${acc.nanny_accepted?"fa-circle-check":"fa-hourglass-half"}"></i>
          You: ${acc.nanny_accepted ? `Accepted on ${formatDate(acc.nanny_acceptance_date)}` : "Pending your signature"}
        </div>
        <div class="acceptance-pill ${acc.family_accepted ? "accepted":"pending"}">
          <i class="fas ${acc.family_accepted?"fa-circle-check":"fa-hourglass-half"}"></i>
          Family: ${acc.family_accepted ? `Accepted on ${formatDate(acc.family_acceptance_date)}` : "Pending family signature"}
        </div>
      </div>

      <!-- Job details grid -->
      <div>
        <p style="font-size:.82rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-light);margin-bottom:10px">
          Position Details
        </p>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
          ${[
            ["Salary",     job.salary ? formatKsh(job.salary)+"/mo" : "—", "fa-coins"],
            ["Schedule",   availMap[job.availability] || "—",              "fa-clock"],
            ["Experience", `${job.required_experience||0}+ yrs`,           "fa-star"],
            ["Care Needs", job.care_needs || "General childcare",           "fa-heart"],
          ].map(([label,val,icon])=>`
            <div class="contract-detail-chip">
              <label><i class="fas ${icon}" style="color:var(--gold);margin-right:4px"></i>${label}</label>
              <span>${val}</span>
            </div>`).join("")}
        </div>
      </div>

      <!-- Contract text -->
      ${contract.contract_text ? `
        <div>
          <p style="font-size:.82rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-light);margin-bottom:10px">
            Contract Terms
          </p>
          <div class="contract-text-viewer">${contract.contract_text}</div>
        </div>` : `
        <div class="pcs-empty" style="padding:24px">
          <i class="fas fa-file-circle-question" style="font-size:1.8rem;color:var(--border)"></i>
          <h3 style="font-size:1rem">Contract text not yet generated</h3>
          <p>The contract document will appear here once generated by the system.</p>
        </div>`}

    </div>

    <div class="modal-footer">
      ${!acc.nanny_accepted && contract.contract_text ? `
        <button class="btn-accept-contract"
          onclick="window._confirmAccept('${contract.id}','${(job.title||"this position").replace(/'/g,"\\'")}')">
          <i class="fas fa-signature"></i> Accept Contract
        </button>` : ""}
      <button class="btn-secondary" onclick="window._closeContractModal()">Close</button>
    </div>`;

  $("contractModal").classList.add("open");
}

function closeContractModal() { $("contractModal")?.classList.remove("open"); }

/* ─── Accept contract flow ─── */
function confirmAccept(contractId, title) {
  State.pendingAcceptId    = contractId;
  State.pendingAcceptTitle = title;
  safeText("acceptContractTitle", title);
  $("acceptModal").classList.add("open");
}

async function executeAccept() {
  const id  = State.pendingAcceptId;
  const btn = $("btnConfirmAccept");
  if (!id) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Signing…`;

  try {
    await acceptContract(id);

    // Optimistic update
    const c = State.contracts.find(x => String(x.id) === String(id));
    if (c) {
      if (!c.acceptance) c.acceptance = {};
      c.acceptance.nanny_accepted = true;
      c.acceptance.nanny_acceptance_date = new Date().toISOString();
    }

    $("acceptModal").classList.remove("open");
    closeContractModal();
    applyFilters();
    renderContracts();
    renderStats();
    showToast("Contract accepted successfully!", "success");

  } catch (err) {
    showToast(err.message || "Could not accept contract. Try again.", "error");
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-signature"></i> Yes, Accept Contract`;
  }
}

/* ─── Sidebar ─── */
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
}

/* ─── Events ─── */
function setupEvents() {
  let dbt;
  $("contractSearch")?.addEventListener("input", e => {
    State.keyword = e.target.value;
    clearTimeout(dbt);
    dbt = setTimeout(() => { applyFilters(); renderContracts(); }, 260);
  });

  $("contractStatusFilter")?.addEventListener("change", e => {
    State.statusFilter = e.target.value;
    applyFilters(); renderContracts();
  });

  $("contractSort")?.addEventListener("change", e => {
    State.sort = e.target.value;
    applyFilters(); renderContracts();
  });

  $("closeAcceptModal")?.addEventListener("click", () => $("acceptModal").classList.remove("open"));
  $("cancelAcceptModal")?.addEventListener("click", () => $("acceptModal").classList.remove("open"));
  $("btnConfirmAccept")?.addEventListener("click", executeAccept);

  [$("contractModal"), $("acceptModal")].forEach(m => {
    m?.addEventListener("click", e => { if (e.target===m) m.classList.remove("open"); });
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeContractModal(); $("acceptModal")?.classList.remove("open"); }
  });
}

/* ─── Global refs ─── */
window._openContractModal  = openContractModal;
window._closeContractModal = closeContractModal;
window._confirmAccept      = confirmAccept;
window._goPage = (page) => {
  const total = Math.ceil(State.filteredContracts.length / CONTRACTS_PER_PAGE);
  if (page < 1 || page > total) return;
  State.currentPage = page;
  renderContracts();
  window.scrollTo({top:0, behavior:"smooth"});
};

/* ─── Init ─── */
async function init() {
    setupActiveNav();
  setupSidebar();
  setupEvents();
  renderSkeletons();

  const [profile, contracts] = await Promise.all([
    fetchProfile(),
    fetchContracts(),
  ]);

  State.contracts = contracts;

  if (profile) {
    safeText("userName", profile.name || "Nanny User");
    const av = $("userAvatar");
    if (av) av.textContent = (profile.name||"N").split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("");
  }

  renderStats();
  applyFilters();
  renderContracts();
}

document.addEventListener("DOMContentLoaded", init);