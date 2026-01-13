import { LLDRepository } from '../repositories/LLDRepository';
import { LLDRatingService } from './LLDRatingService';
import { LLDQuestion, LLDAnswer } from '../models/LLDQuestion';
import { AppError } from '../utils/errors';

export class LLDService {
  constructor(
    private lldRepository: LLDRepository,
    private ratingService: LLDRatingService
  ) {}

  async getQuestions(filters?: { category?: string; difficulty?: string }): Promise<LLDQuestion[]> {
    return this.lldRepository.findQuestions(filters);
  }

  async getQuestionById(questionId: string): Promise<LLDQuestion> {
    const question = await this.lldRepository.findQuestionById(questionId);
    if (!question) {
      throw new AppError(404, 'Question not found', 'QUESTION_NOT_FOUND');
    }
    return question;
  }

  async submitAnswer(userId: string, questionId: string, answer: string): Promise<LLDAnswer> {
    const question = await this.lldRepository.findQuestionById(questionId);
    if (!question) {
      throw new AppError(404, 'Question not found', 'QUESTION_NOT_FOUND');
    }

    // Create answer first
    const answerDoc = await this.lldRepository.createAnswer({
      userId: userId as any,
      questionId: questionId as any,
      answer,
    });

    // Rate the answer using LLM
    try {
      const ratingResult = await this.ratingService.rateAnswer(
        question.title,
        question.scenario,
        answer
      );

      // Update answer with rating and feedback
      await this.lldRepository.updateAnswerRating(
        answerDoc._id!,
        ratingResult.rating,
        ratingResult.feedback
      );

      return (await this.lldRepository.findAnswerById(answerDoc._id!))!;
    } catch (error) {
      // If rating fails, return answer without rating
      console.error('Failed to rate answer:', error);
      return answerDoc;
    }
  }

  async getUserAnswers(userId: string): Promise<LLDAnswer[]> {
    return this.lldRepository.findAnswersByUser(userId);
  }
}

