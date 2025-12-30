console.log(">>> VIBECHEKK SERVER STARTING... <<<");
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { analyzeGitHubProfile } from './lib/github.js';
import { analyzeWithDeepSeek } from './lib/deepseek.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'vibe-secret-shhhh';

// Use environment variables for API keys
const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

// --- AUTH UTILS ---
// ... (rest of imports/utils remains same)
const verifyAtsToken = async (token: string, type: 'ashby' | 'greenhouse') => {
    // Mocking ATS verification for now
    if (token.startsWith('ash_') || token.startsWith('gh_')) {
        return { email: `recruiter-${token.slice(0, 5)}@test.com`, name: 'Recruiter' };
    }
    return null;
};

// --- MIDDLEWARE ---
const checkTierLimit = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';

    if (!authHeader) {
        // Enforce Guest Limit (2 per IP)
        try {
            const guestCount = await prisma.vibeReport.count({
                where: { guestIp: typeof ip === 'string' ? ip : 'unknown-ip', userId: null }
            });

            if (guestCount >= 2) {
                return res.status(429).json({
                    success: false,
                    error: 'Guest limit reached. Login to get one extra check!'
                });
            }
            return next();
        } catch (e) {
            return next(); // Fallback if DB fails
        }
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return res.status(401).json({ success: false, error: 'User session invalid' });

        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

        if (user.lastResetAt < (user.tier === 'PRO' ? monthAgo : hourAgo)) {
            await prisma.user.update({
                where: { id: user.id },
                data: { usageCount: 0, lastResetAt: now }
            });
            user.usageCount = 0;
        }

        const limits = { GUEST: 2, AUTHENTICATED: 5, PRO: 100 };
        const userLimit = limits[user.tier] || 2;

        if (user.usageCount >= userLimit) {
            return res.status(429).json({
                success: false,
                error: user.tier === 'PRO'
                    ? `Monthly limit reached (${userLimit} profiles).`
                    : `Limit reached. Upgrade to Pro for unlimited chekks.`
            });
        }

        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Explicitly handle OPTIONS for all routes
app.options('*', cors());

// --- AUTH ROUTES ---
app.post('/api/auth/ats', async (req, res) => {
    const { token, type } = req.body;
    const atsUser = await verifyAtsToken(token, type);
    if (!atsUser) return res.status(401).json({ success: false, error: 'Invalid ATS credentials' });

    const user = await prisma.user.upsert({
        where: { email: atsUser.email },
        update: { tier: 'AUTHENTICATED' },
        create: {
            email: atsUser.email,
            name: atsUser.name,
            tier: 'AUTHENTICATED'
        }
    });

    const vibeToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token: vibeToken, user });
});

app.post('/api/auth/google', async (req, res) => {
    const { token, email, name, picture } = req.body;
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

    // Use real Google profile data sent from extension
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            tier: 'AUTHENTICATED',
            name: name || undefined,
            picture: picture || undefined
        },
        create: {
            email,
            name: name || 'User',
            picture: picture || null,
            tier: 'AUTHENTICATED'
        }
    });

    const vibeToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token: vibeToken, user });
});

app.get('/', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/analyze', checkTierLimit, async (req, res) => {
    const { githubUrl } = req.body;
    const user = (req as any).user;
    const isPro = user?.tier === 'PRO';

    if (!githubUrl) return res.status(400).json({ success: false, error: 'githubUrl is required' });

    console.log(`[API] Received analyze request for: ${githubUrl} (userId: ${user?.id || req.body.userId || 'guest'})`);

    try {
        let candidate = await prisma.candidate.findUnique({
            where: { githubUrl },
            include: { reports: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });

        if (candidate && candidate.reports && candidate.reports.length > 0) {
            const lastReport = candidate.reports[0];
            const thirtyMinAgo = new Date();
            thirtyMinAgo.setMinutes(thirtyMinAgo.getMinutes() - 30);

            // If the report was created less than 30 minutes ago, return it immediately
            // This prevents rapid-fire duplicate analysis
            if (lastReport.createdAt > thirtyMinAgo) {
                console.log(`[Deduplication] Returning fresh report for ${githubUrl} (Created ${Math.floor((new Date().getTime() - lastReport.createdAt.getTime()) / 1000)}s ago)`);
                return res.json({ success: true, data: lastReport, cached: true, isPro });
            }

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Check if report has old hyperlink format (contains ** or https://)
            const hasOldFormat = lastReport.trajectorySummary?.includes('**') ||
                lastReport.trajectorySummary?.includes('https://') ||
                lastReport.recruiterSummary?.includes('**') ||
                lastReport.recruiterSummary?.includes('https://');

            if (lastReport.createdAt > thirtyDaysAgo && lastReport.recruiterSummary && !hasOldFormat) {
                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { usageCount: { increment: 1 } }
                    });
                }
                console.log(`[Cache Hit] Returning cached report for ${githubUrl}`);
                return res.json({ success: true, data: lastReport, cached: true, isPro });
            }
        }

        if (!GITHUB_TOKEN || !DEEPSEEK_KEY) throw new Error('API keys missing');

        let normalizedUrl = githubUrl.trim().replace(/^@/, '');
        if (!normalizedUrl.includes('github.com')) normalizedUrl = `github.com/${normalizedUrl}`;
        const match = normalizedUrl.match(/github\.com\/([^/]+)(?:\/([^/]+))?/i);
        if (!match) throw new Error('Invalid GitHub URL');

        let [, owner] = match;
        owner = owner.replace(/^@/, '');

        console.log(`[Backend] Starting holistic profile check for ${owner}`);
        const profileData = await analyzeGitHubProfile(GITHUB_TOKEN, owner);
        console.log(`[Stats] ${owner}: Total ${profileData.starDistribution.total_stars}, Peak ${profileData.starDistribution.highest_single_repo}`);

        // Calculate quality score for Hidden Gem detection
        const qualityScore = profileData.qualitySignals.reduce((score: number, q: any) => {
            if (!q) return score;
            return score
                + (q.hasTests ? 2 : 0)
                + (q.hasCI ? 2 : 0)
                + (q.hasTypeScript ? 1 : 0)
                + (q.hasLinting ? 1 : 0)
                + (q.complexity === 'high' ? 2 : q.complexity === 'medium' ? 1 : 0);
        }, 0);

        const reportData = await analyzeWithDeepSeek(DEEPSEEK_KEY, profileData, profileData.codeSamples);
        const primaryRepo = profileData.topRepos.length > 0 ? profileData.topRepos[0].name : 'No Public Projects';

        const savedCandidate = await prisma.candidate.upsert({
            where: { githubUrl },
            update: { lastCheckedAt: new Date() },
            create: { githubUrl, githubHandle: owner }
        });

        const requesterIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const report = await prisma.vibeReport.create({
            data: {
                candidateId: savedCandidate.id,
                userId: user?.id || null,
                guestIp: user ? null : (Array.isArray(requesterIp) ? requesterIp[0] : requesterIp),
                archetype: reportData.label || 'THE PRACTICAL BUILDER',
                tier: reportData.rarity || 'COMMON',
                label: reportData.label || 'THE PRACTICAL BUILDER',
                trajectorySummary: reportData.trajectory_summary || 'Trajectory analysis pending.',
                recruiterSummary: reportData.recruiter_summary || 'Detailed analysis pending.',
                meritPoints: (reportData.highlights || []) as any,
                confidence: 100,
                repoName: primaryRepo,
                metadata: {
                    userStats: profileData.userStats,
                    starDistribution: profileData.starDistribution,
                    qualitySignals: profileData.qualitySignals,
                    qualityScore,
                    technical_signal: reportData.technical_signal,
                    technical_signal_detailed: reportData.technical_signal_detailed,
                    verified_skills: reportData.verified_skills,
                    highest_repo_stars: reportData.highest_repo_stars,
                    archetype_reason: reportData.archetype_reason
                } as any
            } as any,
            include: { candidate: true }
        });

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { usageCount: { increment: 1 } }
            });
        }

        res.json({ success: true, data: report, isPro });
    } catch (error: any) {
        console.error('Analysis error:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
});

app.get('/api/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No code provided');

    try {
        console.log('[Auth] Exchanging code for token...');
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            })
        });

        const tokenData: any = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description || 'Token exchange failed');

        const accessToken = tokenData.access_token;
        console.log('[Auth] Token received. Fetching user...');

        // Fetch User
        const userRes = await fetch('https://api.github.com/user', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const githubUser: any = await userRes.json();

        // Fetch Email if not public
        let email = githubUser.email;
        if (!email) {
            const emailsRes = await fetch('https://api.github.com/user/emails', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const emails: any = await emailsRes.json();
            if (Array.isArray(emails)) {
                email = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
            }
        }

        if (!email) {
            email = `${githubUser.login}@github.no-email`;
        }

        // Upsert User
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: githubUser.name || githubUser.login,
                    picture: githubUser.avatar_url,
                    tier: 'AUTHENTICATED'
                }
            });
        }

        const token = jwt.sign({ userId: user.id, email: user.email, tier: user.tier }, process.env.JWT_SECRET || 'vibe-secret-shhhh');

        // Include GitHub login for display in extension
        const userWithGithub = { ...user, githubLogin: githubUser.login };

        res.send(`
            <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fdfaf6; color: #1a1a1a;">
                <div style="background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 400px; margin: 0 auto;">
                    <h1 style="color: #22c55e; margin-bottom: 10px;">Transformation Complete!</h1>
                    <p style="color: #666; margin-bottom: 20px;">Your GitHub account has been linked.</p>
                    <p style="font-size: 12px; color: #999;">You can close this window.</p>
                </div>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(userWithGithub)} }, '*');
                    }
                    setTimeout(() => window.close(), 2000);
                </script>
                <div id="vibechekk-auth-data" style="display:none" data-token="${token}" data-user='${JSON.stringify(userWithGithub)}'></div>
            </body>
            </html>
        `);

    } catch (e: any) {
        console.error('[Auth Error]', e);
        res.status(500).send(`Authentication Failed: ${e.message}`);
    }
});

app.get('/api/history', async (req, res) => {
    const { userId } = req.query;
    try {
        const history = await prisma.vibeReport.findMany({
            where: userId ? { userId: String(userId) } : {},
            include: { candidate: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const tierFilter = req.query.tier as string | undefined;

        // Build where clause for filtering
        const whereClause = tierFilter ? { tier: tierFilter } : {};

        // Get archetype distribution (with optional tier filter)
        const archetypeCounts = await (prisma.vibeReport as any).groupBy({
            by: ['archetype'],
            where: whereClause,
            _count: { id: true }
        });

        // Get tier distribution (no filter for overview)
        const tierCounts = await (prisma.vibeReport as any).groupBy({
            by: ['tier'],
            _count: { id: true }
        });

        const filteredTotal = await prisma.vibeReport.count({ where: whereClause });
        const total = await prisma.vibeReport.count();

        res.json({
            success: true,
            data: {
                totalChecks: total,
                filteredTotal: filteredTotal,
                activeFilter: tierFilter || null,
                distribution: archetypeCounts.reduce((acc: any, curr: any) => {
                    acc[curr.archetype] = curr._count.id;
                    return acc;
                }, {}),
                tierBreakdown: tierCounts.reduce((acc: any, curr: any) => {
                    acc[curr.tier] = curr._count.id;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
});

app.use((req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found on this server.` });
});

app.listen(PORT, () => {
    console.log(`Vibechekk Backend v3.5 (Recruiter Summary + Multi-Repo) running on port ${PORT}`);
});
