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

` : ''}You are analyzing a developer's GitHub profile. Use the internal metrics below ONLY for classification. DO NOT expose raw numbers in your output.

### INTERNAL METRICS (for classification only - DO NOT include these numbers in output):
- Impact: ${impactScore.toFixed(0)}/1000
- Quality: ${qualityScore}/10
- Complexity: ${skillComplexityScore.totalComplexity}
- Stars: ${totalStars}
- Recent Activity: ${last90DaysCommits} commits in 90 days
- Account Age: ${accountAgeYears.toFixed(1)} years
- AI Likelihood: ${avgAILikelihood.toFixed(0)}%
- Has Tests/CI: ${qualityScore >= 7 ? 'Yes' : 'No'}

### TOP REPOSITORIES:
${globalMetadata.topRepos.slice(0, 5).map((r: any, i: number) => {
        const quality = globalMetadata.qualitySignals[i];
        return `${i + 1}. "${r.name}" - ${r.stars} stars, ${r.language || 'Unknown'} ${quality?.hasTests ? '✓ Tests' : ''} ${quality?.hasCI ? '✓ CI' : ''}`;
    }).join('\n')}

### 15-ARCHETYPE SYSTEM:
**🌟🌟🌟 HYPER RARE** - THE 10X ENGINEER (industry-defining impact)
**🌟🌟 ULTRA RARE** - THE ARCHITECT (infrastructure builders), THE PROFESSOR (educators)
**⭐ RARE** - THE SPECIALIST (deep expertise), THE SYSTEMS THINKER (distributed systems)
**◆ UNCOMMON** - THE MAINTAINER, THE BUILDER, THE CONTRIBUTOR, THE CRAFTSPERSON, THE HIDDEN GEM
**● COMMON** - THE TINKERER, THE GRINDER, THE HOBBYIST, THE EXPLORER, THE APPRENTICE

### AI TOOL USAGE CONTEXT:
${avgAILikelihood > 70 ? `⚠️ HIGH AI PATTERNS DETECTED - Many code samples show AI-generated characteristics (verbose comments, boilerplate patterns). ${qualityScore >= 7 ? 'However, quality gates (tests/CI) are present.' : 'No testing infrastructure to validate AI code.'}` : avgAILikelihood > 30 ? `✓ MODERATE AI USAGE - Developer uses AI tools pragmatically alongside manual coding. ${qualityScore >= 7 ? 'Quality validation present.' : ''}` : '✓ NATURAL CODING STYLE - Minimal AI-generated patterns detected.'}

### Code Samples:
${codeSamples}

### OUTPUT REQUIREMENTS:

**CRITICAL RULES FOR ALL TEXT FIELDS:**
1. NEVER mention internal scores (complexity, quality, impact numbers)
2. NEVER say "X/10" or "X%" or "score of Y"
3. Describe abilities in plain English: "strong testing practices" not "quality score 8"
4. Reference specific repos/technologies as evidence
5. Write for a technical recruiter who doesn't know our scoring system

**trajectory_summary**: 1-2 sentences describing their evolution as a developer. Reference actual technologies and projects.

**recruiter_summary**: 3 paragraphs:
- Paragraph 1: Technical strengths and areas of expertise. What can they build?
- Paragraph 2: Code quality observations and development practices. ${avgAILikelihood > 70 ? 'Note: Address AI tool usage concerns if applicable - recommend hands-on coding assessment.' : avgAILikelihood > 30 && qualityScore >= 7 ? 'Note: They use AI tools effectively with proper validation.' : ''}
- Paragraph 3: Collaboration signals and team fit indicators.

**highlights**: 4-5 items with concrete evidence from their repos:
- At least 3 positive highlights (specific achievements, technologies, patterns)
- At least 1 negative highlight (gaps, missing practices, concerns)
- ${avgAILikelihood > 70 && qualityScore < 7 ? 'MUST include a negative highlight about unvalidated AI-generated code patterns' : ''}
- NEVER use raw numbers. Say "lacks comprehensive testing" not "0/10 test coverage"

**technical_signal**: One sentence proving technical depth with a specific example.

**technical_signal_detailed**: 2-3 paragraphs analyzing their code architecture, patterns, and problem-solving approach based on the code samples.

**verified_skills**: List skills with evidence from their repos. Levels: Beginner, Intermediate, Advanced, Expert.

Return ONLY this JSON structure:
{
  "label": "THE [ARCHETYPE NAME]",
  "rarity": "HYPER RARE" | "ULTRA RARE" | "RARE" | "UNCOMMON" | "COMMON",
  "rarity_badge": "🌟🌟🌟" | "🌟🌟" | "⭐" | "◆" | "●",
  "rarity_percentile": "Top 1%" | "Top 5%" | "Top 15%" | "Top 30%" | "Top 50%",
  "trajectory_summary": "...",
  "recruiter_summary": "...",
  "highlights": [{"title": "...", "detail": "...", "type": "positive"|"negative"}],
  "technical_signal": "...",
  "technical_signal_detailed": "...",
  "verified_skills": [{"name": "...", "level": "...", "evidence": "..."}]
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
                        content: `You are a senior technical recruiter writing developer assessments. 

CLASSIFICATION: Use the locked archetype from the user message. The 15 archetypes range from HYPER RARE (industry legends) to COMMON (emerging developers).

WRITING STYLE:
- Write for technical recruiters, not data scientists
- NEVER mention internal scores, percentages, or metrics
- Describe skills naturally: "strong backend expertise" not "complexity score 15"
- Reference specific technologies, repos, and code patterns as evidence
- Be specific and concrete, avoid generic statements

REQUIRED OUTPUTS:
- trajectory_summary: Their developer journey in 1-2 sentences
- recruiter_summary: 3 paragraphs (strengths, practices, team fit)
- highlights: 4-5 items with evidence (at least 1 negative)
- technical_signal: One proof of technical depth
- verified_skills: Skills with concrete evidence

Find real gaps: missing tests, no CI, stale dependencies, AI-heavy code without validation, etc.`
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
