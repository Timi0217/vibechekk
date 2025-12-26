import { BACKEND_URL } from './constants';

console.log('Vibechekk background service worker running');

// Allow the side panel to open on clicking the action button
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'START_VIBE_CHECK') {
        handleVibeCheck(request.url).then(sendResponse);
        return true; // Keep message channel open for async response
    }
});

async function handleVibeCheck(url: string) {
    try {
        const match = url.match(/github\.com\/([^/]+)(?:\/([^/]+))?/i);
        if (!match) throw new Error('Invalid GitHub URL');

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

        if (!result.success) {
            throw new Error(result.error || 'Backend analysis failed');
        }

        return { success: true, data: { ...result.data, isPro: result.isPro } };
    } catch (error: any) {
        console.error('Vibe check failed:', error);
        return { success: false, error: error.message };
    }
}
