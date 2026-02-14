import { createNannyProfile } from "../../src/service/nanny-creation-service.js";

const showModal = (message, type = "info") => {
    const modal = document.getElementById("customAlertModal");
    const msgEl = document.getElementById("alertMessage");
    const iconEl = document.getElementById("alertIcon");

    msgEl.innerText = message;
    iconEl.innerText = type === "success" ? "✅" : "⚠️";
    
    modal.classList.add("show");

    return new Promise((resolve) => {
        setTimeout(() => {
            modal.classList.remove("show");
            setTimeout(() => {
                resolve();
            }, 200); 
        }, ); 
    });
};

console.log("Nanny Profile Controller is ALIVE!");
const profileForm = document.getElementById("nannyProfileForm");

if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Check for token first
    const token = localStorage.getItem("access_token");
    if (!token) {
      await showModal("Authentication error: Please log in again.", "error");
      window.location.href = "../auth/login.html";
      return;
    }

    const yearsExp = document.getElementById("years_experience").value;
    
    const profileData = {
      name: document.getElementById("name").value.trim(),
      national_id_number: document.getElementById("national_id_number").value.trim(),
      national_id_photo_url: document.getElementById("national_id_photo_url").value.trim(),
      address: document.getElementById("address").value.trim(),
      years_experience: yearsExp ? parseInt(yearsExp, 10) : 0, 
      skills: document.getElementById("skills").value.trim(),
      preferred_location: document.getElementById("preferred_location").value.trim() || null,
      availability: document.getElementById("availability").value, 
      profile_photo_url: document.getElementById("profile_photo_url").value.trim() || null
    };

    const result = await createNannyProfile(profileData, token);

    if (result.success) {
      // Wait for the message to fall and hide before redirecting
      await showModal("Profile created successfully!", "success");
      window.location.href = "nannydashboard.html";
    } else {
      showModal("Submission Error: " + (result.message || "Please check all fields."), "error");
    }
  });
}