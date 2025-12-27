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

    // **NEW**: Calculate skill depth from repo metadata and code
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

        // File count and commits also signal skill level
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

    // PRE-CLASSIFICATION with skill-aware logic
    let tierLock: string | null = null;
    let typeLock: string | null = null;
    let lockReason: string = '';

    // **LEGENDARY TIER**: 5K+ stars
    if (highestStars >= 5000) {
        tierLock = 'LEGENDARY';

        if (topRepo?.educationalMeta?.isLikelyGuide || topRepo?.educationalMeta?.isEducational) {
            typeLock = 'THE PROFESSOR';
            lockReason = `${highestStars} stars on educational content`;
        } else {
            typeLock = 'THE ARCHITECT';
            lockReason = `${highestStars} stars on production infrastructure`;
        }

        if (qualityScore < 4) {
            lockReason += ` ⚠️ Low quality score (${qualityScore}/10)`;
        }

        console.log(`[Pre-Check] LEGENDARY locked: ${typeLock} (${lockReason})`);
    }
    // **RARE TIER**: High skill complexity OR 1K+ stars
    else if (highestStars >= 1000 || skillComplexityScore.totalComplexity >= 15) {
        tierLock = 'RARE';
        if (highestStars >= 1000) {
            typeLock = 'THE MAINTAINER';
            lockReason = `${highestStars} stars with maintainer status`;
        } else {
            typeLock = 'THE SPECIALIST';
            lockReason = `High skill complexity (${skillComplexityScore.totalComplexity}) in advanced domains`;
        }
        console.log(`[Pre-Check] RARE locked: ${typeLock} (${lockReason})`);
    }
    // **UNCOMMON TIER**: Moderate skills + some stars
    else if (skillComplexityScore.totalComplexity >= 8 || highestStars >= 100) {
        tierLock = 'UNCOMMON';

        if (globalMetadata.userStats?.externalContributions >= 100) {
            typeLock = 'THE CONTRIBUTOR';
            lockReason = `${globalMetadata.userStats.externalContributions} external contributions`;
        } else if (qualityScore >= 6) {
            typeLock = 'THE CRAFTSPERSON';
            lockReason = `High code quality (${qualityScore}/10)`;
        } else {
            typeLock = 'THE BUILDER';
            lockReason = `${highestStars} stars with production experience`;
        }
        console.log(`[Pre-Check] UNCOMMON locked: ${typeLock} (${lockReason})`);
    }
    // **COMMON TIER**: Skill-based differentiation
    else {
        tierLock = 'COMMON';

        // THE HIDDEN GEM: Great quality, low visibility
        if (qualityScore >= 8 && highestStars < 100) {
            typeLock = 'THE HIDDEN GEM';
            lockReason = `Elite quality score (${qualityScore}/10) but only ${highestStars} stars`;
        }
        // THE TINKERER: Moderate complexity, practical work
        else if (skillComplexityScore.totalComplexity >= 5 || (highestStars >= 10 && highestStars < 50)) {
            typeLock = 'THE TINKERER';
            lockReason = `Practical projects with complexity score ${skillComplexityScore.totalComplexity}`;
        }
        // THE EXPLORER: Breadth over depth
        else if (globalMetadata.userStats?.languages?.length >= 6 && skillComplexityScore.totalComplexity >= 3) {
            typeLock = 'THE EXPLORER';
            lockReason = `${globalMetadata.userStats.languages.length} languages explored`;
        }
        // THE APPRENTICE: Actual beginners only
        else if (skillComplexityScore.beginner > skillComplexityScore.intermediate && skillComplexityScore.totalComplexity < 3) {
            typeLock = 'THE APPRENTICE';
            lockReason = `Early stage: ${skillComplexityScore.beginner} tutorial projects, ${totalStars} total stars`;
        }
        // DEFAULT: THE TINKERER for anyone with real code
        else {
            typeLock = 'THE TINKERER';
            lockReason = `${totalStars} stars across ${globalMetadata.topRepos.length} projects`;
        }

        console.log(`[Pre-Check] COMMON tier: ${typeLock} (${lockReason})`);
    }

    const prompt = `
${typeLock ? `🔒 CLASSIFICATION LOCKED: "${typeLock}" 🔒
Reason: ${lockReason}
You MUST return this exact label. No exceptions.

` : ''}Analyze this developer and return a JSON classification using our PERSONA system.

### AGGREGATE STATS:
- PEAK_PROJECT_STARS: ${highestStars} ${highestStars >= 5000 ? '⬅️ LEGENDARY THRESHOLD MET' : ''}
- TOTAL_STARS: ${totalStars}
- QUALITY_SCORE: ${qualityScore}/10
- SKILL_COMPLEXITY: ${skillComplexityScore.totalComplexity} (Advanced: ${skillComplexityScore.advanced}, Intermediate: ${skillComplexityScore.intermediate}, Beginner: ${skillComplexityScore.beginner})
- EXTERNAL_CONTRIBS: ${globalMetadata.userStats?.externalContributions || 0}
- MAINTAINER_OF_1K_PLUS: ${globalMetadata.topRepos.filter((r: any) => r.stars >= 1000 && r.isMaintainer).length > 0 ? 'YES' : 'NO'}

### TOP REPOSITORIES:
${globalMetadata.topRepos.slice(0, 5).map((r: any, i: number) => {
        const quality = globalMetadata.qualitySignals[i];
        return `
${i + 1}. "${r.name}" 
   - Stars: ${r.stars}
   - Commits: ${r.totalCommits}
   - Files: ${quality?.fileCount || 'N/A'}
   - Educational: ${r.educationalMeta?.isEducational ? 'YES' : 'NO'}
   - Likely Guide/Curated: ${r.educationalMeta?.isLikelyGuide ? 'YES' : 'NO'}
   - Stars/Commit Ratio: ${r.educationalMeta?.starsPerCommit?.toFixed(1) || 'N/A'} ${r.educationalMeta?.starsPerCommit > 50 ? '⬅️ CURATED CONTENT SIGNAL' : ''}
   - Maintainer: ${r.isMaintainer ? 'YES' : 'NO'}
   - Quality: Tests=${quality?.hasTests}, CI=${quality?.hasCI}, Docs=${quality?.hasDocs}
   - README Preview: ${quality?.readmePreview?.substring(0, 150) || 'N/A'}
`;
    }).join('')}

### TRAJECTORY EVOLUTION:
${globalMetadata.trajectoryNarrative || 'No historical data available'}

### MANDATORY CLASSIFICATION LOGIC:

**TIER 1: LEGENDARY 🟡 (Top 5%)**
- THE ARCHITECT - Built infrastructure used by thousands (5K+ stars, production tools/libraries)
- THE PROFESSOR - Created educational content that defined how people learn (5K+ stars, tutorials/guides/courses)

**TIER 2: RARE 🟣 (Top 15%)**
- THE MAINTAINER - Keeps critical OSS alive (1K+ stars, consistent maintenance)
- THE SPECIALIST - Deep expertise in niche domains (15+ complexity score: ML/compilers/crypto/systems)
- THE SYSTEMS THINKER - Distributed systems, databases, performance-critical code (500-3K stars)

**TIER 3: UNCOMMON 🔵 (Top 30%)**
- THE BUILDER - Ships products people use (100-500 stars, production features)
- THE CONTRIBUTOR - 100+ meaningful PRs to external projects (50-300 stars on own work)
- THE CRAFTSPERSON - High-quality code with tests/CI (8+ complexity score, quality >= 6)

**TIER 4: COMMON ⚪ (Bottom 50%)**
- THE HIDDEN GEM - Elite code quality but low visibility (<100 stars, quality >= 8)
- THE TINKERER - Practical projects (5-15 complexity score, intermediate skills detected)
- THE EXPLORER - Breadth over depth (6+ languages, 3+ complexity score)
- THE APPRENTICE - Building foundations (beginner signals > intermediate signals, <3 complexity score)

### CRITICAL CLASSIFICATION RULES:
1. NEVER classify someone as "THE APPRENTICE" if they have:
   - Intermediate/advanced skills detected (complexity >= 5)
   - Projects with 30+ files
   - 20+ commits on average
   - Skills like "Serverless", "Database Integration", "Systems Programming"
   
2. "THE APPRENTICE" is ONLY for developers with:
   - Tutorial/learning/practice repos dominating
   - Low file counts (<20 files per project)
   - Few commits (<10 per project)
   - No intermediate skills detected
   
3. If unsure between TINKERER and APPRENTICE → default to TINKERER

4. If EXTERNAL_CONTRIBS >= 100 → Consider THE CONTRIBUTOR

### Code Samples (Top 5 Repos, 3 Commits Each):
${codeSamples}

### DETAILED FORENSIC ANALYSIS REQUIRED:
Using the code samples above, you MUST identify:
1. **Architectural patterns** - Are they using clean architecture? Microservices? Monoliths?
2. **Code quality signals** - Error handling? Type safety? Null checks?
3. **Testing approach** - Unit tests? Integration tests? E2E? Or none?
4. **Performance considerations** - Are they optimizing? Using caching? Database indexing?
5. **Security practices** - Input validation? Auth patterns? SQL injection prevention?

Use SPECIFIC EXAMPLES from the code diffs to back up your claims.
${typeLock ? `⚠️ CRITICAL OVERRIDE ⚠️
Based on pre-classification logic, you MUST return:
{
  "label": "${typeLock}",
  "rarity": "${tierLock}",
  "rarity_badge": "${tierLock === 'LEGENDARY' ? '🟡' : tierLock === 'RARE' ? '🟣' : tierLock === 'UNCOMMON' ? '🔵' : '⚪'}",
  ...
}
Do NOT deviate from this classification.
` : ''}

### OUTPUT STRUCTURE:
Return a JSON object with this exact structure:
{
  "label": "THE [PERSONA NAME]",
  "rarity": "LEGENDARY" | "RARE" | "UNCOMMON" | "COMMON",
  "rarity_badge": "🟡" | "🟣" | "🔵" | "⚪",
  "rarity_percentile": "Top X%",
  "trajectory_summary": "1-2 sentence evolution summary from early work to current focus.",
  "recruiter_summary": "3 detailed paragraphs: (1) Technical strengths & impact, (2) Code quality & practices, (3) Collaboration & community engagement.",
  "highlights": [
    { "title": "...", "detail": "...", "type": "positive" | "negative" }
  ],
  "technical_signal": "One sentence proof of technical depth.",
  "technical_signal_detailed": "2-3 paragraphs diving into architectural decisions, code patterns, or technical challenges solved.",
  "verified_skills": [
    { "name": "Skill Name", "level": "Beginner|Intermediate|Advanced|Expert", "evidence": "Concrete example from repos" }
  ]
}

### HIGHLIGHT REQUIREMENTS (CRITICAL):
- **MANDATORY COUNT**: Return exactly 4-5 highlights total
- **REQUIRED MIX**: 
  - 3 items with "type": "positive" (Green in UI)
  - 1-2 items with "type": "negative" (Orange in UI)
- **Forensic Mindset**: You MUST identify real technical debt:
  - Missing test coverage
  - No CI/CD automation
  - Stale dependencies
  - Lack of documentation
  - High code complexity without comments
  - Manual deployment processes
- **NO GENERIC FLUFF**: Each highlight needs specific evidence from repos

Return ONLY valid JSON matching this structure.
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
                        content: `You are a strict engineering classifier using a PERSONA-based categorization system.

CRITICAL RULES:
1. Stars >= 5,000 on one repo = LEGENDARY tier (Professor or Architect ONLY)
2. Skill complexity >= 15 OR stars >= 1,000 = RARE tier minimum
3. Skill complexity >= 8 OR stars >= 100 = UNCOMMON tier
4. Quality score >= 8 with <100 stars = THE HIDDEN GEM
5. "THE APPRENTICE" is ONLY for actual beginners:
   - Beginner signals > intermediate signals
   - Complexity score < 3
   - Tutorial/practice projects dominating
6. DEFAULT to THE TINKERER for anyone with real intermediate skills (complexity >= 5)

Educational content (guides, tutorials, curated lists) with 5K+ stars = THE PROFESSOR
Production infrastructure (libraries, tools, frameworks) with 5K+ stars = THE ARCHITECT

If the user message includes a LOCKED classification, return that exact label with no deviation.

Be forensic in finding technical debt. Every developer has weaknesses - find them and include as negative highlights.
`
                    },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1
            })
        });

        const data: any = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error('DeepSeek API returned no choices');
        }

        const rawContent = data.choices[0].message?.content || '{}';

        // --- ROBUST JSON CLEANING ---
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
            // FAILSAFE: Return a basic template
            analysis = {
                label: typeLock || 'THE TINKERER',
                rarity: tierLock || 'COMMON',
                rarity_badge: tierLock === 'LEGENDARY' ? '🟡' : tierLock === 'RARE' ? '🟣' : tierLock === 'UNCOMMON' ? '🔵' : '⚪',
                trajectory_summary: 'Technical profile analysis exceeded token limits or contained invalid characters.',
                recruiter_summary: 'Unable to parse detailed AI summary due to response format error.',
                highlights: []
            };
        }

        // ENSURE REQUIRED FIELDS EXIST
        analysis.label = analysis.label || (typeLock || 'THE TINKERER');
        analysis.rarity = analysis.rarity || (tierLock || 'COMMON');
        analysis.rarity_badge = analysis.rarity_badge || '⚪';
        analysis.trajectory_summary = analysis.trajectory_summary || `Evolved through ${globalMetadata.topRepos.length} repositories with a focus on ${globalMetadata.userStats?.languages?.[0] || 'software engineering'}.`;
        analysis.recruiter_summary = analysis.recruiter_summary || analysis.trajectory_summary;

        // **POST-PROCESS HIGHLIGHTS**: Enforce distribution
        const highlights = analysis.highlights || [];
        let positives = highlights.filter((h: any) => h.type === 'positive');
        let negatives = highlights.filter((h: any) => h.type === 'negative');

        // Enforce 3 positives, 1-2 negatives
        if (positives.length > 3) positives = positives.slice(0, 3);
        if (positives.length < 3) {
            // Add generic positives if needed
            while (positives.length < 3) {
                positives.push({
                    title: "Technical Range",
                    detail: `Works across ${globalMetadata.userStats?.languages?.slice(0, 3).join(', ') || 'multiple languages'}.`,
                    type: "positive"
                });
            }
        }

        if (negatives.length === 0) {
            // FORCE at least one negative
            negatives.push({
                title: "Documentation Gaps",
                detail: "Limited README content or missing contributor guidelines in public repositories.",
                type: "negative"
            });
        }
        if (negatives.length > 2) negatives = negatives.slice(0, 2);

        analysis.highlights = [...positives, ...negatives];

        // POST-VALIDATION: Override if DeepSeek violated constraints
        if (typeLock && analysis.label !== typeLock) {
            console.warn(`[Override] DeepSeek returned "${analysis.label}", forcing to "${typeLock}"`);
            analysis.label = typeLock;
            analysis.rarity = tierLock;
            analysis.rarity_badge = tierLock === 'LEGENDARY' ? '🟡' : tierLock === 'RARE' ? '🟣' : tierLock === 'UNCOMMON' ? '🔵' : '⚪';
            analysis.rarity_percentile = tierLock === 'LEGENDARY' ? 'Top 5%' : tierLock === 'RARE' ? 'Top 15%' : tierLock === 'UNCOMMON' ? 'Top 30%' : 'Bottom 50%';
        }

        return analysis;
    } catch (error) {
        console.error('[DeepSeek] Analysis error:', error);
        throw error;
    }
};
