(function(){console.log("Vibechekk content script active - Targeting ATS (Ashby/Greenhouse)");const p=()=>{const e=window.location.hostname;return e.includes("ashbyhq.com")||e.includes("greenhouse.io")},c=()=>{if(!p())return;document.querySelectorAll('a[href*="github.com"]').forEach(t=>{if(t.dataset.vibeChecked)return;t.dataset.vibeChecked="true";const o=document.createElement("button");o.className="vibe-check-btn",o.innerHTML="✨ Vibe Check",o.style.cssText=`
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
    `,o.onclick=i=>{i.preventDefault(),i.stopPropagation();const n=t.href;d(n)},t.insertAdjacentElement("afterend",o)})},d=async e=>{console.log("[Vibechekk] Checking analysis in background for:",e),chrome.runtime.sendMessage({type:"START_VIBE_CHECK",url:e},t=>{t&&t.success?b(t.data):console.log("[Vibechekk] No result available or analysis failed for:",e)})},b=e=>{const t=document.getElementById("vibe-check-root");t&&t.remove();const o=document.createElement("div");o.id="vibe-check-root",document.body.appendChild(o);const i=o.attachShadow({mode:"open"}),n=e.isPro||!1,s=document.createElement("style");s.textContent=`
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
      background: ${n?"#059669":"#2563eb"};
    }
    @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .close-btn { position: absolute; top: 12px; right: 12px; background: #f3f4f6; border: none; color: #6b7280; cursor: pointer; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .pro-badge { font-size: 10px; font-weight: 800; color: #059669; background: #ecfdf5; border: 1px solid #05966933; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-left: 8px; }
  `,i.appendChild(s);const r=document.createElement("div");r.className="vibe-card-overlay",r.innerHTML=`
    <button class="close-btn">×</button>
    <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: full; background: #18181b; border: 1px solid #27272a; margin-bottom: 24px;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${n?"#22c55e":"#4f46e5"};"></span>
      <span style="font-size: 12px; font-weight: 700; color: #f4f4f5; text-transform: uppercase; letter-spacing: 0.05em;">
        ${e.archetype} - ${e.label}
        ${n?'<span class="pro-badge">Pro Unlocked</span>':""}
      </span>
    </div>
    
    <h2 style="margin: 0 0 4px 0; font-size: 24px; font-weight: 900; letter-spacing: -0.04em; background: linear-gradient(to bottom right, #fff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Trajectory of Merit</h2>
    <p style="margin: 0 0 28px 0; color: #a1a1aa; font-size: 14px; font-weight: 500;">${e.trajectorySummary||e.trajectory_summary}</p>
    
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${(e.meritPoints||e.merit_points).map(l=>`
        <div style="display: flex; gap: 14px; align-items: flex-start;">
          <div style="width: 20px; height: 20px; border-radius: 6px; background: #27272a; display: flex; align-items: center; justify-content: center; font-size: 10px; color: ${n?"#22c55e":"#4f46e5"}; flex-shrink: 0; margin-top: 2px;">✦</div>
          <span style="font-size: 14px; line-height: 1.5; color: #e4e4e7;">${l}</span>
        </div>
      `).join("")}
    </div>

    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #27272a; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Confidence Score</div>
      <div style="font-size: 14px; font-weight: 800; color: ${n?"#22c55e":"#4f46e5"};">${e.confidence}%</div>
    </div>
  `,i.appendChild(r),r.querySelector(".close-btn")?.addEventListener("click",()=>o.remove())};let a="";window.addEventListener("VIBE_ATS_KEY_DETECTED",(e=>{chrome.runtime.sendMessage({type:"ATS_KEY_DETECTED",atsType:e.detail.type,key:e.detail.key})}));window.addEventListener("vibechekk_github_detected",(e=>{const{githubUrl:t}=e.detail;t===a&&document.getElementById("vibe-check-root")||(console.log("[Content] Sniffer found GitHub, triggering background check:",t),a=t,d(t))}));c();const f=new MutationObserver(c);f.observe(document.body,{childList:!0,subtree:!0});
})()
