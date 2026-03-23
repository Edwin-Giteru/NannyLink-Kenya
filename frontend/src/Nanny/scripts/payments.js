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
  return `Ksh ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

/* ── Payment status helpers ── */
function isPaid(p) {
  return ["completed", "success"].includes((p.payment_status || "").toLowerCase());
}

function isFailed(p) {
  return ["failed", "failure"].includes((p.payment_status || "").toLowerCase());
}

function statusBadge(raw) {
  const s = (raw || "").toLowerCase();
  if (s === "completed" || s === "success") return `<span class="status-badge accepted">Completed</span>`;
  if (s === "failed"    || s === "failure") return `<span class="status-badge closed">Failed</span>`;
  return                                           `<span class="status-badge pending">Pending</span>`;
}

const CONNECTION_FEE = 1;   

/* ─── State ─── */
const State = {
  payments:         [],
  filteredPayments: [],
  allMatches:       [],
  activeMatch:      null,
  currentUserId:    null,
  keyword:          "",
  statusFilter:     "all",
};

/* ─── API ─── */
async function fetchProfile() {
  try {
    const [profileRes, matchRes] = await Promise.all([
      fetch(`${API_URL}/Nanny/profile/me`, { headers: authHeaders() }),
      fetch(`${API_URL}/matches/`,          { headers: authHeaders() }),
    ]);

    const profile = profileRes.ok ? await profileRes.json() : null;

    const token = localStorage.getItem("access_token");
    if (token) {
      try { State.currentUserId = JSON.parse(atob(token.split(".")[1])).sub; } catch {}
    }

    let matches = [];
    if (matchRes.ok) {
      const raw = await matchRes.json();
      matches = Array.isArray(raw) ? raw : (raw.matches || raw.data || []);
    }

    State.allMatches = matches;
    State.activeMatch = matches.find(m => {
      const s = (m.status || "").toLowerCase().replace(/_/g, "");
      return !["ended", "completed", "terminated", "cancelled"].includes(s);
    }) || matches[0] || null;

    return profile;
  } catch (e) {
    console.error("Profile fetch error:", e);
    return null;
  }
}

async function fetchPaymentsForMatch(matchId) {
  try {
    const res = await fetch(`${API_URL}/payments/match/${matchId}`, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : (data.payments || []);
  } catch {
    return null;
  }
}

async function fetchPayments() {
  try {
    const payments = [];
    for (const match of (State.allMatches || [])) {
      const matchPayments = await fetchPaymentsForMatch(match.id);
      if (matchPayments) payments.push(...matchPayments);
    }
    return payments;
  } catch {
    return [];
  }
}

/* ─── Render: stat cards ─── */
function renderStats() {
  const payments = State.payments;
  let totalPaid = 0, completed = 0, pending = 0, failed = 0;
  payments.forEach(p => {
    if (isPaid(p))        { completed++; totalPaid += Number(p.amount || 0); }
    else if (isFailed(p)) { failed++; }
    else                  { pending++; }
  });
  safeText("statTotalPaid", formatKsh(totalPaid));
  safeText("statCompleted", completed);
  safeText("statPending",   pending);
  safeText("statFailed",    failed);
}

/* ─── Render: connection fee panel ─── */
function renderConnectionFee() {
  const match = State.activeMatch;

  if (!match) {
    $("feeHero").style.display        = "none";
    $("noMatchNotice").style.display  = "block";
    $("paymentParties").style.display = "none";
    safeText("feeOverallBadge", "No Match");
    return;
  }

  $("feeHero").style.display        = "flex";
  $("noMatchNotice").style.display  = "none";

  const matchPayments = State.payments.filter(p =>
    String(p.match_id) === String(match.id)
  );

  let nannyPaid, familyPaid;

  if (matchPayments.length > 0) {
    nannyPaid  = matchPayments.some(p => String(p.user_id) === String(State.currentUserId) && isPaid(p));
    familyPaid = matchPayments.some(p => String(p.user_id) !== String(State.currentUserId) && isPaid(p));
  } else {
    const ms = (match.status || "").toUpperCase().replace(/_/g, "");
    nannyPaid  = ["NANNYPAID","BOTHPAID","ACTIVE","CONFIRMED","MATCHED","INPROGRESS"].includes(ms);
    familyPaid = ["FAMILYPAID","BOTHPAID","ACTIVE","CONFIRMED","MATCHED","INPROGRESS"].includes(ms);
  }

  const bothPaid = nannyPaid && familyPaid;

  // Show amount from a real paid record if available, otherwise the constant
  const paidRecord = matchPayments.find(p => isPaid(p));
  const anyRecord  = matchPayments[0];
  const displayAmt = paidRecord?.amount ?? anyRecord?.amount ?? CONNECTION_FEE;
  const feeEl = $("feeAmount");
  if (feeEl) feeEl.innerHTML = `${formatKsh(displayAmt)}<small>/one-time</small>`;

  const badge = $("feeOverallBadge");
  if (bothPaid) {
    badge.textContent = "Both Paid ✓";
    badge.className   = "status-badge accepted";
  } else if (nannyPaid) {
    badge.textContent = "Awaiting Family";
    badge.className   = "status-badge pending";
  } else {
    badge.textContent = "Payment Required";
    badge.className   = "status-badge closed";
  }

  const btn = $("btnPayFee");
  const myPayment = matchPayments.find(p => String(p.user_id) === String(State.currentUserId));
  const myPaid    = myPayment && isPaid(myPayment);
  const myPending = myPayment && !myPaid && !isFailed(myPayment);

  if (myPaid) {
    btn.innerHTML = `<span class="mpesa-logo">M</span> You've Paid ✓`;
    btn.disabled  = true;
    btn.style.background = "var(--mpesa-dark)";
  } else if (myPending) {
    btn.innerHTML = `<span class="mpesa-logo">M</span> Payment Processing…`;
    btn.disabled  = true;
    btn.style.background = "var(--text-mid)";
  } else {
    btn.disabled  = false;
    btn.style.background = "";
    btn.innerHTML = `<span class="mpesa-logo">M</span> Pay via M-Pesa`;
    btn.onclick   = () => openMpesaModal(match.id);
  }

  const setParty = (pillId, statusId, paid) => {
    const pill = $(pillId);
    if (!pill) return;
    pill.className = `party-pill ${paid ? "paid" : "unpaid"}`;
    safeText(statusId, paid ? "Paid ✓" : "Not paid yet");
  };

  setParty("nannyPartyPill",  "nannyPayStatus",  nannyPaid);
  setParty("familyPartyPill", "familyPayStatus", familyPaid);
}

/* ─── Render: payment history table ─── */
function applyFilter() {
  const kw = State.keyword.toLowerCase();
  State.filteredPayments = State.payments.filter(p => {
    const code = (p.mpesa_transaction_code || "").toLowerCase();
    if (kw && !code.includes(kw)) return false;
    if (State.statusFilter !== "all" && (p.payment_status || "").toLowerCase() !== State.statusFilter.toLowerCase()) return false;
    return true;
  });
}

function renderHistoryTable() {
  const tbody = $("paymentHistoryBody");
  if (!tbody) return;

  applyFilter();
  const rows = State.filteredPayments;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="pcs-empty">
        <i class="fas fa-receipt"></i>
        <h3>No payments found</h3>
        <p>Your payment history will appear here.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(p => `
    <tr>
      <td>${formatDate(p.payment_date || p.created_at)}</td>
      <td style="font-size:.85rem;color:var(--text-mid)">${p.match_id ? String(p.match_id).slice(0,8).toUpperCase() : "—"}</td>
      <td class="amt">${formatKsh(p.amount)}</td>
      <td class="mono">${p.mpesa_transaction_code || "—"}</td>
      <td>${statusBadge(p.payment_status)}</td>
      <td class="mono" style="font-size:.82rem">${p.phone_number || "—"}</td>
    </tr>`).join("");
}

/* ─── M-Pesa Modal ─── */
function openMpesaModal(matchId) {
  $("mpesaPhone").value = "";

  // Always pre-fill with CONNECTION_FEE — the single source of truth above
  if ($("mpesaAmount")) $("mpesaAmount").value = CONNECTION_FEE;

  $("mpesaModalBody").style.display   = "block";
  $("mpesaModalFooter").style.display = "flex";
  $("mpesaPendingState").classList.remove("show");

  $("btnConfirmMpesa").onclick = () => submitMpesaPayment(matchId);
  $("mpesaModal").classList.add("open");
}

async function submitMpesaPayment(matchId) {
  const rawPhone = $("mpesaPhone").value.trim().replace(/\s/g, "");
  if (rawPhone.length < 9) {
    showToast("Enter a valid 9-digit M-Pesa number.", "error");
    return;
  }

  // Read from the input (which was pre-filled with CONNECTION_FEE)
  const amount = parseFloat($("mpesaAmount")?.value || CONNECTION_FEE);
  if (!amount || amount < 1) {
    showToast("Enter a valid amount.", "error");
    return;
  }

  const phone = `+254${rawPhone}`;
  const btn   = $("btnConfirmMpesa");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending…`;

  try {
    const res = await fetch(
      `${API_URL}/payments/${matchId}?phone_number=${encodeURIComponent(phone)}&amount=${amount}`,
      { method: "POST", headers: authHeaders() }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Payment initiation failed.");

    $("mpesaModalBody").style.display   = "none";
    $("mpesaModalFooter").style.display = "none";
    $("mpesaPendingState").classList.add("show");
    showToast("STK push sent! Check your phone.", "success");

    // Poll for updated status after 15 seconds
    setTimeout(async () => {
      const updated = await fetchPayments();
      State.payments = updated;
      renderStats();
      renderConnectionFee();
      renderHistoryTable();
      $("mpesaModal").classList.remove("open");
      showToast("Payment status updated.", "info");
    }, 15000);

  } catch (err) {
    showToast(err.message || "Payment failed. Try again.", "error");
    btn.disabled = false;
    btn.innerHTML = `<span class="mpesa-logo">M</span> Send STK Push`;
  }
}

/* ── Auto-set active nav based on current page ── */
function setupActiveNav() {
  const page = window.location.pathname.split("/").pop() || "nannydashboard.html";
  document.querySelectorAll(".sidebar-nav a").forEach(a => {
    a.classList.remove("active");
    const href = (a.getAttribute("href") || "").split("/").pop();
    if (href === page) a.classList.add("active");
  });
}

/* ─── Sidebar ─── */
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
  $("paymentSearch")?.addEventListener("input", e => {
    State.keyword = e.target.value;
    clearTimeout(dbt);
    dbt = setTimeout(() => renderHistoryTable(), 260);
  });

  $("paymentStatusFilter")?.addEventListener("change", e => {
    State.statusFilter = e.target.value;
    renderHistoryTable();
  });

  $("closeMpesaModal")?.addEventListener("click",  () => $("mpesaModal").classList.remove("open"));
  $("cancelMpesaModal")?.addEventListener("click", () => $("mpesaModal").classList.remove("open"));
  $("mpesaModal")?.addEventListener("click", e => { if (e.target === $("mpesaModal")) $("mpesaModal").classList.remove("open"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") $("mpesaModal")?.classList.remove("open"); });
}

/* ─── Init ─── */
async function init() {
  setupActiveNav();
  setupSidebar();
  setupEvents();

  const profile  = await fetchProfile();
  const payments = await fetchPayments();
  State.payments = payments;

  if (profile) {
    safeText("userName", profile.name || "Nanny User");
    const av = $("userAvatar");
    if (av) av.textContent = (profile.name || "N").split(" ").slice(0,2).map(w => w[0]?.toUpperCase() || "").join("");
  }

  renderStats();
  renderConnectionFee();
  renderHistoryTable();
}

document.addEventListener("DOMContentLoaded", init);