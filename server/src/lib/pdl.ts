/**
 * People Data Labs API integration for email-to-LinkedIn enrichment
 * API Docs: https://docs.peopledatalabs.com/docs/person-enrichment-api
 */

export interface PDLPersonData {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    linkedin_url: string;
    linkedin_username: string;
    job_title: string;
    job_company_name: string;
    location_name: string;
    location_locality: string;
    location_country: string;
    industry: string;
    skills: string[];
    experience: Array<{
        title: { name: string };
        company: { name: string; linkedin_url?: string };
        start_date: string;
        end_date: string | null;
        is_primary: boolean;
    }>;
    education: Array<{
        school: { name: string };
        degrees: string[];
        majors: string[];
        start_date: string;
        end_date: string;
    }>;
    profiles: Array<{
        network: string;
        url: string;
        username: string;
    }>;
}

export interface PDLEnrichmentResponse {
    status: number;
    likelihood: number;
    data: PDLPersonData;
}

export interface PDLEnrichmentResult {
    success: boolean;
    linkedin_url?: string;
    name?: string;
    title?: string;
    company?: string;
    location?: string;
    skills?: string[];
    raw?: PDLPersonData;
    error?: string;
}

/**
 * Enrich a person by email using People Data Labs API
 */
export async function enrichByEmail(
    apiKey: string,
    email: string
): Promise<PDLEnrichmentResult> {
    try {
        const url = new URL('https://api.peopledatalabs.com/v5/person/enrich');
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('email', email);
        url.searchParams.set('min_likelihood', '5');

        console.log(`[PDL] Enriching email: ${email}`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PDL] API error: ${response.status} - ${errorText}`);

            // 404 means no match found (not an error, just no data)
            if (response.status === 404) {
                return {
                    success: false,
                    error: 'No matching profile in PDL database',
                };
            }

            return {
                success: false,
                error: `PDL API error: ${response.status}`,
            };
        }

        const data: PDLEnrichmentResponse = await response.json();

        if (data.status !== 200 || !data.data) {
            console.log(`[PDL] No match found for email: ${email}`);
            return {
                success: false,
                error: 'No match found',
            };
        }

        const person = data.data;

        // Extract LinkedIn URL from profiles array or direct field
        let linkedinUrl = person.linkedin_url;
        if (!linkedinUrl && person.profiles) {
            const linkedinProfile = person.profiles.find(p => p.network === 'linkedin');
            if (linkedinProfile) {
                linkedinUrl = linkedinProfile.url;
            }
        }

        console.log(`[PDL] Found match for ${email}: ${person.full_name} - ${linkedinUrl || 'No LinkedIn'}`);

        return {
            success: true,
            linkedin_url: linkedinUrl,
            name: person.full_name,
            title: person.job_title,
            company: person.job_company_name,
            location: person.location_name,
            skills: person.skills || [],
            raw: person,
        };
    } catch (error) {
        console.error('[PDL] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Enrich a person by LinkedIn URL using People Data Labs API
 */
export async function enrichByLinkedIn(
    apiKey: string,
    linkedinUrl: string
): Promise<PDLEnrichmentResult> {
    try {
        const url = new URL('https://api.peopledatalabs.com/v5/person/enrich');
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('profile', linkedinUrl);
        url.searchParams.set('min_likelihood', '5');

        console.log(`[PDL] Enriching LinkedIn: ${linkedinUrl}`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PDL] API error: ${response.status} - ${errorText}`);
            return {
                success: false,
                error: `PDL API error: ${response.status}`,
            };
        }

        const data: PDLEnrichmentResponse = await response.json();

        if (data.status !== 200 || !data.data) {
            console.log(`[PDL] No match found for LinkedIn: ${linkedinUrl}`);
            return {
                success: false,
                error: 'No match found',
            };
        }

        const person = data.data;

        console.log(`[PDL] Found match: ${person.full_name}`);

        return {
            success: true,
            linkedin_url: linkedinUrl,
            name: person.full_name,
            title: person.job_title,
            company: person.job_company_name,
            location: person.location_name,
            skills: person.skills || [],
            raw: person,
        };
    } catch (error) {
        console.error('[PDL] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Enrich a person by name and company using People Data Labs API
 * This is a fallback when email lookup fails
 */
export async function enrichByNameAndCompany(
    apiKey: string,
    name: string,
    company?: string
): Promise<PDLEnrichmentResult> {
    try {
        const url = new URL('https://api.peopledatalabs.com/v5/person/enrich');
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('name', name);
        if (company) {
            url.searchParams.set('company', company);
        }
        url.searchParams.set('min_likelihood', '5');

        console.log(`[PDL] Enriching by name+company: ${name} at ${company || 'unknown'}`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PDL] API error: ${response.status} - ${errorText}`);

            if (response.status === 404) {
                return {
                    success: false,
                    error: 'No matching profile found',
                };
            }

            return {
                success: false,
                error: `PDL API error: ${response.status}`,
            };
        }

        const data: PDLEnrichmentResponse = await response.json();

        if (data.status !== 200 || !data.data) {
            console.log(`[PDL] No match found for: ${name}`);
            return {
                success: false,
                error: 'No match found',
            };
        }

        const person = data.data;

        let linkedinUrl = person.linkedin_url;
        if (!linkedinUrl && person.profiles) {
            const linkedinProfile = person.profiles.find(p => p.network === 'linkedin');
            if (linkedinProfile) {
                linkedinUrl = linkedinProfile.url;
            }
        }

        console.log(`[PDL] Found match for ${name}: ${person.full_name} - ${linkedinUrl || 'No LinkedIn'}`);

        return {
            success: true,
            linkedin_url: linkedinUrl,
            name: person.full_name,
            title: person.job_title,
            company: person.job_company_name,
            location: person.location_name,
            skills: person.skills || [],
            raw: person,
        };
    } catch (error) {
        console.error('[PDL] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
