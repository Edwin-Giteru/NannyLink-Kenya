// ========================================
// DOM Elements
// ========================================
const sideNav = document.getElementById('side-nav');
const mobileFab = document.getElementById('mobile-fab');
const skillSearch = document.getElementById('skill-search');
const locationSearch = document.getElementById('location-search');
const caregiverGrid = document.getElementById('caregiverGrid');
const paginationWrapper = document.getElementById('pagination-controls');

let allNannies = [];
let filteredNannies = [];
let currentPage = 1;
const itemsPerPage = 6;

// ========================================
// Floating Navigation Visibility
// ========================================
function handleScroll() {
    if (window.scrollY > 200) {
        sideNav?.classList.add('visible');
        mobileFab?.classList.add('visible');
    } else {
        sideNav?.classList.remove('visible');
        mobileFab?.classList.remove('visible');
    }
}

window.addEventListener('scroll', handleScroll);
handleScroll();

// ========================================
// FAQ Accordion
// ========================================
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const faqItem = button.closest('.faq-item');
        const isActive = faqItem.classList.contains('active');
        
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

async function fetchStats() {
    try {
        const response = await fetch('http://127.0.0.1:8000/stats/');
        
        if (response.ok) {
            const data = await response.json();
            console.log("Fetched stats:", data);
            
            const statNannies = document.getElementById('stat-nannies');
            const statFamilies = document.getElementById('stat-families');
            const statMatches = document.getElementById('stat-matches');
            
            if (statNannies) {
                const nannyCount = data.nannies || 0;
                animateNumber(statNannies, nannyCount);
            }
            
            if (statFamilies) {
                const familyCount = data.families || 0;
                animateNumber(statFamilies, familyCount);
            }
            
            if (statMatches) {
                const matchCount = data.matches || 0;
                animateNumber(statMatches, matchCount);
            }
        } else {
            console.error("Stats API returned:", response.status);
            // Fallback to static numbers if API fails
            useFallbackStats();
        }
    } catch (error) {
        console.error("Stats fetch error:", error);
        // Fallback to static numbers if API fails
        useFallbackStats();
    }
}

function useFallbackStats() {
    const statNannies = document.getElementById('stat-nannies');
    const statFamilies = document.getElementById('stat-families');
    const statMatches = document.getElementById('stat-matches');
    
    if (statNannies) animateNumber(statNannies, 1240);
    if (statFamilies) animateNumber(statFamilies, 850);
    if (statMatches) animateNumber(statMatches, 432);
}

function animateNumber(element, target) {
    if (!element) return;
    
    let current = 0;
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = target / steps;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
            element.innerText = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.innerText = Math.floor(current).toLocaleString();
        }
    }, duration / steps);
}

async function fetchNannies() {
    try {
        // Public endpoint - no authentication required
        const response = await fetch('http://127.0.0.1:8000/nannies/?skip=0&limit=50');
        
        if (response.ok) {
            const data = await response.json();
            console.log("Fetched nannies:", data);
            
            if (Array.isArray(data) && data.length > 0) {
                allNannies = data.map(nanny => ({
                    id: nanny.id,
                    name: nanny.full_name || nanny.name,
                    years_experience: nanny.experience_years || 0,
                    preferred_location: nanny.preferred_location || nanny.current_location || "Nairobi",
                    profile_photo_url: nanny.profile_image,
                    skills: nanny.skills || "",
                    vetting_status: nanny.status
                }));
                
                applyFilters();
                return;
            }
        } else {
            console.log("Nannies API response not OK:", response.status);
        }
    } catch (error) {
        console.error("Public endpoint error:", error);
    }
    
    // Fallback to mock data only if API fails completely
    renderMockNannies();
}

function renderMockNannies() {
    allNannies = [
        { id: 1, name: "Mary Wanjiku", years_experience: 5, preferred_location: "Nairobi", profile_photo_url: "", skills: "Childcare, First Aid", vetting_status: "approved" },
        { id: 2, name: "Faith Muthoni", years_experience: 3, preferred_location: "Mombasa", profile_photo_url: "", skills: "Tutoring, Cooking", vetting_status: "approved" },
        { id: 3, name: "Grace Akinyi", years_experience: 7, preferred_location: "Kisumu", profile_photo_url: "", skills: "Special Needs, Newborn Care", vetting_status: "approved" },
        { id: 4, name: "Lucy Wambui", years_experience: 4, preferred_location: "Nakuru", profile_photo_url: "", skills: "Montessori, Activities", vetting_status: "approved" },
        { id: 5, name: "Elena Rodriguez", years_experience: 8, preferred_location: "Nairobi", profile_photo_url: "", skills: "Bilingual, Early Childhood", vetting_status: "approved" },
        { id: 6, name: "David Chen", years_experience: 6, preferred_location: "Mombasa", profile_photo_url: "", skills: "Cooking, Tutoring", vetting_status: "approved" }
    ];
    applyFilters();
}

function applyFilters() {
    const skillTerm = skillSearch?.value.toLowerCase() || '';
    const locationTerm = locationSearch?.value.toLowerCase() || '';
    
    filteredNannies = allNannies.filter(nanny => {
        const skills = (nanny.skills || "").toLowerCase();
        const location = (nanny.preferred_location || "").toLowerCase();
        const name = (nanny.name || "").toLowerCase();
        
        const matchesSkill = !skillTerm || skills.includes(skillTerm) || name.includes(skillTerm);
        const matchesLocation = !locationTerm || location.includes(locationTerm);
        
        return matchesSkill && matchesLocation;
    });
    
    currentPage = 1;
    renderNanniesGrid();
    setupPagination();
}

function renderNanniesGrid() {
    if (!caregiverGrid) return;
    
    if (filteredNannies.length === 0) {
        caregiverGrid.innerHTML = `<div class="empty-state">No nannies currently available. Check back soon!</div>`;
        return;
    }
    
    const start = (currentPage - 1) * itemsPerPage;
    const pageNannies = filteredNannies.slice(start, start + itemsPerPage);
    
    caregiverGrid.innerHTML = pageNannies.map(nanny => {
        const name = nanny.name || "Verified Nanny";
        const exp = nanny.years_experience || 0;
        const location = nanny.preferred_location || "Nairobi";
        // Use a reliable placeholder that works offline
        const photo = nanny.profile_photo_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f1f5f9'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%2364748b' font-size='40' dy='.3em'%3E👤%3C/text%3E%3C/svg%3E`;
        const rate = 250 + (exp * 50);
        
        return `
            <div class="nanny-card">
                <div class="nanny-image">
                    <img src="${photo}" alt="${escapeHtml(name)}" 
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27 viewBox=%270 0 100 100%27%3E%3Crect width=%27100%27 height=%27100%27 fill=%27%23f1f5f9%27/%3E%3Ctext x=%2750%27 y=%2755%27 text-anchor=%27middle%27 fill=%27%2364748b%27 font-size=%2740%27 dy=%27.3em%27%3E👤%3C/text%3E%3C/svg%3E'">
                    <div class="nanny-rating">
                        <span class="material-symbols-outlined">star</span>
                        <span>4.8</span>
                    </div>
                </div>
                <div class="nanny-info">
                    <div class="nanny-header">
                        <h3 class="nanny-name">${escapeHtml(name)}</h3>
                        <span class="nanny-rate">KES ${rate}/day</span>
                    </div>
                    <div class="nanny-location">
                        <span class="material-symbols-outlined">location_on</span>
                        <span>${escapeHtml(location)}</span>
                    </div>
                    <div class="nanny-tags">
                        <span class="tag">${exp} Yrs Exp</span>
                        <span class="tag tag-emerald">Vetted</span>
                    </div>
                    <a href="../frontend/src/views/login.html" class="nanny-profile-link">View Profile</a>
                </div>
            </div>
        `;
    }).join('');
}

function setupPagination() {
    if (!paginationWrapper) return;
    
    const totalPages = Math.ceil(filteredNannies.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationWrapper.innerHTML = '';
        return;
    }
    
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    paginationWrapper.innerHTML = html;
    
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            renderNanniesGrid();
            setupPagination();
            window.scrollTo({ top: document.getElementById('nannies').offsetTop - 100, behavior: 'smooth' });
        });
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

if (skillSearch) skillSearch.addEventListener('input', applyFilters);
if (locationSearch) locationSearch.addEventListener('input', applyFilters);

fetchStats();
fetchNannies();