console.log(">>> VIBECHEKK SERVER STARTING... <<<");
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendProfileViewedEmail } from './lib/email.js';
import { analyzeGitHubProfile, calculateReachability, resolveGitHubEmail, fetchUserStats } from './lib/github.js';
import { analyzeWithDeepSeek } from './lib/deepseek.js';
import { enrichByEmail as pdlEnrichByEmail } from './lib/pdl.js';
import { findLinkedInProfile as exaFindLinkedIn, buildSearchContext as exaBuildContext } from './lib/exa.js';
import Stripe from 'stripe';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: Enforce JWT_SECRET - MUST be set in production
// ═══════════════════════════════════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
    console.error('   Set a secure random string in your environment variables.');
    console.error('   Generate one with: openssl rand -base64 32');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    } else {
        console.warn('⚠️  DEV MODE: Using insecure fallback JWT_SECRET');
    }
}
const SECURE_JWT_SECRET = JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-prod';

// Use environment variables for API keys
const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PDL_API_KEY = process.env.PDL_API_KEY;
const EXA_API_KEY = process.env.EXA_API_KEY || '';

// Validate critical API keys
if (!GITHUB_TOKEN) {
    console.warn('⚠️  WARNING: GITHUB_API_TOKEN not set. API calls will be rate limited.');
}
if (!DEEPSEEK_KEY) {
    console.warn('⚠️  WARNING: DEEPSEEK_API_KEY not set. AI analysis will fail.');
}
if (!PDL_API_KEY) {
    console.warn('⚠️  WARNING: PDL_API_KEY not set. Candidate enrichment disabled.');
}


// Initialize Stripe
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
if (!stripe) {
    console.warn('⚠️  WARNING: STRIPE_SECRET_KEY not set. Payments disabled.');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: CORS Configuration - Restrict origins in production
// ═══════════════════════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = [
    'chrome-extension://pbnpceefkjmpchjfldfpjjnbmdingpjn', // Production extension ID
    'chrome-extension://efmkmikfihdiflhoahpomphlobpplnon', // Dev extension ID (update if different)
    'https://vibechekk.dev',
    'https://www.vibechekk.dev',
    'https://vibechekk-landing.vercel.app',
    'http://localhost:3000', // Local landing page dev
    'http://localhost:5173', // Local Vite dev
];

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, Postman, etc.) in dev
        if (!origin) {
            callback(null, true);
            return;
        }
        // Allow any chrome-extension:// origin (for dev extensions)
        if (origin.startsWith('chrome-extension://')) {
            callback(null, true);
            return;
        }
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else if (process.env.NODE_ENV !== 'production') {
            // In dev, allow any origin but log it
            console.log(`[CORS] Allowing dev origin: ${origin}`);
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: Simple Rate Limiting (in-memory, consider Redis for production)
// ═══════════════════════════════════════════════════════════════════════════
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per IP

const rateLimiter = (req: any, res: any, next: any) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = typeof ip === 'string' ? ip : ip[0] || 'unknown';
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
        rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return next();
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests. Please slow down and try again in a minute.',
            retryAfter: Math.ceil((entry.resetAt - now) / 1000)
        });
    }

    entry.count++;
    next();
};

// Clean up rate limit store periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean every minute

// --- AUTH UTILS ---
const verifyAtsToken = async (token: string, type: 'ashby' | 'greenhouse') => {
    // Mocking ATS verification for now
    if (token.startsWith('ash_') || token.startsWith('gh_')) {
        return { email: `recruiter-${token.slice(0, 5)}@test.com`, name: 'Recruiter' };
    }
    return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Tier-based Usage Limits with better error messages
// ═══════════════════════════════════════════════════════════════════════════
const checkTierLimit = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    // Also check query param for SSE (EventSource doesn't support custom headers)
    const queryToken = req.query.token as string | undefined;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';

    // Get token from header or query param
    const token = authHeader?.split(' ')[1] || queryToken;

    if (!token) {
        // Enforce Guest Limit (2 per IP)
        try {
            const guestCount = await prisma.vibeReport.count({
                where: { guestIp: typeof ip === 'string' ? ip : 'unknown-ip', userId: null }
            });

            if (guestCount >= 2) {
                return res.status(429).json({
                    success: false,
                    error: 'You\'ve used your 2 free Vibechekks! Sign in with GitHub to unlock 3 more, or upgrade to Pro for unlimited checks.',
                    code: 'GUEST_LIMIT_REACHED',
                    limit: 2,
                    used: guestCount
                });
            }
            return next();
        } catch (e) {
            console.error('[Tier Check] Database error:', e);
            return next(); // Fallback if DB fails
        }
    }

    try {
        const decoded: any = jwt.verify(token, SECURE_JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Your session has expired. Please sign in again.',
                code: 'SESSION_EXPIRED'
            });
        }

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

        const limits: Record<string, number> = { GUEST: 2, AUTHENTICATED: 3, PRO: Infinity };
        const userLimit = limits[user.tier] || 2;

        if (user.usageCount >= userLimit) {
            const resetTime = 'at the start of next week';
            return res.status(429).json({
                success: false,
                error: user.tier === 'PRO'
                    ? 'Something went wrong - PRO users have unlimited checks!'
                    : `You've reached your limit of ${userLimit} checks this week. Upgrade to Pro for unlimited checks!`,
                code: 'USAGE_LIMIT_REACHED',
                tier: user.tier,
                limit: userLimit,
                used: user.usageCount,
                resetTime
            });
        }

        req.user = user;
        next();
    } catch (e: any) {
        if (e.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Your session has expired. Please sign in again.',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            success: false,
            error: 'Invalid authentication. Please sign in again.',
            code: 'INVALID_TOKEN'
        });
    }
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(rateLimiter);

// Explicitly handle OPTIONS for all routes
app.options('*', cors(corsOptions));

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

    const vibeToken = jwt.sign({ userId: user.id }, SECURE_JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token: vibeToken, user });
});

app.post('/api/auth/google', async (req, res) => {
    const { token, email, name, picture, referralCode } = req.body;
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

    // Use real Google profile data sent from extension
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Resolve referral code if provided
    let referredById = undefined;
    if (referralCode) {
        const referrer = await prisma.user.findFirst({ where: { referralCode } });
        if (referrer && referrer.email !== email) { // Don't refer self
            referredById = referrer.id;
        }
    }

    // Check if user exists to preserve their tier
    const existingUser = await prisma.user.findUnique({ where: { email } });

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            // Don't change tier on login - preserve existing tier (especially PRO)
            name: name || undefined,
            picture: picture || undefined
        },
        create: {
            email,
            name: name || 'User',
            picture: picture || null,
            tier: 'AUTHENTICATED',
            referredById // Attribute referral on signup
        }
    });

    const vibeToken = jwt.sign({ userId: user.id }, SECURE_JWT_SECRET, { expiresIn: '30d' });
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

            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            // Force update if:
            // 1. Report is > 2 days old (was 30 days)
            // 2. Report doesn't have the new "repositories" stats prefix in reason
            // 3. Report has markdown/hyperlink artifacts from old models
            const metadata = lastReport.metadata as any;
            const needsUpdate = lastReport.createdAt < twoDaysAgo ||
                !metadata?.archetype_reason?.includes('repositories') ||
                lastReport.trajectorySummary?.includes('**') ||
                lastReport.trajectorySummary?.includes('https://');

            if (!needsUpdate && lastReport.recruiterSummary) {
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

        // Resolve email synchronously if not available from GraphQL (so it's available immediately)
        let resolvedEmail = profileData.email || null;
        if (!resolvedEmail && GITHUB_TOKEN) {
            console.log(`[Analysis] No email from GraphQL for ${owner}, resolving from commits...`);
            resolvedEmail = await resolveGitHubEmail(GITHUB_TOKEN, owner);
            if (resolvedEmail) {
                console.log(`[Analysis] Resolved email for ${owner}: ${resolvedEmail}`);
                // Update profileData so it's included in the response
                profileData.email = resolvedEmail;
            }
        }

        const savedCandidate = await prisma.candidate.upsert({
            where: { githubUrl },
            update: {
                lastCheckedAt: new Date(),
                name: profileData.userStats?.name || null,
                email: profileData.email || null
            },
            create: {
                githubUrl,
                githubHandle: owner,
                name: profileData.userStats?.name || null,
                email: profileData.email || null
            }
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
                totalStars: profileData.userStats?.totalStars || 0,
                totalCommits: profileData.userStats?.totalCommits || 0,
                totalRepos: profileData.userStats?.totalRepos || 0,
                languages: profileData.userStats?.languages?.length || 0,
                lastActive: profileData.lastActive || new Date().toISOString(),
                confidence: 100,
                repoName: primaryRepo,
                metadata: {
                    userStats: profileData.userStats,
                    email: profileData.email,
                    claimed: savedCandidate.claimed,
                    lastActive: profileData.lastActive,
                    reachability: profileData.reachability,
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

            // Process referral bonus if this is the user's first chekk
            if (user.usageCount === 0) {
                processReferralBonus(user.id);
            }
        }

        // GROWTH LOOP: Trigger "Someone viewed your profile" email
        if (savedCandidate.email && !savedCandidate.claimed) {
            // Run in background, don't await
            sendProfileViewedEmail(savedCandidate.id, reportData.label).catch(e => console.error('[GrowthLoop] email failed:', e));
        }

        res.json({ success: true, data: report, isPro });
    } catch (error: any) {
        console.error('Analysis error:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
});

// New SSE endpoint for progressive Chekklist analysis
app.get('/api/chekklist/stream', checkTierLimit, async (req, res) => {
    const { jobTitle, jd, experience, languages, archetypes, tiers, reachability: reachabilityQuery, location } = req.query;
    const user = (req as any).user;

    console.log(`[Chekklist SSE] Stream request from ${user?.email || 'guest'}: ${jobTitle}`);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    if (!GITHUB_TOKEN || !DEEPSEEK_KEY) {
        sendEvent('error', { message: 'API keys missing' });
        res.end();
        return;
    }

    try {
        const { searchCandidates, analyzeGitHubProfile } = await import('./lib/github.js');

        // Parse languages array from query string
        const languagesArray = languages ? (Array.isArray(languages) ? languages : [languages]) : [];

        // Show what we're searching for
        const searchCriteria: string[] = [];
        if (languagesArray.length > 0) searchCriteria.push(languagesArray.slice(0, 3).join(', '));
        if (jobTitle) searchCriteria.push(String(jobTitle));
        const criteriaStr = searchCriteria.length > 0 ? searchCriteria.join(' • ') : 'developers';

        sendEvent('status', { message: `🔍 Searching GitHub for ${criteriaStr}...`, progress: 0 });

        const allCandidates = await searchCandidates(GITHUB_TOKEN, {
            languages: languagesArray,
            experience,
            jobTitle,
            location,
            jd: jd as string // Pass JD for auto-extraction of languages
        });

        // Use all candidates (up to 500), stop when we have 50 quality results
        const TARGET_RESULTS = 50;
        const candidates = allCandidates;
        const totalPool = candidates.length;

        if (candidates.length === 0) {
            sendEvent('complete', { message: 'No candidates found matching search criteria', total: 0 });
            res.end();
            return;
        }

        sendEvent('status', {
            message: `✓ Found ${totalPool} GitHub profiles. Now analyzing with AI...`,
            progress: 5,
            total: TARGET_RESULTS
        });

        // Process candidates in parallel batches of 10 for faster results
        const BATCH_SIZE = 10;
        let analyzed = 0;
        let nonGhosts = 0;
        let currentIndex = 0;

        while (nonGhosts < TARGET_RESULTS && currentIndex < candidates.length) {
            const batch = candidates.slice(currentIndex, currentIndex + BATCH_SIZE);
            currentIndex += BATCH_SIZE;

            const batchPromises = batch.map(async (candidate: any) => {
                // Check if we already have enough
                if (nonGhosts >= TARGET_RESULTS) return null;

                try {
                    // Get full GitHub profile data
                    const profileData = await analyzeGitHubProfile(GITHUB_TOKEN, candidate.login);

                    // Run DeepSeek analysis
                    const reportData = await analyzeWithDeepSeek(DEEPSEEK_KEY, profileData, profileData.codeSamples);

                    analyzed++;
                    const progress = 5 + Math.round((nonGhosts / TARGET_RESULTS) * 95);

                    // Check if GHOST
                    const archetype = reportData.label || 'GHOST';
                    const tier = reportData.rarity || 'GHOST';

                    if (archetype === 'GHOST' || tier === 'GHOST') {
                        sendEvent('status', {
                            message: `🔎 ${nonGhosts}/${TARGET_RESULTS} matches • Analyzed ${analyzed} profiles (${candidate.login} - insufficient data)`,
                            progress,
                            analyzed,
                            nonGhosts,
                            total: TARGET_RESULTS
                        });
                        return null;
                    }

                    // Parse user's archetype/tier filter preferences
                    const archetypeFilters: string[] = archetypes
                        ? (Array.isArray(archetypes) ? archetypes.map(a => String(a)) : [String(archetypes)])
                        : [];
                    const tierFilters: string[] = tiers
                        ? (Array.isArray(tiers) ? tiers.map(t => String(t)) : [String(tiers)])
                        : [];
                    const reachabilityFilters: string[] = reachabilityQuery
                        ? (Array.isArray(reachabilityQuery) ? reachabilityQuery.map(r => String(r)) : [String(reachabilityQuery)])
                        : [];

                    // Calculate reachability early for filtering
                    const reachStats = {
                        lastPushedAt: candidate.repositories?.nodes?.[0]?.pushedAt,
                        contributionCalendar: candidate.contributionsCollection?.contributionCalendar,
                        pullRequests: candidate.pullRequests?.totalCount,
                        issues: candidate.issues?.totalCount,
                        starredRepositories: candidate.starredRepositories?.totalCount,
                        updatedAt: candidate.updatedAt
                    };
                    const reachabilityResult = calculateReachability(reachStats);

                    // Apply reachability filter if user specified any
                    if (reachabilityFilters.length > 0) {
                        const matchesReach = reachabilityFilters.some(filter =>
                            reachabilityResult.label.toUpperCase().includes(filter.toUpperCase())
                        );
                        if (!matchesReach) {
                            sendEvent('status', {
                                message: `🔎 ${nonGhosts}/${TARGET_RESULTS} matches • ${candidate.login} (${archetype}, ${reachabilityResult.label} reachability - filtered)`,
                                progress,
                                analyzed,
                                nonGhosts,
                                total: TARGET_RESULTS
                            });
                            return null;
                        }
                    }

                    const reachability = reachabilityResult;

                    // Apply archetype filter if user specified any
                    if (archetypeFilters.length > 0) {
                        const matchesArchetype = archetypeFilters.some(filter =>
                            archetype.toUpperCase().includes(filter.toUpperCase())
                        );
                        if (!matchesArchetype) {
                            sendEvent('status', {
                                message: `🔎 ${nonGhosts}/${TARGET_RESULTS} matches • ${candidate.login} (${archetype} - doesn't match filters)`,
                                progress,
                                analyzed,
                                nonGhosts,
                                total: TARGET_RESULTS
                            });
                            return null;
                        }
                    }

                    // Apply tier filter if user specified any
                    if (tierFilters.length > 0) {
                        const matchesTier = tierFilters.some(filter =>
                            tier.toUpperCase().includes(filter.toUpperCase())
                        );
                        if (!matchesTier) {
                            sendEvent('status', {
                                message: `🔎 ${nonGhosts}/${TARGET_RESULTS} matches • ${candidate.login} (${tier} tier - doesn't match filters)`,
                                progress,
                                analyzed,
                                nonGhosts,
                                total: TARGET_RESULTS
                            });
                            return null;
                        }
                    }

                    nonGhosts++;

                    // Send status for successful match
                    sendEvent('status', {
                        message: `✨ ${nonGhosts}/${TARGET_RESULTS} matches • Found ${candidate.login} (${archetype})`,
                        progress,
                        analyzed,
                        nonGhosts,
                        total: TARGET_RESULTS
                    });

                    const bioLower = (candidate.bio || '').toLowerCase();
                    const warmthReasons: string[] = [];

                    // Keep some bio-based signals for "warmth" transparency
                    if (bioLower.includes('open to') || bioLower.includes('hiring') || bioLower.includes('looking for')) {
                        reachability.score = Math.min(100, reachability.score + 10);
                        warmthReasons.push('Bio signals openness');
                    }
                    if (bioLower.includes('founder') || bioLower.includes('ceo') || bioLower.includes('cto')) {
                        warmthReasons.push('Leadership role');
                    }
                    if ((candidate.followerCount || 0) > 5000) {
                        reachability.score = Math.max(0, reachability.score - 10);
                        warmthReasons.push('High profile (lower reachability)');
                    }

                    // Map reachability breakdown to reasons for better transparency
                    if (reachability.breakdown.recency >= 80) warmthReasons.push('Very recent activity');
                    if (reachability.breakdown.frequency >= 70) warmthReasons.push('Consistent contributor');
                    if (reachability.breakdown.engagement >= 60) warmthReasons.push('Strong community engagement');

                    let warmthScore = reachability.score;
                    if (bioLower.includes('not looking') || bioLower.includes('happy at')) {
                        warmthScore -= 25;
                        warmthReasons.push('States not looking');
                    }
                    if (bioLower.includes('google') || bioLower.includes('meta') || bioLower.includes('amazon') || bioLower.includes('apple') || bioLower.includes('microsoft')) {
                        warmthScore -= 10;
                        warmthReasons.push('At major tech co');
                    }

                    // Clamp and label
                    warmthScore = Math.max(0, Math.min(100, warmthScore));
                    const warmthLabel = warmthScore >= 75 ? 'HOT' : warmthScore >= 55 ? 'WARM' : warmthScore >= 35 ? 'NEUTRAL' : 'COLD';
                    const reachabilitySignal = warmthScore >= 75 ? '🟢' : warmthScore >= 45 ? '🟡' : '🔴';

                    // Send candidate result
                    const result = {
                        handle: candidate.login,
                        name: candidate.name || candidate.login,
                        email: candidate.email,
                        claimed: await prisma.candidate.findUnique({ where: { githubUrl: candidate.url } }).then(c => c?.claimed || false),
                        avatar: candidate.avatarUrl,
                        bio: candidate.bio,
                        location: candidate.location || null,
                        archetype: archetype,
                        tier: tier,
                        summary: reportData.recruiter_summary,
                        topRepo: candidate.repositories?.nodes?.[0]?.name || 'Unknown',
                        lastActive: profileData.lastActive || null,
                        followers: candidate.followerCount || 0,
                        totalStars: candidate.totalStars || 0,
                        warmthScore,
                        warmthLabel,
                        reachabilitySignal,
                        warmthReasons
                    };

                    sendEvent('candidate', result);

                    // GROWTH LOOP: Persist and trigger email
                    try {
                        const savedCandidate = await prisma.candidate.upsert({
                            where: { githubUrl: candidate.url },
                            update: {
                                lastCheckedAt: new Date(),
                                name: candidate.name || profileData.userStats?.name || null,
                                email: candidate.email || profileData.email || null
                            },
                            create: {
                                githubUrl: candidate.url,
                                githubHandle: candidate.login,
                                name: candidate.name || profileData.userStats?.name || null,
                                email: candidate.email || profileData.email || null
                            }
                        });

                        // Save report for the dev's claim flow
                        await prisma.vibeReport.create({
                            data: {
                                candidateId: savedCandidate.id,
                                userId: user?.id || null,
                                archetype: result.archetype,
                                tier: result.tier,
                                label: result.archetype,
                                trajectorySummary: reportData.trajectory_summary || 'Analysis pending.',
                                recruiterSummary: reportData.recruiter_summary || 'Analysis pending.',
                                meritPoints: (reportData.highlights || []) as any,
                                confidence: 100,
                                repoName: result.topRepo,
                                metadata: {
                                    userStats: profileData.userStats,
                                    email: result.email,
                                    claimed: savedCandidate.claimed,
                                    lastActive: result.lastActive,
                                    reachability: profileData.reachability,
                                    starDistribution: profileData.starDistribution,
                                    qualitySignals: profileData.qualitySignals,
                                    technical_signal: reportData.technical_signal,
                                    archetype_reason: reportData.archetype_reason
                                } as any
                            }
                        });

                        // Trigger Growth Loop Email
                        if (savedCandidate.email && !savedCandidate.claimed) {
                            sendProfileViewedEmail(savedCandidate.id, result.archetype).catch(e => console.error('[GrowthLoop] email failed:', e));
                        }

                        // AUTO-ENRICHMENT: Enrich candidate with PDL data (async, non-blocking)
                        if (PDL_API_KEY) {
                            (async () => {
                                let enrichEmail = savedCandidate.email;

                                // If no email, try to resolve from GitHub
                                if (!enrichEmail && GITHUB_TOKEN) {
                                    console.log(`[Enrich] No email for ${candidate.login}, resolving from GitHub...`);
                                    enrichEmail = await resolveGitHubEmail(GITHUB_TOKEN, candidate.login);
                                    if (enrichEmail) {
                                        // Save the resolved email
                                        await prisma.candidate.update({
                                            where: { id: savedCandidate.id },
                                            data: { email: enrichEmail }
                                        }).catch(() => { });
                                        console.log(`[Enrich] Resolved email for ${candidate.login}: ${enrichEmail}`);
                                    }
                                }

                                if (!enrichEmail) {
                                    console.log(`[Enrich] Could not resolve email for ${candidate.login}`);
                                    return;
                                }

                                const pdlResult = await pdlEnrichByEmail(PDL_API_KEY, enrichEmail);
                                const isValidLinkedInProfile = (url: string) => {
                                    return url && url.toLowerCase().includes('linkedin.com') && url.toLowerCase().includes('/in/') && !url.toLowerCase().includes('/pub/dir/') && !url.toLowerCase().includes('/posts/') && !url.toLowerCase().includes('/pulse/');
                                };

                                if (pdlResult.success && pdlResult.linkedin_url && isValidLinkedInProfile(pdlResult.linkedin_url)) {
                                    // Save it to database
                                    await prisma.candidate.update({
                                        where: { id: savedCandidate.id },
                                        data: {
                                            linkedinUrl: pdlResult.linkedin_url,
                                            currentTitle: pdlResult.title,
                                            currentCompany: pdlResult.company,
                                            location: pdlResult.location,
                                            enrichedAt: new Date()
                                        }
                                    });
                                    reportData.linkedinUrl = pdlResult.linkedin_url;
                                } else {
                                    // Fallback to Exa if PDL failed or returned invalid link
                                    console.log(`[Analyze] PDL failed or returned non-profile link for ${enrichEmail || candidate.login}, trying Exa...`);
                                    const candidateName = savedCandidate.name || candidate.login;
                                    const context = exaBuildContext({
                                        location: savedCandidate.location || undefined,
                                    });

                                    console.log(`[Enrich] Trying Exa for ${candidate.login}...`);
                                    const exaResult = await exaFindLinkedIn(EXA_API_KEY, candidateName, context);

                                    if (exaResult.success && exaResult.linkedinUrl) {
                                        await prisma.candidate.update({
                                            where: { id: savedCandidate.id },
                                            data: {
                                                linkedinUrl: exaResult.linkedinUrl,
                                                enrichedAt: new Date(),
                                            }
                                        }).catch((err: Error) => console.log('[Enrich] Exa update failed:', err.message));

                                        sendEvent('enrichment', {
                                            handle: candidate.login,
                                            linkedinUrl: exaResult.linkedinUrl,
                                        });
                                    }
                                }
                            })().catch((err: Error) => console.log('[Enrich] Auto-enrich failed:', err.message));
                        }
                    } catch (dbErr) {
                        console.error('[GrowthLoop] database error:', dbErr);
                    }

                    sendEvent('status', {
                        message: `Found ${nonGhosts}/${TARGET_RESULTS} quality candidates...`,
                        progress: 5 + Math.round((nonGhosts / TARGET_RESULTS) * 95),
                        analyzed,
                        nonGhosts,
                        total: TARGET_RESULTS
                    });

                    return result;
                } catch (err: any) {
                    console.error(`[Chekklist] Failed to analyze ${candidate.login}:`, err.message);
                    analyzed++;
                    return null;
                }
            });

            // Wait for batch to complete
            await Promise.all(batchPromises);

            // Small delay between batches to avoid rate limits
            if (nonGhosts < TARGET_RESULTS && currentIndex < candidates.length) {
                await new Promise(r => setTimeout(r, 300));
            }
        }

        sendEvent('complete', {
            message: `Found ${nonGhosts} quality candidates (analyzed ${analyzed} from pool of ${totalPool}).`,
            total: nonGhosts,
            analyzed,
            filtered: analyzed - nonGhosts
        });

    } catch (e: any) {
        console.error('[Chekklist SSE Error]', e);
        sendEvent('error', { message: e.message });
    }

    res.end();
});

// Legacy endpoint (keep for backwards compatibility)
app.post('/api/chekklist/search', checkTierLimit, async (req, res) => {
    const { jobTitle, jd, experience, languages, archetypes, tiers, location } = req.body;
    const user = (req as any).user;

    console.log(`[Chekklist] Search request from ${user?.email || 'guest'}: ${jobTitle}`);

    if (!GITHUB_TOKEN) return res.status(500).json({ success: false, error: 'GitHub Token missing' });

    try {
        const { searchCandidates } = await import('./lib/github.js');

        const candidates = await searchCandidates(GITHUB_TOKEN, { languages, experience, jobTitle, location });

        console.log(`[Chekklist] Found ${candidates.length} candidates.`);

        // Return basic results without full analysis (client can use SSE for progressive)
        const results = candidates.map((c: any) => ({
            handle: c.login,
            name: c.name || c.login,
            avatar: c.avatarUrl,
            bio: c.bio,
            location: c.location || null,
            topRepo: c.repositories?.nodes?.[0]?.name || 'Unknown',
            topRepoDesc: c.repositories?.nodes?.[0]?.description,
            followers: c.followerCount || 0,
            totalStars: c.totalStars || 0
        }));

        res.json({ success: true, candidates: results, useSSE: true });

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Public endpoint for growth loop claim previews
app.get('/api/public/report/:handle', async (req, res) => {
    const { handle } = req.params;
    try {
        const candidate = await prisma.candidate.findFirst({
            where: {
                githubHandle: {
                    equals: handle,
                    mode: 'insensitive'
                }
            },
            include: { reports: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });

        if (!candidate || !candidate.reports[0]) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        const report = candidate.reports[0];
        res.json({
            success: true,
            data: {
                handle: candidate.githubHandle,
                archetype: report.archetype,
                tier: report.tier,
                lastCheckedAt: candidate.lastCheckedAt
            }
        });
    } catch (e: any) {
        console.error('[Public API Error]', e);
        res.status(500).json({ success: false, error: 'Internal server error' });
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

        // Upsert User (Create or Update)
        // If user exists (e.g. from Google login), we update their GitHub login
        // If not, we create a new user
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                githubLogin: githubUser.login,
                tier: 'AUTHENTICATED'
            },
            create: {
                email,
                githubLogin: githubUser.login,
                tier: 'AUTHENTICATED'
            }
        });

        // GROWTH LOOP: Link Candidate record and mark as claimed
        try {
            const existingCandidate = await prisma.candidate.findFirst({
                where: {
                    githubHandle: {
                        equals: githubUser.login,
                        mode: 'insensitive'
                    }
                }
            });

            if (existingCandidate) {
                await prisma.candidate.update({
                    where: { id: existingCandidate.id },
                    data: {
                        claimed: true,
                        userId: user.id,
                        emailVerified: true // They proved ownership of the GitHub account
                    }
                });
                console.log(`[GrowthLoop] Marked candidate ${githubUser.login} as claimed by user ${user.email}`);
            }
        } catch (claimErr) {
            console.error('[GrowthLoop] Failed to auto-claim candidate:', claimErr);
        }

        const token = jwt.sign({ userId: user.id, email: user.email, tier: user.tier }, SECURE_JWT_SECRET);

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

// ═══════════════════════════════════════════════════════════════════════════
// CANDIDATE ENRICHMENT: Clearout.io for LinkedIn & professional data
// ═══════════════════════════════════════════════════════════════════════════
app.post('/api/enrich/candidate', checkTierLimit, async (req, res) => {
    const { candidateId, githubHandle, email, name } = req.body;
    const user = (req as any).user;

    if (!candidateId && !githubHandle && !email) {
        return res.status(400).json({ success: false, error: 'candidateId, githubHandle, or email required' });
    }

    if (!PDL_API_KEY) {
        return res.status(503).json({ success: false, error: 'Enrichment service not configured' });
    }

    // Only PRO users can enrich candidates
    if (!user || user.tier !== 'PRO') {
        return res.status(403).json({
            success: false,
            error: 'Candidate enrichment is a PRO feature',
            code: 'PRO_REQUIRED'
        });
    }

    try {
        // Find the candidate
        let candidate;
        if (candidateId) {
            candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
        } else if (githubHandle) {
            candidate = await prisma.candidate.findFirst({
                where: { githubHandle: { equals: githubHandle, mode: 'insensitive' } }
            });
        }

        // Check if already enriched recently (within 30 days)
        if (candidate?.enrichedAt) {
            const daysSinceEnriched = Math.floor((Date.now() - new Date(candidate.enrichedAt).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceEnriched < 30 && candidate.linkedinUrl) {
                console.log(`[Enrich] Returning cached enrichment for ${candidate.githubHandle} (${daysSinceEnriched} days old)`);
                return res.json({
                    success: true,
                    cached: true,
                    data: {
                        linkedinUrl: candidate.linkedinUrl,
                        currentTitle: candidate.currentTitle,
                        currentCompany: candidate.currentCompany,
                        companyLogoUrl: candidate.companyLogoUrl,
                        location: candidate.location,
                        seniority: candidate.seniority,
                        twitterUrl: candidate.twitterUrl,
                        enrichmentData: candidate.enrichmentData
                    }
                });
            }
        }

        // Get the email to use for lookup
        let lookupEmail = email || candidate?.email;

        // If no email, try to resolve it from GitHub
        if (!lookupEmail && candidate?.githubHandle && GITHUB_TOKEN) {
            console.log(`[Enrich] No email found, resolving from GitHub for ${candidate.githubHandle}...`);
            const resolvedEmail = await resolveGitHubEmail(GITHUB_TOKEN, candidate.githubHandle);
            if (resolvedEmail) {
                lookupEmail = resolvedEmail;
                // Save the resolved email to the candidate record
                await prisma.candidate.update({
                    where: { id: candidate.id },
                    data: { email: resolvedEmail }
                }).catch(e => console.warn('[Enrich] Failed to save resolved email:', e));
                console.log(`[Enrich] Resolved email from GitHub: ${resolvedEmail}`);
            }
        }

        if (!lookupEmail) {
            return res.json({
                success: false,
                error: 'Could not find email for this user',
                code: 'NO_EMAIL'
            });
        }

        // Try People Data Labs first (fastest, most comprehensive)
        if (PDL_API_KEY) {
            console.log(`[Enrich] Calling PDL API for: ${lookupEmail}`);
            const isValidLinkedInProfile = (url: string) => {
                return url && url.toLowerCase().includes('linkedin.com') && url.toLowerCase().includes('/in/') && !url.toLowerCase().includes('/pub/dir/') && !url.toLowerCase().includes('/posts/') && !url.toLowerCase().includes('/pulse/');
            };

            const pdlResult = await pdlEnrichByEmail(PDL_API_KEY, lookupEmail);

            if (pdlResult.success && pdlResult.linkedin_url && isValidLinkedInProfile(pdlResult.linkedin_url)) {
                // Save enrichment data to candidate if we have one
                if (candidate) {
                    await prisma.candidate.update({
                        where: { id: candidate.id },
                        data: {
                            linkedinUrl: pdlResult.linkedin_url,
                            currentTitle: pdlResult.title,
                            currentCompany: pdlResult.company,
                            location: pdlResult.location,
                            enrichedAt: new Date(),
                            enrichmentData: pdlResult.raw as any
                        }
                    });
                    console.log(`[Enrich] Saved PDL enrichment for ${candidate.githubHandle}`);
                }

                return res.json({
                    success: true,
                    source: 'pdl',
                    data: {
                        linkedinUrl: pdlResult.linkedin_url,
                        name: pdlResult.name,
                        currentTitle: pdlResult.title,
                        currentCompany: pdlResult.company,
                        location: pdlResult.location,
                        skills: pdlResult.skills
                    }
                });
            }

            console.log(`[Enrich] PDL returned no LinkedIn for ${lookupEmail}: ${pdlResult.error}`);
        }

        // Fallback: Try Exa semantic search using name + context
        if (EXA_API_KEY && candidate) {
            const candidateName = candidate.name || candidate.githubHandle;
            const context = exaBuildContext({
                location: candidate.location || undefined,
            });

            console.log(`[Enrich] Trying Exa search for: ${candidateName}`);
            const exaResult = await exaFindLinkedIn(EXA_API_KEY, candidateName, context);

            if (exaResult.success && exaResult.linkedinUrl) {
                // Save enrichment data to candidate
                await prisma.candidate.update({
                    where: { id: candidate.id },
                    data: {
                        linkedinUrl: exaResult.linkedinUrl,
                        enrichedAt: new Date(),
                    }
                });
                console.log(`[Enrich] Saved Exa LinkedIn for ${candidate.githubHandle}: ${exaResult.linkedinUrl}`);

                return res.json({
                    success: true,
                    source: 'exa',
                    data: {
                        linkedinUrl: exaResult.linkedinUrl,
                        name: candidateName,
                        // Title from Exa sometimes includes role info
                        currentTitle: exaResult.title?.split(' - ')[1] || undefined,
                    }
                });
            }

            console.log(`[Enrich] Exa also returned no LinkedIn for ${candidateName}: ${exaResult.error}`);
        }

        // No match from any provider
        return res.json({
            success: false,
            error: 'No enrichment data found',
            code: 'NO_MATCH'
        });

    } catch (e: any) {
        console.error('[Enrich Error]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Bulk enrichment endpoint (up to 10 candidates)
app.post('/api/enrich/bulk', checkTierLimit, async (req, res) => {
    const { candidates } = req.body; // Array of { candidateId?, email?, name? }
    const user = (req as any).user;

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ success: false, error: 'candidates array required' });
    }

    if (!PDL_API_KEY) {
        return res.status(503).json({ success: false, error: 'Enrichment service not configured' });
    }

    if (!user || user.tier !== 'PRO') {
        return res.status(403).json({
            success: false,
            error: 'Bulk enrichment is a PRO feature',
            code: 'PRO_REQUIRED'
        });
    }

    // Limit to 10
    const toEnrich = candidates.slice(0, 10);

    try {
        const results = [];

        for (const candidate of toEnrich) {
            if (!candidate.email) {
                results.push({ success: false, error: 'No email provided' });
                continue;
            }

            const pdlResult = await pdlEnrichByEmail(PDL_API_KEY, candidate.email);

            if (pdlResult.success && pdlResult.linkedin_url && candidate.candidateId) {
                await prisma.candidate.update({
                    where: { id: candidate.candidateId },
                    data: {
                        linkedinUrl: pdlResult.linkedin_url,
                        currentTitle: pdlResult.title,
                        currentCompany: pdlResult.company,
                        location: pdlResult.location,
                        enrichedAt: new Date(),
                        enrichmentData: pdlResult.raw as any
                    }
                }).catch(() => { }); // Ignore if candidate doesn't exist
            }

            results.push({
                success: pdlResult.success,
                error: pdlResult.error,
                data: pdlResult.success ? {
                    linkedinUrl: pdlResult.linkedin_url,
                    name: pdlResult.name,
                    currentTitle: pdlResult.title,
                    currentCompany: pdlResult.company,
                    location: pdlResult.location
                } : null
            });
        }

        res.json({
            success: true,
            results: results.map((r, i) => ({
                index: i,
                ...r
            }))
        });

    } catch (e: any) {
        console.error('[Bulk Enrich Error]', e);
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

// Check if a handle exists in history (for deduplication)
app.get('/api/history/check/:handle', async (req, res) => {
    const { handle } = req.params;
    try {
        const candidate = await prisma.candidate.findFirst({
            where: {
                githubHandle: { equals: handle, mode: 'insensitive' }
            },
            include: { reports: { take: 1 } }
        });

        const exists = candidate && candidate.reports.length > 0;
        res.json({ success: true, exists, handle });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Check failed' });
    }
});
// Clear all history
app.post('/api/history/clear', async (req, res) => {
    const { userId } = req.body;
    try {
        await prisma.vibeReport.deleteMany({
            where: userId ? { userId: String(userId) } : {}
        });
        res.json({ success: true, message: 'History cleared' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Clear failed' });
    }
});

// Clear only "GHOST" entries from history
app.post('/api/history/clear-ghosts', async (req, res) => {
    const { userId } = req.body;
    try {
        await prisma.vibeReport.deleteMany({
            where: {
                userId: userId ? String(userId) : undefined,
                OR: [
                    { archetype: { contains: 'GHOST', mode: 'insensitive' } },
                    { label: { contains: 'GHOST', mode: 'insensitive' } },
                    { tier: { contains: 'GHOST', mode: 'insensitive' } }
                ]
            }
        });
        res.json({ success: true, message: 'Ghosts cleared' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Clear ghosts failed' });
    }
});

// Delete specific history item
app.delete('/api/history/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.vibeReport.delete({ where: { id } });
        res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Delete failed' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// GITHUB STATS ENDPOINT - Authenticated GitHub API calls for accurate stats
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/github/stats/:handle', async (req, res) => {
    const { handle } = req.params;

    if (!handle) {
        return res.status(400).json({ success: false, error: 'Handle is required' });
    }

    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vibechekk/1.0'
    };

    // Use authenticated requests if token is available (5000/hour vs 60/hour)
    if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    try {
        const stats = await fetchUserStats(GITHUB_TOKEN || '', handle);
        if (!stats) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Maintain frontend compatibility
        const result = {
            name: stats.name || handle,
            login: handle,
            avatar_url: `https://github.com/${handle}.png`,
            public_repos: stats.totalRepos,
            totalStars: stats.totalStars,
            totalCommits: stats.totalCommits,
            languages: stats.languages.length,
            languagesList: stats.languages,
            lastActive: stats.lastActive || stats.lastPushedAt || stats.updatedAt,
            created_at: stats.createdAt
        };

        console.log(`[GitHub Stats] Fetched stats for ${handle}: ${result.public_repos} repos, ${result.totalStars} stars, ${result.totalCommits} commits`);
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error(`[GitHub Stats] Error fetching stats for ${handle}:`, error.message);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch GitHub stats' });
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

// ============= REFERRAL SYSTEM ENDPOINTS =============

// Get user's referral info
app.get('/api/referral/info', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, SECURE_JWT_SECRET);
        let user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                referrals: {
                    select: { id: true, name: true, createdAt: true, usageCount: true }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Generate referral code if user doesn't have one (legacy users)
        if (!user.referralCode) {
            const newCode = `${user.id.slice(0, 8)}${Date.now().toString(36).slice(-4)}`;
            user = await prisma.user.update({
                where: { id: user.id },
                data: { referralCode: newCode },
                include: {
                    referrals: {
                        select: { id: true, name: true, createdAt: true, usageCount: true }
                    }
                }
            });
            console.log(`[Referral] Generated code for legacy user: ${user.email} -> ${newCode}`);
        }

        // Calculate active referrals (those who have run at least 1 chekk)
        const activeReferrals = user.referrals.filter((r: any) => r.usageCount > 0);

        res.json({
            success: true,
            referralCode: user.referralCode,
            referralLink: `https://vibechekk.dev/r/${user.referralCode}`,
            totalReferrals: user.referrals.length,
            activeReferrals: activeReferrals.length,
            referralCount: user.referralCount,
            bonusChekks: user.bonusChekks,
            bonusExpiresAt: user.bonusExpiresAt,
            // 3 active referrals = 1 week unlimited (100 bonus chekks)
            progressToReward: {
                current: activeReferrals.length,
                target: 3,
                rewardDescription: '1 week unlimited chekks'
            }
        });
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// Apply referral code (for new sign-ups)
app.post('/api/referral/apply', async (req, res) => {
    const { referralCode, userId } = req.body;

    if (!referralCode || !userId) {
        return res.status(400).json({ success: false, error: 'Referral code and user ID required' });
    }

    try {
        // Find the referrer by their referral code
        const referrer = await prisma.user.findUnique({
            where: { referralCode }
        });

        if (!referrer) {
            return res.status(404).json({ success: false, error: 'Invalid referral code' });
        }

        // Don't allow self-referral
        if (referrer.id === userId) {
            return res.status(400).json({ success: false, error: 'Cannot use your own referral code' });
        }

        // Link the new user to referrer
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { referredById: referrer.id }
        });

        res.json({
            success: true,
            message: `You were referred by ${referrer.name || 'a friend'}! Complete your first chekk to help them earn rewards.`,
            referrerName: referrer.name
        });
    } catch (error) {
        console.error('[Referral Apply] Error:', error);
        res.status(500).json({ success: false, error: 'Failed to apply referral code' });
    }
});

// Callback when a referred user completes their first chekk (called internally)
const processReferralBonus = async (userId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { referredBy: true }
        });

        if (!user || !user.referredById || user.usageCount > 1) {
            // Only process on first chekk
            return;
        }

        // Increment referrer's referral count
        const referrer = await prisma.user.update({
            where: { id: user.referredById },
            data: {
                referralCount: { increment: 1 }
            }
        });

        // Check if referrer has now reached 3 active referrals
        if (referrer.referralCount === 3) {
            // Grant 1 week of unlimited chekks (100 bonus)
            const oneWeekFromNow = new Date();
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

            await prisma.user.update({
                where: { id: referrer.id },
                data: {
                    bonusChekks: 100,
                    bonusExpiresAt: oneWeekFromNow
                }
            });

            console.log(`[Referral] User ${referrer.email} earned a week of unlimited chekks!`);
        }
    } catch (error) {
        console.error('[Referral Bonus] Error:', error);
    }
};

// Get usage info for current user
app.get('/api/usage', async (req, res) => {
    const authHeader = req.headers.authorization;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';

    if (!authHeader) {
        // Guest user - count reports by IP
        try {
            const guestCount = await prisma.vibeReport.count({
                where: { guestIp: typeof ip === 'string' ? ip : 'unknown-ip', userId: null }
            });
            return res.json({
                success: true,
                used: guestCount,
                limit: 2,
                tier: 'GUEST',
                remaining: Math.max(0, 2 - guestCount)
            });
        } catch (e) {
            return res.json({ success: true, used: 0, limit: 2, tier: 'GUEST', remaining: 2 });
        }
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, SECURE_JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Check if bonus chekks have expired
        const now = new Date();
        let bonusChekks = user.bonusChekks;
        if (user.bonusExpiresAt && user.bonusExpiresAt < now) {
            bonusChekks = 0;
            // Clear expired bonus
            await prisma.user.update({
                where: { id: user.id },
                data: { bonusChekks: 0, bonusExpiresAt: null }
            });
        }

        const baseLimits: Record<string, number> = { GUEST: 2, AUTHENTICATED: 3, PRO: Infinity };
        const baseLimit = baseLimits[user.tier] || 2;
        const totalLimit = baseLimit + bonusChekks;

        res.json({
            success: true,
            used: user.usageCount,
            limit: totalLimit,
            baseLimit,
            bonusChekks,
            bonusExpiresAt: bonusChekks > 0 ? user.bonusExpiresAt : null,
            tier: user.tier,
            remaining: Math.max(0, totalLimit - user.usageCount),
            resetTime: user.tier === 'PRO' ? 'monthly' : 'hourly'
        });
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// ============= ADMIN ENDPOINTS =============

const ADMIN_EMAIL = 'timidayokayode@gmail.com';

// Admin: Set tier for testing
app.post('/api/admin/set-tier', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = jwt.verify(token, SECURE_JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Only admin can use this endpoint
        if (user.email !== ADMIN_EMAIL) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const { tier, resetUsage } = req.body;
        if (!['GUEST', 'AUTHENTICATED', 'PRO'].includes(tier)) {
            return res.status(400).json({ success: false, error: 'Invalid tier' });
        }

        // Update user tier in database (optionally reset usage for testing)
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                tier: tier as any,
                ...(resetUsage && { usageCount: 0, lastResetAt: new Date() })
            }
        });

        console.log(`[ADMIN] ${ADMIN_EMAIL} changed tier to ${tier}${resetUsage ? ' (usage reset)' : ''}`);

        res.json({
            success: true,
            tier: updatedUser.tier,
            usageCount: updatedUser.usageCount,
            message: `Tier changed to ${tier}`
        });
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// ============= STRIPE PAYMENT ENDPOINTS =============

// Create Stripe Checkout Session for Pro subscription
app.post('/api/stripe/create-checkout', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;

    try {
        const decoded = jwt.verify(token, SECURE_JWT_SECRET) as { userId: string };
        userId = decoded.userId;
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (!stripe) {
        return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.tier === 'PRO') {
            return res.status(400).json({ success: false, error: 'Already a Pro subscriber' });
        }

        // Create Checkout Session with pre-created Price
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price: 'price_1SkDqDLd8BonO0ZWPrwvJDL1', // Vibechekk Pro - $29/month
                quantity: 1,
            }],
            customer_email: user.email,
            metadata: {
                userId: user.id,
            },
            success_url: `${process.env.BACKEND_URL || 'https://vibechekk-production.up.railway.app'}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BACKEND_URL || 'https://vibechekk-production.up.railway.app'}/api/stripe/cancel`,
        });

        console.log(`[Stripe] Created checkout session for user ${user.email}`);
        res.json({ success: true, url: session.url });

    } catch (error: any) {
        console.error('[Stripe] Checkout error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Handle successful payment - redirect page
app.get('/api/stripe/success', async (req, res) => {
    const { session_id } = req.query;

    if (!session_id || !stripe) {
        return res.status(400).send('Invalid session');
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id as string);

        if (session.payment_status === 'paid' && session.metadata?.userId) {
            // Upgrade user to PRO
            await prisma.user.update({
                where: { id: session.metadata.userId },
                data: {
                    tier: 'PRO',
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: session.subscription as string,
                },
            });

            console.log(`[Stripe] User ${session.metadata.userId} upgraded to PRO`);

            // Return a page that tells the user to return to extension
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payment Successful!</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); }
                        .card { background: white; padding: 48px; border-radius: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); max-width: 400px; }
                        .check { width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
                        .check svg { width: 40px; height: 40px; color: white; }
                        h1 { color: #0f172a; font-size: 28px; margin: 0 0 12px; }
                        p { color: #64748b; font-size: 16px; margin: 0 0 32px; line-height: 1.6; }
                        .badge { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 14px; margin-bottom: 24px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="check">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <div class="badge">PRO ACTIVATED</div>
                        <h1>Welcome to Pro!</h1>
                        <p>Your payment was successful. Close this tab and refresh the Vibechekk extension to access your Pro features.</p>
                    </div>
                </body>
                </html>
            `);
        } else {
            res.status(400).send('Payment not completed');
        }
    } catch (error: any) {
        console.error('[Stripe] Success page error:', error);
        res.status(500).send('Error processing payment confirmation');
    }
});

// Handle cancelled payment
app.get('/api/stripe/cancel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
                .card { background: white; padding: 48px; border-radius: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); max-width: 400px; }
                h1 { color: #0f172a; font-size: 24px; margin: 0 0 12px; }
                p { color: #64748b; font-size: 16px; margin: 0; line-height: 1.6; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Payment Cancelled</h1>
                <p>No worries! You can upgrade to Pro anytime from the Vibechekk extension.</p>
            </div>
        </body>
        </html>
    `);
});

// Stripe Webhook for subscription events
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
        return res.status(500).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            // For testing without webhook signature verification
            event = JSON.parse(req.body.toString());
        }
    } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;

        const user = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscription.id }
        });

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { tier: 'AUTHENTICATED' }
            });
            console.log(`[Stripe] User ${user.email} subscription cancelled - downgraded to AUTHENTICATED`);
        }
    }

    res.json({ received: true });
});

app.use((req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found on this server.` });
});

app.listen(PORT, () => {
    console.log(`Vibechekk Backend v3.5 (Recruiter Summary + Multi-Repo) running on port ${PORT}`);
});
