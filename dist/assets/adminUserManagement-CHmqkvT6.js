import"./modulepreload-polyfill-B5Qt9EMX.js";function i(e,t="success"){const n=document.querySelector(".custom-toast");n&&n.remove();const o=document.createElement("div");o.className=`custom-toast toast-${t}`;let s="✓";t==="error"&&(s="✗"),t==="warning"&&(s="⚠"),t==="info"&&(s="ℹ"),o.innerHTML=`
        <div class="toast-content">
            <span class="toast-icon">${s}</span>
            <span class="toast-message">${l(e)}</span>
        </div>
        <button class="toast-close">&times;</button>
    `,document.body.appendChild(o),o.querySelector(".toast-close").addEventListener("click",()=>{o.classList.add("toast-hide"),setTimeout(()=>o.remove(),300)}),setTimeout(()=>{o.parentElement&&(o.classList.add("toast-hide"),setTimeout(()=>o.remove(),300))},4e3)}function h(){const e=document.createElement("style");e.textContent=`
        .custom-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            min-width: 320px;
            max-width: 450px;
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            z-index: 10000;
            animation: toastSlideIn 0.3s ease;
            border-left: 4px solid;
            font-family: system-ui, -apple-system, 'Inter', sans-serif;
        }
        
        .custom-toast.toast-hide {
            animation: toastSlideOut 0.3s ease forwards;
        }
        
        .toast-content {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
        }
        
        .toast-icon {
            font-size: 20px;
            font-weight: bold;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .toast-message {
            font-size: 14px;
            line-height: 1.5;
            color: #1a1a2e;
        }
        
        .toast-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            padding: 0 4px;
            transition: color 0.2s;
        }
        
        .toast-close:hover {
            color: #333;
        }
        
        /* Success Toast */
        .toast-success {
            border-left-color: #10b981;
            background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
        }
        .toast-success .toast-icon {
            color: #10b981;
        }
        
        /* Error Toast */
        .toast-error {
            border-left-color: #ef4444;
            background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
        }
        .toast-error .toast-icon {
            color: #ef4444;
        }
        
        /* Warning Toast */
        .toast-warning {
            border-left-color: #f59e0b;
            background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
        }
        .toast-warning .toast-icon {
            color: #f59e0b;
        }
        
        /* Info Toast */
        .toast-info {
            border-left-color: #3b82f6;
            background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
        }
        .toast-info .toast-icon {
            color: #3b82f6;
        }
        
        @keyframes toastSlideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes toastSlideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @media (max-width: 640px) {
            .custom-toast {
                left: 16px;
                right: 16px;
                min-width: auto;
                bottom: 16px;
            }
        }
    `,document.head.appendChild(e)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",h):h();let d="VETTED";const p=10;let b=null,u=null,f=null;function m(){return{Authorization:`Bearer ${localStorage.getItem("access_token")}`,"Content-Type":"application/json"}}function T(e){return e.status===401||e.status===403?(localStorage.removeItem("access_token"),window.location.href="/src/views/login.html",!0):!1}const y="https://nannylink-kenya.onrender.com";async function c(e=1){var s;const t=document.getElementById("identity-search").value,n=document.getElementById("role-filter").value;if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}try{const a=await fetch(`${y}/admin/users?page=${e}&search=${t}&role=${n}&status=${d}`,{method:"GET",headers:m()});if(T(a))return;if(!a.ok)throw new Error(`HTTP error! status: ${a.status}`);const r=await a.json();$(r.users),k(r.total_count,e),i(`Loaded ${((s=r.users)==null?void 0:s.length)||0} users`,"success")}catch(a){console.error("Failed to fetch users:",a),i(`Failed to fetch users: ${a.message}`,"error")}}function $(e){const t=document.getElementById("user-container");if(!e||e.length===0){t.innerHTML='<div class="empty-state">No users found.</div>';return}let n=`
        <div class="table-container">
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User Identity</th>
                            <th>Contact</th>
                            <th>Role Type</th>
                            <th>Status</th>
                            <th class="text-right">Management</th>
                        </tr>
                    </thead>
                    <tbody>
    `;e.forEach(o=>{const s=d==="VETTED",a=s?"vetted":"pending",r=s?"verified":"pending",g=d,E=s?"status-vetted":"status-pending";n+=`
            <tr class="user-table-row">
                <td class="user-identity-cell">
                    <div class="user-identity-table">
                        <div class="user-avatar-table">
                            <img src="${o.profile_photo_url||"https://ui-avatars.com/api/?name="+encodeURIComponent(o.name)}" alt="${l(o.name)}">
                            <div class="status-dot ${a}"></div>
                        </div>
                        <div class="user-info-table">
                            <h4>${l(o.name)}</h4>
                            <p class="user-date-table">Joined ${new Date(o.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </td>
                <td class="user-contact-cell">
                    <span class="contact-info">${l(o.phone||"N/A")}</span>
                </td>
                <td class="user-role-cell">
                    <span class="role-badge-table">${l(o.role)}</span>
                </td>
                <td class="user-status-cell">
                    <span class="status-badge-table ${E}">
                        <span class="material-symbols-outlined">${r}</span>
                        ${l(g)}
                    </span>
                </td>
                <td class="user-actions-cell">
                    <div class="action-buttons">
                        ${s?"":`<button onclick="verifyUser('${o.id}')" class="btn-verify-table">Verify</button>`}
                        <button onclick="openDeleteModal('${o.id}')" class="btn-delete-table">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `}),n+=`
                    </tbody>
                </table>
            </div>
        </div>
    `,t.innerHTML=n}function k(e,t){const n=Math.max(1,Math.ceil(e/p));document.getElementById("total-records").innerText=e;const o=e===0?0:(t-1)*p+1,s=Math.min(t*p,e);document.getElementById("record-range").innerText=e===0?"0-0":`${o}-${s}`;let a="";for(let r=1;r<=n;r++)a+=`
            <button onclick="fetchUsers(${r})" class="page-number ${r===t?"active":""}">
                ${r}
            </button>
        `;document.getElementById("pagination-controls").innerHTML=a}function l(e){return e?String(e).replace(/[&<>]/g,function(t){return t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t}):""}function I(e){u=e,document.getElementById("verify-modal").classList.remove("hidden"),document.body.style.overflow="hidden"}function w(){document.getElementById("verify-modal").classList.add("hidden"),document.body.style.overflow="auto",u=null}async function L(){if(!u)return;localStorage.getItem("access_token");const e=document.getElementById("confirm-verify-btn"),t=e.innerText;e.innerText="Verifying...",e.disabled=!0;try{const n=await fetch(`${y}/admin/users/${u}/verify`,{method:"PATCH",headers:m()});if(n.ok)w(),c(1),i("User successfully verified!","success");else{const o=await n.json();i(`Verification failed: ${o.detail||"Unknown error"}`,"error")}}catch{i("Network error. Please try again.","error")}finally{e.innerText=t,e.disabled=!1}}function B(e){f=e,document.getElementById("delete-modal").classList.remove("hidden"),document.body.style.overflow="hidden"}function v(){document.getElementById("delete-modal").classList.add("hidden"),document.body.style.overflow="auto",f=null}async function S(){if(!f)return;localStorage.getItem("access_token");const e=document.getElementById("confirm-delete-btn");e.disabled=!0,e.innerText="Purging...";try{const t=await fetch(`${y}/admin/${f}`,{method:"DELETE",headers:m()});if(t.ok)v(),c(1),i("User account successfully deleted","success");else{const n=await t.json();i(`Delete failed: ${n.detail||"Unknown error"}`,"error")}}catch{i("Network error occurred.","error")}finally{e.disabled=!1,e.innerText="Delete Account"}}function M(){document.getElementById("create-user-modal").classList.remove("hidden"),document.body.style.overflow="hidden"}function x(){document.getElementById("create-user-modal").classList.add("hidden"),document.body.style.overflow="auto",document.getElementById("create-user-form").reset()}async function C(e){const t={name:e.get("name"),email:e.get("email"),phone:e.get("phone")||null,password:e.get("password"),role:e.get("role").toLowerCase()};localStorage.getItem("access_token");const n=document.querySelector('#create-user-form button[type="submit"]');n.disabled=!0,n.innerText="Initializing...";try{const o=await fetch(`${y}/admin/users`,{method:"POST",headers:m(),body:JSON.stringify(t)}),s=await o.json();o.ok?(x(),c(1),i(`Account created successfully for ${t.name||t.email}`,"success")):i(`Error: ${s.detail||"Failed to create account"}`,"error")}catch{i("Connection failed. Please check your network.","error")}finally{n.disabled=!1,n.innerText="Create Account"}}document.addEventListener("DOMContentLoaded",()=>{const e=document.getElementById("identity-search"),t=document.getElementById("role-filter");e&&e.addEventListener("input",a=>{clearTimeout(b),b=setTimeout(()=>c(1),300)}),t&&t.addEventListener("change",()=>c(1)),document.querySelectorAll(".status-btn").forEach(a=>{a.addEventListener("click",r=>{document.querySelectorAll(".status-btn").forEach(g=>{g.classList.remove("active")}),r.currentTarget.classList.add("active"),d=r.currentTarget.dataset.status,c(1)})});const n=document.getElementById("create-user-form");n&&n.addEventListener("submit",async a=>{a.preventDefault();const r=new FormData(a.target);await C(r)});const o=document.getElementById("confirm-verify-btn");o&&o.addEventListener("click",L);const s=document.getElementById("confirm-delete-btn");s&&s.addEventListener("click",S),c(1)});function D(){const e=document.querySelector(".sidebar");e&&(e.style.display==="flex"?e.style.display="none":(e.style.display="flex",e.style.position="fixed",e.style.top="0",e.style.left="0",e.style.zIndex="100"))}function U(){alert("Notification feature coming soon.")}window.fetchUsers=c;window.verifyUser=I;window.closeVerifyModal=w;window.openDeleteModal=B;window.closeDeleteModal=v;window.openCreateModal=M;window.closeCreateModal=x;window.toggleMobileMenu=D;window.showNotifications=U;
