(function(){console.log("Vibechekk content script active - Targeting ATS (Ashby/Greenhouse)");const T=()=>{const e=window.location.hostname;return e.includes("ashbyhq.com")||e.includes("greenhouse.io")},A=()=>{if(!T())return;document.querySelectorAll('a[href*="github.com"]').forEach(o=>{if(o.dataset.vibeChecked)return;o.dataset.vibeChecked="true";const i=document.createElement("button");i.className="vibe-check-btn",i.innerHTML="✨ Vibe Check",i.style.cssText=`
      margin-left: 8px;
      padding: 4px 12px;
      border-radius: 8px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      border: none;
      cursor: pointer;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    `,i.onclick=c=>{c.preventDefault(),c.stopPropagation();const r=o.href;v(r,!1)},o.insertAdjacentElement("afterend",i)})},v=async(e,o=!1,i="",c="")=>{console.log("[Vibechekk] Checking analysis in background for:",e,o?"(Silent)":"(Interactive)"),chrome.runtime.sendMessage({type:"START_VIBE_CHECK",url:e,isSilent:o,avatar:i,name:c},r=>{r&&r.success?o?console.log("[Vibechekk] Analysis complete (Silent Mode)"):V(r.data):console.log("[Vibechekk] No result available or analysis failed for:",e)})},V=e=>{var a;const o=document.getElementById("vibe-check-root");o&&o.remove();const i=document.createElement("div");i.id="vibe-check-root",document.body.appendChild(i);const c=i.attachShadow({mode:"open"}),r=e.isPro||!1,u=document.createElement("style");u.textContent=`
    .vibe-card-overlay {
      position: fixed;
      top: 40px;
      right: 40px;
      width: 400px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      color: #111827;
      font-family: 'Inter', -apple-system, sans-serif;
      z-index: 9999999;
      padding: 24px;
      overflow: hidden;
      animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .vibe-card-overlay::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: ${r?"#059669":"#2563eb"};
    }
    @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .close-btn { position: absolute; top: 12px; right: 12px; background: #f3f4f6; border: none; color: #6b7280; cursor: pointer; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .pro-badge { font-size: 10px; font-weight: 800; color: #059669; background: #ecfdf5; border: 1px solid #05966933; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-left: 8px; }
  `,c.appendChild(u);const l=document.createElement("div");l.className="vibe-card-overlay",l.innerHTML=`
    <button class="close-btn">×</button>
    <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: full; background: #18181b; border: 1px solid #27272a; margin-bottom: 24px;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${r?"#22c55e":"#4f46e5"};"></span>
      <span style="font-size: 12px; font-weight: 700; color: #f4f4f5; text-transform: uppercase; letter-spacing: 0.05em;">
        ${e.archetype===e.label?e.archetype:`${e.archetype} - ${e.label}`}
        ${r?'<span class="pro-badge">Pro Unlocked</span>':""}
      </span>
    </div>
    
    <h2 style="margin: 0 0 4px 0; font-size: 24px; font-weight: 900; letter-spacing: -0.04em; background: linear-gradient(to bottom right, #fff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Trajectory of Merit</h2>
    <p style="margin: 0 0 28px 0; color: #a1a1aa; font-size: 14px; font-weight: 500;">${e.trajectorySummary||e.trajectory_summary}</p>
    
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${(e.meritPoints||e.merit_points||[]).map(n=>{let t=n;return typeof n=="object"&&(t=n.detail||n.point||n.description||n.summary||n.title||JSON.stringify(n),n.title&&n.detail&&(t=`<strong>${n.title}</strong>: ${n.detail}`)),`
        <div style="display: flex; gap: 14px; align-items: flex-start;">
          <div style="width: 20px; height: 20px; border-radius: 6px; background: #27272a; display: flex; align-items: center; justify-content: center; font-size: 10px; color: ${r?"#22c55e":"#4f46e5"}; flex-shrink: 0; margin-top: 2px;">✦</div>
          <span style="font-size: 14px; line-height: 1.5; color: #e4e4e7;">
            ${t}
          </span>
        </div>
      `}).join("")}
    </div>

    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #27272a; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Confidence Score</div>
      <div style="font-size: 14px; font-weight: 800; color: ${r?"#22c55e":"#4f46e5"};">${e.confidence}%</div>
    </div>
  `,c.appendChild(l),(a=l.querySelector(".close-btn"))==null||a.addEventListener("click",()=>i.remove())};let w="";window.addEventListener("VIBE_ATS_KEY_DETECTED",e=>{chrome.runtime.sendMessage({type:"ATS_KEY_DETECTED",atsType:e.detail.type,key:e.detail.key})});window.addEventListener("vibechekk_github_detected",e=>{const{githubUrl:o}=e.detail;o===w&&document.getElementById("vibe-check-root")||(console.log("[Content] Sniffer found GitHub, triggering background check:",o),w=o,v(o))});chrome.runtime.onMessage.addListener(e=>{e.type==="SHOW_AUTOSCAN_RESULT"&&console.log("[Content] Received Autochekk Result - Logged to Activity Feed (Silent)")});A();setTimeout(()=>{g(),m()},1e3);const z=new MutationObserver(()=>{A(),g(),m()});z.observe(document.body,{childList:!0,subtree:!0});let E=window.location.href;const S=()=>{f.clear(),m()};setInterval(()=>{window.location.href!==E&&(E=window.location.href,console.log("[Autochekk] URL Change Detected via Polling"),S())},500);window.addEventListener("load",S);let d=!1,y=new Set,f=new Set,b=null,k="",x=0;function m(){var o,i,c,r,u,l;if(!d)return;if(window.location.hostname==="github.com"){const n=window.location.pathname.match(/^\/([a-zA-Z0-9-]+)\/?$/);if(n){const t=n[1],s=`https://github.com/${t}`;if(["settings","explore","topics","trending","collections","events","sponsors","orgs","search","features","marketplace","pricing","enterprise","team","notifications","pulls","issues","codespaces","copilot","security","login","logout","join","signup","password_reset","sessions","about","contact","support","status","blog","resources","readme","customer-stories","new","organizations","apps","account","dashboard","watching","stars"].includes(t.toLowerCase()))return;if(!f.has(t)){const h=Date.now();if(k===t&&h-x<5e3){console.log("[Autochekk] Skipping duplicate scan (debounce):",t);return}f.add(t),k=t,x=h,console.log("[Autochekk] Direct Profile Detected:",t);const _=((o=document.querySelector('meta[property="og:image"]'))==null?void 0:o.getAttribute("content"))||((i=document.querySelector("img.avatar-user"))==null?void 0:i.getAttribute("src"))||"",L=((r=(c=document.querySelector(".vcard-names .p-name"))==null?void 0:c.textContent)==null?void 0:r.trim())||((l=(u=document.querySelector('span[itemprop="name"]'))==null?void 0:u.textContent)==null?void 0:l.trim())||"";v(s,!0,_,L)}}}}function g(){d&&window.location.hostname!=="github.com"&&(b&&clearTimeout(b),b=setTimeout(()=>{const e=/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,o=new Set;(document.body.innerText.match(e)||[]).forEach(a=>o.add(a.toLowerCase())),document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{const t=(a.getAttribute("href")||"").replace("mailto:","").split("?")[0].match(e);t&&t.forEach(s=>o.add(s.toLowerCase()))}),document.querySelectorAll("[data-email], [data-user-email], [data-contact-email], [data-candidate-email]").forEach(a=>{["data-email","data-user-email","data-contact-email","data-candidate-email"].forEach(t=>{const s=a.getAttribute(t);if(s){const p=s.match(e);p&&p.forEach(h=>o.add(h.toLowerCase()))}})}),document.querySelectorAll('script[type="application/ld+json"]').forEach(a=>{try{const n=JSON.parse(a.textContent||"{}"),t=s=>{if(typeof s=="string"){const p=s.match(e);p&&p.forEach(h=>o.add(h.toLowerCase()))}else Array.isArray(s)?s.forEach(t):typeof s=="object"&&s!==null&&Object.values(s).forEach(t)};t(n)}catch{}}),document.querySelectorAll('input[type="hidden"][name*="email"], input[type="hidden"][name*="Email"]').forEach(a=>{const n=a.value;if(n){const t=n.match(e);t&&t.forEach(s=>o.add(s.toLowerCase()))}}),document.querySelectorAll('meta[name*="email"], meta[property*="email"], meta[name="author"]').forEach(a=>{const t=(a.getAttribute("content")||"").match(e);t&&t.forEach(s=>o.add(s.toLowerCase()))});const c=["example.com","test.com","localhost","sentry.io","wixpress.com","placeholder.com"],r=["noreply","no-reply","donotreply","mailer-daemon","postmaster","support@","info@","contact@","admin@"],l=Array.from(o).filter(a=>{const n=a.split("@")[1];return!(c.some(t=>n==null?void 0:n.includes(t))||r.some(t=>a.includes(t)))}).filter(a=>y.has(a)?!1:(y.add(a),!0));l.length>0&&(console.log("[Vibechekk] Found new emails:",l),chrome.runtime.sendMessage({type:"EMAILS_FOUND",emails:l}))},1500))}chrome.storage.local.get(["auto_chekk_enabled"],e=>{d=e.auto_chekk_enabled===!0,d&&(console.log("[Vibechekk] Autochekk Enabled - Scanner Active"),m())});chrome.storage.onChanged.addListener(e=>{e.auto_chekk_enabled&&(d=e.auto_chekk_enabled.newValue===!0,d?(console.log("[Vibechekk] Autochekk Activated"),g(),m()):console.log("[Vibechekk] Autochekk Deactivated"))});chrome.runtime.onMessage.addListener(e=>{e.type==="CLEAR_SCANNED_CACHE"&&(console.log("[Vibechekk] Clearing in-memory caches"),f.clear(),y.clear(),k="",x=0,d&&(m(),g()))});function C(){const e=document.getElementById("vibechekk-auth-data");if(e){const o=e.getAttribute("data-token"),i=e.getAttribute("data-user");if(o&&i)try{const c=JSON.parse(i);console.log("[Vibechekk] Auth Success Detected via Content Script"),console.log("[Vibechekk] User data received:",c),console.log("[Vibechekk] GitHub Login:",c.githubLogin),chrome.storage.local.set({user_data:c,auth_token:o},()=>{console.log("[Vibechekk] User logged in!");const r=document.querySelector("h1");r&&(r.innerText="Setup Complete! Closing..."),setTimeout(()=>{window.close()},1500)})}catch(c){console.error("[Vibechekk] Failed to parse auth data",c)}}}C();window.addEventListener("load",C);
})()
