import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Only initialize Resend if API key is provided (optional)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendProfileViewedEmail(candidateId: string, archetypeOverride?: string) {
    // Skip if Resend is not configured
    if (!resend) {
        console.log('[Email] Resend not configured, skipping email');
        return;
    }

    try {
        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: { reports: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });

        if (!candidate || !candidate.email || candidate.claimed) return;

        // Check if we already emailed them in the last 7 days to avoid spam
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (candidate.lastEmailedAt && candidate.lastEmailedAt > sevenDaysAgo) {
            console.log(`[Email] Skipping ${candidate.githubHandle}, already emailed recently.`);
            return;
        }

        const report = candidate.reports[0];
        const archetype = archetypeOverride || report?.archetype || 'Specialist';

        console.log(`[Email] Sending profile viewed email to ${candidate.githubHandle} (${candidate.email})`);

        const { data, error } = await resend.emails.send({
            from: 'Vibechekk <notifications@vibechekk.dev>',
            to: candidate.email,
            subject: 'A recruiter viewed your GitHub profile',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
                    <h2 style="color: #1a1a1a;">Someone's interested in your work.</h2>
                    <p>You were recently analyzed on Vibechekk and classified as a <strong>${archetype}</strong>.</p>
                    
                    <p>Claim your profile to:</p>
                    <ul style="line-height: 1.6;">
                        <li>See your full technical analysis</li>
                        <li>Add private repos for richer signal</li>
                        <li>Toggle "Open to Work" to surface for opportunities</li>
                        <li>Control how recruiters see you</li>
                    </ul>

                    <div style="margin: 30px 0;">
                        <a href="https://vibechekk.dev/claim/${candidate.githubHandle}" 
                           style="background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                            Claim Your Profile
                        </a>
                    </div>

                    <p style="color: #666; font-size: 14px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                        — Team Vibechekk
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('[Resend Error]', error);
            return;
        }

        // Update last emailed at
        await prisma.candidate.update({
            where: { id: candidateId },
            data: { lastEmailedAt: new Date() }
        });

        console.log(`[Email] Successfully sent to ${candidate.githubHandle}`);

    } catch (err) {
        console.error('[Email Loop Error]', err);
    }
}
