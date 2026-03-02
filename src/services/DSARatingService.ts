import OpenAI from 'openai';
import { ENV } from '../config/env';

interface RatingResult {
    rating: number;
    feedback: string;
}

export class DSARatingService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });
    }

    async rateSolution(problemTitle: string, problemDescription: string, solution: string, language: string): Promise<RatingResult> {
        const prompt = `You are an expert technical interviewer evaluating a candidate's solution to a Data Structures and Algorithms (DSA) problem.

Problem: ${problemTitle}

Problem Description: ${problemDescription}

Candidate's Submission (Language: ${language}):
${solution}

Please evaluate this solution thoroughly based on:
1. Time and Space Complexity (explicitly state them)
2. Optimization: Is this the most optimal approach?
3. Edge Case Handling (e.g., empty arrays, single elements, duplicates, out-of-bounds, large inputs)
4. Code Quality: Readability, naming conventions, and follow-up potential.
5. Correctness: Does it solve the core problem logically?

Provide:
1. A rating from 1 to 10 (where 10 is excellent and production-ready)
2. Detailed feedback on what was done well and what could be improved
3. Specific suggestions for optimization or bug fixes

Format your response STRICTLY as a JSON object:
{
  "rating": <number between 1 and 10>,
  "feedback": "<detailed feedback string including complexity analysis and edge case discussion>"
}`;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert DSA interviewer and competitive coder. You provide deep, technical, and constructive feedback on algorithmic solutions.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.5,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Failed to get rating from LLM');
        }

        try {
            const result = JSON.parse(content) as RatingResult;
            return {
                rating: Math.round(result.rating),
                feedback: result.feedback || 'No feedback provided',
            };
        } catch (error) {
            return {
                rating: 5,
                feedback: 'Unable to parse detailed feedback. Please try again.',
            };
        }
    }

    async checkSyntax(problemTitle: string, problemDescription: string, solution: string, language: string): Promise<{ valid: boolean; errors: string[] }> {
        const prompt = `Perform a quick review of the candidate's code for syntax errors and obvious logic bugs.

Problem: ${problemTitle}
Problem Description: ${problemDescription}

Code (Language: ${language}):
${solution}

Check for:
1. Proper syntax for ${language}
2. Core algorithmic flaws
3. Most obvious edge cases (e.g. null/empty pointers/arrays)

Provide result in JSON:
{
  "valid": <boolean>,
  "errors": ["list of strings or empty array if valid"]
}`;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are a technical code validator. Focus on finding syntax errors and critical logic bugs in algorithms.',
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
