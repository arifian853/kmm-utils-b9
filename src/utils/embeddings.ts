import { GoogleGenerativeAI } from '@google/generative-ai';

export interface CandidateMatch {
  name: string;
  score: number;
}

/**
 * Get embeddings for multiple texts using Google's text-embedding-004 model
 */
export async function getEmbeddings(apiKey: string, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  try {
    const requests = texts.map(text => ({
      content: {
        parts: [{ text: normalizeForEmbedding(text) }]
      }
    }));
    
    const result = await model.batchEmbedContents({
      requests: requests.map(req => ({
        content: {
          role: 'user',
          parts: req.content.parts
        }
      }))
    });
    
    return result.embeddings.map(embedding => embedding.values || []);
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw new Error(`Failed to get embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Find top-K candidates based on embedding similarity
 */
export function topKCandidates(
  zoomEmbedding: number[],
  menteeEmbeddings: number[][],
  menteeNames: string[],
  k: number = 6
): CandidateMatch[] {
  if (menteeEmbeddings.length !== menteeNames.length) {
    throw new Error('Embeddings and names arrays must have the same length');
  }
  
  const candidates: CandidateMatch[] = [];
  
  for (let i = 0; i < menteeEmbeddings.length; i++) {
    const score = cosineSim(zoomEmbedding, menteeEmbeddings[i]);
    candidates.push({ name: menteeNames[i], score });
  }
  
  // Sort by score descending and take top K
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Normalize text for embedding to improve matching
 */
function normalizeForEmbedding(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_\-()]/g, ' ') // Replace separators with spaces
    .replace(/\b(web development|web dev|ai|artificial intelligence)\b/gi, '') // Remove program suffixes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}