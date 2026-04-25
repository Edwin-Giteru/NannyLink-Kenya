// ========================================
// API Configuration
// ========================================
const API_BASE = 'http://127.0.0.1:8000/admin';
let latestDashboardData = null;
let latestTransactions = [];

// ========================================
// Authentication Helpers
// ========================================
function getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function checkAuth(response) {
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token');
        window.location.href = '../views/login.html';
        return true;
    }
    return false;
}

// ========================================
// API Calls
// ========================================
async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE}/stats-overview`, { 
            headers: getAuthHeaders() 
        });
        
        if (checkAuth(response)) return;
        
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const data = await response.json();
        latestDashboardData = data;
        updateUI(data);
    } catch (err) {
        console.error('Stats Error:', err);
    }
}

async function fetchTransactions() {
    try {
        const response = await fetch(`${API_BASE}/recent-transactions`, { 
            headers: getAuthHeaders() 
        });
        
        if (checkAuth(response)) return;
        
        if (!response.ok) throw new Error('Failed to fetch transactions');
        
        const transactions = await response.json();
        latestTransactions = transactions;
        renderTransactions(transactions);
    } catch (err) {
        console.error('Transaction Error:', err);
    }
}

// ========================================
// UI Update Functions
// ========================================
function updateUI(data) {
    // Revenue Card
    document.getElementById('total-revenue').innerText = `KES ${data.total_revenue.toLocaleString()}`;
    document.getElementById('completed-revenue').innerText = `KES ${data.completed_revenue.toLocaleString()}`;
    document.getElementById('pending-revenue').innerText = `KES ${data.pending_revenue.toLocaleString()}`;
    document.getElementById('revenue-growth').innerText = `+${data.revenue_growth_percentage}% MoM`;

    // User Base Card
    document.getElementById('total-users').innerText = data.total_users;
    document.getElementById('family-count').innerText = data.total_families;
    document.getElementById('nanny-count').innerText = data.total_nannies;
    
    const familyPct = (data.total_families / data.total_users) * 100;
    const nannyPct = (data.total_nannies / data.total_users) * 100;
    document.getElementById('family-progress').style.width = `${familyPct}%`;
    document.getElementById('nanny-progress').style.width = `${nannyPct}%`;

    // Health Card
    document.getElementById('mpesa-health').innerText = `${data.mpesa_success_rate}%`;

    // Placement Card
    document.getElementById('awaiting-payment').innerText = data.awaiting_payment_matches;
    document.getElementById('completed-placements').innerText = data.completed_placements;
    document.getElementById('match-success-rate').innerText = `${data.match_success_rate}%`;

    // Circular Chart
    const circumference = 439.8;
    const offset = circumference - (data.match_success_rate / 100) * circumference;
    const successRing = document.getElementById('success-ring');
    if (successRing) {
        successRing.style.strokeDashoffset = offset;
    }
}

function renderTransactions(transactions) {
    const body = document.getElementById('transactions-body');
    if (!body) return;
    
    body.innerHTML = '';
    
    if (!transactions || transactions.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 60px; color: #94a3b8;">
                    No transactions found
                </td>
            </tr>
        `;
        return;
    }
    
    transactions.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleDateString('en-KE', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const status = tx.status ? tx.status.toLowerCase() : 'pending';
        let statusClass = '';
        
        if (status === 'completed' || status === 'success') {
            statusClass = 'status-completed';
        } else if (status === 'failed' || status === 'cancelled') {
            statusClass = 'status-failed';
        } else {
            statusClass = 'status-pending';
        }

        const txId = tx.transaction_id || 'PENDING';
        const userName = escapeHtml(tx.user_name);
        const userAvatar = tx.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=00152f&color=fff`;
        const amount = tx.amount.toLocaleString();
        const statusDisplay = tx.status || 'PENDING';
        
        const row = `
            <tr>
                <td><code style="font-size: 0.75rem; color: #94a3b8;">${escapeHtml(txId)}</code></td>
                <td>
                    <div class="transaction-user">
                        <img src="${userAvatar}" class="transaction-avatar" alt="${userName}">
                        <span class="transaction-name">${userName}</span>
                    </div>
                </td>
                <td><span class="transaction-amount">KES ${escapeHtml(amount)}</span></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(statusDisplay)}</span></td>
                <td style="font-size: 0.75rem; color: #64748b;">${escapeHtml(date)}</td>
               
            </table>
        `;
        body.insertAdjacentHTML('beforeend', row);
    });
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

// ========================================
// Export Functions
// ========================================
function exportDashboardToExcel() {
    if (!latestDashboardData) {
        alert("Dashboard data is still loading...");
        return;
    }

    const wb = XLSX.utils.book_new();

    // Overview Data
    const overviewData = [
        ["NANNYLINK KENYA ADMIN DASHBOARD REPORT"],
        ["Generated on", new Date().toLocaleString()],
        [],
        ["SECTION", "METRIC", "VALUE"],
        ["REVENUE", "Total Revenue", `KES ${latestDashboardData.total_revenue}`],
        ["REVENUE", "Completed Revenue", `KES ${latestDashboardData.completed_revenue}`],
        ["REVENUE", "Pending Revenue", `KES ${latestDashboardData.pending_revenue}`],
        ["REVENUE", "MoM Growth", `${latestDashboardData.revenue_growth_percentage}%`],
        [],
        ["USERS", "Total Registered Users", latestDashboardData.total_users],
        ["USERS", "Total Families", latestDashboardData.total_families],
        ["USERS", "Total Nannies", latestDashboardData.total_nannies],
        [],
        ["SYSTEM", "M-Pesa Gateway Success Rate", `${latestDashboardData.mpesa_success_rate}%`],
        [],
        ["PLACEMENTS", "Awaiting Payment", latestDashboardData.awaiting_payment_matches],
        ["PLACEMENTS", "Completed Placements", latestDashboardData.completed_placements],
        ["PLACEMENTS", "Placement Success Rate", `${latestDashboardData.match_success_rate}%`]
    ];

    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    wsOverview['!cols'] = [
        { wch: 15 },
        { wch: 35 },
        { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOverview, "Stats_Overview");

    // Transactions Data
    if (latestTransactions.length > 0) {
        const txData = latestTransactions.map(tx => ({
            "ID": tx.transaction_id || "PENDING",
            "User Name": tx.user_name,
            "Amount (KES)": tx.amount,
            "Status": (tx.status || "PENDING").toUpperCase(),
            "Timestamp": new Date(tx.created_at).toLocaleString()
        }));

        const wsTx = XLSX.utils.json_to_sheet(txData);
        wsTx['!cols'] = [
            { wch: 25 },
            { wch: 25 },
            { wch: 15 },
            { wch: 15 },
            { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsTx, "Transaction_Logs");
    }

    const fileName = `NannyLink_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ========================================
// Refresh Functions
// ========================================
function refreshDashboard() {
    fetchStats();
    fetchTransactions();
}

// ========================================
// Mobile Menu Toggle
// ========================================
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
// Event Listeners
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    refreshDashboard();
});

// Make functions globally available
window.refreshDashboard = refreshDashboard;
window.exportDashboardToExcel = exportDashboardToExcel;
window.toggleMobileMenu = toggleMobileMenu;