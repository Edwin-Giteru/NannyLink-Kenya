import * as ProfileService from "../../src/service/nannyProfileService.js";

/**
 * Helper function to safely update text content of an element
 * prevents "undefined" from showing up in the UI
 */
function safeSetText(id, text, fallback = "Not provided") {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text || fallback;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const panes = document.querySelectorAll(".tab-pane");

    // 2. TAB LOGIC
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove("active"));
            panes.forEach(p => p.classList.remove("active"));
            
            btn.classList.add("active");
            const targetPane = document.getElementById(target);
            if (targetPane) targetPane.classList.add("active");
        };
    });

    // 3. LOAD PROFILE DATA
    async function loadProfile() {
        try {
            const res = await ProfileService.getNannyProfile();
            if (res.success) {
                const data = res.data;
                const name = data.name || "Nanny Member";

                // TEXT UPDATES - Using safeSetText defined above
                safeSetText("displayFullName", name);
                safeSetText("displayEmail", data.email, "No email linked");
                safeSetText("infoExperience", `${data.years_experience || 0} Years`);
                safeSetText("infoSkills", data.skills, "General Nanny Skills");
                safeSetText("infoAvailability", data.availability, "Standard Hours");
                safeSetText("infoAddress", data.address);
                safeSetText("infoPreferredLocation", data.preferred_location);
                
                // MASK NATIONAL ID
                if (data.national_id_number) {
                    const masked = `XXXX-XXXX-${data.national_id_number.slice(-4)}`;
                    safeSetText("infoIDNumber", masked);
                }

                // AVATAR STABILITY LOGIC
                const initialsEl = document.getElementById("profileInitials");
                const photoEl = document.getElementById("profilePhoto");

                if (initialsEl) initialsEl.innerText = name[0].toUpperCase();

                if (data.profile_photo_url && photoEl) {
                    photoEl.src = data.profile_photo_url;
                    photoEl.onload = () => {
                        photoEl.style.display = "block";
                    };
                }

                // VETTING STATUS BADGE
                const badge = document.getElementById("vettingBadge");
                if (badge) {
                    const status = data.vetting_status || "Pending";
                    badge.innerText = status;
                    badge.className = `status-pill status-${status.toLowerCase()}`;
                }

                // SECURITY TAB PREFILL
                const editNameInput = document.getElementById("editName");
                if (editNameInput) {
                    editNameInput.value = name;
                }
            }
        } catch (error) {
            console.error("Profile load failed:", error);
        }
    }

    // 4. LOAD APPLICATIONS (Card Layout)
    async function loadApplications() {
        const container = document.getElementById("applicationsList");
        if (!container) return;

        try {
            container.innerHTML = `<p class="loading-state">Loading your applications...</p>`;
            const res = await ProfileService.getMyApplications();

            if (res.success && res.data && res.data.length > 0) {
                container.innerHTML = res.data.map(app => {
                    const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
                    const formattedDate = new Date(app.created_at).toLocaleDateString('en-GB', dateOptions);

                    return `
                    <div class="job-card">
                        <div class="job-main-info">
                            <h3 class="job-title">${app.job_title || 'Nanny Position'}</h3>
                            <div class="job-sub-info">
                                <span class="company-name">Family Client</span>
                                <span class="job-location">Nairobi (Remote)</span>
                            </div>
                        </div>
                        
                        <div class="job-middle-info">
                            <div class="date-posted">${formattedDate}</div>
                            <div class="vacancies-count">No of vacancies: 1</div>
                        </div>

                        <div class="job-action">
                            <span class="status-pill status-${(app.status || 'pending').toLowerCase()}">
                                ${app.status || 'Pending'}
                            </span>
                        </div>
                    </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't applied for any jobs yet.</p>
                        <a href="nannydashboard.html" class="browse-btn">Browse Jobs</a>
                    </div>`;
            }
        } catch (error) {
            console.error("Error loading applications:", error);
            container.innerHTML = `<p class="error-state">Unable to load applications at this time.</p>`;
        }
    }

    // INITIALIZE
    loadProfile();
    loadApplications();
});