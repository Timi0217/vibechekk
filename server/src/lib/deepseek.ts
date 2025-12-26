export const analyzeWithDeepSeek = async (apiKey: string, globalMetadata: any, codeSamples: string) => {
    const prompt = `
    Analyze this developer's GitHub activity across all their top public repositories to determine their "Engineering Trajectory" and "Archetype".
    
    You are looking for a holistic view of the developer's taste, rigor, and growth.

    Global Metadata (Top 5 Repos):
    ${JSON.stringify(globalMetadata, null, 2)}

    Raw Code Samples/Diffs (Top 3 Repos):
    ${codeSamples}

    Evaluate based on:
    1. Scope of Impact: Do they contribute to diverse projects?
    2. Consistency: Is their rigor consistent across different repos?
    3. Trajectory: Is there evidence of learning or level-up across projects?
    4. Code Taste: Are there recurring patterns of high-quality engineering?

    Return ONLY a JSON object with:
    {
      "archetype": "S" | "A" | "B" | "C" | "F",
      "label": "The Architect" | "The Independent Builder" | "The Safe Junior" | "The Tutorial Follower" | "The Ghost",
      "trajectory_summary": "1-sentence summary of overall engineering growth across all projects",
      "recruiter_summary": "2-3 paragraphs of deep, professional analysis of their technical trajectory, ownership, and engineering taste. Written for hiring managers and technical recruiters to understand the candidate's unique value.",
      "highlights": [
        { "type": "positive", "title": "Short title", "detail": "1-2 sentence detailed evidence or explanation" },
        { "type": "positive", "title": "Short title", "detail": "1-2 sentence detailed evidence or explanation" },
        { "type": "negative", "title": "Short title", "detail": "1-2 sentence detailed evidence or concern" }
      ],
      "confidence": 0-100
    }
    
    IMPORTANT: Include 2-3 positive highlights AND 1-2 red flags/concerns. Be honest about weaknesses.
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
