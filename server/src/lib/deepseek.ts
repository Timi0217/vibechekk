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
 * 🌟🌟🌟 LEGENDARY (Top 1%) - Industry-defining talent
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
    // STEP 0: Check for minimum data requirements
    // ═══════════════════════════════════════════════════════════════════════════

    const repoCount = globalMetadata.topRepos?.length || 0;
    const hasCodeSamples = codeSamples && codeSamples.trim().length > 100;
    const languages = globalMetadata.userStats?.languages || [];

    // If user has no repos or no analyzable code, return insufficient data response
    if (repoCount === 0 || (!hasCodeSamples && languages.length === 0)) {
        console.log(`[DeepSeek] Insufficient data: ${repoCount} repos, hasCode: ${hasCodeSamples}, languages: ${languages.length}`);
        return {
            insufficient_data: true,
            label: 'THE GHOST',
            rarity: 'UNKNOWN',
            rarity_badge: '👻',
            rarity_percentile: '',
            archetype_reason: 'No public repositories or code to analyze. This developer may work in private repos or enterprise environments.',
            trajectory_summary: 'Limited public GitHub presence.',
            recruiter_summary: 'Unable to generate assessment - this profile has no public repositories with analyzable code. Consider requesting code samples or portfolio links directly.',
            highlights: [],
            technical_signal: 'No public code available.',
            technical_signal_detailed: '',
            verified_skills: []
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Extract key metrics from GitHub data
    // ═══════════════════════════════════════════════════════════════════════════

    const highestStars = globalMetadata.starDistribution?.highest_single_repo || 0;
    const totalStars = globalMetadata.starDistribution?.total_stars || 0;
    const topRepo = globalMetadata.topRepos?.[0];

    // DEBUG: Log star data
    console.log(`[DeepSeek DEBUG] highestStars: ${highestStars}, totalStars: ${totalStars}, topRepo: ${topRepo?.name} (${topRepo?.stars}⭐)`);

    // Account info
    const last90DaysCommits = globalMetadata.userStats?.last90DaysCommits || 0;
    const totalCommits = globalMetadata.topRepos?.reduce((sum: number, r: any) => sum + (r.totalCommits || 0), 0) || 0;
    const externalContribs = globalMetadata.userStats?.externalContributions || 0;
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
    const hasSpecialization = primaryDomain[1] >= 5; // Raised from 3 - must have DEEP expertise
    const hasDeepExpertise = primaryDomain[1] >= 4; // Mid-level expertise
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

    // Extract detected tools from the AI analysis
    const detectedTools: string[] = (globalMetadata.aiCodeAnalysis || [])
        .flatMap((a: any) => a.signals?.detectedTools || [])
        .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i); // unique

    const aiAssessment = (() => {
        const toolsNote = detectedTools.length > 0
            ? ` Detected: ${detectedTools.join(', ')}.`
            : '';

        if (avgAILikelihood > 70 && qualityTier === 'basic') {
            return {
                level: 'concerning',
                summary: `Heavy AI patterns without quality validation.${toolsNote}`,
                recommendation: 'Recommend live coding assessment to verify hands-on ability'
            };
        } else if (avgAILikelihood > 70 && qualityTier !== 'basic') {
            return {
                level: 'pragmatic',
                summary: `Uses AI tools effectively with proper testing/CI.${toolsNote}`,
                recommendation: 'Modern tooling approach, verify architectural understanding'
            };
        } else if (avgAILikelihood > 30) {
            return {
                level: 'balanced',
                summary: `Healthy mix of AI assistance and manual coding.${toolsNote}`,
                recommendation: 'Standard technical interview process'
            };
        } else if (detectedTools.length > 0) {
            // Some AI detected even with low score - mention it
            return {
                level: 'light-ai',
                summary: `Some AI tool usage detected but primarily hand-written.${toolsNote}`,
                recommendation: 'Standard technical interview process'
            };
        } else {
            return {
                level: 'traditional',
                summary: 'Primarily hand-written code with no AI tool indicators detected.',
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
    const isViralNonCode = highestStars >= 500 && highestStars < 25000 &&
        (topRepo?.educationalMeta?.isEducational || topRepo?.educationalMeta?.isLikelyGuide) &&
        qualitySignals.avgFileCount < 20;
    const isEducationalContent = topRepo?.educationalMeta?.isEducational || topRepo?.educationalMeta?.isLikelyGuide;

    console.log(`[Visibility vs Skill] Stars: ${visibilityScore.level}, Quality: ${skillScore.codeQuality}, Domain: ${skillScore.domainDepth}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: COMPOSITE SCORING SYSTEM
    // Instead of checking individual thresholds, calculate a holistic score
    // ═══════════════════════════════════════════════════════════════════════════

    // VISIBILITY SCORE (0-25 points) - reach and impact
    let visibilityPoints = 0;
    if (highestStars >= 100000) visibilityPoints = 25;
    else if (highestStars >= 50000) visibilityPoints = 23;
    else if (highestStars >= 10000) visibilityPoints = 20;
    else if (highestStars >= 5000) visibilityPoints = 18;
    else if (highestStars >= 1000) visibilityPoints = 15;
    else if (highestStars >= 500) visibilityPoints = 12;
    else if (highestStars >= 100) visibilityPoints = 8;
    else if (highestStars >= 10) visibilityPoints = 4;
    // Penalty for viral non-code content
    if (isViralNonCode) visibilityPoints = Math.floor(visibilityPoints * 0.5);

    // QUALITY SCORE (0-30 points) - code craftsmanship
    let qualityPoints = 0;
    if (qualitySignals.hasTests) qualityPoints += 8;
    if (qualitySignals.hasCI) qualityPoints += 8;
    if (qualitySignals.hasTypeScript) qualityPoints += 4;
    if (qualitySignals.hasLinting) qualityPoints += 3;
    if (qualitySignals.hasDocs) qualityPoints += 3;
    if (qualitySignals.avgFileCount > 100) qualityPoints += 4;
    else if (qualitySignals.avgFileCount > 30) qualityPoints += 2;

    // ACTIVITY SCORE (0-25 points) - engagement and consistency
    let activityPoints = 0;
    if (last90DaysCommits >= 100) activityPoints += 10;
    else if (last90DaysCommits >= 50) activityPoints += 8;
    else if (last90DaysCommits >= 20) activityPoints += 5;
    else if (last90DaysCommits >= 5) activityPoints += 2;

    if (totalCommits >= 1000) activityPoints += 8;
    else if (totalCommits >= 500) activityPoints += 6;
    else if (totalCommits >= 100) activityPoints += 3;

    if (externalContribs >= 50) activityPoints += 7;
    else if (externalContribs >= 20) activityPoints += 4;
    else if (externalContribs >= 5) activityPoints += 2;

    // EXPERTISE SCORE (0-20 points) - tenure and depth
    let expertisePoints = 0;
    if (accountAgeYears >= 10) expertisePoints += 6;
    else if (accountAgeYears >= 7) expertisePoints += 5;
    else if (accountAgeYears >= 5) expertisePoints += 4;
    else if (accountAgeYears >= 3) expertisePoints += 2;

    // Domain depth
    const topDomainScore = primaryDomain[1];
    if (topDomainScore >= 6) expertisePoints += 8;
    else if (topDomainScore >= 4) expertisePoints += 5;
    else if (topDomainScore >= 2) expertisePoints += 2;

    // Multi-domain breadth
    const domainExpertiseCount = Object.values(domains).filter(count => count >= 2).length;
    if (domainExpertiseCount >= 4) expertisePoints += 6;
    else if (domainExpertiseCount >= 2) expertisePoints += 3;

    // TOTAL COMPOSITE SCORE (0-100)
    const compositeScore = visibilityPoints + qualityPoints + activityPoints + expertisePoints;

    console.log(`[Composite Score] Visibility: ${visibilityPoints}, Quality: ${qualityPoints}, Activity: ${activityPoints}, Expertise: ${expertisePoints} = ${compositeScore}/100`);

    // ═══════════════════════════════════════════════════════════════════════════
    // TIER DETERMINATION - Based on composite score
    // ═══════════════════════════════════════════════════════════════════════════

    let archetype: string;
    let tier: string;
    let tierBadge: string;
    let percentile: string;
    let classificationReason: string;

    // Check for maintainer status
    const isMaintainer = globalMetadata.topRepos?.some((r: any) => r.isMaintainer && r.stars >= 100);
    const isFullStackDev = domains.web >= 2 && domains.backend >= 2;

    // LEGENDARY (90+ points) - Top 1%
    if (compositeScore >= 90) {
        tier = 'LEGENDARY';
        tierBadge = '🌟🌟🌟';
        percentile = 'Top 1%';

        if (isEducationalContent && visibilityPoints >= 20) {
            archetype = 'THE PROFESSOR';
            classificationReason = 'Industry-defining educational impact';
        } else {
            archetype = 'THE 10X ENGINEER';
            classificationReason = 'Exceptional across visibility, quality, and depth';
        }
    }
    // ULTRA RARE (70-89 points) - Top 5%
    else if (compositeScore >= 70) {
        tier = 'ULTRA RARE';
        tierBadge = '🌟🌟';
        percentile = 'Top 5%';

        if (isEducationalContent && visibilityPoints >= 15) {
            archetype = 'THE PROFESSOR';
            classificationReason = 'High-impact educational content creator';
        } else if (qualityPoints >= 20 && expertisePoints >= 10) {
            archetype = 'THE ARCHITECT';
            classificationReason = 'Designs production-grade systems with deep expertise';
        } else {
            archetype = 'THE ARCHITECT';
            classificationReason = 'Strong on multiple dimensions of engineering excellence';
        }
    }
    // RARE (50-69 points) - Top 15%
    else if (compositeScore >= 50) {
        tier = 'RARE';
        tierBadge = '⭐';
        percentile = 'Top 15%';

        if (domains.systems >= 3 || domains.lowLevel >= 2) {
            archetype = 'THE SYSTEMS THINKER';
            classificationReason = 'Deep infrastructure and systems expertise';
        } else if (topDomainScore >= 4) {
            archetype = 'THE SPECIALIST';
            classificationReason = `Deep expertise in ${primaryDomain[0]}`;
        } else if (isMaintainer) {
            archetype = 'THE MAINTAINER';
            classificationReason = 'Actively maintains production repositories';
        } else {
            archetype = 'THE SPECIALIST';
            classificationReason = 'Strong technical focus with proven impact';
        }
    }
    // UNCOMMON (30-49 points) - Top 30%
    else if (compositeScore >= 30) {
        tier = 'UNCOMMON';
        tierBadge = '◆';
        percentile = 'Top 30%';

        // Rebalanced order for better distribution:
        // 1. Check for HIDDEN GEM first (high quality, low visibility)
        if (qualityPoints >= 12 && visibilityPoints <= 4 && (qualitySignals.hasTests || qualitySignals.hasCI)) {
            archetype = 'THE HIDDEN GEM';
            classificationReason = 'Strong code quality with low public visibility - likely works in private/enterprise';
        }
        // 2. Check for MAINTAINER (actively maintains repos with traction)
        else if (isMaintainer) {
            archetype = 'THE MAINTAINER';
            classificationReason = 'Actively maintains open-source projects with community adoption';
        }
        // 3. Check for CONTRIBUTOR (OSS collaboration)
        else if (externalContribs >= 15) {
            archetype = 'THE CONTRIBUTOR';
            classificationReason = 'Active open-source collaborator with meaningful contributions';
        }
        // 4. Check for BUILDER (ships consistently) - PRIMARY for active devs
        else if (activityPoints >= 12 || (last90DaysCommits >= 30 && repoCount >= 5)) {
            archetype = 'THE BUILDER';
            classificationReason = 'Ships consistently with strong development momentum';
        }
        // 5. Check for CRAFTSPERSON (exceptional quality focus) - RAISED threshold
        else if (qualityPoints >= 18 && qualitySignals.hasTests && qualitySignals.hasCI) {
            archetype = 'THE CRAFTSPERSON';
            classificationReason = 'Exceptional focus on code quality, testing, and best practices';
        }
        // 6. Check for TINKERER (practical problem solver)
        else if (isFullStackDev || domainExpertiseCount >= 2) {
            archetype = 'THE TINKERER';
            classificationReason = 'Practical problem solver building real applications';
        }
        // 7. Default to BUILDER for this tier
        else {
            archetype = 'THE BUILDER';
            classificationReason = 'Solid developer with growing portfolio';
        }
    }
    // COMMON (0-29 points) - Top 50%
    else {
        tier = 'COMMON';
        tierBadge = '●';
        percentile = 'Top 50%';

        // Rebalanced for better distribution:
        // 1. GRINDER - high activity, putting in the work
        if (activityPoints >= 10 && last90DaysCommits >= 20) {
            archetype = 'THE GRINDER';
            classificationReason = 'High commit activity and sustained development effort';
        }
        // 2. TINKERER - practical builders (prioritize over HOBBYIST for active devs)
        else if (isFullStackDev || (domains.web >= 2 && domains.backend >= 1)) {
            archetype = 'THE TINKERER';
            classificationReason = 'Practical problem solver building real applications';
        }
        // 3. HOBBYIST - experienced but low recent activity
        else if (accountAgeYears >= 5 && last90DaysCommits < 20) {
            archetype = 'THE HOBBYIST';
            classificationReason = 'Experienced developer with passion projects';
        }
        // 4. EXPLORER - trying multiple technologies
        else if (domainExpertiseCount >= 2 || languages.length >= 4) {
            archetype = 'THE EXPLORER';
            classificationReason = 'Exploring multiple technologies and finding their niche';
        }
        // 5. APPRENTICE - building foundations
        else {
            archetype = 'THE APPRENTICE';
            classificationReason = 'Building foundational skills and early-career portfolio';
        }
    }

    console.log(`[Classification] ${archetype} (${tier}) - Score: ${compositeScore} - ${classificationReason}`);



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

### 0. archetype_reason (1-2 sentences) - REQUIRED
Explain WHY this specific developer got their archetype based on THEIR repos and behavior. Be specific!
Examples:
- "Classified as CRAFTSPERSON because 80% of their repos have comprehensive test suites and consistent code style patterns."
- "Earned ARCHITECT status through designing scalable systems in their payment-gateway and microservices-template repos."
- "Identified as HIDDEN GEM: low star count but exceptionally clean React code with TypeScript and proper error handling."

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
- **MANDATORY**: Mention AI tool usage trends (detected via LLM likelihood) if significant (e.g., heavy usage in recent repos, or a healthy mix).

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
  "archetype_reason": "1-2 sentences explaining why this specific developer got this archetype based on their repos and behavior",
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

        // Ensure archetype_reason uses accurate data (DeepSeek often hallucinates wrong numbers)
        // Always override with our classification reason that has accurate stats
        analysis.archetype_reason = `Classified as ${archetype.replace(/^THE\\s+/i, '')} because ${classificationReason.toLowerCase()}${totalStars > 0 ? ` with ${totalStars.toLocaleString()} total stars across ${repoCount} repositories` : ''}.`;

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
                    title: 'Heavy AI Dependency',
                    detail: 'High likelihood of code generated via AI tools without significant evidence of manual testing or verification.',
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

        // Always ensure AI usage is mentioned if significant (and not already highlighted)
        const hasAIHighlight = (analysis.highlights || []).some((h: any) =>
            h.title?.toLowerCase().includes('ai') || h.detail?.toLowerCase().includes('ai')
        );

        if (!hasAIHighlight && avgAILikelihood > 50) {
            analysis.highlights = analysis.highlights || [];
            analysis.highlights.push({
                title: avgAILikelihood > 80 ? 'AI-First Workflow' : 'AI-Assisted Development',
                detail: `High pattern of AI-assisted coding detected (${avgAILikelihood}% likelihood). ${aiAssessment.summary}.`,
                type: (avgAILikelihood > 85 && qualityTier === 'basic') ? 'negative' : 'positive'
            });
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
            archetype_reason: `Classified as ${archetype.replace(/^THE\s+/i, '')} based on ${classificationReason}.`,
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
}

export const rankCandidates = async (apiKey: string, criteria: any, candidates: any[]) => {
    // criteria: { jobTitle, jd, experience, languages, archetypes, tiers }

    const candidateSummaries = candidates.map((c: any) => ({
        handle: c.login,
        name: c.name || c.login,
        bio: c.bio,
        location: c.location,
        top_repo: c.repositories.nodes[0] ? `${c.repositories.nodes[0].name}: ${c.repositories.nodes[0].description} (${c.repositories.nodes[0].primaryLanguage?.name})` : 'None',
        other_repos: c.repositories.nodes.slice(1, 3).map((r: any) => `${r.name} (${r.primaryLanguage?.name})`).join(', ')
    }));

    const prompt = `
    You are VibeChekk's Senior Talent Assessor. Your goal is to strictly filter candidates based on Archetype/Tier first, then Score based on JD.

    === VIBECHEKK DEFINITIONS (STRICT) ===
    TIERS:
    - LEGENDARY (Top 1%): Industry-defining talent, library authors, maintainers of massive OSS.
    - ULTRA RARE (Top 5%): Systems architects, deep specialists, staff+ level engineers.
    - RARE (Top 15%): Strong senior engineers, high quality, consistent.
    - UNCOMMON (Top 30%): Solid mid-senior, huge contributors, builders.
    - COMMON: Junior/Mid, learners, average activity.

    ARCHETYPES:
    - THE 10X ENGINEER: Builds tools/frameworks used by thousands.
    - THE ARCHITECT: Designs scalable systems, infra, distributed systems.
    - THE SPECIALIST: Deep niche expertise (ML, Security, Graphics).
    - THE MAINTAINER: Keeps meaningful OSS projects alive.
    - THE BUILDER: Pragmatic shipper, high volume of "real" apps.
    - THE CRAFTSPERSON: Obsessed with testing, clean code, docs.
    - THE HIDDEN GEM: High quality code, low visibility/stars. (Often Enterprise/Private).
    - THE TINKERER/GRINDER: High activity, learning by doing.
    - THE PROFESSOR: Educational content, tutorials.

    === USER REQUEST ===
    JOB TITLE: ${criteria.jobTitle}
    JOB DESCRIPTION: ${criteria.jd.substring(0, 800)}...
    
    STRICT FILTERS (MUST MATCH OR EXCLUDE):
    - Target Archetypes: ${criteria.archetypes && criteria.archetypes.length > 0 ? criteria.archetypes.join(', ') : '(No strict filter - allow all good matches)'}
    - Target Tiers: ${criteria.tiers && criteria.tiers.length > 0 ? criteria.tiers.join(', ') : '(No strict filter)'}
    - Languages: ${criteria.languages?.join(', ') || 'Any'}

    === CANDIDATES ===
    ${JSON.stringify(candidateSummaries, null, 2)}

    === TASK ===
    For each candidate:
    1. CLASSIFY: Determine their most likely Archetype & Tier based on their bio/repos using the Strict Definitions above.
    2. FILTER (CRITICAL): 
       - If user specified [Target Archetypes] or [Target Tiers] and the candidate's classification DOES NOT match, SCORE = 0.
       - If candidate tech stack (languages) is completely irrelevant to JD, SCORE = 0.
    3. JD MATCH:
       - Only if they pass strict filters, rate 0-100 on fit for the JD.
    
    Return JSON format with 'rankings' array. Include 'archetype', 'tier', 'score', and 'reason'.
    
    Example Return:
    {
        "rankings": [
            { 
                "handle": "userA", 
                "archetype": "THE BUILDER",
                "tier": "UNCOMMON",
                "score": 85, 
                "reason": "Correct Archetype (Builder). Strong React match for JD." 
            },
           { 
                "handle": "userB", 
                "archetype": "THE ACADEMIC", 
                "tier": "COMMON", 
                "score": 0, 
                "reason": "Filtered: Wrong Archetype." 
            }
        ]
    }
    `;

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
                    { role: 'system', content: 'You are a technical recruiter assistant. Output valid JSON only.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            })
        });

        const data: any = await response.json();
        const content = data.choices[0].message.content;
        const result = JSON.parse(content);

        // Convert to map for easy lookup
        return result.rankings.reduce((acc: any, r: any) => {
            acc[r.handle] = {
                score: r.score,
                reason: r.reason,
                archetype: r.archetype,
                tier: r.tier
            };
            return acc;
        }, {});

    } catch (error) {
        console.error('[DeepSeek Rank] Error:', error);
        return {}; // Return empty map on failure (fallback to default scoring)
    }
};