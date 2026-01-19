/**
 * FitScore Calculator
 *
 * Compares candidates against job requirements to generate a FitScore and recommendation
 */

import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL } from '../constants/index.js';
import { log } from './logger.js';
import type { ParsedJD } from './jdParser.js';

export interface CandidateData {
  githubHandle: string;
  name?: string | null;
  email?: string | null;

  // From VibeReport
  archetype: string;
  tier: string;
  trajectorySummary: string;
  meritPoints: any[];

  // From LinkedIn/Apollo enrichment
  currentTitle?: string | null;
  currentCompany?: string | null;
  seniority?: string | null;
  location?: string | null;

  // Resume data (if provided)
  resumeText?: string | null;
}

export interface FitScoreResult {
  fitScore: number; // 0-100
  recommendation: 'SEND' | 'SKIP';

  skillsMatch: {
    matched: string[];
    missing: string[];
    extra: string[];
  };

  experienceMatch: {
    candidateLevel: string;
    requiredLevel: string;
    meets: boolean;
  };

  strengthsForRole: string[];
  concernsForRole: string[];
  aiSummary: string;
}

/**
 * Calculate FitScore by comparing candidate against job requirements
 */
export async function calculateFitScore(
  candidate: CandidateData,
  parsedJD: ParsedJD
): Promise<FitScoreResult> {
  try {
    log.info('[FitScore] Calculating fit', {
      candidate: candidate.githubHandle,
      jdSkills: parsedJD.requiredSkills.length
    });

    const prompt = `You are an expert technical recruiter. Analyze this candidate against the job requirements and determine if they are a good fit.

CANDIDATE PROFILE:
- GitHub: @${candidate.githubHandle}
- Name: ${candidate.name || 'Unknown'}
- Current Role: ${candidate.currentTitle || 'Unknown'} at ${candidate.currentCompany || 'Unknown'}
- Seniority: ${candidate.seniority || 'Unknown'}
- Location: ${candidate.location || 'Unknown'}
- Archetype: ${candidate.archetype} (${candidate.tier})
- Career Summary: ${candidate.trajectorySummary}

KEY ACHIEVEMENTS:
${candidate.meritPoints.slice(0, 5).map((mp: any, i: number) => `${i + 1}. ${mp.title}: ${mp.detail}`).join('\n')}

${candidate.resumeText ? `\nRESUME:\n${candidate.resumeText.slice(0, 2000)}` : ''}

JOB REQUIREMENTS:
- Required Skills: ${parsedJD.requiredSkills.join(', ')}
- Nice-to-Have Skills: ${parsedJD.niceToHaveSkills.join(', ')}
- Min Experience: ${parsedJD.minYearsExp ? `${parsedJD.minYearsExp} years` : 'Not specified'}
- Seniority: ${parsedJD.rawData.seniority}
- Responsibilities: ${parsedJD.responsibilities.join(' | ')}

Analyze the fit and return a JSON object:
{
  "fitScore": 75,  // 0-100 score based on overall match
  "recommendation": "SEND",  // "SEND" (>= 70 score) or "SKIP" (< 70 score)

  "skillsMatch": {
    "matched": ["React", "Node.js"],  // Skills candidate has that job requires
    "missing": ["PostgreSQL"],  // Required skills candidate lacks
    "extra": ["Python", "AWS"]  // Valuable extra skills candidate brings
  },

  "experienceMatch": {
    "candidateLevel": "Mid",  // Inferred from trajectory & current role
    "requiredLevel": "Senior",  // From JD
    "meets": false  // Whether candidate meets experience requirement
  },

  "strengthsForRole": [
    "Strong React experience from building...",
    "Proven ability to lead projects...",
    "Active open source contributor..."
  ],  // 3-5 specific reasons they'd excel in this role

  "concernsForRole": [
    "Missing required PostgreSQL experience",
    "May be overqualified based on current Senior role"
  ],  // 1-3 potential concerns or gaps

  "aiSummary": "Strong fit. Candidate has 80% of required skills with impressive React and Node.js experience. Missing PostgreSQL but has similar database experience. GitHub activity shows consistent quality work. Recommend moving forward with interview."
}

SCORING RUBRIC:
- 90-100: Perfect fit, immediate hire candidate
- 80-89: Strong fit, definitely interview
- 70-79: Good fit, worth interviewing
- 60-69: Moderate fit, consider if pipeline thin
- 50-59: Weak fit, likely pass
- 0-49: Poor fit, definite pass

CRITICAL SCORING GUIDELINES:
- Use the FULL 0-100 scale with precision - every point matters
- Avoid clustering scores around round numbers (40, 50, 60, 70, etc.)
- Be granular: differentiate between 73 vs 75 vs 77 based on specific strengths/gaps
- Use the entire range within each rubric band (e.g., in 70-79 range, use 71, 73, 76, 78, not just 72)
- Two similar candidates should still have different scores based on subtle differences
- Avoid patterns - don't default to scores ending in 2 or 5
- Consider: If this candidate is slightly better/worse than another at 65, score them at 68 or 63, not 65 again

IMPORTANT:
- Be realistic about skill matches (check GitHub history for proof)
- Consider archetype and trajectory for culture/team fit
- Weight required skills more than nice-to-haves
- Flag if candidate seems under/over-qualified
- Every candidate is unique - reflect that in precise scoring
- Return ONLY valid JSON, no markdown`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical recruiter who evaluates candidate fit objectively based on data. Use precise, granular scoring - avoid round numbers and common patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from DeepSeek API');
    }

    // Parse the JSON response
    let jsonText = aiResponse.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const result: FitScoreResult = JSON.parse(jsonText);

    log.info('[FitScore] Calculated fit successfully', {
      candidate: candidate.githubHandle,
      score: result.fitScore,
      recommendation: result.recommendation
    });

    return result;
  } catch (error) {
    log.error('[FitScore] Failed to calculate fit', error, {
      candidate: candidate.githubHandle
    });
    throw new Error('Failed to calculate FitScore');
  }
}
