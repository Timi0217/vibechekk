import { BACKEND_URL } from './constants';

console.log('Vibechekk background service worker running');

// Allow the side panel to open on clicking the action button
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

const processedEmails = new Set<string>();
const processedHandles = new Set<string>(); // In-memory cache for current session

// Helper to check duplicates against persistent history
async function isDuplicate(type: string, value: string): Promise<boolean> {
    const valueLower = value.toLowerCase();

    // Check in-memory cache first (fastest)
    if (type === 'analysis' && processedHandles.has(valueLower)) {
        return true;
    }

    // Check persistent local cache
    const res = await chrome.storage.local.get(['dedup_cache']);
    const cache: any[] = (res.dedup_cache as any[]) || [];
    const inCache = cache.some((c: any) => c.type === type && c.value?.toLowerCase() === valueLower);

    if (inCache) {
        if (type === 'analysis') processedHandles.add(valueLower);
        return true;
    }

    return false;
}

// Check if profile exists in server history (for profiles analyzed before local cache existed)
async function isInServerHistory(handle: string): Promise<boolean> {
    try {
        const storage = await chrome.storage.local.get(['vibe_token']);
        const token = storage.vibe_token as string;
        if (!token) return false;

        const res = await fetch(`${BACKEND_URL}/api/history/check/${encodeURIComponent(handle)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.exists) {
                // Add to local cache so we don't check server again
                await addToDedupCache('analysis', handle);
                processedHandles.add(handle.toLowerCase());
                return true;
            }
        }
    } catch (e) {
        // Server check failed, continue with analysis
    }
    return false;
}

// Helper to add to persistent history
async function addToDedupCache(type: string, value: string) {
    const valueLower = value.toLowerCase();
    const res = await chrome.storage.local.get(['dedup_cache']);
    const cache: any[] = (res.dedup_cache as any[]) || [];
    if (!cache.some((c: any) => c.type === type && c.value?.toLowerCase() === valueLower)) {
        cache.push({ type, value: valueLower, timestamp: Date.now() });
        // Keep logs manageable but large enough for history
        if (cache.length > 2000) cache.shift();
        await chrome.storage.local.set({ dedup_cache: cache });
    }
    if (type === 'analysis') processedHandles.add(valueLower);
}

// Helper to clear local cache (for testing/reset)
async function clearLocalCache() {
    await chrome.storage.local.remove(['dedup_cache', 'autochekk_logs']);
    processedEmails.clear();
    processedHandles.clear();
    console.log('[Background] Local cache cleared');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_VIBE_CHECK') {
        const handleMatch = request.url.match(/github\.com\/([^/]+)/);
        const handle = handleMatch ? handleMatch[1] : 'profile';

        // Strict Deduplication for Auto-Scans - SERVER IS SOURCE OF TRUTH
        if (request.isSilent) {
            (async () => {
                // Check in-memory cache first (prevents duplicate calls within same session)
                if (processedHandles.has(handle.toLowerCase())) {
                    console.log(`[Autochekk] Skipping (Session Cache): ${handle}`);
                    sendResponse({ success: true, cached: true });
                    return;
                }

                // SERVER IS SOURCE OF TRUTH - check if profile exists in database
                const inServerHistory = await isInServerHistory(handle);
                if (inServerHistory) {
                    console.log(`[Autochekk] Skipping (Server History): ${handle}`);
                    processedHandles.add(handle.toLowerCase());
                    sendResponse({ success: true, cached: true });
                    return;
                }

                // Not in server history - proceed with analysis
                processVibeCheck(request.url, handle, sendResponse, request.avatar, true, request.name);
            })();
            return true;
        }

        // Manual scans - don't log to Live Activity
        processVibeCheck(request.url, handle, sendResponse, request.avatar, false, request.name);
        return true;
    }

    if (request.type === 'EMAILS_FOUND') {
        handleEmailDiscovery(request.emails, sender.tab?.id);
        return false; // No immediate response needed
    }

    // Clear local cache handler (for testing/reset)
    if (request.type === 'CLEAR_LOCAL_CACHE') {
        clearLocalCache().then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
});

async function processVibeCheck(url: string, handle: string, sendResponse: any, avatar: string = '', isAutochekk: boolean = false, name: string = '') {
    // Cache immediately to prevent race conditions during analysis
    addToDedupCache('analysis', handle);

    // Only log to Live Activity for Autochekk scans
    if (isAutochekk) {
        // Log "Profile Found" FIRST - await to ensure order
        await logActivity('resolution', `Profile Found: ${handle}`, { githubHandle: handle, avatar });

        // Then log "Analyzing..." - await to ensure it appears after Profile Found
        await logActivity('analysis', `Analyzing ${handle}...`, { githubHandle: handle, analyzing: true, name });
    }

    handleVibeCheck(url).then(async (res) => {
        if (isAutochekk) {
            if (res.success) {
                // Log archetype discovery for Activity Feed
                const archetype = res.data?.archetype || res.data?.label || 'Profile';
                console.log(`[Autochekk] Analysis complete: ${handle} → ${archetype}`);
                await logActivity('analysis', `${archetype.replace(/^THE\s+/i, '')} Discovered`, {
                    githubHandle: handle,
                    archetype: archetype,
                    avatar: avatar,
                    name: name || res.data?.candidate?.name
                });
            } else {
                await logActivity('analysis', `Failed to analyze ${handle}`, { error: res.error, githubHandle: handle });
            }
        }
        sendResponse(res);
    });
}

// Simple lock for atomic log writes
let logLock: Promise<void> = Promise.resolve();

async function logActivity(type: 'discovery' | 'resolution' | 'analysis', message: string, data?: any) {
    // Wait for any previous log to finish
    await logLock;

    // Create a new lock that will resolve when this write completes
    let unlock: () => void;
    logLock = new Promise(resolve => { unlock = resolve; });

    try {
        const timestamp = Date.now();
        const logItem = { id: crypto.randomUUID(), type, message, data, timestamp };

        const res = await chrome.storage.local.get(['autochekk_logs']);
        const logs: any[] = (res.autochekk_logs as any[]) || [];

        // Simple 50-item cap, deduplication handled by callers
        const newLogs = [logItem, ...logs].slice(0, 50);

        await chrome.storage.local.set({ autochekk_logs: newLogs });
    } finally {
        unlock!();
    }
}

async function handleEmailDiscovery(emails: string[], tabId?: number) {
    if (!tabId) return;

    // Process discovery in parallel to avoid bottlenecks
    const unprocessed = emails.filter(e => !processedEmails.has(e));

    // Quick add to set to prevent race conditions during the async loop
    unprocessed.forEach(e => processedEmails.add(e));

    const processEmail = async (email: string) => {
        // Global History Check (Persistent)
        if (await isDuplicate('discovery', email)) {
            console.log(`[Autochekk] Skipping known email: ${email}`);
            return;
        }

        await logActivity('discovery', `Detected email: ${email}`, { email });
        // Add to persistent cache
        await addToDedupCache('discovery', email);

        try {
            // Search GitHub for this email via backend
            const res = await fetch(`${BACKEND_URL}/api/lookup/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!res.ok) {
                console.warn('[Autochekk] Email lookup failed:', res.status);
                await logActivity('resolution', `Lookup failed for ${email}`, { email, error: `HTTP ${res.status}` });
                return;
            }

            const data = await res.json();

            if (data.success && data.username) {
                const username = data.username;
                const githubUrl = `https://github.com/${username}`;
                console.log(`[Autochekk] Resolved ${email} -> ${githubUrl}`);

                // Check session cache to prevent duplicate processing in same session
                if (processedHandles.has(username.toLowerCase())) {
                    console.log(`[Autochekk] Skipping (Session Cache): ${username}`);
                    return;
                }

                // SERVER IS SOURCE OF TRUTH - check if already analyzed
                const inHistory = await isInServerHistory(username);
                if (inHistory) {
                    console.log(`[Autochekk] Skipping (Server History): ${username}`);
                    processedHandles.add(username.toLowerCase());
                    return;
                }

                processedHandles.add(username.toLowerCase());

                await logActivity('resolution', `Matched ${email} to ${username}`, {
                    email,
                    githubHandle: username,
                    avatar: `https://github.com/${username}.png`
                });

                // Log "Analyzing..."
                await logActivity('analysis', `Analyzing ${username}...`, {
                    githubHandle: username,
                    analyzing: true
                });

                // Start analysis
                const analysisResult = await handleVibeCheck(githubUrl);

                if (analysisResult.success) {
                    const archetype = analysisResult.data?.archetype || analysisResult.data?.label || 'Profile';
                    await logActivity('analysis', `${archetype.replace(/^THE\s+/i, '')} Discovered`, {
                        githubHandle: username,
                        archetype: archetype,
                        avatar: `https://github.com/${username}.png`,
                        name: analysisResult.data?.candidate?.name
                    });

                    // Send result back to tab
                    chrome.tabs.sendMessage(tabId, {
                        type: 'SHOW_AUTOSCAN_RESULT',
                        data: analysisResult.data
                    });
                } else {
                    console.warn(`[Autochekk] Analysis failed for ${username}:`, analysisResult.error);
                    await logActivity('analysis', `Analysis Failed: ${username}`, {
                        error: analysisResult.error,
                        githubHandle: username
                    });
                }
            } else {
                await logActivity('resolution', `No GitHub linked to ${email}`, { email, success: false });
            }
        } catch (e: any) {
            console.error(`[Autochekk] Failed to resolve ${email}:`, e);
        }
    };

    // Run in parallel to avoid the single-file bottleneck
    unprocessed.forEach(email => {
        processEmail(email);
    });
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

        return { success: true, data: { ...result.data, isPro: result.isPro } };
    } catch (error: any) {
        console.error('Vibe check failed:', error);
        return { success: false, error: error.message };
    }
}
