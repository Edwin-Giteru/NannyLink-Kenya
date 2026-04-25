// ========================================
// API Configuration
// ========================================
const API_BASE = "http://127.0.0.1:8000";
const CONTRACT_PATH = "/contracts/me"; 
let selectedContractId = null;
let cachedContracts = [];

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
        window.location.href = "/frontend/src/views/login.html";
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
// Load Data
// ========================================
async function loadData() {
    const token = localStorage.getItem("access_token");
    if (!token) { 
        window.location.href = "/frontend/src/views/login.html"; 
        return; 
    }
    
    const headers = getAuthHeaders();

    try {
        const contractReq = await fetch(`${API_BASE}${CONTRACT_PATH}`, { headers });

        if (checkAuth(contractReq)) return;

        if (contractReq.ok) {
            const rawData = await contractReq.json();
            cachedContracts = Array.isArray(rawData) ? rawData : (rawData.data || []);
            renderLists(cachedContracts);
        } else {
            console.error("Contract Fetch Failed:", contractReq.status);
            showToast("Failed to load contracts", "error");
        }
    } catch (e) { 
        console.error("Load Data Error:", e);
        showToast("Network error. Please try again.", "error");
    }
}

// ========================================
// Render Lists
// ========================================
function renderLists(contracts) {
    const pendingList = document.getElementById('pending-list');
    const activeList = document.getElementById('active-list');
    
    if (!pendingList || !activeList) return;
    
    pendingList.innerHTML = '';
    activeList.innerHTML = '';

    if (contracts.length === 0) {
        pendingList.innerHTML = '<p class="empty-message">No contracts found.</p>';
        return;
    }

    contracts.forEach(contract => {
        const isNannySigned = contract.acceptance?.nanny_accepted || contract.nanny_accepted;
        const displayId = contract.id ? contract.id.substring(0, 8).toUpperCase() : 'NEW';
        
        const card = document.createElement('div');
        card.className = `contract-item ${isNannySigned ? 'active' : 'pending'}`;
        card.onclick = () => showContract(contract);
        card.innerHTML = `
            <div class="contract-header">
                <div>
                    <h3 class="contract-title">Employment Agreement</h3>
                    <p class="contract-ref">REF: NL-${escapeHtml(displayId)}</p>
                </div>
                <span class="contract-icon material-symbols-outlined ${isNannySigned ? 'active' : 'pending'}">
                    ${isNannySigned ? 'verified' : 'pending_actions'}
                </span>
            </div>
        `;
        
        (isNannySigned ? activeList : pendingList).appendChild(card);
    });
}

// ========================================
// Show Contract
// ========================================
function showContract(contract) {
    selectedContractId = contract.id;
    const matchData = contract.match || {};
    const familyData = matchData.family || {};
    const nannyData = matchData.nanny || {};
    
    const emptyState = document.getElementById('viewer-empty-state');
    const viewer = document.getElementById('contract-viewer');
    
    if (emptyState) emptyState.classList.add('hidden');
    if (viewer) viewer.classList.remove('hidden');

    // Parse contract text
    let fullText = contract.contract_text || "";
    let householdExp = "Standard childcare services as per NannyLink guidelines.";
    let customRequirements = "Standard employment terms apply.";

    if (fullText.includes("HOUSEHOLD EXPECTATIONS")) {
        const sections = fullText.split("HOUSEHOLD EXPECTATIONS");
        if (sections[1]) {
            const subSections = sections[1].split("SPECIAL JOB REQUIREMENTS");
            householdExp = subSections[0].trim().replace(/-{2,}/g, "");
            if (subSections[1]) {
                customRequirements = subSections[1].split("GENERAL PROVISIONS")[0].trim().replace(/-{2,}/g, "");
            }
        }
    }

    const generationDate = contract.created_at ? new Date(contract.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString();
    const familyName = familyData.name || 'Registered Client';
    const familyLocation = familyData.household_location || 'Address on file';
    const nannyName = nannyData.full_name || nannyData.name || 'Caregiver Professional';
    const contractRef = contract.id ? `NL-${contract.id.substring(0, 8).toUpperCase()}` : 'NEW';
    
    const contractBody = `
        <div class="parties-grid">
            <div>
                <p class="party-label">Employer (Family)</p>
                <p class="party-name">${escapeHtml(familyName)}</p>
                <p class="party-location">${escapeHtml(familyLocation)}</p>
            </div>
            <div>
                <p class="party-label">Employee (Nanny)</p>
                <p class="party-name">${escapeHtml(nannyName)}</p>
                <p class="party-location">Verified Professional</p>
            </div>
        </div>

        <div class="terms-section">
            <h3 class="section-title">Terms & Duties</h3>
            <div style="margin-bottom: 24px;">
                <p class="terms-subtitle">Household Expectations</p>
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
                <li><span>1.</span> This contract is binding upon digital acceptance via NannyLink.</li>
                <li><span>2.</span> The Family agrees to provide a safe and professional working environment.</li>
                <li><span>3.</span> All payments shall be processed through NannyLink Secure Payments.</li>
                <li><span>4.</span> Termination requires a 14-day written notice by either party.</li>
            </ul>
        </div>
    `;
    
    document.getElementById('contract-ref').innerText = `Reference: ${contractRef}`;
    document.getElementById('contract-date-display').innerText = generationDate;
    document.getElementById('contract-body').innerHTML = contractBody;
    
    // Update signature icons
    const famIcon = document.getElementById('fam-icon');
    const nanIcon = document.getElementById('nan-icon');
    const famDate = document.getElementById('fam-date');
    const nanDate = document.getElementById('nan-date');
    
    if (contract.acceptance?.family_accepted) {
        famIcon.classList.add('signed');
        famDate.innerText = 'Digitally Signed';
        famDate.classList.add('signed');
    } else {
        famIcon.classList.remove('signed');
        famDate.innerText = 'Pending...';
        famDate.classList.remove('signed');
    }
    
    if (contract.acceptance?.nanny_accepted) {
        nanIcon.classList.add('signed');
        nanDate.innerText = 'Digitally Signed';
        nanDate.classList.add('signed');
    } else {
        nanIcon.classList.remove('signed');
        nanDate.innerText = 'Pending...';
        nanDate.classList.remove('signed');
    }
    
    // Update actions area
    const actionsContainer = document.getElementById('contract-actions');
    if (actionsContainer) {
        if (!contract.acceptance?.nanny_accepted) {
            actionsContainer.innerHTML = `
                <div class="consent-wrapper">
                    <input type="checkbox" id="consent" class="consent-checkbox">
                    <label for="consent">I have read and agree to all employment terms.</label>
                </div>
                <button id="sign-btn" onclick="signContract()" class="sign-action-btn">
                    <span class="material-symbols-outlined">draw</span>
                    Accept Agreement
                </button>
            `;
        } else {
            actionsContainer.innerHTML = `
                <div class="executed-badge">
                    <span class="material-symbols-outlined">verified</span>
                    Agreement Fully Executed
                </div>
            `;
        }
    }
}

// ========================================
// Sign Contract
// ========================================
async function signContract() {
    const consentCheckbox = document.getElementById('consent');
    if (!consentCheckbox || !consentCheckbox.checked) {
        showToast("Please confirm you have read and agree to the terms.", "error");
        return;
    }
    
    const token = localStorage.getItem("access_token");
    const signBtn = document.getElementById('sign-btn');
    
    if (signBtn) {
        signBtn.disabled = true;
        signBtn.innerHTML = `<span class="material-symbols-outlined">sync</span> Processing...`;
    }
    
    try {
        const res = await fetch(`${API_BASE}/contracts/${selectedContractId}/sign`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (checkAuth(res)) return;
        
        if (res.ok) {
            showToast("Contract signed successfully!", "success");
            await loadData();
            
            // Find and show the updated contract
            const updated = cachedContracts.find(c => c.id === selectedContractId);
            if (updated) showContract(updated);
        } else {
            const error = await res.json();
            showToast(error.detail || "Signature failed. Please try again.", "error");
            if (signBtn) {
                signBtn.disabled = false;
                signBtn.innerHTML = `<span class="material-symbols-outlined">draw</span> Accept Agreement`;
            }
        }
    } catch (e) {
        console.error(e);
        showToast("Network error. Please try again.", "error");
        if (signBtn) {
            signBtn.disabled = false;
            signBtn.innerHTML = `<span class="material-symbols-outlined">draw</span> Accept Agreement`;
        }
    }
}

// ========================================
// Download PDF
// ========================================
function downloadPDF() {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    const filename = `NannyLink_Agreement_${selectedContractId ? selectedContractId.substring(0, 8) : 'Contract'}.pdf`;
    
    const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
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
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('access_token')) {
        window.location.href = "/frontend/src/views/login.html";
        return;
    }
    loadData();
});

// Make functions globally available
window.signContract = signContract;
window.downloadPDF = downloadPDF;