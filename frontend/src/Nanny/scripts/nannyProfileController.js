import { API_URL } from "../../../src/utils/config.js";

/* ═══════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const safeText = (id, val) => { const el = $(id); if (el) el.textContent = val ?? "–"; };

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

const initials = (name = "") =>
  name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "N";

function formatDate(dateStr) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function relativeTime(dateStr) {
  if (!dateStr) return "Recently";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const State = {
  profile: null,
  applications: [],
  matches: [],
  appFilter: "all",
};

/* ═══════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════ */
async function fetchProfile() {
  const res = await fetch(`${API_URL}/Nanny/profile/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  return res.json();
}

async function fetchApplications() {
  const res = await fetch(`${API_URL}/Nanny/applications/me`, { headers: authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.applications || []);
}

async function fetchMatches() {
  // Fetch matches from your matches endpoint
  // Returns empty array gracefully if endpoint doesn't exist yet
  try {
    const res = await fetch(`${API_URL}/Nanny/matches/me`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.matches || []);
  } catch {
    return [];
  }
}

async function updateProfile(payload) {
  const res = await fetch(`${API_URL}/Nanny/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Update failed");
  }
  return res.json();
}

async function deleteProfile() {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_URL}/Nanny/`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}

/* ═══════════════════════════════════════════
   RENDER: HERO / HEADER
═══════════════════════════════════════════ */
function renderHero(p) {
  // Page header name
  safeText("userName", p.name);
  const avatarEl = $("userAvatar");
  if (avatarEl) avatarEl.textContent = initials(p.name);

  // Hero section
  safeText("heroName", p.name);

  const addrEl = $("heroAddress");
  if (addrEl) addrEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${p.address || "Location not set"}`;

  // Profile avatar
  const avatarDiv = $("profileAvatar");
  if (avatarDiv) {
    avatarDiv.innerHTML = p.profile_photo_url
      ? `<img src="${p.profile_photo_url}" alt="${p.name}">`
      : initials(p.name);
  }

  // Vetting chip
  const chip = $("vettingChip");
  if (chip) {
    const statusMap = {
      PENDING:     { label: "Pending Verification", cls: "" },
      IN_PROGRESS: { label: "Verification In Progress", cls: "" },
      INTERVIEWED: { label: "Interviewed", cls: "" },
      VETTED:      { label: "Fully Verified ✓", cls: "verified" },
      VERIFIED:    { label: "Fully Verified ✓", cls: "verified" },
      REJECTED:    { label: "Verification Failed", cls: "rejected" },
    };
    const s = statusMap[(p.vetting_status || "PENDING").toUpperCase()] || statusMap.PENDING;
    chip.innerHTML = `<i class="fas fa-shield-alt"></i> ${s.label}`;
    chip.className = `vetting-chip ${s.cls}`;
  }

  // Availability chip
  const availChip = $("availChip");
  if (availChip) {
    const avMap = {
      full_time: "Full-Time",
      part_time: "Part-Time",
      live_in: "Live-In",
      on_call: "On-Call",
    };
    availChip.innerHTML = `<i class="fas fa-clock"></i> ${avMap[p.availability] || p.availability || "–"}`;
  }
}

/* ═══════════════════════════════════════════
   RENDER: ABOUT / DETAILS
═══════════════════════════════════════════ */
function renderAbout(p) {
  const aboutEl = $("aboutText");
  if (aboutEl) {
    if (p.bio || p.description) {
      aboutEl.textContent = p.bio || p.description;
      aboutEl.classList.add("has-content");
    } else {
      aboutEl.textContent = "No bio added yet. Click edit to add a description about yourself.";
    }
  }

  safeText("statYears", p.years_experience ?? "0");
  safeText("statApps", State.applications.length);
  safeText("statMatches", State.matches.length);

  // Skills
  const skillsEl = $("skillsList");
  if (skillsEl) {
    const skills = (p.skills || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    skillsEl.innerHTML = skills.length
      ? skills.map(s => `<span class="skill-pill">${s}</span>`).join("")
      : `<span class="empty-pill">No skills added yet</span>`;
  }

  // Details column
  const avMap = { full_time: "Full-Time", part_time: "Part-Time", live_in: "Live-In", on_call: "On-Call" };
  safeText("detailLocation", p.preferred_location || "Not specified");
  safeText("detailAvailability", avMap[p.availability] || p.availability || "–");
  safeText("detailIdStatus", p.national_id_number ? "Submitted" : "Not submitted");
  safeText("detailSince", formatDate(p.created_at));
}

/* ═══════════════════════════════════════════
   RENDER: APPLICATIONS
═══════════════════════════════════════════ */
function renderApplications() {
  const container = $("appList");
  if (!container) return;

  safeText("appCount", State.applications.length);

  let list = State.applications;
  if (State.appFilter !== "all") {
    list = list.filter(a => (a.status || "pending").toLowerCase() === State.appFilter);
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-paper-plane"></i>
        <p>${State.appFilter === "all" ? "No applications yet." : `No ${State.appFilter} applications.`}</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map((app, i) => {
    const title    = app.job_post?.title    || "Childcare Job";
    const location = app.job_post?.location || "–";
    const salary   = app.job_post?.salary   ? `Ksh ${Number(app.job_post.salary).toLocaleString()}` : "";
    const status   = app.status             || "Pending";
    const badge    = status.toLowerCase().replace(/\s+/g, "_");

    return `
    <div class="app-card" style="animation-delay:${i * 0.05}s">
      <div class="app-icon"><i class="fas fa-baby"></i></div>
      <div class="app-info">
        <strong>${title}</strong>
        <p><i class="fas fa-map-marker-alt" style="font-size:.6rem"></i> ${location} · ${relativeTime(app.applied_at)}</p>
      </div>
      <div class="app-right">
        ${salary ? `<span class="app-salary">${salary}</span>` : ""}
        <span class="status-badge ${badge}">${status}</span>
      </div>
    </div>`;
  }).join("");
}

/* ═══════════════════════════════════════════
   RENDER: MATCHES
═══════════════════════════════════════════ */
function renderMatches() {
  const container = $("matchList");
  if (!container) return;

  safeText("matchCount", State.matches.length);

  if (State.matches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-handshake"></i>
        <p>No matches yet. Keep applying!</p>
      </div>`;
    return;
  }

  container.innerHTML = State.matches.map((m, i) => `
    <div class="match-item" style="animation-delay:${i * 0.06}s">
      <div class="match-item-avatar">${initials(m.family_name || m.family?.name || "F")}</div>
      <div class="match-item-info">
        <strong>${m.family_name || m.family?.name || "Family"}</strong>
        <p>Since ${formatDate(m.created_at || m.matched_at)}</p>
      </div>
      <div class="match-active-dot" title="Active"></div>
    </div>`).join("");
}

/* ═══════════════════════════════════════════
   RENDER: VETTING STEPS
═══════════════════════════════════════════ */
function renderVettingSteps(status) {
  const steps = [
    { key: "PENDING",     label: "Profile Submitted",       desc: "Your profile has been received." },
    { key: "IN_PROGRESS", label: "Background Check",        desc: "Verifying your credentials." },
    { key: "INTERVIEWED", label: "Interview Completed",     desc: "Panel review complete." },
    { key: "VETTED",      label: "Fully Verified",          desc: "You are fully verified! 🎉" },
  ];

  const order = ["PENDING", "IN_PROGRESS", "INTERVIEWED", "VETTED"];
  const currentIdx = order.indexOf((status || "PENDING").toUpperCase());

  const container = $("vettingSteps");
  if (!container) return;

  container.innerHTML = steps.map((step, i) => {
    let cls = "";
    if (i < currentIdx) cls = "done";
    else if (i === currentIdx) cls = "active";

    const icon = i < currentIdx ? "fa-check" : i === currentIdx ? "fa-circle" : "fa-circle";

    return `
    <div class="vstep ${cls}">
      <div class="vstep-dot"><i class="fas ${icon}"></i></div>
      <div class="vstep-info">
        <strong>${step.label}</strong>
        <p>${step.desc}</p>
      </div>
    </div>`;
  }).join("");
}

/* ═══════════════════════════════════════════
   EDIT MODAL
═══════════════════════════════════════════ */
function openEditModal() {
  const p = State.profile;
  if (!p) return;

  // Pre-fill form fields from current profile
  const fields = {
    editName:             p.name              || "",
    editBio:              p.bio               || p.description || "",
    editAddress:          p.address           || "",
    editPreferredLocation:p.preferred_location|| "",
    editYearsExp:         p.years_experience  ?? "",
    editSkills:           p.skills            || "",
  };

  for (const [id, val] of Object.entries(fields)) {
    const el = $(id);
    if (el) el.value = val;
  }

  // Availability select
  const avSelect = $("editAvailability");
  if (avSelect && p.availability) avSelect.value = p.availability;

  $("editModal").classList.add("open");
}

function closeEditModal() { $("editModal")?.classList.remove("open"); }

async function saveProfile() {
  const btn = $("btnSaveProfile");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving…`;

  // Build payload — only send fields that changed (non-empty)
  const payload = {};
  const name     = $("editName")?.value.trim();
  const bio      = $("editBio")?.value.trim();
  const address  = $("editAddress")?.value.trim();
  const location = $("editPreferredLocation")?.value.trim();
  const years    = $("editYearsExp")?.value;
  const skills   = $("editSkills")?.value.trim();
  const avail    = $("editAvailability")?.value;

  if (name)     payload.name               = name;
  if (bio)      payload.bio                = bio;
  if (address)  payload.address            = address;
  if (location) payload.preferred_location = location;
  if (years)    payload.years_experience   = parseInt(years, 10);
  if (skills)   payload.skills             = skills;
  if (avail)    payload.availability       = avail;

  try {
    const updated = await updateProfile(payload);

    // Merge into state
    State.profile = { ...State.profile, ...updated, ...payload };

    // Re-render everything
    renderHero(State.profile);
    renderAbout(State.profile);
    renderVettingSteps(State.profile.vetting_status);

    closeEditModal();
    showToast("Profile updated successfully!", "success");
  } catch (err) {
    showToast(err.message || "Could not save. Try again.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-save"></i> Save Changes`;
  }
}

/* ═══════════════════════════════════════════
   PHOTO UPLOAD
═══════════════════════════════════════════ */
function setupPhotoUpload() {
  const input = $("photoInput");
  if (!input) return;

  input.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      const avatarDiv = $("profileAvatar");
      if (avatarDiv) avatarDiv.innerHTML = `<img src="${ev.target.result}" alt="preview">`;
    };
    reader.readAsDataURL(file);

    // TODO: Upload to your storage service (S3, Cloudinary, etc.)
    // and then PATCH the profile_photo_url
    // Example:
    // const url = await uploadToStorage(file);
    // await updateProfile({ profile_photo_url: url });

    showToast("Photo updated! (Wire up your storage endpoint to persist this.)", "info");
  });
}

/* ═══════════════════════════════════════════
   DELETE PROFILE
═══════════════════════════════════════════ */
function openDeleteModal() { $("deleteModal")?.classList.add("open"); }
function closeDeleteModal() { $("deleteModal")?.classList.remove("open"); }

async function confirmDelete() {
  const btn = $("btnConfirmDelete");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Deleting…`;

  try {
    await deleteProfile();
    showToast("Profile deleted. Redirecting…", "info");
    setTimeout(() => {
      localStorage.removeItem("access_token");
      window.location.href = "/index.html";
    }, 1800);
  } catch (err) {
    showToast("Could not delete profile. Try again.", "error");
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-trash-alt"></i> Yes, Delete`;
  }
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

  const openSb  = () => { sidebar?.classList.add("open"); overlay?.classList.add("active"); toggle?.querySelector("i")?.classList.replace("fa-bars","fa-times"); };
  const closeSb = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("active"); toggle?.querySelector("i")?.classList.replace("fa-times","fa-bars"); };

  toggle?.addEventListener("click", e => { e.stopPropagation(); sidebar?.classList.contains("open") ? closeSb() : openSb(); });
  overlay?.addEventListener("click", closeSb);
  window.addEventListener("resize", () => { if (window.innerWidth > 768) closeSb(); });
}

/* ═══════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════ */
function setupEvents() {
  // Edit modal
  $("btnEditProfile")?.addEventListener("click", openEditModal);
  $("closeEditModal")?.addEventListener("click", closeEditModal);
  $("cancelEditModal")?.addEventListener("click", closeEditModal);
  $("btnSaveProfile")?.addEventListener("click", saveProfile);

  // Inline edit buttons on cards
  document.querySelectorAll(".pcard-edit-btn").forEach(btn => {
    btn.addEventListener("click", openEditModal);
  });

  // Delete modal
  $("btnDeleteProfile")?.addEventListener("click", openDeleteModal);
  $("closeDeleteModal")?.addEventListener("click", closeDeleteModal);
  $("cancelDeleteModal")?.addEventListener("click", closeDeleteModal);
  $("btnConfirmDelete")?.addEventListener("click", confirmDelete);

  // Share button
  document.querySelector(".btn-share-profile")?.addEventListener("click", () => {
    const url = `${window.location.origin}/nanny/${State.profile?.id}`;
    navigator.clipboard?.writeText(url).then(() => showToast("Profile link copied!", "success"));
  });

  // Application filter tabs
  $("appTabs")?.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    State.appFilter = tab.dataset.filter || "all";
    renderApplications();
  });

  // Close modals on backdrop or Escape
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
  });
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
async function init() {
    setupActiveNav();
  setupSidebar();
  setupEvents();
  setupPhotoUpload();

  try {
    // Load all data in parallel
    const [profile, applications, matches] = await Promise.all([
      fetchProfile(),
      fetchApplications(),
      fetchMatches(),
    ]);

    State.profile      = profile;
    State.applications = applications;
    State.matches      = matches;

    renderHero(profile);
    renderAbout(profile);
    renderApplications();
    renderMatches();
    renderVettingSteps(profile.vetting_status);

  } catch (err) {
    console.error("Profile page init error:", err);
    showToast("Could not load profile data.", "error");
  }
}

document.addEventListener("DOMContentLoaded", init);