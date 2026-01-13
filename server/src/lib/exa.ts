/**
 * Exa AI Search API integration for LinkedIn profile discovery
 * Used as fallback when PDL email lookup fails
 * 
 * Exa uses semantic search to find LinkedIn profiles by name + context
 * Free tier: 1000 searches/month
 */

export interface ExaSearchResult {
    success: boolean;
    linkedinUrl?: string;
    title?: string;
    error?: string;
}

/**
 * Search for a person's LinkedIn profile using Exa semantic search
 * 
 * @param apiKey Exa API key
 * @param name Person's full name
 * @param context Additional context like location, skills, etc.
 */
export async function findLinkedInProfile(
    apiKey: string,
    name: string,
    context?: string
): Promise<ExaSearchResult> {
    if (!apiKey) {
        return { success: false, error: 'Exa API key not configured' };
    }

    if (!name || name.trim().length < 2) {
        return { success: false, error: 'Name is required for Exa search' };
    }

    try {
        // Build query with name and optional context
        const query = context ? `${name} ${context}` : name;

        console.log(`[Exa] Searching LinkedIn for: "${query}"`);

        const response = await fetch('https://api.exa.ai/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                query,
                numResults: 5, // Request more results to find a valid /in/ profile
                includeDomains: ['linkedin.com'],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Exa] API error: ${response.status} - ${errorText}`);
            return {
                success: false,
                error: `Exa API error: ${response.status}`,
            };
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            console.log(`[Exa] No LinkedIn results for: ${name}`);
            return {
                success: false,
                error: 'No LinkedIn profile found',
            };
        }

        // Find the first valid /in/ profile URL
        const validProfile = data.results.find((r: any) =>
            r.url &&
            r.url.includes('/in/') &&
            !r.url.includes('/pub/dir/') &&
            !r.url.includes('/directory/')
        );

        if (!validProfile) {
            console.log(`[Exa] No valid /in/ profile found in ${data.results.length} results`);
            return {
                success: false,
                error: 'No specific LinkedIn profile found (not a /in/ URL)',
            };
        }

        console.log(`[Exa] Found LinkedIn: ${validProfile.url} - "${validProfile.title}"`);

        return {
            success: true,
            linkedinUrl: validProfile.url,
            title: validProfile.title,
        };
    } catch (error) {
        console.error('[Exa] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Build context string from GitHub profile data
 */
export function buildSearchContext(data: {
    location?: string;
    bio?: string;
    company?: string;
    skills?: string[];
}): string {
    const parts: string[] = [];

    if (data.location) {
        parts.push(data.location);
    }

    if (data.company) {
        parts.push(data.company);
    }

    // Add top 3 skills for context
    if (data.skills && data.skills.length > 0) {
        parts.push(data.skills.slice(0, 3).join(' '));
    }

    return parts.join(' ').trim();
}
