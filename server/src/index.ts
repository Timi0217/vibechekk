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

app.post('/api/chekklist/search', checkTierLimit, async (req, res) => {
    const { jobTitle, jd, experience, languages, archetypes, tiers } = req.body;
    const user = (req as any).user;

    console.log(`[Chekklist] Search request from ${user?.email || 'guest'}: ${jobTitle}`);

    if (!GITHUB_TOKEN) return res.status(500).json({ success: false, error: 'GitHub Token missing' });

    try {
        // 1. Search GitHub
        // Import dynamically if needed or just use the import from top if I added it (I need to check imports!)
        // Since I can't easily add import to top with replace_file_content efficiently without reading whole file, 
        // I'll assume I need to add import. Wait, I can't add import at top in this chunk.
        // I will rely on the fact that I can't easily import it without editing the top.
        // I'll use `require` or `import()` dynamic import? Or just add the import in a separate step?
        // Let's assume I'll fix imports in next step to be safe.
        // Or I can use multi_replace to add import.
        // I'll use Dynamic Import for now to avoid breaking file if I miss line numbers at top.
        const { searchCandidates } = await import('./lib/github.js');

        const candidates = await searchCandidates(GITHUB_TOKEN, { languages, experience, jobTitle });

        console.log(`[Chekklist] Found ${candidates.length} candidates.`);

        // 2. Filter/Analyze with DeepSeek
        let rankings: any = {};
        if (process.env.DEEPSEEK_API_KEY && jd) {
            try {
                const { rankCandidates } = await import('./lib/deepseek');
                rankings = await rankCandidates(process.env.DEEPSEEK_API_KEY, { jobTitle, jd, experience, languages, archetypes, tiers }, candidates);
            } catch (e) { console.error('DeepSeek Rank Step Failed:', e); }
        }

        const results = candidates.map((c: any) => {
            const rank = rankings[c.login] || { score: 60, reason: 'Matched via keywords' };
            return {
                handle: c.login,
                name: c.name || c.login,
                avatar: c.avatarUrl,
                bio: c.bio,
                matchScore: rank.score,
                matchReason: rank.reason,
                archetype: rank.archetype,
                tier: rank.tier,
                topRepo: c.repositories.nodes[0]?.name || 'Unknown',
                topRepoDesc: c.repositories.nodes[0]?.description
            };
        }).sort((a: any, b: any) => b.matchScore - a.matchScore);

        res.json({ success: true, candidates: results });

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
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
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>GitHub Connected | Vibechekk</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #0d1117;
                        color: #f0f6fc;
                    }
                    .container {
                        text-align: center;
                        padding: 48px;
                        max-width: 420px;
                        animation: fadeIn 0.5s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .checkmark-circle {
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 28px;
                        background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 32px rgba(46, 160, 67, 0.4);
                        animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s both;
                    }
                    @keyframes scaleIn {
                        from { transform: scale(0); }
                        to { transform: scale(1); }
                    }
                    .checkmark-circle svg {
                        width: 40px;
                        height: 40px;
                        stroke: white;
                        stroke-width: 3;
                        fill: none;
                    }
                    .checkmark-circle svg path {
                        stroke-dasharray: 50;
                        stroke-dashoffset: 50;
                        animation: drawCheck 0.5s ease-out 0.5s forwards;
                    }
                    @keyframes drawCheck {
                        from { stroke-dashoffset: 50; }
                        to { stroke-dashoffset: 0; }
                    }
                    h1 {
                        font-size: 28px;
                        font-weight: 800;
                        letter-spacing: -0.02em;
                        margin-bottom: 12px;
                        color: #f0f6fc;
                    }
                    .username {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 10px 18px;
                        background: #21262d;
                        border: 1px solid #30363d;
                        border-radius: 100px;
                        font-size: 15px;
                        font-weight: 600;
                        color: #f0f6fc;
                        margin-bottom: 24px;
                    }
                    .username svg {
                        width: 20px;
                        height: 20px;
                    }
                    p {
                        font-size: 14px;
                        color: #8b949e;
                        line-height: 1.6;
                        margin-bottom: 8px;
                    }
                    .success-text {
                        color: #3fb950 !important;
                        font-weight: 600;
                    }
                    .closing {
                        font-size: 12px;
                        color: #6e7681;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-top: 28px;
                    }
                    .spinner {
                        width: 14px;
                        height: 14px;
                        border: 2px solid #30363d;
                        border-top-color: #f0f6fc;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="checkmark-circle">
                        <svg viewBox="0 0 24 24">
                            <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h1>GitHub Connected!</h1>
                    <div class="username">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        @${githubUser.login}
                    </div>
                    <p>Your GitHub account has been successfully linked to Vibechekk.</p>
                    <p class="success-text">You now have access to enhanced reports!</p>
                    <div class="closing">
                        <div class="spinner"></div>
                        Closing automatically...
                    </div>
                </div>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(userWithGithub)} }, '*');
                    }
                    setTimeout(() => window.close(), 2500);
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

// Email to GitHub username lookup
app.post('/api/lookup/email', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    if (!GITHUB_TOKEN) return res.status(500).json({ success: false, error: 'GitHub Token missing' });

    try {
        const { searchUserByEmail } = await import('./lib/github.js');
        const username = await searchUserByEmail(GITHUB_TOKEN, email);

        if (username) {
            res.json({ success: true, username });
        } else {
            res.json({ success: false, error: 'No GitHub user found for this email' });
        }
    } catch (e: any) {
        console.error('[Email Lookup Error]', e);
        res.status(500).json({ success: false, error: e.message });
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
