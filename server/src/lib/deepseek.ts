/**
 * DeepSeek Analysis Module
 * 
 * Purpose: Classify developers into 15 archetypes and generate recruiter-ready assessments.
 * 
 * Designed for:
 * - Technical Recruiters: Quick archetype understanding, red flags, team fit
 * - Engineering Managers: Technical depth verification, production readiness, mentorship potential
 * 
 * The 15 Archetypes (by market rarity):
 * 
 * 🌟🌟🌟 HYPER RARE (Top 1%) - Industry-defining talent
 *   - THE 10X ENGINEER: Builds tools/frameworks used by thousands. Think: library authors, core contributors.
 * 
 * 🌟🌟 ULTRA RARE (Top 5%) - Senior+ leadership material  
 *   - THE ARCHITECT: Designs systems at scale. Can own technical direction.
 *   - THE PROFESSOR: Exceptional at teaching. Creates learning resources others rely on.
 * 
 * ⭐ RARE (Top 15%) - Strong senior engineers
 *   - THE SPECIALIST: Deep expertise in a niche (ML, security, compilers, etc.)
 *   - THE SYSTEMS THINKER: Distributed systems, infrastructure, performance optimization.
 * 
 * ◆ UNCOMMON (Top 30%) - Solid mid-senior engineers
 *   - THE MAINTAINER: Keeps open-source projects alive. Strong ownership mindset.
 *   - THE BUILDER: Ships products. Pragmatic, gets things done.
 *   - THE CONTRIBUTOR: Active in OSS. Good collaborator, learns from large codebases.
 *   - THE CRAFTSPERSON: High code quality focus. Tests, documentation, clean code.
 *   - THE HIDDEN GEM: Skilled but low GitHub visibility. Likely strong in private/enterprise work.
 * 
 * ● COMMON (Top 50%) - Early-mid career, high potential
 *   - THE TINKERER: Practical problem solver. Building real things, learning by doing.
 *   - THE GRINDER: High activity, putting in the hours. Motivated, coachable.
 *   - THE HOBBYIST: Codes for passion, not volume. Side projects, personal interest.
 *   - THE EXPLORER: Trying many languages/frameworks. Broad exposure, finding their niche.
 *   - THE APPRENTICE: Early career. Tutorial projects, learning fundamentals.
 */

export const analyzeWithDeepSeek = async (apiKey: string, globalMetadata: any, codeSamples: string) => {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Extract key metrics from GitHub data
    // ═══════════════════════════════════════════════════════════════════════════

    const highestStars = globalMetadata.starDistribution?.highest_single_repo || 0;
    const totalStars = globalMetadata.starDistribution?.total_stars || 0;
    const topRepo = globalMetadata.topRepos?.[0];
    const repoCount = globalMetadata.topRepos?.length || 0;

    // Account info
    const last90DaysCommits = globalMetadata.userStats?.last90DaysCommits || 0;
    const totalCommits = globalMetadata.topRepos?.reduce((sum: number, r: any) => sum + (r.totalCommits || 0), 0) || 0;
    const externalContribs = globalMetadata.userStats?.externalContributions || 0;
    const languages = globalMetadata.userStats?.languages || [];
    const accountCreatedAt = globalMetadata.userStats?.createdAt;
    const accountAgeYears = accountCreatedAt
        ? (Date.now() - new Date(accountCreatedAt).getTime()) / (365 * 24 * 60 * 60 * 1000)
        : 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Calculate Quality Score (What Engineering Managers care about)
    // ═══════════════════════════════════════════════════════════════════════════

    const qualitySignals = {
        hasTests: globalMetadata.qualitySignals?.some((q: any) => q?.hasTests) || false,
        hasCI: globalMetadata.qualitySignals?.some((q: any) => q?.hasCI) || false,
        hasTypeScript: globalMetadata.qualitySignals?.some((q: any) => q?.hasTypeScript) || false,
        hasLinting: globalMetadata.qualitySignals?.some((q: any) => q?.hasLinting) || false,
        hasDocs: globalMetadata.qualitySignals?.some((q: any) => q?.hasDocs) || false,
        avgFileCount: globalMetadata.qualitySignals?.reduce((sum: number, q: any) =>
            sum + (q?.fileCount || 0), 0) / Math.max(globalMetadata.qualitySignals?.length || 1, 1)
    };

    // Quality tiers for classification
    const qualityTier = (() => {
        let score = 0;
        if (qualitySignals.hasTests) score += 3;
        if (qualitySignals.hasCI) score += 3;
        if (qualitySignals.hasTypeScript) score += 1;
        if (qualitySignals.hasLinting) score += 1;
        if (qualitySignals.hasDocs) score += 1;
        if (qualitySignals.avgFileCount > 50) score += 1;

        if (score >= 8) return 'production-ready';
        if (score >= 5) return 'professional';
        if (score >= 2) return 'developing';
        return 'basic';
    })();

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Analyze Technical Depth (What kind of work do they do?)
    // ═══════════════════════════════════════════════════════════════════════════

    const allText = [
        ...globalMetadata.topRepos.map((r: any) => `${r.name} ${r.description || ''} ${r.language || ''}`),
        codeSamples
    ].join(' ').toLowerCase();

    // Domain expertise detection
    const domains = {
        systems: ['distributed', 'kubernetes', 'microservices', 'docker', 'infrastructure', 'devops', 'ci/cd', 'scaling', 'load balancing'].filter(s => allText.includes(s)).length,
        ml: ['machine learning', 'ml', 'tensorflow', 'pytorch', 'neural', 'nlp', 'computer vision', 'data science'].filter(s => allText.includes(s)).length,
        security: ['security', 'cryptography', 'authentication', 'oauth', 'encryption', 'vulnerability'].filter(s => allText.includes(s)).length,
        lowLevel: ['compiler', 'kernel', 'assembly', 'llvm', 'rust', 'systems programming', 'memory management'].filter(s => allText.includes(s)).length,
        web: ['react', 'vue', 'angular', 'nextjs', 'frontend', 'css', 'responsive', 'web'].filter(s => allText.includes(s)).length,
        backend: ['api', 'rest', 'graphql', 'database', 'sql', 'postgresql', 'mongodb', 'redis', 'express', 'django', 'flask'].filter(s => allText.includes(s)).length,
        mobile: ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'].filter(s => allText.includes(s)).length
    };

    const primaryDomain = Object.entries(domains).sort((a, b) => b[1] - a[1])[0];
    const hasSpecialization = primaryDomain[1] >= 3;
    const isFullStack = domains.web >= 2 && domains.backend >= 2;

    // Experience level signals
    const experienceSignals = {
        projectScale: qualitySignals.avgFileCount > 100 ? 'large' : qualitySignals.avgFileCount > 30 ? 'medium' : 'small',
        commitDepth: totalCommits > 500 ? 'extensive' : totalCommits > 100 ? 'moderate' : 'light',
        recentlyActive: last90DaysCommits > 50 ? 'very-active' : last90DaysCommits > 20 ? 'active' : last90DaysCommits > 5 ? 'occasional' : 'dormant',
        collaborates: externalContribs > 50
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: AI Usage Analysis (Modern hiring concern)
    // ═══════════════════════════════════════════════════════════════════════════

    const avgAILikelihood = globalMetadata.avgAILikelihood || 0;

    const aiAssessment = (() => {
        if (avgAILikelihood > 70 && qualityTier === 'basic') {
            return {
                level: 'concerning',
                summary: 'Heavy AI patterns without quality validation',
                recommendation: 'Recommend live coding assessment to verify hands-on ability'
            };
        } else if (avgAILikelihood > 70 && qualityTier !== 'basic') {
            return {
                level: 'pragmatic',
                summary: 'Uses AI tools effectively with proper testing/CI',
                recommendation: 'Modern tooling approach, verify architectural understanding'
            };
        } else if (avgAILikelihood > 30) {
            return {
                level: 'balanced',
                summary: 'Healthy mix of AI assistance and manual coding',
                recommendation: 'Standard technical interview process'
            };
        } else {
            return {
                level: 'traditional',
                summary: 'Primarily hand-written code',
                recommendation: 'Standard technical interview process'
            };
        }
    })();

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Separate VISIBILITY from SKILL (Critical nuance!)
    // ═══════════════════════════════════════════════════════════════════════════

    // VISIBILITY SIGNALS (reach, marketing, luck - NOT skill indicators)
    // - Stars can come from: great work, good marketing, viral content, curated lists
    // - High stars ≠ high skill (could be a popular tutorial or curated list)
    // - Low stars ≠ low skill (enterprise devs, private work, introverts)
    const visibilityScore = {
        stars: totalStars,
        highestRepo: highestStars,
        level: highestStars >= 1000 ? 'high' : highestStars >= 100 ? 'moderate' : highestStars >= 10 ? 'low' : 'minimal'
    };

    // SKILL SIGNALS (actual technical ability)
    // These matter more than stars for hiring decisions
    const skillScore = {
        codeQuality: qualityTier,
        domainDepth: hasSpecialization ? primaryDomain[0] : 'generalist',
        projectComplexity: experienceSignals.projectScale,
        sustainedWork: experienceSignals.commitDepth,
        collaboration: externalContribs >= 30 ? 'strong' : externalContribs >= 10 ? 'some' : 'minimal',
        modernPractices: qualitySignals.hasTests && qualitySignals.hasCI
    };

    // Check if high stars are from non-code work (curated lists, tutorials, etc.)
    const isViralNonCode = highestStars >= 500 && (topRepo?.educationalMeta?.isEducational || topRepo?.educationalMeta?.isLikelyGuide) && qualitySignals.avgFileCount < 20;

    console.log(`[Visibility vs Skill] Stars: ${visibilityScore.level}, Quality: ${skillScore.codeQuality}, Domain: ${skillScore.domainDepth}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: Archetype Classification (Balancing visibility and skill)
    // ═══════════════════════════════════════════════════════════════════════════

    let archetype: string;
    let tier: string;
    let tierBadge: string;
    let percentile: string;
    let classificationReason: string;

    // Check for maintainer status on popular repos
    const isMaintainer = globalMetadata.topRepos?.some((r: any) => r.isMaintainer && r.stars >= 100);
    const isEducationalContent = topRepo?.educationalMeta?.isEducational || topRepo?.educationalMeta?.isLikelyGuide;

    // ─────────────────────────────────────────────────────────────────────────────
    // CLASSIFICATION PHILOSOPHY:
    // - Stars = reach/visibility (marketing, luck, timing)
    // - Quality + Domain + Complexity = skill (what we actually hire for)
    // - High visibility + high skill = rare unicorn
    // - High visibility + low skill = lucky/marketing-savvy (flag this)
    // - Low visibility + high skill = HIDDEN GEM (we want to surface these!)
    // - Low visibility + low skill = early career / hobbyist
    // ─────────────────────────────────────────────────────────────────────────────

    // Quality gates for top tiers - you can't be elite without quality practices
    const hasQualityPractices = qualitySignals.hasTests || qualitySignals.hasCI;
    const isRecentlyActive = experienceSignals.recentlyActive === 'very-active' || experienceSignals.recentlyActive === 'active';

    // Multi-domain expertise check (for skill-based path)
    const domainExpertiseCount = Object.values(domains).filter(count => count >= 2).length;
    const hasMultiDomainExpertise = domainExpertiseCount >= 3; // Expert in 3+ domains

    // HYPER RARE: True industry legends - should be EXTREMELY rare
    // PATH 1: Massive stars (25K+) with quality
    if (highestStars >= 25000 && !isViralNonCode && hasQualityPractices) {
        tier = 'HYPER RARE';
        tierBadge = '🌟🌟🌟';
        percentile = 'Top 1%';
        archetype = 'THE 10X ENGINEER';
        classificationReason = 'Industry-defining impact with widely-adopted tools';
    }
    // PATH 2: High stars (10K+) with production-ready quality + active + specialized
    else if (highestStars >= 10000 && !isViralNonCode && qualityTier === 'production-ready' && isRecentlyActive && hasSpecialization) {
        tier = 'HYPER RARE';
        tierBadge = '🌟🌟🌟';
        percentile = 'Top 1%';
        archetype = 'THE 10X ENGINEER';
        classificationReason = 'High-impact engineer with exceptional quality practices';
    }
    // PATH 3: PURE SKILL (no stars required) - for enterprise/private devs
    // Requires: production-ready + multi-domain expertise + large projects + very active + long tenure
    else if (
        qualityTier === 'production-ready' &&
        hasMultiDomainExpertise &&
        experienceSignals.projectScale === 'large' &&
        isRecentlyActive &&
        accountAgeYears >= 5 &&
        experienceSignals.commitDepth === 'extensive'
    ) {
        tier = 'HYPER RARE';
        tierBadge = '🌟🌟🌟';
        percentile = 'Top 1%';
        archetype = 'THE 10X ENGINEER';
        classificationReason = 'Elite technical depth across multiple domains with production-grade practices';
    }
    // ULTRA RARE: Strong visibility with matching skill
    else if ((highestStars >= 5000 && !isViralNonCode && hasQualityPractices) || (highestStars >= 3000 && isMaintainer && qualityTier === 'production-ready')) {
        tier = 'ULTRA RARE';
        tierBadge = '🌟🌟';
        percentile = 'Top 5%';
        if (isEducationalContent) {
            archetype = 'THE PROFESSOR';
            classificationReason = 'High-impact educational content with strong reach';
        } else {
            archetype = 'THE ARCHITECT';
            classificationReason = 'Designs and maintains systems used by many';
        }
    }
    // RARE: Either high visibility OR exceptional skill (skill-first path!)
    else if (
        (highestStars >= 500 && !isViralNonCode) ||
        hasSpecialization ||
        (qualityTier === 'production-ready' && experienceSignals.projectScale !== 'small') ||
        (domains.systems >= 3 || domains.lowLevel >= 2 || domains.ml >= 2)
    ) {
        tier = 'RARE';
        tierBadge = '⭐';
        percentile = 'Top 15%';
        if (domains.systems >= 3 || domains.lowLevel >= 2) {
            archetype = 'THE SYSTEMS THINKER';
            classificationReason = 'Deep infrastructure and systems expertise';
        } else if (domains.ml >= 2 || domains.security >= 2) {
            archetype = 'THE SPECIALIST';
            classificationReason = `Deep expertise in ${primaryDomain[0]}`;
        } else {
            archetype = 'THE SPECIALIST';
            classificationReason = 'Strong technical depth in focused domain';
        }
    }
    // UNCOMMON: Solid skill indicators, varying visibility
    else if (
        qualityTier === 'professional' ||
        qualityTier === 'production-ready' ||
        externalContribs >= 20 ||
        experienceSignals.projectScale === 'medium' ||
        highestStars >= 50
    ) {
        tier = 'UNCOMMON';
        tierBadge = '◆';
        percentile = 'Top 30%';

        // HIDDEN GEM: High skill, low visibility (the most important archetype for recruiters!)
        // This surfaces enterprise devs, private contributors, and introverted experts
        if ((qualityTier === 'production-ready' || (qualityTier === 'professional' && hasSpecialization)) && highestStars < 200) {
            archetype = 'THE HIDDEN GEM';
            classificationReason = 'Strong code quality and practices, low public visibility - likely enterprise experience';
        } else if (isMaintainer) {
            archetype = 'THE MAINTAINER';
            classificationReason = 'Actively maintains production repositories';
        } else if (externalContribs >= 40) {
            archetype = 'THE CONTRIBUTOR';
            classificationReason = 'Strong open-source collaboration track record';
        } else if (qualityTier === 'professional' || qualityTier === 'production-ready') {
            archetype = 'THE CRAFTSPERSON';
            classificationReason = 'Focuses on code quality and best practices';
        } else if (accountAgeYears >= 7 && experienceSignals.recentlyActive !== 'dormant') {
            // VETERAN CHECK: 7+ years with any recent activity = HIDDEN GEM (likely private/enterprise work)
            archetype = 'THE HIDDEN GEM';
            classificationReason = `${accountAgeYears.toFixed(0)}-year veteran with sustained activity - likely enterprise/private work`;
        } else {
            archetype = 'THE BUILDER';
            classificationReason = 'Ships working products consistently';
        }
    }
    // COMMON: Early-mid career OR truly quiet accounts
    else {
        tier = 'COMMON';
        tierBadge = '●';
        percentile = 'Top 50%';

        // VETERAN ESCAPE HATCH: Long-tenured devs shouldn't be in COMMON tier
        if (accountAgeYears >= 7 && (experienceSignals.recentlyActive !== 'dormant' || totalCommits > 200)) {
            // Bump to UNCOMMON - they're clearly experienced, just low public visibility
            tier = 'UNCOMMON';
            tierBadge = '◆';
            percentile = 'Top 30%';
            archetype = 'THE HIDDEN GEM';
            classificationReason = `${accountAgeYears.toFixed(0)}-year veteran - experienced dev with low public visibility`;
        } else if (isFullStack || (domains.web >= 2 && domains.backend >= 1)) {
            archetype = 'THE TINKERER';
            classificationReason = 'Practical problem solver building real applications';
        } else if ((experienceSignals.recentlyActive === 'very-active' || experienceSignals.recentlyActive === 'active') && accountAgeYears < 4) {
            // GRINDER is for early-career hustle, NOT 12-year veterans
            archetype = 'THE GRINDER';
            classificationReason = 'Early career with high activity - building experience fast';
        } else if (languages.length >= 5) {
            archetype = 'THE EXPLORER';
            classificationReason = 'Exploring multiple technologies, broad exposure';
        } else if (accountAgeYears >= 2 && experienceSignals.recentlyActive === 'occasional') {
            archetype = 'THE HOBBYIST';
            classificationReason = 'Codes for personal interest and passion projects';
        } else if (accountAgeYears >= 4 && experienceSignals.recentlyActive !== 'dormant') {
            // Mid-career with steady activity = TINKERER, not APPRENTICE
            archetype = 'THE TINKERER';
            classificationReason = 'Experienced developer with steady contributions';
        } else {
            archetype = 'THE APPRENTICE';
            classificationReason = 'Early career, building foundational skills';
        }
    }

    console.log(`[Classification] ${archetype} (${tier}) - ${classificationReason}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: Build the DeepSeek Prompt with Timeline Context
    // ═══════════════════════════════════════════════════════════════════════════

    // Categorize repos by age to understand career evolution
    const currentYear = new Date().getFullYear();
    const reposByAge = {
        recent: globalMetadata.topRepos.filter((r: any) => {
            const year = new Date(r.updatedAt).getFullYear();
            return currentYear - year <= 2;
        }),
        mid: globalMetadata.topRepos.filter((r: any) => {
            const year = new Date(r.updatedAt).getFullYear();
            return currentYear - year > 2 && currentYear - year <= 5;
        }),
        old: globalMetadata.topRepos.filter((r: any) => {
            const year = new Date(r.updatedAt).getFullYear();
            return currentYear - year > 5;
        })
    };

    const recentLanguages = [...new Set(reposByAge.recent.map((r: any) => r.language).filter(Boolean))];
    const oldLanguages = [...new Set(reposByAge.old.map((r: any) => r.language).filter(Boolean))];

    const formatRepoWithAge = (r: any, i: number) => {
        const qual = globalMetadata.qualitySignals?.[i];
        const year = new Date(r.updatedAt).getFullYear();
        const age = currentYear - year;
        const ageLabel = age === 0 ? 'this year' : age === 1 ? 'last year' : `${age} years ago`;
        const markers = [
            qual?.hasTests ? '✓Tests' : '',
            qual?.hasCI ? '✓CI' : '',
        ].filter(Boolean).join(' ');
        return `• ${r.name} (${r.language || 'Unknown'}, updated ${ageLabel}) ${markers}`;
    };

    const prompt = `You are writing a developer assessment for a technical recruiter and engineering manager.

## CRITICAL: PRIORITIZE RECENT WORK
⚠️ **This developer has work spanning ${accountAgeYears.toFixed(0)} years. Focus on their CURRENT skills, not their history.**
- Recent work (last 2 years): ${reposByAge.recent.length} repos - ${recentLanguages.join(', ') || 'None'}
- Old work (5+ years ago): ${reposByAge.old.length} repos - ${oldLanguages.join(', ') || 'None'}
${reposByAge.old.length > reposByAge.recent.length ? '⚠️ More old repos than recent - likely academic/historical work. Focus on recent activity!' : ''}

## CANDIDATE CLASSIFICATION
**Archetype:** ${archetype}
**Tier:** ${tier} ${tierBadge} (${percentile})
**Why:** ${classificationReason}

## GITHUB PROFILE SUMMARY
- **Account Age:** ${accountAgeYears.toFixed(1)} years
- **Total Stars:** ${totalStars} across ${repoCount} repositories
- **Current Focus (last 2 years):** ${recentLanguages.slice(0, 4).join(', ') || 'Low recent activity'}
- **Historical Languages:** ${oldLanguages.slice(0, 4).join(', ') || 'None'}
- **Recent Activity:** ${last90DaysCommits} commits in last 90 days (${experienceSignals.recentlyActive})
- **Code Quality:** ${qualityTier} (Tests: ${qualitySignals.hasTests ? 'Yes' : 'No'}, CI: ${qualitySignals.hasCI ? 'Yes' : 'No'})

## REPOSITORIES BY TIMELINE

**Recent (Last 2 Years) - PRIORITIZE THESE:**
${reposByAge.recent.length > 0 ? reposByAge.recent.slice(0, 5).map(formatRepoWithAge).join('\n') : 'No recent public repositories'}

**Historical (5+ Years Ago) - Context only, may be academic:**
${reposByAge.old.length > 0 ? reposByAge.old.slice(0, 3).map(formatRepoWithAge).join('\n') : 'None'}

## AI TOOL USAGE
- **Level:** ${aiAssessment.level}
- **Summary:** ${aiAssessment.summary}

## CODE SAMPLES
${codeSamples.length > 8000 ? codeSamples.substring(0, 8000) + '\n[truncated]' : codeSamples}

---

## YOUR TASK

Write a professional assessment following this EXACT structure:

### 1. trajectory_summary (2-3 sentences)
Describe their developer EVOLUTION - how they've changed over time. If they have old C/systems work but recent TypeScript/Python, lead with the recent focus. Example: "Started with systems programming in C during university, now focuses on modern web development with TypeScript and React."

### 2. recruiter_summary (3 paragraphs)
**Paragraph 1 - Current Technical Strengths:** What can they build TODAY based on RECENT work? Lead with their current focus, not historical skills. Mention historical background briefly if relevant context.

**Paragraph 2 - Development Practices:** How do they approach code quality? ${aiAssessment.level === 'concerning' ? 'NOTE: Address the AI usage concern - recommend hands-on coding assessment.' : ''} What does their testing/documentation look like?

**Paragraph 3 - Team Fit & Collaboration:** What kind of team would they thrive on based on their CURRENT trajectory? What's their likely seniority level?

### 3. highlights (3-7 items, dynamic)
Provide highlights with concrete evidence from their repos:
- **2-4 positive highlights** (type: "positive") - prioritize RECENT achievements
- **1-3 concerns** (type: "negative") - gaps, missing practices, areas for growth

Do NOT treat old academic projects as current expertise. If someone has C from 7 years ago but TypeScript now, the highlight should be about TypeScript.

Each highlight must have a "title" (short label) and "detail" (1-2 sentence explanation with specific evidence).

### 4. technical_signal (1 sentence)
One specific, concrete example that proves their CURRENT technical ability. Reference a RECENT repo if possible.

### 5. technical_signal_detailed (2-3 paragraphs)  
Deep dive into their technical approach based on the code samples. Focus on recent work. If analyzing old code, note the time period.

### 6. verified_skills (5-8 skills)
List their verified skills with:
- name: The skill (e.g., "React", "PostgreSQL")
- level: "Beginner" | "Intermediate" | "Advanced" | "Expert"
- evidence: Brief proof from their repos
- Mark skills from 5+ year old projects as "Historical" in evidence

---


Return ONLY valid JSON matching this structure:
{
  "label": "${archetype}",
  "rarity": "${tier}",
  "rarity_badge": "${tierBadge}",
  "rarity_percentile": "${percentile}",
  "trajectory_summary": "...",
  "recruiter_summary": "...",
  "highlights": [
    {"title": "...", "detail": "...", "type": "positive"},
    {"title": "...", "detail": "...", "type": "negative"}
  ],
  "technical_signal": "...",
  "technical_signal_detailed": "...",
  "verified_skills": [
    {"name": "...", "level": "...", "evidence": "..."}
  ]
}`;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 7: Call DeepSeek API
    // ═══════════════════════════════════════════════════════════════════════════

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: `You are a senior technical recruiter with 10 years of experience, partnering with an engineering manager to assess developer candidates.

Your assessments are:
- **Actionable**: Recruiters know what to discuss, managers know what to probe
- **Evidence-based**: Every claim references specific repos, commits, or code patterns
- **Balanced**: You find genuine strengths AND genuine concerns
- **Professional**: Written for hiring decisions, not social media

Golden rules:
1. NEVER mention internal scores, percentages, or metrics
2. Always reference specific technologies and repositories
3. Highlights must have 3-4 positives and 1-2 negatives (never all positive)
4. Write as if this assessment goes directly to the hiring manager`
                    },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2
            })
        });

        const data: any = await response.json();

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Empty response from DeepSeek');
        }

        const rawContent = data.choices[0].message.content;

        // Parse JSON response
        let analysis;
        try {
            let cleaned = rawContent.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
            }
            analysis = JSON.parse(cleaned);
        } catch (parseError) {
            // Try to extract JSON from response
            const firstBrace = rawContent.indexOf('{');
            const lastBrace = rawContent.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                analysis = JSON.parse(rawContent.substring(firstBrace, lastBrace + 1));
            } else {
                throw parseError;
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 8: Validate and enforce our classification
        // ═══════════════════════════════════════════════════════════════════════

        // Enforce the archetype we determined (DeepSeek sometimes changes it)
        analysis.label = archetype;
        analysis.rarity = tier;
        analysis.rarity_badge = tierBadge;
        analysis.rarity_percentile = percentile;

        // Ensure highlights have proper distribution
        const positives = (analysis.highlights || []).filter((h: any) => h.type === 'positive');
        const negatives = (analysis.highlights || []).filter((h: any) => h.type === 'negative');

        // If no negatives, add a default one
        if (negatives.length === 0) {
            analysis.highlights = analysis.highlights || [];
            if (!qualitySignals.hasTests) {
                analysis.highlights.push({
                    title: 'Testing Gaps',
                    detail: 'Limited automated testing coverage across repositories. Adding tests would strengthen code reliability.',
                    type: 'negative'
                });
            } else if (!qualitySignals.hasCI) {
                analysis.highlights.push({
                    title: 'CI/CD Automation',
                    detail: 'No continuous integration pipelines detected. Automated builds and deployments would improve development workflow.',
                    type: 'negative'
                });
            } else if (aiAssessment.level === 'concerning') {
                analysis.highlights.push({
                    title: 'AI Tool Reliance',
                    detail: 'Code patterns suggest heavy AI assistance without comprehensive quality validation. Recommend hands-on assessment.',
                    type: 'negative'
                });
            } else {
                analysis.highlights.push({
                    title: 'Documentation Coverage',
                    detail: 'README and inline documentation could be expanded to improve maintainability.',
                    type: 'negative'
                });
            }
        }

        // Ensure highlights stay within bounds (2-4 positive, 1-3 negative)
        if (analysis.highlights && analysis.highlights.length > 7) {
            const pos = analysis.highlights.filter((h: any) => h.type === 'positive').slice(0, 4);
            const neg = analysis.highlights.filter((h: any) => h.type === 'negative').slice(0, 3);
            analysis.highlights = [...pos, ...neg];
        }

        return analysis;

    } catch (error) {
        console.error('[DeepSeek] Analysis error:', error);

        // Return a fallback response
        return {
            label: archetype,
            rarity: tier,
            rarity_badge: tierBadge,
            rarity_percentile: percentile,
            trajectory_summary: `Developer with ${accountAgeYears.toFixed(0)} years on GitHub, primarily working with ${languages.slice(0, 3).join(', ') || 'various technologies'}.`,
            recruiter_summary: `This candidate shows ${experienceSignals.recentlyActive} activity on GitHub with ${repoCount} public repositories. Their primary focus appears to be ${primaryDomain[0]} development. ${qualityTier === 'production-ready' ? 'Code quality practices are strong with testing and CI present.' : 'Code quality practices could be strengthened.'}`,
            highlights: [
                { title: 'Active Developer', detail: `${last90DaysCommits} commits in the last 90 days`, type: 'positive' },
                { title: 'Multi-language Experience', detail: `Works with ${languages.slice(0, 3).join(', ')}`, type: 'positive' },
                { title: qualitySignals.hasTests ? 'Testing Present' : 'Testing Gaps', detail: qualitySignals.hasTests ? 'Automated tests detected in repositories' : 'Limited test coverage detected', type: qualitySignals.hasTests ? 'positive' : 'negative' }
            ],
            technical_signal: `Works primarily with ${primaryDomain[0]} technologies.`,
            technical_signal_detailed: 'Unable to generate detailed analysis due to API limitations.',
            verified_skills: languages.slice(0, 5).map((lang: string) => ({
                name: lang,
                level: 'Intermediate',
                evidence: `Used in ${globalMetadata.topRepos.filter((r: any) => r.language === lang).length} repositories`
            }))
        };
    }
};
