import { API_URL } from "../../utils/config.js";

/* ─── utils ─── */
const $ = id => document.getElementById(id);
const safeText = (id, v) => { const el = $(id); if (el) el.textContent = v ?? ""; };
const val      = id => $(id)?.value ?? "";
const setVal   = (id, v) => { const el = $(id); if (el) el.value = v ?? ""; };
const setCheck = (id, v) => { const el = $(id); if (el) el.checked = !!v; };

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

function setLoading(btnId, loading, label) {
  const btn = $(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<i class="fas fa-spinner fa-spin"></i> Saving…`
    : `<i class="fas fa-floppy-disk"></i> ${label}`;
}

/* ─── State ─── */
const State = { profile: null, activeSection: "profile" };

/* ─── API ─── */
async function fetchProfile() {
  try {
    const res = await fetch(`${API_URL}/Nanny/profile/me`, { headers: authHeaders() });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function fetchUserInfo() {
  // Extract email from JWT payload directly — avoids dependency on /auth/me
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Never fall back to sub for email — sub is a UUID, not an address.
    const email = payload.email || payload.user_email || payload.username || "";
    return { email, id: payload.sub };
  } catch {
    return null;
  }
}

async function patchNannyProfile(payload) {
  const res = await fetch(`${API_URL}/Nanny/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Update failed.");
  }
  return res.json();
}

async function changePassword(currentPassword, newPassword) {
  // PATCH /auth/password or /users/me/password — adjust route
  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Password change failed.");
  }
  return true;
}

async function deleteAccount() {
  // DELETE /Nanny/{nanny_id} — uses the profile id
  const nannyId = State.profile?.id;
  if (!nannyId) throw new Error("No profile found.");
  const res = await fetch(`${API_URL}/Nanny/${nannyId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Delete failed.");
  }
  return true;
}

/* ─── Section switching ─── */
function switchSection(section) {
  State.activeSection = section;

  // Desktop nav
  document.querySelectorAll(".settings-nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });

  // Mobile tabs
  document.querySelectorAll(".smtab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });

  // Panels
  document.querySelectorAll(".settings-panel-content").forEach(panel => {
    panel.classList.toggle("active", panel.id === `section-${section}`);
  });
}

/* ─── Populate form from profile ─── */
function populateForm(profile, user) {
  // Name
  setVal("settingName", profile?.name || "");

  // Email comes from JWT, not NannyProfile (NannyProfile has no email field)
  // Show email from JWT; if the token has no email claim, show a
  // clear placeholder so the field is never filled with a raw UUID.
  setVal("settingEmail", user?.email || "");
  if (!user?.email) {
    const el = $("settingEmail");
    if (el) el.placeholder = "Email not available — contact support";
  }

  // Address fields
  setVal("settingAddress",          profile?.address          || "");
  setVal("settingPreferredLocation", profile?.preferred_location || "");

  // Experience
  setVal("settingExperience", profile?.years_experience ?? "");

  // Availability — match the select option values exactly
  const avEl = $("settingAvailability");
  if (avEl && profile?.availability) {
    avEl.value = profile.availability.toLowerCase();
  }

  // Skills — backend stores as array OR comma-string; normalise both
  let skillsStr = "";
  if (Array.isArray(profile?.skills)) {
    skillsStr = profile.skills.join(", ");
  } else if (typeof profile?.skills === "string") {
    skillsStr = profile.skills;
  }
  setVal("settingSkills", skillsStr);

  // Bio — NannyProfile doesn't have this field yet; pre-fill empty
  setVal("settingBio", profile?.bio || profile?.description || "");

  // Avatar
  const av = $("settingsAvatar");
  if (av) {
    if (profile?.profile_photo_url) {
      av.innerHTML = `<img src="${profile.profile_photo_url}" alt="avatar">`;
    } else {
      av.textContent = (profile?.name || "N")
        .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
    }
  }
}

/* ─── Save: profile ─── */
async function saveProfile() {
  setLoading("btnSaveProfile", true, "Save Changes");
  try {
    const skillsRaw = val("settingSkills");
    const skills    = skillsRaw ? skillsRaw.split(",").map(s=>s.trim()).filter(Boolean) : [];

    const payload = {
      name:               val("settingName")             || undefined,
      address:            val("settingAddress")          || undefined,
      preferred_location: val("settingPreferredLocation")|| undefined,
      years_experience:   Number(val("settingExperience")) || undefined,
      availability:       val("settingAvailability")     || undefined,
      skills:             skills.length ? skills : undefined,
      bio:                val("settingBio")              || undefined,
    };

    // Remove undefined fields
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    await patchNannyProfile(payload);

    // Update header name
    safeText("userName", val("settingName") || "Nanny User");

    showToast("Profile updated successfully!", "success");
  } catch (err) {
    showToast(err.message || "Could not save profile.", "error");
  } finally {
    setLoading("btnSaveProfile", false, "Save Changes");
  }
}

/* ─── Save: password ─── */
async function savePassword() {
  const current = val("currentPassword");
  const newPwd  = val("newPassword");
  const confirm = val("confirmPassword");

  if (!current || !newPwd) { showToast("Fill in all password fields.", "error"); return; }
  if (newPwd !== confirm)  { showToast("New passwords don't match.", "error"); return; }
  if (newPwd.length < 8)   { showToast("Password must be at least 8 characters.", "error"); return; }

  setLoading("btnSavePassword", true, "Update Password");
  try {
    await changePassword(current, newPwd);
    $("currentPassword").value = "";
    $("newPassword").value     = "";
    $("confirmPassword").value = "";
    showToast("Password changed successfully!", "success");
  } catch (err) {
    showToast(err.message || "Could not change password.", "error");
  } finally {
    setLoading("btnSavePassword", false, "Update Password");
  }
}

/* ─── Photo upload (preview only — wire to storage service) ─── */
function setupPhotoUpload() {
  $("btnUploadPhoto")?.addEventListener("click", () => $("photoFileInput").click());

  $("photoFileInput")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Photo must be under 5MB.", "error"); return; }

    const reader = new FileReader();
    reader.onload = ev => {
      const av = $("settingsAvatar");
      if (av) av.innerHTML = `<img src="${ev.target.result}" alt="avatar">`;
      // TODO: upload to storage (S3/Cloudinary), then PATCH profile_photo_url
      showToast("Photo previewed. Wire upload service to persist.", "info");
    };
    reader.readAsDataURL(file);
  });
}

/* ─── Sign out all devices ─── */
function signOutAll() {
  localStorage.removeItem("access_token");
  
  // Optional: clear user_id if you stored it during login
  localStorage.removeItem("user_id"); 

  showToast("Signed out from all devices.", "info");

  // Use a path relative to the server root to avoid the "src/src" nesting error
  setTimeout(() => {
    window.location.href = "../../views/login.html"
  }, 1500);
}

/* ─── Delete account flow ─── */
function setupDeleteModal() {
  const input  = $("deleteConfirmInput");
  const btn    = $("btnConfirmDelete");

  input?.addEventListener("input", () => {
    btn.disabled = input.value.trim() !== "DELETE";
  });

  $("btnDeleteAccount")?.addEventListener("click", () => $("deleteAccountModal").classList.add("open"));
  $("closeDeleteModal")?.addEventListener("click", () => $("deleteAccountModal").classList.remove("open"));
  $("cancelDeleteModal")?.addEventListener("click", () => $("deleteAccountModal").classList.remove("open"));

  btn?.addEventListener("click", async () => {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Deleting…`;
    try {
      await deleteAccount();
      localStorage.removeItem("access_token");
      showToast("Account deleted. Redirecting…", "info");
      setTimeout(() => window.location.href = "/", 2000);
    } catch (err) {
      showToast(err.message || "Could not delete account.", "error");
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-trash-alt"></i> Permanently Delete`;
    }
  });

  $("deleteAccountModal")?.addEventListener("click", e => {
    if (e.target === $("deleteAccountModal")) $("deleteAccountModal").classList.remove("open");
  });
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
  // Section switching — desktop nav + mobile tabs
  document.querySelectorAll(".settings-nav-item, .smtab").forEach(btn => {
    btn.addEventListener("click", () => switchSection(btn.dataset.section));
  });

  $("btnSaveProfile")?.addEventListener("click", saveProfile);
  $("btnSavePassword")?.addEventListener("click", savePassword);

  $("btnSaveNotifications")?.addEventListener("click", () => {
    showToast("Notification preferences saved.", "success");
  });

  $("btnSavePrivacy")?.addEventListener("click", () => {
    showToast("Privacy settings saved.", "success");
  });

  $("btnSignOutAll")?.addEventListener("click", signOutAll);
  $("btnDeactivate")?.addEventListener("click", () => {
    showToast("Account deactivation coming soon.", "info");
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") $("deleteAccountModal")?.classList.remove("open");
  });
}

/* ─── Init ─── */
async function init() {
  setupActiveNav();
  setupSidebar();
  setupEvents();
  setupPhotoUpload();
  setupDeleteModal();

  const [profile, user] = await Promise.all([
    fetchProfile(),
    fetchUserInfo(),
  ]);

  State.profile = profile;

  // Header
  if (profile) {
    safeText("userName", profile.name || "Nanny User");
    const av = $("userAvatar");
    if (av) av.textContent = (profile.name||"N").split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("");
  }

  populateForm(profile, user);
}

document.addEventListener("DOMContentLoaded", init);