import type { Context } from 'hono';
import { z } from 'zod';
import { LLDService } from '../services/LLDService';
import { AppError, createErrorResponse } from '../utils/errors';

const submitAnswerSchema = z.object({
  answer: z.string().min(1),
});

export class LLDController {
  constructor(private lldService: LLDService) {}

  async getQuestions(c: Context) {
    try {
      const category = c.req.query('category');
      const difficulty = c.req.query('difficulty');

      const questions = await this.lldService.getQuestions({
        category: category || undefined,
        difficulty: difficulty || undefined,
      });

      return c.json(questions.map(q => ({
        _id: q._id?.toString(),
        title: q.title,
        scenario: q.scenario,
        description: q.description,
        category: q.category,
        difficulty: q.difficulty,
        createdAt: q.createdAt,
      })));
    } catch (error) {
      return c.json(createErrorResponse(error), 500);
    }
  }

  async getQuestion(c: Context) {
    try {
      const questionId = c.req.param('id');
      const question = await this.lldService.getQuestionById(questionId);

      return c.json({
        _id: question._id?.toString(),
        title: question.title,
        scenario: question.scenario,
        description: question.description,
        category: question.category,
        difficulty: question.difficulty,
        createdAt: question.createdAt,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(createErrorResponse(error), error.statusCode);
      }
      return c.json(createErrorResponse(error), 500);
    }
  }

  async submitAnswer(c: Context) {
    try {
      const questionId = c.req.param('id');
      const user = c.get('user');
      const body = await c.req.json();
      const data = submitAnswerSchema.parse(body);

      const answer = await this.lldService.submitAnswer(user.userId, questionId, data.answer);

      return c.json({
        _id: answer._id?.toString(),
        userId: answer.userId.toString(),
        questionId: answer.questionId.toString(),
        answer: answer.answer,
        rating: answer.rating,
        feedback: answer.feedback,
        submittedAt: answer.submittedAt,
      }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(createErrorResponse(new AppError(400, error.errors[0].message, 'VALIDATION_ERROR')), 400);
      }
      if (error instanceof AppError) {
        return c.json(createErrorResponse(error), error.statusCode);
      }
      return c.json(createErrorResponse(error), 500);
    }
  }

  async getMyAnswers(c: Context) {
    try {
      const user = c.get('user');
      const answers = await this.lldService.getUserAnswers(user.userId);

      return c.json(answers.map(a => ({
        _id: a._id?.toString(),
        userId: a.userId.toString(),
        questionId: a.questionId.toString(),
        answer: a.answer,
        rating: a.rating,
        feedback: a.feedback,
        submittedAt: a.submittedAt,
      })));
    } catch (error) {
      return c.json(createErrorResponse(error), 500);
    }
  }
}

