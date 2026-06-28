import"./modulepreload-polyfill-B5Qt9EMX.js";const y="https://nannylink-kenya.onrender.com";let r=1,c=[];async function w(t,e={}){const o=localStorage.getItem("access_token");if(!o){window.location.href="/src/views/login.html";return}const n={...e.headers,Authorization:`Bearer ${o}`,"Content-Type":"application/json"};try{const a=await fetch(t,{...e,headers:n});if(a.status===401){localStorage.removeItem("access_token"),window.location.href="/src/views/login.html";return}return a}catch(a){throw console.error("Network Error:",a),a}}function h(t){if(!t)return;const e=document.getElementById("totalVolume"),o=document.getElementById("successRate");e&&(e.innerText=`KES ${t.total_volume.toLocaleString()}`),o&&(o.innerText=`${t.success_rate}%`)}function _(t){switch((t||"").toLowerCase()){case"completed":return"status-completed";case"pending":return"status-pending";case"failed":case"cancelled":return"status-failed";default:return"status-pending"}}function x(t){if(!t)return{date:"N/A",time:"N/A"};try{const e=new Date(t);return{date:e.toLocaleDateString(),time:e.toLocaleTimeString()}}catch{return{date:t,time:""}}}function s(t){return t?String(t).replace(/[&<>]/g,function(e){return e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e}):""}function L(t){const e=document.getElementById("paymentTableBody");if(!e)return;if(e.innerHTML="",!t||t.length===0){e.innerHTML=`
            <tr>
                <td colspan="6" style="text-align: center; padding: 60px;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1;">receipt</span>
                    <p style="margin-top: 16px; color: #64748b;">No payment records found</p>
                </td>
            </tr>
        `;return}let o="";t.forEach(n=>{const{date:a,time:i}=x(n.created_at),l=_(n.payment_status),u=(n.payment_status||"unknown").toUpperCase(),m=n.family_name||"Unknown Family",g=n.nanny_name||"Not Assigned",f=n.mpesa_transaction_code||"---",p=(n.amount||0).toLocaleString();n.id,o+=`
            <tr>
                <td>
                    <strong>${s(a)}</strong><br>
                    <small style="color: #94a3b8;">${s(i)}</small>
                </td>
                <td>
                    <strong>${s(m)}</strong><br>
                    <small style="color: #94a3b8;">Matched with ${s(g)}</small>
                </td>
                <td><code style="background: #f1f5f9; padding: 4px 8px; border-radius: 8px;">${s(f)}</code></td>
                <td class="text-center"><strong>KES ${s(p)}</strong></td>
                <td><span class="status-badge ${l}">${s(u)}</span></td>
               
            </tr>
        `}),e.innerHTML=o}async function d(){const t=document.getElementById("searchInput"),e=t?t.value:"",o=`${y}/?page=${r}&search=${encodeURIComponent(e)}`;try{const n=await w(o);if(!n)return;const a=await n.json();c=a.payments||[],L(c),h(a.stats);const i=document.getElementById("showingText"),l=document.getElementById("pageNumber");i&&(i.innerText=`Showing ${c.length} of ${a.total_count||0} transactions`),l&&(l.innerText=r)}catch(n){console.error("Failed to load logs:",n)}}function E(){if(!c||c.length===0){alert("No data available to export.");return}const t=c.map(n=>({Date:new Date(n.created_at).toLocaleDateString(),Time:new Date(n.created_at).toLocaleTimeString(),"Family Name":n.family_name||"N/A","Nanny Name":n.nanny_name||"N/A","M-Pesa Code":n.mpesa_transaction_code||"Pending","Amount (KES)":n.amount,Status:(n.payment_status||"unknown").toUpperCase()})),e=XLSX.utils.json_to_sheet(t),o=XLSX.utils.book_new();XLSX.utils.book_append_sheet(o,e,"Payments"),XLSX.writeFile(o,`NannyLink_Payments_${new Date().toISOString().split("T")[0]}.xlsx`)}function b(){alert("Audit log generation feature coming soon.")}function S(t){alert(`Payment details for ID: ${t}

Full details feature coming soon.`)}function I(){const t=document.querySelector(".sidebar");t&&(t.style.display==="flex"?t.style.display="none":(t.style.display="flex",t.style.position="fixed",t.style.top="0",t.style.left="0",t.style.zIndex="100"))}document.addEventListener("DOMContentLoaded",()=>{d();const t=document.getElementById("nextBtn"),e=document.getElementById("prevBtn"),o=document.getElementById("exportBtn"),n=document.getElementById("searchInput");if(t&&t.addEventListener("click",()=>{r++,d()}),e&&e.addEventListener("click",()=>{r>1&&(r--,d())}),o&&o.addEventListener("click",E),n){let a;n.addEventListener("input",()=>{clearTimeout(a),a=setTimeout(()=>{r=1,d()},500)})}});window.viewDetails=S;window.generateAuditLog=b;window.toggleMobileMenu=I;
