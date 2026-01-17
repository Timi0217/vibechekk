/**
 * Job Description Parser
 *
 * Extracts structured requirements from job descriptions using AI
 */

import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL } from '../constants/index.js';
import { log } from './logger.js';

export interface ParsedJD {
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minYearsExp: number | null;
  responsibilities: string[];
  rawData: {
    title: string;
    seniority: string; // "Junior" | "Mid" | "Senior" | "Staff" | "Principal"
    remote: boolean;
    location: string | null;
    salary: string | null;
  };
}

/**
 * Parse a job description to extract structured requirements
 */
export async function parseJobDescription(jdText: string, title: string, company?: string): Promise<ParsedJD> {
  try {
    log.info('[JD Parser] Parsing job description', { title, company });

    const prompt = `Analyze this job description and extract structured requirements.

JOB TITLE: ${title}
${company ? `COMPANY: ${company}` : ''}

JOB DESCRIPTION:
${jdText}

Extract and return a JSON object with these fields:
{
  "requiredSkills": ["skill1", "skill2", ...],  // Required technical skills/technologies
  "niceToHaveSkills": ["skill1", "skill2", ...],  // Nice-to-have/preferred skills
  "minYearsExp": 3,  // Minimum years of experience (number or null)
  "responsibilities": ["resp1", "resp2", ...],  // Key responsibilities (max 5)
  "rawData": {
    "title": "Software Engineer",  // Normalized title
    "seniority": "Mid",  // One of: Junior, Mid, Senior, Staff, Principal
    "remote": true,  // Whether remote work is mentioned
    "location": "San Francisco, CA",  // Location or null
    "salary": "$120k-$180k"  // Salary range or null
  }
}

IMPORTANT:
- Extract ALL technical skills mentioned (programming languages, frameworks, tools, platforms)
- Distinguish between required and nice-to-have based on keywords like "required", "must have" vs "preferred", "nice to have"
- For seniority, infer from title and years of experience
- Return ONLY valid JSON, no markdown or explanation
- If information is not found, use null or empty array`;

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
            content: 'You are an expert recruiter and job description analyst. Extract structured data from job descriptions accurately.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 2000
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

    // Parse the JSON response (remove markdown code blocks if present)
    let jsonText = aiResponse.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsed: ParsedJD = JSON.parse(jsonText);

    log.info('[JD Parser] Successfully parsed JD', {
      title,
      requiredSkills: parsed.requiredSkills.length,
      niceToHaveSkills: parsed.niceToHaveSkills.length,
      seniority: parsed.rawData.seniority
    });

    return parsed;
  } catch (error) {
    log.error('[JD Parser] Failed to parse job description', error, { title, company });
    throw new Error('Failed to parse job description');
  }
}

/**
 * Quick validation of JD text before parsing
 */
export function validateJDText(jdText: string): { valid: boolean; error?: string } {
  if (!jdText || jdText.trim().length === 0) {
    return { valid: false, error: 'Job description cannot be empty' };
  }

  if (jdText.length < 50) {
    return { valid: false, error: 'Job description is too short (minimum 50 characters)' };
  }

  if (jdText.length > 20000) {
    return { valid: false, error: 'Job description is too long (maximum 20,000 characters)' };
  }

  return { valid: true };
}
