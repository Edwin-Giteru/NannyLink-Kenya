// ========================================
// API Configuration
// ========================================
const API_BASE_URL = 'http://127.0.0.1:8000/admin/payments';
let currentPage = 1;
let currentPaymentData = [];

// ========================================
// Authentication Helpers
// ========================================
async function authorizedFetch(url, options = {}) {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        window.location.href = '../views/login.html';
        return;
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = "../views/login.html";
            return;
        }
        return response;
    } catch (error) {
        console.error("Network Error:", error);
        throw error;
    }
}

// ========================================
// UI Update Functions
// ========================================
function updateStats(stats) {
    if (!stats) return;
    const totalVolumeElem = document.getElementById('totalVolume');
    const successRateElem = document.getElementById('successRate');
    
    if (totalVolumeElem) totalVolumeElem.innerText = `KES ${stats.total_volume.toLocaleString()}`;
    if (successRateElem) successRateElem.innerText = `${stats.success_rate}%`;
}

function getStatusClass(status) {
    const s = (status || '').toLowerCase();
    switch (s) {
        case 'completed':
            return 'status-completed';
        case 'pending':
            return 'status-pending';
        case 'failed':
        case 'cancelled':
            return 'status-failed';
        default:
            return 'status-pending';
    }
}

function formatDate(dateString) {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    try {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString()
        };
    } catch {
        return { date: dateString, time: '' };
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function renderTable(payments) {
    const tbody = document.getElementById('paymentTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!payments || payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 60px;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1;">receipt</span>
                    <p style="margin-top: 16px; color: #64748b;">No payment records found</p>
                </td>
            </tr>
        `;
        return;
    }

    let htmlRows = '';
    
    payments.forEach(payment => {
        const { date, time } = formatDate(payment.created_at);
        const statusClass = getStatusClass(payment.payment_status);
        const statusDisplay = (payment.payment_status || 'unknown').toUpperCase();
        const familyName = payment.family_name || 'Unknown Family';
        const nannyName = payment.nanny_name || 'Not Assigned';
        const mpesaCode = payment.mpesa_transaction_code || '---';
        const amount = (payment.amount || 0).toLocaleString();
        const paymentId = payment.id;
        
        htmlRows += `
            <tr>
                <td>
                    <strong>${escapeHtml(date)}</strong><br>
                    <small style="color: #94a3b8;">${escapeHtml(time)}</small>
                </td>
                <td>
                    <strong>${escapeHtml(familyName)}</strong><br>
                    <small style="color: #94a3b8;">Matched with ${escapeHtml(nannyName)}</small>
                </td>
                <td><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 8px;">${escapeHtml(mpesaCode)}</code></td>
                <td class="text-center"><strong>KES ${escapeHtml(amount)}</strong></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(statusDisplay)}</span></td>
               
            </tr>
        `;
    });
    
    tbody.innerHTML = htmlRows;
}

// ========================================
// API Calls
// ========================================
async function loadPaymentLogs() {
    const searchInput = document.getElementById('searchInput');
    const searchValue = searchInput ? searchInput.value : '';
    const url = `${API_BASE_URL}/?page=${currentPage}&search=${encodeURIComponent(searchValue)}`;
    
    try {
        const response = await authorizedFetch(url);
        if (!response) return;

        const data = await response.json();
        currentPaymentData = data.payments || [];
        renderTable(currentPaymentData);
        updateStats(data.stats);
        
        const showingText = document.getElementById('showingText');
        const pageNumberBtn = document.getElementById('pageNumber');
        
        if (showingText) {
            showingText.innerText = `Showing ${currentPaymentData.length} of ${data.total_count || 0} transactions`;
        }
        if (pageNumberBtn) {
            pageNumberBtn.innerText = currentPage;
        }
        
    } catch (error) {
        console.error("Failed to load logs:", error);
    }
}

function exportToExcel() {
    if (!currentPaymentData || currentPaymentData.length === 0) {
        alert("No data available to export.");
        return;
    }

    const worksheetData = currentPaymentData.map(payment => ({
        "Date": new Date(payment.created_at).toLocaleDateString(),
        "Time": new Date(payment.created_at).toLocaleTimeString(),
        "Family Name": payment.family_name || 'N/A',
        "Nanny Name": payment.nanny_name || 'N/A',
        "M-Pesa Code": payment.mpesa_transaction_code || 'Pending',
        "Amount (KES)": payment.amount,
        "Status": (payment.payment_status || 'unknown').toUpperCase()
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
    XLSX.writeFile(workbook, `NannyLink_Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function generateAuditLog() {
    alert("Audit log generation feature coming soon.");
}

function viewDetails(paymentId) {
    alert(`Payment details for ID: ${paymentId}\n\nFull details feature coming soon.`);
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        if (sidebar.style.display === 'flex') {
            sidebar.style.display = 'none';
        } else {
            sidebar.style.display = 'flex';
            sidebar.style.position = 'fixed';
            sidebar.style.top = '0';
            sidebar.style.left = '0';
            sidebar.style.zIndex = '100';
        }
    }
}

// ========================================
// Event Listeners & Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadPaymentLogs();
    
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const exportBtn = document.getElementById('exportBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentPage++;
            loadPaymentLogs();
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadPaymentLogs();
            }
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadPaymentLogs();
            }, 500);
        });
    }
});

// Make functions global
window.viewDetails = viewDetails;
window.generateAuditLog = generateAuditLog;
window.toggleMobileMenu = toggleMobileMenu;