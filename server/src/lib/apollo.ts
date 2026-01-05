/**
 * Apollo.io People Enrichment API Integration
 * 
 * Provides candidate enrichment including:
 * - LinkedIn profile URL
 * - Current job title & company
 * - Work experience history
 * - Education
 * - Phone numbers (optional)
 * - Social profiles
 */

const APOLLO_API_URL = 'https://api.apollo.io/api/v1';

export interface ApolloEnrichmentResult {
    success: boolean;
    person?: {
        id: string;
        first_name: string;
        last_name: string;
        name: string;
        linkedin_url: string | null;
        title: string | null;
        headline: string | null;
        photo_url: string | null;
        twitter_url: string | null;
        github_url: string | null;
        facebook_url: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        employment_history: Array<{
            id: string;
            key: string;
            title: string;
            organization_name: string;
            start_date: string | null;
            end_date: string | null;
            current: boolean;
            description: string | null;
        }>;
        organization?: {
            id: string;
            name: string;
            website_url: string | null;
            linkedin_url: string | null;
            industry: string | null;
            estimated_num_employees: number | null;
            logo_url: string | null;
            short_description: string | null;
            founded_year: number | null;
        };
        seniority: string | null;
        departments: string[];
        subdepartments: string[];
        personal_emails: string[];
        work_email: string | null;
        phone_numbers: Array<{
            number: string;
            type: string;
        }>;
        education: Array<{
            school_name: string;
            degree: string | null;
            field_of_study: string | null;
            graduation_date: string | null;
        }>;
    };
    error?: string;
}

/**
 * Enrich a person's profile using Apollo.io People Enrichment API
 * 
 * @param apiKey Apollo.io API key
 * @param params Search parameters (at least one of email, name+domain, or linkedin_url)
 * @returns Enriched person data
 */
export async function enrichPerson(
    apiKey: string,
    params: {
        email?: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        domain?: string;
        linkedin_url?: string;
        github_username?: string;
        reveal_personal_emails?: boolean;
        reveal_phone_number?: boolean;
    }
): Promise<ApolloEnrichmentResult> {
    if (!apiKey) {
        return { success: false, error: 'Apollo API key not configured' };
    }

    // Apollo requires at least email, linkedin_url, or name + domain
    if (!params.email && !params.linkedin_url && !(params.name || (params.first_name && params.last_name))) {
        return { success: false, error: 'Insufficient data for enrichment' };
    }

    try {
        const requestBody: any = {
            reveal_personal_emails: params.reveal_personal_emails ?? true,
            reveal_phone_number: params.reveal_phone_number ?? false,
        };

        // Add available params
        if (params.email) requestBody.email = params.email;
        if (params.first_name) requestBody.first_name = params.first_name;
        if (params.last_name) requestBody.last_name = params.last_name;
        if (params.name && !params.first_name && !params.last_name) {
            // Split name into first/last
            const parts = params.name.trim().split(/\s+/);
            if (parts.length >= 2) {
                requestBody.first_name = parts[0];
                requestBody.last_name = parts.slice(1).join(' ');
            } else {
                requestBody.first_name = parts[0];
            }
        }
        if (params.domain) requestBody.domain = params.domain;
        if (params.linkedin_url) requestBody.linkedin_url = params.linkedin_url;

        console.log('[Apollo] Enriching person:', {
            email: params.email,
            name: params.name || `${params.first_name} ${params.last_name}`,
            linkedin: params.linkedin_url
        });

        // Use X-Api-Key header as recommended (body params being deprecated)
        const response = await fetch(`${APOLLO_API_URL}/people/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Apollo] API error:', response.status, errorText);
            return { success: false, error: `Apollo API error: ${response.status}` };
        }

        const data = await response.json();

        if (!data.person) {
            console.log('[Apollo] No match found for:', params.email || params.name);
            return { success: false, error: 'No matching person found in Apollo database' };
        }

        const person = data.person;

        // Extract and structure the enriched data
        const result: ApolloEnrichmentResult = {
            success: true,
            person: {
                id: person.id,
                first_name: person.first_name || '',
                last_name: person.last_name || '',
                name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
                linkedin_url: person.linkedin_url || null,
                title: person.title || null,
                headline: person.headline || null,
                photo_url: person.photo_url || null,
                twitter_url: person.twitter_url || null,
                github_url: person.github_url || null,
                facebook_url: person.facebook_url || null,
                city: person.city || null,
                state: person.state || null,
                country: person.country || null,
                employment_history: (person.employment_history || []).map((job: any) => ({
                    id: job.id || '',
                    key: job.key || '',
                    title: job.title || '',
                    organization_name: job.organization_name || '',
                    start_date: job.start_date || null,
                    end_date: job.end_date || null,
                    current: job.current || false,
                    description: job.description || null,
                })),
                organization: person.organization ? {
                    id: person.organization.id || '',
                    name: person.organization.name || '',
                    website_url: person.organization.website_url || null,
                    linkedin_url: person.organization.linkedin_url || null,
                    industry: person.organization.industry || null,
                    estimated_num_employees: person.organization.estimated_num_employees || null,
                    logo_url: person.organization.logo_url || null,
                    short_description: person.organization.short_description || null,
                    founded_year: person.organization.founded_year || null,
                } : undefined,
                seniority: person.seniority || null,
                departments: person.departments || [],
                subdepartments: person.subdepartments || [],
                personal_emails: person.personal_emails || [],
                work_email: person.work_email || null,
                phone_numbers: (person.phone_numbers || []).map((p: any) => ({
                    number: p.sanitized_number || p.number || '',
                    type: p.type || 'unknown',
                })),
                education: (person.education || []).map((edu: any) => ({
                    school_name: edu.school?.name || edu.school_name || '',
                    degree: edu.degree || null,
                    field_of_study: edu.field_of_study || null,
                    graduation_date: edu.graduation_date || null,
                })),
            },
        };

        console.log('[Apollo] Successfully enriched:', result.person?.name, '| LinkedIn:', result.person?.linkedin_url);
        return result;

    } catch (error: any) {
        console.error('[Apollo] Enrichment failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk enrich up to 10 people at once
 */
export async function bulkEnrichPeople(
    apiKey: string,
    people: Array<{
        email?: string;
        first_name?: string;
        last_name?: string;
        domain?: string;
        linkedin_url?: string;
    }>
): Promise<ApolloEnrichmentResult[]> {
    if (!apiKey) {
        return people.map(() => ({ success: false, error: 'Apollo API key not configured' }));
    }

    // Apollo limits to 10 per request
    if (people.length > 10) {
        console.warn('[Apollo] Bulk enrichment limited to 10 people, truncating...');
        people = people.slice(0, 10);
    }

    try {
        // Use X-Api-Key header as recommended (body params being deprecated)
        const response = await fetch(`${APOLLO_API_URL}/people/bulk_match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey,
            },
            body: JSON.stringify({
                reveal_personal_emails: true,
                reveal_phone_number: false,
                details: people,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Apollo] Bulk API error:', response.status, errorText);
            return people.map(() => ({ success: false, error: `Apollo API error: ${response.status}` }));
        }

        const data = await response.json();
        const matches = data.matches || [];

        return matches.map((match: any, index: number) => {
            if (!match) {
                return { success: false, error: 'No match found' };
            }
            // Process each match similar to single enrichment
            return {
                success: true,
                person: {
                    id: match.id,
                    first_name: match.first_name || '',
                    last_name: match.last_name || '',
                    name: match.name || '',
                    linkedin_url: match.linkedin_url || null,
                    title: match.title || null,
                    headline: match.headline || null,
                    photo_url: match.photo_url || null,
                    twitter_url: match.twitter_url || null,
                    github_url: match.github_url || null,
                    facebook_url: match.facebook_url || null,
                    city: match.city || null,
                    state: match.state || null,
                    country: match.country || null,
                    employment_history: match.employment_history || [],
                    organization: match.organization,
                    seniority: match.seniority || null,
                    departments: match.departments || [],
                    subdepartments: match.subdepartments || [],
                    personal_emails: match.personal_emails || [],
                    work_email: match.work_email || null,
                    phone_numbers: match.phone_numbers || [],
                    education: match.education || [],
                },
            };
        });

    } catch (error: any) {
        console.error('[Apollo] Bulk enrichment failed:', error.message);
        return people.map(() => ({ success: false, error: error.message }));
    }
}

/**
 * Helper to format enriched data for display
 */
export function formatEnrichedProfile(data: ApolloEnrichmentResult['person']): {
    linkedinUrl: string | null;
    currentRole: string | null;
    currentCompany: string | null;
    companyLogo: string | null;
    location: string | null;
    seniority: string | null;
    workHistory: Array<{ title: string; company: string; current: boolean; duration: string }>;
    education: Array<{ school: string; degree: string | null }>;
    socialLinks: { linkedin?: string; twitter?: string; github?: string; facebook?: string };
} {
    if (!data) {
        return {
            linkedinUrl: null,
            currentRole: null,
            currentCompany: null,
            companyLogo: null,
            location: null,
            seniority: null,
            workHistory: [],
            education: [],
            socialLinks: {},
        };
    }

    const currentJob = data.employment_history?.find(j => j.current) || data.employment_history?.[0];

    const formatLocation = () => {
        const parts = [data.city, data.state, data.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    const formatDuration = (start: string | null, end: string | null, current: boolean) => {
        if (!start) return current ? 'Present' : '';
        const startYear = start.split('-')[0];
        const endYear = current ? 'Present' : (end?.split('-')[0] || '');
        return `${startYear} - ${endYear}`;
    };

    return {
        linkedinUrl: data.linkedin_url,
        currentRole: currentJob?.title || data.title,
        currentCompany: currentJob?.organization_name || data.organization?.name || null,
        companyLogo: data.organization?.logo_url || null,
        location: formatLocation(),
        seniority: data.seniority,
        workHistory: (data.employment_history || []).slice(0, 5).map(job => ({
            title: job.title,
            company: job.organization_name,
            current: job.current,
            duration: formatDuration(job.start_date, job.end_date, job.current),
        })),
        education: (data.education || []).slice(0, 3).map(edu => ({
            school: edu.school_name,
            degree: edu.degree ? `${edu.degree}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}` : null,
        })),
        socialLinks: {
            linkedin: data.linkedin_url || undefined,
            twitter: data.twitter_url || undefined,
            github: data.github_url || undefined,
            facebook: data.facebook_url || undefined,
        },
    };
}
