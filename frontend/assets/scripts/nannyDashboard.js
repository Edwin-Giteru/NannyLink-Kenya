import { getAllJobs, applyToJob, getNannyApplications } from "../../src/service/nannyDashboardService.js";

const State = {
    allJobs: [],
    filteredJobs: [],
    appliedJobIds: new Set(), 
    currentFilters: {
        keyword: "",
        location: "",
        category: "" 
    },
    categories: [
        { id: "full_time", label: "Full-Time Nanny", selector: '[data-category="full_time"]' },
        { id: "part_time", label: "Part-Time", selector: '[data-category="part_time"]' },
        { id: "weekends", label: "Live-In", selector: '[data-category="weekends"]' }, 
        { id: "evenings", label: "Tutor / Governess", selector: '[data-category="evenings"]' }
    ]
};

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
            
            // Sync Applications
            let applications = [];
            if (appsResponse && appsResponse.data) {
                applications = Array.isArray(appsResponse.data) 
                    ? appsResponse.data 
                    : (appsResponse.data.applications || []);
            }
            applications.forEach(app => {
                if (app && app.job_id) State.appliedJobIds.add(app.job_id.toString());
            });
            
            syncLocalStorage();
            populateLocationDropdown();
            computeCategoryCounts();
            applyFilters(); 
        }
    } catch (error) {
        console.error("Init Error:", error);
    } finally {
        renderLoadingState(false);
    }
}

function applyFilters() {
    const { keyword, location, category } = State.currentFilters;
    State.filteredJobs = State.allJobs.filter(job => {
        const matchesKeyword = !keyword || 
            (job.title?.toLowerCase().includes(keyword.toLowerCase())) || 
            (job.description?.toLowerCase().includes(keyword.toLowerCase()));
        const matchesLocation = !location || job.location === location;
        const matchesCategory = !category || job.category === category;
        return matchesKeyword && matchesLocation && matchesCategory;
    });
    renderJobList();
}

function renderJobList() {
    const container = document.getElementById("jobList"); 
    if (!container) return;

    if (State.filteredJobs.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px;">No jobs found match your search.</p>`;
        return;
    }

    container.innerHTML = State.filteredJobs.map(job => {
        const isApplied = State.appliedJobIds.has(job.id.toString());
        const pay = job.hourly_pay || job.hourlyPay || 0;

        return `
        <div class="job-item">
            <div class="job-info">
                <h4>${job.title}</h4>
                <div class="job-tags">
                    <span>📍 ${job.location || 'Juja'}</span>
                    <span>🏷️ Nanny</span>
                    <span>💰 Ksh ${pay}/hr</span>
                </div>
            </div>
            <div class="job-action">
                <button class="btn-secondary" onclick="window.openJobModal('${job.id}')">View</button>
                <button class="btn-search apply-btn" 
                        id="apply-btn-${job.id}" 
                        onclick="window.handleApply('${job.id}')" 
                        ${isApplied ? 'disabled style="background: #cbd5e1;"' : ''}>
                    ${isApplied ? 'Applied' : 'Apply'}
                </button>
            </div>
        </div>`;
    }).join('');
}

// GLOBAL MODAL LOGIC
window.openJobModal = (jobId) => {
    const job = State.allJobs.find(j => j.id.toString() === jobId.toString());
    if (!job) return;

    const modal = document.getElementById('jobModal');
    const body = document.getElementById('modalBody');
    const isApplied = State.appliedJobIds.has(job.id.toString());
    const pay = job.hourly_pay || job.hourlyPay || "N/A";

    body.innerHTML = `
        <div style="padding: 10px;">
            <h2 style="color: var(--navy); margin-bottom: 5px;">${job.title}</h2>
            <p style="color: var(--primary); font-weight: bold; margin-bottom: 20px;">
                Ksh ${pay}/hr | ${job.location || 'Juja'}
            </p>
            <h5 style="margin-bottom: 10px; color: var(--navy);">Description</h5>
            <p style="color: var(--grey-text); line-height: 1.6; margin-bottom: 25px;">
                ${job.description || "No detailed description provided."}
            </p>
            <button class="btn-search" 
                id="modal-apply-${job.id}"
                ${isApplied ? 'disabled style="background: #cbd5e1;"' : ''}
                onclick="window.handleApply('${job.id}');">
                ${isApplied ? 'Application Submitted' : 'Submit Application Now'}
            </button>
        </div>`;
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
};

window.closeModalFunc = () => {
    const modal = document.getElementById('jobModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
};

window.handleApply = async (jobId) => {
    const mainBtn = document.getElementById(`apply-btn-${jobId}`);
    const modalBtn = document.getElementById(`modal-apply-${jobId}`);
    
    const updateBtn = (text, disabled) => {
        if (mainBtn) { mainBtn.innerText = text; mainBtn.disabled = disabled; }
        if (modalBtn) { modalBtn.innerText = text; modalBtn.disabled = disabled; }
    };

    updateBtn("Applying...", true);

    try {
        const result = await applyToJob(jobId);
        if (result.success) {
            State.appliedJobIds.add(jobId.toString());
            updateBtn("Applied", true);
            if (mainBtn) mainBtn.style.background = "#cbd5e1";
            saveToLocalStorage(jobId);
            
            // Optional: Close modal after short delay on success
            setTimeout(window.closeModalFunc, 1500);
        } else {
            alert("Application failed. Please try again.");
            updateBtn("Apply", false);
        }
    } catch (err) {
        updateBtn("Apply", false);
    }
};

// UI UTILITIES
function setupUIListeners() {
    document.getElementById("findJobBtn")?.addEventListener("click", () => {
        State.currentFilters.keyword = document.getElementById("keywordSearch")?.value || "";
        State.currentFilters.location = document.getElementById("locationDropdown")?.value || "";
        applyFilters();
    });

    document.getElementById('closeModal')?.addEventListener('click', window.closeModalFunc);

    State.categories.forEach(cat => {
        const card = document.querySelector(cat.selector);
        card?.addEventListener("click", () => {
            document.querySelectorAll(".category-card").forEach(c => c.classList.remove("active"));
            if (State.currentFilters.category === cat.id) {
                State.currentFilters.category = ""; 
            } else {
                State.currentFilters.category = cat.id;
                card.classList.add("active");
            }
            applyFilters();
        });
    });
}

function computeCategoryCounts() {
    State.categories.forEach(cat => {
        const count = State.allJobs.filter(j => j.category === cat.id).length;
        const card = document.querySelector(cat.selector);
        if (card) {
            const countEl = card.querySelector('.cat-count') || card; 
            if (countEl.classList.contains('cat-count')) countEl.innerText = `(${count}) Jobs`;
        }
    });
}

function populateLocationDropdown() {
    const dropdown = document.getElementById("locationDropdown");
    if (!dropdown) return;
    const locations = [...new Set(State.allJobs.map(j => j.location).filter(Boolean))];
    dropdown.innerHTML = `<option value="">All Locations</option>` + 
        locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
}

function saveToLocalStorage(jobId) {
    const saved = JSON.parse(localStorage.getItem("applied_jobs") || "[]");
    if (!saved.includes(jobId.toString())) {
        saved.push(jobId.toString());
        localStorage.setItem("applied_jobs", JSON.stringify(saved));
    }
}

function syncLocalStorage() {
    const saved = JSON.parse(localStorage.getItem("applied_jobs") || "[]");
    saved.forEach(id => State.appliedJobIds.add(id.toString()));
}

function renderLoadingState(isLoading) {
    const feed = document.getElementById("jobList");
    if (!feed) return;
    feed.innerHTML = isLoading ? `<div class="skeleton"></div>`.repeat(3) : "";
}