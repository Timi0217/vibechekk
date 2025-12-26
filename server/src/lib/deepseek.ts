export const analyzeWithDeepSeek = async (apiKey: string, globalMetadata: any, codeSamples: string) => {
    const prompt = `
    Analyze this developer's GitHub activity across all their top public repositories to determine their "Engineering Label" based on originality, rigor, and business value.
    
    You are evaluating a REAL ENGINEER for a REAL HIRING MANAGER. Focus on:
    1. **Iterative Struggle**: Look for commits that fix their own bugs or refactor logic they wrote weeks ago. If a project appears perfectly formed in 2 commits, flag it as "Low Evidence of Original Logic."
    2. **Originality over Perfection**: Forks and tutorial clones without significant original modifications should be labeled "Draft" regardless of code quality.
    3. **Business Value**: Translate technical skills into team impact. Instead of just "mastery of O(n) complexity," explain "writes maintainable code that other team members can easily understand and extend."

    Global Metadata (Top 5 Repos):
    ${JSON.stringify(globalMetadata, null, 2)}

    Raw Code Samples/Diffs (Top 3 Repos):
    ${codeSamples}

    ### CRITICAL INSTRUCTION
    If the repository looks like a 'fork' or a 'tutorial clone' without original modifications, 
    you MUST categorize as 'Draft' regardless of how clean the code is. 
    We value Originality and Rigor over 'Perfect Result.'

    Return ONLY a JSON object with:
    {
      "label": "The Architect" | "The System Builder" | "The Product Engineer" | "The Full-Stack Specialist" | "The Independent Builder" | "The Rapid Prototyper" | "The Safe Junior" | "The Tutorial Follower" | "The Copycat" | "Draft",
      "trajectory_summary": "1-sentence summary of overall engineering growth and originality across all projects",
      "recruiter_summary": "2-3 paragraphs of deep, professional analysis. AVOID pure CS jargon. Translate technical skills into business value and team impact. Example: Instead of 'demonstrates mastery of O(n) complexity,' say 'writes efficient algorithms that scale well and are easy for team members to maintain.' Focus on what makes this developer valuable to a hiring manager.",
      "technical_signal": "Specific, concrete evidence of technical skill. Examples: 'Uses custom middleware for auth in project X', 'Migrated from JavaScript to TypeScript in Month 4 of project Y', 'Implemented real-time WebSocket handling with error recovery in project Z'. Be SPECIFIC with project names and technical choices.",
      "highlights": [
        { "type": "positive", "title": "Short title", "detail": "1-2 sentence detailed evidence with specific examples from their code" },
        { "type": "positive", "title": "Short title", "detail": "1-2 sentence detailed evidence with specific examples from their code" },
        { "type": "negative", "title": "Short title", "detail": "1-2 sentence concern with specific evidence (e.g., 'Project X appears to be a tutorial clone with minimal original logic')" }
      ]
    }
    
    IMPORTANT: 
    - Include 2-3 positive highlights AND 1-2 red flags/concerns. Be honest about weaknesses.
    - The "technical_signal" field is MANDATORY and must contain specific, verifiable evidence.
    - Avoid generic statements. Recruiters need "receipts" to show Hiring Managers.
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
                    { role: 'system', content: 'You are a senior engineering recruiter specializing in behavioral GitHub analysis. Return only JSON.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            })
        });

        const data: any = await response.json();
        console.log('[DeepSeek] Raw Response Data:', JSON.stringify(data, null, 2));

        if (!data.choices || data.choices.length === 0) {
            console.error('DeepSeek returned no choices or error:', data);
            const errorMsg = data.error?.message || 'AI analysis failed to generate a response';
            throw new Error(errorMsg);
        }

        const content = data.choices[0].message?.content;
        if (!content) {
            console.error('[DeepSeek] Response content is empty. Full message:', JSON.stringify(data.choices[0].message, null, 2));
            throw new Error('AI response content is empty');
        }

        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error('[DeepSeek] Failed to parse JSON from content:', content);
            // Try to extract JSON if it's wrapped in markdown
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } catch (innerError) {
                    throw new Error('Failed to parse AI response into valid JSON format');
                }
            }
            throw new Error('AI response was not in a valid JSON format');
        }
    } catch (error) {
        console.error('DeepSeek analysis failed:', error);
        throw error;
    }
};
