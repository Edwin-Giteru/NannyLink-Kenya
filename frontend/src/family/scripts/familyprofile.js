import { API_URL } from "../../utils/config.js";

/* ─────────────────────────────────────────────
   DOM HELPERS
───────────────────────────────────────────── */
function getElement(elementId) {
  return document.getElementById(elementId);
}

function setText(elementId, value) {
  const element = getElement(elementId);
  if (element) element.textContent = value ?? "";
}

function setHtml(elementId, markup) {
  const element = getElement(elementId);
  if (element) element.innerHTML = markup ?? "";
}

function authHeaders() {
  return {
    "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  };
}

function showToast(message, type = "info") {
  let toastEl = document.querySelector(".toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.className = `toast ${type}`;
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  toastEl.innerHTML = `<span>${icons[type] || "ℹ"}</span> ${message}`;
  toastEl.classList.add("show");
  clearTimeout(toastEl._hideTimer);
  toastEl._hideTimer = setTimeout(() => toastEl.classList.remove("show"), 3500);
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-KE", {
    day: "numeric", month: "long", year: "numeric",
  });
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
const profileState = {
  familyProfile:    null,
  currentUserId:    null,
  userEmail:        null,
  jobCount:         0,
  applicationCount: 0,
  matchCount:       0,
  contractCount:    0,
};

/* ─────────────────────────────────────────────
   AUTH GUARD
───────────────────────────────────────────── */
function checkAuthOrRedirect() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.href = "/frontend/src/views/login.html";
    return false;
  }
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = "/frontend/src/views/login.html";
      return false;
    }
    profileState.currentUserId = payload.sub;
    profileState.userEmail =
      payload.email || payload.user_email || payload.username || null;
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
      `${API_URL}/Family/${profileState.currentUserId}`,
      { headers: authHeaders() }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("[familyprofile] fetchFamilyProfile error:", error);
    return null;
  }
}

async function fetchActivityCounts() {
  try {
    const [jobsResponse, appsResponse, matchesResponse, contractsResponse] =
      await Promise.allSettled([
        fetch(`${API_URL}/job/family/me`,           { headers: authHeaders() }),
        fetch(`${API_URL}/applications/family/me`,  { headers: authHeaders() }),
        fetch(`${API_URL}/matches/`,                { headers: authHeaders() }),
        fetch(`${API_URL}/contracts/me`,            { headers: authHeaders() }),
      ]);

    const parseCount = async (settled) => {
      if (settled.status !== "fulfilled" || !settled.value.ok) return 0;
      const data = await settled.value.json();
      return Array.isArray(data) ? data.length : (data?.data?.length ?? 0);
    };

    profileState.jobCount         = await parseCount(jobsResponse);
    profileState.applicationCount = await parseCount(appsResponse);
    profileState.matchCount       = await parseCount(matchesResponse);
    profileState.contractCount    = await parseCount(contractsResponse);
  } catch (error) {
    console.error("[familyprofile] fetchActivityCounts error:", error);
  }
}

async function saveProfile(payload) {
  const response = await fetch(
    `${API_URL}/Family/${profileState.currentUserId}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Update failed.");
  return data;
}

/* ─────────────────────────────────────────────
   RENDER: HERO SECTION
───────────────────────────────────────────── */
function renderHero(familyProfile) {
  const familyName = familyProfile?.name || "Your Family";
  const userEmail  = profileState.userEmail || "—";
  const location   = familyProfile?.household_location || null;

  setText("heroName",  familyName);
  setText("heroEmail", userEmail);

  const avatarElement = getElement("heroAvatar");
  if (avatarElement) avatarElement.textContent = getInitials(familyName);

  // Sidebar
  setText("sidebarName", familyName);
  const sidebarAvatarEl = getElement("sidebarAvatar");
  if (sidebarAvatarEl) sidebarAvatarEl.textContent = getInitials(familyName);

  // Location tag
  const locationTag = getElement("heroLocationTag");
  const locationText = getElement("heroLocationText");
  if (location && locationTag && locationText) {
    locationTag.style.display = "inline-flex";
    locationText.textContent  = location;
  }

  // Account info card
  setText("accountEmail", userEmail);
  setText("memberSince",  familyProfile?.created_at
    ? formatDate(familyProfile.created_at)
    : "—");
}

/* ─────────────────────────────────────────────
   RENDER: HOUSEHOLD VIEW
───────────────────────────────────────────── */
function renderHouseholdView(familyProfile) {
  setText("viewName",     familyProfile?.name                  || "—");
  setText("viewLocation", familyProfile?.household_location    || "—");
  setText("viewAddress",  familyProfile?.household_address     || "—");
  setText("viewDetails",  familyProfile?.household_details     || "—");
}

/* ─────────────────────────────────────────────
   RENDER: COMPLETENESS
───────────────────────────────────────────── */
const COMPLETENESS_CHECKS = [
  { key: "name",               label: "Family name set",     test: (profile) => !!profile?.name },
  { key: "location",           label: "Location added",      test: (profile) => !!profile?.household_location },
  { key: "details",            label: "Household details",   test: (profile) => !!profile?.household_details },
  { key: "address",            label: "Full address added",  test: (profile) => !!profile?.household_address },
  { key: "jobs",               label: "Job posted",          test: ()        => profileState.jobCount > 0 },
  { key: "match",              label: "Match found",         test: ()        => profileState.matchCount > 0 },
];

function renderCompleteness(familyProfile) {
  const completedCount = COMPLETENESS_CHECKS.filter(
    check => check.test(familyProfile)
  ).length;
  const totalCount = COMPLETENESS_CHECKS.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  // Ring on hero
  const ringFill = getElement("ringFill");
  if (ringFill) {
    setTimeout(() => {
      ringFill.setAttribute("stroke-dasharray", `${percentage}, 100`);
    }, 400);
  }
  setText("completenessLabel", `${percentage}%`);

  // Card score
  setText("completenessScore", `${percentage}%`);
  const statusLabel = percentage === 100
    ? "Complete ✓"
    : percentage >= 60
      ? "Almost there"
      : "Incomplete";
  setText("completenessStatus", statusLabel);

  // Progress bar
  const barFill = getElement("completenessFill");
  if (barFill) {
    setTimeout(() => { barFill.style.width = `${percentage}%`; }, 300);
  }

  // Checklist
  const checklistEl = getElement("fpChecklist");
  if (checklistEl) {
    checklistEl.innerHTML = COMPLETENESS_CHECKS.map(check => {
      const isDone = check.test(familyProfile);
      return `<li class="${isDone ? "fp-check-done" : "fp-check-todo"}">
        <i class="fas ${isDone ? "fa-circle-check" : "fa-circle"}"></i>
        ${check.label}
      </li>`;
    }).join("");
  }
}

/* ─────────────────────────────────────────────
   RENDER: ACTIVITY SUMMARY
───────────────────────────────────────────── */
function renderActivity() {
  setText("actJobs",      profileState.jobCount);
  setText("actApps",      profileState.applicationCount);
  setText("actMatches",   profileState.matchCount);
  setText("actContracts", profileState.contractCount);
}

/* ─────────────────────────────────────────────
   FORM: POPULATE EDIT FIELDS
───────────────────────────────────────────── */
function populateEditForm(familyProfile) {
  const nameInput     = getElement("editName");
  const locationInput = getElement("editLocation");
  const addressInput  = getElement("editAddress");
  const detailsInput  = getElement("editDetails");

  if (nameInput)     nameInput.value     = familyProfile?.name                  || "";
  if (locationInput) locationInput.value = familyProfile?.household_location    || "";
  if (addressInput)  addressInput.value  = familyProfile?.household_address     || "";
  if (detailsInput)  detailsInput.value  = familyProfile?.household_details     || "";
}

/* ─────────────────────────────────────────────
   FORM: VALIDATION
───────────────────────────────────────────── */
function clearValidationErrors() {
  ["errName", "errLocation", "errDetails"].forEach(errorId => {
    setText(errorId, "");
  });
  document.querySelectorAll(".fp-input-wrap.has-error, textarea.has-error").forEach(el => {
    el.classList.remove("has-error");
  });
}

function setFieldError(errorElementId, inputElementId, message) {
  setText(errorElementId, message);
  const inputEl = getElement(inputElementId);
  if (inputEl) {
    const wrapEl = inputEl.closest(".fp-input-wrap") || inputEl;
    wrapEl.classList.add("has-error");
  }
}

function validateHouseholdForm() {
  clearValidationErrors();
  let isValid = true;

  const familyName     = getElement("editName")?.value.trim() || "";
  const locationValue  = getElement("editLocation")?.value.trim() || "";
  const detailsValue   = getElement("editDetails")?.value.trim() || "";

  if (!familyName) {
    setFieldError("errName", "editName", "Family name is required.");
    isValid = false;
  } else if (familyName.length < 2) {
    setFieldError("errName", "editName", "Name must be at least 2 characters.");
    isValid = false;
  }

  if (!locationValue) {
    setFieldError("errLocation", "editLocation", "Location is required.");
    isValid = false;
  }

  if (!detailsValue) {
    const detailsEl = getElement("editDetails");
    setText("errDetails", "Household details are required.");
    if (detailsEl) detailsEl.classList.add("has-error");
    isValid = false;
  }

  return isValid;
}

/* ─────────────────────────────────────────────
   SECTION TOGGLE: show/hide edit form
───────────────────────────────────────────── */
function showEditSection(sectionName) {
  const viewEl = getElement(`view${capitalise(sectionName)}`);
  const editEl = getElement(`edit${capitalise(sectionName)}`);

  if (viewEl) viewEl.style.display = "none";
  if (editEl) editEl.style.display = "block";

  // Populate form with current values
  populateEditForm(profileState.familyProfile);
  clearValidationErrors();
}

function hideEditSection(sectionName) {
  const viewEl = getElement(`view${capitalise(sectionName)}`);
  const editEl = getElement(`edit${capitalise(sectionName)}`);

  if (viewEl) viewEl.style.display = "flex";
  if (editEl) editEl.style.display = "none";
}

function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/* ─────────────────────────────────────────────
   SAVE HANDLER
───────────────────────────────────────────── */
async function handleSaveHousehold(submitEvent) {
  submitEvent.preventDefault();
  if (!validateHouseholdForm()) return;

  const saveButton = getElement("btnSaveHousehold");
  saveButton.disabled = true;
  saveButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving…`;

  try {
    const payload = {
      name:               getElement("editName")?.value.trim(),
      household_location: getElement("editLocation")?.value.trim(),
      household_address:  getElement("editAddress")?.value.trim() || null,
    };

    // FamilyUpdate also accepts household_details via the details field
    // Map to correct field name
    const detailsValue = getElement("editDetails")?.value.trim();
    if (detailsValue) payload.household_details = detailsValue;

    const updatedProfile = await saveProfile(payload);

    // Merge into state (backend may return partial data)
    profileState.familyProfile = {
      ...profileState.familyProfile,
      ...updatedProfile,
      // Ensure we keep household_details if backend doesn't echo it back
      household_details: detailsValue || profileState.familyProfile?.household_details,
    };

    // Re-render all sections
    renderHero(profileState.familyProfile);
    renderHouseholdView(profileState.familyProfile);
    renderCompleteness(profileState.familyProfile);

    hideEditSection("household");
    showToast("Profile updated successfully.", "success");

  } catch (error) {
    showToast(error.message || "Failed to save. Please try again.", "error");
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = `<i class="fas fa-floppy-disk"></i> Save Changes`;
  }
}

/* ─────────────────────────────────────────────
   ACTIVE NAV
───────────────────────────────────────────── */
function setupActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "familyprofile.html";
  document.querySelectorAll(".sidebar-nav a").forEach(linkEl => {
    linkEl.classList.remove("active");
    const linkHref = (linkEl.getAttribute("href") || "").split("/").pop();
    if (linkHref === currentPage) linkEl.classList.add("active");
  });
}

/* ─────────────────────────────────────────────
   SIDEBAR TOGGLE
───────────────────────────────────────────── */
function setupSidebar() {
  const toggleButton  = getElement("menuToggle");
  const sidebarEl     = getElement("sidebar");
  const overlayEl     = getElement("sidebarOverlay");

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
  // "Edit Profile" hero button — opens household section
  getElement("btnEditProfile")?.addEventListener("click", () => {
    showEditSection("household");
    getElement("cardHousehold")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Card edit buttons (data-section attribute)
  document.querySelectorAll(".fp-card-edit-btn[data-section]").forEach(editBtn => {
    editBtn.addEventListener("click", () => {
      const sectionName = editBtn.dataset.section;
      showEditSection(sectionName);
    });
  });

  // Cancel buttons
  document.querySelectorAll(".fp-btn-cancel[data-section]").forEach(cancelBtn => {
    cancelBtn.addEventListener("click", () => {
      const sectionName = cancelBtn.dataset.section;
      hideEditSection(sectionName);
      clearValidationErrors();
    });
  });

  // Household form submit
  getElement("editHousehold")?.addEventListener("submit", handleSaveHousehold);

  // Refresh button
  getElement("btnRefresh")?.addEventListener("click", async () => {
    const refreshBtn = getElement("btnRefresh");
    if (refreshBtn) refreshBtn.querySelector("i")?.classList.add("fa-spin");
    await loadAllData();
    if (refreshBtn) refreshBtn.querySelector("i")?.classList.remove("fa-spin");
    showToast("Profile refreshed.", "info");
  });

  // Escape key closes edit forms
  document.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key !== "Escape") return;
    ["household"].forEach(sectionName => {
      const editEl = getElement(`edit${capitalise(sectionName)}`);
      if (editEl && editEl.style.display !== "none") {
        hideEditSection(sectionName);
        clearValidationErrors();
      }
    });
  });
}

/* ─────────────────────────────────────────────
   SKELETON LOADERS
───────────────────────────────────────────── */
function renderSkeletons() {
  const heroNameEl = getElement("heroName");
  if (heroNameEl) {
    heroNameEl.innerHTML = `<span class="fp-skeleton-line" style="display:block;height:22px;width:200px;border-radius:4px"></span>`;
  }

  const viewHouseholdEl = getElement("viewHousehold");
  if (viewHouseholdEl) {
    viewHouseholdEl.innerHTML = [1, 2, 3, 4].map(() => `
      <div class="fp-field-row">
        <span class="fp-skeleton-line" style="height:10px;width:80px;border-radius:4px;display:block"></span>
        <span class="fp-skeleton-line" style="height:10px;width:60%;border-radius:4px;display:block"></span>
      </div>`).join("");
  }
}

async function loadAllData() {
  const [familyProfile] = await Promise.all([
    fetchFamilyProfile(),
    fetchActivityCounts(),
  ]);

  profileState.familyProfile = familyProfile;

  if (familyProfile) {
    renderHero(familyProfile);
    renderHouseholdView(familyProfile);
  } else {
    setText("heroName", "Create Your Profile");
    // Auto-open edit form if no profile exists
    showEditSection("household");
  }

  renderCompleteness(familyProfile);
  renderActivity();
}

async function init() {
  if (!checkAuthOrRedirect()) return;

  setupActiveNav();
  setupSidebar();
  setupEvents();
  renderSkeletons();

  await loadAllData();
}

document.addEventListener("DOMContentLoaded", init);