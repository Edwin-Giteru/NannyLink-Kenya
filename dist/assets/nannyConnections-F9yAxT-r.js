import"./modulepreload-polyfill-B5Qt9EMX.js";const p="https://nannylink-kenya.onrender.com",y=`${p}/connections`;let l=[];function h(){return{Authorization:`Bearer ${localStorage.getItem("access_token")}`,"Content-Type":"application/json",Accept:"application/json"}}function v(e){return e.status===401?(localStorage.removeItem("access_token"),window.location.href="/src/views/login.html",!0):!1}function g(){let e=document.getElementById("toastContainer");return e||(e=document.createElement("div"),e.id="toastContainer",e.className="toast-container",document.body.appendChild(e)),e}function d(e,t="success",n=4e3){const o=g(),a=document.createElement("div");a.className=`toast ${t}`;let s="check_circle",i="Success";return t==="error"&&(s="error",i="Error"),a.innerHTML=`
        <span class="toast-icon material-symbols-outlined">${s}</span>
        <div class="toast-content">
            <p class="toast-label">${i}</p>
            <p class="toast-message">${e}</p>
        </div>
    `,o.appendChild(a),setTimeout(()=>{a.classList.add("fade-out"),setTimeout(()=>a.remove(),300)},n),a}const m=["Your next great family connection is just one click away.","Professional care makes a world of difference.","Consistency is the key to building trust with families.","Showcase your skills and let your profile do the talking.","Great nannies build great futures for children."];function w(){const e=document.getElementById("catchy-phrase");if(!e)return;let t=0;setInterval(()=>{t=(t+1)%m.length,e.style.opacity="0",setTimeout(()=>{e.innerText=m[t],e.style.opacity="1"},500)},6e3)}async function k(){if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}try{const t=await fetch(`${y}/`,{headers:h()});if(v(t))return;t.ok?(l=await t.json(),L(l)):d("Failed to load connections","error")}catch(t){console.error("Error:",t),d("Network error. Please try again.","error")}}function L(e){const t=document.getElementById("pending-list"),n=document.getElementById("paid-list");if(!t||!n)return;t.innerHTML="",n.innerHTML="";let o=0;e.forEach(s=>{const i=(s.status||"").toLowerCase();i==="awaiting_payment"?(o++,t.innerHTML+=_(s)):i==="completed"&&(n.innerHTML+=b(s))});const a=document.getElementById("pending-count");a&&(a.innerText=o),o===0&&(t.innerHTML='<div class="empty-state">Scanning for new families...</div>')}function _(e){const t=e.family||{},n=c(t.name||"New Family"),o=c(t.location||"Njoro District"),a=t.profile_picture_url||"https://via.placeholder.com/150";return`
        <div class="connection-card" onclick="openModal('${e.id}')">
            <div class="card-header">
                <img class="card-avatar" src="${a}" alt="${n}">
                <div class="card-info">
                    <h3>${n}</h3>
                    <p class="card-location">
                        <span class="material-symbols-outlined">location_on</span> ${o}
                    </p>
                </div>
            </div>
            <div class="card-footer">
                <span class="footer-label">Family is Reviewing</span>
                <span class="footer-icon material-symbols-outlined">arrow_forward_ios</span>
            </div>
        </div>
    `}function b(e){const t=e.family||{},n=c(t.name||"Family"),o=e.created_at?new Date(e.created_at).getFullYear():new Date().getFullYear();return`
        <div class="completed-row">
            <div class="row-left">
                <div class="row-icon">
                    <span class="material-symbols-outlined">verified</span>
                </div>
                <div class="row-info">
                    <h4>${n}</h4>
                    <p class="row-date">Partnered since ${o}</p>
                </div>
            </div>
            <button class="row-action" onclick="event.stopPropagation()">
                <span class="material-symbols-outlined">more_vert</span>
            </button>
        </div>
    `}function C(e){const t=l.find(f=>f.id===e);if(!t)return;const n=t.family||{},o=c(n.name||"New Family"),a=c(n.location||"Nakuru, Kenya"),s=n.profile_picture_url||"https://via.placeholder.com/150",i=document.getElementById("modal-content");if(!i)return;i.innerHTML=`
        <div class="modal-family-card">
            <img class="modal-family-avatar" src="${s}" alt="${o}">
            <div>
                <h4 class="modal-family-name">${o}</h4>
                <p class="modal-family-location">${a}</p>
            </div>
        </div>
        <div class="modal-status-row">
            <span class="modal-status-label">Status</span>
            <span class="modal-status-badge">Pending Payment</span>
        </div>
        <p class="modal-message">
            "This family has shortlisted you. Once they complete the booking process, we will generate your contract automatically."
        </p>
    `;const r=document.getElementById("family-modal");r&&(r.classList.remove("hidden"),document.body.style.overflow="hidden")}function u(){const e=document.getElementById("family-modal");e&&(e.classList.add("hidden"),document.body.style.overflow="auto")}function c(e){return e?String(e).replace(/[&<>]/g,function(t){return t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t}):""}document.addEventListener("DOMContentLoaded",()=>{if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}k(),w()});document.addEventListener("keydown",e=>{e.key==="Escape"&&u()});window.openModal=C;window.closeModal=u;
