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
    if (!authHeader) return next(); // Guest mode

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return next();

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

        const limits = { GUEST: 3, AUTHENTICATED: 5, PRO: 100 };
        const userLimit = limits[user.tier] || 3;

        if (user.usageCount >= userLimit) {
            return res.status(429).json({
                success: false,
                error: `Tier limit reached (${userLimit} per ${user.tier === 'PRO' ? 'month' : 'hour'}). Upgrade to Pro for more.`
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
                    highest_repo_stars: reportData.highest_repo_stars
                } as any
            },
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
        const archetypeCounts = await prisma.vibeReport.groupBy({
            by: ['archetype'],
            where: whereClause,
            _count: { id: true }
        });

        // Get tier distribution (no filter for overview)
        const tierCounts = await prisma.vibeReport.groupBy({
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
                distribution: archetypeCounts.reduce((acc: any, curr) => {
                    acc[curr.archetype] = curr._count.id;
                    return acc;
                }, {}),
                tierBreakdown: tierCounts.reduce((acc: any, curr) => {
                    acc[curr.tier] = curr._count.id;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Vibechekk Backend v3.5 (Recruiter Summary + Multi-Repo) running on port ${PORT}`);
});
