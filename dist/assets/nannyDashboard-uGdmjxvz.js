import"./modulepreload-polyfill-B5Qt9EMX.js";const v="https://nannylink-kenya.onrender.com",u=`${v}/nannies`;let m=[];function h(){return{Authorization:`Bearer ${localStorage.getItem("access_token")}`,"Content-Type":"application/json",Accept:"application/json"}}function f(t){return t.status===401?(localStorage.removeItem("access_token"),window.location.href="/src/views/login.html",!0):!1}function b(){let t=document.getElementById("toastContainer");return t||(t=document.createElement("div"),t.id="toastContainer",t.className="toast-container",document.body.appendChild(t)),t}function _(t,e="success",o=4e3){const s=b(),n=document.createElement("div");n.className=`toast ${e}`;let a="check_circle",i="Success";return e==="error"&&(a="error",i="Error"),n.innerHTML=`
        <span class="toast-icon material-symbols-outlined">${a}</span>
        <div class="toast-content">
            <p class="toast-label">${i}</p>
            <p class="toast-message">${t}</p>
        </div>
    `,s.appendChild(n),setTimeout(()=>{n.classList.add("fade-out"),setTimeout(()=>n.remove(),300)},o),n}function p(t){const e=(t||"").toLowerCase().trim();return e==="completed"?{label:"Payment Completed",class:"status-completed"}:e==="awaiting_payment"?{label:"Awaiting Payment",class:"status-awaiting"}:{label:e.replace(/_/g," ")||"Pending",class:"status-pending"}}async function w(){if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}const e=h();try{const o=await fetch(`${u}/profile/me`,{headers:e});if(f(o))return;const s=await o.json();o.ok&&E(s);const n=await fetch(`${u}/connections`,{headers:e});if(f(n))return;const a=await n.json();n.ok&&(m=Array.isArray(a)?a:a.data||[],I(m))}catch(o){console.error("Dashboard Sync Error:",o),_("Failed to load dashboard data","error")}}function E(t){const e="https://via.placeholder.com/150?text=Profile",o=document.getElementById("hero_profile_img");o&&(o.src=t.profile_photo_url||e);const s=document.getElementById("nanny_name");s&&(s.innerText=t.name||t.full_name||"Nanny");const n=document.getElementById("vetting_badge"),a=document.getElementById("vetting_text"),i=t.vetting_status||t.status||"pending",c=String(i).toLowerCase();c==="approved"?(n&&(n.className="badge badge-approved",n.innerText="VERIFIED"),a&&(a.innerText="Profile Approved")):c==="rejected"?(n&&(n.className="badge badge-rejected",n.innerText="REJECTED"),a&&(a.innerText="Profile Rejected")):(n&&(n.className="badge badge-pending",n.innerText="IN REVIEW"),a&&(a.innerText="Checking Credentials"));const l=t.availability||"Not Set",d=document.getElementById("availability_text");d&&(d.innerText=l.replace(/_/g," "))}function I(t){const e=document.getElementById("activity_list"),o=document.getElementById("connection_count"),s=document.getElementById("contract_count");o&&(o.innerText=t.length);const n=t.filter(a=>String(a.status).toLowerCase()==="completed").length;s&&(s.innerText=n),e&&(t.length>0?e.innerHTML=t.slice(0,3).map(a=>{var l;const i=((l=a.family)==null?void 0:l.name)||"Family Connection",c=p(a.status);return`
                <div class="activity-item">
                    <div class="activity-left">
                        <div class="activity-icon">
                            <span class="material-symbols-outlined">family_restroom</span>
                        </div>
                        <div class="activity-info">
                            <p class="family-name">${r(i)}</p>
                            <span class="activity-status ${c.class}">
                                ${r(c.label)}
                            </span>
                        </div>
                    </div>
                    <button onclick="openModal('${a.id}')" class="activity-action">
                        <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            `}).join(""):e.innerHTML='<p class="empty-message">Waiting for your first match...</p>')}function C(t){var l,d;const e=m.find(y=>String(y.id)===String(t));if(!e)return;const o=((l=e.family)==null?void 0:l.name)||"Valued Family",s=((d=e.family)==null?void 0:d.household_location)||"Nairobi Area",n=p(e.status),a=new Date(e.created_at||Date.now()).toLocaleDateString(),i=document.getElementById("modal-content");if(!i)return;i.innerHTML=`
        <div class="modal-family-card">
            <div class="modal-family-icon">
                <span class="material-symbols-outlined">family_restroom</span>
            </div>
            <div>
                <h3 class="modal-family-name">${r(o)}</h3>
                <p class="modal-family-date">Matched: ${r(a)}</p>
            </div>
        </div>
        <div class="modal-stats-grid">
            <div class="modal-stat-card">
                <p class="modal-stat-label">Status</p>
                <span class="modal-status-badge ${n.class}">
                    ${r(n.label)}
                </span>
            </div>
            <div class="modal-stat-card">
                <p class="modal-stat-label">Location</p>
                <p class="modal-stat-value">${r(s)}</p>
            </div>
        </div>
    `;const c=document.getElementById("connection-modal");c&&(c.classList.remove("hidden"),document.body.classList.add("modal-active"))}function g(){const t=document.getElementById("connection-modal");t&&t.classList.add("hidden"),document.body.classList.remove("modal-active")}function r(t){return t?String(t).replace(/[&<>]/g,function(e){return e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e}):""}document.addEventListener("DOMContentLoaded",()=>{if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}w()});document.addEventListener("keydown",t=>{t.key==="Escape"&&g()});window.openModal=C;window.closeModal=g;
