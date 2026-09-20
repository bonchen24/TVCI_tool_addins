import { removeVietnameseTones } from "./search";
import type { KnowledgeRecord } from "./models";

export interface DuplicateKnowledgeMatch {
  record: KnowledgeRecord;
  score: number;
  matchReason: "title" | "content" | "both";
}

/**
 * Calculates similarity between two text strings using token-based Jaccard index
 * and character overlap (0.0 to 1.0).
 */
export function calculateSimilarity(textA: string, textB: string): number {
  const normA = removeVietnameseTones(textA.trim());
  const normB = removeVietnameseTones(textB.trim());

  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const tokensA = new Set(normA.split(/[\s,.:;!?'"()/-]+/).filter(Boolean));
  const tokensB = new Set(normB.split(/[\s,.:;!?'"()/-]+/).filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  // Jaccard similarity of words
  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  const jaccard = unionCount > 0 ? intersectionCount / unionCount : 0;

  // Substring inclusion bonus
  let substringBonus = 0;
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    substringBonus = maxLen > 0 ? (minLen / maxLen) * 0.3 : 0;
  }

  return Math.min(1, jaccard * 0.8 + substringBonus);
}

/**
 * Searches an array of KnowledgeRecords for potential duplicates of a candidate item.
 * Returns matches sorted by similarity score descending.
 */
export function findDuplicateKnowledge(
  candidate: { title: string; content: string; id?: string },
  existingRecords: KnowledgeRecord[],
  threshold = 0.65
): DuplicateKnowledgeMatch[] {
  const matches: DuplicateKnowledgeMatch[] = [];

  for (const record of existingRecords) {
    if (candidate.id && record.id === candidate.id) continue;

    const titleSim = calculateSimilarity(candidate.title, record.title);
    const contentSim = calculateSimilarity(candidate.content, record.content);

    let matchReason: "title" | "content" | "both" | null = null;
    let finalScore = 0;

    if (titleSim >= threshold && contentSim >= threshold) {
      matchReason = "both";
      finalScore = Math.max(titleSim, contentSim);
    } else if (titleSim >= threshold) {
      matchReason = "title";
      finalScore = titleSim;
    } else if (contentSim >= threshold) {
      matchReason = "content";
      finalScore = contentSim;
    }

    if (matchReason) {
      matches.push({
        record,
        score: Math.round(finalScore * 100) / 100,
        matchReason,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
