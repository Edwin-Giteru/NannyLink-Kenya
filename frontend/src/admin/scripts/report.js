// ========================================
// API Configuration
// ========================================
const API_BASE_URL = "http://127.0.0.1:8000";

// ========================================
// State Management
// ========================================
let currentType = "matches";
let currentData = [];
let currentPage = 1;
let pageSize = 10;

const statusOptions = {
    matches: [
        { value: "", label: "All Statuses" },
        { value: "awaiting_payment", label: "Awaiting Payment" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" }
    ],
    users: [
        { value: "", label: "All Users" },
        { value: "vetted", label: "Vetted (Approved)" },
        { value: "pending", label: "Pending Verification" }
    ],
    payments: [
        { value: "", label: "All Statuses" },
        { value: "completed", label: "Completed" },
        { value: "pending", label: "Pending" },
        { value: "failed", label: "Failed" }
    ]
};

// ========================================
// Helper Functions
// ========================================
function getAccessToken() {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "../views/login.html";
        return null;
    }
    return token;
}

function authHeaders() {
    const token = getAccessToken();
    if (!token) return {};
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

function handleUnauthorized() {
    localStorage.removeItem("access_token");
    showToast("Session expired. Please log in again.", "error");
    setTimeout(() => { window.location.href = "../views/login.html"; }, 1500);
}

function showToast(message, type = "error") {
    const toast = document.getElementById("toastContainer");
    const bgColor = type === "success" ? "#10b981" : "#ef4444";
    toast.innerHTML = `<div style="background-color: ${bgColor}; color: white; padding: 12px 24px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); font-size: 14px; font-weight: bold;">${message}</div>`;
    toast.classList.remove("hidden");
    setTimeout(() => { toast.classList.add("hidden"); }, 3000);
}

function updateApiStatus(connected, message = "") {
    const dot = document.getElementById("apiStatusDot");
    const text = document.getElementById("apiStatusText");
    if (connected) {
        dot.style.backgroundColor = "#10b981";
        text.innerText = "Connected to API";
    } else {
        dot.style.backgroundColor = "#ef4444";
        text.innerText = message || "API Error";
    }
}

function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    try { return new Date(dateStr).toLocaleDateString(); }
    catch { return dateStr; }
}

function getStatusClass(status) {
    const s = (status || "").toLowerCase();
    if (s === "active" || s === "completed" || s === "approved" || s === "vetted") return "status-success";
    if (s === "pending" || s === "awaiting_payment") return "status-warning";
    if (s === "cancelled" || s === "failed") return "status-error";
    return "status-default";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}

function updateStatusFilterOptions() {
    const select = document.getElementById("statusFilter");
    const options = statusOptions[currentType] || statusOptions.matches;
    const currentValue = select.value;
    select.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join("");
    if (currentValue && options.some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
}

function buildApiUrl() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const statusVal = document.getElementById("statusFilter").value;

    let url = `${API_BASE_URL}/admin/reports/${currentType}`;
    const params = [];

    if (startDate) params.push(`start_date=${startDate}T00:00:00`);
    if (endDate) params.push(`end_date=${endDate}T23:59:59`);
    if (statusVal && statusVal.trim() !== "") {
        params.push(`status=${statusVal}`);
    }

    if (params.length > 0) url += "?" + params.join("&");
    return url;
}

// ========================================
// API Calls
// ========================================
async function fetchReportData() {
    const overlay = document.getElementById("loadingOverlay");
    overlay.classList.remove("hidden");

    try {
        const url = buildApiUrl();
        console.log("Fetching:", url);

        const response = await fetch(url, {
            method: "GET",
            headers: authHeaders()
        });

        if (response.status === 401) {
            handleUnauthorized();
            return [];
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        updateApiStatus(true);
        console.log(`Fetched ${data.length} ${currentType} records`);
        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error("API Error:", error);
        updateApiStatus(false, error.message);
        showToast(`Failed to fetch data: ${error.message}`, "error");
        return [];
    } finally {
        overlay.classList.add("hidden");
    }
}

async function downloadExcel() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const statusVal = document.getElementById("statusFilter").value;
    
    let url = `${API_BASE_URL}/admin/reports/${currentType}?download=true`;
    if (startDate) url += `&start_date=${startDate}T00:00:00`;
    if (endDate) url += `&end_date=${endDate}T23:59:59`;
    if (statusVal && statusVal.trim() !== "") url += `&status=${statusVal}`;
    
    try {
        const token = localStorage.getItem("access_token");
        if (!token) {
            handleUnauthorized();
            return;
        }
        
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            handleUnauthorized();
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `nannylink_${currentType}_report_${new Date().toISOString().slice(0, 19)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        
        showToast("Excel report downloaded successfully!", "success");
        
    } catch (error) {
        console.error("Download error:", error);
        showToast(`Download failed: ${error.message}`, "error");
    }
}

async function fetchKPIs() {
    const headers = authHeaders();
    if (!headers.Authorization) return;

    try {
        const matchesRes = await fetch(`${API_BASE_URL}/admin/reports/matches`, { headers });
        if (matchesRes.status === 401) { handleUnauthorized(); return; }
        if (matchesRes.ok) {
            const matches = await matchesRes.json();
            const activeCount = Array.isArray(matches)
                ? matches.filter(m => m.status === "awaiting_payment" || m.status === "completed").length
                : 0;
            document.getElementById("activeMatches").innerText = activeCount;
        }

        const usersRes = await fetch(`${API_BASE_URL}/admin/reports/users`, { headers });
        if (usersRes.status === 401) { handleUnauthorized(); return; }
        if (usersRes.ok) {
            const users = await usersRes.json();
            document.getElementById("totalUsers").innerText = Array.isArray(users) ? users.length : 0;
        }

        const paymentsRes = await fetch(`${API_BASE_URL}/admin/reports/payments`, { headers });
        if (paymentsRes.status === 401) { handleUnauthorized(); return; }
        if (paymentsRes.ok) {
            const payments = await paymentsRes.json();
            const totalRevenue = Array.isArray(payments)
                ? payments.filter(p => p.status === "completed").reduce((sum, p) => sum + (p.amount || 0), 0)
                : 0;
            document.getElementById("totalRevenue").innerText = `KES ${totalRevenue.toLocaleString()}`;
        }

    } catch (e) {
        console.warn("Could not fetch KPIs:", e);
    }
}

// ========================================
// Rendering Functions
// ========================================
function renderTable() {
    const start = (currentPage - 1) * pageSize;
    const paginated = currentData.slice(start, start + pageSize);
    const total = currentData.length;

    document.getElementById("pageInfo").innerText = total === 0
        ? "Showing 0 entries"
        : `Showing ${start + 1}-${Math.min(start + pageSize, total)} of ${total} entries`;
    document.getElementById("prevBtn").disabled = currentPage === 1;
    document.getElementById("nextBtn").disabled = start + pageSize >= total;

    const tbody = document.getElementById("tableBody");
    const emptyState = document.getElementById("emptyState");

    if (paginated.length === 0) {
        tbody.innerHTML = "";
        emptyState.classList.remove("hidden");
        return;
    }
    emptyState.classList.add("hidden");

    if (currentType === "matches") {
        // Matches table
        document.getElementById("col1").innerText = "Family Name";
        document.getElementById("col2").innerText = "Nanny Name";
        document.getElementById("col3").innerText = "Status";
        document.getElementById("col4").innerText = "Date";
        document.getElementById("col5").innerText = "Match ID";
        document.getElementById("col6").style.display = "none";

        tbody.innerHTML = paginated.map(item => {
            const statusClass = getStatusClass(item.status);
            return `<tr>
                <td class="font-bold">${escapeHtml(item.family_name || "Unknown")}</td>
                <td>${escapeHtml(item.nanny_name || "Unknown")}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(item.status || "unknown")}</span></td>
                <td>${formatDate(item.created_at || item.match_date)}</td>
                <td><code>${escapeHtml((item.match_id || "---").slice(0, 8))}</code></td>
                <td style="display:none;"></td>
            </tr>`;
        }).join("");

    } else if (currentType === "users") {
        // Users table
        document.getElementById("col1").innerText = "User Name";
        document.getElementById("col2").innerText = "Email / Role";
        document.getElementById("col3").innerText = "Vetting Status";
        document.getElementById("col4").innerText = "Registered";
        document.getElementById("col5").innerText = "User ID";
        document.getElementById("col6").style.display = "none";

        tbody.innerHTML = paginated.map(item => {
            const statusClass = getStatusClass(item.vetting_status);
            const roleIcon = item.role === "nanny" ? "badge" : (item.role === "family" ? "home" : "admin_panel_settings");
            return `<tr>
                <td><div style="display: flex; align-items: center; gap: 8px;"><span class="material-symbols-outlined" style="font-size: 18px;">${roleIcon}</span><span class="font-bold">${escapeHtml(item.name || "Unknown")}</span></div></td>
                <td><div><small>${escapeHtml(item.email || "")}</small><br><small class="text-muted">${escapeHtml(item.role || "user")}</small></div></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(item.vetting_status || "N/A")}</span></td>
                <td>${formatDate(item.created_at)}</td>
                <td><code>${escapeHtml((item.user_id || "---").slice(0, 8))}</code></td>
                <td style="display:none;"></td>
            </tr>`;
        }).join("");

    } else {
        // Payments table
        document.getElementById("col1").innerText = "Family";
        document.getElementById("col2").innerText = "Nanny";
        document.getElementById("col3").innerText = "Amount";
        document.getElementById("col4").innerText = "Payment Status";
        document.getElementById("col5").innerText = "Date";
        document.getElementById("col6").innerText = "M-Pesa Code";
        document.getElementById("col6").style.display = "table-cell";

        tbody.innerHTML = paginated.map(item => {
            const statusClass = getStatusClass(item.status);
            return `<tr>
                <td class="font-bold">${escapeHtml(item.family_name || "Unknown")}</td>
                <td>${escapeHtml(item.nanny_name || "N/A")}</td>
                <td class="amount">KES ${(item.amount || 0).toLocaleString()}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(item.status || "unknown")}</span></td>
                <td>${formatDate(item.created_at)}</td>
                <td><code>${escapeHtml(item.mpesa_code || "---")}</code></td>
            </tr>`;
        }).join("");
    }
}

// ========================================
// Main Functions
// ========================================
async function loadReport() {
    currentType = document.getElementById("reportTypeSelect").value;
    currentPage = 1;
    updateStatusFilterOptions();

    const data = await fetchReportData();
    currentData = Array.isArray(data) ? data : [];
    renderTable();
}

async function refreshReportData() {
    await loadReport();
    await fetchKPIs();
}

function resetFilters() {
    document.getElementById("reportTypeSelect").value = "matches";
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";

    const statusSelect = document.getElementById("statusFilter");
    if (statusSelect.options.length > 0) statusSelect.selectedIndex = 0;

    refreshReportData();
}

function toggleMobileMenu() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar.style.display === "flex") {
        sidebar.style.display = "none";
    } else {
        sidebar.style.display = "flex";
        sidebar.style.position = "fixed";
        sidebar.style.top = "0";
        sidebar.style.left = "0";
        sidebar.style.zIndex = "100";
    }
}

// ========================================
// Event Listeners & Initialization
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    // Set default dates (last 6 months)
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    document.getElementById("startDate").value = sixMonthsAgo.toISOString().split('T')[0];
    document.getElementById("endDate").value = today.toISOString().split('T')[0];

    // Event listeners
    document.getElementById("generateBtn").addEventListener("click", refreshReportData);
    document.getElementById("resetBtn").addEventListener("click", resetFilters);
    document.getElementById("downloadExcelBtn2").addEventListener("click", downloadExcel);
    document.getElementById("exportExcelBtn").addEventListener("click", downloadExcel);
    document.getElementById("reportTypeSelect").addEventListener("change", () => loadReport());
    document.getElementById("statusFilter").addEventListener("change", () => loadReport());
    document.getElementById("startDate").addEventListener("change", () => loadReport());
    document.getElementById("endDate").addEventListener("change", () => loadReport());
    document.getElementById("prevBtn").addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTable(); } });
    document.getElementById("nextBtn").addEventListener("click", () => { currentPage++; renderTable(); });

    // Initialize
    updateStatusFilterOptions();
    refreshReportData();
    pageSize = window.innerHeight > 900 ? 10 : 5;
});

// Make functions globally available for inline handlers
window.refreshReportData = refreshReportData;
window.toggleMobileMenu = toggleMobileMenu;