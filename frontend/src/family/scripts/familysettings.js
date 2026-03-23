import { API_URL } from "../../utils/config.js";

/* ─────────────────────────────────────────────
   DOM HELPERS
───────────────────────────────────────────── */
function getElement(elementId) {
  return document.getElementById(elementId);
}

function getText(elementId) {
  return getElement(elementId)?.value ?? "";
}

function setText(elementId, value) {
  const element = getElement(elementId);
  if (element) element.textContent = value ?? "";
}

function setValue(elementId, value) {
  const element = getElement(elementId);
  if (element) element.value = value ?? "";
}

function setChecked(elementId, checkedState) {
  const element = getElement(elementId);
  if (element) element.checked = !!checkedState;
}

function authHeaders() {
  return {
    "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  };
}

function showToast(message, type = "info") {
  let toastElement = document.querySelector(".toast");
  if (!toastElement) {
    toastElement = document.createElement("div");
    toastElement.className = "toast";
    document.body.appendChild(toastElement);
  }
  toastElement.className = `toast ${type}`;
  const iconMap = { success: "✓", error: "✕", info: "ℹ" };
  toastElement.innerHTML = `<span>${iconMap[type] || "ℹ"}</span> ${message}`;
  toastElement.classList.add("show");
  clearTimeout(toastElement._hideTimer);
  toastElement._hideTimer = setTimeout(
    () => toastElement.classList.remove("show"), 3500
  );
}

function setButtonLoading(buttonId, isLoading, defaultLabel) {
  const buttonElement = getElement(buttonId);
  if (!buttonElement) return;
  buttonElement.disabled = isLoading;
  buttonElement.innerHTML = isLoading
    ? `<i class="fas fa-spinner fa-spin"></i> Saving…`
    : `<i class="fas fa-floppy-disk"></i> ${defaultLabel}`;
}

function getInitials(name = "") {
  return (name || "")
    .trim()
    .split(" ")
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() || "")
    .join("") || "F";
}

/* ─────────────────────────────────────────────
   APPLICATION STATE
───────────────────────────────────────────── */
const settingsState = {
  familyProfile:   null,
  currentUserId:   null,
  userEmail:       null,
  activeSection:   "account",
};

/* ─────────────────────────────────────────────
   AUTH GUARD
───────────────────────────────────────────── */
function checkAuthOrRedirect() {
  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    window.location.href = "/frontend/src/views/login.html";
    return false;
  }
  try {
    const tokenPayload = JSON.parse(atob(accessToken.split(".")[1]));
    if (tokenPayload.exp && tokenPayload.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = "/frontend/src/views/login.html";
      return false;
    }
    settingsState.currentUserId = tokenPayload.sub;
    settingsState.userEmail =
      tokenPayload.email ||
      tokenPayload.user_email ||
      tokenPayload.username ||
      "";
  } catch {
    window.location.href = "/frontend/src/views/login.html";
    return false;
  }
  return true;
}

/* ─────────────────────────────────────────────
   API CALLS
───────────────────────────────────────────── */
async function fetchFamilyProfile() {
  try {
    const response = await fetch(
      `${API_URL}/Family/${settingsState.currentUserId}`,
      { headers: authHeaders() }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("[familysettings] fetchFamilyProfile:", error);
    return null;
  }
}

async function updateFamilyProfile(payload) {
  const response = await fetch(
    `${API_URL}/Family/${settingsState.currentUserId}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const responseData = await response.json();
  if (!response.ok) throw new Error(responseData.detail || "Update failed.");
  return responseData;
}

async function changePassword(currentPassword, newPassword) {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Password change failed.");
  }
  return true;
}

async function deleteAccount() {
  // Uses the family profile id, not the user id
  const familyProfileId = settingsState.familyProfile?.id;
  if (!familyProfileId) throw new Error("No family profile found.");

  const response = await fetch(`${API_URL}/Family/${familyProfileId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Delete failed.");
  }
  return true;
}

/* ─────────────────────────────────────────────
   POPULATE FORMS FROM PROFILE
───────────────────────────────────────────── */
function populateAllForms(familyProfile) {
  // Account section
  setValue("settingFamilyName", familyProfile?.name || "");
  setValue("settingEmail",      settingsState.userEmail || "");

  // Household section
  setValue("settingLocation", familyProfile?.household_location || "");
  setValue("settingAddress",  familyProfile?.household_address  || "");
  setValue("settingDetails",  familyProfile?.household_details  || "");

  // Sidebar display
  setText("sidebarName", familyProfile?.name || "Family");
  const sidebarAvatarEl = getElement("sidebarAvatar");
  if (sidebarAvatarEl) sidebarAvatarEl.textContent = getInitials(familyProfile?.name || "");
}

/* ─────────────────────────────────────────────
   SECTION SWITCHING
───────────────────────────────────────────── */
function switchToSection(sectionName) {
  settingsState.activeSection = sectionName;

  // Update desktop nav items
  document.querySelectorAll(".fs-nav-item").forEach(navItem => {
    navItem.classList.toggle("active", navItem.dataset.section === sectionName);
  });

  // Update mobile tabs
  document.querySelectorAll(".fs-tab").forEach(tabButton => {
    tabButton.classList.toggle("active", tabButton.dataset.section === sectionName);
  });

  // Show/hide panels
  document.querySelectorAll(".fs-panel").forEach(panelEl => {
    panelEl.classList.toggle("active", panelEl.id === `section-${sectionName}`);
  });
}

/* ─────────────────────────────────────────────
   PASSWORD STRENGTH
───────────────────────────────────────────── */
function evaluatePasswordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)                             score++;
  if (password.length >= 12)                            score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password))                              score++;
  if (/[^A-Za-z0-9]/.test(password))                   score++;

  if (score <= 2) return { level: "weak",   label: "Weak" };
  if (score <= 3) return { level: "fair",   label: "Fair" };
  return           { level: "strong", label: "Strong" };
}

function updateStrengthIndicator(password) {
  const strengthBarEl  = getElement("strengthBar");
  const strengthFillEl = getElement("strengthFill");
  const strengthLblEl  = getElement("strengthLabel");

  if (!strengthBarEl || !strengthFillEl || !strengthLblEl) return;

  const result = evaluatePasswordStrength(password);

  if (!result || !password) {
    strengthBarEl.style.display = "none";
    strengthLblEl.textContent   = "";
    strengthLblEl.className     = "fs-strength-label";
    return;
  }

  strengthBarEl.style.display = "block";
  strengthFillEl.className    = `fs-strength-fill ${result.level}`;
  strengthLblEl.textContent   = result.label;
  strengthLblEl.className     = `fs-strength-label ${result.level}`;
}

/* ─────────────────────────────────────────────
   SAVE: ACCOUNT
───────────────────────────────────────────── */
async function handleSaveAccount() {
  const familyName = getText("settingFamilyName").trim();
  if (!familyName) {
    showToast("Family name is required.", "error");
    getElement("settingFamilyName")?.focus();
    return;
  }

  setButtonLoading("btnSaveAccount", true, "Save Account");
  try {
    const updatedProfile = await updateFamilyProfile({ name: familyName });
    settingsState.familyProfile = {
      ...settingsState.familyProfile,
      ...updatedProfile,
    };
    setText("sidebarName", familyName);
    const sidebarAvatarEl = getElement("sidebarAvatar");
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = getInitials(familyName);
    showToast("Account saved.", "success");
  } catch (error) {
    showToast(error.message || "Failed to save account.", "error");
  } finally {
    setButtonLoading("btnSaveAccount", false, "Save Account");
  }
}

/* ─────────────────────────────────────────────
   SAVE: HOUSEHOLD
───────────────────────────────────────────── */
async function handleSaveHousehold() {
  const locationValue = getText("settingLocation").trim();
  const detailsValue  = getText("settingDetails").trim();

  if (!locationValue) {
    showToast("Location is required.", "error");
    getElement("settingLocation")?.focus();
    return;
  }
  if (!detailsValue) {
    showToast("Household details are required.", "error");
    getElement("settingDetails")?.focus();
    return;
  }

  setButtonLoading("btnSaveHousehold", true, "Save Household");
  try {
    const payload = {
      household_location: locationValue,
      household_address:  getText("settingAddress").trim() || null,
      household_details:  detailsValue,
    };
    const updatedProfile = await updateFamilyProfile(payload);
    settingsState.familyProfile = {
      ...settingsState.familyProfile,
      ...updatedProfile,
      household_details: detailsValue,
    };
    showToast("Household details saved.", "success");
  } catch (error) {
    showToast(error.message || "Failed to save household.", "error");
  } finally {
    setButtonLoading("btnSaveHousehold", false, "Save Household");
  }
}

/* ─────────────────────────────────────────────
   SAVE: PASSWORD
───────────────────────────────────────────── */
async function handleSavePassword() {
  const currentPasswordValue = getText("currentPassword");
  const newPasswordValue     = getText("newPassword");
  const confirmPasswordValue = getText("confirmPassword");

  if (!currentPasswordValue) {
    showToast("Enter your current password.", "error");
    return;
  }
  if (newPasswordValue.length < 8) {
    showToast("New password must be at least 8 characters.", "error");
    return;
  }
  if (newPasswordValue !== confirmPasswordValue) {
    showToast("Passwords do not match.", "error");
    getElement("confirmPassword")?.focus();
    return;
  }

  setButtonLoading("btnSavePassword", true, "Change Password");
  try {
    await changePassword(currentPasswordValue, newPasswordValue);
    // Clear password fields after success
    setValue("currentPassword", "");
    setValue("newPassword",     "");
    setValue("confirmPassword", "");
    updateStrengthIndicator("");
    showToast("Password changed successfully.", "success");
  } catch (error) {
    showToast(error.message || "Failed to change password.", "error");
  } finally {
    setButtonLoading("btnSavePassword", false, "Change Password");
  }
}

/* ─────────────────────────────────────────────
   SAVE: NOTIFICATIONS
   (Local-only for now — backend endpoint optional)
───────────────────────────────────────────── */
function handleSaveNotifications() {
  const preferences = {
    applications: getElement("notifApplications")?.checked ?? true,
    matches:      getElement("notifMatches")?.checked      ?? true,
    payments:     getElement("notifPayments")?.checked     ?? true,
    contracts:    getElement("notifContracts")?.checked    ?? true,
    newsletter:   getElement("notifNewsletter")?.checked   ?? false,
  };
  // Persist locally
  localStorage.setItem("family_notif_prefs", JSON.stringify(preferences));
  showToast("Notification preferences saved.", "success");
}

function loadNotificationPreferences() {
  try {
    const savedPreferences = JSON.parse(
      localStorage.getItem("family_notif_prefs") || "{}"
    );
    setChecked("notifApplications", savedPreferences.applications ?? true);
    setChecked("notifMatches",      savedPreferences.matches      ?? true);
    setChecked("notifPayments",     savedPreferences.payments     ?? true);
    setChecked("notifContracts",    savedPreferences.contracts    ?? true);
    setChecked("notifNewsletter",   savedPreferences.newsletter   ?? false);
  } catch {
  }
}

function showDeleteConfirmPanel() {
  const confirmPanel = getElement("deleteConfirmPanel");
  if (confirmPanel) confirmPanel.style.display = "block";
  getElement("deleteConfirmInput")?.focus();
}


function hideDeleteConfirmPanel() {
  const confirmPanel = getElement("deleteConfirmPanel");
  if (confirmPanel) confirmPanel.style.display = "none";
  setValue("deleteConfirmInput", "");
  const confirmButton = getElement("btnConfirmDelete");
  if (confirmButton) confirmButton.disabled = true;
}


async function handleConfirmDelete() {
  const confirmationText = getText("deleteConfirmInput").trim().toUpperCase();
  if (confirmationText !== "DELETE") {
    showToast('Type "DELETE" (all caps) to confirm.', "error");
    return;
  }

  const confirmDeleteButton = getElement("btnConfirmDelete");
  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Deleting…`;
  }

  try {
    await deleteAccount();
    showToast("Account deleted. Redirecting…", "info");
    setTimeout(() => {
      localStorage.clear();
      window.location.href = "/frontend/src/views/login.html";
    }, 2000);
  } catch (error) {
    showToast(error.message || "Deletion failed. Contact support.", "error");
    if (confirmDeleteButton) {
      confirmDeleteButton.disabled = false;
      confirmDeleteButton.innerHTML = `<i class="fas fa-trash"></i> Permanently Delete`;
    }
  }
}

/* ─────────────────────────────────────────────
   ACTIVE NAV
───────────────────────────────────────────── */
function setupActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "familysettings.html";
  document.querySelectorAll(".sidebar-nav a").forEach(linkElement => {
    linkElement.classList.remove("active");
    const linkHref = (linkElement.getAttribute("href") || "").split("/").pop();
    if (linkHref === currentPage) linkElement.classList.add("active");
  });
}

/* ─────────────────────────────────────────────
   SIDEBAR TOGGLE
───────────────────────────────────────────── */
function setupSidebar() {
  const toggleButton = getElement("menuToggle");
  const sidebarEl    = getElement("sidebar");
  const overlayEl    = getElement("sidebarOverlay");

  function openSidebar() {
    sidebarEl?.classList.add("open");
    overlayEl?.classList.add("active");
    toggleButton?.querySelector("i")?.classList.replace("fa-bars", "fa-times");
  }

  function closeSidebar() {
    sidebarEl?.classList.remove("open");
    overlayEl?.classList.remove("active");
    toggleButton?.querySelector("i")?.classList.replace("fa-times", "fa-bars");
  }

  toggleButton?.addEventListener("click", (clickEvent) => {
    clickEvent.stopPropagation();
    sidebarEl?.classList.contains("open") ? closeSidebar() : openSidebar();
  });

  overlayEl?.addEventListener("click", closeSidebar);
}

/* ─────────────────────────────────────────────
   EVENT WIRING
───────────────────────────────────────────── */
function setupEvents() {
  // Section navigation — desktop nav items
  document.querySelectorAll(".fs-nav-item[data-section]").forEach(navItem => {
    navItem.addEventListener("click", () => switchToSection(navItem.dataset.section));
  });

  // Section navigation — mobile tabs
  document.querySelectorAll(".fs-tab[data-section]").forEach(tabButton => {
    tabButton.addEventListener("click", () => switchToSection(tabButton.dataset.section));
  });

  // Save buttons
  getElement("btnSaveAccount")?.addEventListener("click", handleSaveAccount);
  getElement("btnSaveHousehold")?.addEventListener("click", handleSaveHousehold);
  getElement("btnSavePassword")?.addEventListener("click", handleSavePassword);
  getElement("btnSaveNotifications")?.addEventListener("click", handleSaveNotifications);

  // Password strength indicator
  getElement("newPassword")?.addEventListener("input", (inputEvent) => {
    updateStrengthIndicator(inputEvent.target.value);
  });

  // Show/hide password toggles
  document.querySelectorAll(".fs-pw-toggle[data-target]").forEach(toggleButton => {
    toggleButton.addEventListener("click", () => {
      const targetInput = getElement(toggleButton.dataset.target);
      if (!targetInput) return;
      const isNowVisible = targetInput.type === "password";
      targetInput.type = isNowVisible ? "text" : "password";
      const iconEl = toggleButton.querySelector("i");
      if (iconEl) {
        iconEl.className = isNowVisible ? "fas fa-eye-slash" : "fas fa-eye";
      }
    });
  });

  // Danger zone: show delete confirm
  getElement("btnDeleteAccount")?.addEventListener("click", showDeleteConfirmPanel);
  getElement("btnCancelDelete")?.addEventListener("click", hideDeleteConfirmPanel);
  getElement("btnConfirmDelete")?.addEventListener("click", handleConfirmDelete);

  // Enable/disable the confirm delete button based on input
  getElement("deleteConfirmInput")?.addEventListener("input", (inputEvent) => {
    const confirmButton = getElement("btnConfirmDelete");
    if (confirmButton) {
      confirmButton.disabled =
        inputEvent.target.value.trim().toUpperCase() !== "DELETE";
    }
  });

  // Deactivate (stub — same route as delete but with soft-delete flag)
  getElement("btnDeactivate")?.addEventListener("click", () => {
    showToast("Deactivation is not yet implemented. Contact support.", "info");
  });

  // Allow pressing Enter on save sections
  ["section-account", "section-household", "section-security"].forEach(sectionId => {
    getElement(sectionId)?.addEventListener("keydown", (keyEvent) => {
      if (keyEvent.key !== "Enter" || keyEvent.target.tagName === "TEXTAREA") return;
      keyEvent.preventDefault();
      if (sectionId === "section-account")    handleSaveAccount();
      if (sectionId === "section-household")  handleSaveHousehold();
      if (sectionId === "section-security")   handleSavePassword();
    });
  });

  // Navigate to section from URL hash (e.g. familysettings.html#security)
  const urlHash = window.location.hash.replace("#", "");
  if (urlHash && ["account","household","security","notifications","danger"].includes(urlHash)) {
    switchToSection(urlHash);
  }
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
async function init() {
  if (!checkAuthOrRedirect()) return;

  setupActiveNav();
  setupSidebar();
  setupEvents();

  // Pre-fill email from JWT immediately (no API call needed)
  setValue("settingEmail", settingsState.userEmail || "");
  loadNotificationPreferences();

  // Fetch family profile
  const familyProfile = await fetchFamilyProfile();
  settingsState.familyProfile = familyProfile;

  if (familyProfile) {
    populateAllForms(familyProfile);
  } else {
    // No profile yet — show helpful message
    showToast("Complete your profile first to access all settings.", "info");
    setValue("settingEmail", settingsState.userEmail || "");
    setText("sidebarName", "Family");
  }
}

document.addEventListener("DOMContentLoaded", init);