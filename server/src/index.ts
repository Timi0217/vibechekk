console.log(">>> VIBECHEKK SERVER STARTING... <<<");
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { findTopRepos, analyzeGlobalTrajectory, fetchMultiRepoDiffs } from './lib/github.js';
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

        console.log(`[Backend] Starting holistic vibe check for ${owner}`);
        const topRepos = await findTopRepos(GITHUB_TOKEN, owner);
        if (topRepos.length === 0) throw new Error('No public repositories found');

        const metadata = analyzeGlobalTrajectory(topRepos);
        const diffs = await fetchMultiRepoDiffs(GITHUB_TOKEN, owner, topRepos);
        const reportData = await analyzeWithDeepSeek(DEEPSEEK_KEY, metadata, diffs);
        const primaryRepo = topRepos[0].name;

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
                archetype: reportData.label || reportData.archetype || 'Unknown', // Use label as archetype for backward compatibility
                label: reportData.label,
                trajectorySummary: reportData.trajectory_summary,
                recruiterSummary: reportData.recruiter_summary,
                meritPoints: reportData.highlights || reportData.merit_points,
                confidence: reportData.technical_signal ? 100 : 50, // Use technical_signal presence as confidence indicator
                repoName: primaryRepo,
                metadata: {
                    ...metadata,
                    technical_signal: reportData.technical_signal,
                    technical_signal_detailed: reportData.technical_signal_detailed
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
        const counts = await prisma.vibeReport.groupBy({ by: ['archetype'], _count: { id: true } });
        const total = await prisma.vibeReport.count();
        res.json({
            success: true,
            data: {
                totalChecks: total,
                distribution: counts.reduce((acc: any, curr) => {
                    acc[curr.archetype] = curr._count.id;
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
