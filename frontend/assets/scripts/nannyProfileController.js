import * as ProfileService from "../../src/service/nannyProfileService.js";

// --- FALLING NOTIFICATION HELPER ---
const showToast = (message, type = "info") => {
    const modal = document.getElementById("customAlertModal");
    const msgEl = document.getElementById("alertMessage");
    const iconEl = document.getElementById("alertIcon");

    msgEl.innerText = message;
    iconEl.innerText = type === "success" ? "✅" : "⚠️";
    modal.classList.add("show");

    return new Promise((resolve) => {
        setTimeout(() => {
            modal.classList.remove("show");
            setTimeout(() => resolve(), 500);
        }, 2500);
    });
};

function safeSetText(id, text, fallback = "Not provided") {
    const el = document.getElementById(id);
    if (el) el.innerText = text || fallback;
}

document.addEventListener("DOMContentLoaded", () => {                
    
    // --- TAB LOGIC ---
    const tabBtns = document.querySelectorAll(".tab-btn");
    const panes = document.querySelectorAll(".tab-pane");

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
    
   // --- LOAD PROFILE ---
    async function loadProfile() {
        try {
            const res = await ProfileService.getNannyProfile();
            if (res.success) {
                const data = res.data;
                const name = data.name || "Nanny Member";

                safeSetText("displayFullName", name);
                safeSetText("infoExperience", `${data.years_experience || 0} Years`);
                safeSetText("infoSkills", data.skills, "General Nanny Skills");
                safeSetText("infoAvailability", data.availability, "Standard Hours");
                safeSetText("infoAddress", data.address);
                safeSetText("infoPreferredLocation", data.preferred_location);
                
                if (data.national_id_number) {
                    const masked = `** ** ${data.national_id_number.slice(-4)}`;
                    safeSetText("infoIDNumber", masked);
                }

                const initialsEl = document.getElementById("profileInitials");
                const photoEl = document.getElementById("profilePhoto");
                
                const cleanName = name.trim();
                if (initialsEl) {
                    initialsEl.innerText = cleanName.charAt(0).toUpperCase();
                }

                const hasValidPhoto = data.profile_photo_url && 
                                      data.profile_photo_url.trim() !== "" && 
                                      data.profile_photo_url !== "null";

                if (hasValidPhoto && photoEl) {
                    photoEl.src = data.profile_photo_url;
                    photoEl.style.display = "block";
                    if (initialsEl) initialsEl.style.display = "none";
                } else {
                    if (photoEl) photoEl.style.display = "none";
                    if (initialsEl) {
                        initialsEl.style.display = "flex"; // Force flex to ensure centering
                    }
                }

                const badge = document.getElementById("vettingBadge");
                if (badge) {
                    const status = data.vetting_status || "Pending";
                    badge.innerText = status;
                    badge.className = `status-pill status-${status.toLowerCase()}`;
                }

                if (document.getElementById("editName")) document.getElementById("editName").value = name;
                if (document.getElementById("editExperience")) document.getElementById("editExperience").value = data.years_experience ?? 0;
                if (document.getElementById("editAddress")) document.getElementById("editAddress").value = data.address || "";
                if (document.getElementById("editPreferredLocation")) document.getElementById("editPreferredLocation").value = data.preferred_location || "";
                if (document.getElementById("editSkills")) document.getElementById("editSkills").value = data.skills || "";
                if (document.getElementById("editAvailability")) document.getElementById("editAvailability").value = data.availability || "";
                if (document.getElementById("editPhotoUrl")) document.getElementById("editPhotoUrl").value = data.profile_photo_url || "";
            }
        } catch (error) {
            console.error("Profile load failed:", error);
            showToast("Failed to load profile data", "error");
        }
    }
    async function loadApplications() {
        const container = document.getElementById("applicationsList");
        if (!container) return;
        try {
            container.innerHTML = `<p class="loading-state">Loading your applications...</p>`;
            const res = await ProfileService.getMyApplications();
            const appsArray = Array.isArray(res.data) ? res.data : (res.data?.applications || []);

            if (res.success && appsArray.length > 0) {
                container.innerHTML = appsArray.map(app => {
                    const appDate = app.created_at 
                        ? new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                        : "Date unknown";

                    return `
                    <div class="job-card" style="margin-bottom: 15px; border: 1px solid #eee; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div class="job-main-info" style="flex: 1;">
                            <h3 class="job-title" style="margin:0;">${app.job_post?.title || "Nanny Position"}</h3>
                            <div class="job-sub-info"><span class="job-location" style="color:#777; font-size:0.85rem;">📍 ${app.job_post?.location || "Nairobi"}</span></div>
                        </div>
                        
                        <div class="job-date" style="flex: 1; text-align: center; color: #666; font-size: 0.9rem;">
                            <span style="display:block; font-size: 0.7rem; text-transform: uppercase; color: #aaa;">Applied On</span>
                            <strong>${appDate}</strong>
                        </div>

                        <div class="job-action" style="flex: 1; text-align: right;">
                            <span class="status-pill status-${(app.status || 'pending').toLowerCase()}">${app.status || 'Applied'}</span>
                        </div>
                    </div>`;
                }).join('');
            } else {
                container.innerHTML = `<p>No applications found.</p>`;
            }
        } catch (error) {
            container.innerHTML = `<p class="error-state">Unable to load applications.</p>`;
        }
    }

    // --- HANDLE UPDATE ---
    const updateForm = document.getElementById("editProfileForm");
    if (updateForm) {
        updateForm.onsubmit = async (e) => {
            e.preventDefault();
            const saveBtn = updateForm.querySelector(".save-btn");
            saveBtn.innerText = "Saving...";
            saveBtn.disabled = true;

            const clean = (val) => (val === "" || val === undefined) ? null : val;

            const updateData = {
                name: clean(document.getElementById("editName")?.value),
                years_experience: parseInt(document.getElementById("editExperience")?.value) || 0,
                address: clean(document.getElementById("editAddress")?.value),
                preferred_location: clean(document.getElementById("editPreferredLocation")?.value),
                skills: clean(document.getElementById("editSkills")?.value),
                availability: clean(document.getElementById("editAvailability")?.value),
                profile_photo_url: clean(document.getElementById("editPhotoUrl")?.value)
            };

            try {
                const res = await ProfileService.updateNannyProfile(updateData);
                if (res.success) {
                    await showToast("Profile updated successfully!", "success");
                    await loadProfile(); 
                    document.querySelector('[data-tab="profile"]').click(); 
                } else {
                    showToast("Update failed.", "error");
                }
            } catch (err) {
                showToast("Network error during update", "error");
            } finally {
                saveBtn.innerText = "Save Changes";
                saveBtn.disabled = false;
            }
        };
    }

    // --- DELETE MODAL ---
    const deleteModal = document.getElementById("deleteModal");
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");
    const cancelDelete = document.getElementById("cancelDelete");
    const confirmDelete = document.getElementById("confirmDelete");

    if (deleteAccountBtn) {
        deleteAccountBtn.onclick = (e) => { e.preventDefault(); deleteModal.style.display = "flex"; };
    }
    if (cancelDelete) {
        cancelDelete.onclick = () => { deleteModal.style.display = "none"; };
    }
    if (confirmDelete) {
        confirmDelete.onclick = async () => {
            const { userId } = ProfileService.getAuthData();
            try {
                const res = await ProfileService.deleteNannyAccount(userId);
                if (res.success) { 
                    deleteModal.style.display = "none";
                    await showToast("Account deleted.", "success");
                    localStorage.clear(); 
                    window.location.href = "login.html"; 
                } else {
                    showToast("Delete failed", "error");
                }
            } catch (error) { 
                showToast("Error deleting account", "error");
            }
            deleteModal.style.display = "none";
        };
    }

    loadProfile();
    loadApplications();
});