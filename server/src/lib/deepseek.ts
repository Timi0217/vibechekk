export const analyzeWithDeepSeek = async (apiKey: string, globalMetadata: any, codeSamples: string) => {
    const highestStars = globalMetadata.starDistribution.highest_single_repo;
    const totalStars = globalMetadata.starDistribution.total_stars;

    // PRE-CLASSIFICATION: Determine if tier/type should be locked
    let tierLock: string | null = null;
    let typeLock: string | null = null;
    let lockReason: string = '';

    if (highestStars >= 5000) {
        tierLock = 'LEGENDARY';
        const topRepo = globalMetadata.topRepos[0];
        if (topRepo?.educationalMeta?.isLikelyGuide || topRepo?.educationalMeta?.isEducational) {
            typeLock = 'THE TECHNICAL TITAN';
            lockReason = `${highestStars} stars + educational content detected`;
        } else {
            typeLock = 'THE FOUNDATION BUILDER';
            lockReason = `${highestStars} stars + production tool detected`;
        }
        console.log(`[Pre-Check] LEGENDARY locked: ${typeLock} (${lockReason})`);
    } else if (highestStars < 10 && totalStars < 10) {
        tierLock = 'COMMON';
        typeLock = 'THE BEGINNER STUDENT';
        lockReason = `Only ${totalStars} total stars`;
        console.log(`[Pre-Check] BEGINNER locked: ${typeLock} (${lockReason})`);
    }

    const qualityScore = globalMetadata.qualitySignals.reduce((score: number, q: any) => {
        if (!q) return score;
        return score
            + (q.hasTests ? 2 : 0)
            + (q.hasCI ? 2 : 0)
            + (q.hasTypeScript ? 1 : 0)
            + (q.hasLinting ? 1 : 0)
            + (q.complexity === 'high' ? 2 : q.complexity === 'medium' ? 1 : 0);
    }, 0);

    const prompt = `
${typeLock ? `🔒 CLASSIFICATION LOCKED: "${typeLock}" 🔒
Reason: ${lockReason}
You MUST return this exact label. No exceptions.

` : ''}Analyze this developer and return a JSON classification.

### AGGREGATE STATS:
- PEAK_PROJECT_STARS: ${highestStars} ${highestStars >= 5000 ? '⬅️ LEGENDARY THRESHOLD MET' : ''}
- TOTAL_STARS: ${totalStars}
- QUALITY_SCORE: ${qualityScore}/10
- EXTERNAL_CONTRIBS: ${globalMetadata.userStats?.externalContributions || 0}

### TOP REPOSITORIES:
${globalMetadata.topRepos.slice(0, 5).map((r: any, i: number) => `
${i + 1}. "${r.name}" 
   - Stars: ${r.stars}
   - Educational: ${r.educationalMeta?.isEducational ? 'YES' : 'NO'}
   - Likely Guide/Tutorial: ${r.educationalMeta?.isLikelyGuide ? 'YES' : 'NO'}
   - Maintainer: ${r.isMaintainer ? 'YES' : 'NO'}
`).join('')}

### MANDATORY CLASSIFICATION LOGIC:

TIER DETERMINATION (CHECK FIRST):
1. IF PEAK_PROJECT_STARS >= 5,000 → MUST be LEGENDARY tier
   - If top repo has educational keywords → THE TECHNICAL TITAN
   - If top repo is production tool → THE FOUNDATION BUILDER
   
2. IF PEAK_PROJECT_STARS >= 1,000 → MUST be RARE tier minimum

3. IF PEAK_PROJECT_STARS < 10 AND TOTAL_STARS < 10 → MUST be THE BEGINNER STUDENT

SPECIAL CASES:
- IF QUALITY_SCORE >= 7 AND PEAK_PROJECT_STARS < 100 → THE HIDDEN GEM

### AVAILABLE LABELS BY TIER:

LEGENDARY 🟡 (Top 5%):
- THE FOUNDATION BUILDER - Production libraries/tools with 5,000+ stars
- THE TECHNICAL TITAN - Educational content/tutorials with 5,000+ stars

RARE 🟣 (Top 15%):
- THE OPEN SOURCE CHAMPION - Maintainer of 1,000+ star projects
- THE SYSTEM ARCHITECT - Complex distributed systems (500-3,000 stars)
- THE DEEP SPECIALIST - Niche expertise (ML, compilers, crypto) 300-1,000 stars

UNCOMMON 🔵 (Top 30%):
- THE OPEN SOURCE CONTRIBUTOR - 100+ external contributions, 50-300 stars
- THE INDEPENDENT BUILDER - Multiple shipped products, 100-300 stars
- THE PRODUCT ENGINEER - User-facing features, 50-150 stars

COMMON ⚪ (Bottom 50%):
- THE HIDDEN GEM - <100 stars BUT quality score >= 7/10 (Tests, CI, TS)
- THE PRACTICAL BUILDER - Useful tools, 10-50 stars
- THE EXPERIMENTAL DEVELOPER - 6+ languages, <20 stars
- THE BEGINNER STUDENT - Learning phase, 0-10 stars total

---

Annual Timeline:
${JSON.stringify(globalMetadata.trajectory, null, 2)}

Code Samples:
${codeSamples}

${typeLock ? `
⚠️ CRITICAL OVERRIDE ⚠️
Based on star thresholds, you MUST return:
{
  "label": "${typeLock}",
  "rarity": "${tierLock}",
  "rarity_badge": "${tierLock === 'LEGENDARY' ? '🟡' : '⚪'}",
  ...
}
Do NOT deviate from this classification.
` : ''}

### OUTPUT STRUCTURE:
Return a JSON object:
{
  "label": "THE [LABEL NAME]",
  "rarity": "LEGENDARY" | "RARE" | "UNCOMMON" | "COMMON",
  "rarity_badge": "🟡" | "🟣" | "🔵" | "⚪",
  "rarity_percentile": "Top X%",
  "trajectory_summary": "1 sentence evolution summary.",
  "recruiter_summary": "3 detailed paragraphs analysis.",
  "highlights": [
    { "title": "...", "detail": "...", "type": "positive" | "negative" }
  ],
  "technical_signal": "Short technical proof.",
  "technical_signal_detailed": "Evidence-backed deep dive.",
  "verified_skills": ["Skill | Level | Evidence"]
}

### HIGHLIGHT RULES:
- Use "type": "negative" for: Low test coverage, high complexity warnings, lack of documentation, or stale repositories.
- Use "type": "positive" for: High quality signals, complex project ownership, and strong community impact.

Return JSON matching the structure exactly.
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
                        content: `You are a strict engineering classifier.

CRITICAL RULES:
1. Stars >= 5,000 on one repo = LEGENDARY tier (Technical Titan or Foundation Builder ONLY)
2. Stars < 10 total = THE BEGINNER STUDENT ONLY
3. Never use "Tutorial Follower" - that term doesn't exist
4. Educational content with 5,000+ stars = THE TECHNICAL TITAN (not beginner)

If the user message includes a LOCKED classification, you MUST return that exact label.`
                    },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1  // Lower temperature for more deterministic outputs
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
                // 1. Strip potential Markdown code blocks
                let cleaned = text.trim();
                if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                }

                // 2. Fix common trailing comma issues
                cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

                // Attempt parse
                return JSON.parse(cleaned);
            } catch (e) {
                // Last ditch effort: try to find the first '{' and last '}'
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
            // FAILSAFE: Return a basic template so the database operation doesn't crash
            analysis = {
                label: typeLock || 'THE PRACTICAL BUILDER',
                rarity: tierLock || 'COMMON',
                rarity_badge: tierLock === 'LEGENDARY' ? '🟡' : '⚪',
                trajectory_summary: 'Technical profile analysis exceeded token limits or contained invalid characters.',
                recruiter_summary: 'Unable to parse detailed AI summary.',
                highlights: []
            };
        }

        // ENSURE REQUIRED FIELDS EXIST (Safety against AI omission)
        analysis.label = analysis.label || (typeLock || 'THE PRACTICAL BUILDER');
        analysis.trajectory_summary = analysis.trajectory_summary || `Evolved through ${globalMetadata.topRepos.length} repositories with a focus on ${globalMetadata.userStats?.languages?.[0] || 'software engineering'}.`;
        analysis.recruiter_summary = analysis.recruiter_summary || analysis.trajectory_summary;
        analysis.highlights = analysis.highlights || [
            { title: "Technical Impact", detail: `Built projects with ${highestStars} peak stars.`, type: "positive" },
            { title: "Language Diversity", detail: `Proficient in ${globalMetadata.userStats?.languages?.slice(0, 3).join(', ') || 'multiple languages'}.`, type: "positive" }
        ];

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
