import OpenAI from 'openai';
import { ENV } from '../config/env';
import { LLDRepository } from '../repositories/LLDRepository';

interface RatingResult {
  rating: number;
  feedback: string;
}

export class LLDRatingService {
  private openai: OpenAI;

  constructor(private lldRepository: LLDRepository) {
    const env = ENV;
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async rateAnswer(question: string, scenario: string, answer: string): Promise<RatingResult> {
    const prompt = `You are an expert interviewer evaluating a candidate's answer to a Low-Level Design (LLD) machine coding round question.

Question: ${question}

Scenario: ${scenario}

Candidate's Answer:
${answer}

Please evaluate this answer thoroughly based on:
1. SOLID principles and Design Patterns
2. Scalability and Performance
3. Security Vulnerabilities (e.g., thread safety, race conditions, resource leaks, improper input validation)
4. Edge Case Handling (e.g., empty inputs, maximum capacity, concurrent access, invalid states)
5. Readability and Maintainability

Provide:
1. A rating from 1 to 10 (where 10 is excellent)
2. Detailed feedback on what was done well and what could be improved
3. Specific suggestions for improvement, especially regarding security and edge cases

Format your response as JSON with the following structure:
{
  "rating": <number between 1 and 10>,
  "feedback": "<detailed feedback string including sections for Security and Edge Cases>"
}

Be thorough and constructive in your feedback.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical interviewer specializing in Low-Level Design and machine coding rounds. Provide fair, constructive, and detailed feedback focusing on industry-standard security and robustness.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Failed to get rating from LLM');
    }

    try {
      const result = JSON.parse(content) as RatingResult;

      // Validate rating is between 1 and 10
      if (result.rating < 1 || result.rating > 10) {
        result.rating = Math.max(1, Math.min(10, Math.round(result.rating)));
      }

      return {
        rating: Math.round(result.rating),
        feedback: result.feedback || 'No feedback provided',
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        rating: 5,
        feedback: 'Unable to parse detailed feedback. Please try again.',
      };
    }
  }

  async checkSyntax(question: string, scenario: string, answer: string): Promise<{ valid: boolean; errors: string[] }> {
    const prompt = `You are evaluating a candidate's LLD code for correctness, security, and edge cases.
    
Question: ${question}
Scenario: ${scenario}

Candidate's Answer:
${answer}

Perform a strict check for:
1. Syntax errors (based on standard language rules)
2. Significant design flaws (e.g., missing core classes, broken relationships)
3. Security Vulnerabilities (e.g., thread safety/concurrency issues, resource leaks)
4. Missing Edge Case handling (e.g., empty inputs, boundary conditions)
5. Logical inconsistencies

Provide the result as JSON:
{
  "valid": <boolean>,
  "errors": ["list of strings or empty array if valid - include specific security or edge case warnings here"]
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a technical validator for LLD code. You specialize in identifying security risks and edge case failures in complex systems.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Failed to validate code');

    try {
      return JSON.parse(content);
    } catch (error) {
      return { valid: false, errors: ['Failed to parse validation result'] };
    }
  }
}

