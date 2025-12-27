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

    const last90DaysCommits = globalMetadata.userStats?.last90DaysCommits || 0;
    const accountCreatedAt = globalMetadata.userStats?.createdAt;
    const accountAgeYears = accountCreatedAt
        ? (Date.now() - new Date(accountCreatedAt).getTime()) / (365 * 24 * 60 * 60 * 1000)
        : 0;

    // AI Usage Analysis
    const avgAILikelihood = globalMetadata.avgAILikelihood || 0;

    // AI modifier: penalize high AI without quality, reward moderate AI with quality
    let aiModifier = 0;
    if (avgAILikelihood > 80 && qualityScore < 5) {
        aiModifier = -50; // High AI without validation
    } else if (avgAILikelihood > 50 && qualityScore >= 7) {
        aiModifier = 0; // High AI with quality = neutral (already in quality score)
    } else if (avgAILikelihood > 20 && avgAILikelihood <= 50 && qualityScore >= 6) {
        aiModifier = +10; // Moderate AI with decent quality = modern dev
    }

    // impactScore formula with AI awareness
    let impactScore = (
        (totalStars * 0.3) +
        (skillComplexityScore.totalComplexity * 10) +
        (qualityScore * 15) +
        (totalCommits * 0.1) +
        (externalContribs * 2) +
        (isMaintainer ? 100 : 0) +
        aiModifier
    );
    impactScore = Math.min(Math.max(impactScore, 0), 1000);

    console.log(`[Impact Score] Total: ${impactScore.toFixed(1)}, AI Likelihood: ${avgAILikelihood.toFixed(1)}%, AI Modifier: ${aiModifier}`);

    let tierLock: string | null = null;
    let typeLock: string | null = null;
    let lockReason: string = '';

    // TIER 1: HYPER RARE 🌟🌟🌟
    if (impactScore >= 700 || highestStars >= 10000 || (skillComplexityScore.totalComplexity >= 25 && qualityScore >= 8)) {
        tierLock = 'HYPER RARE';
        typeLock = 'THE 10X ENGINEER';
        lockReason = `Elite impact score (${impactScore.toFixed(0)}) or massive project footprint`;
    }
    // TIER 2: ULTRA RARE 🌟🌟
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
    // TIER 3: RARE ⭐
    else if (impactScore >= 300 || skillComplexityScore.totalComplexity >= 12) {
        tierLock = 'RARE';
        const allText = [
            ...globalMetadata.topRepos.map((r: any) => `${r.name} ${r.description || ''}`),
            codeSamples
        ].join(' ').toLowerCase();

        const criticalSystems = ['distributed', 'kubernetes', 'microservices', 'scaling', 'concurrency'];
        const systemsCount = criticalSystems.filter(s => allText.includes(s)).length;

        const specialistDomains = ['machine learning', 'ml', 'compiler', 'cryptography', 'blockchain'];
        const specialistCount = specialistDomains.filter(s => allText.includes(s)).length;

        if (systemsCount >= 2 || (allText.includes('distributed') && skillComplexityScore.totalComplexity >= 12)) {
            typeLock = 'THE SYSTEMS THINKER';
            lockReason = `Systems architecture focus: ${systemsCount} distributed signals`;
        } else if (specialistCount >= 1 || skillComplexityScore.totalComplexity >= 15) {
            typeLock = 'THE SPECIALIST';
            lockReason = `Deep domain expertise (complexity ${skillComplexityScore.totalComplexity})`;
        } else {
            typeLock = 'THE SYSTEMS THINKER';
            lockReason = `Advanced engineering (impact ${impactScore.toFixed(0)})`;
        }
    }
    // TIER 4: UNCOMMON ◆
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
    // TIER 5: COMMON ●
    else {
        tierLock = 'COMMON';
        const languages = globalMetadata.userStats?.languages || [];

        if (skillComplexityScore.totalComplexity >= 5 && skillComplexityScore.totalComplexity <= 10) {
            typeLock = 'THE TINKERER';
            lockReason = `Practical dev solving real problems`;
        } else if (skillComplexityScore.totalComplexity >= 3 && skillComplexityScore.totalComplexity < 5) {
            if (last90DaysCommits >= 40 || globalMetadata.topRepos.length >= 3) {
                typeLock = 'THE GRINDER';
                lockReason = `High velocity: ${last90DaysCommits} commits in 90 days`;
            } else if (accountAgeYears >= 1 && last90DaysCommits < 30) {
                typeLock = 'THE HOBBYIST';
                lockReason = `Sustained ${accountAgeYears.toFixed(1)}-year passion coder`;
            } else {
                typeLock = 'THE GRINDER';
                lockReason = `Emerging skills, moderate activity`;
            }
        } else if (languages.length >= 6 && skillComplexityScore.totalComplexity >= 3) {
            typeLock = 'THE EXPLORER';
            lockReason = `Polyglot explorer of ${languages.length} stacks`;
        } else if (skillComplexityScore.totalComplexity < 3 && last90DaysCommits < 40) {
            typeLock = 'THE APPRENTICE';
            lockReason = `Building fundamental technical foundations`;
        } else {
            typeLock = 'THE TINKERER';
            lockReason = `Generalist intermediate developer`;
        }
    }

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

### AI CODE USAGE ANALYSIS:
- AI_LIKELIHOOD: ${avgAILikelihood.toFixed(1)}% (0-20: Natural, 20-50: Moderate, 50-80: Heavy, 80-100: AI-dependent)
- QUALITY_VALIDATION: ${qualityScore >= 7 ? 'VALIDATED (tests/CI present)' : 'UNVALIDATED'}
${globalMetadata.aiCodeAnalysis?.slice(0, 3).map((a: any) => `
Repo "${a.repo}":
  - Explicit AI markers: ${a.signals.explicitMarkers}
  - AI in commits: ${a.signals.commitAIReferences}
  - Comment density: ${(a.signals.commentDensity * 100).toFixed(0)}%
  - AI likelihood: ${a.signals.aiLikelihoodScore}%
`).join('') || ''}

### AI USAGE INTERPRETATION FOR HIGHLIGHTS:

**POSITIVE SIGNAL (use when applicable):**
- AI 20-60% + Quality ≥7 → "Effective AI Tool Usage"
  Title: "Modern Development Workflow"
  Detail: "Leverages AI coding assistants effectively with ${qualityScore}/10 quality score. Tests and CI validate AI-generated code."
  Type: positive

**NEGATIVE SIGNAL (use when applicable):**
- AI >70% + Quality <5 → "Heavy AI Reliance Without Validation"
  Title: "AI Code Without Quality Gates"
  Detail: "${avgAILikelihood.toFixed(0)}% AI-generated patterns with limited testing/CI validation."
  Type: negative

- AI >80% + No tests/CI → "Unvalidated AI Scaffolding"
  Title: "Copy-Paste AI Development"
  Detail: "Extensive AI boilerplate without code review or testing evidence."
  Type: negative

**RECRUITER_SUMMARY AI CONTEXT:**
- If AI 20-60% + Quality ≥7: Mention in paragraph 2 as "pragmatic use of modern AI tools with proper validation"
- If AI >70% + Quality <5: Flag in paragraph 2 as "recommend assessing hands-on coding ability during interview"

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
- THE SPECIALIST: Complexity ≥15 OR niche domain (ML, crypto, compilers)
- THE SYSTEMS THINKER: Complexity ≥12 + 2+ distributed keywords

**◆ UNCOMMON (Top 30%)**
- THE MAINTAINER: Maintainer + 100+ stars
- THE BUILDER: 100-500 stars, shipping
- THE CONTRIBUTOR: 100+ external contribs
- THE CRAFTSPERSON: Quality ≥7 + Complexity ≥7
- THE HIDDEN GEM: Quality ≥8 + Complexity ≥8 + Stars <100

**● COMMON (50%)**
- THE TINKERER: Complexity 5-10
- THE GRINDER: Complexity 3-5, 40+ commits/90d OR 3+ repos
- THE HOBBYIST: Complexity 4-7, <30 commits/90d, 1yr+ account
- THE EXPLORER: 6+ languages + Complexity 3-7
- THE APPRENTICE: Complexity <3

### Code Samples:
${codeSamples}

Return ONLY JSON:
{
  "label": "THE [NAME]",
  "rarity": "HYPER RARE" | "ULTRA RARE" | "RARE" | "UNCOMMON" | "COMMON",
  "rarity_badge": "🌟🌟🌟" | "🌟🌟" | "⭐" | "◆" | "●",
  "rarity_percentile": "Top X%",
  "impact_score": ${impactScore.toFixed(0)},
  "ai_usage": {
    "likelihood": ${avgAILikelihood.toFixed(1)},
    "interpretation": "${avgAILikelihood < 20 ? 'low' : avgAILikelihood < 50 ? 'moderate' : avgAILikelihood < 80 ? 'high' : 'very_high'}",
    "quality_validated": ${qualityScore >= 7},
    "badge": "${avgAILikelihood > 80 ? 'AI-HEAVY' : avgAILikelihood > 50 ? 'AI-ASSISTED' : avgAILikelihood > 20 ? 'AI-ENHANCED' : 'NATURAL'}",
    "badge_color": "${avgAILikelihood > 70 && qualityScore < 5 ? 'orange' : avgAILikelihood > 20 && qualityScore >= 7 ? 'blue' : 'green'}"
  },
  "trajectory_summary": "1-2 sentence evolution",
  "recruiter_summary": "3 paragraphs: (1) strengths, (2) quality + AI usage context, (3) collaboration",
  "highlights": [{"title": "...", "detail": "...", "type": "positive"|"negative"}],
  "technical_signal": "One sentence proof",
  "technical_signal_detailed": "2-3 paragraphs deep dive",
  "verified_skills": [{"name": "...", "level": "Beginner|Intermediate|Advanced|Expert", "evidence": "..."}]
}

CRITICAL: Include at least 1 negative highlight. If AI >50%, address it in highlights and recruiter_summary.
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
                        content: `Strict 15-Archetype Engineer Classifier with AI awareness.

CORE RULES:
1. Impact 700+ = THE 10X ENGINEER
2. Complexity 15+ OR 2+ systems keywords = THE SPECIALIST or THE SYSTEMS THINKER
3. Quality 8+ + Complexity 8+ + Stars<100 = THE HIDDEN GEM
4. Complexity 5-10 = THE TINKERER
5. Complexity 3-5 + 40+ commits/90d = THE GRINDER
6. Complexity 4-7 + <30 commits/90d + 1yr+ = THE HOBBYIST
7. Complexity <3 = THE APPRENTICE

AI USAGE RULES:
- AI 20-60% + Quality ≥7 = POSITIVE highlight ("Modern Development Workflow")
- AI >70% + Quality <5 = NEGATIVE highlight ("AI Code Without Quality Gates")
- AI >80% + No tests = NEGATIVE highlight ("Unvalidated AI Scaffolding")
- ALWAYS mention AI in recruiter_summary paragraph 2 if likelihood >50%

Forensic analysis: Find at least one negative highlight (technical debt, missing tests, AI without validation, etc).`
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
                trajectory_summary: 'Technical profile analysis exceeded token limits.',
                recruiter_summary: 'Unable to parse detailed AI summary.',
                highlights: [],
                ai_usage: {
                    likelihood: avgAILikelihood,
                    interpretation: avgAILikelihood < 20 ? 'low' : avgAILikelihood < 50 ? 'moderate' : 'high',
                    quality_validated: qualityScore >= 7,
                    badge: avgAILikelihood > 50 ? 'AI-ASSISTED' : 'NATURAL',
                    badge_color: 'blue'
                }
            };
        }

        // Ensure AI usage is present
        if (!analysis.ai_usage) {
            analysis.ai_usage = {
                likelihood: avgAILikelihood,
                interpretation: avgAILikelihood < 20 ? 'low' : avgAILikelihood < 50 ? 'moderate' : avgAILikelihood < 80 ? 'high' : 'very_high',
                quality_validated: qualityScore >= 7,
                badge: avgAILikelihood > 80 ? 'AI-HEAVY' : avgAILikelihood > 50 ? 'AI-ASSISTED' : avgAILikelihood > 20 ? 'AI-ENHANCED' : 'NATURAL',
                badge_color: avgAILikelihood > 70 && qualityScore < 5 ? 'orange' : avgAILikelihood > 20 && qualityScore >= 7 ? 'blue' : 'green'
            };
        }

        // Post-validation
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
