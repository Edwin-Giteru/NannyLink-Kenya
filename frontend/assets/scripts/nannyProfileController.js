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

                const cleanName = (data.name || "Nanny Member").trim();
                const letter = cleanName.charAt(0).toUpperCase();

                if (initialsEl) {
                    initialsEl.innerText = letter;
                    initialsEl.style.display = "flex"; 
                }

                if (photoEl) {
                    photoEl.style.display = "none";
                }

                if (data.profile_photo_url && data.profile_photo_url.trim() !== "" && data.profile_photo_url !== "null") {
                    if (photoEl) {
                        photoEl.src = data.profile_photo_url;
                        photoEl.style.display = "block";
                    }
                    if (initialsEl) initialsEl.style.display = "none";
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
            // Create the table skeleton
            let tableHTML = `
                <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="text-align: left; background-color: #f8f9fa; border-bottom: 2px solid #eee;">
                            <th style="padding: 15px; color: #555; font-weight: 600;">Position</th>
                            <th style="padding: 15px; color: #555; font-weight: 600; text-align: center;">Applied Date</th>
                            <th style="padding: 15px; color: #555; font-weight: 600; text-align: right;">Current Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Map rows
            const rows = appsArray.map(app => {
                const appDate = app.created_at 
                    ? new Date(app.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) 
                    : "Date unknown";

                const status = (app.status || 'Applied').toLowerCase();

                return `
                    <tr style="border-bottom: 1px solid #f0f0f0; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#fafafa'" onmouseout="this.style.backgroundColor='transparent'">
                        <td style="padding: 15px;">
                            <div style="font-weight: 600; color: #333;">${app.job_post?.title || "Nanny Position"}</div>
                            <div style="font-size: 0.85rem; color: #777;">📍 ${app.job_post?.location || "Nairobi"}</div>
                        </td>
                        <td style="padding: 15px; text-align: center; color: #666; font-size: 0.9rem;">
                            ${appDate}
                        </td>
                        <td style="padding: 15px; text-align: right;">
                            <span class="status-pill status-${status}" style="color: orange;display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize;">
                                ${status}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');

            tableHTML += rows + `</tbody></table>`;
            container.innerHTML = tableHTML;
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <p style="font-size: 2rem;">📄</p>
                    <p>No application history found.</p>
                </div>`;
        }
    } catch (error) {
        console.error("Load applications error:", error);
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