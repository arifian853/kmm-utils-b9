import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AiAdjudication {
  zoomName: string;
  bestMatch: string | null;
  confidence: number;
  reason?: string;
  matchType?: "exact" | "nickname" | "spelling" | "order-variant" | "token-trim" | "ai-inferred";
}

/**
 * Use Gemini to adjudicate between top candidates
 */
export async function adjudicateWithGemini(
  apiKey: string,
  zoomName: string,
  candidates: string[]
): Promise<AiAdjudication> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  });
  
  const prompt = `
You are an expert at matching Indonesian names. Given a Zoom participant name and candidate mentee names, select the best match.

Zoom name: "${zoomName}"
Candidates: ${JSON.stringify(candidates)}

STRICT MATCHING RULES:
1. Names must have substantial overlap, not just common words like "Dwi", "Muhammad", "Putri"
2. At least 60% of the name components must match or be variations
3. Consider full name structure, not just individual words
4. Ignore program suffixes: "_Web", "_AI", "Web Development", "(nickname)"
5. Handle Indonesian name variations: "Muhammad/Muh./M/Mhd", "Dwi/Dwy", "Bella/Bela"
6. Consider name order variations and nicknames

POSITIVE EXAMPLES (Good matches):
- "Klaudio_AI" → "Klaudio P.H" ✓ (same first name + initial)
- "adinafadillah" → "Adina Fadillah Balqis" ✓ (first+middle name match)
- "bella_Web Dev" → "Bela Putri Carolian" ✓ (nickname variation)
- "FAUZAN DWI NUGROHO_Web" → "Fauzan Dwi Nugroho" ✓ (exact match)

NEGATIVE EXAMPLES (Bad matches to avoid):
- "Indri Dwi Lestari" → "Muhammad Trio Novrian" ✗ (only "Dwi" common)
- "Alya Massardi" → "Alyion Nita" ✗ (only "Aly" prefix common)
- "Vebri Pratama" → "Agnes Monika" ✗ (completely different)
- "Deny Wahyu" → "Vanessa" ✗ (no meaningful overlap)

CONFIDENCE SCORING:
- 0.9-1.0: Exact or very close match (same person, different format)
- 0.7-0.8: Strong match with clear name variations
- 0.5-0.6: Possible match but uncertain
- 0.0-0.4: Poor match, likely different people

If confidence ≤ 0.6 OR only common words match, set bestMatch=null.

Return JSON: {"zoomName": "${zoomName}", "bestMatch": "exact_candidate_or_null", "confidence": 0.0-1.0, "reason": "detailed_explanation", "matchType": "exact|nickname|spelling|order-variant|token-trim|ai-inferred"}

// Tambahkan ke prompt
CRITICAL: Avoid these common mistakes:
- Don't match "Indri Dwi Lestari" with "Fauzan Dwi Nugroho" just because both have "Dwi"
- Don't match "Alya Massardi" with "Alyion Nita" just because both start with "Aly"
- Don't match based on single common words like "Muhammad", "Putri", "Dwi", "Ahmad"
- Require at least 2-3 meaningful name components to match

BEFORE deciding on a match, ask yourself:
1. Do the first names actually match (not just similar)?
2. Are there at least 2 name components that correspond?
3. Is this likely the same person with different formatting?

If any answer is "no" or "uncertain", return bestMatch=null.
`;
  
  const maxRetries = 2;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      let adjudication: AiAdjudication;
      try {
        adjudication = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      if (!validateAdjudication(adjudication, zoomName, candidates)) {
        throw new Error(`Invalid adjudication response: ${JSON.stringify(adjudication)}`);
      }
      
      return adjudication;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Adjudication attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        return {
          zoomName,
          bestMatch: null,
          confidence: 0,
          reason: `AI adjudication failed after ${maxRetries + 1} attempts: ${lastError.message}`,
          matchType: 'ai-inferred'
        };
      }
    }
  }
  
  throw lastError || new Error('Unknown adjudication error');
}

/**
 * Validate AI adjudication response
 */
function validateAdjudication(
  adj: unknown,
  expectedZoomName: string,
  candidates: string[]
): adj is AiAdjudication {
  if (!adj || typeof adj !== 'object') return false;
  
  const adjObj = adj as Record<string, unknown>;
  
  if (adjObj.zoomName !== expectedZoomName) return false;
  if (typeof adjObj.confidence !== 'number' || adjObj.confidence < 0 || adjObj.confidence > 1) return false;
  
  if (adjObj.bestMatch !== null && !candidates.includes(adjObj.bestMatch as string)) return false;
  
  return true;
}
