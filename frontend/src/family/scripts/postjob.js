import { API_URL } from "../../utils/config.js";

/* ─── utils ─── */
const $ = id => document.getElementById(id);
const safeText = (id, v) => { const el=$(id); if(el) el.textContent = v ?? ""; };

function authHeaders() {
  return {
    "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  };
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
  return (name || "").trim().split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("") || "F";
}

/* ─── State ─── */
const State = {
  currentStep: 1,
  familyName:  "",
  draft: {
    title:                "",
    location:             "",
    availability:         "",
    salary:               "",
    required_experience:  1,
    duties:               "",
    care_needs:           "",
  },
};

/* ─── Availability labels ─── */
const AVAIL_LABELS = {
  full_time: "Full Time",
  part_time: "Part Time",
  evenings:  "Evenings",
  weekends:  "Weekends",
};

/* hourly rate estimate — mirrors backend computed_field logic */
const HOURLY_MAP = {
  full_time: 50,
  part_time: 30,
  evenings:  15,
  weekends:  20,
};

function calcHourly(salary, availability) {
  if (!salary || !availability) return null;
  const weeklyHours = HOURLY_MAP[availability] || 50;
  return (salary / (weeklyHours * 4)).toFixed(2);
}

/* ─── LIVE PREVIEW ─── */
function updatePreview() {
  const d = State.draft;

  // Title
  const titleEl = $("previewTitle");
  if (d.title) {
    titleEl.textContent = d.title;
    titleEl.classList.remove("placeholder");
  } else {
    titleEl.textContent = "Your job title will appear here";
    titleEl.classList.add("placeholder");
  }

  // Location
  const locEl = $("previewLocation");
  if (d.location) {
    locEl.innerHTML = `<i class="fas fa-map-pin"></i> ${d.location}`;
    locEl.classList.remove("placeholder");
  } else {
    locEl.innerHTML = `<i class="fas fa-map-pin"></i> Location`;
    locEl.classList.add("placeholder");
  }

  // Availability
  const availEl = $("previewAvailability");
  if (d.availability) {
    availEl.innerHTML = `<i class="fas fa-clock"></i> ${AVAIL_LABELS[d.availability]}`;
    availEl.classList.remove("placeholder");
  } else {
    availEl.innerHTML = `<i class="fas fa-clock"></i> Availability`;
    availEl.classList.add("placeholder");
  }

  // Salary
  const salNum = $("previewSalary")?.querySelector(".salary-num");
  if (salNum) {
    if (d.salary) {
      salNum.textContent = `Ksh ${Number(d.salary).toLocaleString("en-KE")}`;
      salNum.classList.remove("placeholder");
    } else {
      salNum.textContent = "Ksh —";
      salNum.classList.add("placeholder");
    }
  }

  // Hourly estimate
  const hourly = calcHourly(d.salary, d.availability);
  safeText("previewHourly", hourly ? `~Ksh ${hourly}/hr est.` : "—/hr est.");

  // Duties
  const dutiesWrap = $("previewDutiesWrap");
  if (d.duties) {
    dutiesWrap.style.display = "block";
    safeText("previewDuties", d.duties);
  } else {
    dutiesWrap.style.display = "none";
  }

  // Care needs
  const careWrap = $("previewCareWrap");
  if (d.care_needs) {
    careWrap.style.display = "block";
    safeText("previewCare", d.care_needs);
  } else {
    careWrap.style.display = "none";
  }

  // Experience
  const exp = Number(d.required_experience) || 1;
  safeText("previewExp", `${exp} year${exp !== 1 ? "s" : ""} minimum`);

  // Family name
  safeText("previewFamilyName", State.familyName || "Your Family");
  const av = $("previewFamilyAvatar");
  if (av) av.textContent = initials(State.familyName || "F");

  updateCompleteness();
}

/* ─── COMPLETENESS ─── */
const CHECKS = [
  { key: "title",               label: "Job title",          test: d => !!d.title },
  { key: "location",            label: "Location",           test: d => !!d.location },
  { key: "availability",        label: "Availability type",  test: d => !!d.availability },
  { key: "salary",              label: "Monthly salary",     test: d => !!d.salary && Number(d.salary) > 0 },
  { key: "required_experience", label: "Experience level",   test: d => d.required_experience != null },
  { key: "duties",              label: "Primary duties",     test: d => !!d.duties },
  { key: "care_needs",          label: "Care needs (bonus)", test: d => !!d.care_needs },
];

function updateCompleteness() {
  const d = State.draft;
  const done  = CHECKS.filter(c => c.test(d)).length;
  const total = CHECKS.length;
  const pct   = Math.round((done / total) * 100);

  safeText("completenessPct", `${pct}%`);
  const fill = $("completenessFill");
  if (fill) fill.style.width = `${pct}%`;

  const list = $("completenessChecks");
  if (list) {
    list.innerHTML = CHECKS.map(c => {
      const ok = c.test(d);
      return `<li class="${ok ? "done" : ""}">
        <i class="fas ${ok ? "fa-circle-check" : "fa-circle"}"></i>
        ${c.label}
      </li>`;
    }).join("");
  }
}

/* ─── SALARY HINT ─── */
function updateSalaryHint(val) {
  const hint = $("salaryHint");
  if (!hint) return;
  if (!val || Number(val) <= 0) { hint.textContent = ""; hint.className = "pj-salary-hint"; return; }
  const avail = State.draft.availability;
  const hourly = calcHourly(val, avail);
  if (hourly) {
    hint.textContent = `≈ Ksh ${hourly}/hr · based on ${AVAIL_LABELS[avail] || "selected"} hours`;
    hint.className = "pj-salary-hint show";
  } else {
    hint.textContent = "Select availability to see hourly estimate";
    hint.className = "pj-salary-hint";
  }
}

/* ─── STEP NAVIGATION ─── */
function goToStep(n) {
  const old = State.currentStep;
  State.currentStep = n;

  // Step panels
  [1, 2, 3].forEach(i => {
    const panel = $(`stepPanel${i}`);
    if (panel) panel.classList.toggle("active", i === n);
  });

  // Step indicators
  document.querySelectorAll(".pj-step").forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.toggle("active", s === n);
    el.classList.toggle("done",   s < n);
  });

  // Step connector lines
  document.querySelectorAll(".pj-step-line").forEach((line, idx) => {
    line.classList.toggle("done", idx + 1 < n);
  });

  if (n === 3) buildReviewGrid();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ─── VALIDATION ─── */
function clearErrors() {
  document.querySelectorAll(".pj-error").forEach(el => el.textContent = "");
  document.querySelectorAll(".pj-input-wrap, .pj-textarea-wrap").forEach(el => el.classList.remove("error"));
}

function setError(id, msg) {
  const el = $(id);
  if (el) el.textContent = msg;
  // highlight the field wrap
  const fieldId = id.replace("err", "job").replace(/^err/, "job");
  const fieldEl = document.querySelector(`[id="${fieldId.charAt(0).toLowerCase() + fieldId.slice(1)}"]`);
  if (fieldEl) fieldEl.closest(".pj-input-wrap, .pj-textarea-wrap")?.classList.add("error");
}

function validateStep1() {
  clearErrors();
  let ok = true;

  if (!State.draft.title.trim()) {
    setError("errTitle", "Job title is required.");
    ok = false;
  } else if (State.draft.title.trim().length < 5) {
    setError("errTitle", "Title must be at least 5 characters.");
    ok = false;
  }

  if (!State.draft.location.trim()) {
    setError("errLocation", "Location is required.");
    ok = false;
  }

  if (!State.draft.availability) {
    setError("errAvailability", "Please select an availability type.");
    ok = false;
  }

  if (!State.draft.salary || Number(State.draft.salary) <= 0) {
    setError("errSalary", "Please enter a valid monthly salary.");
    ok = false;
  }

  return ok;
}

function validateStep2() {
  clearErrors();
  let ok = true;

  const exp = Number(State.draft.required_experience);
  if (isNaN(exp) || exp < 0) {
    setError("errExperience", "Experience must be 0 or more years.");
    ok = false;
  }

  if (!State.draft.duties.trim()) {
    setError("errDuties", "Please describe the primary duties.");
    ok = false;
  }

  return ok;
}

/* ─── REVIEW GRID ─── */
function buildReviewGrid() {
  const d = State.draft;
  const grid = $("reviewGrid");
  if (!grid) return;

  const exp = Number(d.required_experience);

  grid.innerHTML = `
    <div class="pj-review-item">
      <label><i class="fas fa-briefcase"></i> Job Title</label>
      <p>${d.title}</p>
    </div>
    <div class="pj-review-item">
      <label><i class="fas fa-map-pin"></i> Location</label>
      <p>${d.location}</p>
    </div>
    <div class="pj-review-item">
      <label><i class="fas fa-clock"></i> Availability</label>
      <p>${AVAIL_LABELS[d.availability] || d.availability}</p>
    </div>
    <div class="pj-review-item">
      <label><i class="fas fa-coins"></i> Monthly Salary</label>
      <p>Ksh ${Number(d.salary).toLocaleString("en-KE")}</p>
    </div>
    <div class="pj-review-item">
      <label><i class="fas fa-star"></i> Experience Required</label>
      <p>${exp} year${exp !== 1 ? "s" : ""}</p>
    </div>
    <div class="pj-review-item full">
      <label><i class="fas fa-list-check"></i> Primary Duties</label>
      <p>${d.duties}</p>
    </div>
    ${d.care_needs ? `
    <div class="pj-review-item full">
      <label><i class="fas fa-heart"></i> Care Needs</label>
      <p>${d.care_needs}</p>
    </div>` : ""}
  `;
}

/* ─── DRAFT LOCAL STORAGE ─── */
function saveDraft() {
  localStorage.setItem("pj_draft", JSON.stringify(State.draft));
  showToast("Draft saved.", "success");
}

function loadDraft() {
  try {
    const raw = localStorage.getItem("pj_draft");
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(State.draft, saved);
    restoreDraftToForm();
  } catch {}
}

function restoreDraftToForm() {
  const d = State.draft;
  const title = $("jobTitle");
  const loc   = $("jobLocation");
  const sal   = $("jobSalary");
  const exp   = $("jobExperience");
  const duties= $("jobDuties");
  const care  = $("jobCareNeeds");

  if (title) title.value = d.title;
  if (loc)   loc.value   = d.location;
  if (sal)   sal.value   = d.salary;
  if (exp)   exp.value   = d.required_experience;
  if (duties) duties.value = d.duties;
  if (care)   care.value  = d.care_needs;

  if (d.availability) {
    const radio = document.querySelector(`input[name="availability"][value="${d.availability}"]`);
    if (radio) radio.checked = true;
  }

  safeText("titleCount",  String(d.title.length));
  safeText("dutiesCount", String(d.duties.length));
  updateExpLabel(Number(d.required_experience));
  updatePreview();
}

function clearDraft() {
  localStorage.removeItem("pj_draft");
}

/* ─── EXPERIENCE COUNTER ─── */
function updateExpLabel(val) {
  safeText("expLabel", `${val} year${val !== 1 ? "s" : ""}`);
}

/* ─── SUBMIT ─── */
async function submitJob() {
  const btn = $("btnPost");
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Posting…`;

  try {
    // Build payload matching JobCreate schema exactly
    const payload = {
      title:               State.draft.title.trim(),
      location:            State.draft.location.trim(),
      availability:        State.draft.availability,
      salary:              Number(State.draft.salary),
      required_experience: Number(State.draft.required_experience),
      duties:              State.draft.duties.trim(),
      care_needs:          State.draft.care_needs?.trim() || null,
    };

    const res = await fetch(`${API_URL}/job/me`, {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to post job.");

    clearDraft();

    // Show success modal
    const modal = $("successModal");
    if (modal) modal.classList.add("open");

  } catch (err) {
    showToast(err.message || "Something went wrong. Please try again.", "error");
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-paper-plane"></i> Post Job Now`;
  }
}

/* ─── PROFILE FETCH ─── */
async function fetchFamilyProfile() {
  try {
    let userId = localStorage.getItem("user_id");
    if (!userId) {
      const token = localStorage.getItem("access_token");
      if (token) {
        try { userId = JSON.parse(atob(token.split(".")[1])).sub; } catch {}
      }
    }
    if (!userId) return null;
    const res = await fetch(`${API_URL}/Family/${userId}`, { headers: authHeaders() });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

/* ─── SIDEBAR ─── */
function setupSidebar() {
  const toggle  = $("menuToggle");
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  const open  = () => { sidebar?.classList.add("open"); overlay?.classList.add("active"); toggle?.querySelector("i")?.classList.replace("fa-bars","fa-times"); };
  const close = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("active"); toggle?.querySelector("i")?.classList.replace("fa-times","fa-bars"); };
  toggle?.addEventListener("click", e => { e.stopPropagation(); sidebar?.classList.contains("open") ? close() : open(); });
  overlay?.addEventListener("click", close);
}

/* ─── EVENT WIRING ─── */
function setupEvents() {
  // ── Step 1 fields ──
  $("jobTitle")?.addEventListener("input", e => {
    State.draft.title = e.target.value;
    safeText("titleCount", String(e.target.value.length));
    const cc = document.querySelector("#jobTitle").closest(".pj-field").querySelector(".pj-char-count");
    if (cc) cc.classList.toggle("warn", e.target.value.length > 100);
    updatePreview();
  });

  $("jobLocation")?.addEventListener("input", e => {
    State.draft.location = e.target.value;
    updatePreview();
  });

  document.querySelectorAll("input[name='availability']").forEach(radio => {
    radio.addEventListener("change", e => {
      State.draft.availability = e.target.value;
      updateSalaryHint(State.draft.salary);
      updatePreview();
    });
  });

  $("jobSalary")?.addEventListener("input", e => {
    State.draft.salary = e.target.value;
    updateSalaryHint(e.target.value);
    updatePreview();
  });

  // ── Step 2 fields ──
  $("jobExperience")?.addEventListener("input", e => {
    const v = Math.max(0, Math.min(20, Number(e.target.value) || 0));
    State.draft.required_experience = v;
    updateExpLabel(v);
    updatePreview();
  });

  $("expMinus")?.addEventListener("click", () => {
    const cur = Number($("jobExperience").value) || 0;
    const next = Math.max(0, cur - 1);
    $("jobExperience").value = next;
    State.draft.required_experience = next;
    updateExpLabel(next);
    updatePreview();
  });

  $("expPlus")?.addEventListener("click", () => {
    const cur = Number($("jobExperience").value) || 0;
    const next = Math.min(20, cur + 1);
    $("jobExperience").value = next;
    State.draft.required_experience = next;
    updateExpLabel(next);
    updatePreview();
  });

  $("jobDuties")?.addEventListener("input", e => {
    State.draft.duties = e.target.value;
    safeText("dutiesCount", String(e.target.value.length));
    updatePreview();
  });

  $("jobCareNeeds")?.addEventListener("input", e => {
    State.draft.care_needs = e.target.value;
    updatePreview();
  });

  // ── Step nav ──
  $("btnNext1")?.addEventListener("click", () => {
    if (validateStep1()) goToStep(2);
  });

  $("btnBack2")?.addEventListener("click", () => goToStep(1));

  $("btnNext2")?.addEventListener("click", () => {
    if (validateStep2()) goToStep(3);
  });

  $("btnBack3")?.addEventListener("click", () => goToStep(2));

  $("btnPost")?.addEventListener("click", submitJob);

  // ── Draft ──
  $("btnSaveDraft")?.addEventListener("click", saveDraft);

  // ── Success modal ──
  $("btnPostAnother")?.addEventListener("click", () => {
    $("successModal")?.classList.remove("open");
    // reset form
    State.draft = { title:"", location:"", availability:"", salary:"",
                    required_experience:1, duties:"", care_needs:"" };
    State.currentStep = 1;
    document.querySelectorAll("input[type=text], input[type=number], textarea").forEach(el => { el.value = ""; });
    document.querySelectorAll("input[type=radio]").forEach(r => r.checked = false);
    $("jobExperience").value = 1;
    updateExpLabel(1);
    goToStep(1);
    updatePreview();
  });

  // ── Auth guard ──
  const token = localStorage.getItem("access_token");
  if (!token) { window.location.href = "/frontend/src/views/login.html"; return; }
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = "/frontend/src/views/login.html";
    }
  } catch {}
}

/* ─── INIT ─── */
async function init() {
  setupSidebar();
  setupEvents();
  loadDraft();        // restore any saved draft
  updatePreview();    // initial empty state

  const family = await fetchFamilyProfile();
  if (family) {
    State.familyName = family.name || "";
    safeText("sidebarName", family.name || "Family");
    const av = $("sidebarAvatar");
    if (av) av.textContent = initials(family.name || "F");
    updatePreview();  // refresh with real family name
  }
}

document.addEventListener("DOMContentLoaded", init);