(function () {
    const DEBUG = true;
    const log = (...args: any[]) => DEBUG && console.log('[Vibechekk Sniffer]', ...args);

    log('Sniffer active: Automatic GitHub detection enabled.');

    // 1. Intercept Fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

        if (isCandidateApi(url)) {
            const clone = response.clone();
            clone.json().then(data => handleInterceptedData(url, data)).catch(() => { });
        }
        return response;
    };

    // 2. Intercept XHR
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
        (this as any)._vibechekk_url = url.toString();
        return originalOpen.apply(this, [method, url, ...rest] as any);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener('load', function () {
            const url = (this as any)._vibechekk_url;
            if (isCandidateApi(url)) {
                try {
                    const data = JSON.parse(this.responseText);
                    handleInterceptedData(url, data);
                } catch (e) { }
            }
        });
        return originalSend.apply(this, args);
    };

    function isCandidateApi(url: string) {
        return (
            url.includes('api.ashbyhq.com/candidate/') ||
            url.includes('api.ashbyhq.com/application/') ||
            url.includes('harvest.greenhouse.io/v1/candidates/')
        );
    }

    function handleInterceptedData(_url: string, data: any) {
        const githubUrl = findGitHubRecursive(data);
        if (githubUrl) {
            log('Found GitHub URL:', githubUrl);
            window.dispatchEvent(new CustomEvent('vibechekk_github_detected', {
                detail: { githubUrl }
            }));
        }
    }

    function findGitHubRecursive(obj: any): string | null {
        if (!obj || typeof obj !== 'object') return null;
        for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'string' && value.includes('github.com')) return value;
            if (typeof value === 'object') {
                const found = findGitHubRecursive(value);
                if (found) return found;
            }
        }
        return null;
    }
    // --- GitHub Detection ---
    // The sniffer now strictly focuses on identifying GitHub URLs 
    // in the candidate data objects of Ashby/Greenhouse.
})();
