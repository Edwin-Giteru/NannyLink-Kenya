// ========================================
// API Configuration
// ========================================
const API_CONTRACTS = "http://localhost:8000/contracts";
const API_CONNECTIONS = "http://localhost:8000/connections";
let successfulMatches = [];
let existingContracts = [];

// ========================================
// Authentication Helpers
// ========================================
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

function checkAuth(response) {
    if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = "../views/login.html";
        return true;
    }
    return false;
}

// ========================================
// Toast Notification
// ========================================
function createToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'success', duration = 4000) {
    const container = createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check_circle';
    let label = 'Success';
    if (type === 'error') {
        icon = 'error';
        label = 'Error';
    }
    
    toast.innerHTML = `
        <span class="toast-icon material-symbols-outlined">${icon}</span>
        <div class="toast-content">
            <p class="toast-label">${label}</p>
            <p class="toast-message">${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
}

// ========================================
// Fetch Functions
// ========================================
async function init() {
    const token = localStorage.getItem('access_token');
    if (!token) { 
        window.location.href = "../views/login.html"; 
        return; 
    }
    
    try {
        const [cRes, ctRes] = await Promise.all([
            fetch(`${API_CONNECTIONS}/`, { headers: getAuthHeaders() }),
            fetch(`${API_CONTRACTS}/me`, { headers: getAuthHeaders() }),
        ]);
        
        if (checkAuth(cRes) || checkAuth(ctRes)) return;
        
        const connectionData = await cRes.json();
        
        if (connectionData && typeof connectionData === 'object' && !Array.isArray(connectionData)) {
            successfulMatches = connectionData.nannies || [];
        } else {
            successfulMatches = connectionData || [];
        }
        
        existingContracts = await ctRes.json();
        renderMatches();
    } catch (e) { 
        console.error("Initialization Error:", e); 
        showToast("Failed to load connections. Please refresh.", "error");
    }
}

function renderMatches() {
    const list = document.getElementById('matchList');
    if (!list) return;
    
    if (successfulMatches.length === 0) {
        list.innerHTML = `<p class="empty-message">No active connections</p>`;
        return;
    }

    list.innerHTML = successfulMatches.map(m => {
        const contract = existingContracts.find(c => c.match_id === m.id);            
        const name = m.nanny?.full_name || m.nanny?.name || "Caregiver";
        const statusLabel = m.status || "Connected";
        
        return `
            <div onclick="selectMatch('${m.id}')" class="connection-card">
                <div class="connection-header">
                    <span class="connection-name">${escapeHtml(name)}</span>
                    ${contract ? '<span class="verified-icon material-symbols-outlined">verified</span>' : ''}
                </div>
                <p class="connection-status">${escapeHtml(statusLabel)}</p>
            </div>
        `;
    }).join('');
}

// ========================================
// Match Selection
// ========================================
function selectMatch(matchId) {
    const match = successfulMatches.find(m => m.id === matchId);
    if (!match) return;

    const contract = existingContracts.find(c => c.match_id === matchId);
    const workspace = document.getElementById('workspace');

    const name = match.nanny?.full_name || 
                match.nanny?.name || 
                match.full_name || 
                match.name || 
                "Caregiver";

    if (!contract) {
        workspace.innerHTML = `
            <div class="contract-generator">
                <h2 class="generator-title">New Agreement</h2>
                <p class="generator-subtitle">For: ${escapeHtml(name)}</p>
                <textarea id="customTerms" class="custom-terms" rows="6"
                    placeholder="Specify house rules, special needs, working hours..."></textarea>
                <button onclick="generateNow('${matchId}')" id="genBtn" class="generate-btn">Generate Formal Contract</button>
            </div>`;
    } else {
        renderContractView(contract, match);
    }
}

// ========================================
// Contract Generation
// ========================================
async function generateNow(matchId) {
    const token = localStorage.getItem('access_token');
    const terms = document.getElementById('customTerms').value;
    const btn = document.getElementById('genBtn');
    
    btn.innerHTML = "Processing...";
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_CONTRACTS}/generate/${matchId}?custom_terms=${encodeURIComponent(terms)}`, {
            method: 'POST', 
            headers: getAuthHeaders()
        });
        
        if (checkAuth(res)) return;
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.detail || "Failed to generate");
        }

        existingContracts.push(data);
        renderMatches();
        renderContractView(data, successfulMatches.find(m => m.id === matchId));
        showToast("Contract generated successfully!", "success");
    } catch (e) { 
        showToast(`Error: ${e.message}`, "error");
        btn.innerHTML = "Generate Formal Contract";
        btn.disabled = false;
    }
}

// ========================================
// Contract View
// ========================================
function renderContractView(contract, match) {
    const workspace = document.getElementById('workspace');
    let fullText = contract.contract_text || "";
    
    let householdExp = "Standard childcare services as per NannyLink guidelines.";
    if (fullText.includes("HOUSEHOLD EXPECTATIONS") && fullText.includes("SPECIAL JOB REQUIREMENTS")) {
        householdExp = fullText.split("HOUSEHOLD EXPECTATIONS")[1].split("SPECIAL JOB REQUIREMENTS")[0].trim();
    }

    let customRequirements = "Standard employment terms apply.";
    if (fullText.includes("SPECIAL JOB REQUIREMENTS") && fullText.includes("GENERAL PROVISIONS")) {
        customRequirements = fullText.split("SPECIAL JOB REQUIREMENTS")[1].split("GENERAL PROVISIONS")[0].trim();
    }

    const accurateNannyName = match.nanny?.full_name || match.nanny?.name || 'Caregiver Professional';
    const familyName = match.family?.name || 'Valued Family';
    const familyLocation = match.family?.household_location || 'Nairobi, Kenya';
    const generationDate = contract.generation_date ? new Date(contract.generation_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '28 March 2026';

    workspace.innerHTML = `
        <div class="contract-view">
            <div class="contract-header-bar">
                <span class="contract-header-label">Employment Agreement (Official)</span>
                <button onclick="downloadPDF()" class="download-btn">
                    <span class="material-symbols-outlined">download</span> Download PDF
                </button>
            </div>
            
            <div class="contract-content hide-scrollbar">
                <div id="contractPDF" class="contract-pdf">
                    <div class="pdf-header">
                        <div class="pdf-logo">
                            <h1>NannyLink Kenya</h1>
                            <p>Premium Care & Household Staffing</p>
                        </div>
                        <div class="pdf-date">
                            <p class="pdf-date-label">Date Generated</p>
                            <p class="pdf-date-value">${generationDate}</p>
                        </div>
                    </div>

                    <h2 class="pdf-title">Employment Agreement</h2>

                    <div class="parties-grid">
                        <div>
                            <p class="party-label">Employer (Family)</p>
                            <p class="party-name">${escapeHtml(familyName)}</p>
                            <p class="party-location">${escapeHtml(familyLocation)}</p>
                        </div>
                        <div>
                            <p class="party-label">Employee (Nanny)</p>
                            <p class="party-name">${escapeHtml(accurateNannyName)}</p>
                            <p class="party-location">Verified via NannyLink</p>
                        </div>
                    </div>

                    <div class="terms-section">
                        <h3 class="section-title">Terms & Duties</h3>
                        <div style="margin-bottom: 24px;">
                            <p class="terms-subtitle">Household Details & Expectations</p>
                            <p class="terms-content">${escapeHtml(householdExp)}</p>
                        </div>
                        <div>
                            <p class="terms-subtitle">Special Job Requirements</p>
                            <p class="terms-content">${escapeHtml(customRequirements)}</p>
                        </div>
                    </div>

                    <div class="terms-section">
                        <h3 class="section-title">General Provisions</h3>
                        <ul class="provisions-list">
                            <li><span>1.</span> This contract is binding upon digital acceptance by both parties.</li>
                            <li><span>2.</span> The Family agrees to provide a safe working environment.</li>
                            <li><span>3.</span> Payment shall be handled via the NannyLink Secure Payment platform.</li>
                            <li><span>4.</span> Either party may terminate with 14 days written notice.</li>
                        </ul>
                    </div>

                    <div class="signatures-section">
                        <p class="signatures-title">Acceptance & Digital Signatures</p>
                        <div class="signatures-grid">
                            <div class="signature-card">
                                <div class="signature-icon ${contract.acceptance?.family_accepted ? 'signed' : ''}">
                                    <span class="material-symbols-outlined">verified</span>
                                </div>
                                <p class="signature-label">Employer / Family</p>
                                <p class="signature-status ${contract.acceptance?.family_accepted ? 'signed' : 'pending'}">
                                    ${contract.acceptance?.family_accepted ? 'Digitally Signed' : 'Signature Pending'}
                                </p>
                            </div>
                            <div class="signature-card">
                                <div class="signature-icon ${contract.acceptance?.nanny_accepted ? 'signed' : ''}">
                                    <span class="material-symbols-outlined">verified</span>
                                </div>
                                <p class="signature-label">Employee / Nanny</p>
                                <p class="signature-status ${contract.acceptance?.nanny_accepted ? 'signed' : 'pending'}">
                                    ${contract.acceptance?.nanny_accepted ? 'Digitally Signed' : 'Signature Pending'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="contract-footer">
                ${(contract.acceptance?.family_accepted && contract.acceptance?.nanny_accepted) ? `
                    <div class="executed-badge">
                        <span class="material-symbols-outlined">verified</span> Contract Fully Executed
                    </div>
                ` : contract.acceptance?.family_accepted ? `
                    <div class="waiting-badge">
                        <span class="material-symbols-outlined">hourglass_empty</span> Waiting for Nanny to sign...
                    </div>
                ` : `
                    <button id="signBtn" onclick="signNow('${contract.id}')" class="sign-btn">
                        <span class="material-symbols-outlined">draw</span> Sign This Agreement
                    </button>
                `}
            </div>
        </div>
    `;
}

// ========================================
// PDF Download
// ========================================
function downloadPDF() {
    const element = document.getElementById('contractPDF');
    html2pdf().set({
        margin: 0,
        filename: 'NannyLink_Contract.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { format: 'a4', orientation: 'portrait' }
    }).from(element).save();
}

// ========================================
// Sign Contract
// ========================================
async function signNow(contractId) {
    const token = localStorage.getItem('access_token');
    const signBtn = document.getElementById('signBtn');
    
    if (signBtn) {
        signBtn.disabled = true;
        signBtn.innerHTML = `<span class="material-symbols-outlined">sync</span> Processing...`;
    }
    
    try {
        const res = await fetch(`${API_CONTRACTS}/${contractId}/sign`, {
            method: 'POST', 
            headers: getAuthHeaders()
        });
        
        if (checkAuth(res)) return;
        
        if (res.ok) {
            const updated = await res.json();
            const idx = existingContracts.findIndex(c => c.id === contractId);
            if (idx !== -1) existingContracts[idx] = updated;
            renderContractView(updated, successfulMatches.find(m => m.id === updated.match_id));
            renderMatches();
            showToast("Contract signed successfully!", "success");
        } else {
            throw new Error("Signature failed");
        }
    } catch (e) {
        if (signBtn) {
            signBtn.disabled = false;
            signBtn.innerHTML = `<span class="material-symbols-outlined">draw</span> Sign This Agreement`;
        }
        showToast("Signature failed. Please try again.", "error");
    }
}

// ========================================
// Helper Functions
// ========================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========================================
// Event Listeners & Initialization
// ========================================
document.addEventListener('DOMContentLoaded', init);

// Make functions globally available
window.selectMatch = selectMatch;
window.generateNow = generateNow;
window.downloadPDF = downloadPDF;
window.signNow = signNow;