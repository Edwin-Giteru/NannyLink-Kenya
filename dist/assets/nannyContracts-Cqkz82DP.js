import"./modulepreload-polyfill-B5Qt9EMX.js";const T="https://nannylink-kenya.onrender.com",$="/contracts/me";let d=null,y=[];function I(){return{Authorization:`Bearer ${localStorage.getItem("access_token")}`,"Content-Type":"application/json",Accept:"application/json"}}function S(e){return e.status===401?(localStorage.removeItem("access_token"),window.location.href="/src/views/login.html",!0):!1}function H(){let e=document.getElementById("toastContainer");return e||(e=document.createElement("div"),e.id="toastContainer",e.className="toast-container",document.body.appendChild(e)),e}function r(e,t="success",n=4e3){const a=H(),s=document.createElement("div");s.className=`toast ${t}`;let o="check_circle",i="Success";return t==="error"&&(o="error",i="Error"),s.innerHTML=`
        <span class="toast-icon material-symbols-outlined">${o}</span>
        <div class="toast-content">
            <p class="toast-label">${i}</p>
            <p class="toast-message">${e}</p>
        </div>
    `,a.appendChild(s),setTimeout(()=>{s.classList.add("fade-out"),setTimeout(()=>s.remove(),300)},n),s}async function C(){if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}const t=I();try{const n=await fetch(`${T}${$}`,{headers:t});if(S(n))return;if(n.ok){const a=await n.json();y=Array.isArray(a)?a:a.data||[],x(y)}else console.error("Contract Fetch Failed:",n.status),r("Failed to load contracts","error")}catch(n){console.error("Load Data Error:",n),r("Network error. Please try again.","error")}}function x(e){const t=document.getElementById("pending-list"),n=document.getElementById("active-list");if(!(!t||!n)){if(t.innerHTML="",n.innerHTML="",e.length===0){t.innerHTML='<p class="empty-message">No contracts found.</p>';return}e.forEach(a=>{var l;const s=((l=a.acceptance)==null?void 0:l.nanny_accepted)||a.nanny_accepted,o=a.id?a.id.substring(0,8).toUpperCase():"NEW",i=document.createElement("div");i.className=`contract-item ${s?"active":"pending"}`,i.onclick=()=>k(a),i.innerHTML=`
            <div class="contract-header">
                <div>
                    <h3 class="contract-title">Employment Agreement</h3>
                    <p class="contract-ref">REF: NL-${c(o)}</p>
                </div>
                <span class="contract-icon material-symbols-outlined ${s?"active":"pending"}">
                    ${s?"verified":"pending_actions"}
                </span>
            </div>
        `,(s?n:t).appendChild(i)})}}function k(e){var E,L,b;d=e.id;const t=e.match||{},n=t.family||{},a=t.nanny||{},s=document.getElementById("viewer-empty-state"),o=document.getElementById("contract-viewer");s&&s.classList.add("hidden"),o&&o.classList.remove("hidden");let i=e.contract_text||"",l="Standard childcare services as per NannyLink guidelines.",f="Standard employment terms apply.";if(i.includes("HOUSEHOLD EXPECTATIONS")){const w=i.split("HOUSEHOLD EXPECTATIONS");if(w[1]){const g=w[1].split("SPECIAL JOB REQUIREMENTS");l=g[0].trim().replace(/-{2,}/g,""),g[1]&&(f=g[1].split("GENERAL PROVISIONS")[0].trim().replace(/-{2,}/g,""))}}const A=e.created_at?new Date(e.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):new Date().toLocaleDateString(),N=n.name||"Registered Client",B=n.household_location||"Address on file",D=a.full_name||a.name||"Caregiver Professional",_=e.id?`NL-${e.id.substring(0,8).toUpperCase()}`:"NEW",P=`
        <div class="parties-grid">
            <div>
                <p class="party-label">Employer (Family)</p>
                <p class="party-name">${c(N)}</p>
                <p class="party-location">${c(B)}</p>
            </div>
            <div>
                <p class="party-label">Employee (Nanny)</p>
                <p class="party-name">${c(D)}</p>
                <p class="party-location">Verified Professional</p>
            </div>
        </div>

        <div class="terms-section">
            <h3 class="section-title">Terms & Duties</h3>
            <div style="margin-bottom: 24px;">
                <p class="terms-subtitle">Household Expectations</p>
                <p class="terms-content">${c(l)}</p>
            </div>
            <div>
                <p class="terms-subtitle">Special Job Requirements</p>
                <p class="terms-content">${c(f)}</p>
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
    `;document.getElementById("contract-ref").innerText=`Reference: ${_}`,document.getElementById("contract-date-display").innerText=A,document.getElementById("contract-body").innerHTML=P;const h=document.getElementById("fam-icon"),v=document.getElementById("nan-icon"),m=document.getElementById("fam-date"),p=document.getElementById("nan-date");(E=e.acceptance)!=null&&E.family_accepted?(h.classList.add("signed"),m.innerText="Digitally Signed",m.classList.add("signed")):(h.classList.remove("signed"),m.innerText="Pending...",m.classList.remove("signed")),(L=e.acceptance)!=null&&L.nanny_accepted?(v.classList.add("signed"),p.innerText="Digitally Signed",p.classList.add("signed")):(v.classList.remove("signed"),p.innerText="Pending...",p.classList.remove("signed"));const u=document.getElementById("contract-actions");u&&((b=e.acceptance)!=null&&b.nanny_accepted?u.innerHTML=`
                <div class="executed-badge">
                    <span class="material-symbols-outlined">verified</span>
                    Agreement Fully Executed
                </div>
            `:u.innerHTML=`
                <div class="consent-wrapper">
                    <input type="checkbox" id="consent" class="consent-checkbox">
                    <label for="consent">I have read and agree to all employment terms.</label>
                </div>
                <button id="sign-btn" onclick="signContract()" class="sign-action-btn">
                    <span class="material-symbols-outlined">draw</span>
                    Accept Agreement
                </button>
            `)}async function R(){const e=document.getElementById("consent");if(!e||!e.checked){r("Please confirm you have read and agree to the terms.","error");return}localStorage.getItem("access_token");const t=document.getElementById("sign-btn");t&&(t.disabled=!0,t.innerHTML='<span class="material-symbols-outlined">sync</span> Processing...');try{const n=await fetch(`${T}/contracts/${d}/sign`,{method:"POST",headers:I()});if(S(n))return;if(n.ok){r("Contract signed successfully!","success"),await C();const a=y.find(s=>s.id===d);a&&k(a)}else{const a=await n.json();r(a.detail||"Signature failed. Please try again.","error"),t&&(t.disabled=!1,t.innerHTML='<span class="material-symbols-outlined">draw</span> Accept Agreement')}}catch(n){console.error(n),r("Network error. Please try again.","error"),t&&(t.disabled=!1,t.innerHTML='<span class="material-symbols-outlined">draw</span> Accept Agreement')}}function M(){const e=document.getElementById("pdf-content");if(!e)return;const n={margin:10,filename:`NannyLink_Agreement_${d?d.substring(0,8):"Contract"}.pdf`,image:{type:"jpeg",quality:.98},html2canvas:{scale:3,useCORS:!0},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}};html2pdf().set(n).from(e).save()}function c(e){return e?String(e).replace(/[&<>]/g,function(t){return t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t}):""}document.addEventListener("DOMContentLoaded",()=>{if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}C()});window.signContract=R;window.downloadPDF=M;
