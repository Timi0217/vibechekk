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

        const analysis = JSON.parse(data.choices[0].message?.content || '{}');

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
