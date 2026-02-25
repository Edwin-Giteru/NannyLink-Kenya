import { createNannyProfile } from "../../src/service/nanny-creation-service.js";
import { CLOUDINARY_URL, UPLOAD_PRESET } from "../../src/utils/config.js";

const photoInput = document.getElementById('profile_photo');
if (photoInput) {
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('avatarPreview');
                if (preview) preview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

const showModal = (message, type = 'success') => {
    return new Promise((resolve) => {
        const modal = document.getElementById("customAlertModal");
        const msgEl = document.getElementById("alertMessage");
        const iconEl = document.getElementById("alertIcon");

        if (!modal || !msgEl) {
            console.warn("Modal elements missing from HTML. Using alert instead.");
            alert(message);
            resolve();
            return;
        }

        // Set content and styles
        msgEl.innerText = message;
        iconEl.innerText = type === 'success' ? '✅' : '❌';
        modal.className = `alert-toast show ${type}`;

        // Auto-hide after 2.5 seconds
        setTimeout(() => {
            modal.classList.remove("show");
            resolve(); // This allows the 'await' in your submit handler to finish
        }, 2500);
    });
};

const uploadToCloud = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error("Cloud upload failed");
        const data = await response.json();
        return data.secure_url; 
    } catch (error) {
        console.error("Cloudinary Error:", error);
        return ""; // Fallback to empty string if upload fails
    }
};

// ['photoDropZone', 'idDropZone'].forEach(zoneId => {
//     const zone = document.getElementById(zoneId);
//     if (zone) {
//         zone.addEventListener('click', () => {
//             zone.querySelector('input[type="file"]').click();
//         });
//     }
// });

document.getElementById('id_photo').addEventListener('change', function() {
    const fileName = this.files[0] ? this.files[0].name : "Upload a clear photo of your ID";
    const placeholder = document.getElementById('idPhotoName').querySelector('p');
    if (placeholder) placeholder.innerText = fileName;
});

document.getElementById('profile_photo').addEventListener('change', function() {
    const fileName = this.files[0] ? this.files[0].name : "Upload a clear photo of yourself";
    const placeholder = document.getElementById('photoPlaceholder').querySelector('p');
    if (placeholder) placeholder.innerText = fileName;
});
const profileForm = document.getElementById("nannyProfileForm");

if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("Authentication error: Please log in again.");
      window.location.href = "../auth/login.html";
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing Profile...";

    try {
        const photoFile = document.getElementById('profile_photo').files[0];
        const idFile = document.getElementById('id_photo').files[0];
        
        const [photoUrl, idPhotoUrl] = await Promise.all([
            uploadToCloud(photoFile),
            uploadToCloud(idFile)
        ]);

        const yearsExp = document.getElementById("years_experience").value;
        
        // 3. Build Payload
        const profileData = {
          name: document.getElementById("name").value.trim(),
          national_id_number: document.getElementById("national_id_number").value.trim(),
          national_id_photo_url: idPhotoUrl || "", 
          address: document.getElementById("address").value.trim(),
          years_experience: yearsExp ? parseInt(yearsExp, 10) : 0, 
          skills: document.getElementById("skills").value.trim(),
          preferred_location: document.getElementById("preferred_location").value.trim() || null,
          availability: document.getElementById("availability").value, 
          profile_photo_url: photoUrl || "" 
        };

        const result = await createNannyProfile(profileData, token);

        if (result.success) {
          console.log("Success! Showing modal and preparing redirect.");
          
          if (typeof showModal === "function") {
              await showModal("Profile created successfully!", "success");
          } else {
              alert("Profile created successfully!");
          }

          // Force redirect
          setTimeout(() => {
              window.location.assign("nannydashboard.html");
          }, 1500);

        } else {
          const errorMsg = result.message.includes("duplicate key") 
              ? "This ID Number is already registered." 
              : (result.message || "Submission failed.");
          
          if (typeof showModal === "function") {
              showModal(errorMsg, "error");
          } else {
              alert(errorMsg);
          }
        }
    } catch (err) {
        console.error("Critical Error:", err);
        alert("An error occurred: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
    }
  });
}