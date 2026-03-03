import type { Context } from 'hono';
import { z } from 'zod';
import { LLDService } from '../services/LLDService';
import { AppError } from '../utils/errors';
import { successResponse } from '../utils/response';
import { getCache, setCache } from '../utils/cache';

const submitAnswerSchema = z.object({
  answer: z.string().min(1),
});

export class LLDController {
  constructor(private lldService: LLDService) { }

  getQuestions = async (c: Context) => {
    const category = c.req.query('category') || 'all';
    const difficulty = c.req.query('difficulty') || 'all';

    const cacheKey = `lld_questions_${category}_${difficulty}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return c.json(successResponse(cached, c.get('requestId')));
    }

    const questions = await this.lldService.getQuestions({
      category: category === 'all' ? undefined : category,
      difficulty: difficulty === 'all' ? undefined : difficulty,
    });

    const formatted = questions.map(q => ({
      _id: q._id?.toString(),
      title: q.title,
      slug: q.slug,
      scenario: q.scenario,
      description: q.description,
      category: q.category,
      difficulty: q.difficulty,
      createdAt: q.createdAt,
    }));

    setCache(cacheKey, formatted, 60000);

    return c.json(successResponse(formatted, c.get('requestId')));
  };

  getQuestion = async (c: Context) => {
    const questionId = c.req.param('id');
    const question = await this.lldService.getQuestionById(questionId);

    return c.json(
      successResponse(
        {
          _id: question._id?.toString(),
          title: question.title,
          slug: question.slug,
          scenario: question.scenario,
          description: question.description,
          category: question.category,
          difficulty: question.difficulty,
          createdAt: question.createdAt,
        },
        c.get('requestId')
      )
    );
  };

  submitAnswer = async (c: Context) => {
    const questionId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();
    const data = submitAnswerSchema.parse(body);

    const answer = await this.lldService.submitAnswer(
      user.userId,
      questionId,
      data.answer
    );

    return c.json(
      successResponse(
        {
          _id: answer._id?.toString(),
          userId: answer.userId.toString(),
          questionId: answer.questionId.toString(),
          answer: answer.answer,
          rating: answer.rating,
          feedback: answer.feedback,
          submittedAt: answer.submittedAt,
        },
        c.get('requestId')
      ),
      201
    );
  };

  getMyAnswers = async (c: Context) => {
    const user = c.get('user');
    const answers = await this.lldService.getUserAnswers(user.userId);

    return c.json(
      successResponse(
        answers.map(a => ({
          _id: a._id?.toString(),
          userId: a.userId.toString(),
          questionId: a.questionId.toString(),
          answer: a.answer,
          rating: a.rating,
          feedback: a.feedback,
          submittedAt: a.submittedAt,
        })),
        c.get('requestId')
      )
    );
  };

  checkCode = async (c: Context) => {
    const questionId = c.req.param('id');
    const body = await c.req.json();
    const data = submitAnswerSchema.parse(body);

    const result = await this.lldService.checkAnswer(questionId, data.answer);
    return c.json(successResponse(result, c.get('requestId')));
  };

  getOfficialSolutions = async (c: Context) => {
    const questionId = c.req.param('id');
    const solutions = await this.lldService.getOfficialSolutions(questionId);

    return c.json(
      successResponse(
        solutions.map(s => ({
          _id: s._id?.toString(),
          questionId: s.questionId.toString(),
          language: s.language,
          content: s.content,
          files: s.files,
        })),
        c.get('requestId')
      )
    );
  };
}
