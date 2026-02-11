import * as ProfileService from "../../src/service/nannyProfileService.js";

document.addEventListener("DOMContentLoaded", async () => {
    const profileForm = document.getElementById("profileForm");
    const appList = document.getElementById("applicationsList");
    const deleteModal = document.getElementById("deleteModal");

    async function loadData() {
        const profileRes = await ProfileService.getNannyProfile();
        const appsRes = await ProfileService.getMyApplications();

        if (profileRes.success) {
            document.getElementById("profileName").value = profileRes.data.full_name;
            document.getElementById("profileLocation").value = profileRes.data.location;
            document.getElementById("profileExp").value = profileRes.data.experience;
        }

        if (appsRes.success) {
            renderApplications(appsRes.data);
        }
    }

    function renderApplications(apps) {
        if (apps.length === 0) {
            appList.innerHTML = "<p>No applications submitted yet.</p>";
            return;
        }

        appList.innerHTML = apps.map(app => `
            <div class="app-item">
                <div class="app-info">
                    <strong>${app.job_title}</strong>
                    <span>Applied on: ${new Date(app.created_at).toLocaleDateString()}</span>
                </div>
                <span class="status-pill status-${app.status.toLowerCase()}">${app.status}</span>
            </div>
        `).join('');
    }

    // Handle Update
    profileForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = profileForm.querySelector('button');
        btn.disabled = true;
        btn.innerText = "Saving...";

        const updateData = {
            full_name: document.getElementById("profileName").value,
            location: document.getElementById("profileLocation").value,
            experience: document.getElementById("profileExp").value
        };

        const res = await ProfileService.updateNannyProfile(updateData);
        alert(res.success ? "Profile updated!" : "Update failed");
        btn.disabled = false;
        btn.innerText = "Update Profile";
    };

    // Handle Delete Flow
    document.getElementById("deleteAccountBtn").onclick = () => deleteModal.style.display = "block";
    document.getElementById("cancelDelete").onclick = () => deleteModal.style.display = "none";
    document.getElementById("confirmDelete").onclick = async () => {
        const res = await ProfileService.deleteNannyAccount();
        if (res.success) {
            localStorage.clear();
            window.location.href = "/login.html";
        }
    };

    loadData();
});