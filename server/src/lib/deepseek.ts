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

    const repoCount = globalMetadata.userStats?.totalRepos || globalMetadata.topRepos?.length || 0;
    const hasCodeSamples = codeSamples && codeSamples.trim().length > 100;
    const languages = globalMetadata.userStats?.languages || [];

    // If user has VERY few repos AND no analyzable code, return GHOST.
    // Otherwise, if they have repos, they are at least a HIDDEN GEM or BUILDER.
    if (repoCount < 3 && (!hasCodeSamples && languages.length === 0)) {
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

    // Generate tier-specific gap analysis for smarter negative highlights
    const tierExpectations: Record<string, string[]> = {
        'LEGENDARY': ['Multiple high-impact projects', 'Strong OSS leadership', 'Documentation excellence', 'Test coverage', 'CI/CD', 'Architectural decisions'],
        'ULTRA RARE': ['System design patterns', 'Scalable architecture', 'Test coverage', 'CI/CD', 'Technical leadership signals'],
        'RARE': ['Professional code quality', 'Test coverage', 'Domain specialization', 'Consistent activity'],
        'UNCOMMON': ['Testing practices', 'CI/CD setup', 'Code organization', 'Active contributions'],
        'COMMON': ['Basic testing', 'Code structure', 'Learning progression']
    };

    const identifyGapsForTier = () => {
        const expectations = tierExpectations[tier] || [];
        const gaps: string[] = [];

        if (expectations.includes('Test coverage') && !qualitySignals.hasTests) {
            gaps.push(`lacks automated testing despite being classified as ${tier} tier`);
        }
        if (expectations.includes('CI/CD') && !qualitySignals.hasCI) {
            gaps.push(`no CI/CD pipelines detected for ${tier}-level work`);
        }
        if (expectations.includes('Documentation excellence') && !qualitySignals.hasDocs) {
            gaps.push('limited documentation for projects at this impact level');
        }
        if (tier === 'RARE' || tier === 'ULTRA RARE' || tier === 'LEGENDARY') {
            if (!hasSpecialization && primaryDomain[1] < 4) {
                gaps.push('broad but shallow technical breadth without deep specialization');
            }
        }
        if (tier !== 'COMMON' && experienceSignals.recentlyActive === 'dormant') {
            gaps.push('low recent activity despite strong historical work');
        }
        if (tier === 'UNCOMMON' || tier === 'RARE') {
            if (externalContribs < 5) {
                gaps.push('limited open-source collaboration for this experience level');
            }
        }

        return gaps.length > 0 ? gaps[0] : null; // Return most critical gap
    };

    const tierSpecificGap = identifyGapsForTier();

    // Smart code sample truncation - prioritize recent repos
    const truncateCodeSamples = (samples: string, maxLength: number = 6000): string => {
        if (samples.length <= maxLength) return samples;

        // Split by repo sections if they exist (assuming samples are structured)
        const lines = samples.split('\n');
        const recentRepoNames = reposByAge.recent.map((r: any) => r.name.toLowerCase());

        let truncated = '';
        let currentLength = 0;
        let recentRepoLines = 0;

        // First pass: collect lines from recent repos
        for (const line of lines) {
            const isFromRecentRepo = recentRepoNames.some((name: string) => line.toLowerCase().includes(name));
            if (isFromRecentRepo || recentRepoLines > 0) {
                if (isFromRecentRepo) recentRepoLines = 50; // Keep next 50 lines from recent repo
                truncated += line + '\n';
                currentLength += line.length + 1;
                recentRepoLines--;

                if (currentLength >= maxLength * 0.8) break; // Use 80% of budget for recent repos
            }
        }

        // Second pass: fill remaining space with any other code
        if (currentLength < maxLength) {
            for (const line of lines) {
                if (!truncated.includes(line)) {
                    truncated += line + '\n';
                    currentLength += line.length + 1;
                    if (currentLength >= maxLength) break;
                }
            }
        }

        const truncatedRepos = reposByAge.recent.slice(0, 3).map((r: any) => r.name).join(', ');
        return truncated + `\n\n[Truncated at ${currentLength} chars - showing recent repos: ${truncatedRepos}]`;
    };

    const processedCodeSamples = truncateCodeSamples(codeSamples);

    const prompt = `⚠️⚠️⚠️ CRITICAL INSTRUCTION - READ FIRST ⚠️⚠️⚠️

This developer has ${accountAgeYears.toFixed(0)} years of GitHub history. Your assessment MUST prioritize RECENT work (last 2 years) as their CURRENT skill level.

**Timeline Breakdown:**
→ RECENT (Last 2 years): ${reposByAge.recent.length} repos using ${recentLanguages.join(', ') || 'None'}
→ MID (2-5 years ago): ${reposByAge.mid.length} repos
→ OLD (5+ years): ${reposByAge.old.length} repos using ${oldLanguages.join(', ') || 'None'}

${reposByAge.old.length > reposByAge.recent.length ?
`⚠️ WARNING: More old repos than recent! This developer's historical work (${oldLanguages.slice(0, 3).join(', ')}) may NOT reflect their current expertise. Lead with recent ${recentLanguages.slice(0, 3).join(', ')} work.`
:
`✓ Good activity balance. Recent work shows current direction.`}

**Critical Rules:**
- If they coded C++ 6 years ago but now use TypeScript → they are a TypeScript developer
- Old repos provide context but do NOT define current skill level
- Mark historical skills (5+ years old) as "Historical" explicitly in evidence

════════════════════════════════════════════════════════════════

## CLASSIFICATION GUIDANCE
Based on composite analysis, this developer's profile suggests:

**${archetype}** (${tier} ${tierBadge} - ${percentile})

Your task: Validate or challenge this classification using specific evidence from their code and repos. If evidence contradicts this classification, note it explicitly in your assessment. You are the final judge.

---

## GITHUB PROFILE DATA

**Activity Metrics:**
- Account age: ${accountAgeYears.toFixed(1)} years | Total repos: ${repoCount} | Total stars: ${totalStars}
- Recent activity: ${last90DaysCommits} commits (last 90 days) - ${experienceSignals.recentlyActive}
- External contributions: ${externalContribs} contributions to other projects
- Code quality tier: ${qualityTier}

**Quality Indicators:**
- Tests: ${qualitySignals.hasTests ? '✓ Yes' : '✗ No'} | CI/CD: ${qualitySignals.hasCI ? '✓ Yes' : '✗ No'}
- TypeScript: ${qualitySignals.hasTypeScript ? '✓ Yes' : '✗ No'} | Linting: ${qualitySignals.hasLinting ? '✓ Yes' : '✗ No'}
- Documentation: ${qualitySignals.hasDocs ? '✓ Yes' : '✗ No'}
- Avg file count: ${qualitySignals.avgFileCount.toFixed(0)} files per repo

---

## REPOSITORIES (PRIORITIZED BY RECENCY)

**RECENT (Last 2 Years) - Focus here for current skills:**
${reposByAge.recent.length > 0 ? reposByAge.recent.slice(0, 5).map(formatRepoWithAge).join('\n') : '❌ No recent public repositories'}

${reposByAge.mid.length > 0 ? `**MID-CAREER (2-5 Years Ago) - Career trajectory context:**
${reposByAge.mid.slice(0, 3).map(formatRepoWithAge).join('\n')}` : ''}

${reposByAge.old.length > 0 ? `**HISTORICAL (5+ Years Ago) - Background only:**
${reposByAge.old.slice(0, 2).map(formatRepoWithAge).join('\n')}` : ''}

---

## AI TOOL USAGE ANALYSIS

**Pattern Detection Results:**
- AI likelihood score: ${avgAILikelihood.toFixed(1)}% (${aiAssessment.level})
- Detected tools: ${detectedTools.length > 0 ? detectedTools.join(', ') : 'None detected'}
- Assessment: ${aiAssessment.summary}
- Recommendation: ${aiAssessment.recommendation}

**Interpretation Guide:**
${avgAILikelihood > 70 ? '⚠️ High AI patterns detected. Address this in your assessment - is there evidence of understanding vs copy-paste?' : avgAILikelihood > 30 ? '✓ Moderate AI usage with human oversight evident' : '✓ Primarily hand-written code'}

---

## CODE SAMPLES

The code below shows excerpts from their top repositories, prioritized by recency. Analyze patterns across repos including: code style consistency, complexity progression, architectural choices, and problem-solving approach.

${processedCodeSamples}

---

## TIER EXPECTATIONS & GAP ANALYSIS

For **${tier}** tier developers, we typically expect:
${tierExpectations[tier] ? tierExpectations[tier].map((exp: string) => `• ${exp}`).join('\n') : '• Professional code practices'}

${tierSpecificGap ? `\n⚠️ **Preliminary Assessment:** Based on the data above, this developer ${tierSpecificGap}. Verify this in your analysis and include it in negative highlights if confirmed.\n` : ''}

---

## YOUR TASK

Write a professional assessment following this structure. Reference the EXAMPLES below for quality standards.

### Required Output Fields:

**archetype_reason** (3-4 sentences, ~60-80 words)
Explain WHY they earned this classification with specific evidence from repos and code.

**trajectory_summary** (2-3 sentences, ~40-50 words)
Their evolution over time, prioritizing recent direction. Show how they've changed.

**recruiter_summary** (3 paragraphs, ~120-180 words total)
1. **Current Technical Strengths** (3-4 sentences): What they can build TODAY based on recent work
2. **Development Practices** (2-3 sentences): Code quality, testing, documentation${aiAssessment.level === 'concerning' ? ' ⚠️ Address AI concern' : ''}
3. **Team Fit & Seniority** (2-3 sentences): Best team environment, likely experience level

**highlights** (3-7 items)
- 2-4 positive (recent achievements with specific repo evidence)
- 1-3 negative (tier-specific gaps${tierSpecificGap ? ', verify: ' + tierSpecificGap : ''})

**technical_signal** (1 sentence, ~20-30 words)
One concrete example from recent work proving current ability.

**technical_signal_detailed** (2-3 paragraphs, ~150-200 words total)
Deep dive: architectural choices, code patterns, complexity handling, areas for growth.

**verified_skills** (5-8 skills)
Each with: name, level (Beginner/Intermediate/Advanced/Expert), specific evidence.

---

## EDGE CASE HANDLING

**If evidence is limited:**
- Empty/minimal code samples → Focus on repo structure, commit patterns, README quality
- Only forked repos → State explicitly: "All repos are forks; no original work visible to assess"
- Very low activity (<5 commits total) → Be honest: "Insufficient activity for confident skill assessment"
- Only old repos (5+ years) → "No recent activity; assessment based on historical work only"

**Confidence calibration:**
- Strong evidence → Confident language ("demonstrates", "shows mastery")
- Mixed/limited evidence → Hedged language ("suggests", "appears to", "based on available code")
- Insufficient data → Never extrapolate or fabricate skills

---

## EXAMPLE OUTPUTS (for reference - match this quality):

### Example 1: UNCOMMON Tier (Full-stack Builder)

{
  "label": "THE BUILDER",
  "rarity": "UNCOMMON",
  "rarity_badge": "◆",
  "rarity_percentile": "Top 30%",
  "archetype_reason": "Classified as BUILDER because ships consistently with strong development momentum across 12 repositories. Their e-commerce-platform repo (updated this year) demonstrates full-stack capability with React frontend, Node.js backend, and PostgreSQL integration. The sustained commit activity (47 commits in last 90 days) and focus on shipping complete features shows a pragmatic, product-focused mindset.",

  "trajectory_summary": "Currently focused on modern full-stack development with TypeScript and React over the past 2 years. Historical work includes Python automation scripts (3-5 years ago), showing evolution from scripting to full application development. Recent trajectory indicates growing into mid-level product engineering roles.",

  "recruiter_summary": "This candidate is a full-stack developer currently working with React, TypeScript, Node.js, and PostgreSQL based on their recent public repositories. Their e-commerce-platform and admin-dashboard projects demonstrate ability to build complete features end-to-end, including authentication, API integration, and responsive UI components. While they have Python experience from 3-4 years ago, their current technical focus is firmly in the modern web stack.\\n\\nCode quality practices show room for growth. Testing coverage is minimal across most repositories, with no automated test suites detected. No CI/CD pipelines are configured, suggesting development workflow maturity is still developing. Documentation exists but is basic - mostly setup instructions without architectural explanations. However, code organization is clean and TypeScript usage shows attention to type safety.\\n\\nBest suited for a product-focused team where they can continue building full features under senior guidance. Likely mid-level (2-4 years experience) based on code complexity and repo maturity. Would benefit from mentorship around testing practices and DevOps workflows. Strong candidate for startups or small teams where shipping velocity matters and learning opportunities are available.",

  "highlights": [
    {
      "title": "Full-Stack Shipping Velocity",
      "detail": "Built and maintains e-commerce-platform with complete auth flow, payment integration, and admin dashboard. Shows ability to deliver end-to-end features.",
      "type": "positive"
    },
    {
      "title": "Modern Stack Proficiency",
      "detail": "Strong TypeScript adoption across recent projects with proper type definitions and React hooks patterns. Code is clean and follows current best practices.",
      "type": "positive"
    },
    {
      "title": "Active Development Momentum",
      "detail": "47 commits in last 90 days with consistent contribution pattern. Regularly ships updates and bug fixes to active projects.",
      "type": "positive"
    },
    {
      "title": "Testing Gaps for UNCOMMON Tier",
      "detail": "No automated testing despite being classified as UNCOMMON tier. Adding Jest/Vitest test coverage would strengthen production readiness.",
      "type": "negative"
    },
    {
      "title": "Missing CI/CD Infrastructure",
      "detail": "No continuous integration pipelines detected. Automated builds and deployments would improve development workflow for this experience level.",
      "type": "negative"
    }
  ],

  "technical_signal": "The e-commerce-platform repo demonstrates production-ready patterns including JWT authentication, Stripe payment integration, and proper error handling middleware in Express.",

  "technical_signal_detailed": "Code analysis reveals a developer comfortable with modern full-stack patterns. The React components show understanding of hooks, context API for state management, and proper component composition. Backend code uses Express with well-organized route handlers and middleware, though error handling could be more comprehensive. Database queries use Sequelize ORM with proper associations defined.\\n\\nArchitectural choices are pragmatic - monorepo structure, clear separation between client and server, environment-based configuration. No over-engineering detected; solutions are appropriate for the project scale. The payment integration code shows attention to security with proper webhook validation and idempotency handling.\\n\\nAreas for growth include test coverage (currently absent), more sophisticated state management (currently using Context which may not scale), and database migration strategies. The code is readable and maintainable, suggesting they'd integrate well into an existing codebase. Overall technical approach is solid for a mid-level developer building production features.",

  "verified_skills": [
    {"name": "React", "level": "Intermediate", "evidence": "Used extensively in e-commerce-platform and admin-dashboard with hooks and context patterns"},
    {"name": "TypeScript", "level": "Intermediate", "evidence": "Consistent usage across 5 recent repos with proper type definitions"},
    {"name": "Node.js", "level": "Intermediate", "evidence": "Backend development in e-commerce-platform with Express and middleware"},
    {"name": "PostgreSQL", "level": "Intermediate", "evidence": "Database design and Sequelize ORM usage in recent projects"},
    {"name": "REST API Design", "level": "Intermediate", "evidence": "Well-structured API endpoints with proper HTTP methods and status codes"},
    {"name": "Python", "level": "Intermediate", "evidence": "Historical - automation scripts from 3-4 years ago, not current focus"},
    {"name": "Git", "level": "Intermediate", "evidence": "Clean commit history with descriptive messages across all repos"}
  ]
}

### Example 2: RARE Tier (ML Specialist)

{
  "label": "THE SPECIALIST",
  "rarity": "RARE",
  "rarity_badge": "⭐",
  "rarity_percentile": "Top 15%",
  "archetype_reason": "Classified as SPECIALIST due to deep expertise in machine learning and computer vision, demonstrated across 8 repositories with consistent focus. The object-detection-pipeline repo showcases advanced understanding of YOLOv8, custom training loops, and model optimization. Publications linked in profile and conference talk contributions indicate research-level depth in this domain.",

  "trajectory_summary": "Focused exclusively on ML/CV for the past 4 years with clear specialization progression. Started with Keras tutorials (historical), now implements custom PyTorch architectures and model serving infrastructure. Recent work shows shift toward production ML systems rather than pure research.",

  "recruiter_summary": "This candidate is a machine learning specialist with deep expertise in computer vision and model deployment. Recent repositories demonstrate ability to build end-to-end ML pipelines including data preprocessing, custom model training, and API serving with FastAPI. Their object-detection-pipeline and face-recognition-system repos show production-ready implementations with proper error handling and monitoring.\\n\\nCode quality is strong for ML work. Includes comprehensive Jupyter notebooks documenting experiments, pytest suites for data pipelines, and Docker containerization for reproducibility. However, lacks traditional CI/CD - model versioning and automated testing could be improved. Documentation is excellent with clear mathematical explanations and usage examples.\\n\\nBest fit for ML-focused teams or companies building AI products. Likely senior-level (5-7 years) based on architectural sophistication and domain depth. Would excel in roles requiring both research understanding and production deployment. May need support on large-scale distributed training and MLOps best practices.",

  "highlights": [
    {"title": "Deep ML Specialization", "detail": "Consistently works in CV/ML domain with custom PyTorch implementations and SOTA model adaptations. Shows genuine expertise beyond using pre-trained models.", "type": "positive"},
    {"title": "Production-Ready ML Systems", "detail": "object-detection-pipeline includes FastAPI serving, proper preprocessing pipelines, and monitoring hooks. Code is deployment-focused, not just notebooks.", "type": "positive"},
    {"title": "Strong Technical Communication", "detail": "Excellent README documentation with mathematical explanations, performance benchmarks, and clear usage examples. Conference talk experience evident.", "type": "positive"},
    {"title": "Limited MLOps Infrastructure", "detail": "No model versioning systems (MLflow/Weights&Biases) or automated retraining pipelines detected. This is expected for RARE tier production ML work.", "type": "negative"}
  ],

  "technical_signal": "The custom attention mechanism implementation in vision-transformer-experiments shows deep understanding of transformer architectures with proper gradient handling and memory optimization.",

  "technical_signal_detailed": "Code analysis reveals strong ML engineering fundamentals. PyTorch implementations follow best practices with proper device handling, gradient accumulation for large batches, and mixed-precision training. The custom loss functions in object-detection-pipeline show understanding of detection architectures beyond tutorial-level knowledge.\\n\\nData pipeline code is particularly impressive - uses PyTorch DataLoader efficiently with proper transforms, augmentation strategies, and handles edge cases like corrupted images. The preprocessing is vectorized and memory-efficient. API serving code uses async FastAPI patterns appropriately, though load testing setup is absent.\\n\\nAreas for growth include distributed training (currently single-GPU only), model compression techniques (quantization/pruning), and production monitoring beyond basic metrics. The code suggests someone who deeply understands ML theory and can implement it cleanly, but hasn't scaled to massive production systems yet. This aligns well with RARE tier specialization.",

  "verified_skills": [
    {"name": "PyTorch", "level": "Advanced", "evidence": "Custom architecture implementations with proper gradient handling across 6 repos"},
    {"name": "Computer Vision", "level": "Advanced", "evidence": "YOLO/transformer model adaptations with deep understanding of detection/segmentation"},
    {"name": "Python", "level": "Advanced", "evidence": "Clean, idiomatic code with proper async patterns and type hints"},
    {"name": "FastAPI", "level": "Intermediate", "evidence": "Model serving APIs with proper validation and error handling"},
    {"name": "Docker", "level": "Intermediate", "evidence": "Containerized ML applications with multi-stage builds"},
    {"name": "Keras/TensorFlow", "level": "Intermediate", "evidence": "Historical - early projects from 3-4 years ago, now uses PyTorch"}
  ]
}

### Example 3: COMMON Tier (Active Learner)

{
  "label": "THE GRINDER",
  "rarity": "COMMON",
  "rarity_badge": "●",
  "rarity_percentile": "Top 50%",
  "archetype_reason": "Classified as GRINDER based on exceptionally high commit activity (87 commits in last 90 days) across multiple learning projects. Profile shows someone actively building skills through consistent practice rather than deep specialization. The variety of tutorial-style repos (todo-app, weather-dashboard, blog-cms) demonstrates learning momentum and exploration of web development fundamentals.",

  "trajectory_summary": "Recent surge in activity over the past 6 months focusing on JavaScript and React ecosystem. Earlier GitHub history is sparse. Currently in rapid learning phase, completing courses and building practice projects. Trajectory suggests early-career developer building foundational portfolio.",

  "recruiter_summary": "This candidate is an early-career developer actively learning full-stack web development with JavaScript, React, and Node.js. Recent projects like todo-app and weather-dashboard demonstrate grasp of fundamental concepts including state management, API integration, and responsive design. The high commit frequency shows strong work ethic and dedication to skill building.\\n\\nCode quality reflects beginner-to-intermediate level. Projects are functional but lack production patterns like error boundaries, loading states, and edge case handling. No testing or CI/CD present. Code organization is basic with some prop-drilling and repeated logic. However, progression is visible - recent projects show cleaner component structure than earlier attempts.\\n\\nBest suited for junior developer roles with strong mentorship and learning opportunities. Likely 0-2 years experience based on project complexity. Would thrive in environments that value growth mindset and provide pair programming. The consistent activity pattern suggests coachability and genuine interest in the craft. Strong potential for rapid growth with proper guidance.",

  "highlights": [
    {"title": "Exceptional Learning Momentum", "detail": "87 commits in 90 days with steady contribution pattern. Shows dedication and active skill building through consistent practice.", "type": "positive"},
    {"title": "Full-Stack Foundations", "detail": "Can build complete CRUD applications with React frontend and Node/Express backend. Demonstrates understanding of full application lifecycle.", "type": "positive"},
    {"title": "Modern Stack Adoption", "detail": "Uses current technologies (React hooks, ES6+, async/await) rather than outdated patterns. Stays current with ecosystem.", "type": "positive"},
    {"title": "No Testing Practices", "detail": "Zero test files across all repositories. Understanding of testing fundamentals (Jest, React Testing Library) needs development for production readiness.", "type": "negative"},
    {"title": "Basic Code Organization", "detail": "Monolithic components with prop drilling and repeated logic. Needs to learn component composition patterns and state management libraries.", "type": "negative"}
  ],

  "technical_signal": "The weather-dashboard repo successfully integrates OpenWeather API with proper async handling and displays dynamic data, showing ability to work with external services.",

  "technical_signal_detailed": "Code reveals a developer in active learning mode with solid grasp of fundamentals but lacking production experience. React components use functional patterns and hooks correctly, though component size suggests unfamiliarity with composition. State management relies on useState/useContext - appropriate for learning projects but would struggle at scale.\\n\\nBackend code uses Express with basic CRUD operations and MongoDB. REST API design is functional but inconsistent (some routes don't follow REST conventions). No authentication beyond basic username/password, no rate limiting, minimal error handling. Database queries work but aren't optimized.\\n\\nPositive indicators include clean variable naming, consistent formatting, and git commit messages that show thought process. The progression from todo-app (3 months ago) to blog-cms (current) shows meaningful improvement in code structure. With mentorship on testing, error handling, and architectural patterns, this developer has strong potential to reach intermediate level within a year.",

  "verified_skills": [
    {"name": "React", "level": "Beginner", "evidence": "Functional components with hooks across 4 projects, but basic patterns only"},
    {"name": "JavaScript", "level": "Intermediate", "evidence": "Comfortable with ES6+ features, async/await, array methods"},
    {"name": "Node.js", "level": "Beginner", "evidence": "Basic Express servers with CRUD operations in todo-app and blog-cms"},
    {"name": "MongoDB", "level": "Beginner", "evidence": "Basic Mongoose models and queries, no complex aggregations"},
    {"name": "HTML/CSS", "level": "Intermediate", "evidence": "Responsive layouts with Flexbox/Grid, basic styling patterns"},
    {"name": "Git", "level": "Beginner", "evidence": "Regular commits but simple workflow, no branching or collaborative patterns"}
  ]
}

---

Return ONLY valid JSON for THIS candidate matching the structure and quality shown above:`;

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
                        content: `You are a senior technical recruiter assessing developers for hiring decisions.

Core principles:
- Evidence-based: Every claim cites specific repos, code patterns, or commit behavior
- Balanced: Include genuine strengths AND concerns (never all positive)
- Actionable: Recruiters know what to probe, managers know technical depth
- Time-aware: Recent work defines current skill, old work provides context only

Quality standards:
- Reference specific technologies and repository names
- Mark historical skills (5+ years old) as "Historical" explicitly
- Never mention internal scores or composite metrics
- Write for hiring managers, not social media`
                    },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3
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

        // Ensure archetype_reason uses accurate data AND maintains AI depth
        // We take the AI's reason and prepend our verified stats for accuracy
        const aiReason = (analysis.archetype_reason || '').trim();
        const statsPrefix = `Classified as ${archetype.replace(/^THE\s+/i, '')} because ${classificationReason.toLowerCase()}${totalStars > 0 ? ` with ${totalStars.toLocaleString()} total stars across ${repoCount} repositories` : ` across ${repoCount} repositories`}.`;

        // Combine stats prefix with AI reasoning for maximum depth
        // If AI reasoning starts with something generic like "Classified as", we strip it
        const cleanedAiReason = aiReason.replace(/^Classified as [^.]+ because [^.]+\./i, '').trim();

        if (cleanedAiReason && cleanedAiReason.length > 10) {
            analysis.archetype_reason = `${statsPrefix} ${cleanedAiReason}`;
        } else if (aiReason && aiReason.length > 10) {
            analysis.archetype_reason = `${statsPrefix} ${aiReason}`;
        } else {
            analysis.archetype_reason = statsPrefix;
        }

        // Ensure highlights have proper distribution
        const positives = (analysis.highlights || []).filter((h: any) => h.type === 'positive');
        const negatives = (analysis.highlights || []).filter((h: any) => h.type === 'negative');

        // If no negatives, add tier-specific ones based on gap analysis
        if (negatives.length === 0) {
            analysis.highlights = analysis.highlights || [];

            // Priority 1: Use tier-specific gap if identified
            if (tierSpecificGap) {
                const gapTitle = tierSpecificGap.includes('testing') ? `Testing Gaps for ${tier} Tier` :
                                tierSpecificGap.includes('CI/CD') ? `Missing CI/CD for ${tier} Level` :
                                tierSpecificGap.includes('documentation') ? `Documentation Below ${tier} Standards` :
                                tierSpecificGap.includes('specialization') ? 'Lacks Deep Specialization' :
                                tierSpecificGap.includes('activity') ? 'Declining Activity Trend' :
                                tierSpecificGap.includes('collaboration') ? 'Limited OSS Collaboration' :
                                `${tier} Tier Expectation Gap`;

                analysis.highlights.push({
                    title: gapTitle,
                    detail: `This developer ${tierSpecificGap}. This is a concern for their current classification level.`,
                    type: 'negative'
                });
            }
            // Priority 2: AI concerns if high and low quality
            else if (aiAssessment.level === 'concerning') {
                analysis.highlights.push({
                    title: 'AI Dependency Without Validation',
                    detail: `High AI-generated code patterns (${avgAILikelihood.toFixed(0)}%) without corresponding test coverage or code review evidence. Recommend hands-on coding assessment.`,
                    type: 'negative'
                });
            }
            // Priority 3: Generic gaps as last resort
            else if (!qualitySignals.hasTests) {
                analysis.highlights.push({
                    title: 'Testing Coverage Needed',
                    detail: 'No automated test suites detected across repositories. Adding tests would strengthen code reliability and maintainability.',
                    type: 'negative'
                });
            } else {
                analysis.highlights.push({
                    title: 'Growth Opportunity',
                    detail: 'While code quality is solid, expanding documentation and exploring new technical domains could accelerate career growth.',
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

        // Re-throw error to be handled by caller - no fallback mock data
        throw new Error(`Failed to generate AI assessment: ${error instanceof Error ? error.message : 'Unknown error'}`);
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