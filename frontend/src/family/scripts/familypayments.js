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

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day:"numeric", month:"short", year:"numeric" });
}

function fmtKsh(n) {
  if (n == null) return "—";
  return `Ksh ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function isPaid(p)   { return ["completed","success"].includes((p.payment_status||"").toLowerCase()); }
function isFailed(p) { return ["failed","failure"].includes((p.payment_status||"").toLowerCase()); }

function statusBadge(raw) {
  const s = (raw||"").toLowerCase();
  if (["completed","success"].includes(s)) return `<span class="status-badge accepted">Completed</span>`;
  if (["failed","failure"].includes(s))    return `<span class="status-badge closed">Failed</span>`;
  return                                          `<span class="status-badge pending">Pending</span>`;
}

/* ─────────────────────────────────
   TEST MODE — Ksh 1 for testing
   Flip TEST_MODE = false for prod
───────────────────────────────── */
const TEST_MODE = true;
const CONNECTION_FEE = TEST_MODE ? 1 : 2000;

/* ─── STATE ─── */
const State = {
  payments:      [],
  filtered:      [],
  allMatches:    [],
  activeMatch:   null,
  currentUserId: null,
  keyword:       "",
  statusFilter:  "all",
  nannyProfiles: {},
};

/* ─── API ─── */
async function apiFetch(path, fallback = null) {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
    if (!res.ok) { console.warn(`[familypayments] ${path} → ${res.status}`); return fallback; }
    return res.json();
  } catch(e) { console.error(e); return fallback; }
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

async function fetchMatches() {
  const data = await apiFetch("/matches/", []);
  return Array.isArray(data) ? data : (data?.matches || []);
}

async function fetchPaymentsForMatch(matchId) {
  const data = await apiFetch(`/payments/match/${matchId}`, []);
  return Array.isArray(data) ? data : (data?.payments || []);
}

async function fetchNannyProfile(nannyId) {
  if (!nannyId) return null;
  if (State.nannyProfiles[nannyId]) return State.nannyProfiles[nannyId];
  const p = await apiFetch(`/Nanny/${nannyId}`, null);
  if (p) State.nannyProfiles[nannyId] = p;
  return p;
}

/* ─── LOAD PAYMENTS across all matches ─── */
async function fetchAllPayments() {
  const all = [];
  for (const match of State.allMatches) {
    const payments = await fetchPaymentsForMatch(match.id);
    all.push(...payments);
  }
  return all;
}

/* ─── STATS ─── */
function renderStats() {
  const ps = State.payments;
  let totalPaid = 0, completed = 0, pending = 0, failed = 0;
  ps.forEach(p => {
    if (isPaid(p))        { completed++; totalPaid += Number(p.amount || 0); }
    else if (isFailed(p)) { failed++; }
    else                  { pending++; }
  });
  // Only count MY payments for total paid
  const myPayments = ps.filter(p => String(p.user_id) === String(State.currentUserId));
  let myTotalPaid = 0;
  myPayments.forEach(p => { if (isPaid(p)) myTotalPaid += Number(p.amount || 0); });

  // Update stat cards
  $("statTotalPaid").textContent  = fmtKsh(myTotalPaid);
  $("statCompleted").textContent  = completed;
  $("statPending").textContent    = pending;
  $("statFailed").textContent     = failed;

  safeText("subTotalPaid", myTotalPaid > 0 ? "Your payments" : "No payments yet");
  safeText("fpSubtitle",
    ps.length === 0
      ? "No payment activity yet."
      : `${ps.length} transaction${ps.length !== 1 ? "s" : ""} across all matches`
  );
}

/* ─── MATCH SELECTOR ─── */
function populateMatchSelector() {
  const matches = State.allMatches;
  const selectorWrap = $("fpMatchSelector");

  if (matches.length <= 1) {
    selectorWrap.style.display = "none";
    return;
  }

  selectorWrap.style.display = "flex";
  const list = $("matchSelectList");
  if (!list) return;

  list.innerHTML = matches.map((m, i) => {
    const nannyName = State.nannyProfiles[m.selected_nanny_id]?.name || `Match ${i+1}`;
    const jobTitle  = m.job_post?.title || "—";
    return `
      <div class="fp-custom-option ${i === 0 ? "selected" : ""}" data-value="${m.id}">
        ${nannyName}
        <span class="fp-custom-option-sub">${jobTitle}</span>
      </div>`;
  }).join("");

  // Wire option clicks
  list.querySelectorAll(".fp-custom-option").forEach(opt => {
    opt.addEventListener("click", e => {
      e.stopPropagation();
      list.querySelectorAll(".fp-custom-option").forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      $("matchSelectLabel").textContent = opt.firstChild.textContent.trim();
      $("matchSelectWrap")?.classList.remove("open");
      const match = State.allMatches.find(m => String(m.id) === opt.dataset.value);
      State.activeMatch = match || null;
      renderConnectionFee();
    });
  });

  // Set initial label
  const first = matches[0];
  const firstName = State.nannyProfiles[first.selected_nanny_id]?.name || "Match 1";
  safeText("matchSelectLabel", firstName);

  // Toggle
  $("matchSelectBtn")?.addEventListener("click", e => {
    e.stopPropagation();
    $("matchSelectWrap")?.classList.toggle("open");
  });
  document.addEventListener("click", e => {
    if (!$("matchSelectWrap")?.contains(e.target))
      $("matchSelectWrap")?.classList.remove("open");
  });
}

/* ─── CONNECTION FEE PANEL ─── */
function renderConnectionFee() {
  const match = State.activeMatch;

  if (!match) {
    $("feeHero").style.display     = "none";
    $("noMatchNotice").style.display = "flex";
    return;
  }

  $("feeHero").style.display       = "flex";
  $("noMatchNotice").style.display = "none";

  const matchPayments = State.payments.filter(p => String(p.match_id) === String(match.id));

  const famPaid = matchPayments.some(p =>
    String(p.user_id) === String(State.currentUserId) && isPaid(p)
  );
  const nannyPaid = matchPayments.some(p =>
    String(p.user_id) !== String(State.currentUserId) && isPaid(p)
  );
  const bothPaid = famPaid && nannyPaid;

  // Fee amount display
  const paidRecord = matchPayments.find(p => isPaid(p));
  const anyRecord  = matchPayments[0];
  const displayAmt = paidRecord?.amount ?? anyRecord?.amount ?? CONNECTION_FEE;
  const feeEl = $("feeAmount");
  if (feeEl) feeEl.innerHTML = `<span class="fp-fee-num">${fmtKsh(displayAmt)}</span><small>/one-time</small>`;

  // Overall badge
  const badge = $("feeOverallBadge");
  if (badge) {
    if (bothPaid)    { badge.textContent = "Both Paid ✓"; badge.className = "fp-fee-badge accepted"; }
    else if (famPaid){ badge.textContent = "Awaiting Nanny"; badge.className = "fp-fee-badge pending"; }
    else             { badge.textContent = "Payment Required"; badge.className = "fp-fee-badge closed"; }
  }

  // Party pills
  const setParty = (pillId, statusId, paid) => {
    const pill = $(pillId);
    if (!pill) return;
    pill.className = `fp-party-pill ${paid ? "paid" : "unpaid"}`;
    safeText(statusId, paid ? "Paid ✓" : "Not paid yet");
  };
  setParty("familyPartyPill", "familyPayStatus", famPaid);
  setParty("nannyPartyPill",  "nannyPayStatus",  nannyPaid);

  // Pay button
  const btn = $("btnPayFee");
  const myPayment = matchPayments.find(p => String(p.user_id) === String(State.currentUserId));
  const myPaid    = myPayment && isPaid(myPayment);
  const myPending = myPayment && !myPaid && !isFailed(myPayment);

  if (myPaid) {
    btn.innerHTML = `<span class="fp-mpesa-logo">M</span> You've Paid ✓`;
    btn.disabled  = true;
  } else if (myPending) {
    btn.innerHTML = `<span class="fp-mpesa-logo">M</span> Payment Processing…`;
    btn.disabled  = true;
  } else {
    btn.disabled  = false;
    btn.innerHTML = `<span class="fp-mpesa-logo">M</span> Pay via M-Pesa`;
    btn.onclick   = () => openMpesaModal(match.id);
  }
}

/* ─── PAYMENT HISTORY TABLE ─── */
function applyFilter() {
  const kw = State.keyword.toLowerCase();
  State.filtered = State.payments.filter(p => {
    const code = (p.mpesa_transaction_code || "").toLowerCase();
    if (kw && !code.includes(kw)) return false;
    if (State.statusFilter !== "all") {
      const s = (p.payment_status || "").toLowerCase();
      if (State.statusFilter === "completed" && !isPaid(p)) return false;
      if (State.statusFilter === "pending"   && (isPaid(p) || isFailed(p))) return false;
      if (State.statusFilter === "failed"    && !isFailed(p)) return false;
    }
    return true;
  });
}

function renderHistoryTable() {
  const tbody = $("paymentHistoryBody");
  if (!tbody) return;
  applyFilter();
  const rows = State.filtered;

  // Results count
  const countEl = $("fpResultsCount");
  const countRow = $("fpResultsRow");
  if (countEl && countRow) {
    countEl.textContent = `${rows.length} transaction${rows.length !== 1 ? "s" : ""}`;
    countRow.style.display = "block";
  }

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="fp-table-empty">
            <i class="fas fa-receipt"></i>
            <h4>No transactions found</h4>
            <p>${State.keyword || State.statusFilter !== "all"
              ? "Try clearing your search or filter."
              : "Your payment history will appear here once you make a payment."}</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = rows.map(p => {
    // Find which match this payment belongs to
    const match     = State.allMatches.find(m => String(m.id) === String(p.match_id));
    const matchLabel = match?.job_post?.title
      ? `<span title="${match.job_post.title}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;display:block">${match.job_post.title}</span>`
      : String(p.match_id).slice(0,8).toUpperCase();

    return `
      <tr>
        <td>${fmtDate(p.payment_date || p.transaction_date || p.created_at)}</td>
        <td style="font-size:.8rem;color:var(--text-mid)">${matchLabel}</td>
        <td class="amt">${fmtKsh(p.amount)}</td>
        <td class="mono">${p.mpesa_transaction_code || "—"}</td>
        <td>${statusBadge(p.payment_status)}</td>
        <td class="mono" style="font-size:.78rem">${p.phone_number || "—"}</td>
      </tr>`;
  }).join("");
}

/* ─── M-PESA MODAL ─── */
function openMpesaModal(matchId) {
  $("mpesaPhone").value = "";
  const amountEl = $("mpesaAmount");
  if (amountEl) {
    amountEl.value = CONNECTION_FEE;
    amountEl.title = TEST_MODE ? "Fixed at Ksh 1 (testing)" : "Fixed connection fee — Ksh 2,000";
  }
  $("mpesaModalBody").style.display   = "flex";
  $("mpesaModalFooter").style.display = "flex";
  $("mpesaPendingState").classList.remove("show");
  $("btnConfirmMpesa").onclick = () => submitMpesaPayment(matchId);
  $("mpesaModal").classList.add("open");
}

async function submitMpesaPayment(matchId) {
  const rawPhone = ($("mpesaPhone").value || "").trim().replace(/\s/g, "");
  if (rawPhone.length < 9) { showToast("Enter a valid 9-digit M-Pesa number.", "error"); return; }

  const amount = CONNECTION_FEE;
  const phone  = `+254${rawPhone}`;
  const btn    = $("btnConfirmMpesa");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending…`;

  try {
    const res = await fetch(
      `${API_URL}/payments/${matchId}?phone_number=${encodeURIComponent(phone)}&amount=${amount}`,
      { method:"POST", headers: authHeaders() }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Payment initiation failed.");

    $("mpesaModalBody").style.display   = "none";
    $("mpesaModalFooter").style.display = "none";
    $("mpesaPendingState").classList.add("show");
    showToast("STK push sent! Check your phone.", "success");

    // Poll after 15s
    setTimeout(async () => {
      const fresh = await fetchAllPayments();
      State.payments = fresh;
      renderStats();
      renderConnectionFee();
      renderHistoryTable();
      $("mpesaModal").classList.remove("open");
      showToast("Payment status updated.", "info");
    }, 15000);

  } catch(err) {
    showToast(err.message || "Payment failed. Try again.", "error");
    btn.disabled  = false;
    btn.innerHTML = `<span class="fp-mpesa-logo">M</span> Send STK Push`;
  }
}

/* ─── SKELETON ─── */
function renderSkeletons() {
  const tbody = $("paymentHistoryBody");
  if (!tbody) return;
  tbody.innerHTML = [1,2,3].map(() => `
    <tr class="fp-skeleton-row">
      ${[1,2,3,4,5,6].map(() => `<td><div class="skeleton" style="height:12px;border-radius:4px;width:${60+Math.random()*30}%"></div></td>`).join("")}
    </tr>`).join("");
}

/* ─── ACTIVE NAV + SIDEBAR ─── */
function setupActiveNav() {
  const page = window.location.pathname.split("/").pop() || "familypayments.html";
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
  let dbt;
  $("paymentSearch")?.addEventListener("input", e => {
    State.keyword = e.target.value;
    clearTimeout(dbt);
    dbt = setTimeout(renderHistoryTable, 260);
  });

  $("paymentStatusFilter")?.addEventListener("change", e => {
    State.statusFilter = e.target.value;
    renderHistoryTable();
  });

  $("closeMpesaModal")?.addEventListener("click",  () => $("mpesaModal").classList.remove("open"));
  $("cancelMpesaModal")?.addEventListener("click", () => $("mpesaModal").classList.remove("open"));
  $("mpesaModal")?.addEventListener("click", e => { if (e.target === $("mpesaModal")) $("mpesaModal").classList.remove("open"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") $("mpesaModal")?.classList.remove("open"); });

  $("btnRefresh")?.addEventListener("click", async () => {
    renderSkeletons();
    await loadData();
    showToast("Refreshed.", "info");
  });
}

/* ─── AUTH GUARD ─── */
function authGuard() {
  const token = localStorage.getItem("access_token");
  if (!token) { window.location.href = "/frontend/src/views/login.html"; return false; }
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    if (p.exp && p.exp * 1000 < Date.now()) { localStorage.clear(); window.location.href = "/frontend/src/views/login.html"; return false; }
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

  State.allMatches = matches;

  // Pick active match (prefer non-ended, else first)
  State.activeMatch = matches.find(m => {
    const s = (m.status||"").toLowerCase().replace(/_/g,"");
    return !["ended","terminated","cancelled","completed"].includes(s);
  }) || matches[0] || null;

  // Fetch nanny profiles + all payments in parallel
  const [, payments] = await Promise.all([
    Promise.all(matches.map(m => fetchNannyProfile(m.selected_nanny_id))),
    fetchAllPayments(),
  ]);

  State.payments = payments;

  // Pre-select from ?match= URL param
  const matchParam = new URLSearchParams(window.location.search).get("match");
  if (matchParam) {
    const m = matches.find(m => String(m.id) === matchParam);
    if (m) State.activeMatch = m;
  }

  renderStats();
  populateMatchSelector();
  renderConnectionFee();
  renderHistoryTable();
}

/* ─── INIT ─── */
async function init() {
  if (!authGuard()) return;
  setupActiveNav();
  setupSidebar();
  setupEvents();
  renderSkeletons();
  await loadData();
}

document.addEventListener("DOMContentLoaded", init);