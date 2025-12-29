/// <reference types="chrome" />
console.log('Vibechekk content script active - Targeting ATS (Ashby/Greenhouse)');

const isATS = () => {
  const host = window.location.hostname;
  return host.includes('ashbyhq.com') || host.includes('greenhouse.io');
};

const injectVibeButton = () => {
  if (!isATS()) return;

  // We look for GitHub links specifically within candidate profiles
  // These are usually consistent in ATS platforms
  const githubLinks = document.querySelectorAll('a[href*="github.com"]');

  githubLinks.forEach(link => {
    // Avoid double injection
    if ((link as HTMLElement).dataset.vibeChecked) return;
    (link as HTMLElement).dataset.vibeChecked = 'true';

    // ATS Specific: Check if the link is in a candidate data area
    // (This is a heuristic, can be refined with specific selectors)
    const btn = document.createElement('button');
    btn.className = 'vibe-check-btn';
    btn.innerHTML = '✨ Vibe Check';
    btn.style.cssText = `
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
    `;

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const githubUrl = (link as HTMLAnchorElement).href;
      handleVibeCheck(githubUrl, false); // Manual click -> Show Result
    };

    link.insertAdjacentElement('afterend', btn);
  });
};

const handleVibeCheck = async (url: string, isSilent: boolean = false, avatar: string = '') => {
  console.log('[Vibechekk] Checking analysis in background for:', url, isSilent ? '(Silent)' : '(Interactive)');

  chrome.runtime.sendMessage({
    type: 'START_VIBE_CHECK',
    url,
    isSilent,
    avatar
  }, (response) => {
    if (response && response.success) {
      if (!isSilent) {
        renderVibeResult(response.data);
      } else {
        console.log('[Vibechekk] Analysis complete (Silent Mode)');
      }
    } else {
      console.log('[Vibechekk] No result available or analysis failed for:', url);
    }
  });
};

const renderVibeResult = (data: any) => {
  const existing = document.getElementById('vibe-check-root');
  if (existing) existing.remove();

  const rootDiv = document.createElement('div');
  rootDiv.id = 'vibe-check-root';
  document.body.appendChild(rootDiv);

  const shadow = rootDiv.attachShadow({ mode: 'open' });
  const isPro = data.isPro || false;

  const style = document.createElement('style');
  style.textContent = `
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
      background: ${isPro ? '#059669' : '#2563eb'};
    }
    @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .close-btn { position: absolute; top: 12px; right: 12px; background: #f3f4f6; border: none; color: #6b7280; cursor: pointer; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .pro-badge { font-size: 10px; font-weight: 800; color: #059669; background: #ecfdf5; border: 1px solid #05966933; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-left: 8px; }
  `;
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'vibe-card-overlay';
  container.innerHTML = `
    <button class="close-btn">×</button>
    <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: full; background: #18181b; border: 1px solid #27272a; margin-bottom: 24px;">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isPro ? '#22c55e' : '#4f46e5'};"></span>
      <span style="font-size: 12px; font-weight: 700; color: #f4f4f5; text-transform: uppercase; letter-spacing: 0.05em;">
        ${data.archetype === data.label ? data.archetype : `${data.archetype} - ${data.label}`}
        ${isPro ? '<span class="pro-badge">Pro Unlocked</span>' : ''}
      </span>
    </div>
    
    <h2 style="margin: 0 0 4px 0; font-size: 24px; font-weight: 900; letter-spacing: -0.04em; background: linear-gradient(to bottom right, #fff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Trajectory of Merit</h2>
    <p style="margin: 0 0 28px 0; color: #a1a1aa; font-size: 14px; font-weight: 500;">${data.trajectorySummary || data.trajectory_summary}</p>
    
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${(data.meritPoints || data.merit_points || []).map((p: any) => {
    let content = p;
    if (typeof p === 'object') {
      // Handle structured object from backend
      content = p.detail || p.point || p.description || p.summary || p.title || JSON.stringify(p);
      if (p.title && p.detail) {
        content = `<strong>${p.title}</strong>: ${p.detail}`;
      }
    }
    return `
        <div style="display: flex; gap: 14px; align-items: flex-start;">
          <div style="width: 20px; height: 20px; border-radius: 6px; background: #27272a; display: flex; align-items: center; justify-content: center; font-size: 10px; color: ${isPro ? '#22c55e' : '#4f46e5'}; flex-shrink: 0; margin-top: 2px;">✦</div>
          <span style="font-size: 14px; line-height: 1.5; color: #e4e4e7;">
            ${content}
          </span>
        </div>
      `;
  }).join('')}
    </div>

    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #27272a; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Confidence Score</div>
      <div style="font-size: 14px; font-weight: 800; color: ${isPro ? '#22c55e' : '#4f46e5'};">${data.confidence}%</div>
    </div>
  `;
  shadow.appendChild(container);
  container.querySelector('.close-btn')?.addEventListener('click', () => rootDiv.remove());
};

let lastAnalyzedUrl = '';

// Listen for ATS Key Detection
window.addEventListener('VIBE_ATS_KEY_DETECTED', ((e: CustomEvent) => {
  chrome.runtime.sendMessage({
    type: 'ATS_KEY_DETECTED',
    atsType: e.detail.type,
    key: e.detail.key
  });
}) as EventListener);

// Listen for Network Sniffer updates (GitHub)
window.addEventListener('vibechekk_github_detected', ((e: CustomEvent) => {
  const { githubUrl } = e.detail;

  // Deduplication
  if (githubUrl === lastAnalyzedUrl && document.getElementById('vibe-check-root')) return;

  console.log('[Content] Sniffer found GitHub, triggering background check:', githubUrl);
  lastAnalyzedUrl = githubUrl;
  handleVibeCheck(githubUrl);
}) as EventListener);

// Listen for Autochekk Results from Background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_AUTOSCAN_RESULT') {
    console.log('[Content] Received Autochekk Result - Logged to Activity Feed (Silent)');
    // User requested NO summary card for Autochekk
    // renderVibeResult(message.data); 
  }
});

// Initial run
injectVibeButton();
setTimeout(() => {
  scanForEmails();
  scanForGitHubProfile();
}, 1000); // Give SPA a moment to settle

// Observer for dynamic content
const observer = new MutationObserver(() => {
  injectVibeButton();
  scanForEmails();
  scanForGitHubProfile();
});
observer.observe(document.body, { childList: true, subtree: true });

// GitHub uses Turbo which doesn't reliably fire events we can catch.
// We use URL polling as a robust fallback for SPA navigation detection.
let lastCheckedUrl = window.location.href;
const resetAndScan = () => {
  scannedProfiles.clear();
  scanForGitHubProfile();
};
setInterval(() => {
  if (window.location.href !== lastCheckedUrl) {
    lastCheckedUrl = window.location.href;
    console.log('[Autochekk] URL Change Detected via Polling');
    resetAndScan();
  }
}, 500);
window.addEventListener('load', resetAndScan); // Still catch hard refreshes

// --- Autochekk Logic ---
let isAutochekkEnabled = false;
let scannedEmails = new Set<string>();
let scannedProfiles = new Set<string>();
let scanTimeout: any = null;

function scanForGitHubProfile() {
  if (!isAutochekkEnabled) return;

  // Check if we are physically ON a github profile
  const host = window.location.hostname;
  if (host === 'github.com') {
    // Path is usually /username or /username/repo
    // We only want /username
    const path = window.location.pathname;
    // Regex to match strictly /username (e.g. /torvalds) and NOT /torvalds/linux or /settings
    // GitHub usernames are alphanumeric + hyphens
    const profileMatch = path.match(/^\/([a-zA-Z0-9-]+)\/?$/);

    if (profileMatch) {
      const handle = profileMatch[1];
      const fullUrl = `https://github.com/${handle}`;

      // Reserved words to ignore
      const ignored = ['settings', 'explore', 'topics', 'trending', 'collections', 'events', 'sponsors', 'orgs', 'search'];
      if (ignored.includes(handle)) return;

      if (!scannedProfiles.has(handle)) {
        scannedProfiles.add(handle);
        console.log('[Autochekk] Direct Profile Detected:', handle);

        // Scrape avatar for "Profile Found" log
        const avatar = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
          document.querySelector('img.avatar-user')?.getAttribute('src') || '';

        // Trigger analysis directly
        handleVibeCheck(fullUrl, true, avatar);
      }
    }
  }
}

function scanForEmails() {
  if (!isAutochekkEnabled) return;
  // If we are on GitHub, rely on Profile Detection, not email scraping
  if (window.location.hostname === 'github.com') return;

  if (scanTimeout) clearTimeout(scanTimeout);

  scanTimeout = setTimeout(() => {
    const text = document.body.innerText;
    // Basic email regex (can be improved)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);

    if (matches && matches.length > 0) {
      const newEmails: string[] = [];
      matches.forEach(email => {
        const lower = email.toLowerCase();
        // Ignore internal/junk emails if necessary or restrict to gmail/yahoo/etc if user really wants
        // User said "@ gmail or yahoo or just @" so general regex is fine.
        if (!scannedEmails.has(lower)) {
          scannedEmails.add(lower);
          newEmails.push(lower);
        }
      });

      if (newEmails.length > 0) {
        console.log('[Vibechekk] Found new emails:', newEmails);
        chrome.runtime.sendMessage({
          type: 'EMAILS_FOUND',
          emails: newEmails
        });
      }
    }
  }, 1000); // 1s Debounce
}

// Initialize State
chrome.storage.local.get(['auto_chekk_enabled'], (res) => {
  isAutochekkEnabled = res.auto_chekk_enabled !== undefined ? res.auto_chekk_enabled : true;
  if (isAutochekkEnabled) {
    console.log('[Vibechekk] Autochekk Enabled - Scanner Active');
    scanForGitHubProfile();
  }
});

// Detect State Changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.auto_chekk_enabled) {
    isAutochekkEnabled = changes.auto_chekk_enabled.newValue;
    if (isAutochekkEnabled) {
      console.log('[Vibechekk] Autochekk Activated');
      scanForEmails(); // Trigger immediate scan
      scanForGitHubProfile();
    } else {
      console.log('[Vibechekk] Autochekk Deactivated');
    }
  }
});
