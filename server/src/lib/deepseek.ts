export const analyzeWithDeepSeek = async (apiKey: string, globalMetadata: any, codeSamples: string) => {
    const highestStars = globalMetadata.starDistribution.highest_single_repo;
    const totalStars = globalMetadata.starDistribution.total_stars;
    const topRepo = globalMetadata.topRepos[0];

    // Quality score calculation
    const qualityScore = globalMetadata.qualitySignals.reduce((score: number, q: any) => {
        if (!q) return score;

        const hasReadme = q.readmePreview && q.readmePreview !== 'No README found';
        const readmeIsSubstantial = hasReadme && q.readmePreview.length > 200;

        return score
            + (q.hasTests ? 2 : 0)
            + (q.hasCI ? 2 : 0)
            + (q.hasTypeScript ? 1 : 0)
            + (q.hasLinting ? 1 : 0)
            + (readmeIsSubstantial ? 1 : 0)
            + (q.complexity === 'high' ? 2 : q.complexity === 'medium' ? 1 : 0);
    }, 0);

    // Calculate skill depth from repo metadata and code
    const skillComplexityScore = (() => {
        const allText = [
            ...globalMetadata.topRepos.map((r: any) => `${r.name} ${r.description || ''}`),
            codeSamples
        ].join(' ').toLowerCase();

        const advancedSignals = [
            'distributed', 'microservices', 'kubernetes', 'docker', 'serverless',
            'machine learning', 'ml', 'compiler', 'optimization', 'concurrency',
            'websocket', 'graphql', 'postgresql', 'redis', 'system design',
            'security', 'cryptography', 'parsing', 'interpreter', 'blockchain',
            'performance', 'caching', 'indexing', 'algorithms', 'data structures',
            'systems programming', 'c programming', 'rust', 'kernel', 'assembly'
        ];

        const intermediateSignals = [
            'api', 'rest', 'authentication', 'auth', 'jwt', 'deployment', 'testing',
            'state management', 'responsive', 'full-stack', 'backend', 'frontend',
            'database', 'sql', 'nosql', 'react', 'vue', 'angular', 'node',
            'express', 'flask', 'django', 'spring', 'typescript'
        ];

        const beginnerSignals = [
            'tutorial', 'learning', 'practice', 'clone', 'sample',
            'exercise', 'homework', 'bootcamp', 'beginner', 'intro',
            'hello world', 'getting started', 'basic'
        ];

        const advancedCount = advancedSignals.filter(s => allText.includes(s)).length;
        const intermediateCount = intermediateSignals.filter(s => allText.includes(s)).length;
        const beginnerCount = beginnerSignals.filter(s => allText.includes(s)).length;

        const avgFileCount = globalMetadata.qualitySignals.reduce((sum: number, q: any) =>
            sum + (q?.fileCount || 0), 0) / Math.max(globalMetadata.qualitySignals.length, 1);

        const avgCommits = globalMetadata.topRepos.reduce((sum: number, r: any) =>
            sum + (r.totalCommits || 0), 0) / Math.max(globalMetadata.topRepos.length, 1);

        const projectComplexity = avgFileCount > 100 ? 2 : avgFileCount > 30 ? 1 : 0;
        const commitDepth = avgCommits > 50 ? 2 : avgCommits > 20 ? 1 : 0;

        return {
            advanced: advancedCount,
            intermediate: intermediateCount,
            beginner: beginnerCount,
            totalComplexity: (advancedCount * 3) + (intermediateCount * 2) - (beginnerCount * 1) + projectComplexity + commitDepth
        };
    })();

    console.log(`[Skill Analysis] Advanced: ${skillComplexityScore.advanced}, Intermediate: ${skillComplexityScore.intermediate}, Beginner: ${skillComplexityScore.beginner}, Total: ${skillComplexityScore.totalComplexity}`);

    // PRE-CLASSIFICATION with Impact Score Logic
    const totalCommits = globalMetadata.topRepos.reduce((sum: number, r: any) => sum + (r.totalCommits || 0), 0);
    const externalContribs = globalMetadata.userStats?.externalContributions || 0;
    const isMaintainer = globalMetadata.topRepos.some((r: any) => r.isMaintainer && r.stars >= 100);

    // FIX 1: Use actual recent activity data
    const last90DaysCommits = globalMetadata.userStats?.last90DaysCommits || 0;
    const accountCreatedAt = globalMetadata.userStats?.createdAt;
    const accountAgeYears = accountCreatedAt
        ? (Date.now() - new Date(accountCreatedAt).getTime()) / (365 * 24 * 60 * 60 * 1000)
        : 0;

    // impactScore formula: stars=30%, complexity=33x, quality=50x
    let impactScore = (
        (totalStars * 0.3) +                   // 1. Visibility (30%)
        (skillComplexityScore.totalComplexity * 10) + // 2. Skill signals (33x weight)
        (qualityScore * 15) +                  // 3. Code quality (50x weight)
        (totalCommits * 0.1) +                 // 4. Sustained effort
        (externalContribs * 2) +               // 5. Ecosystem contrib
        (isMaintainer ? 100 : 0)               // 6. Maintainer bonus
    );
    impactScore = Math.min(impactScore, 1000);

    console.log(`[Impact Score] Total: ${impactScore.toFixed(1)}, Complexity: ${skillComplexityScore.totalComplexity}, Quality: ${qualityScore}, Last90Days: ${last90DaysCommits}`);

    let tierLock: string | null = null;
    let typeLock: string | null = null;
    let lockReason: string = '';

    // TIER 1: HYPER RARE 🌟🌟🌟 (Top 1%)
    if (impactScore >= 700 || highestStars >= 10000 || (skillComplexityScore.totalComplexity >= 25 && qualityScore >= 8)) {
        tierLock = 'HYPER RARE';
        typeLock = 'THE 10X ENGINEER';
        lockReason = `Elite impact score (${impactScore.toFixed(0)}) or massive project footprint`;
    }
    // TIER 2: ULTRA RARE 🌟🌟 (Top 5%)
    else if (impactScore >= 500 || highestStars >= 5000) {
        tierLock = 'ULTRA RARE';
        const isEdu = topRepo?.educationalMeta?.isLikelyGuide || topRepo?.educationalMeta?.isEducational;
        if (isEdu) {
            typeLock = 'THE PROFESSOR';
            lockReason = `High-impact educational authority (${highestStars} stars)`;
        } else {
            typeLock = 'THE ARCHITECT';
            lockReason = `Infrastructure/Tooling architect with high impact`;
        }
    }
    // TIER 3: RARE ⭐ (Top 15%) - FIX 3: Better SYSTEMS THINKER vs SPECIALIST
    else if (impactScore >= 300 || skillComplexityScore.totalComplexity >= 12) {
        tierLock = 'RARE';
        const allText = [
            ...globalMetadata.topRepos.map((r: any) => `${r.name} ${r.description || ''}`),
            codeSamples
        ].join(' ').toLowerCase();

        // Critical systems keywords require multiple matches
        const criticalSystems = ['distributed', 'kubernetes', 'microservices', 'scaling', 'concurrency'];
        const systemsCount = criticalSystems.filter(s => allText.includes(s)).length;

        // Advanced keywords for specialist domains
        const specialistDomains = ['machine learning', 'ml', 'compiler', 'cryptography', 'blockchain'];
        const specialistCount = specialistDomains.filter(s => allText.includes(s)).length;

        // SYSTEMS THINKER: Multiple systems signals OR complexity 12+ with distributed focus
        if (systemsCount >= 2 || (allText.includes('distributed') && skillComplexityScore.totalComplexity >= 12)) {
            typeLock = 'THE SYSTEMS THINKER';
            lockReason = `Systems architecture focus: ${systemsCount} distributed signals`;
        }
        // SPECIALIST: Niche domain OR very high complexity
        else if (specialistCount >= 1 || skillComplexityScore.totalComplexity >= 15) {
            typeLock = 'THE SPECIALIST';
            lockReason = `Deep domain expertise (complexity ${skillComplexityScore.totalComplexity})`;
        }
        // Fallback for RARE tier
        else {
            typeLock = 'THE SYSTEMS THINKER';
            lockReason = `Advanced engineering (impact ${impactScore.toFixed(0)})`;
        }
    }
    // TIER 4: UNCOMMON ◆ (Top 30%)
    else if (impactScore >= 150) {
        tierLock = 'UNCOMMON';
        if (qualityScore >= 8 && skillComplexityScore.totalComplexity >= 8 && highestStars < 100) {
            typeLock = 'THE HIDDEN GEM';
            lockReason = `High skill/quality (${qualityScore}/10) with low social visibility`;
        } else if (isMaintainer) {
            typeLock = 'THE MAINTAINER';
            lockReason = `Maintainer of production repositories`;
        } else if (externalContribs >= 100) {
            typeLock = 'THE CONTRIBUTOR';
            lockReason = `Broad impact via external contributions`;
        } else if (qualityScore >= 7) {
            typeLock = 'THE CRAFTSPERSON';
            lockReason = `Superior code quality and maintainability`;
        } else {
            typeLock = 'THE BUILDER';
            lockReason = `Consistently shipping functional products`;
        }
    }
    // TIER 5: COMMON ● (Bottom 50%) - FIX 2: Accurate HOBBYIST detection
    else {
        tierLock = 'COMMON';
        const languages = globalMetadata.userStats?.languages || [];

        if (skillComplexityScore.totalComplexity >= 5 && skillComplexityScore.totalComplexity <= 10) {
            typeLock = 'THE TINKERER';
            lockReason = `Practical dev solving real problems (complexity ${skillComplexityScore.totalComplexity})`;
        }
        else if (skillComplexityScore.totalComplexity >= 3 && skillComplexityScore.totalComplexity < 5) {
            // THE GRINDER: High velocity
            if (last90DaysCommits >= 40 || globalMetadata.topRepos.length >= 3) {
                typeLock = 'THE GRINDER';
                lockReason = `High velocity: ${last90DaysCommits} commits in 90 days`;
            }
            // THE HOBBYIST: Low velocity but sustained
            else if (accountAgeYears >= 1 && last90DaysCommits < 30) {
                typeLock = 'THE HOBBYIST';
                lockReason = `Sustained ${accountAgeYears.toFixed(1)}-year passion coder with low velocity`;
            }
            else {
                typeLock = 'THE GRINDER';
                lockReason = `Emerging skills, moderate activity`;
            }
        }
        else if (languages.length >= 6 && skillComplexityScore.totalComplexity >= 3) {
            typeLock = 'THE EXPLORER';
            lockReason = `Polyglot explorer of ${languages.length} stacks`;
        }
        else if (skillComplexityScore.totalComplexity < 3 && last90DaysCommits < 40) {
            typeLock = 'THE APPRENTICE';
            lockReason = `Building fundamental technical foundations`;
        }
        else {
            typeLock = 'THE TINKERER';
            lockReason = `Generalist intermediate developer`;
        }
    }

    // FIX 4: Precise DeepSeek prompt with exact thresholds
    const prompt = `
${typeLock ? `🔒 CLASSIFICATION LOCKED: "${typeLock}" 🔒
Reason: ${lockReason}
You MUST return this exact label and rarity_badge. No exceptions.

` : ''}Analyze this developer using the 15-ARCHETYPE system with EXACT classification rules.

### AGGREGATE STATS:
- IMPACT_SCORE: ${impactScore.toFixed(0)} / 1000
- QUALITY_SCORE: ${qualityScore}/10
- SKILL_COMPLEXITY: ${skillComplexityScore.totalComplexity} (Adv: ${skillComplexityScore.advanced}, Int: ${skillComplexityScore.intermediate}, Beg: ${skillComplexityScore.beginner})
- TOTAL_STARS: ${totalStars}
- LAST_90_DAYS_COMMITS: ${last90DaysCommits}
- ACCOUNT_AGE: ${accountAgeYears.toFixed(1)} years
- EXTERNAL_CONTRIBS: ${externalContribs}

### TOP REPOSITORIES:
${globalMetadata.topRepos.slice(0, 5).map((r: any, i: number) => {
        const quality = globalMetadata.qualitySignals[i];
        return `
${i + 1}. "${r.name}" 
   - Stars: ${r.stars}
   - Quality: Tests=${quality?.hasTests}, CI=${quality?.hasCI}, Complexity=${quality?.complexity}
`;
    }).join('')}

### EXACT CLASSIFICATION RULES:

**🌟🌟🌟 HYPER RARE (Top 1%)**
- THE 10X ENGINEER: Impact ≥700 OR Stars ≥10K OR (Complexity ≥25 + Quality ≥8)

**🌟🌟 ULTRA RARE (Top 5%)**
- THE ARCHITECT: Impact 500-699, production tools
- THE PROFESSOR: Impact 500-699, educational content

**⭐ RARE (Top 15%)**
- THE SPECIALIST: Complexity ≥15 OR niche domain expertise (ML, crypto, compilers)
- THE SYSTEMS THINKER: Complexity ≥12 + 2+ distributed systems keywords

**◆ UNCOMMON (Top 30%)**
- THE MAINTAINER: Maintainer status + 100+ stars
- THE BUILDER: 100-500 stars, shipping products
- THE CONTRIBUTOR: 100+ external contributions
- THE CRAFTSPERSON: Quality ≥7 + Complexity ≥7
- THE HIDDEN GEM: Quality ≥8 + Complexity ≥8 + Stars <100

**● COMMON (50%)**
- THE TINKERER: Complexity 5-10, Impact 50-149
- THE GRINDER: Complexity 3-5, 40+ commits/90d OR 3+ active repos, Impact 40-149
- THE HOBBYIST: Complexity 4-7, <30 commits/90d, account age ≥1 year, Impact 50-149
- THE EXPLORER: 6+ languages + Complexity 3-7, Impact 30-149
- THE APPRENTICE: Complexity <3, Impact <50

### Code Samples:
${codeSamples}

Return ONLY JSON:
{
  "label": "THE [NAME]",
  "rarity": "HYPER RARE" | "ULTRA RARE" | "RARE" | "UNCOMMON" | "COMMON",
  "rarity_badge": "🌟🌟🌟" | "🌟🌟" | "⭐" | "◆" | "●",
  "rarity_percentile": "Top X%",
  "impact_score": ${impactScore.toFixed(0)},
  "trajectory_summary": "1-2 sentence evolution",
  "recruiter_summary": "3 paragraphs: strengths, quality, collaboration",
  "highlights": [{"title": "...", "detail": "...", "type": "positive"|"negative"}],
  "technical_signal": "One sentence proof",
  "technical_signal_detailed": "2-3 paragraphs deep dive",
  "verified_skills": [{"name": "...", "level": "Beginner|Intermediate|Advanced|Expert", "evidence": "..."}]
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
                    {
                        role: 'system',
                        content: `Strict 15-Archetype Engineer Classifier with exact thresholds.
Rules:
1. Impact Score 700+ = THE 10X ENGINEER (HYPER RARE)
2. Impact 500-699 = THE ARCHITECT or THE PROFESSOR (ULTRA RARE)
3. Complexity 15+ OR 2+ systems keywords = THE SYSTEMS THINKER or THE SPECIALIST (RARE)
4. Quality 8+ + Complexity 8+ + Stars<100 = THE HIDDEN GEM (UNCOMMON)
5. Complexity 5-10 = THE TINKERER (COMMON)
6. Complexity 3-5 + 40+ commits/90d = THE GRINDER (COMMON)
7. Complexity 4-7 + <30 commits/90d + account 1yr+ = THE HOBBYIST (COMMON)
8. Complexity <3 = THE APPRENTICE (COMMON)

Forensic debt analysis: Always include at least one negative highlight.`
                    },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1
            })
        });

        const data: any = await response.json();
        const rawContent = data.choices[0].message?.content || '{}';

        const cleanJsonResponse = (text: string) => {
            try {
                let cleaned = text.trim();
                if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                }
                cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
                return JSON.parse(cleaned);
            } catch (e) {
                try {
                    const firstBrace = text.indexOf('{');
                    const lastBrace = text.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
                    }
                } catch (e2) { }
                throw e;
            }
        };

        let analysis;
        try {
            analysis = cleanJsonResponse(rawContent);
        } catch (error) {
            console.error('[DeepSeek] Fatal JSON Error:', error);
            analysis = {
                label: typeLock || 'THE TINKERER',
                rarity: tierLock || 'COMMON',
                rarity_badge: tierLock === 'HYPER RARE' ? '🌟🌟🌟' : tierLock === 'ULTRA RARE' ? '🌟🌟' : tierLock === 'RARE' ? '⭐' : tierLock === 'UNCOMMON' ? '◆' : '●',
                trajectory_summary: 'Technical profile analysis exceeded token limits or contained invalid characters.',
                recruiter_summary: 'Unable to parse detailed AI summary due to response format error.',
                highlights: []
            };
        }

        // Post-validation: Override if DeepSeek violated constraints
        if (typeLock && analysis.label !== typeLock) {
            console.warn(`[Override] DeepSeek returned "${analysis.label}", forcing to "${typeLock}"`);
            analysis.label = typeLock;
            analysis.rarity = tierLock;
            analysis.rarity_badge = tierLock === 'HYPER RARE' ? '🌟🌟🌟' : tierLock === 'ULTRA RARE' ? '🌟🌟' : tierLock === 'RARE' ? '⭐' : tierLock === 'UNCOMMON' ? '◆' : '●';
            analysis.rarity_percentile = tierLock === 'HYPER RARE' ? 'Top 1%' : tierLock === 'ULTRA RARE' ? 'Top 5%' : tierLock === 'RARE' ? 'Top 15%' : tierLock === 'UNCOMMON' ? 'Top 30%' : 'Bottom 50%';
        }

        return analysis;
    } catch (error) {
        console.error('[DeepSeek] Analysis error:', error);
        throw error;
    }
};
