import { getAllJobs, applyToJob } from "../../src/service/nannyDashboardService.js";

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
    // 1. Clear container
    jobGrid.innerHTML = ""; 
    
    // Create a wrapper to control the 90% width and centering
    const tableWrapper = document.createElement("div");
    tableWrapper.style.width = "90%";
    tableWrapper.style.margin = "20px auto"; // Centered within the main-content area
    tableWrapper.style.overflowX = "auto"; // Allows scrolling on small screens

    // Create Table Element
    const table = document.createElement("table");
    table.className = "job-list-table";
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.background = "#fff";
    table.style.borderRadius = "12px";
    table.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";

    // 2. Handle Empty State
    if (jobs.length === 0) {
        table.innerHTML = `
            <tbody>
                <tr>
                    <td colspan="5" style="text-align: center; padding: 10px 20px; color: #777;">
                        <p style="font-size: 4rem; margin-bottom: 10px;">🔍</p>
                        <p style="font-size: 1.2rem;">No jobs match your search criteria.</p>
                    </td>
                </tr>
            </tbody>`;
        tableWrapper.appendChild(table);
        jobGrid.appendChild(tableWrapper);
        return;
    }

    // 3. Create Table Header
    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr style="text-align: left; background-color: #f8f9fa; border-bottom: 2px solid #eee;">
            <th style="padding: 20px; color: #555; font-weight: 600;">Job Title</th>
            <th style="padding: 20px; color: #555; font-weight: 600;">Location & Salary</th>
            <th style="padding: 20px; color: #555; font-weight: 600;">Experience/Type</th>
            <th style="padding: 20px; color: #555; font-weight: 600;">Posted Date</th>
            <th style="padding: 20px; color: #555; font-weight: 600; text-align: right;">Action</th>
        </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // 4. Iterate and Build Rows
    jobs.forEach(job => {
        const isHighPay = job.salary > 95000 ? '<span class="tag-urgent" style="background:#ffebee; color:#c62828; padding:2px 8px; border-radius:4px; font-size:0.75rem; margin-left:8px;">High Pay</span>' : '';
        const mediumPay = job.salary > 50000 && job.salary <= 95000 ? '<span class="tag-medium" style="background:#e3f2fd; color:#1565c0; padding:2px 8px; border-radius:4px; font-size:0.75rem; margin-left:8px;">Medium Pay</span>' : '';
        const isApplied = job.applied === true;
        
        // Format Date
        const dateFormatted = new Date(job.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const tr = document.createElement("tr");
        tr.className = "job-row-item";
        tr.style.borderBottom = "1px solid #f0f0f0";
        tr.style.transition = "background 0.2s";

        tr.innerHTML = `
            <td style="padding: 20px;">
                <div style="font-weight: 600; color: #333; font-size: 1rem;">${job.title}</div>
                ${isHighPay} ${mediumPay}
            </td>
            <td style="padding: 20px;">
                <div style="color: #666; font-size: 0.9rem;">📍 ${job.location}</div>
                <div style="font-weight: 700; color: #2e7d32;">Ksh ${job.salary.toLocaleString()}</div>
            </td>
            <td style="padding: 20px; color: #666; font-size: 0.9rem;">
                <span style="display:block;">⏱️ ${job.availability.replace('_', ' ')}</span>
                <span style="display:block;">🎓 ${job.required_experience} Years Exp.</span>
            </td>
            <td style="padding: 20px; color: #888; font-size: 0.85rem;">
                ${dateFormatted}
            </td>
            <td style="padding: 20px; text-align: right;">
                <button class="row-apply-btn" id="btn-${job.id}" 
                    style="${isApplied ? 'background:#ccc; cursor:not-allowed;' : 'background:#6d4830; cursor:pointer;'} color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:600; transition: 0.3s;"
                    ${isApplied ? 'disabled' : ''}>
                    ${isApplied ? 'Applied' : 'View & Apply'}
                </button>
            </td>`;

        // Click Logic Preservation
        // ... existing row creation logic ...

        const btn = tr.querySelector(".row-apply-btn");

        if (!isApplied) {
            // 1. Set the hover effect using JS event listeners
            btn.onmouseover = () => {
                btn.style.backgroundColor = "#543725"; // Darker shade of your #6d4830
                btn.style.transform = "translateY(-1px)";
                btn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
            };

            btn.onmouseout = () => {
                btn.style.backgroundColor = "darkgreen"; // Original color
                btn.style.transform = "translateY(0)";
                btn.style.boxShadow = "none";
            };

            // 2. Preserve your existing modal logic
            btn.onclick = (e) => {
                e.stopPropagation();
                openModal(job);
            };
        }
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    jobGrid.appendChild(tableWrapper);
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
            </div>`;
        
        jobModal.style.display = "block";

        submitBtn.onclick = async () => {
            submitBtn.innerText = "Processing...";
            submitBtn.disabled = true;

            const response = await applyToJob(job.id);

            if (response.success) {
                const jobIndex = allJobs.findIndex(j => j.id === job.id);
                if (jobIndex !== -1) allJobs[jobIndex].applied = true;

                const listingBtn = document.getElementById(`btn-${job.id}`);
                if (listingBtn) {
                    listingBtn.innerText = "Applied";
                    listingBtn.disabled = true;
                    listingBtn.style.background = "#ccc";
                    listingBtn.onclick = null;
                }

                submitBtn.innerText = "Applied";
                submitBtn.style.backgroundColor = "#28a745";
                
                await showToast(`Application for a "${job.title}" job was successfully submitted!`, "success");
                jobModal.style.display = "none";
            } else {
                const errorMsg = response.message.toLowerCase();
                
                if (errorMsg.includes("profile") || errorMsg.includes("not exist") || errorMsg.includes("complete")) {
                    await showToast("Please create a Nanny Profile first!", "error");
                    window.location.href = "create-nanny-profile.html"; 
                } else {
                    showToast(`Error: ${response.message}`, "error");
                    submitBtn.innerText = "Submit Application";
                    submitBtn.disabled = false;
                }
            }
        };
    }

    if (closeModal) closeModal.onclick = () => jobModal.style.display = "none";
    window.onclick = (e) => { if (e.target == jobModal) jobModal.style.display = "none"; };

    init();
});