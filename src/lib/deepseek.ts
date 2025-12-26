export const analyzeWithDeepSeek = async (apiKey: string, metadata: any, codeSamples: string) => {
  const prompt = `
    Analyze this developer's GitHub activity from the last 12 months to determine their "Engineering Trajectory" and "Archetype".

    Metadata Summary:
    ${JSON.stringify(metadata, null, 2)}

    Raw Code Samples/Diffs:
    ${codeSamples}

    Evaluate based on:
    1. Trajectory over Totals: Is there growth in complexity (e.g., from HTML/CSS to State Management/Architecture)?
    2. Engineering Rigor: 
       - Atomic commits vs massive dumps.
       - Professional naming and documentation.
       - Self-refactoring (ownership).
    3. The "Vibe": Does the code feel curated (human) or dumped (AI-ghost)?
    4. Engineering Taste: Style, naming, documentation, and use of patterns in raw code.

    Return ONLY a JSON object with:
    {
      "archetype": "S" | "A" | "B" | "C" | "F",
      "label": "The Architect" | "The Independent Builder" | "The Safe Junior" | "The Tutorial Follower" | "The Ghost",
      "trajectory_summary": "1-sentence summary of growth",
      "merit_points": ["point 1", "point 2", "point 3"],
      "confidence": 0-100
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
          { role: 'system', content: 'You are a senior engineering recruiter specializing in behavioral GitHub analysis. Return only JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('DeepSeek analysis failed:', error);
    throw error;
  }
};
