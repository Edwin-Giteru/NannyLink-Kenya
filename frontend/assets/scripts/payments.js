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

/* ── Payment status normalisation ── */
function normStatus(raw) {
  return (raw || "").toUpperCase();
}

function statusBadge(raw) {
  const s = normStatus(raw);
  if (s === "COMPLETED") return `<span class="status-badge accepted">Completed</span>`;
  if (s === "FAILED")    return `<span class="status-badge closed">Failed</span>`;
  return                        `<span class="status-badge pending">Pending</span>`;
}

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

    // Decode user_id from JWT
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

    // Use first non-ended match for connection fee display
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
  // GET /payments/{match_id}/all  — returns all payments for a match
  // This endpoint may need to be created. We try it; if it 404s, we
  // derive payment status from the match.status field instead.
  try {
    const res = await fetch(`${API_URL}/payments/match/${matchId}`, { headers: authHeaders() });
    if (!res.ok) return null; // null = endpoint doesn't exist yet
    const data = await res.json();
    return Array.isArray(data) ? data : (data.payments || []);
  } catch {
    return null;
  }
}

async function fetchPayments() {
  // Strategy: try GET /payments/match/{id} for each match.
  // If that endpoint doesn't exist, fall back to deriving status from match.status.
  // This prevents the page from hanging on a missing endpoint.
  try {
    const payments = [];
    for (const match of (State.allMatches || [])) {
      const matchPayments = await fetchPaymentsForMatch(match.id);
      if (matchPayments) {
        payments.push(...matchPayments);
      }
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
    const s = normStatus(p.payment_status);
    if (s === "COMPLETED") { completed++; totalPaid += Number(p.amount || 0); }
    else if (s === "FAILED") failed++;
    else pending++;
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

  // ── Derive payment status ──────────────────────────────
  // Priority 1: use real Payment records if available
  const matchPayments = State.payments.filter(p =>
    String(p.match_id) === String(match.id)
  );

  let nannyPaid, familyPaid;

  if (matchPayments.length > 0) {
    nannyPaid = matchPayments.some(p =>
      String(p.user_id) === String(State.currentUserId) &&
      normStatus(p.payment_status) === "COMPLETED"
    );
    familyPaid = matchPayments.some(p =>
      String(p.user_id) !== String(State.currentUserId) &&
      normStatus(p.payment_status) === "COMPLETED"
    );
  } else {
    // Priority 2: read from match.status enum
    // AWAITING_PAYMENT       → neither paid
    // NANNY_PAID             → nanny paid, family hasn't
    // FAMILY_PAID            → family paid, nanny hasn't
    // BOTH_PAID / ACTIVE etc → both paid
    const ms = (match.status || "").toUpperCase().replace(/_/g, "");
    nannyPaid  = ["NANNYPAID","BOTHPAID","ACTIVE","CONFIRMED","MATCHED","INPROGRESS"].includes(ms);
    familyPaid = ["FAMILYPAID","BOTHPAID","ACTIVE","CONFIRMED","MATCHED","INPROGRESS"].includes(ms);
  }

  const bothPaid = nannyPaid && familyPaid;

  // Amount
  const amount = matchPayments[0]?.amount || null;
  const feeEl = $("feeAmount");
  if (feeEl) feeEl.innerHTML = `${amount ? formatKsh(amount) : "Ksh 2,000"}<small>/one-time</small>`;

  // Overall badge
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

  // Pay button
  const btn = $("btnPayFee");
  if (nannyPaid) {
    btn.innerHTML = `<span class="mpesa-logo">M</span> You've Paid ✓`;
    btn.disabled  = true;
    btn.style.background = "var(--mpesa-dark)";
  } else {
    btn.disabled  = false;
    btn.innerHTML = `<span class="mpesa-logo">M</span> Pay via M-Pesa`;
    btn.onclick   = () => openMpesaModal(match.id);
  }

  // Party pills
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
    if (State.statusFilter !== "all" && normStatus(p.payment_status) !== State.statusFilter) return false;
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
  $("mpesaModalBody").style.display = "block";
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

  const phone = `+254${rawPhone}`;
  const btn   = $("btnConfirmMpesa");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending…`;

  try {
    // POST /payments/{match_id}?phone_number=+254XXXXXXXXX
    const res = await fetch(
      `${API_URL}/payments/${matchId}?phone_number=${encodeURIComponent(phone)}`,
      { method: "POST", headers: authHeaders() }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Payment initiation failed.");
    }

    // Show pending / waiting-for-PIN state
    $("mpesaModalBody").style.display     = "none";
    $("mpesaModalFooter").style.display   = "none";
    $("mpesaPendingState").classList.add("show");

    showToast("STK push sent! Check your phone.", "success");

    // Poll for payment status after 15 seconds
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
  // Search
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

  // Modal close
  $("closeMpesaModal")?.addEventListener("click", () => $("mpesaModal").classList.remove("open"));
  $("cancelMpesaModal")?.addEventListener("click", () => $("mpesaModal").classList.remove("open"));
  $("mpesaModal")?.addEventListener("click", e => { if (e.target === $("mpesaModal")) $("mpesaModal").classList.remove("open"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") $("mpesaModal")?.classList.remove("open"); });
}

/* ─── Init ─── */
async function init() {
  setupSidebar();
  setupEvents();

  const [profile, payments] = await Promise.all([
    fetchProfile(),
    fetchPayments(),
  ]);

  State.payments = payments;

  // Header
  if (profile) {
    safeText("userName", profile.name || "Nanny User");
    const av = $("userAvatar");
    if (av) av.textContent = (profile.name || "N").split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("");
  }

  renderStats();
  renderConnectionFee();
  renderHistoryTable();
}

document.addEventListener("DOMContentLoaded", init);