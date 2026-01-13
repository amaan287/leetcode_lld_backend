import OpenAI from 'openai';
import { getEnv } from '../config/env';
import { LLDRepository } from '../repositories/LLDRepository';

interface RatingResult {
  rating: number;
  feedback: string;
}

export class LLDRatingService {
  private openai: OpenAI;

  constructor(private lldRepository: LLDRepository) {
    const env = getEnv();
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async rateAnswer(question: string, scenario: string, answer: string): Promise<RatingResult> {
    const prompt = `You are an expert interviewer evaluating a candidate's answer to a Low-Level Design (LLD) machine coding round question.

Question: ${question}

Scenario: ${scenario}

Candidate's Answer:
${answer}

Please evaluate this answer and provide:
1. A rating from 1 to 10 (where 10 is excellent)
2. Detailed feedback on what was done well and what could be improved
3. Specific suggestions for improvement

Format your response as JSON with the following structure:
{
  "rating": <number between 1 and 10>,
  "feedback": "<detailed feedback string>"
}

Be thorough and constructive in your feedback.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical interviewer specializing in Low-Level Design and machine coding rounds. Provide fair, constructive, and detailed feedback.',
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
}

