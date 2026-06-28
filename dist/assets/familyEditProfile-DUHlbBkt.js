import"./modulepreload-polyfill-B5Qt9EMX.js";const c="https://nannylink-kenya.onrender.com",m=localStorage.getItem("access_token");m||(window.location.href="/src/views/login.html");function p(){return{Authorization:`Bearer ${m}`,"Content-Type":"application/json"}}async function h(){try{const e=await fetch(`${c}/families/profile/me`,{headers:p()});if(e.status===401){localStorage.removeItem("access_token"),window.location.href="/src/views/login.html";return}if(!e.ok)throw new Error("Failed to load profile");const t=await e.json(),o=document.getElementById("name"),n=document.getElementById("household_location"),r=document.getElementById("household_details");if(o&&(o.value=t.name||""),n&&(n.value=t.household_location||""),r&&(r.value=t.household_details||""),t.name){const s=t.name.split(" ").map(i=>i[0]).join("").toUpperCase().substring(0,2),l=document.getElementById("initials_placeholder");l&&(l.innerText=s)}if(t.profile_photo_url){const a=document.getElementById("profile_preview"),s=document.getElementById("initials_placeholder");a&&s&&(a.src=t.profile_photo_url,a.classList.remove("hidden"),s.classList.add("hidden"))}}catch(e){console.error("Load error:",e),d("Failed to load profile data. Please refresh the page.")}}async function f(e){e.preventDefault();const t=document.getElementById("save_btn"),o=document.getElementById("btn_text"),n=document.getElementById("spinner");t.disabled=!0,o&&(o.innerText="Updating..."),n&&n.classList.remove("hidden");const r=document.getElementById("name"),a=document.getElementById("household_location"),s=document.getElementById("household_details"),l={name:r?r.value:"",household_location:a?a.value:"",household_details:s?s.value:""};try{const i=await fetch(`${c}/families/profile/me`,{method:"PATCH",headers:p(),body:JSON.stringify(l)});if(i.status===401){localStorage.removeItem("access_token"),window.location.href="/src/views/login.html";return}if(i.ok)window.location.href="familydashboard.html";else{const u=await i.json();d(`Update failed: ${u.detail||"Unknown error"}`)}}catch(i){console.error("Update error:",i),d("Network error. Is the backend running?")}finally{t.disabled=!1,o&&(o.innerText="Save Profile Changes"),n&&n.classList.add("hidden")}}function d(e){const t=document.getElementById("toastContainer")||g(),o=document.createElement("div");o.className="toast error",o.innerHTML=`
        <span class="toast-icon material-symbols-outlined">error</span>
        <div class="toast-content">
            <p class="toast-label">Error</p>
            <p class="toast-message">${e}</p>
        </div>
    `,t.appendChild(o),setTimeout(()=>{o.classList.add("fade-out"),setTimeout(()=>o.remove(),300)},4e3)}function g(){const e=document.createElement("div");if(e.id="toastContainer",e.className="toast-container",document.body.appendChild(e),!document.querySelector("#toast-styles")){const t=document.createElement("style");t.id="toast-styles",t.textContent=`
            .toast-container {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            }
            .toast {
                background-color: var(--error, #ef4444);
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
                animation: slideInDown 0.3s ease forwards;
                pointer-events: auto;
            }
            .toast .toast-icon {
                font-size: 20px;
            }
            .toast .toast-content {
                flex: 1;
            }
            .toast .toast-label {
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                opacity: 0.8;
                margin-bottom: 2px;
            }
            .toast .toast-message {
                font-weight: 600;
                font-size: 0.875rem;
            }
            .toast.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }
            @keyframes slideInDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes fadeOut {
                to {
                    opacity: 0;
                    transform: translateY(-10px);
                }
            }
        `,document.head.appendChild(t)}return e}document.addEventListener("DOMContentLoaded",()=>{if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}h();const e=document.getElementById("edit_family_form");e&&e.addEventListener("submit",f)});window.updateProfile=f;
