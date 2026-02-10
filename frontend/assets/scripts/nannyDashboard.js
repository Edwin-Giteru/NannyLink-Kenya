import { getAllJobs } from "../../src/service/nannyDashboardService.js";
document.addEventListener("DOMContentLoaded", async () => {
    const jobGrid = document.getElementById("jobGrid");
    const jobModal = document.getElementById("jobModal");
    const closeModal = document.querySelector(".close-btn");

    async function init() {
        const result = await getAllJobs();

        if (result.success) {
            if (result.data.length === 0) {
                jobGrid.innerHTML = "<p class='no-jobs'>No jobs available right now.</p>";
            } else {
                renderJobs(result.data);
            }
        } else {
            jobGrid.innerHTML = `<p class='error'>${result.message}</p>`;
        }
    }

    function renderJobs(jobs) {
        jobGrid.innerHTML = ""; 
        jobs.forEach(job => {
            const card = document.createElement("div");
            card.className = "job-card";
            card.innerHTML = `
                <h3>${job.title} Needed!</h3>
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Expected starting salary:</strong> Ksh ${job.salary} (${job.availability.replace('_', ' ')})</p>
                <small><strong>Requires ${job.required_experience} years experience.</strong></small>
            `;
            card.addEventListener("click", () => openModal(job));
            jobGrid.appendChild(card);
        });
    }

    function openModal(job) {
        const modalBody = document.getElementById("modalBody");
        modalBody.innerHTML = `
            <h2 style="color:#6a1b9a">${job.title}</h2>
            <div class="modal-info">
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Salary:</strong> Ksh ${job.salary}</p>
                <p><strong>Hourly Rate:</strong> Ksh ${job.hourly_rate}/hr</p>
                <hr>
                <p><strong>Care Needs:</strong> ${job.care_needs || "Not specified"}</p>
                <p><strong>Duties:</strong> ${job.duties}</p>
            </div>
        `;
        jobModal.style.display = "block";
        
        const applyBtn = document.getElementById("applyButton");
        if (applyBtn) {
            applyBtn.onclick = () => {
                alert(`Application sent for ${job.title}!`);
                jobModal.style.display = "none";
            };
        }
    }

    if (closeModal) {
        closeModal.onclick = () => jobModal.style.display = "none";
    }

    // Close modal if user clicks outside of it
    window.onclick = (event) => {
        if (event.target == jobModal) jobModal.style.display = "none";
    };

    init();
});