import type { Context } from 'hono';
import { z } from 'zod';
import { DSAService } from '../services/DSAService';
import { EmbeddingSearchService } from '../services/EmbeddingSearchService';
import { successResponse } from '../utils/response';
import { getCache, setCache } from '../utils/cache';
import { getPagination } from '../utils/pagination';
import { AppError } from '../utils/errors';

const createListSchema = z.object({
  name: z.string().min(1),
  isPublic: z.boolean().optional().default(false),
});

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  isPublic: z.boolean().optional(),
});

const addProblemSchema = z.object({
  problemId: z.string(),
});

const toggleStatusSchema = z.object({
  isCompleted: z.boolean(),
});

const companySearchSchema = z.object({
  companyName: z.string().min(1),
  role: z.string().optional().default('SDE'),
});

const querySearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional().default(100),
});

const searchProblemsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().optional().default(50),
});

const getProblemsSchema = z.object({
  limit: z.number().optional().default(100),
  skip: z.number().optional().default(0),
});

const submitSolutionSchema = z.object({
  solution: z.string().min(1),
  language: z.string().min(1),
});

export class DSAController {
  constructor(
    private dsaService: DSAService,
    private embeddingService: EmbeddingSearchService
  ) { }

  createList = async (c: Context) => {
    const user = c.get('user');
    const body = await c.req.json();
    const data = createListSchema.parse(body);

    const list = await this.dsaService.createList(
      user.userId,
      data.name,
      data.isPublic ?? false
    );

    return c.json(
      successResponse(
        {
          _id: list._id?.toString(),
          userId: list.userId.toString(),
          name: list.name,
          isPublic: list.isPublic,
          problemIds: list.problemIds.map(id => id.toString()),
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        },
        c.get('requestId')
      ),
      201
    );
  };

  getMyLists = async (c: Context) => {
    const user = c.get('user');
    const lists = await this.dsaService.getUserLists(user.userId);

    return c.json(
      successResponse(
        lists.map(list => ({
          _id: list._id?.toString(),
          userId: list.userId.toString(),
          name: list.name,
          isPublic: list.isPublic,
          problemIds: list.problemIds.map(id => id.toString()),
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        })),
        c.get('requestId')
      )
    );
  };

  getPublicLists = async (c: Context) => {
    const cacheKey = 'dsa_public_lists';
    const cached = getCache(cacheKey);
    if (cached) {
      return c.json(successResponse(cached, c.get('requestId')));
    }

    const lists = await this.dsaService.getPublicLists();

    const formatted = lists.map(list => ({
      _id: list._id?.toString(),
      userId: list.userId.toString(),
      name: list.name,
      isPublic: list.isPublic,
      problemIds: list.problemIds.map(id => id.toString()),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    }));

    setCache(cacheKey, formatted, 60000);

    return c.json(successResponse(formatted, c.get('requestId')));
  };

  getList = async (c: Context) => {
    const listId = c.req.param('id');
    const user = c.get('user');

    const result = await this.dsaService.getListWithProblems(
      listId,
      user.userId
    );

    return c.json(
      successResponse(
        {
          list: {
            _id: result.list._id?.toString(),
            userId: result.list.userId.toString(),
            name: result.list.name,
            isPublic: result.list.isPublic,
            createdAt: result.list.createdAt,
            updatedAt: result.list.updatedAt,
          },
          problems: result.problems.map(p => ({
            problem: {
              _id: p.problem._id?.toString(),
              frontendQuestionId: p.problem.frontendQuestionId,
              title: p.problem.title,
              titleSlug: p.problem.titleSlug,
              difficulty: p.problem.difficulty,
              acRate: p.problem.acRate,
              topicTags: p.problem.topicTags || [],
              paidOnly: p.problem.paidOnly || false,
              hasSolution: p.problem.hasSolution || false,
              hasVideoSolution: p.problem.hasVideoSolution || false,
            },
            status: p.status
              ? {
                isCompleted: p.status.isCompleted,
                checkedAt: p.status.checkedAt,
              }
              : null,
          })),
        },
        c.get('requestId')
      )
    );
  };

  updateList = async (c: Context) => {
    const listId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();
    const data = updateListSchema.parse(body);

    const list = await this.dsaService.updateList(
      listId,
      user.userId,
      data
    );

    return c.json(
      successResponse(
        {
          _id: list._id?.toString(),
          userId: list.userId.toString(),
          name: list.name,
          isPublic: list.isPublic,
          problemIds: list.problemIds.map(id => id.toString()),
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        },
        c.get('requestId')
      )
    );
  };

  deleteList = async (c: Context) => {
    const listId = c.req.param('id');
    const user = c.get('user');

    await this.dsaService.deleteList(listId, user.userId);

    return c.json(
      successResponse({ message: 'List deleted successfully' }, c.get('requestId'))
    );
  };

  addProblem = async (c: Context) => {
    const listId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();
    const data = addProblemSchema.parse(body);

    await this.dsaService.addProblemToList(
      listId,
      data.problemId,
      user.userId
    );

    return c.json(
      successResponse({ message: 'Problem added to list' }, c.get('requestId'))
    );
  };

  removeProblem = async (c: Context) => {
    const listId = c.req.param('id');
    const problemId = c.req.param('problemId');
    const user = c.get('user');

    await this.dsaService.removeProblemFromList(
      listId,
      problemId,
      user.userId
    );

    return c.json(
      successResponse({ message: 'Problem removed from list' }, c.get('requestId'))
    );
  };

  toggleProblemStatus = async (c: Context) => {
    const listId = c.req.param('id');
    const problemId = c.req.param('problemId');
    const user = c.get('user');
    const body = await c.req.json();
    const data = toggleStatusSchema.parse(body);

    await this.dsaService.toggleProblemStatus(
      listId,
      problemId,
      user.userId,
      data.isCompleted
    );

    return c.json(
      successResponse({ message: 'Problem status updated' }, c.get('requestId'))
    );
  };

  searchByCompany = async (c: Context) => {
    const body = await c.req.json();
    const data = companySearchSchema.parse(body);

    const problems = await this.embeddingService.searchByCompany(
      data.companyName,
      data.role
    );

    return c.json(
      successResponse(
        problems.map(p => ({
          _id: p._id?.toString(),
          frontendQuestionId: p.frontendQuestionId,
          title: p.title,
          titleSlug: p.titleSlug,
          difficulty: p.difficulty,
          acRate: p.acRate,
          topicTags: p.topicTags || [],
          paidOnly: p.paidOnly || false,
          hasSolution: p.hasSolution || false,
          hasVideoSolution: p.hasVideoSolution || false,
        })),
        c.get('requestId')
      )
    );
  };

  searchProblems = async (c: Context) => {
    const body = await c.req.json();
    const data = searchProblemsSchema.parse(body);

    const problems = await this.dsaService.searchProblemsByTitle(
      data.query,
      data.limit
    );

    return c.json(
      successResponse(
        problems.map(p => ({
          _id: p._id?.toString(),
          frontendQuestionId: p.frontendQuestionId,
          title: p.title,
          titleSlug: p.titleSlug,
          difficulty: p.difficulty,
          acRate: p.acRate,
          topicTags: p.topicTags || [],
          paidOnly: p.paidOnly || false,
          hasSolution: p.hasSolution || false,
          hasVideoSolution: p.hasVideoSolution || false,
        })),
        c.get('requestId')
      )
    );
  };

  getProblems = async (c: Context) => {
    const { page, limit, skip } = getPagination(c.req.query());

    const problems = await this.dsaService.getProblems(limit, skip);

    return c.json(
      successResponse(
        {
          page,
          limit,
          items: problems.map(p => ({
            _id: p._id?.toString(),
            frontendQuestionId: p.frontendQuestionId,
            title: p.title,
            titleSlug: p.titleSlug,
            difficulty: p.difficulty,
            acRate: p.acRate,
            topicTags: p.topicTags || [],
            paidOnly: p.paidOnly || false,
            hasSolution: p.hasSolution || false,
            hasVideoSolution: p.hasVideoSolution || false,
          })),
        },
        c.get('requestId')
      )
    );
  };

  searchByQuery = async (c: Context) => {
    const body = await c.req.json();
    const data = querySearchSchema.parse(body);

    const problems = await this.embeddingService.searchByQuery(
      data.query,
      data.limit
    );

    return c.json(
      successResponse(
        problems.map(p => ({
          _id: p._id?.toString(),
          frontendQuestionId: p.frontendQuestionId,
          title: p.title,
          titleSlug: p.titleSlug,
          difficulty: p.difficulty,
          acRate: p.acRate,
          topicTags: p.topicTags || [],
          paidOnly: p.paidOnly || false,
          hasSolution: p.hasSolution || false,
          hasVideoSolution: p.hasVideoSolution || false,
        })),
        c.get('requestId')
      )
    );
  };

  getProblem = async (c: Context) => {
    const problemId = c.req.param('id');

    if (!problemId) {
      throw new AppError(400, 'Problem ID is required', 'VALIDATION_ERROR');
    }

    const problem = await this.dsaService.getProblemById(problemId);

    if (!problem) {
      throw new AppError(404, 'Problem not found', 'PROBLEM_NOT_FOUND');
    }

    return c.json(
      successResponse(
        {
          _id: problem._id?.toString(),
          frontendQuestionId: problem.frontendQuestionId,
          title: problem.title,
          titleSlug: problem.titleSlug,
          difficulty: problem.difficulty,
          acRate: problem.acRate,
          topicTags: problem.topicTags || [],
          paidOnly: problem.paidOnly || false,
          hasSolution: problem.hasSolution || false,
          hasVideoSolution: problem.hasVideoSolution || false,
          description: problem.description,
          examples: problem.examples,
          constraints: problem.constraints,
        },
        c.get('requestId')
      )
    );
  };

  submitSolution = async (c: Context) => {
    const problemId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();
    const data = submitSolutionSchema.parse(body);

    const result = await this.dsaService.submitSolution(
      user.userId,
      problemId,
      data.solution,
      data.language
    );

    return c.json(
      successResponse(
        {
          _id: result._id?.toString(),
          userId: result.userId.toString(),
          problemId: result.problemId.toString(),
          solution: result.solution,
          language: result.language,
          rating: result.rating,
          feedback: result.feedback,
          submittedAt: result.submittedAt,
        },
        c.get('requestId')
      )
    );
  };

  checkCode = async (c: Context) => {
    const problemId = c.req.param('id');
    const body = await c.req.json();
    const data = submitSolutionSchema.parse(body);

    const result = await this.dsaService.checkSolution(
      problemId,
      data.solution,
      data.language
    );

    return c.json(successResponse(result, c.get('requestId')));
  };
}
