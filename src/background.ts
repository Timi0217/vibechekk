import { BACKEND_URL } from './constants';

console.log('Vibechekk background service worker running');

// Allow the side panel to open on clicking the action button
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

const processedEmails = new Set<string>();

// Helper to check duplicates against persistent history
async function isDuplicate(type: string, value: string): Promise<boolean> {
    const res = await chrome.storage.local.get(['dedup_cache']);
    const cache = res.dedup_cache || [];
    return cache.some((c: any) => c.type === type && c.value === value);
}

// Helper to add to persistent history
async function addToDedupCache(type: string, value: string) {
    const res = await chrome.storage.local.get(['dedup_cache']);
    const cache = res.dedup_cache || [];
    if (!cache.some((c: any) => c.type === type && c.value === value)) {
        cache.push({ type, value, timestamp: Date.now() });
        // Keep logs manageable but large enough for history
        if (cache.length > 2000) cache.shift();
        await chrome.storage.local.set({ dedup_cache: cache });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_VIBE_CHECK') {
        const handleMatch = request.url.match(/github\.com\/([^/]+)/);
        const handle = handleMatch ? handleMatch[1] : 'profile';

        // Strict Deduplication for Auto-Scans
        if (request.isSilent) {
            isDuplicate('analysis', handle).then(exists => {
                if (exists) {
                    console.log(`[Autochekk] Skipping existing profile (History): ${handle}`);
                    sendResponse({ success: true, cached: true });
                } else {
                    processVibeCheck(request.url, handle, sendResponse, request.avatar);
                }
            });
            return true;
        }

        // Manual scans always proceed
        processVibeCheck(request.url, handle, sendResponse, request.avatar);
        return true;
    }

    if (request.type === 'EMAILS_FOUND') {
        handleEmailDiscovery(request.emails, sender.tab?.id);
        return false; // No immediate response needed
    }
});

function processVibeCheck(url: string, handle: string, sendResponse: any, avatar: string = '') {
    // Cache immediately to prevent race conditions during analysis
    addToDedupCache('analysis', handle);

    // Explicitly log "Profile Found" for direct visits (as requested)
    logActivity('resolution', `Profile Found: ${handle}`, { githubHandle: handle, avatar });

    // Notify UI to show pending card
    chrome.runtime.sendMessage({
        type: 'ANALYSIS_STARTED',
        handle
    }).catch(() => { }); // Ignore error if popup is closed

    handleVibeCheck(url).then(async (res) => {
        if (!res.success) {
            logActivity('analysis', `Failed to analyze ${handle}`, { error: res.error });
            // Optional: Remove from cache if failed so it can be retried?
            // For now, let's keep it to prevent spamming errors.
        }
        sendResponse(res);
    });
}

async function logActivity(type: 'discovery' | 'resolution' | 'analysis', message: string, data?: any) {
    const timestamp = Date.now();
    const logItem = { id: crypto.randomUUID(), type, message, data, timestamp };

    const res = await chrome.storage.local.get(['autochekk_logs']);
    const logs = res.autochekk_logs || [];

    // Simple 50-item cap, deduplication handled by callers
    const newLogs = [logItem, ...logs].slice(0, 50);

    await chrome.storage.local.set({ autochekk_logs: newLogs });
}

async function handleEmailDiscovery(emails: string[], tabId?: number) {
    if (!tabId) return;

    for (const email of emails) {
        if (processedEmails.has(email)) continue;
        processedEmails.add(email);

        // Global History Check
        if (await isDuplicate('discovery', email)) {
            console.log(`[Autochekk] Skipping known email: ${email}`);
            continue;
        }

        logActivity('discovery', `Detected email: ${email}`, { email });
        // Add to persistent cache
        await addToDedupCache('discovery', email);

        try {
            // Search GitHub for this email
            const res = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(email + ' in:email')}`);
            if (res.status === 403 || res.status === 429) {
                console.warn('[Autochekk] Rate limited by GitHub API');
                break; // Stop for now
            }
            const data = await res.json();

            if (data.items && data.items.length > 0) {
                const user = data.items[0];
                const githubUrl = `https://github.com/${user.login}`;
                console.log(`[Autochekk] Resolved ${email} -> ${githubUrl}`);

                if (await isDuplicate('resolution', user.login)) {
                    console.log(`[Autochekk] Skipping known profile: ${user.login}`);
                    continue;
                }

                logActivity('resolution', `Matched ${email} to ${user.login}`, { email, githubHandle: user.login, avatar: user.avatar_url });
                await addToDedupCache('resolution', user.login);

                // Analyze this user
                const analysisResult = await handleVibeCheck(githubUrl);


                if (analysisResult.success) {
                    // Send result back to tab to display
                    chrome.tabs.sendMessage(tabId, {
                        type: 'SHOW_AUTOSCAN_RESULT',
                        data: analysisResult.data
                    });
                } else {
                    console.warn(`[Autochekk] Analysis failed for ${user.login}:`, analysisResult.error);
                    logActivity('analysis', `Analysis Failed: ${user.login}`, { error: analysisResult.error });
                }
            } else {
                // Optional: Log failure to resolve if we want verbose mode
                // logActivity('resolution', `No GitHub found for ${email}`, { email, success: false });
            }
        } catch (e: any) {
            console.error(`[Autochekk] Failed to resolve ${email}:`, e);
        }
    }
}

async function handleVibeCheck(url: string) {
    try {
        const match = url.match(/github\.com\/([^/]+)(?:\/([^/]+))?/i);
        if (!match) throw new Error('Invalid GitHub URL');
        const handle = match[1];

        const storage = await chrome.storage.local.get(['vibe_token']);
        const vibeToken = storage.vibe_token as string;

        // 1. Call Backend for Analysis
        console.log(`[Extension] Requesting analysis for ${url} (Auth: ${vibeToken ? 'Yes' : 'No'})`);
        const response = await fetch(`${BACKEND_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': vibeToken ? `Bearer ${vibeToken}` : ''
            },
            body: JSON.stringify({ githubUrl: url })
        });
        const result = await response.json();

        // Handle Stale Token (User deleted from DB)
        if (response.status === 401) {
            console.warn('[Autochekk] Stale token detected. Clearing auth.');
            await chrome.storage.local.remove(['vibe_token']);
            return { success: false, error: 'Session expired. Please re-login.' };
        }

        if (!result.success) {
            throw new Error(result.error || 'Backend analysis failed');
        }

        // Log the successful analysis
        logActivity('analysis', `Analyzed ${handle}`, {
            githubHandle: handle,
            isPro: result.isPro,
            archetype: result.data.archetype || result.data.label
        });

        return { success: true, data: { ...result.data, isPro: result.isPro } };
    } catch (error: any) {
        console.error('Vibe check failed:', error);
        return { success: false, error: error.message };
    }
}
