/**
 * Clearout.io Reverse Lookup API Integration
 * 
 * Provides email-to-LinkedIn enrichment:
 * - LinkedIn profile URL
 * - Name
 * - Current job title & company
 * - Location
 * - Profile picture
 */

const CLEAROUT_API_URL = 'https://api.clearout.io/v2/reverse_lookup/email';

export interface ClearoutEnrichmentResult {
    success: boolean;
    data?: {
        linkedinUrl: string | null;
        name: string | null;
        title: string | null;
        company: string | null;
        companyDomain: string | null;
        profilePicture: string | null;
        location: {
            city: string | null;
            state: string | null;
            country: string | null;
        } | null;
        totalExperienceMonths: number | null;
    };
    error?: string;
}

/**
 * Look up a person by email using Clearout.io
 */
export async function enrichByEmail(
    email: string,
    apiToken: string
): Promise<ClearoutEnrichmentResult> {
    try {
        if (!email || !apiToken) {
            return { success: false, error: 'Missing email or API token' };
        }

        console.log(`[Clearout] Looking up email: ${email}`);

        const response = await fetch(
            `${CLEAROUT_API_URL}?email_address=${encodeURIComponent(email)}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': apiToken,
                },
            }
        );

        if (!response.ok) {
            const status = response.status;

            if (status === 404) {
                console.log(`[Clearout] No person found for email: ${email}`);
                return { success: false, error: 'not_found' };
            }

            if (status === 402) {
                console.error(`[Clearout] Payment required - check credits`);
                return { success: false, error: 'payment_required' };
            }

            if (status === 401) {
                console.error(`[Clearout] Unauthorized - check API token`);
                return { success: false, error: 'unauthorized' };
            }

            if (status === 429) {
                console.error(`[Clearout] Rate limit reached`);
                return { success: false, error: 'rate_limited' };
            }

            console.error(`[Clearout] API error: ${status}`);
            return { success: false, error: `api_error_${status}` };
        }

        const result = await response.json();

        if (result.status !== 'success' || !result.data?.lead) {
            console.log(`[Clearout] No lead data in response for: ${email}`);
            return { success: false, error: 'no_data' };
        }

        const lead = result.data.lead;
        const address = lead.addresses?.[0] || null;

        console.log(`[Clearout] Found: ${lead.name} - ${lead.linkedin_url || 'No LinkedIn'}`);

        return {
            success: true,
            data: {
                linkedinUrl: lead.linkedin_url || null,
                name: lead.name || null,
                title: lead.title || lead.contructed_title || null,
                company: lead.company_name || null,
                companyDomain: lead.company_domain || null,
                profilePicture: lead.profile_picture || null,
                location: address ? {
                    city: address.city || null,
                    state: address.state || null,
                    country: address.country || null,
                } : null,
                totalExperienceMonths: lead.total_experience_in_months || null,
            },
        };
    } catch (error) {
        console.error('[Clearout] Request failed:', error);
        return { success: false, error: 'request_failed' };
    }
}
