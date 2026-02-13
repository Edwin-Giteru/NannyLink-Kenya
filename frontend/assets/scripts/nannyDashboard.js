import { getAllJobs, applyToJob } from "../../src/service/nannyDashboardService.js";

document.addEventListener("DOMContentLoaded", async () => {
    const jobGrid = document.getElementById("jobGrid");
    const jobModal = document.getElementById("jobModal");
    const closeModal = document.querySelector(".close-btn");
    const jobSearchInput = document.getElementById("jobSearchInput");

    let allJobs = []; 

    async function init() {
        jobGrid.innerHTML = '<div class="loader">Fetching top picks...</div>';

        const result = await getAllJobs();

        if (result.success) {
            // We map the data to ensure every job has an 'applied' property
            allJobs = result.data.map(job => ({ ...job, applied: job.applied || false })); 
            
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
            const isHighPay = job.salary > 95000 ? '<span class="tag-urgent">High Pay</span>' : '';
            const mediumPay = job.salary > 50000 && job.salary <= 95000 ? '<span class="tag-medium">Medium Pay</span>' : '';
            
            // Check if job is already applied to set button state
            const isApplied = job.applied === true;

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
                    <button class="row-apply-btn" 
                            id="btn-${job.id}" 
                            ${isApplied ? 'disabled style="background: #ccc; cursor: not-allowed;"' : ''}>
                        ${isApplied ? 'Applied' : 'View & Apply'}
                    </button>
                </div>
            `;

            const btn = card.querySelector(".row-apply-btn");
            
            // Only attach click if not applied
            if (!isApplied) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    openModal(job);
                };
            }

            jobGrid.appendChild(card);
        });
    }

    function openModal(job) {
        const modalBody = document.getElementById("modalBody");
        const submitBtn = document.getElementById("applyButton");
        
        submitBtn.innerText = "Submit Application";
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = ""; 

        modalBody.innerHTML = `
            <div class="modal-header-accent" style="background: #6d4830; color: white; margin: -30px -30px 20px -30px; padding: 30px; border-radius: 12px 12px 0 0;">
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

        submitBtn.onclick = async () => {
            submitBtn.innerText = "Processing...";
            submitBtn.disabled = true;

            const response = await applyToJob(job.id);

            if (response.success) {
                // 1. Update the local data source so searches/re-renders stay correct
                const jobIndex = allJobs.findIndex(j => j.id === job.id);
                if (jobIndex !== -1) allJobs[jobIndex].applied = true;

                // 2. Disable the button on the dashboard listing immediately
                const listingBtn = document.getElementById(`btn-${job.id}`);
                if (listingBtn) {
                    listingBtn.innerText = "Applied";
                    listingBtn.disabled = true;
                    listingBtn.style.background = "#ccc";
                    listingBtn.style.cursor = "not-allowed";
                    listingBtn.onclick = null; // Remove click event
                }

                // 3. Update Modal Button
                submitBtn.innerText = "Applied";
                submitBtn.style.backgroundColor = "#28a745";
                
                alert(`Your application for "${job.title}" has been submitted successfully!`);
                setTimeout(() => { jobModal.style.display = "none"; }, 1500);
            } else {
                alert(`Error: ${response.message}`);
                submitBtn.innerText = "Submit Application";
                submitBtn.disabled = false;
            }
        };
    }

    if (closeModal) closeModal.onclick = () => jobModal.style.display = "none";
    window.onclick = (e) => { if (e.target == jobModal) jobModal.style.display = "none"; };

    init();
});