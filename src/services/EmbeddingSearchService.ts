import OpenAI from 'openai';
import { getEnv } from '../config/env';
import { DSARepository } from '../repositories/DSARepository';
import type { DSAProblem } from '../models/DSAProblem';

interface SimilarityResult {
  problem: DSAProblem;
  similarity: number;
}

export class EmbeddingSearchService {
  private openai: OpenAI;

  constructor(private dsaRepository: DSARepository) {
    const env = getEnv();
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      const a = vecA[i] ?? 0;
      const b = vecB[i] ?? 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  async searchByCompany(companyName: string, role: string = 'SDE'): Promise<DSAProblem[]> {
    const searchQuery = `${companyName} ${role} interview questions software engineering coding problems`;
    
    // Create embedding for the search query
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: [searchQuery],
    });

    const firstEmbedding = embeddingResponse.data[0];
    if (!firstEmbedding?.embedding) {
      throw new Error('Failed to generate embedding for search query');
    }

    const queryEmbedding = firstEmbedding.embedding;

    // Retrieve all problems with embeddings
    const problems = await this.dsaRepository.findProblemsWithEmbeddings();

    // Calculate cosine similarity and find most similar problems
    const similarities: SimilarityResult[] = [];

    for (const problem of problems) {
      if (problem.title_embeddings_OAI) {
        const similarity = this.cosineSimilarity(queryEmbedding, problem.title_embeddings_OAI);
        similarities.push({
          problem,
          similarity,
        });
      }
    }

    // Sort by similarity (highest first) and return top 50
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, 50).map(result => result.problem);
  }

  /**
   * Enhanced search that uses LLM to understand user query and find relevant problems
   * Example: "swiggy sde1" -> finds top 100 problems asked in Swiggy SDE1 interviews
   */
  async searchByQuery(userQuery: string, limit: number = 100): Promise<DSAProblem[]> {
    // Use LLM to generate an optimized search query from user input
    const optimizedQuery = await this.generateSearchQuery(userQuery);
    
    // Create embedding for the optimized search query
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: [optimizedQuery],
    });

    const firstEmbedding = embeddingResponse.data[0];
    if (!firstEmbedding?.embedding) {
      throw new Error('Failed to generate embedding for search query');
    }

    const queryEmbedding = firstEmbedding.embedding;

    // Retrieve all problems with embeddings
    const problems = await this.dsaRepository.findProblemsWithEmbeddings();

    // Calculate cosine similarity and find most similar problems
    const similarities: SimilarityResult[] = [];

    for (const problem of problems) {
      if (problem.title_embeddings_OAI) {
        const similarity = this.cosineSimilarity(queryEmbedding, problem.title_embeddings_OAI);
        similarities.push({
          problem,
          similarity,
        });
      }
    }

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Get top N results
    const topProblems = similarities.slice(0, limit).map(result => result.problem);

    // Optionally use LLM to re-rank based on relevance to the specific interview context
    if (topProblems.length > 0) {
      return await this.rerankWithLLM(userQuery, topProblems, limit);
    }

    return topProblems;
  }

  /**
   * Uses LLM to generate an optimized search query from user input
   * Example: "swiggy sde1" -> "Swiggy SDE1 software engineering interview coding problems questions"
   */
  private async generateSearchQuery(userQuery: string): Promise<string> {
    const prompt = `You are a search query optimizer. Given a user's search query about interview questions, generate an optimized search query that will help find the most relevant coding problems.

User query: "${userQuery}"

Generate an optimized search query that includes:
- Company name (if mentioned)
- Role/level (if mentioned, e.g., SDE1, SDE2, SWE, etc.)
- Context about interview questions and coding problems

Return ONLY the optimized search query, nothing else.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a search query optimizer. Generate concise, effective search queries.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });
      console.log('completion', completion);
      const optimizedQuery = completion.choices[0]?.message?.content?.trim();
      console.log('optimizedQuery', optimizedQuery);
      console.log('userQuery', userQuery);
      if (!optimizedQuery) {
        // Fallback to original query with context
        return `${userQuery} interview questions software engineering coding problems`;
      }

      return optimizedQuery;
    } catch (error) {
      console.error('Error generating search query with LLM:', error);
      // Fallback to original query with context
      return `${userQuery} interview questions software engineering coding problems`;
    }
  }

  /**
   * Uses LLM to re-rank problems based on relevance to the specific interview context
   */
  private async rerankWithLLM(
    userQuery: string,
    problems: DSAProblem[],
    limit: number
  ): Promise<DSAProblem[]> {
    // For efficiency, only re-rank top candidates (e.g., top 150 to get best 100)
    const candidatesToRerank = Math.min(problems.length, 150);
    const candidates = problems.slice(0, candidatesToRerank);

    // Create a prompt with problem titles for LLM to rank
    const problemTitles = candidates.map((p, idx) => `${idx + 1}. ${p.title}`).join('\n');

    const prompt = `Given a user's search query about interview questions, rank the following coding problems by relevance.

User query: "${userQuery}"

Problems:
${problemTitles}

Return ONLY a comma-separated list of numbers (1-${candidates.length}) representing the most relevant problems in order of relevance. Return exactly ${limit} numbers.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at ranking coding interview problems by relevance. Return only numbers.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      });

      const rankingText = completion.choices[0]?.message?.content?.trim();
      if (!rankingText) {
        return problems.slice(0, limit);
      }

      // Parse the ranking
      const rankedIndices = rankingText
        .split(',')
        .map((s) => parseInt(s.trim()) - 1) // Convert to 0-based index
        .filter((idx) => idx >= 0 && idx < candidates.length)
        .slice(0, limit);

      // If LLM ranking is valid, use it; otherwise fall back to similarity ranking
      if (rankedIndices.length > 0) {
        const reranked: DSAProblem[] = [];
        for (const idx of rankedIndices) {
          const problem = candidates[idx];
          if (problem) {
            reranked.push(problem);
          }
        }
        
        // Fill remaining slots with original order if needed
        const remaining = limit - reranked.length;
        if (remaining > 0) {
          const usedIndices = new Set(rankedIndices);
          for (let idx = 0; idx < candidates.length && reranked.length < limit; idx++) {
            if (!usedIndices.has(idx)) {
              const problem = candidates[idx];
              if (problem) {
                reranked.push(problem);
              }
            }
          }
        }
        return reranked;
      }
    } catch (error) {
      console.error('Error re-ranking with LLM:', error);
    }

    // Fallback to similarity-based ranking
    return problems.slice(0, limit);
  }
}

