import { getAllJobs } from "../../src/service/nannyDashboardService.js";

document.addEventListener("DOMContentLoaded", async () => {
    const jobGrid = document.getElementById("jobGrid");
    const jobModal = document.getElementById("jobModal");
    const closeModal = document.querySelector(".close-btn");
    const jobSearchInput = document.getElementById("jobSearchInput"); // Fix 1: Select search input

    let allJobs = []; 

    async function init() {
        jobGrid.innerHTML = '<div class="loader">Fetching top picks...</div>';

        const result = await getAllJobs();

        if (result.success) {
            allJobs = result.data; 
            const totalJobsEl = document.getElementById("totalJobs");
            if (totalJobsEl) totalJobsEl.innerText = allJobs.length;

            if (allJobs.length > 0) {
                renderJobs(allJobs);
            } else {
                jobGrid.innerHTML = "<p class='no-jobs'>No jobs available right now.</p>";
            }
        } else {
            jobGrid.innerHTML = `<p class='error'>${result.message}</p>`;
            console.error("Backend Error:", result.message);
        }
    }

    if (jobSearchInput) {
        jobSearchInput.addEventListener("input", (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            const filteredJobs = allJobs.filter(job => {
                return (
                    job.title.toLowerCase().includes(searchTerm) ||
                    job.location.toLowerCase().includes(searchTerm) ||
                    (job.duties && job.duties.toLowerCase().includes(searchTerm))
                );
            });

            renderJobs(filteredJobs);
        });
    }

    function renderJobs(jobs) {
        jobGrid.innerHTML = ""; 
        
        if (jobs.length === 0) {
            jobGrid.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #777;">
                    <p style="font-size: 3rem;">🔍</p>
                    <p>No jobs match your search.</p>
                </div>`;
            return;
        }

        jobs.forEach(job => {
            const isHighPay = job.salary > 95000 ? 
            '<span class="tag-urgent">High Pay</span>' : '';
            const mediumPay = job.salary > 50000 && job.salary <= 95000 ?
            '<span class="tag-medium">Medium Pay</span>' : '';
            
            const card = document.createElement("div");
            card.className = "job-card";
            card.innerHTML = `
                <div class="job-info">
                    <h3>${job.title} ${isHighPay} ${mediumPay}</h3>
                    <div class="job-meta">📍 ${job.location} | Ksh ${job.salary}</div>
                    <div style="font-size: 0.8rem; color: #777;">
                        ${job.availability.replace('_', ' ')} • ${job.required_experience} years exp.
                    </div>
                </div>
                <div class="job-action">
                    <button class="row-apply-btn">Apply</button>
                </div>
            `;

            const btn = card.querySelector(".row-apply-btn");
            btn.onclick = (e) => {
                e.stopPropagation();
                openModal(job);
            };

            jobGrid.appendChild(card);
        });
    }

    // Modal Logic (Keeping your updated design)
    function openModal(job) {
        const modalBody = document.getElementById("modalBody");
        modalBody.innerHTML = `
            <div class="modal-header-accent" style="background: var(--primary-purple); color: white; margin: -30px -30px 20px -30px; padding: 30px; border-radius: 12px 12px 0 0;">
                <h2 style="margin:0;">${job.title}</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.8;">📍 ${job.location} • Ksh ${job.salary}</p>
            </div>
            <div class="modal-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="info-group">
                    <label style="color:#aaa; font-size: 0.75rem; text-transform: uppercase;">Hourly Rate</label>
                    <p style="font-weight: bold; margin: 5px 0;">Ksh ${job.hourly_rate}/hr</p>
                </div>
                <div class="info-group">
                    <label style="color:#aaa; font-size: 0.75rem; text-transform: uppercase;">Experience</label>
                    <p style="font-weight: bold; margin: 5px 0;">${job.required_experience} Years</p>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <h4 style="color: var(--primary-purple); border-bottom: 1px solid #eee; padding-bottom: 5px;">Care Needs</h4>
                <p>${job.care_needs}</p>
                <h4 style="color: var(--primary-purple); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 15px;">Key Duties</h4>
                <p style="line-height: 1.5;">${job.duties}</p>
            </div>
        `;
        jobModal.style.display = "block";

        const submitBtn = document.getElementById("applyButton");
        submitBtn.onclick = () => {
            alert(`Your application for "${job.title}" has been submitted successfully!`);
            jobModal.style.display = "none";
        };
    }

    if (closeModal) closeModal.onclick = () => jobModal.style.display = "none";
    window.onclick = (e) => { if (e.target == jobModal) jobModal.style.display = "none"; };

    init();
});