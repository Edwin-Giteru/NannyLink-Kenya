import { getAllJobs, applyToJob, getNannyApplications } from "../../src/service/nannyDashboardService.js";

/**
 * NANNYLINK DASHBOARD CORE LOGIC
 * Implements: Dynamic Filtering, Persistent Applications, and Modal UI
 */

// --- Global State ---
const State = {
    allJobs: [],
    filteredJobs: [],
    appliedJobIds: new Set(), // Persistent set of IDs
    currentFilters: {
        keyword: "",
        location: "",
        category: "" // "full_time", "part_time", "weekends", "evenings"
    },
    categories: [
        { id: "full_time", label: "Full-Time Nanny", selector: '[data-category="Full-Time"]' },
        { id: "part_time", label: "Part-Time", selector: '[data-category="Part-Time"]' },
        { id: "weekends", label: "Live-In", selector: '[data-category="Live-In"]' }, // Mapping provided UI to real keys
        { id: "evenings", label: "Tutor / Governess", selector: '[data-category="Tutor"]' }
    ]
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
    setupUIListeners();
    await initializeData();
});
async function initializeData() {
    renderLoadingState(true);
    
    try {
        const jobsResponse = await getAllJobs();
        const appsResponse = await getNannyApplications();

        if (jobsResponse.success) {
            State.allJobs = jobsResponse.data;
            
            // 1. Robust data extraction
            // We check both the response object and common wrapping patterns
            let applications = [];
            if (appsResponse && appsResponse.data) {
                if (Array.isArray(appsResponse.data)) {
                    applications = appsResponse.data;
                } else if (Array.isArray(appsResponse.data.applications)) {
                    applications = appsResponse.data.applications;
                }
            }

            // 2. Safely add job IDs
            applications.forEach(app => {
                if (app && app.job_id) {
                    State.appliedJobIds.add(app.job_id);
                }
            });
            
            syncLocalStorage();
            populateLocationDropdown();
            computeCategoryCounts();
            applyFilters(); 
        } else {
            showToast("Error", "Failed to load jobs.", "error");
        }
    } catch (error) {
        console.error("Initialization failed:", error);
        showToast("Error", "A critical error occurred while loading data.", "error");
    } finally {
        // Ensure loading state is turned off even if an error occurs
        renderLoadingState(false);
    }
}


function applyFilters() {
    const { keyword, location, category } = State.currentFilters;

    State.filteredJobs = State.allJobs.filter(job => {
        const matchesKeyword = !keyword || 
            job.title.toLowerCase().includes(keyword.toLowerCase()) || 
            (job.description && job.description.toLowerCase().includes(keyword.toLowerCase()));
        
        const matchesLocation = !location || job.location === location;
        const matchesCategory = !category || job.category === category;

        return matchesKeyword && matchesLocation && matchesCategory;
    });

    renderJobList();
}

// --- UI Rendering ---
function renderJobList() {
    const container = document.getElementById("jobFeed");
    const countLabel = document.getElementById("resultsCount") || document.getElementById("statusHeading");
    
    if (countLabel) countLabel.innerText = `${State.filteredJobs.length} Jobs Found`;

    if (State.filteredJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No jobs found matching your criteria. Try resetting filters.</p>
                <button class="btn-primary-action" onclick="resetFilters()">Reset All</button>
            </div>`;
        return;
    }

    container.innerHTML = State.filteredJobs.map(job => {
        const isApplied = State.appliedJobIds.has(job.id);
        return `
        <div class="job-item-card animate-in">
            <div class="job-main-info">
                <span class="category-badge">${job.category.replace('_', ' ')}</span>
                <h4>${job.title}</h4>
                <div class="job-meta">
                    <span>📍 ${job.location}</span>
                    <span>💰 Ksh ${job.hourlyPay}/hr</span>
                </div>
            </div>
            <div class="job-action">
                <button class="btn-secondary" onclick="openJobModal(${job.id})">View Details</button>
                <button class="btn-primary-action apply-btn" 
                        id="apply-btn-${job.id}"
                        ${isApplied ? 'disabled' : ''} 
                        onclick="handleApply(${job.id})">
                    ${isApplied ? 'Applied' : 'Apply Now'}
                </button>
            </div>
        </div>
    `}).join('');
}

function computeCategoryCounts() {
    State.categories.forEach(cat => {
        const count = State.allJobs.filter(j => j.category === cat.id).length;
        const card = document.querySelector(cat.selector);
        if (card) {
            const countEl = card.querySelector('.cat-count') || card.querySelector('span:last-child');
            if (countEl) countEl.innerText = `(${count}) Jobs`;
        }
    });
}

function populateLocationDropdown() {
    const dropdown = document.getElementById("locationFilter") || document.getElementById("locationDropdown");
    if (!dropdown) return;

    const locations = [...new Set(State.allJobs.map(j => j.location))];
    dropdown.innerHTML = `<option value="">All Locations</option>` + 
        locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
}

// --- Interaction Handlers ---
async function handleApply(jobId) {
    const btn = document.getElementById(`apply-btn-${jobId}`);
    btn.innerText = "Processing...";
    btn.disabled = true;

    const result = await applyToJob(jobId);

    if (result.success) {
        State.appliedJobIds.add(jobId);
        btn.innerText = "Applied";
        btn.classList.add("btn-applied");
        saveToLocalStorage(jobId);
        showToast("Success", "Application submitted successfully!", "success");
    } else {
        btn.innerText = "Apply Now";
        btn.disabled = false;
        showToast("Error", result.message, "error");
    }
}

function setupUIListeners() {
    // Search Button
    const searchBtn = document.getElementById("findJobBtn");
    searchBtn?.addEventListener("click", () => {
        State.currentFilters.keyword = document.getElementById("keywordSearch")?.value || "";
        State.currentFilters.location = document.getElementById("locationFilter")?.value || "";
        applyFilters();
        document.getElementById("resultsSection")?.scrollIntoView({ behavior: 'smooth' });
    });

    // Sidebar Toggle
    const sidebar = document.getElementById("sidebar");
    document.getElementById("sidebarToggle")?.addEventListener("click", () => {
        const expanded = sidebar.getAttribute("aria-expanded") === "true";
        sidebar.setAttribute("aria-expanded", !expanded);
    });

    // Category Card Clicks
    State.categories.forEach(cat => {
        const card = document.querySelector(cat.selector);
        card?.addEventListener("click", () => {
            if (State.currentFilters.category === cat.id) {
                State.currentFilters.category = ""; // Toggle off
                card.classList.remove("active");
            } else {
                document.querySelectorAll(".category-card").forEach(c => c.classList.remove("active"));
                State.currentFilters.category = cat.id;
                card.classList.add("active");
            }
            applyFilters();
        });
    });
}

// --- Modal Functionality ---
window.openJobModal = (jobId) => {
    const job = State.allJobs.find(j => j.id === jobId);
    if (!job) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'active-modal';
    
    modal.innerHTML = `
        <div class="modal-card">
            <button class="close-modal" onclick="closeModal()">&times;</button>
            <div class="modal-header">
                <h2>${job.title}</h2>
                <span class="badge">${job.category.replace('_', ' ')}</span>
            </div>
            <div class="modal-body">
                <div class="modal-meta-grid">
                    <div><strong>📍 Location:</strong> ${job.location}</div>
                    <div><strong>💰 Pay:</strong> Ksh ${job.hourlyPay}/hr</div>
                </div>
                <section>
                    <h5>Description</h5>
                    <p>${job.description}</p>
                </section>
                <section>
                    <h5>Key Duties</h5>
                    <ul>${job.duties.map(d => `<li>${d}</li>`).join('')}</ul>
                </section>
                <section>
                    <h5>Requirements</h5>
                    <p>${job.requirements}</p>
                </section>
            </div>
            <div class="modal-footer">
                <button class="btn-primary-action" 
                        ${State.appliedJobIds.has(job.id) ? 'disabled' : ''} 
                        onclick="handleApply(${job.id}); closeModal();">
                    ${State.appliedJobIds.has(job.id) ? 'Already Applied' : 'Submit Application'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.onclick = (e) => { if(e.target === modal) closeModal(); };
};

window.closeModal = () => {
    const m = document.getElementById('active-modal');
    if (m) m.remove();
};

// --- Utilities & Persistence ---
function saveToLocalStorage(jobId) {
    const saved = JSON.parse(localStorage.getItem("applied_jobs") || "[]");
    if (!saved.includes(jobId)) {
        saved.push(jobId);
        localStorage.setItem("applied_jobs", JSON.stringify(saved));
    }
}

function syncLocalStorage() {
    const saved = JSON.parse(localStorage.getItem("applied_jobs") || "[]");
    saved.forEach(id => State.appliedJobIds.add(id));
}

function renderLoadingState(isLoading) {
    const feed = document.getElementById("jobFeed");
    if (isLoading) {
        feed.innerHTML = Array(3).fill('<div class="skeleton"></div>').join('');
    }
}

function showToast(title, msg, type) {
    const toast = document.getElementById("customAlertModal");
    if (!toast) return;
    document.getElementById("alertMessage").innerText = msg;
    toast.classList.add("show", type);
    setTimeout(() => toast.classList.remove("show"), 3000);
}