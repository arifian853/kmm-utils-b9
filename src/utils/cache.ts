/**
 * Compute SHA-256 checksum of input string
 */
export async function computeChecksum(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Load cached embeddings from localStorage
 */
export function loadCachedEmbeddings(key: string): {
  embeddings: number[][];
  names: string[];
  checksum: string;
} | null {
  try {
    const cached = localStorage.getItem(`embeddings_${key}`);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    
    // Validate structure
    if (!parsed.embeddings || !parsed.names || !parsed.checksum) {
      return null;
    }
    
    // Validate that embeddings and names have same length
    if (parsed.embeddings.length !== parsed.names.length) {
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.warn('Failed to load cached embeddings:', error);
    return null;
  }
}

/**
 * Save embeddings to localStorage cache
 */
export function saveCachedEmbeddings(
  key: string,
  payload: {
    embeddings: number[][];
    names: string[];
    checksum: string;
  }
): void {
  try {
    const cacheData = {
      embeddings: payload.embeddings,
      names: payload.names,
      checksum: payload.checksum,
      timestamp: Date.now()
    };
    
    localStorage.setItem(`embeddings_${key}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to save embeddings to cache:', error);
    // Continue without caching if localStorage is full or unavailable
  }
}

/**
 * Clear old cached embeddings (optional cleanup)
 */
export function clearOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith('embeddings_')) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.timestamp && (now - parsed.timestamp) > maxAgeMs) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted cache entries
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to clear old cache:', error);
  }
}