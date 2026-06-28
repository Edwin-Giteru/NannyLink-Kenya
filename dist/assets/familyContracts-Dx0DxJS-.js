import"./modulepreload-polyfill-B5Qt9EMX.js";const k="https://nannylink-kenya.onrender.com",f=`${k}/contracts`,O=`${k}/connections`;let r=[],p=[];function u(){return{Authorization:`Bearer ${localStorage.getItem("access_token")}`,"Content-Type":"application/json",Accept:"application/json"}}function g(e){return e.status===401?(localStorage.removeItem("access_token"),window.location.href="/src/views/login.html",!0):!1}function R(){let e=document.getElementById("toastContainer");return e||(e=document.createElement("div"),e.id="toastContainer",e.className="toast-container",document.body.appendChild(e)),e}function m(e,n="success",a=4e3){const t=R(),s=document.createElement("div");s.className=`toast ${n}`;let i="check_circle",c="Success";return n==="error"&&(i="error",c="Error"),s.innerHTML=`
        <span class="toast-icon material-symbols-outlined">${i}</span>
        <div class="toast-content">
            <p class="toast-label">${c}</p>
            <p class="toast-message">${e}</p>
        </div>
    `,t.appendChild(s),setTimeout(()=>{s.classList.add("fade-out"),setTimeout(()=>s.remove(),300)},a),s}async function B(){if(!localStorage.getItem("access_token")){window.location.href="/src/views/login.html";return}try{const[n,a]=await Promise.all([fetch(`${O}/`,{headers:u()}),fetch(`${f}/me`,{headers:u()})]);if(g(n)||g(a))return;const t=await n.json();t&&typeof t=="object"&&!Array.isArray(t)?r=t.nannies||[]:r=t||[],p=await a.json(),y()}catch(n){console.error("Initialization Error:",n),m("Failed to load connections. Please refresh.","error")}}function y(){const e=document.getElementById("matchList");if(e){if(r.length===0){e.innerHTML='<p class="empty-message">No active connections</p>';return}e.innerHTML=r.map(n=>{var i,c;const a=p.find(l=>l.match_id===n.id),t=((i=n.nanny)==null?void 0:i.full_name)||((c=n.nanny)==null?void 0:c.name)||"Caregiver",s=n.status||"Connected";return`
            <div onclick="selectMatch('${n.id}')" class="connection-card">
                <div class="connection-header">
                    <span class="connection-name">${o(t)}</span>
                    ${a?'<span class="verified-icon material-symbols-outlined">verified</span>':""}
                </div>
                <p class="connection-status">${o(s)}</p>
            </div>
        `}).join("")}}function F(e){var i,c;const n=r.find(l=>l.id===e);if(!n)return;const a=p.find(l=>l.match_id===e),t=document.getElementById("workspace"),s=((i=n.nanny)==null?void 0:i.full_name)||((c=n.nanny)==null?void 0:c.name)||n.full_name||n.name||"Caregiver";a?v(a,n):t.innerHTML=`
            <div class="contract-generator">
                <h2 class="generator-title">New Agreement</h2>
                <p class="generator-subtitle">For: ${o(s)}</p>
                <textarea id="customTerms" class="custom-terms" rows="6"
                    placeholder="Specify house rules, special needs, working hours..."></textarea>
                <button onclick="generateNow('${e}')" id="genBtn" class="generate-btn">Generate Formal Contract</button>
            </div>`}async function x(e){localStorage.getItem("access_token");const n=document.getElementById("customTerms").value,a=document.getElementById("genBtn");a.innerHTML="Processing...",a.disabled=!0;try{const t=await fetch(`${f}/generate/${e}?custom_terms=${encodeURIComponent(n)}`,{method:"POST",headers:u()});if(g(t))return;const s=await t.json();if(!t.ok)throw new Error(s.detail||"Failed to generate");p.push(s),y(),v(s,r.find(i=>i.id===e)),m("Contract generated successfully!","success")}catch(t){m(`Error: ${t.message}`,"error"),a.innerHTML="Generate Formal Contract",a.disabled=!1}}function v(e,n){var h,E,w,S,b,T,N,_,$,C,L,I,P;const a=document.getElementById("workspace");let t=e.contract_text||"";function s(d){return d?d.replace(/^[-_=\s]+/gm,"").replace(/\s*[-_]+\s*/g," ").replace(/\s+/g," ").trim():""}let i="Standard childcare services as per NannyLink guidelines.";if(t.includes("HOUSEHOLD DETAILS & EXPECTATIONS")&&t.includes("SPECIAL JOB REQUIREMENTS")){let d=t.split("HOUSEHOLD DETAILS & EXPECTATIONS")[1].split("SPECIAL JOB REQUIREMENTS")[0];i=s(d),i||(i="Standard childcare services as per NannyLink guidelines.")}let c="Standard employment terms apply.";if(t.includes("SPECIAL JOB REQUIREMENTS")&&t.includes("GENERAL PROVISIONS")){let d=t.split("SPECIAL JOB REQUIREMENTS")[1].split("GENERAL PROVISIONS")[0];c=s(d),c||(c="Standard employment terms apply.")}c.includes("(CUSTOM TERMS)")&&(c=c.replace(/\(CUSTOM TERMS\)/g,"").trim());const l=((h=n.nanny)==null?void 0:h.full_name)||((E=n.nanny)==null?void 0:E.name)||"Caregiver Professional",A=((w=n.family)==null?void 0:w.name)||"Valued Family",M=((S=n.family)==null?void 0:S.household_location)||"Nairobi, Kenya",D=e.generation_date?new Date(e.generation_date).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"28 March 2026";a.innerHTML=`
        <div class="contract-view">
            <div class="contract-header-bar">
                <span class="contract-header-label">Employment Agreement (Official)</span>
                <button onclick="downloadPDF()" class="download-btn">
                    <span class="material-symbols-outlined">download</span> Download PDF
                </button>
            </div>
            
            <div class="contract-content hide-scrollbar">
                <div id="contractPDF" class="contract-pdf">
                    <div class="pdf-header">
                        <div class="pdf-logo">
                            <h1>NannyLink Kenya</h1>
                            <p>Premium Care & Household Staffing</p>
                        </div>
                        <div class="pdf-date">
                            <p class="pdf-date-label">Date Generated</p>
                            <p class="pdf-date-value">${D}</p>
                        </div>
                    </div>

                    <h2 class="pdf-title">Employment Agreement</h2>

                    <div class="parties-grid">
                        <div>
                            <p class="party-label">Employer (Family)</p>
                            <p class="party-name">${o(A)}</p>
                            <p class="party-location">${o(M)}</p>
                        </div>
                        <div>
                            <p class="party-label">Employee (Nanny)</p>
                            <p class="party-name">${o(l)}</p>
                            <p class="party-location">Verified via NannyLink</p>
                        </div>
                    </div>

                    <div class="terms-section">
                        <h3 class="section-title">Terms & Duties</h3>
                        <div style="margin-bottom: 24px;">
                            <p class="terms-subtitle">Household Details & Expectations</p>
                            <p class="terms-content">${o(i)}</p>
                        </div>
                        <div>
                            <p class="terms-subtitle">Special Job Requirements</p>
                            <p class="terms-content">${o(c)}</p>
                        </div>
                    </div>

                    <div class="terms-section">
                        <h3 class="section-title">General Provisions</h3>
                        <ul class="provisions-list">
                            <li><span>1.</span> This contract is binding upon digital acceptance by both parties.</li>
                            <li><span>2.</span> The Family agrees to provide a safe working environment.</li>
                            <li><span>3.</span> Payment shall be handled via the NannyLink Secure Payment platform.</li>
                            <li><span>4.</span> Either party may terminate with 14 days written notice.</li>
                        </ul>
                    </div>

                    <div class="signatures-section">
                        <p class="signatures-title">Acceptance & Digital Signatures</p>
                        <div class="signatures-grid">
                            <div class="signature-card">
                                <div class="signature-icon ${(b=e.acceptance)!=null&&b.family_accepted?"signed":""}">
                                    <span class="material-symbols-outlined">verified</span>
                                </div>
                                <p class="signature-label">Employer / Family</p>
                                <p class="signature-status ${(T=e.acceptance)!=null&&T.family_accepted?"signed":"pending"}">
                                    ${(N=e.acceptance)!=null&&N.family_accepted?"Digitally Signed":"Signature Pending"}
                                </p>
                            </div>
                            <div class="signature-card">
                                <div class="signature-icon ${(_=e.acceptance)!=null&&_.nanny_accepted?"signed":""}">
                                    <span class="material-symbols-outlined">verified</span>
                                </div>
                                <p class="signature-label">Employee / Nanny</p>
                                <p class="signature-status ${($=e.acceptance)!=null&&$.nanny_accepted?"signed":"pending"}">
                                    ${(C=e.acceptance)!=null&&C.nanny_accepted?"Digitally Signed":"Signature Pending"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="contract-footer">
                ${(L=e.acceptance)!=null&&L.family_accepted&&((I=e.acceptance)!=null&&I.nanny_accepted)?`
                    <div class="executed-badge">
                        <span class="material-symbols-outlined">verified</span> Contract Fully Executed
                    </div>
                `:(P=e.acceptance)!=null&&P.family_accepted?`
                    <div class="waiting-badge">
                        <span class="material-symbols-outlined">hourglass_empty</span> Waiting for Nanny to sign...
                    </div>
                `:`
                    <button id="signBtn" onclick="signNow('${e.id}')" class="sign-btn">
                        <span class="material-symbols-outlined">draw</span> Sign This Agreement
                    </button>
                `}
            </div>
        </div>
    `}function H(){const e=document.getElementById("contractPDF");html2pdf().set({margin:0,filename:"NannyLink_Contract.pdf",html2canvas:{scale:2},jsPDF:{format:"a4",orientation:"portrait"}}).from(e).save()}async function U(e){localStorage.getItem("access_token");const n=document.getElementById("signBtn");n&&(n.disabled=!0,n.innerHTML='<span class="material-symbols-outlined">sync</span> Processing...');try{const a=await fetch(`${f}/${e}/sign`,{method:"POST",headers:u()});if(g(a))return;if(a.ok){const t=await a.json(),s=p.findIndex(i=>i.id===e);s!==-1&&(p[s]=t),v(t,r.find(i=>i.id===t.match_id)),y(),m("Contract signed successfully!","success")}else throw new Error("Signature failed")}catch{n&&(n.disabled=!1,n.innerHTML='<span class="material-symbols-outlined">draw</span> Sign This Agreement'),m("Signature failed. Please try again.","error")}}function o(e){if(!e)return"";const n={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;","/":"&#x2F;","=":"&#x3D;","{":"&#123;","}":"&#125;","(":"&#40;",")":"&#41;"};return String(e).replace(/[&<>"'`/={}()]/g,function(a){return n[a]})}document.addEventListener("DOMContentLoaded",B);window.selectMatch=F;window.generateNow=x;window.downloadPDF=H;window.signNow=U;
